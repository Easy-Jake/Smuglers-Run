import { Entity } from './Entity.js';

/**
 * Neutral NPC ships — traders, drifters, miners passing through.
 * They don't attack, just fly between waypoints. Background life.
 *
 * Three types:
 *   - trader  : moves on long routes between distant points
 *   - drifter : random wanderer, slow, neutral
 *   - miner   : hangs near asteroid fields, moves between rocks
 */
const NPC_TYPES = {
  trader: {
    speed: 1.2,
    color: '#88aacc',
    accent: '#bbddee',
    radius: 14,
    name: 'Trader',
  },
  drifter: {
    speed: 0.6,
    color: '#aa9966',
    accent: '#ccbb88',
    radius: 12,
    name: 'Drifter',
  },
  miner: {
    speed: 0.9,
    color: '#88aa55',
    accent: '#aacc77',
    radius: 13,
    name: 'Miner',
  },
};

export class NPCShip extends Entity {
  constructor(x, y, npcType = 'trader', waypoints = []) {
    super(x, y);
    this.type = 'npc';
    this.npcType = npcType;
    const cfg = NPC_TYPES[npcType] || NPC_TYPES.trader;
    this.radius = cfg.radius;
    this.width = cfg.radius * 2;
    this.height = cfg.radius * 2;
    this.color = cfg.color;
    this.accentColor = cfg.accent;
    this.npcName = cfg.name;
    this.speed = cfg.speed;
    this.maxSpeed = cfg.speed;
    this.active = true;
    this.health = 30;

    // Movement
    this.vx = 0;
    this.vy = 0;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = 0.04;

    // Waypoints (loops through them)
    this.waypoints = waypoints.length > 0 ? waypoints : [{ x, y }];
    this.currentWaypoint = 0;

    // Idle pause at waypoints
    this.idleTimer = 0;
  }

  update(deltaTime, gameState) {
    if (!this.active) return;

    // Idle for a beat at each waypoint
    if (this.idleTimer > 0) {
      this.idleTimer -= deltaTime;
      this.vx *= 0.94;
      this.vy *= 0.94;
    } else {
      const wp = this.waypoints[this.currentWaypoint];
      const dx = wp.x - this.x;
      const dy = wp.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 60) {
        // Reached waypoint, pause briefly, go to next
        this.idleTimer = 1.5 + Math.random() * 2;
        this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
      } else {
        // Move toward waypoint
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - this.rotation;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (Math.abs(angleDiff) < this.rotationSpeed) {
          this.rotation = targetAngle;
        } else {
          this.rotation += Math.sign(angleDiff) * this.rotationSpeed;
        }

        // Thrust in facing direction
        this.vx += Math.cos(this.rotation) * this.speed * 0.04;
        this.vy += Math.sin(this.rotation) * this.speed * 0.04;
      }
    }

    // Clamp speed
    const s = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (s > this.maxSpeed) {
      this.vx = (this.vx / s) * this.maxSpeed;
      this.vy = (this.vy / s) * this.maxSpeed;
    }

    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;

    // Friction
    this.vx *= 0.98;
    this.vy *= 0.98;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  render(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Simple ship shape: elongated diamond
    const r = this.radius;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(-r * 0.6, -r * 0.7);
    ctx.lineTo(-r * 0.3, 0);
    ctx.lineTo(-r * 0.6, r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit dot
    ctx.fillStyle = this.accentColor;
    ctx.beginPath();
    ctx.arc(r * 0.4, 0, r * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Engine glow
    ctx.fillStyle = 'rgba(150, 200, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(-r * 0.5, 0, r * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
