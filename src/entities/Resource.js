import { GAME_CONFIG } from '../config/gameConfig.js';
import { Entity } from './Entity.js';

const RC = GAME_CONFIG.RESOURCE;

// Resource colors by type (periodic table progression)
const TYPE_COLORS = {
  hydro:       { color: '#aaddff', glow: '#cceeff' },
  carbon:      { color: '#888', glow: '#aaa' },
  ferro:       { color: '#b87333', glow: '#da8a44' },
  silicrystal: { color: '#4af', glow: '#8cf' },
  titan:       { color: '#9988cc', glow: '#bbaaee' },
  nebula:      { color: '#a4f', glow: '#c8f' },
  aurum:       { color: '#ffd700', glow: '#ffe44d' },
  thorium:     { color: '#44ff44', glow: '#88ff88' },
  darkmatter:  { color: '#222233', glow: '#ffffff' },
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

    // Pulse effect — higher value = faster pulse
    const pulseFreq = 1.5 + this.value / 3;
    const pulseTime = Date.now() / 200 + this.pulsePhase;
    const pulse = 0.7 + Math.sin(pulseTime * pulseFreq) * 0.3;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Outer glow (larger, more transparent)
    ctx.fillStyle = this.glowColor;
    ctx.globalAlpha = alpha * 0.15 * pulse;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 18 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    ctx.globalAlpha = alpha * 0.4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;

    // Diamond shape
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Scale diamond with value tier
    const sizeBonus = Math.min(1.5, 1 + this.value / 30);
    const h = 8 * pulse * sizeBonus;
    const w = 6 * pulse * sizeBonus;
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
