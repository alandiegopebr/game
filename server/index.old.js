const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const compression = require('compression');

// EtherQuest: um RPG top-down multiplayer simples (servidor autoritativo)
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(compression());
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h', etag: true, lastModified: true }));
// Servir módulos Three.js diretamente de node_modules
app.use('/vendor/three', express.static(path.join(__dirname, '..', 'node_modules', 'three')));

// ===== Mundo =====
const TILE = 25;
const MAP_W = 28; // 28 * 25 = 700
const MAP_H = 20; // 20 * 25 = 500

function generateMap() {
  // 0 = chão, 1 = parede
  const t = new Array(MAP_W * MAP_H).fill(0);
  // bordas
  for (let x = 0; x < MAP_W; x++) { t[idx(x,0)] = 1; t[idx(x,MAP_H-1)] = 1; }
  for (let y = 0; y < MAP_H; y++) { t[idx(0,y)] = 1; t[idx(MAP_W-1,y)] = 1; }
  // alguns obstáculos internos
  for (let x = 5; x < 23; x++) t[idx(x, 8)] = 1;
  for (let y = 4; y < 15; y++) t[idx(14, y)] = 1;
  // aberturas
  t[idx(10,8)] = 0; t[idx(18,8)] = 0; t[idx(14,10)] = 0; t[idx(14,6)] = 0;
  return t;
}

function idx(x,y){ return y*MAP_W + x; }
function solidAt(tx,ty){ if (tx<0||ty<0||tx>=MAP_W||ty>=MAP_H) return true; return world.tiles[idx(tx,ty)]===1; }

const world = {
  tiles: generateMap(),
  players: new Map(), // id -> player
  mobs: new Map(), // id -> mob
  drops: new Map(), // id -> {id, kind, x, y, amount}
  projectiles: new Map(), // id -> {id,x,y,vx,vy,speed,dmg,ttl,from}
  destructibles: new Map(), // id -> {id, kind, x, y, hp}
  nextEntityId: 1,
};

function nextId(){ return String(world.nextEntityId++); }

// ===== Entidades =====
function spawnPlayer(id, name){
  const p = {
    id, name,
    x: TILE*2 + Math.random()*TILE*4,
    y: TILE*2 + Math.random()*TILE*4,
    vx: 0, vy: 0, // velocidade para aceleração suave
    speed: 3,
    hp: 100, maxHp: 100,
    xp: 0, level: 1,
    gold: 0,
    inv: { potion: 1 },
    input: { up:false,down:false,left:false,right:false,attack:false,dash:false,useSlot:null },
    atkCooldown: 0,
    dashCooldown: 0,
    facing: { x: 1, y: 0 },
    dead: false,
    respawnT: 0,
    ws: null,
  };
  world.players.set(id, p);
  return p;
}

function spawnMob(kind='slime', x=TILE*(10+Math.random()*8), y=TILE*(6+Math.random()*6)){
  const id = nextId();
  let stats;
  if (kind==='slime') stats = { hp: 40, speed: 2.2, atk: 8, range: 20, xp: 15 };
  else if (kind==='ranger') stats = { hp: 50, speed: 2.0, atk: 7, range: 180, xp: 22, shotCd: 900, projSpeed: 7 };
  else if (kind==='brute') stats = { hp: 120, speed: 1.8, atk: 16, range: 26, xp: 60 };
  else if (kind==='bat') stats = { hp: 35, speed: 2.6, atk: 6, range: 18, xp: 18, swoopCd: 1500 };
  else stats = { hp:60, speed:2.5, atk:10, range:20, xp:20 };
  const m = { id, kind, x, y, hp: stats.hp, speed: stats.speed, atk: stats.atk, range: stats.range, xpGain: stats.xp, target: null, cd: 0, shotCd: stats.shotCd||0, projSpeed: stats.projSpeed||0, phase: Math.random()*Math.PI*2, swoopCd: stats.swoopCd||0 };
  world.mobs.set(id, m);
  return m;
}

// população inicial de mobs
for (let i=0;i<6;i++) spawnMob('slime');
for (let i=0;i<2;i++) spawnMob('ranger');
for (let i=0;i<3;i++) spawnMob('bat');
spawnMob('brute', TILE*20, TILE*10);

// objetos destrutíveis (potes e grama)
function spawnDestructible(kind='pot', x, y){
  const id = nextId();
  const hp = kind==='pot' ? 1 : 1;
  world.destructibles.set(id, { id, kind, x, y, hp });
  return id;
}
// Espalhar potes e grama pelo mapa
for (let i=0;i<12;i++){
  const x = TILE*(3 + Math.random()*22);
  const y = TILE*(3 + Math.random()*14);
  const kind = Math.random() > 0.5 ? 'pot' : 'grass';
  spawnDestructible(kind, x, y);
}

// ===== Utilidades =====
function tryMove(entity, dx, dy){
  const nx = entity.x + dx, ny = entity.y + dy;
  const r = 10; // raio colisor aproximado
  const tx0 = Math.floor((nx - r)/TILE), ty0 = Math.floor((ny - r)/TILE);
  const tx1 = Math.floor((nx + r)/TILE), ty1 = Math.floor((ny + r)/TILE);
  for (let ty=ty0; ty<=ty1; ty++){
    for (let tx=tx0; tx<=tx1; tx++){
      if (solidAt(tx,ty)) return false;
    }
  }
  entity.x = nx; entity.y = ny; return true;
}

function dist2(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return dx*dx+dy*dy; }

function spawnProjectile({ x, y, tx, ty, speed=7, dmg=6, from='mob' }){
  const id = nextId();
  const dx = tx - x, dy = ty - y; const d = Math.max(1, Math.hypot(dx,dy));
  const vx = dx/d, vy = dy/d;
  world.projectiles.set(id, { id, x, y, vx, vy, speed, dmg, ttl: 1800, from });
  return id;
}

// ===== Jogo (loop) =====
const TICK_MS = 50; // 20 TPS
setInterval(gameTick, TICK_MS);

function gameTick(){
  // players movement and actions
  for (const [,p] of world.players){
    if (p.dead){
      if (p.respawnT>0){ p.respawnT -= TICK_MS; if (p.respawnT<=0) respawn(p); }
      continue;
    }
    // Movimento estilo Zelda: aceleração/desaceleração e prioridade de eixo
    let dx = (p.input.right?1:0) - (p.input.left?1:0);
    let dy = (p.input.down?1:0) - (p.input.up?1:0);
    const accel = 0.6, friction = 0.75;
    if (dx||dy){
      // prioridade horizontal (se ambos pressionados, prefere horizontal)
      if (Math.abs(dx) > 0 && Math.abs(dy) > 0) dy = 0;
      const len=Math.hypot(dx,dy); dx/=len; dy/=len;
      p.vx += dx * accel; p.vy += dy * accel;
      p.facing.x = dx; p.facing.y = dy;
    }
    // fricção
    p.vx *= friction; p.vy *= friction;
    // limitar velocidade máxima
    const maxV = p.speed;
    const v = Math.hypot(p.vx, p.vy);
    if (v > maxV){ p.vx = (p.vx/v)*maxV; p.vy = (p.vy/v)*maxV; }
    tryMove(p, p.vx, p.vy);

    if (p.atkCooldown>0) p.atkCooldown -= TICK_MS;
    if (p.dashCooldown>0) p.dashCooldown -= TICK_MS;
    if (p.input.attack && p.atkCooldown<=0){
      doAttack(p);
      p.atkCooldown = 450; // ms
    }
    if (p.input.dash && p.dashCooldown<=0){
      performDash(p);
      p.dashCooldown = 1200; // ms
    }
    if (p.input.useSlot!=null){
      useSlot(p, p.input.useSlot);
      p.input.useSlot = null;
    }
    // auto-pickup
    for (const [id,d] of world.drops){ if (dist2(p,d) < 18*18){ pickup(p,id,d); }}
  }

  // mobs AI
  for (const [,m] of world.mobs){
    if (m.hp<=0) continue;
    // choose nearest player
    let nearest=null, best=1e9;
    for (const [,p] of world.players){ if (p.dead) continue; const d=dist2(m,p); if (d<best){ best=d; nearest=p; }}
    if (nearest){
      const d = Math.sqrt(best);
      const vx = (nearest.x - m.x)/Math.max(d, 1);
      const vy = (nearest.y - m.y)/Math.max(d, 1);
      // movimento por tipo
      if (m.kind==='bat'){
        m.phase += 0.15;
        const sx = Math.cos(m.phase) * 0.8;
        const sy = Math.sin(m.phase*1.3) * 0.6;
        let mx = vx*(m.speed+0.6) + sx;
        let my = vy*(m.speed+0.6) + sy;
        if (m.swoopCd>0) m.swoopCd -= TICK_MS; else if (d < 140){ mx*=2.2; my*=2.2; m.swoopCd = 1600; }
        tryMove(m, mx, my);
        if (d < m.range + 10){ if (m.cd<=0){ damagePlayer(nearest, m.atk); m.cd = 600; } }
      } else if (m.kind==='ranger'){
        // Ranger prefere manter distância média e atirar projétil
        if (m.shotCd>0) m.shotCd -= TICK_MS;
        if (d > 60 && d < (m.range||160) && m.shotCd<=0){
          spawnProjectile({ x: m.x, y: m.y, tx: nearest.x, ty: nearest.y, speed: m.projSpeed||7, dmg: m.atk, from: 'mob' });
          m.shotCd = 900 + Math.random()*400;
        }
        // ranger também se move lentamente
        tryMove(m, vx*(m.speed*0.6), vy*(m.speed*0.6));
      } else {
        // ataque corpo-a-corpo
        tryMove(m, vx*m.speed, vy*m.speed);
        if (d < m.range + 10){ if (m.cd<=0){ damagePlayer(nearest, m.atk); m.cd = 700; } }
      }
    }
    if (m.cd>0) m.cd -= TICK_MS;
  }

  // projectiles update
  for (const [id, pr] of Array.from(world.projectiles)){
    // movimento
    const stepX = pr.vx * pr.speed;
    const stepY = pr.vy * pr.speed;
    const nx = pr.x + stepX, ny = pr.y + stepY;
    // colisão com parede
    if (solidAt(Math.floor(nx/TILE), Math.floor(ny/TILE))){ world.projectiles.delete(id); continue; }
    pr.x = nx; pr.y = ny; pr.ttl -= TICK_MS;
    // colisão com jogadores
    for (const [,p] of world.players){
      if (p.dead) continue;
      const dx = p.x - pr.x, dy = p.y - pr.y; if (dx*dx + dy*dy < 12*12){
        damagePlayer(p, pr.dmg);
        world.projectiles.delete(id);
        break;
      }
    }
    if (pr.ttl<=0) world.projectiles.delete(id);
  }

  // broadcast state
  broadcastState();
}

function doAttack(p){
  // Ataque em cone baseado na direção (facing)
  const range = 34;
  const cosAngle = Math.cos(Math.PI/3); // 60°
  let best=1e9, hit=null;
  const fx = p.facing.x || 1, fy = p.facing.y || 0;
  for (const [,m] of world.mobs){
    if (m.hp<=0) continue;
    const dx = m.x - p.x, dy = m.y - p.y; const d2 = dx*dx + dy*dy;
    if (d2 > range*range) continue;
    const d = Math.sqrt(Math.max(1e-6, d2));
    const dot = (dx/d)*fx + (dy/d)*fy;
    if (dot >= cosAngle && d2 < best){ best = d2; hit = m; }
  }
  if (hit){
    hit.hp -= 22;
    // knockback simples
    const mx = hit.x - p.x, my = hit.y - p.y; const md = Math.max(1, Math.hypot(mx,my));
    const kx = (mx/md) * 6, ky = (my/md) * 6;
    tryMove(hit, kx, ky);
    if (hit.hp<=0){
      if (Math.random()<0.6) dropItem('potion', hit.x, hit.y, 1+Math.floor(Math.random()*2));
      grantXP(p, hit.xpGain);
    }
  }
  // destrutíveis (potes e grama)
  for (const [id,dest] of world.destructibles){
    const dx = dest.x - p.x, dy = dest.y - p.y; const d2 = dx*dx + dy*dy;
    if (d2 > range*range) continue;
    const d = Math.sqrt(Math.max(1e-6, d2));
    const dot = (dx/d)*fx + (dy/d)*fy;
    if (dot >= cosAngle){
      dest.hp -= 1;
      if (dest.hp <= 0){
        // drop loot
        if (Math.random() < 0.4) dropItem('coin', dest.x, dest.y, 1+Math.floor(Math.random()*3));
        if (Math.random() < 0.2) dropItem('potion', dest.x, dest.y, 1);
        world.destructibles.delete(id);
      }
    }
  }
}

function performDash(p){
  // Dash curto na direção atual, respeitando colisão
  const fx = p.facing.x || 1, fy = p.facing.y || 0;
  const dist = 50; const steps = 10;
  const stepX = (fx * dist) / steps; const stepY = (fy * dist) / steps;
  for (let i=0;i<steps;i++){
    if (!tryMove(p, stepX, stepY)) break;
  }
}

function dropItem(kind,x,y,amount){
  const id = nextId();
  world.drops.set(id, { id, kind, x, y, amount });
}

function pickup(p,id,d){
  if (!world.drops.has(id)) return;
  world.drops.delete(id);
  p.inv[d.kind] = (p.inv[d.kind]||0) + d.amount;
  sendTo(p, { type:'me', inv:p.inv, gold:p.gold, hp:p.hp, maxHp:p.maxHp, level:p.level, xp:p.xp, atkCd:p.atkCooldown, dashCd:p.dashCooldown });
}

function useSlot(p, slot){
  // slots mapeados: 1=potion
  if (slot===1 && (p.inv.potion||0)>0){
    p.inv.potion -= 1;
    p.hp = Math.min(p.maxHp, p.hp + 35);
    sendTo(p, { type:'me', inv:p.inv, hp:p.hp, maxHp:p.maxHp, level:p.level, xp:p.xp, atkCd:p.atkCooldown, dashCd:p.dashCooldown });
  }
}

function grantXP(p, amount){
  p.xp += amount;
  const need = 100 + (p.level-1)*50;
  if (p.xp >= need){
    p.xp -= need; p.level += 1; p.maxHp += 15; p.hp = p.maxHp; p.speed += 0.2;
  }
  sendTo(p, { type:'me', inv:p.inv, hp:p.hp, maxHp:p.maxHp, level:p.level, xp:p.xp, atkCd:p.atkCooldown, dashCd:p.dashCooldown });
}

function damagePlayer(p, amount){
  p.hp -= amount;
  if (p.hp <= 0){ p.dead = true; p.respawnT = 3000; }
  sendTo(p, { type:'me', inv:p.inv, hp:p.hp, maxHp:p.maxHp, level:p.level, xp:p.xp, atkCd:p.atkCooldown, dashCd:p.dashCooldown });
}

function respawn(p){
  p.dead = false; p.hp = p.maxHp; p.x = TILE*2 + Math.random()*TILE*4; p.y = TILE*2 + Math.random()*TILE*4;
}

// ===== Conexões =====
let nextClientId = 1;
const clients = new Map(); // clientId -> playerId

wss.on('connection', (ws) => {
  const pid = String(nextClientId++);
  const player = spawnPlayer(pid, 'Hero_'+pid);
  player.ws = ws;
  clients.set(pid, pid);

  // boas-vindas com mapa e snapshot inicial
  sendTo(player, { type:'welcome', id: pid, map: { w: MAP_W, h: MAP_H, tile: TILE, tiles: world.tiles },
    you: { hp:player.hp, maxHp:player.maxHp, level:player.level, xp:player.xp, inv:player.inv },
    state: snapshot() });

  ws.on('message', (msg) => {
    let data; try { data = JSON.parse(msg); } catch { return; }
    if (data.type === 'input'){
      const p = world.players.get(pid); if (!p) return;
      const k = data.keys||{}; p.input.up=!!k.up; p.input.down=!!k.down; p.input.left=!!k.left; p.input.right=!!k.right;
      p.input.attack = !!data.attack;
      p.input.dash = !!data.dash;
      if (Number.isInteger(data.useSlot)) p.input.useSlot = data.useSlot;
    }
  });

  ws.on('close', () => {
    clients.delete(pid);
    world.players.delete(pid);
  });
});

function snapshot(){
  return {
    players: Array.from(world.players.values()).map(p=>({ id:p.id, x:p.x, y:p.y, hp:p.hp, maxHp:p.maxHp, level:p.level, dead:p.dead })),
    mobs: Array.from(world.mobs.values()).map(m=>({ id:m.id, kind:m.kind, x:m.x, y:m.y, hp:m.hp })),
    drops: Array.from(world.drops.values()),
    projectiles: Array.from(world.projectiles.values()).map(pr=>({ id:pr.id, x:pr.x, y:pr.y })),
    destructibles: Array.from(world.destructibles.values()).map(d=>({ id:d.id, kind:d.kind, x:d.x, y:d.y, hp:d.hp }))
  };
}

function broadcastState(){
  const s = JSON.stringify({ type:'state', state: snapshot() });
  for (const [,pid] of clients){
    const p = world.players.get(pid); if (!p || !p.ws) continue;
    if (p.ws.readyState === WebSocket.OPEN) p.ws.send(s);
  }
}

function sendTo(player, obj){
  if (player.ws && player.ws.readyState === WebSocket.OPEN) player.ws.send(JSON.stringify(obj));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('EtherQuest server listening on', PORT));
