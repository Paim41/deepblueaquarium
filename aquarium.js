/**
 * DEEP BLUE AQUARIUM — aquarium.js
 * Full-canvas animated aquarium with:
 *  - Multiple fish species with organic movement
 *  - Food-drop & eating interaction
 *  - Bubbles, particles, depth layers
 *  - Day / Night cycle
 *  - Cursor-reactive fish
 *  - Ripple effect on click
 */

// ─────────────────────────────────────────────
// 0.  SETUP
// ─────────────────────────────────────────────
const canvas = document.getElementById('aquarium');
const ctx    = canvas.getContext('2d');

let W, H;
function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ─────────────────────────────────────────────
// 1.  GLOBAL STATE
// ─────────────────────────────────────────────
let isNight    = false;
let soundOn    = false;   // sound placeholder
let mouseX     = W / 2,  mouseY = H / 2;
const FISH_COUNT = 14;
const FOOD_LIST  = [];
const BUBBLE_LIST = [];
const PARTICLE_LIST = [];

// ─────────────────────────────────────────────
// 2.  UTILITY
// ─────────────────────────────────────────────
const rnd  = (a, b) => a + Math.random() * (b - a);
const rndI = (a, b) => Math.floor(rnd(a, b));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─────────────────────────────────────────────
// 3.  FISH SPECIES DEFINITIONS
// ─────────────────────────────────────────────
/**
 * Each species defines visual style and behaviour modifiers.
 * Colors are arrays: [body, fin, stripe/eye].
 */
const SPECIES = [
  {
    name: 'Clownfish',
    colors: ['#ff6b35', '#fff', '#111'],
    size: [22, 30],
    speed: [1.2, 2.0],
    hasStripes: true,
    finStyle: 'round',
    depth: 0,          // 0 = background, 1 = foreground
  },
  {
    name: 'Blue Tang',
    colors: ['#1a6fe8', '#ffd700', '#ffffff'],
    size: [26, 36],
    speed: [1.5, 2.5],
    hasStripes: false,
    finStyle: 'triangle',
    depth: 1,
  },
  {
    name: 'Angelfish',
    colors: ['#c8a000', '#2a2a2a', '#fff'],
    size: [20, 28],
    speed: [0.8, 1.4],
    hasStripes: true,
    finStyle: 'tall',
    depth: 0,
  },
  {
    name: 'Pufferfish',
    colors: ['#8bc34a', '#5d4037', '#fff'],
    size: [18, 26],
    speed: [0.6, 1.2],
    hasStripes: false,
    finStyle: 'tiny',
    depth: 1,
  },
  {
    name: 'Neon Tetra',
    colors: ['#0ff', '#e040fb', '#fff'],
    size: [10, 16],
    speed: [2.0, 3.2],
    hasStripes: false,
    finStyle: 'slim',
    depth: 0,
  },
];

// ─────────────────────────────────────────────
// 4.  FISH CLASS
// ─────────────────────────────────────────────
class Fish {
  constructor(species, index) {
    this.species   = species;
    this.index     = index;

    // Size & appearance
    this.r         = rnd(species.size[0], species.size[1]);
    this.color     = species.colors[0];
    this.finColor  = species.colors[1];
    this.accentColor = species.colors[2];

    // Position — keep within a safe margin
    this.x  = rnd(this.r * 2, W - this.r * 2);
    this.y  = rnd(H * 0.1, H * 0.85);

    // Velocity
    const spd   = rnd(species.speed[0], species.speed[1]);
    const angle = rnd(0, Math.PI * 2);
    this.vx = Math.cos(angle) * spd;
    this.vy = Math.sin(angle) * spd;

    // Steering target (wander)
    this.targetX = this.x;
    this.targetY = this.y;
    this.wanderTimer = 0;

    // Food chasing
    this.chaseFoodId = -1;  // index into FOOD_LIST

    // Animation state
    this.tailPhase  = rnd(0, Math.PI * 2);
    this.tailSpeed  = rnd(0.06, 0.12);
    this.bodyWobble = 0;
    this.eating     = 0;   // eating animation counter

    // Depth layer scale
    this.depthScale = species.depth === 1
      ? rnd(1.1, 1.4)
      : rnd(0.6, 0.9);

    // Boid flocking helpers
    this.steerX = 0;
    this.steerY = 0;
  }

  /** Called every frame */
  update(dt, allFish) {
    this.tailPhase += this.tailSpeed;

    // ── Decrement timers ──
    this.wanderTimer -= dt;
    if (this.eating > 0) this.eating -= dt * 0.06;

    // ── Food detection ──
    this.chaseFoodId = -1;
    let closestFoodDist = 200; // detection radius
    for (let i = 0; i < FOOD_LIST.length; i++) {
      const f = FOOD_LIST[i];
      if (f.eaten) continue;
      const d = dist(this.x, this.y, f.x, f.y);
      if (d < closestFoodDist) {
        closestFoodDist = d;
        this.chaseFoodId = i;
      }
    }

    if (this.chaseFoodId !== -1) {
      // ── Chase food ──
      const food  = FOOD_LIST[this.chaseFoodId];
      const dx    = food.x - this.x;
      const dy    = food.y - this.y;
      const d     = Math.hypot(dx, dy) || 1;
      const spd   = this.species.speed[1] * 1.6;
      this.vx     = lerp(this.vx, (dx / d) * spd, 0.08);
      this.vy     = lerp(this.vy, (dy / d) * spd, 0.08);

      // Eat!
      if (d < this.r) {
        food.eaten = true;
        this.eating = 1;
        spawnFoodParticles(food.x, food.y);
      }
    } else {
      // ── Wander behaviour ──
      if (this.wanderTimer <= 0) {
        this.targetX    = rnd(this.r * 2, W - this.r * 2);
        this.targetY    = rnd(H * 0.08, H * 0.88);
        this.wanderTimer = rnd(60, 180);  // frames until next wander
      }

      const dx  = this.targetX - this.x;
      const dy  = this.targetY - this.y;
      const d   = Math.hypot(dx, dy) || 1;
      const spd = (this.species.speed[0] + this.species.speed[1]) / 2;
      this.vx   = lerp(this.vx, (dx / d) * spd, 0.02);
      this.vy   = lerp(this.vy, (dy / d) * spd, 0.02);

      // ── Cursor avoidance (subtle) ──
      const md = dist(this.x, this.y, mouseX, mouseY);
      if (md < 120) {
        const repel = (120 - md) / 120;
        this.vx += ((this.x - mouseX) / md) * repel * 1.5;
        this.vy += ((this.y - mouseY) / md) * repel * 1.5;
      }

      // ── Simple separation from other fish ──
      for (const other of allFish) {
        if (other === this) continue;
        const sd = dist(this.x, this.y, other.x, other.y);
        const minDist = (this.r + other.r) * 1.5;
        if (sd < minDist && sd > 0) {
          const push = (minDist - sd) / minDist;
          this.vx += ((this.x - other.x) / sd) * push * 0.5;
          this.vy += ((this.y - other.y) / sd) * push * 0.5;
        }
      }
    }

    // ── Speed limit ──
    const maxSpd = this.species.speed[1] * 2;
    const curSpd = Math.hypot(this.vx, this.vy);
    if (curSpd > maxSpd) {
      this.vx = (this.vx / curSpd) * maxSpd;
      this.vy = (this.vy / curSpd) * maxSpd;
    }

    // ── Integrate position ──
    this.x += this.vx;
    this.y += this.vy;

    // ── Boundary bounce (soft) ──
    const margin = this.r * 2;
    if (this.x < margin)    { this.vx += 0.4; this.targetX = W * 0.5; }
    if (this.x > W - margin){ this.vx -= 0.4; this.targetX = W * 0.5; }
    if (this.y < H * 0.05)  { this.vy += 0.4; this.targetY = H * 0.4; }
    if (this.y > H * 0.92)  { this.vy -= 0.4; this.targetY = H * 0.5; }

    // ── Body wobble ──
    this.bodyWobble = Math.sin(this.tailPhase * 0.5) * 0.06;
  }

  /** Draw the fish on the canvas */
  draw(ctx) {
    const angle    = Math.atan2(this.vy, this.vx);
    const tailSwing = Math.sin(this.tailPhase) * (0.3 + Math.abs(this.vx + this.vy) * 0.05);
    const sc       = this.depthScale;
    const r        = this.r * sc;
    const eatPulse = this.eating > 0 ? Math.sin(this.eating * Math.PI) * 0.2 : 0;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle + this.bodyWobble);
    ctx.scale(1 + eatPulse, 1 + eatPulse);

    // ── Depth: background fish slightly faded ──
    ctx.globalAlpha = this.species.depth === 0 ? 0.75 : 1;

    // ── Shadow / glow ──
    ctx.shadowColor  = this.color;
    ctx.shadowBlur   = 8 * sc;

    // ── Tail ──
    ctx.save();
    ctx.rotate(tailSwing);
    ctx.beginPath();
    const tailLen = r * 1.1;
    const tailW   = r * 0.75;
    ctx.moveTo(-r * 0.7, 0);
    ctx.lineTo(-r * 0.7 - tailLen,  tailW);
    ctx.lineTo(-r * 0.7 - tailLen, -tailW);
    ctx.closePath();
    ctx.fillStyle = this.finColor;
    ctx.globalAlpha = (this.species.depth === 0 ? 0.75 : 1) * 0.85;
    ctx.fill();
    ctx.restore();

    // ── Body ──
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
    // Gradient body
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.15, 0, 0, 0, r);
    grad.addColorStop(0, lightenColor(this.color, 40));
    grad.addColorStop(1, this.color);
    ctx.fillStyle = grad;
    ctx.fill();

    // ── Stripes (Clownfish / Angelfish) ──
    if (this.species.hasStripes) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      // Two stripes
      [-r * 0.15, r * 0.25].forEach(sx => {
        ctx.fillRect(sx - r * 0.09, -r * 0.55, r * 0.18, r * 1.1);
      });
      ctx.restore();
    }

    // ── Dorsal fin ──
    ctx.beginPath();
    if (this.species.finStyle === 'tall') {
      ctx.moveTo(-r * 0.3, -r * 0.55);
      ctx.lineTo(r * 0.2,  -r * 1.1);
      ctx.lineTo(r * 0.5,  -r * 0.55);
    } else if (this.species.finStyle === 'slim') {
      ctx.moveTo(-r * 0.1, -r * 0.55);
      ctx.lineTo(r * 0.1,  -r * 0.9);
      ctx.lineTo(r * 0.3,  -r * 0.55);
    } else {
      ctx.moveTo(-r * 0.1, -r * 0.55);
      ctx.lineTo(r * 0.15, -r * 0.9);
      ctx.lineTo(r * 0.45, -r * 0.55);
    }
    ctx.closePath();
    ctx.fillStyle = this.finColor;
    ctx.globalAlpha = this.species.depth === 0 ? 0.65 : 0.8;
    ctx.fill();

    // ── Pectoral fin ──
    ctx.beginPath();
    ctx.ellipse(r * 0.1, r * 0.3, r * 0.35, r * 0.15, 0.4, 0, Math.PI * 2);
    ctx.fillStyle = this.finColor;
    ctx.globalAlpha = this.species.depth === 0 ? 0.55 : 0.7;
    ctx.fill();

    // ── Eye ──
    ctx.globalAlpha = this.species.depth === 0 ? 0.75 : 1;
    ctx.beginPath();
    ctx.arc(r * 0.55, -r * 0.12, r * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.58, -r * 0.12, r * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
    // Pupil gleam
    ctx.beginPath();
    ctx.arc(r * 0.61, -r * 0.15, r * 0.03, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// 5.  FOOD PARTICLE CLASS
// ─────────────────────────────────────────────
class Food {
  constructor(x, y) {
    this.x     = x;
    this.y     = y;
    this.vy    = -rnd(0.5, 1.5);  // start drifting up then settle
    this.vx    = rnd(-0.3, 0.3);
    this.r     = rnd(3, 5);
    this.eaten = false;
    this.alpha = 1;
    this.age   = 0;
    this.settled = false;
  }

  update() {
    this.age++;
    // Drift down slowly like real food pellet
    if (this.age > 30) {
      this.vy = lerp(this.vy, 0.6, 0.04);
    }
    this.x += this.vx;
    this.y += this.vy;
    // Gentle horizontal drift
    this.vx += rnd(-0.02, 0.02);
    this.vx  = clamp(this.vx, -0.5, 0.5);
    // Clamp to screen
    if (this.y > H * 0.95) { this.y = H * 0.95; this.vy = 0; }
    if (this.eaten) this.alpha -= 0.06;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(this.x - 1, this.y - 1, 0, this.x, this.y, this.r);
    g.addColorStop(0, '#ffe082');
    g.addColorStop(1, '#ff8f00');
    ctx.fillStyle = g;
    ctx.shadowColor = '#ffce70';
    ctx.shadowBlur  = 6;
    ctx.fill();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// 6.  BUBBLE CLASS
// ─────────────────────────────────────────────
class Bubble {
  constructor() {
    this.reset();
  }
  reset() {
    this.x     = rnd(0, W);
    this.y     = H + rnd(10, 50);
    this.r     = rnd(2, 9);
    this.speed = rnd(0.5, 1.8);
    this.wobble= rnd(0, Math.PI * 2);
    this.wobbleSpd = rnd(0.02, 0.05);
    this.alpha = rnd(0.2, 0.55);
  }
  update() {
    this.y -= this.speed;
    this.wobble += this.wobbleSpd;
    this.x += Math.sin(this.wobble) * 0.4;
    if (this.y < -this.r * 2) this.reset();
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(150,220,255,0.8)';
    ctx.lineWidth   = 1;
    ctx.stroke();
    // Tiny gleam
    ctx.beginPath();
    ctx.arc(this.x - this.r * 0.3, this.y - this.r * 0.3, this.r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// 7.  BACKGROUND PARTICLE (plankton / dust)
// ─────────────────────────────────────────────
class Particle {
  constructor() { this.reset(true); }
  reset(init) {
    this.x     = rnd(0, W);
    this.y     = init ? rnd(0, H) : -10;
    this.r     = rnd(0.5, 2);
    this.vx    = rnd(-0.2, 0.2);
    this.vy    = rnd(0.1, 0.5);
    this.alpha = rnd(0.05, 0.25);
    this.life  = rnd(200, 500);
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    if (this.life <= 0 || this.y > H + 10) this.reset(false);
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = '#a8dfff';
    ctx.fill();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// 8.  SEAWEED CLASS
// ─────────────────────────────────────────────
class Seaweed {
  constructor() {
    this.x      = rnd(0, W);
    this.height = rnd(60, 160);
    this.nodes  = Math.ceil(this.height / 15);
    this.phase  = rnd(0, Math.PI * 2);
    this.speed  = rnd(0.01, 0.03);
    this.color  = `hsl(${rndI(120,150)},${rndI(50,80)}%,${rndI(25,42)}%)`;
    this.width  = rnd(4, 9);
  }
  update() {
    this.phase += this.speed;
  }
  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = this.width;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 4;
    ctx.beginPath();
    const base = H;
    ctx.moveTo(this.x, base);
    for (let i = 1; i <= this.nodes; i++) {
      const t   = i / this.nodes;
      const sway = Math.sin(this.phase + t * 2) * 14 * t;
      const nx  = this.x + sway;
      const ny  = base - (this.height * t);
      ctx.lineTo(nx, ny);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// 9.  CORAL (static decorative)
// ─────────────────────────────────────────────
function drawCoral(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  // Simple branching coral
  function branch(len, angle, depth) {
    if (depth === 0 || len < 4) return;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.strokeStyle = color;
    ctx.lineWidth   = depth * 2;
    ctx.lineCap     = 'round';
    ctx.stroke();
    ctx.translate(0, -len);
    branch(len * 0.68, -0.45, depth - 1);
    branch(len * 0.68,  0.45, depth - 1);
    if (depth > 2) branch(len * 0.5, 0, depth - 2);
    ctx.restore();
  }
  branch(size, 0, 4);
  ctx.restore();
}

// ─────────────────────────────────────────────
// 10.  INIT SCENE
// ─────────────────────────────────────────────
const fishes   = [];
const bubbles  = [];
const particles = [];
const seaweeds  = [];
const corals    = [];

function initScene() {
  // Fish — distribute species
  for (let i = 0; i < FISH_COUNT; i++) {
    const sp = SPECIES[i % SPECIES.length];
    fishes.push(new Fish(sp, i));
  }
  // Bubbles
  for (let i = 0; i < 40; i++) {
    const b = new Bubble();
    b.y = rnd(0, H); // start spread out
    bubbles.push(b);
  }
  // Particles
  for (let i = 0; i < 80; i++) particles.push(new Particle());
  // Seaweed
  const swCount = Math.max(6, Math.floor(W / 120));
  for (let i = 0; i < swCount; i++) seaweeds.push(new Seaweed());
  // Corals
  const coralColors = ['#ff6b6b','#ff8e53','#ff4bab','#f3e27f','#a8ff78'];
  for (let i = 0; i < 8; i++) {
    corals.push({
      x: rnd(0, W),
      y: H,
      size: rnd(30, 70),
      color: coralColors[i % coralColors.length]
    });
  }
}

// ─────────────────────────────────────────────
// 11.  BACKGROUND GRADIENT (day / night)
// ─────────────────────────────────────────────
function drawBackground(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (isNight) {
    g.addColorStop(0,   '#000a1a');
    g.addColorStop(0.4, '#001428');
    g.addColorStop(1,   '#00080f');
  } else {
    g.addColorStop(0,   '#0a2a4a');
    g.addColorStop(0.35,'#0d4a8a');
    g.addColorStop(0.7, '#065a9a');
    g.addColorStop(1,   '#03304a');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Sandy bottom
  const sand = ctx.createLinearGradient(0, H * 0.88, 0, H);
  sand.addColorStop(0, isNight ? '#0d1a10' : '#1a4a2a');
  sand.addColorStop(1, isNight ? '#050d08' : '#0d3020');
  ctx.fillStyle = sand;
  ctx.fillRect(0, H * 0.88, W, H * 0.12);
}

// ─────────────────────────────────────────────
// 12.  WATER DISTORTION EFFECT (scanline shim)
// ─────────────────────────────────────────────
let distortionTime = 0;
function drawWaterDistortion(ctx) {
  distortionTime += 0.01;
  // Horizontal wavy bands of very subtle brightness
  for (let i = 0; i < 5; i++) {
    const y = ((distortionTime * 40 + i * 80) % H);
    const g = ctx.createLinearGradient(0, y, 0, y + 40);
    g.addColorStop(0,   'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.03)');
    g.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, W, 40);
  }
}

// ─────────────────────────────────────────────
// 13.  FOOD SPAWNING PARTICLE BURST
// ─────────────────────────────────────────────
function spawnFoodParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    const p = new Particle();
    p.x     = x;
    p.y     = y;
    p.vx    = rnd(-1.5, 1.5);
    p.vy    = rnd(-1.5, 0.5);
    p.r     = rnd(1.5, 3.5);
    p.alpha = 0.7;
    p.life  = rnd(30, 60);
    particles.push(p);
  }
}

// ─────────────────────────────────────────────
// 14.  MAIN RENDER LOOP
// ─────────────────────────────────────────────
let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 16.67, 3); // normalise to ~60fps
  lastTime = timestamp;

  ctx.clearRect(0, 0, W, H);

  // ── Background ──
  drawBackground(ctx);

  // ── Corals ──
  corals.forEach(c => drawCoral(ctx, c.x, c.y, c.size, c.color));

  // ── Seaweed ──
  seaweeds.forEach(sw => { sw.update(); sw.draw(ctx); });

  // ── Background particles ──
  particles.forEach(p => { p.update(); p.draw(ctx); });

  // ── Bubbles ──
  bubbles.forEach(b => { b.update(); b.draw(ctx); });

  // ── Water distortion overlay ──
  drawWaterDistortion(ctx);

  // ── Food ──
  for (let i = FOOD_LIST.length - 1; i >= 0; i--) {
    const f = FOOD_LIST[i];
    f.update();
    if (f.alpha <= 0) { FOOD_LIST.splice(i, 1); continue; }
    f.draw(ctx);
  }

  // ── Fish (sorted by depth for layering) ──
  const sorted = [...fishes].sort((a, b) => a.depthScale - b.depthScale);
  sorted.forEach(fish => { fish.update(dt, fishes); fish.draw(ctx); });

  requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────
// 15.  USER INTERACTION
// ─────────────────────────────────────────────

// Track cursor
window.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});
window.addEventListener('touchmove', e => {
  const t = e.touches[0];
  mouseX = t.clientX;
  mouseY = t.clientY;
}, { passive: true });

// Click / tap → drop food + ripple
function handleClick(x, y) {
  // Drop 2-4 food particles spread around click
  const count = rndI(2, 5);
  for (let i = 0; i < count; i++) {
    FOOD_LIST.push(new Food(x + rnd(-20, 20), y + rnd(-10, 10)));
  }

  // DOM ripple effect
  const rippleEl = document.createElement('div');
  rippleEl.className = 'ripple';
  rippleEl.style.left   = x + 'px';
  rippleEl.style.top    = y + 'px';
  rippleEl.style.width  = '60px';
  rippleEl.style.height = '60px';
  document.getElementById('ripple-container').appendChild(rippleEl);
  setTimeout(() => rippleEl.remove(), 1500);
}

canvas.addEventListener('click', e => handleClick(e.clientX, e.clientY));
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  handleClick(t.clientX, t.clientY);
}, { passive: false });

// ── Day / Night toggle ──
const dayNightBtn = document.getElementById('daynight-btn');
dayNightBtn.addEventListener('click', () => {
  isNight = !isNight;
  dayNightBtn.textContent = isNight ? '☀️' : '🌙';
  document.body.classList.toggle('night', isNight);
  document.body.classList.toggle('day',  !isNight);
});

// ── Sound toggle (placeholder) ──
const soundBtn = document.getElementById('sound-btn');
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? '🔊' : '🔇';
  if (soundOn) startAmbientSound();
  else stopAmbientSound();
});

// ─────────────────────────────────────────────
// 16.  AMBIENT SOUND (Web Audio API)
// ─────────────────────────────────────────────
let audioCtx, gainNode, oscillators = [];

function startAmbientSound() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
  gainNode.connect(audioCtx.destination);

  // Gentle underwater hum — layered low-frequency oscillators
  [[55, 'sine'], [110, 'sine'], [220, 'triangle']].forEach(([freq, type]) => {
    const osc = audioCtx.createOscillator();
    osc.type      = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(gainNode);
    osc.start();
    oscillators.push(osc);
  });
}

function stopAmbientSound() {
  if (!audioCtx) return;
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
  setTimeout(() => {
    oscillators.forEach(o => o.stop());
    oscillators = [];
    audioCtx.close();
    audioCtx = null;
  }, 600);
}

// ─────────────────────────────────────────────
// 17.  HELPER — lighten a hex color
// ─────────────────────────────────────────────
function lightenColor(hex, amount) {
  // Works with 3- and 6-digit hex or named colour fallback
  const dummy = document.createElement('canvas').getContext('2d');
  dummy.fillStyle = hex;
  hex = dummy.fillStyle; // normalize
  const num = parseInt(hex.replace('#',''), 16);
  const r = clamp(((num >> 16) & 0xff) + amount, 0, 255);
  const g = clamp(((num >> 8)  & 0xff) + amount, 0, 255);
  const b = clamp(( num        & 0xff) + amount, 0, 255);
  return `rgb(${r},${g},${b})`;
}

// ─────────────────────────────────────────────
// 18.  START
// ─────────────────────────────────────────────
initScene();
requestAnimationFrame(loop);
