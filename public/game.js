const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const info = document.getElementById('info');
const arenaRadiusEl = document.getElementById('arena-radius');
const killsEl = document.getElementById('kills');
const leaderList = document.getElementById('leader-list');
const loadingScreen = document.getElementById('loading-screen');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// WebSocket URL - configure WS_SERVER_URL antes de carregar este script
// Exemplo: <script>window.WS_SERVER_URL = 'wss://seu-servidor.herokuapp.com';</script>
const WS_URL = window.WS_SERVER_URL || 
  (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;

// Verificar se foi configurado corretamente
if (!window.WS_SERVER_URL && (location.host.includes('netlify') || location.host.includes('vercel'))) {
  alert('⚠️ ERRO DE CONFIGURAÇÃO\n\n' +
        'Você precisa fazer deploy do SERVIDOR primeiro!\n\n' +
        '1. Acesse https://render.com\n' +
        '2. Deploy do repositório (pasta server/)\n' +
        '3. Configure window.WS_SERVER_URL no index.html\n\n' +
        'Clique em "Ver Instruções" na tela para ajuda completa.');
  
  // Mostrar erro na tela também
  if (loadingScreen) {
    loadingScreen.querySelector('.loading-text').innerHTML = 
      '❌ Servidor não configurado!<br><br>' +
      'Configure window.WS_SERVER_URL no index.html';
    const helpLink = document.getElementById('error-help');
    if (helpLink) helpLink.style.display = 'block';
  }
}

const ws = new WebSocket(WS_URL);

console.log('Connecting to:', WS_URL);

// Connection timeout
setTimeout(() => {
  if (!myId && loadingScreen) {
    loadingScreen.querySelector('.loading-text').textContent = 'Conexão lenta... Verifique o servidor.';
  }
}, 5000);

let myId = null;
const state = { arena: { radius: 600 }, players: new Map(), projectiles: new Map(), powerups: new Map() };
const me = { hp: 100, maxHp: 100, boostT: 0, shieldT: 0, kills: 0, dead: false };

// Particle system
const particles = [];
class Particle {
  constructor(x, y, vx, vy, color, life, size = 3) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.life = life; this.maxLife = life;
    this.size = size;
  }
  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.life -= dt;
    this.vx *= 0.98;
    this.vy *= 0.98;
  }
  draw(ctx, camX, camY) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x - camX, this.y - camY, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function spawnBoostParticles(x, y, angle) {
  for (let i = 0; i < 3; i++) {
    const spread = (Math.random() - 0.5) * 0.5;
    const a = angle + Math.PI + spread;
    const speed = 3 + Math.random() * 2;
    particles.push(new Particle(
      x, y,
      Math.cos(a) * speed,
      Math.sin(a) * speed,
      '#ffd700',
      0.3 + Math.random() * 0.2,
      4
    ));
  }
}

function spawnHitExplosion(x, y) {
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    particles.push(new Particle(
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      ['#ff3366', '#ff6b9d', '#ffd700'][Math.floor(Math.random() * 3)],
      0.4 + Math.random() * 0.3,
      5
    ));
  }
}

// Camera
const camera = { x: 0, y: 0, targetX: 0, targetY: 0 };

// Networking
ws.addEventListener('open', () => {
  console.log('WebSocket connected!');
  info.textContent = 'Conectado! Entrando na arena...';
});

ws.addEventListener('error', (err) => {
  console.error('WebSocket error:', err);
  console.error('');
  console.error('🔧 SOLUÇÃO:');
  console.error('1. Faça deploy do servidor em https://render.com');
  console.error('2. Configure window.WS_SERVER_URL no index.html');
  console.error('3. Veja CONFIGURAR.html para instruções completas');
  console.error('');
  
  info.textContent = 'Erro de conexão!';
  if (loadingScreen) {
    loadingScreen.querySelector('.loading-text').innerHTML = 
      '❌ Falha ao conectar<br><br>' +
      'Verifique se o servidor está rodando';
    const helpLink = document.getElementById('error-help');
    if (helpLink) helpLink.style.display = 'block';
  }
});

ws.addEventListener('close', () => {
  console.log('WebSocket closed');
  info.textContent = 'Desconectado do servidor';
});

ws.addEventListener('message', (ev) => {
  const data = JSON.parse(ev.data);
  console.log('Message received:', data.type);
  if (data.type === 'welcome') {
    myId = data.id;
    Object.assign(me, data.you);
    applySnapshot(data.state);
    info.textContent = `Você: ${myId}`;
    console.log('Welcome received, myId:', myId);
    
    // Hide loading screen
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => loadingScreen.remove(), 500);
    }
  } else if (data.type === 'state') {
    applySnapshot(data.state);
  } else if (data.type === 'me') {
    const prevHp = me.hp;
    Object.assign(me, data);
    if (prevHp > me.hp) {
      const my = state.players.get(myId);
      if (my) spawnHitExplosion(my.x, my.y);
    }
    updateHUD();
  }
});

function applySnapshot(s) {
  state.arena = s.arena;
  state.players.clear();
  s.players.forEach(p => state.players.set(p.id, p));
  state.projectiles.clear();
  s.projectiles.forEach(pr => state.projectiles.set(pr.id, pr));
  state.powerups.clear();
  s.powerups.forEach(pw => state.powerups.set(pw.id, pw));
  
  arenaRadiusEl.textContent = Math.round(state.arena.radius);
  updateLeaderboard();
}

function updateHUD() {
  document.querySelector('.hp-fill').style.width = (me.hp / me.maxHp * 100) + '%';
  document.querySelector('.boost-fill').style.width = Math.min(100, me.boostT / 60) + '%';
  document.querySelector('.shield-fill').style.width = Math.min(100, me.shieldT / 100) + '%';
  killsEl.textContent = me.kills;
}

function updateLeaderboard() {
  const sorted = Array.from(state.players.values())
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 5);
  leaderList.innerHTML = sorted.map(p => 
    `<div class="leader-item ${p.id === myId ? 'me' : ''}">
      <span class="leader-name">${p.name}${p.id === myId ? ' (Você)' : ''}</span>
      <span class="leader-kills">${p.kills}</span>
    </div>`
  ).join('');
}

// Input
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// Mobile joystick
const joystickArea = document.getElementById('joystick-area');
const joystickBase = document.getElementById('joystick-base');
const joystickStick = document.getElementById('joystick-stick');
const btnShoot = document.getElementById('btn-shoot');
const btnBoost = document.getElementById('btn-boost');

let joystickActive = false;
let joystickAngle = 0;
let joystickDistance = 0;
const maxJoystickDistance = 45;

// Mobile input state
const mobileInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  shoot: false,
  boost: false
};

function updateJoystick(clientX, clientY) {
  const rect = joystickBase.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  const deltaX = clientX - centerX;
  const deltaY = clientY - centerY;
  
  joystickAngle = Math.atan2(deltaY, deltaX);
  joystickDistance = Math.min(maxJoystickDistance, Math.hypot(deltaX, deltaY));
  
  const stickX = Math.cos(joystickAngle) * joystickDistance;
  const stickY = Math.sin(joystickAngle) * joystickDistance;
  
  joystickStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
  
  // Convert to directional input
  const threshold = 15;
  if (joystickDistance > threshold) {
    const angle = joystickAngle;
    // Convert angle to directions
    const deg = angle * 180 / Math.PI;
    
    // Up: -135 to -45
    // Right: -45 to 45
    // Down: 45 to 135
    // Left: 135 to -135 (wrapping)
    
    mobileInput.up = deg < -45 && deg > -135;
    mobileInput.down = deg > 45 && deg < 135;
    mobileInput.right = deg > -45 && deg < 45;
    mobileInput.left = deg > 135 || deg < -135;
  } else {
    mobileInput.up = mobileInput.down = mobileInput.left = mobileInput.right = false;
  }
}

function resetJoystick() {
  joystickActive = false;
  joystickStick.style.transform = 'translate(-50%, -50%)';
  mobileInput.up = mobileInput.down = mobileInput.left = mobileInput.right = false;
}

// Joystick touch events
joystickArea.addEventListener('touchstart', (e) => {
  e.preventDefault();
  joystickActive = true;
  const touch = e.touches[0];
  updateJoystick(touch.clientX, touch.clientY);
});

joystickArea.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!joystickActive) return;
  const touch = e.touches[0];
  updateJoystick(touch.clientX, touch.clientY);
});

joystickArea.addEventListener('touchend', (e) => {
  e.preventDefault();
  resetJoystick();
});

// Button events
btnShoot.addEventListener('touchstart', (e) => {
  e.preventDefault();
  mobileInput.shoot = true;
});

btnShoot.addEventListener('touchend', (e) => {
  e.preventDefault();
  mobileInput.shoot = false;
});

btnBoost.addEventListener('touchstart', (e) => {
  e.preventDefault();
  mobileInput.boost = true;
});

btnBoost.addEventListener('touchend', (e) => {
  e.preventDefault();
  mobileInput.boost = false;
});

function sendInput() {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: 'input',
    keys: {
      up: !!(keys['ArrowUp'] || keys['w'] || mobileInput.up),
      down: !!(keys['ArrowDown'] || keys['s'] || mobileInput.down),
      left: !!(keys['ArrowLeft'] || keys['a'] || mobileInput.left),
      right: !!(keys['ArrowRight'] || keys['d'] || mobileInput.right),
      boost: !!(keys['Shift'] || mobileInput.boost),
      shoot: !!(keys[' '] || mobileInput.shoot)
    }
  }));
}
setInterval(sendInput, 50);

// Rendering
let last = performance.now();
const prevPos = new Map();

function animate() {
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  
  // Update camera
  const my = state.players.get(myId);
  if (my) {
    camera.targetX = my.x;
    camera.targetY = my.y;
  }
  camera.x += (camera.targetX - camera.x) * 0.1;
  camera.y += (camera.targetY - camera.y) * 0.1;
  
  // Clear
  ctx.fillStyle = '#0a0e27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.translate(canvas.width / 2 - camera.x, canvas.height / 2 - camera.y);
  
  // Draw grid
  ctx.strokeStyle = 'rgba(100, 150, 200, 0.1)';
  ctx.lineWidth = 1;
  const gridSize = 50;
  const startX = Math.floor((camera.x - canvas.width / 2) / gridSize) * gridSize;
  const startY = Math.floor((camera.y - canvas.height / 2) / gridSize) * gridSize;
  for (let x = startX; x < camera.x + canvas.width / 2; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, camera.y - canvas.height / 2);
    ctx.lineTo(x, camera.y + canvas.height / 2);
    ctx.stroke();
  }
  for (let y = startY; y < camera.y + canvas.height / 2; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(camera.x - canvas.width / 2, y);
    ctx.lineTo(camera.x + canvas.width / 2, y);
    ctx.stroke();
  }
  
  // Draw arena boundary
  ctx.strokeStyle = state.arena.shrinking ? '#ff3366' : 'rgba(255, 107, 157, 0.5)';
  ctx.lineWidth = state.arena.shrinking ? 6 : 3;
  ctx.beginPath();
  ctx.arc(0, 0, state.arena.radius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Danger zone
  ctx.strokeStyle = 'rgba(255, 51, 102, 0.15)';
  ctx.lineWidth = 40;
  ctx.beginPath();
  ctx.arc(0, 0, state.arena.radius + 20, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw powerups
  for (const [, pw] of state.powerups) {
    const colors = { boost: '#ffd700', shield: '#64c8ff', health: '#ff3366' };
    ctx.fillStyle = colors[pw.type] || '#fff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath();
    ctx.arc(pw.x, pw.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Pulse effect
    ctx.strokeStyle = ctx.fillStyle;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pw.x, pw.y, 8 + Math.sin(now / 200) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  
  // Draw projectiles
  for (const [, pr] of state.projectiles) {
    ctx.fillStyle = '#ff6b9d';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff6b9d';
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Trail
    ctx.strokeStyle = 'rgba(255, 107, 157, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pr.x, pr.y);
    ctx.lineTo(pr.x - pr.vx * 2, pr.y - pr.vy * 2);
    ctx.stroke();
  }
  
  // Draw players
  for (const [id, p] of state.players) {
    if (p.dead) continue;
    
    const isMe = id === myId;
    const carColor = isMe ? '#64c8ff' : '#9cb4d8';
    
    // Boost particles
    if (p.boosting) {
      spawnBoostParticles(
        p.x - Math.cos(p.angle) * 12,
        p.y - Math.sin(p.angle) * 12,
        p.angle
      );
    }
    
    // Shield
    if (p.shield) {
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 25, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Car body
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    
    ctx.fillStyle = carColor;
    ctx.shadowBlur = p.boosting ? 25 : 10;
    ctx.shadowColor = carColor;
    ctx.fillRect(-12, -9, 24, 18);
    ctx.shadowBlur = 0;
    
    // Front
    ctx.fillStyle = isMe ? '#a0e7ff' : '#c0d8f0';
    ctx.fillRect(8, -6, 6, 12);
    
    ctx.restore();
    
    // Name tag
    ctx.fillStyle = isMe ? '#64c8ff' : '#9cb4d8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, p.x, p.y - 25);
    
    // HP bar
    const barW = 30, barH = 4;
    ctx.fillStyle = 'rgba(20, 30, 60, 0.8)';
    ctx.fillRect(p.x - barW / 2, p.y + 20, barW, barH);
    ctx.fillStyle = '#ff3366';
    ctx.fillRect(p.x - barW / 2, p.y + 20, barW * (p.hp / p.maxHp), barH);
  }
  
  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(dt);
    particles[i].draw(ctx, camera.x - canvas.width / 2, camera.y - canvas.height / 2);
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
  
  ctx.restore();
  
  // Death overlay
  if (me.dead) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff3366';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ELIMINADO!', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#9cb4d8';
    ctx.font = '24px sans-serif';
    ctx.fillText('Respawnando...', canvas.width / 2, canvas.height / 2 + 20);
  }
  
  requestAnimationFrame(animate);
}

animate();
updateHUD();
