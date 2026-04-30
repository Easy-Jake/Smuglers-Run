import { GAME_CONFIG } from '../config/gameConfig.js';
import { Entity } from './Entity.js';

const RC = GAME_CONFIG.RESOURCE;

// Resource colors by type
const TYPE_COLORS = {
  carbon:   { color: '#888', glow: '#aaa' },
  scrap:    { color: '#b87333', glow: '#da8a44' },
  crystal:  { color: '#4af', glow: '#8cf' },
  rare_gas: { color: '#a4f', glow: '#c8f' },
  plasma:   { color: '#ff4', glow: '#ff8' },
};

export class Resource extends Entity {
  constructor(x, y, value = RC.BASE_VALUE, resourceType = 'carbon') {
    super(x, y);
    this.radius = RC.RADIUS;
    this.width = RC.RADIUS * 2;
    this.height = RC.RADIUS * 2;
    this.value = value;
    this.resourceType = resourceType;
    this.active = true;

    // Rotation & animation
    this.rotationSpeed = (Math.random() - 0.5) * 0.05;
    this.rotation = Math.random() * Math.PI * 2;
    this.pulsePhase = Math.random() * Math.PI * 2;

    // Lifetime
    this.creationTime = Date.now();
    this.maxAge = RC.LIFETIME;

    // Drift velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = RC.BASE_SPEED + (Math.random() - 0.5) * RC.SPEED_VARIATION;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    // Colors based on resource type
    const tc = TYPE_COLORS[resourceType] || TYPE_COLORS.carbon;
    this.color = tc.color;
    this.glowColor = tc.glow;
  }

  update(deltaTime) {
    if (!this.active) return;

    // Update position with drift
    this.x += this.vx;
    this.y += this.vy;

    // Apply damping
    this.vx *= 0.98;
    this.vy *= 0.98;

    // Update rotation
    this.rotation += this.rotationSpeed;

    // Check lifetime
    const age = Date.now() - this.creationTime;
    if (age >= this.maxAge) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;

    const age = Date.now() - this.creationTime;
    const lifePercent = age / this.maxAge;

    // Fade out in last 30% of life
    let alpha = 1;
    if (lifePercent > 0.7) {
      alpha = 1 - (lifePercent - 0.7) / 0.3;
    }

    // Pulse effect
    const pulseFreq = 2 + this.value / 5;
    const pulse = 0.8 + Math.sin(Date.now() / 200 * pulseFreq) * 0.2;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Glow
    ctx.fillStyle = this.glowColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Diamond shape
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const h = 8 * pulse;
    const w = 8 * pulse;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(w, 0);
    ctx.lineTo(0, h);
    ctx.lineTo(-w, 0);
    ctx.closePath();
    ctx.fill();

    // Shine
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-3, -3);
    ctx.lineTo(3, 3);
    ctx.stroke();

    ctx.restore();
  }
}
