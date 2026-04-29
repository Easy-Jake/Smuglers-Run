import { GAME_CONFIG } from '../config/gameConfig.js';
import { Entity } from './Entity.js';
import { Resource } from './Resource.js';

const SIZES = GAME_CONFIG.ASTEROIDS.SIZES;

export class Asteroid extends Entity {
  constructor(x, y, size = 'medium') {
    super(x, y);
    this.type = 'asteroid';

    // Size tier
    const cfg = SIZES[size] || SIZES.medium;
    this.sizeType = size;
    this.radius = cfg.RADIUS;
    this.width = cfg.RADIUS * 2;
    this.height = cfg.RADIUS * 2;
    this.health = cfg.HEALTH;
    this.maxHealth = cfg.HEALTH;
    this.resourceValue = cfg.RESOURCE_VALUE;
    this.resourceCount = cfg.RESOURCE_COUNT;
    this.armor = Math.floor(this.radius / 15);
    this.active = true;

    // Movement
    const speedScale = size === 'small' ? 1.0 : size === 'large' ? 0.4 : 0.7;
    const speed = (GAME_CONFIG.ASTEROIDS.BASE_SPEED + Math.random() * GAME_CONFIG.ASTEROIDS.SPEED_VARIATION) * speedScale;
    const moveAngle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(moveAngle) * speed;
    this.vy = Math.sin(moveAngle) * speed;

    // Rotation
    this.rotationSpeed = (Math.random() - 0.5) * GAME_CONFIG.ASTEROIDS.ROTATION_SPEED * 2;
    this.rotation = Math.random() * Math.PI * 2;

    // Procedural shape
    const vertexCount = size === 'small' ? 6 : size === 'large' ? 10 : 8;
    this.vertices = [];
    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2;
      const r = this.radius * (0.7 + Math.random() * 0.2);
      this.vertices.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }

    // Craters
    const craterCount = size === 'small' ? 2 : size === 'large' ? 6 : 4;
    this.craters = [];
    for (let i = 0; i < craterCount; i++) {
      const cAngle = Math.random() * Math.PI * 2;
      const cDist = Math.random() * this.radius * 0.6;
      this.craters.push({
        x: Math.cos(cAngle) * cDist,
        y: Math.sin(cAngle) * cDist,
        radius: this.radius * (0.08 + Math.random() * 0.12),
      });
    }

    // Colors per size
    this.color = size === 'small' ? '#A07060' : size === 'large' ? '#805840' : '#906850';
    this.strokeColor = size === 'small' ? '#C08070' : size === 'large' ? '#A06050' : '#B07060';

    // Collision cooldown
    this.lastCollisionTime = 0;
  }

  update(deltaTime) {
    if (!this.active) return;

    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;

    // Bounce off world boundaries
    const w = GAME_CONFIG.WORLD.WIDTH || GAME_CONFIG.WORLD.SIZE;
    const h = GAME_CONFIG.WORLD.HEIGHT || GAME_CONFIG.WORLD.SIZE;
    if (this.x < 0 || this.x > w) this.vx *= -1;
    if (this.y < 0 || this.y > h) this.vy *= -1;
    this.x = Math.max(0, Math.min(w, this.x));
    this.y = Math.max(0, Math.min(h, this.y));
  }

  takeDamage(amount) {
    const dmg = Math.max(1, amount - this.armor);
    this.health -= dmg;
    if (this.health <= 0) {
      this.active = false;
      return true; // destroyed
    }
    return false;
  }

  /**
   * Create resource drops when destroyed
   * @returns {Resource[]} Array of spawned resources
   */
  dropResources() {
    const drops = [];
    const count = this.resourceCount.MIN +
      Math.floor(Math.random() * (this.resourceCount.MAX - this.resourceCount.MIN + 1));
    for (let i = 0; i < count; i++) {
      const r = new Resource(
        this.x + (Math.random() - 0.5) * this.radius,
        this.y + (Math.random() - 0.5) * this.radius,
        this.resourceValue
      );
      drops.push(r);
    }
    return drops;
  }

  render(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Draw asteroid body
    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw craters
    ctx.fillStyle = '#00000033';
    for (const c of this.craters) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Health bar if damaged
    if (this.health < this.maxHealth) {
      const pct = this.health / this.maxHealth;
      const barW = this.radius * 2;
      ctx.fillStyle = '#500';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 10, barW, 4);
      ctx.fillStyle = '#f00';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 10, barW * pct, 4);
    }
  }

  collidesWith(entity) {
    const now = Date.now();
    if (now - this.lastCollisionTime < 500) return false;
    const dx = this.x - entity.x;
    const dy = this.y - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = this.radius + (entity.radius || 20);
    if (dist < minDist) {
      this.lastCollisionTime = now;
      return true;
    }
    return false;
  }
}
