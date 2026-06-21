import ifcopenshell, ifcopenshell.geom as G
import numpy as np, json, sys, os
CODE = sys.argv[1] if len(sys.argv)>1 else '0401'
f = ifcopenshell.open('/Users/robert/Downloads/26-0608 - Vorbraut 14.ifc')
s = G.settings(); s.set(s.USE_WORLD_COORDS, True)
SHARED=('lyfta','sameign','gangur','stig','rafmagn','tækni','sorp','ræsting','inntak','sameig')
WALLT={'IfcWall':'wall','IfcWallStandardCase':'wall','IfcColumn':'wall'}
def shp(el):
    try: return G.create_shape(s,el)
    except Exception: return None
def VF(sh):
    return (np.array(sh.geometry.verts,float).reshape(-1,3),
            np.array(sh.geometry.faces,np.int64).reshape(-1,3))

# storey of this apartment (its living space)
living=[x for x in f.by_type('IfcSpace') if x.Name==CODE and (x.LongName or '').startswith('stofa')]
if not living: print("no living space for",CODE); sys.exit(1)
liv=living[0]
st=None
for r in (getattr(liv,'Decomposes',None) or []): st=r.RelatingObject
if st is None:
    for rel in f.by_type('IfcRelAggregates'):
        if liv in rel.RelatedObjects: st=rel.RelatingObject; break
# spaces on storey
spaces=[]
for rel in f.by_type('IfcRelContainedInSpatialStructure'):
    if rel.RelatingStructure==st: spaces+=[o for o in rel.RelatedElements if o.is_a('IfcSpace')]
for rel in f.by_type('IfcRelAggregates'):
    if rel.RelatingObject==st: spaces+=[o for o in rel.RelatedObjects if o.is_a('IfcSpace')]
spaces=list({x.id():x for x in spaces}.values())
# living centroids for classification
livs=[x for x in spaces if (x.LongName or '').startswith('stofa') and x.Name]
def cent(el):
    sh=shp(el); 
    return None if sh is None else VF(sh)[0].mean(0)
livc={x.Name:cent(x) for x in livs}
livc={k:v for k,v in livc.items() if v is not None}
# allar ibudir i husinu (3D) til ad flokka husgogn rett
livc_all={}
for _sp in f.by_type('IfcSpace'):
    if (_sp.LongName or '').startswith('stofa') and _sp.Name:
        _c=cent(_sp)
        if _c is not None: livc_all[_sp.Name]=_c
# this apartment's spaces (nearest living centroid == CODE)
apt=[]
for sp in spaces:
    ln=(sp.LongName or '').lower()
    if any(ln.startswith(k) for k in SHARED): continue
    c=cent(sp)
    if c is None: continue
    near=min(livc, key=lambda n:(livc[n][0]-c[0])**2+(livc[n][1]-c[1])**2)
    if near==CODE: apt.append(sp)
print("apartment",CODE,"rooms:",len(apt),[(x.Name,x.LongName) for x in apt],file=sys.stderr)

# region + floor/ceiling from room solids
regv=[]; cats={}
def add(cat,P,N,Fa):
    d=cats.setdefault(cat,{'p':[],'n':[],'i':[]}); base=len(d['p'])//3
    d['p']+=P.ravel().tolist(); d['n']+=N.ravel().tolist(); d['i']+=(Fa+base).ravel().tolist()
floor_tris=[]; ceil_tris=[]
for sp in apt:
    sh=shp(sp); 
    if sh is None: continue
    v,fc=VF(sh); regv.append(v)
    zmin=v[:,2].min(); zmax=v[:,2].max()
    tri=v[fc]; nz=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
    L=np.linalg.norm(nz,axis=1,keepdims=True); L[L==0]=1; nz=nz/L
    cz=tri[:,:,2].mean(1)
    horiz=np.abs(nz[:,2])>0.8
    fmask=horiz & (cz < zmin+0.25)
    cmask=horiz & (cz > zmax-0.25)
    if fmask.any(): floor_tris.append(tri[fmask].reshape(-1,3))
    if cmask.any(): ceil_tris.append(tri[cmask].reshape(-1,3))
allv=np.vstack(regv)
RX=(allv[:,0].min()-0.35,allv[:,0].max()+0.35); RY=(allv[:,1].min()-0.35,allv[:,1].max()+0.35)
RZ=(allv[:,2].min()-0.5,allv[:,2].max()+0.6); EXT=(RX[1]-RX[0],RY[1]-RY[0]); floorZ=allv[:,2].min()

# floor & ceiling meshes (normals forced up/down)
def push_horiz(tris_list, cat, up):
    if not tris_list: return
    P=np.vstack(tris_list); Fa=np.arange(len(P)).reshape(-1,3)
    N=np.zeros_like(P); N[:,2]=1.0 if up else -1.0
    add(cat,P,N,Fa)
push_horiz(floor_tris,'floor',False)   # IFC z-up: bottom face normal -> down (-z); fixað í þrívídd síðar
push_horiz(ceil_tris,'ceiling',True)

# building elements clipped to region
def keep(v):
    # skörun (ekki midja) -> heldur jadar/ytri veggjum sem teygja sig ut fyrir herbergin
    x0,x1=v[:,0].min(),v[:,0].max(); y0,y1=v[:,1].min(),v[:,1].max(); cz=v[:,2].mean()
    ix = x0<=RX[1]+0.25 and x1>=RX[0]-0.25
    iy = y0<=RY[1]+0.25 and y1>=RY[0]-0.25
    iz = RZ[0]-0.5<=cz<=RZ[1]+0.5
    big = (x1-x0)>EXT[0]*1.5 or (y1-y0)>EXT[1]*1.5
    return ix and iy and iz and not big
ELT={**WALLT,'IfcDoor':'door','IfcWindow':'glass','IfcRailing':'rail'}
cand=[]
for t in ['IfcWall','IfcWallStandardCase','IfcColumn','IfcDoor','IfcWindow','IfcRailing','IfcMember','IfcPlate','IfcCurtainWall','IfcCovering']:
    try: cand+=list(f.by_type(t))
    except Exception: pass
cand=[c for c in cand if c.is_a() in ELT]
cand=list({x.id():x for x in cand}.values())
try: furn=list(f.by_type('IfcFurnishingElement'))
except Exception: furn=[]
def emit(v,fc,cat):
    tri=v[fc]; fn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
    L=np.linalg.norm(fn,axis=1,keepdims=True); L[L==0]=1; fn=fn/L
    P=tri.reshape(-1,3); N=np.repeat(fn,3,0); Fa=np.arange(len(P)).reshape(-1,3); add(cat,P,N,Fa)
kept=0
for el in cand:
    sh=shp(el); 
    if sh is None: continue
    v,fc=VF(sh)
    if not keep(v): continue
    emit(v,fc,ELT[el.is_a()]); kept+=1
for fe in furn:
    sh=shp(fe)
    if sh is None: continue
    v,fc=VF(sh)
    if not keep(v): continue
    if len(fc)>30000: continue           # sleppa risastórum gölluðum objektum
    emit(v,fc,'furn'); kept+=1

# transform to three (x, z-up, -y), recenter, fix floor/ceiling normals
cx=float((RX[0]+RX[1])/2); cy=float((RY[0]+RY[1])/2)
out={'cats':{},'meta':{}}; gmin=np.array([1e9]*3); gmax=np.array([-1e9]*3)
for c,d in cats.items():
    p=np.array(d['p']).reshape(-1,3); n=np.array(d['n']).reshape(-1,3)
    P=np.column_stack([p[:,0]-cx,p[:,2]-floorZ,-(p[:,1]-cy)])
    if c=='floor': N=np.tile([0,1,0],(len(P),1))
    elif c=='ceiling': N=np.tile([0,-1,0],(len(P),1))
    else: N=np.column_stack([n[:,0],n[:,2],-n[:,1]])
    out['cats'][c]={'p':[round(float(x),4) for x in P.ravel()],'n':[round(float(x),3) for x in N.ravel()],'i':[int(i) for i in d['i']]}
    gmin=np.minimum(gmin,P.min(0)); gmax=np.maximum(gmax,P.max(0))
sc=livc[CODE]
out['meta']={'spawn':[round(float(sc[0]-cx),2),round(float(-(sc[1]-cy)),2)],
             'bounds':{'min':[round(float(x),2) for x in gmin],'max':[round(float(x),2) for x in gmax]},
             'floorY':0.0,'height':round(float(RZ[1]-RZ[0]),2)}
path=f'/Users/robert/Vorbraut 14/assets/models/{CODE}.json'
json.dump(out,open(path,'w'),separators=(',',':'))
print(f"{CODE}: kept={kept} tris={ {c:len(d['i'])//3 for c,d in out['cats'].items()} }")
print("spawn",out['meta']['spawn'],"bounds",out['meta']['bounds'],f"size={os.path.getsize(path)/1e6:.2f}MB")
