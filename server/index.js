const express = require('express');
const WebSocket = require('ws');
const compression = require('compression');

const app = express();
app.use(compression());
app.use(express.static('public'));

const server = app.listen(process.env.PORT || 3000, () => {
  console.log('🏎️  CarBattle Arena server on port', server.address().port);
});

const wss = new WebSocket.Server({ server });

// Constants
const TICK_MS = 50;
const ARENA_RADIUS = 600;
const SHRINK_INTERVAL = 20000;
const SHRINK_AMOUNT = 40;
const CAR_SIZE = 18;
const MAX_SPEED = 7;
const ACCELERATION = 0.35;
const TURN_SPEED = 0.075;
const FRICTION = 0.94;
const BOOST_FORCE = 2.2;
const PROJECTILE_SPEED = 11;
const PROJECTILE_LIFETIME = 2500;

const world = {
  players: new Map(),
  projectiles: new Map(),
  powerups: new Map(),
  arena: { radius: ARENA_RADIUS, shrinking: false },
  lastShrink: Date.now()
};

let clients = new Map();
let nextId = 1;

function spawnPlayer(id) {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * (world.arena.radius - 150);
  return {
    id, name: `Car${id.slice(1)}`,
    x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
    vx: 0, vy: 0, angle: Math.random() * Math.PI * 2,
    speed: 0, hp: 100, maxHp: 100,
    boosting: false, boostT: 0, shield: false, shieldT: 0,
    kills: 0, dead: false, respawnT: 0, shootCd: 0,
    input: { up: false, down: false, left: false, right: false, boost: false, shoot: false }
  };
}

function spawnPowerup() {
  const types = ['boost', 'shield', 'health'];
  const type = types[Math.floor(Math.random() * types.length)];
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * (world.arena.radius - 80);
  world.powerups.set(`pw${nextId++}`, {
    id: `pw${nextId}`, type,
    x: Math.cos(angle) * dist, y: Math.sin(angle) * dist
  });
}

for (let i = 0; i < 12; i++) spawnPowerup();

function spawnProjectile(p) {
  const id = `proj${nextId++}`;
  const dist = CAR_SIZE + 8;
  world.projectiles.set(id, {
    id, ownerId: p.id,
    x: p.x + Math.cos(p.angle) * dist,
    y: p.y + Math.sin(p.angle) * dist,
    vx: Math.cos(p.angle) * PROJECTILE_SPEED + p.vx * 0.5,
    vy: Math.sin(p.angle) * PROJECTILE_SPEED + p.vy * 0.5,
    life: PROJECTILE_LIFETIME
  });
}

function gameTick() {
  const now = Date.now();
  
  if (now - world.lastShrink > SHRINK_INTERVAL) {
    world.arena.radius = Math.max(200, world.arena.radius - SHRINK_AMOUNT);
    world.lastShrink = now;
    world.arena.shrinking = true;
    setTimeout(() => { world.arena.shrinking = false; }, 1200);
  }
  
  for (const [, p] of world.players) {
    if (p.dead) {
      if (p.respawnT > 0) {
        p.respawnT -= TICK_MS;
        if (p.respawnT <= 0) {
          const a = Math.random() * Math.PI * 2;
          const d = Math.random() * (world.arena.radius - 100);
          Object.assign(p, {
            x: Math.cos(a) * d, y: Math.sin(a) * d,
            vx: 0, vy: 0, speed: 0, hp: p.maxHp, dead: false
          });
        }
      }
      continue;
    }
    
    if (p.input.left) p.angle -= TURN_SPEED * (1 + Math.abs(p.speed) / MAX_SPEED);
    if (p.input.right) p.angle += TURN_SPEED * (1 + Math.abs(p.speed) / MAX_SPEED);
    if (p.input.up) p.speed = Math.min(MAX_SPEED, p.speed + ACCELERATION);
    if (p.input.down) p.speed = Math.max(-MAX_SPEED * 0.6, p.speed - ACCELERATION);
    
    if (p.input.boost && p.boostT > 0) {
      p.boosting = true;
      p.speed = Math.min(MAX_SPEED * 1.5, p.speed + BOOST_FORCE);
      p.boostT -= TICK_MS;
    } else {
      p.boosting = false;
    }
    
    p.shield = p.shieldT > 0;
    if (p.shieldT > 0) p.shieldT -= TICK_MS;
    if (p.shootCd > 0) p.shootCd -= TICK_MS;
    
    p.vx = Math.cos(p.angle) * p.speed;
    p.vy = Math.sin(p.angle) * p.speed;
    p.x += p.vx;
    p.y += p.vy;
    p.speed *= FRICTION;
    if (Math.abs(p.speed) < 0.08) p.speed = 0;
    
    const distFromCenter = Math.hypot(p.x, p.y);
    if (distFromCenter > world.arena.radius) {
      const a = Math.atan2(p.y, p.x);
      p.x = Math.cos(a) * world.arena.radius;
      p.y = Math.sin(a) * world.arena.radius;
      p.vx *= -0.4;
      p.vy *= -0.4;
      p.speed *= -0.4;
      if (!p.shield) {
        p.hp -= 8;
        if (p.hp <= 0) {
          p.dead = true;
          p.respawnT = 4000;
        }
      }
    }
    
    if (p.input.shoot && p.shootCd <= 0) {
      spawnProjectile(p);
      p.shootCd = 400;
      p.input.shoot = false;
    }
    
    for (const [pwId, pw] of world.powerups) {
      if (Math.hypot(p.x - pw.x, p.y - pw.y) < CAR_SIZE + 12) {
        if (pw.type === 'boost') p.boostT = Math.min(6000, p.boostT + 1500);
        if (pw.type === 'shield') p.shieldT = Math.min(10000, p.shieldT + 4000);
        if (pw.type === 'health') p.hp = Math.min(p.maxHp, p.hp + 40);
        world.powerups.delete(pwId);
        setTimeout(() => spawnPowerup(), 8000);
      }
    }
  }
  
  for (const [projId, proj] of world.projectiles) {
    proj.x += proj.vx;
    proj.y += proj.vy;
    proj.life -= TICK_MS;
    
    if (proj.life <= 0 || Math.hypot(proj.x, proj.y) > world.arena.radius + 100) {
      world.projectiles.delete(projId);
      continue;
    }
    
    for (const [, p] of world.players) {
      if (p.dead || p.id === proj.ownerId) continue;
      if (Math.hypot(p.x - proj.x, p.y - proj.y) < CAR_SIZE) {
        if (!p.shield) {
          p.hp -= 25;
          if (p.hp <= 0) {
            p.dead = true;
            p.respawnT = 4000;
            const shooter = world.players.get(proj.ownerId);
            if (shooter) shooter.kills++;
          }
        }
        world.projectiles.delete(projId);
        break;
      }
    }
  }
  
  broadcastState();
}

setInterval(gameTick, TICK_MS);

wss.on('connection', (ws) => {
  const pid = `p${nextId++}`;
  const player = spawnPlayer(pid);
  world.players.set(pid, player);
  clients.set(ws, pid);
  
  ws.send(JSON.stringify({ type: 'welcome', id: pid, you: player, state: snapshot() }));
  
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'input') {
        const p = world.players.get(pid);
        if (p) Object.assign(p.input, data.keys);
      }
    } catch (e) {}
  });
  
  ws.on('close', () => {
    world.players.delete(pid);
    clients.delete(ws);
  });
});

function snapshot() {
  return {
    arena: world.arena,
    players: Array.from(world.players.values()).map(p => ({
      id: p.id, name: p.name, x: p.x, y: p.y, angle: p.angle,
      hp: p.hp, maxHp: p.maxHp, boosting: p.boosting,
      shield: p.shield, kills: p.kills, dead: p.dead
    })),
    projectiles: Array.from(world.projectiles.values()).map(pr => ({
      id: pr.id, x: pr.x, y: pr.y
    })),
    powerups: Array.from(world.powerups.values())
  };
}

function broadcastState() {
  const s = JSON.stringify({ type: 'state', state: snapshot() });
  for (const [ws, pid] of clients) {
    const p = world.players.get(pid);
    if (!p) continue;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'me',
        hp: p.hp, maxHp: p.maxHp, boostT: p.boostT,
        shieldT: p.shieldT, kills: p.kills, dead: p.dead
      }));
      ws.send(s);
    }
  }
}
