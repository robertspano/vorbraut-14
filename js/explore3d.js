/* ==========================================================================
   Vorbraut 14 — 3D gönguferð um íbúð (Three.js) — BIM útgáfa
   Hleður RAUNVERULEGA geómetríu íbúðarinnar (dregin úr IFC/BIM arkitektsins,
   assets/models/<id>.json) og setur á hana raunsæ efni í vafranum:
   parket-gólf, málaða veggi, gler, + mjúk innilýsing/speglun (RoomEnvironment).
   Fyrstu persónu (W A S D + mús, árekstrar með geislum) og doll-house hamur.
   ========================================================================== */
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ID = (new URLSearchParams(location.search).get('id') || '0401').replace(/[^0-9]/g, '') || '0401';
const wrap = document.getElementById('c3d');
const hintEl = document.getElementById('hint3d');
const crossEl = document.getElementById('cross3d');
const bootEl = document.getElementById('boot3d');

let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch (e) { showFallback(); throw e; }
if (!renderer || !renderer.getContext()) showFallback();
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
wrap.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd7dee3);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.03, 300);

// innilýsing/speglun úr RoomEnvironment (engar utanaðkomandi skrár)
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const hemi = new THREE.HemisphereLight(0xffffff, 0x9a8f7c, 0.75); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2e0, 1.6);
sun.position.set(6, 14, 8); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 60;
sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
sun.shadow.bias = -0.0003;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.45));   // lyftir skuggum innandyra

/* ----------------------------- efni (materials) --------------------------- */
function woodTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#c8a974'; x.fillRect(0, 0, 512, 512);
  for (let p = 0; p < 512; p += 64) {                 // ljóst eikar-parket
    const g = x.createLinearGradient(0, p, 0, p + 64);
    const b = 188 + Math.floor((p * 7) % 28);
    g.addColorStop(0, `rgb(${b},${b - 34},${b - 78})`);
    g.addColorStop(1, `rgb(${b - 22},${b - 54},${b - 96})`);
    x.fillStyle = g; x.fillRect(0, p, 512, 62);
    x.strokeStyle = 'rgba(96,68,38,.4)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, p + 63); x.lineTo(512, p + 63); x.stroke();
  }
  for (let i = 0; i < 900; i++) {                      // æðar
    x.strokeStyle = `rgba(120,86,46,${Math.random() * 0.05})`;
    x.beginPath(); const yy = Math.random() * 512;
    x.moveTo(0, yy); x.bezierCurveTo(170, yy + (Math.random() * 6 - 3), 340, yy + (Math.random() * 6 - 3), 512, yy); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
const MAT = {
  floor:   new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.55, metalness: 0.0, envMapIntensity: 1.0, side: THREE.DoubleSide }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: 1.0, metalness: 0.0, side: THREE.DoubleSide }),
  wall:    new THREE.MeshStandardMaterial({ color: 0xeeebe5, roughness: 0.92, metalness: 0.0 }),
  door:    new THREE.MeshStandardMaterial({ color: 0xb89b73, roughness: 0.55, metalness: 0.05 }),
  glass:   new THREE.MeshPhysicalMaterial({ color: 0xbcd2da, roughness: 0.06, metalness: 0, transmission: 0.82, transparent: true, opacity: 0.4, thickness: 0.04, envMapIntensity: 1.0, side: THREE.DoubleSide }),
  rail:    new THREE.MeshStandardMaterial({ color: 0x33363a, roughness: 0.4, metalness: 0.55 }),
  furn:    new THREE.MeshStandardMaterial({ color: 0xcabfad, roughness: 0.72, metalness: 0.04 }),
};

/* --------------------------- byggja úr módeli ----------------------------- */
const ceilingGroup = new THREE.Group(); scene.add(ceilingGroup);
const collidables = [];
let META = { spawn: [0, 0], bounds: { min: [-8, 0, -8], max: [8, 4, 8] }, height: 3 };

function buildCat(name, data) {
  if (!data || !data.p || !data.p.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(data.p, 3));
  const hasN = data.n && data.n.length === data.p.length && data.n.some((x) => x !== 0);
  if (hasN) g.setAttribute('normal', new THREE.Float32BufferAttribute(data.n, 3));
  g.setIndex(data.i);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (name === 'floor') {                              // planar UV fyrir parket
    const pos = g.attributes.position, uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { uv[2 * i] = pos.getX(i) * 0.34; uv[2 * i + 1] = pos.getZ(i) * 0.34; }
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  }
  const mat = MAT[name] || MAT.wall;
  const mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = (name !== 'floor' && name !== 'glass');
  mesh.receiveShadow = (name !== 'glass');
  return mesh;
}

async function loadModel() {
  // Fyrst: fullbúið GLB (t.d. úr Unreal/Twinmotion). Annars: BIM-JSON úr IFC.
  const glbUrl = `assets/models/${ID}.glb`;
  let hasGlb = false;
  try { const h = await fetch(glbUrl, { method: 'HEAD' }); hasGlb = h.ok; } catch (e) { hasGlb = false; }
  if (hasGlb) { await loadGLB(glbUrl); return; }
  await loadJSON();
}

// Fullbúið módel (GLB) — notar efni/húsgögn úr skránni eins og þau koma
function loadGLB(url) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(url, (gltf) => {
      const root = gltf.scene;
      // kvarða: ef módelið er í cm (risastórt) -> metrar
      const s0 = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
      if (Math.max(s0.x, s0.z) > 60) root.scale.setScalar(0.01);
      // miðja x/z og gólf á y=0
      const box = new THREE.Box3().setFromObject(root);
      const c = box.getCenter(new THREE.Vector3());
      root.position.set(-c.x, -box.min.y, -c.z);
      root.updateMatrixWorld(true);
      root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; collidables.push(o); } });
      scene.add(root);
      const b = new THREE.Box3().setFromObject(root);
      META.bounds = { min: [b.min.x, b.min.y, b.min.z], max: [b.max.x, b.max.y, b.max.z] };
      META.spawn = [0, 0];
      resolve();
    }, undefined, reject);
  });
}

// BIM-geómetría úr IFC (assets/models/<id>.json) með vefefnum
async function loadJSON() {
  const res = await fetch(`assets/models/${ID}.json?v=83`);
  if (!res.ok) throw new Error('model ' + res.status);
  const data = await res.json();
  META = data.meta || META;
  for (const [name, cat] of Object.entries(data.cats)) {
    const mesh = buildCat(name, cat);
    if (!mesh) continue;
    if (name === 'ceiling') ceilingGroup.add(mesh); else scene.add(mesh);
    if (['wall', 'furn', 'rail', 'glass'].includes(name)) collidables.push(mesh);  // ekki hurðir né gólf
  }
}

/* ----------------------------- stýringar ---------------------------------- */
const EYE = 1.62, R = 0.42, SPEED = 2.9;
let START = new THREE.Vector3(0, EYE, 0);

const fp = new PointerLockControls(camera, renderer.domElement);
scene.add(fp.getObject());
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true; orbit.dampingFactor = 0.08; orbit.maxPolarAngle = Math.PI * 0.49; orbit.enabled = false;

const keys = Object.create(null);
addEventListener('keydown', (e) => { keys[e.code] = true; });
addEventListener('keyup', (e) => { keys[e.code] = false; });

const ray = new THREE.Raycaster();
const _o = new THREE.Vector3(), _d = new THREE.Vector3();
function blocked(px, pz, dx, dz, dist) {
  // marg-geisla: hlið-hliðrun (horn) + þrjár hæðir (lágt/miðja/hátt) -> ekkert sleppur gegnum veggi
  const perpx = -dz, perpz = dx;
  for (const off of [-R * 0.8, 0, R * 0.8]) {
    const ox = px + perpx * off, oz = pz + perpz * off;
    for (const hy of [0.35, 1.1, 1.7]) {
      _o.set(ox, hy, oz); _d.set(dx, 0, dz).normalize();
      ray.set(_o, _d); ray.far = dist;
      if (ray.intersectObjects(collidables, false).length > 0) return true;
    }
  }
  return false;
}
// finna opinn stað til að standa á (svo maður spawni ekki ofan í húsgögnum/vegg)
const _cd = new THREE.Vector3(), _co = new THREE.Vector3();
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [0.7, -0.7], [-0.7, 0.7], [-0.7, -0.7]];
function clearAt(x, z) {
  let m = Infinity;
  for (const [dx, dz] of DIRS8) {
    for (const hy of [0.45, 1.3]) {                 // lág + há geisli (grípur húsgögn OG veggi)
      _co.set(x, hy, z); _cd.set(dx, 0, dz).normalize();
      ray.set(_co, _cd); ray.far = 3.5;
      const h = ray.intersectObjects(collidables, false);
      m = Math.min(m, h.length ? h[0].distance : 3.5);
    }
  }
  return m;
}
function bestDir(x, z) {
  let bestD = 2.5, bd = new THREE.Vector3(0, 0, -1);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
    _co.set(x, 1.4, z); _cd.set(dx, 0, dz).normalize(); ray.set(_co, _cd); ray.far = 22;
    const h = ray.intersectObjects(collidables, false);
    const d = h.length ? h[0].distance : 22;
    if (d > bestD) { bestD = d; bd.set(dx, 0, dz); }
  }
  return bd;
}
function findSpawn(sx, sz) {
  const b = META.bounds;
  let best = new THREE.Vector3(sx, EYE, sz), bestScore = clearAt(sx, sz) - 0;
  for (let x = b.min[0] + 0.6; x <= b.max[0] - 0.6; x += 0.6)
    for (let z = b.min[2] + 0.6; z <= b.max[2] - 0.6; z += 0.6) {
      const score = clearAt(x, z) - 0.08 * Math.hypot(x - sx, z - sz);  // opnasti reitur, helst nálægt stofu
      if (score > bestScore) { bestScore = score; best = new THREE.Vector3(x, EYE, z); }
    }
  return best;
}
const _dir = new THREE.Vector3(), _right = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function moveWalk(dt) {
  const f = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
  const r = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
  if (!f && !r) return;
  camera.getWorldDirection(_dir); _dir.y = 0;
  if (_dir.lengthSq() < 1e-6) return; _dir.normalize();
  _right.crossVectors(_dir, _up).normalize();
  const mv = new THREE.Vector3().addScaledVector(_dir, f).addScaledVector(_right, r);
  if (mv.lengthSq() < 1e-6) return;
  mv.normalize().multiplyScalar(SPEED * dt);
  const o = fp.getObject(), px = o.position.x, pz = o.position.z;
  if (mv.x && !blocked(px, pz, Math.sign(mv.x), 0, Math.abs(mv.x) + R)) o.position.x = px + mv.x;
  if (mv.z && !blocked(o.position.x, pz, 0, Math.sign(mv.z), Math.abs(mv.z) + R)) o.position.z = pz + mv.z;
  o.position.y = EYE;
}

/* ------------------------------- hamur ------------------------------------ */
let mode = 'walk';
function dollCam() {
  const b = META.bounds, cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
  const span = Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2]);
  camera.position.set(cx, span * 1.05 + 5, cz + span * 0.72);
  orbit.target.set(cx, 0.6, cz); orbit.update();
}
function setMode(m) {
  mode = m;
  document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('is-on', b.dataset.mode === m));
  if (m === 'doll') {
    fp.unlock(); orbit.enabled = true; ceilingGroup.visible = false; dollCam();
    hintEl.textContent = hintEl.dataset.doll; hintEl.style.opacity = '1'; crossEl.style.display = 'none';
  } else {
    orbit.enabled = false; ceilingGroup.visible = true;
    const b = META.bounds, cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
    fp.getObject().position.copy(START);
    const d = bestDir(START.x, START.z);        // horfa eftir lengstu opnu línu (ekki á vegg)
    camera.lookAt(START.x + d.x, EYE, START.z + d.z);
    hintEl.textContent = hintEl.dataset.walk; hintEl.style.opacity = '1';
  }
}
document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
renderer.domElement.addEventListener('click', () => { if (mode === 'walk') fp.lock(); });
fp.addEventListener('lock', () => { crossEl.style.display = 'block'; hintEl.style.opacity = '0'; });
fp.addEventListener('unlock', () => { crossEl.style.display = 'none'; if (mode === 'walk') hintEl.style.opacity = '1'; });

/* ------------------------------- lykkja ----------------------------------- */
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (mode === 'walk') { if (fp.isLocked) moveWalk(dt); } else orbit.update();
  renderer.render(scene, camera);
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
function showFallback() { const fb = document.getElementById('fallback3d'); if (fb) fb.hidden = false; if (bootEl) bootEl.hidden = true; }

loadModel().then(() => {
  START = findSpawn(META.spawn[0], META.spawn[1]);
  if (bootEl) bootEl.hidden = true;
  setMode('walk');
  animate();
}).catch((e) => { console.error(e); showFallback(); });
