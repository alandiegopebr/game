import * as THREE from '/vendor/three/build/three.module.js';

const canvas = document.getElementById('game');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');
minimapCanvas.width = 160;
minimapCanvas.height = 160;
const info = document.getElementById('info');
const hudXp = document.getElementById('hud-xp');
const hudAtk = document.getElementById('hud-atk');
const hudDash = document.getElementById('hud-dash');
const invBar = document.getElementById('inv');
const heartsEl = document.getElementById('hearts');

const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
const ws = new WebSocket(WS_URL);

let myId = null;
let map = { w: 0, h: 0, tile: 25, tiles: [] };
const state = { players: new Map(), mobs: new Map(), drops: new Map(), projectiles: new Map(), destructibles: new Map() };
const me = { hp: 100, maxHp: 100, level: 1, xp: 0, inv: { potion: 0 }, atkCd: 0, dashCd: 0 };

// Áudio simples (WebAudio) com toggle M
let audioCtx = null; let muted = false; let bgMusic = null;
function ensureAudio(){ if (!audioCtx) { try { audioCtx = new (window.AudioContext||window.webkitAudioContext)(); } catch{} } }
function sfx(freq=440, dur=0.08, type='sine', gain=0.02){ if (muted || !audioCtx) return; const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type=type; o.frequency.value=freq; g.gain.value=gain; o.connect(g).connect(audioCtx.destination); const t=audioCtx.currentTime; o.start(t); o.stop(t+dur); }
function playAttack(){ sfx(220,0.06,'square',0.03); }
function playHurt(){ sfx(110,0.08,'sawtooth',0.04); }
function playPickup(){ sfx(440,0.05,'sine',0.015); sfx(550,0.05,'sine',0.015); }
function playDestroy(){ sfx(180,0.1,'triangle',0.025); sfx(140,0.12,'sawtooth',0.02); }
function playLevelUp(){ sfx(523,0.15,'sine',0.02); sfx(659,0.15,'sine',0.02); sfx(784,0.2,'sine',0.025); }
function startBgMusic(){
  if (!audioCtx || muted || bgMusic) return;
  const o1=audioCtx.createOscillator(), o2=audioCtx.createOscillator();
  const g=audioCtx.createGain();
  o1.type='triangle'; o2.type='sine';
  const melody = [262,294,330,349,392,349,330,294]; // C D E F G F E D
  let idx = 0;
  o1.frequency.value = melody[0];
  o2.frequency.value = melody[0] * 0.5;
  g.gain.value = 0.008; // volume baixo para fundo
  o1.connect(g); o2.connect(g); g.connect(audioCtx.destination);
  o1.start();
  o2.start();
  bgMusic = { o1, o2, g, idx, melody };
  setInterval(() => {
    if (!bgMusic || muted) return;
    bgMusic.idx = (bgMusic.idx + 1) % bgMusic.melody.length;
    const f = bgMusic.melody[bgMusic.idx];
    bgMusic.o1.frequency.setValueAtTime(f, audioCtx.currentTime);
    bgMusic.o2.frequency.setValueAtTime(f * 0.5, audioCtx.currentTime);
  }, 500);
}
function stopBgMusic(){
  if (bgMusic) { bgMusic.o1.stop(); bgMusic.o2.stop(); bgMusic = null; }
}

// Three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1220);

// Câmera ortográfica top-down estilo Zelda
let camera;
function createOrthoCamera(){
  const w = window.innerWidth, h = window.innerHeight; const aspect = w/h;
  const viewSize = 180; // controla o zoom
  const left = -viewSize*aspect/2, right = viewSize*aspect/2;
  const top = viewSize/2, bottom = -viewSize/2;
  camera = new THREE.OrthographicCamera(left, right, top, bottom, 0.1, 1000);
  camera.position.set(0, 150, 0);
  camera.up.set(0,0,-1); // olhar "para baixo" no eixo Y
  camera.lookAt(new THREE.Vector3(0, 0, 0));
}
createOrthoCamera();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  // Atualiza ortográfica
  const aspect = w / h; const viewSize = 180; 
  camera.left = -viewSize*aspect/2; camera.right = viewSize*aspect/2;
  camera.top = viewSize/2; camera.bottom = -viewSize/2; camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);
renderer.shadowMap.enabled = false;

const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(60, 80, 40);
scene.add(dir);

// Sem OrbitControls: câmera segue o jogador por cima

// Materials
const matGroundA = new THREE.MeshStandardMaterial({ color: 0x0f1a2f });
const matGroundB = new THREE.MeshStandardMaterial({ color: 0x0d1627 });
const matWall = new THREE.MeshStandardMaterial({ color: 0x203549, metalness: 0.1, roughness: 0.9 });
const matPlayerMe = new THREE.MeshStandardMaterial({ color: 0xffd166 });
const matPlayerOther = new THREE.MeshStandardMaterial({ color: 0x118ab2 });
const matMob = new THREE.MeshStandardMaterial({ color: 0x7cc36e });
const matDrop = new THREE.MeshStandardMaterial({ color: 0xff5e86, emissive: 0x33111d, emissiveIntensity: 0.5 });

// efeitos e estados auxiliares
const lastMobHp = new Map(); // id -> hp anterior
const dmgTexts = []; // sprites de dano flutuante
let lastMyHp = null; // para câmera shake
let shakeT = 0, shakeAmp = 0;

const worldGroup = new THREE.Group();
scene.add(worldGroup);
const playersGroup = new THREE.Group();
const mobsGroup = new THREE.Group();
const dropsGroup = new THREE.Group();
const projectilesGroup = new THREE.Group();
scene.add(playersGroup, mobsGroup, dropsGroup, projectilesGroup);

function buildWorld(){
  worldGroup.clear();
  // ground tiles
  const tile = map.tile; const w = map.w; const h = map.h;
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      const even = ((x+y)&1)===0;
      const geo = new THREE.PlaneGeometry(tile, tile);
      const mesh = new THREE.Mesh(geo, even? matGroundA : matGroundB);
      mesh.rotation.x = -Math.PI/2;
      mesh.position.set(x*tile + tile/2, 0, y*tile + tile/2);
      worldGroup.add(mesh);
      const t = map.tiles[y*w+x];
      if (t===1){
        const g2 = new THREE.BoxGeometry(tile, tile*0.8, tile);
        const wall = new THREE.Mesh(g2, matWall);
        wall.position.set(x*tile + tile/2, tile*0.4, y*tile + tile/2);
        worldGroup.add(wall);
      }
    }
  }
}

const playerMeshes = new Map(); // id -> mesh
const mobMeshes = new Map();
const dropMeshes = new Map();
const projectileMeshes = new Map();
const destructibleMeshes = new Map();
const playerBars = new Map(); // id -> group
const mobBars = new Map(); // id -> group

function ensurePlayer(id, x, z, hp, maxHp){
  let mesh = playerMeshes.get(id);
  if (!mesh){
    const geo = new THREE.SphereGeometry(8, 16, 12);
    const mat = (id===myId)? matPlayerMe : matPlayerOther;
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 8, z);
    playersGroup.add(mesh);
    playerMeshes.set(id, mesh);
  }
  mesh.material = (id===myId)? matPlayerMe : matPlayerOther;
  // suavização de posição
  mesh.position.x += (x - mesh.position.x) * 0.25;
  mesh.position.y = 8;
  mesh.position.z += (z - mesh.position.z) * 0.25;
  // barra de vida
  const ratio = Math.max(0, Math.min(1, (hp||1)/Math.max(1,maxHp||100)));
  ensureHealthBar(playerBars, id, mesh, ratio);
}

function ensureMob(id, x, z){
  let mesh = mobMeshes.get(id);
  if (!mesh){
    const geo = new THREE.BoxGeometry(12, 12, 12);
    mesh = new THREE.Mesh(geo, matMob);
    mesh.position.set(x, 6, z);
    mobsGroup.add(mesh);
    mobMeshes.set(id, mesh);
  }
  mesh.position.x += (x - mesh.position.x) * 0.22;
  mesh.position.y = 6;
  mesh.position.z += (z - mesh.position.z) * 0.22;
  const mob = state.mobs.get(id);
  if (mob){
    const ratio = Math.max(0, Math.min(1, (mob.hp||1)/60));
    ensureHealthBar(mobBars, id, mesh, ratio);
  }
}

function ensureDrop(id, x, z){
  let mesh = dropMeshes.get(id);
  if (!mesh){
    const geo = new THREE.SphereGeometry(4, 12, 10);
    mesh = new THREE.Mesh(geo, matDrop);
    mesh.position.set(x, 4, z);
    dropsGroup.add(mesh);
    dropMeshes.set(id, mesh);
  }
  mesh.position.x += (x - mesh.position.x) * 0.3;
  mesh.position.y = 4;
  mesh.position.z += (z - mesh.position.z) * 0.3;
}

function ensureProjectile(id, x, z){
  let mesh = projectileMeshes.get(id);
  if (!mesh){
    const geo = new THREE.SphereGeometry(3, 10, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf4d35e, emissive: 0x332b00, emissiveIntensity: 0.7 });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 4, z);
    projectilesGroup.add(mesh);
    projectileMeshes.set(id, mesh);
  }
  mesh.position.x += (x - mesh.position.x) * 0.4;
  mesh.position.y = 4;
  mesh.position.z += (z - mesh.position.z) * 0.4;
}

function ensureDestructible(id, kind, x, z){
  let mesh = destructibleMeshes.get(id);
  if (!mesh){
    if (kind === 'pot'){
      const geo = new THREE.CylinderGeometry(5, 6, 10, 12);
      const mat = new THREE.MeshStandardMaterial({ color: 0xcd853f, roughness: 0.8 });
      mesh = new THREE.Mesh(geo, mat);
    } else { // grass
      const geo = new THREE.ConeGeometry(4, 8, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0x66bb6a, roughness: 0.9 });
      mesh = new THREE.Mesh(geo, mat);
    }
    mesh.position.set(x, 5, z);
    scene.add(mesh);
    destructibleMeshes.set(id, mesh);
  }
  mesh.position.x = x;
  mesh.position.z = z;
}

function syncMeshes(){
  // players
  for (const [id,p] of state.players){ ensurePlayer(id, p.x, p.y); }
  for (const [id,mesh] of playerMeshes){ if (!state.players.has(id)){ playersGroup.remove(mesh); mesh.geometry.dispose(); playerMeshes.delete(id); }}
  // mobs
  for (const [id,m] of state.mobs){
    const prev = lastMobHp.get(id);
    ensureMob(id, m.x, m.y);
    if (typeof prev === 'number' && m.hp < prev){
      spawnDamageText(prev - m.hp, m.x, m.y);
      const mesh = mobMeshes.get(id); if (mesh){ mesh.userData.hitT = 0.15; }
    }
    lastMobHp.set(id, m.hp);
  }
  for (const [id,mesh] of mobMeshes){ if (!state.mobs.has(id)){ mobsGroup.remove(mesh); mesh.geometry.dispose(); mobMeshes.delete(id); lastMobHp.delete(id); }}
  // drops
  for (const [id,d] of state.drops){ ensureDrop(id, d.x, d.y); }
  for (const [id,mesh] of dropMeshes){ if (!state.drops.has(id)){ dropsGroup.remove(mesh); mesh.geometry.dispose(); dropMeshes.delete(id); }}
  // projectiles
  for (const [id,p] of state.projectiles){ ensureProjectile(id, p.x, p.y); }
  for (const [id,mesh] of projectileMeshes){ if (!state.projectiles.has(id)){ projectilesGroup.remove(mesh); mesh.geometry.dispose(); projectileMeshes.delete(id); }}
  // destructibles
  for (const [id,d] of state.destructibles){ ensureDestructible(id, d.kind, d.x, d.y); }
  for (const [id,mesh] of destructibleMeshes){ 
    if (!state.destructibles.has(id)){ 
      scene.remove(mesh); 
      mesh.geometry.dispose(); 
      destructibleMeshes.delete(id);
      playDestroy(); // som de destruição
    }
  }
}

function spawnDamageText(amount, x, z){
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeTextTexture(String(amount), '#ffd166'), transparent: true }));
  sprite.scale.set(16, 8, 1);
  sprite.position.set(x, 16, z);
  scene.add(sprite);
  dmgTexts.push({ mesh: sprite, vel: new THREE.Vector3(0, 18, 0), life: 0.9 });
}

function makeTextTexture(text, color){
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d'); g.clearRect(0,0,c.width,c.height);
  g.font = '28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillText(text, 66, 34);
  g.fillStyle = color || '#fff'; g.fillText(text, 64, 32);
  const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true; return tex;
}

function ensureHealthBar(mapBars, id, parentMesh, ratio){
  let g = mapBars.get(id);
  const W = 16, H = 2;
  if (!g){
    g = new THREE.Group();
    const geoBg = new THREE.PlaneGeometry(W, H);
    const geoFg = new THREE.PlaneGeometry(W, H);
    const matBg = new THREE.MeshBasicMaterial({ color: 0x222a33, transparent:true, opacity:0.85 });
    const matFg = new THREE.MeshBasicMaterial({ color: 0xef476f });
    const bg = new THREE.Mesh(geoBg, matBg);
    const fg = new THREE.Mesh(geoFg, matFg);
    fg.position.z = 0.01;
    g.add(bg); g.add(fg);
    g.position.set(0, parentMesh.position.y + (parentMesh.geometry.boundingSphere?.radius || 10) + 8, 0);
    parentMesh.add(g);
    parentMesh.userData.bar = g;
    mapBars.set(id, g);
  }
  const fg = g.children[1];
  const clamped = Math.max(0, Math.min(1, ratio));
  fg.scale.x = clamped;
  fg.position.x = -W/2 + (W*clamped)/2;
}

ws.addEventListener('open', () => { info.textContent = 'Conectado. Carregando mapa 3D...'; });

ws.addEventListener('message', (ev) => {
  const data = JSON.parse(ev.data);
  if (data.type === 'welcome') {
    myId = data.id;
    map = data.map;
    Object.assign(me, data.you);
    applySnapshot(data.state);
    buildWorld();
    info.textContent = `Você: ${myId} — Nível ${me.level}`;
    renderInventory();
    updateHud();
    startBgMusic(); // inicia música de fundo
  } else if (data.type === 'state') {
    applySnapshot(data.state);
  } else if (data.type === 'me') {
    const prevHp = me.hp;
    const prevLevel = me.level;
    const prevInv = JSON.stringify(me.inv);
    Object.assign(me, data);
    if (typeof prevHp === 'number' && me.hp < prevHp){
      shakeT = 0.25; shakeAmp = 2.2;
      playHurt();
    }
    if (prevLevel && me.level > prevLevel){
      playLevelUp();
    }
    if (prevInv !== JSON.stringify(me.inv)){
      playPickup();
    }
    renderInventory();
    updateHud();
  }
});

function applySnapshot(s){
  state.players.clear(); s.players.forEach(p=> state.players.set(p.id, p));
  state.mobs.clear(); s.mobs.forEach(m=> state.mobs.set(m.id, m));
  state.drops.clear(); s.drops.forEach(d=> state.drops.set(d.id, d));
  state.projectiles.clear(); s.projectiles?.forEach(p=> state.projectiles.set(p.id, p));
  state.destructibles.clear(); s.destructibles?.forEach(d=> state.destructibles.set(d.id, d));
}

// input handling
const keys = {}; const edge = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true; if (!edge[e.key]) edge[e.key] = true;
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","1","2","3","4","5","w","a","s","d"].includes(e.key)) e.preventDefault();
  if (!audioCtx) ensureAudio();
  if ((e.key==='m' || e.key==='M') && edge[e.key]) { 
    muted = !muted; 
    if (muted) stopBgMusic(); 
    else startBgMusic();
    info.textContent = (muted? 'Mudo' : 'Som ativo') + ' — ' + info.textContent; 
  }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

function processInput(){
  if (ws.readyState !== WebSocket.OPEN) return;
  const payload = { type:'input', keys: {
    up: !!(keys['ArrowUp']||keys['w']),
    down: !!(keys['ArrowDown']||keys['s']),
    left: !!(keys['ArrowLeft']||keys['a']),
    right: !!(keys['ArrowRight']||keys['d'])
  }, attack: false, dash: false };
  if (edge[' ']) { payload.attack = true; playAttack(); spawnSlashVfx(); }
  if (edge['Shift'] || edge['e'] || edge['E']) payload.dash = true;
  let useSlot = null; for (let i=1;i<=5;i++){ if (edge[String(i)]) { useSlot = i; break; } }
  if (useSlot!=null) payload.useSlot = useSlot;
  ws.send(JSON.stringify(payload));
  edge[' '] = false; for (let i=1;i<=5;i++) edge[String(i)] = false;
  edge['Shift'] = false; edge['e'] = false; edge['E'] = false;
}

function updateHud(){
  hudXp.textContent = `Nível ${me.level} — XP: ${me.xp}`;
  hudAtk.textContent = `ATK: ${Math.max(0, Math.ceil((me.atkCd||0)/100))}ms`;
  hudDash.textContent = `DASH: ${Math.max(0, Math.ceil((me.dashCd||0)/100))}ms`;
  renderHearts();
}

function renderHearts(){
  if (!heartsEl) return;
  heartsEl.innerHTML = '';
  const hearts = Math.ceil(me.maxHp/20); // cada coração = 20 de HP
  const full = Math.floor(Math.max(0, me.hp)/20);
  const half = (me.hp % 20) >= 10 ? 1 : 0;
  for (let i=0;i<hearts;i++){
    const h = document.createElement('div'); h.className='heart';
    const fill = document.createElement('div'); fill.className='heart-fill';
    let ratio = 0;
    if (i < full) ratio = 1;
    else if (i === full && half) ratio = 0.5;
    fill.style.width = `${ratio*100}%`;
    h.appendChild(fill);
    heartsEl.appendChild(h);
  }
}

function renderInventory(){
  invBar.innerHTML = '';
  const slots = [ {key:1, label:'1', icon:'🧪', kind:'potion', count: me.inv.potion||0} ];
  for (const s of slots){
    const el = document.createElement('div'); el.className='slot';
    const badge = document.createElement('div'); badge.className='count'; badge.textContent = String(s.count);
    el.textContent = `${s.icon} ${s.label}`; el.appendChild(badge);
    invBar.appendChild(el);
  }
}

let last = performance.now();
let fps = 0, fpsAcc = 0, fpsCount = 0, fpsLast = performance.now();
function animate(){
  const now = performance.now();
  const dt = (now - last) / 1000; last = now;
  // câmera top-down seguindo o jogador
  const my = state.players.get(myId);
  if (my){
    const desired = new THREE.Vector3(my.x, 150, my.y);
    camera.position.x += (desired.x - camera.position.x) * 0.15;
    camera.position.y = 150;
    camera.position.z += (desired.z - camera.position.z) * 0.15;
    camera.lookAt(new THREE.Vector3(my.x, 0, my.y));
  }
  syncMeshes();
  // hit flash nos mobs
  for (const [,mesh] of mobMeshes){
    if (mesh.userData.hitT && mesh.userData.hitT > 0){
      mesh.userData.hitT -= (dt);
      const t = Math.max(0, mesh.userData.hitT);
      // emissive em vermelho breve
      const e = new THREE.Color(0.6, 0, 0);
      mesh.material.emissive = e.multiplyScalar(t);
    }
  }

  // barras de vida sempre olhando para a câmera
  for (const [,mesh] of playerMeshes){ const g = mesh.userData.bar; if (g){ g.lookAt(camera.position); } }
  for (const [,mesh] of mobMeshes){ const g = mesh.userData.bar; if (g){ g.lookAt(camera.position); } }

  // atualizar textos de dano
  for (let i=dmgTexts.length-1;i>=0;i--){
    const d = dmgTexts[i]; d.life -= dt; d.mesh.position.addScaledVector(d.vel, dt); d.mesh.material.opacity = Math.max(0, d.life);
    if (d.life <= 0){ scene.remove(d.mesh); if (d.mesh.material.map) d.mesh.material.map.dispose(); d.mesh.material.dispose(); dmgTexts.splice(i,1); }
  }

  // camera shake quando o player leva dano
  if (shakeT > 0){
    shakeT -= dt; const s = shakeAmp * (shakeT/0.25);
    const ox = (Math.random()-0.5) * s; const oy = (Math.random()-0.5) * s; const oz = (Math.random()-0.5) * s;
    camera.position.x += ox; camera.position.y += oy; camera.position.z += oz;
  }

  // FPS
  fpsAcc += dt; fpsCount++;
  if (now - fpsLast > 500){ fps = Math.round(fpsCount / fpsAcc); fpsAcc = 0; fpsCount = 0; fpsLast = now; info.textContent = `Você: ${myId ?? '--'} — Nível ${me.level} — ${fps} FPS`; }

  renderMinimap();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function renderMinimap(){
  const ctx = minimapCtx;
  const w = minimapCanvas.width, h = minimapCanvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!map.tiles || !map.w || !map.h) return;
  
  const scale = Math.min(w / (map.w * map.tile), h / (map.h * map.tile));
  const offsetX = (w - map.w * map.tile * scale) / 2;
  const offsetY = (h - map.h * map.tile * scale) / 2;
  
  // desenhar tiles
  for (let y = 0; y < map.h; y++){
    for (let x = 0; x < map.w; x++){
      const tile = map.tiles[y * map.w + x];
      ctx.fillStyle = tile === 1 ? '#1a2332' : '#0a1119';
      ctx.fillRect(offsetX + x * map.tile * scale, offsetY + y * map.tile * scale, map.tile * scale, map.tile * scale);
    }
  }
  
  // desenhar jogadores
  for (const [id, p] of state.players){
    ctx.fillStyle = id === myId ? '#06d6a0' : '#4a9eff';
    const px = offsetX + p.x * scale;
    const py = offsetY + p.y * scale;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // desenhar mobs
  for (const [, m] of state.mobs){
    ctx.fillStyle = '#ef476f';
    const mx = offsetX + m.x * scale;
    const my = offsetY + m.y * scale;
    ctx.beginPath();
    ctx.arc(mx, my, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// VFX de golpe estilo Zelda: arco rápido em torno do player local
function spawnSlashVfx(){
  const my = state.players.get(myId); if (!my) return;
  const geo = new THREE.RingGeometry(10, 24, 32, 1, Math.PI*0.1, Math.PI*0.6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff3a3, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat); mesh.rotation.x = -Math.PI/2; mesh.position.set(my.x, 0.1, my.y);
  scene.add(mesh);
  const start = performance.now();
  const life = 180; // ms
  function tick(){
    const t = performance.now()-start; const k = 1 - (t/life);
    mesh.scale.set(1+0.8*(1-k), 1+0.8*(1-k), 1);
    mesh.material.opacity = Math.max(0, k);
    if (t < life) requestAnimationFrame(tick); else { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
  }
  requestAnimationFrame(tick);
}

setInterval(processInput, 50);
requestAnimationFrame(animate);
