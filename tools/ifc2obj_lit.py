"""IFC -> OBJ + MTL með raunverulegum efnislitum úr líkaninu."""
import ifcopenshell, ifcopenshell.geom, sys, time, statistics
SRC="/Users/robert/Downloads/26-0608 - Vorbraut 14.ifc"
OUT=sys.argv[1]; MTL=OUT.rsplit('.',1)[0]+'.mtl'
TAKA={'IfcWall','IfcWallStandardCase','IfcSlab','IfcRoof','IfcColumn','IfcBeam',
      'IfcStair','IfcStairFlight','IfcRailing','IfcMember','IfcPlate','IfcCovering',
      'IfcWindow','IfcDoor','IfcCurtainWall'}
f=ifcopenshell.open(SRC)
s=ifcopenshell.geom.settings()
s.set('use-world-coords', True)

# miðja hússins
mid=[]
it0=ifcopenshell.geom.iterator(s,f,4)
if it0.initialize():
    while True:
        sh=it0.get()
        if sh.product.is_a() in TAKA:
            v=sh.geometry.verts
            if v: mid.append((sum(v[0::3])/(len(v)//3), sum(v[1::3])/(len(v)//3)))
        if not it0.next(): break
MX=statistics.median(m[0] for m in mid); MY=statistics.median(m[1] for m in mid)

efni={}          # nafn -> (r,g,b,alpha)
vo=0; nv=0; nf=0; t0=time.time()
it=ifcopenshell.geom.iterator(s,f,4)
with open(OUT,'w') as o:
    o.write(f"mtllib {MTL.split('/')[-1]}\n")
    if it.initialize():
        while True:
            sh=it.get()
            if sh.product.is_a() in TAKA:
                g=sh.geometry; vs=g.verts; fs=g.faces
                dmax=max(((vs[i]-MX)**2+(vs[i+1]-MY)**2)**.5 for i in range(0,len(vs),3))
                if dmax<=55:
                    mats=list(g.materials); mids=list(g.material_ids)
                    for i in range(0,len(vs),3):
                        o.write(f"v {vs[i]:.4f} {vs[i+1]:.4f} {vs[i+2]:.4f}\n")
                    nuv=None
                    for k in range(0,len(fs),3):
                        mi = mids[k//3] if k//3 < len(mids) else -1
                        if 0 <= mi < len(mats):
                            m=mats[mi]
                            nafn=(m.name or 'efni').replace(' ','_').replace('/','_')[:60]
                            if nafn not in efni:
                                d=getattr(m,'diffuse',None)
                                # ifcopenshell skilar 'colour' hlut, ekki lista
                                if d is None: col=(.8,.8,.8)
                                elif hasattr(d,'r'): col=(d.r(),d.g(),d.b()) if callable(d.r) else (d.r,d.g,d.b)
                                else:
                                    try: col=(d[0],d[1],d[2])
                                    except Exception: col=(.8,.8,.8)
                                tr=getattr(m,'transparency',0) or 0
                                if tr!=tr or tr is None: tr=0.0   # NaN vörn
                                efni[nafn]=(col[0],col[1],col[2],1.0-tr)
                        else:
                            nafn='efni_sjalfgefid'; efni.setdefault(nafn,(.82,.81,.79,1.0))
                        if nafn!=nuv:
                            o.write(f"usemtl {nafn}\n"); nuv=nafn
                        o.write(f"f {fs[k]+1+vo} {fs[k+1]+1+vo} {fs[k+2]+1+vo}\n")
                    vo+=len(vs)//3; nv+=len(vs)//3; nf+=len(fs)//3
            if not it.next(): break
with open(MTL,'w') as m:
    for nafn,(r,g,b,a) in efni.items():
        m.write(f"newmtl {nafn}\nKd {r:.4f} {g:.4f} {b:.4f}\nKs 0.05 0.05 0.05\nNs 24\nd {a:.3f}\n\n")
print(f"OBJ: {nv} hnútar, {nf} fletir, {len(efni)} efni, {time.time()-t0:.0f}s")
for k,v in list(efni.items())[:14]:
    print(f"   {k[:34]:34s} rgb({v[0]:.2f},{v[1]:.2f},{v[2]:.2f}) a={v[3]:.2f}")
