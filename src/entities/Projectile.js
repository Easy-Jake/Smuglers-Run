import { GAME_CONFIG } from '../config/gameConfig.js';
import { Entity } from './Entity.js';

export class Projectile extends Entity {
  constructor(x, y, angle, speed = GAME_CONFIG.PROJECTILES.SPEED, damage = GAME_CONFIG.PROJECTILES.DAMAGE, fromPlayer = true) {
    super(x, y);
    this.type = 'projectile';
    this.angle = angle;
    this.speed = speed;
    this.damage = damage;
    this.fromPlayer = fromPlayer;
    this.owner = fromPlayer ? 'player' : 'enemy';
    this.radius = GAME_CONFIG.PROJECTILES.RADIUS;
    this.active = true;

    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.distanceTraveled = 0;
    this.maxDistance = 500;

    this.color = fromPlayer ? '#ff0' : '#f44';
  }

  update(deltaTime) {
    if (!this.active) return;

    const dx = this.vx;
    const dy = this.vy;
    this.x += dx;
    this.y += dy;
    this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);

    if (this.distanceTraveled >= this.maxDistance) {
      this.active = false;
    }

    // World bounds
    const w = GAME_CONFIG.WORLD.WIDTH || GAME_CONFIG.WORLD.SIZE;
    const h = GAME_CONFIG.WORLD.HEIGHT || GAME_CONFIG.WORLD.SIZE;
    if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;

    // Tail
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = this.radius * 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, 0);
    ctx.stroke();

    // Core
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
