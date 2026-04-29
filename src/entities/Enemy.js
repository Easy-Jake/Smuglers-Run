import { Entity } from './Entity.js';

export class Enemy extends Entity {
  constructor(x, y, type = 'basic') {
    super(x, y);
    this.type = type;
    this.health = 100;
    this.speed = 2;
    this.width = 32;
    this.height = 32;
    this.target = null;
    this.attackRange = 200;
    this.damage = 10;
  }

  update(deltaTime) {
    if (!this.active || !this.target) return;

    // Can't detect target if their power is off (running dark / stealth)
    if (this.target.isPowered && !this.target.isPowered()) {
      // Lost contact — stop pursuing
      return;
    }

    // Move towards target
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
      this.rotation = Math.atan2(dy, dx);
    }

    // Attack if in range
    if (distance <= this.attackRange) {
      this.attack();
    }
  }

  render(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Draw enemy shape
    ctx.fillStyle = 'red';
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Draw health bar
    ctx.fillStyle = 'black';
    ctx.fillRect(-this.width / 2, -this.height / 2 - 10, this.width, 5);
    ctx.fillStyle = 'green';
    ctx.fillRect(-this.width / 2, -this.height / 2 - 10, (this.width * this.health) / 100, 5);

    ctx.restore();
  }

  attack() {
    if (this.target && this.target.takeDamage) {
      this.target.takeDamage(this.damage);
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.destroy();
    }
  }

  setTarget(target) {
    this.target = target;
  }

  // Renamed draw to renderWithOffset for clarity when needing to render with camera offset
  renderWithOffset(ctx, offsetX, offsetY) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x + offsetX, this.y + offsetY);
    ctx.rotate(this.rotation);

    // Draw enemy shape
    ctx.fillStyle = 'red';
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Draw health bar
    ctx.fillStyle = 'black';
    ctx.fillRect(-this.width / 2, -this.height / 2 - 10, this.width, 5);
    ctx.fillStyle = 'green';
    ctx.fillRect(-this.width / 2, -this.height / 2 - 10, (this.width * this.health) / 100, 5);

    ctx.restore();
  }
}
