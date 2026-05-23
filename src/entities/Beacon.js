import { Entity } from './Entity.js';

/**
 * Distress beacon — floating signal in space
 * Pulsing red light. Visible on minimap.
 *
 * Two outcomes when player gets close:
 *   - reward: floating cargo crate with free resources
 *   - trap: pirate scout ambush (already nearby, hidden)
 *
 * Player doesn't know which until they get close enough.
 * The beacon `kind` is set at spawn time.
 */
export class Beacon extends Entity {
  constructor(x, y, kind = 'reward') {
    super(x, y);
    this.type = 'beacon';
    this.kind = kind; // 'reward' or 'trap'

    this.radius = 14;
    this.width = this.radius * 2;
    this.height = this.radius * 2;
    this.active = true;

    // Slowly drifts
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * 0.1;
    this.vy = Math.sin(angle) * 0.1;

    // Lifetime — beacons despawn after 90 seconds if not investigated
    this.lifetime = 90;
    this.age = 0;

    // Investigation state
    this.investigated = false;
    this.investigationRange = 200; // close enough to "find out"
  }

  update(deltaTime, gameState) {
    if (!this.active) return;
    this.x += this.vx;
    this.y += this.vy;
    this.age += deltaTime;

    // Despawn after lifetime
    if (this.age >= this.lifetime) {
      this.active = false;
      return;
    }

    // Check if player is investigating
    if (!this.investigated && gameState?.player) {
      const dx = this.x - gameState.player.x;
      const dy = this.y - gameState.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.investigationRange) {
        this.investigated = true;
        this._triggerOutcome(gameState);
      }
    }
  }

  _triggerOutcome(gameState) {
    // Lazy import to avoid circular dependencies
    if (this.kind === 'reward') {
      // Drop a small cluster of free resources
      this._spawnRewardCrate(gameState);
    } else {
      // Spawn 1-2 pirate scouts nearby
      this._spawnAmbush(gameState);
    }
    // Beacon "deactivates" after triggering
    this.active = false;
  }

  _spawnRewardCrate(gameState) {
    // Drop 3-5 random resources around the beacon
    import('./Resource.js').then(({ Resource }) => {
      const count = 3 + Math.floor(Math.random() * 3);
      const types = ['carbon', 'ferro', 'silicrystal'];
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const d = 30 + Math.random() * 40;
        const rx = this.x + Math.cos(a) * d;
        const ry = this.y + Math.sin(a) * d;
        const resType = types[Math.floor(Math.random() * types.length)];
        const r = new Resource(rx, ry, 10, resType);
        gameState.addResource?.(r);
      }
    });
    import('../utils/EventLog.js').then(m => {
      m.eventLog.log('navigation', 'Distress beacon — found abandoned cargo!', { kind: 'reward' });
    });
  }

  _spawnAmbush(gameState) {
    // Spawn pirate scouts that are already hostile
    import('./Enemy.js').then(({ Enemy }) => {
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sx = this.x + Math.cos(a) * 150;
        const sy = this.y + Math.sin(a) * 150;
        const pirate = new Enemy(sx, sy, { enemyType: 'scout', waypoints: [{ x: this.x, y: this.y }] });
        pirate.health = 25;
        pirate.maxHealth = 25;
        pirate.speed = 2.0;
        pirate.maxSpeed = 2.0;
        pirate.damage = 8;
        pirate.sensorRange = 1500;
        pirate.attackRange = 300;
        pirate.shootRate = 70;
        pirate.creditReward = 30;
        pirate.projectileDamage = 8;
        pirate.target = gameState.player;
        pirate.state = 'chase';
        pirate.enemyTier = 'Pirate Scout';
        pirate.isPirate = true;
        gameState.enemies.push(pirate);
      }
    });
    import('../utils/EventLog.js').then(m => {
      m.eventLog.log('navigation', 'Distress beacon — PIRATE AMBUSH!', { kind: 'trap' });
    });
  }

  render(ctx) {
    if (!this.active) return;

    // Pulsing red beacon
    const pulse = 0.5 + Math.sin(Date.now() / 200) * 0.5;

    // Outer glow
    ctx.fillStyle = `rgba(255, 60, 60, ${pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 30 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#882222';
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bright center
    ctx.fillStyle = `rgba(255, 100, 100, ${pulse})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Antenna lines
    ctx.strokeStyle = '#ff8888';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + this.age * 0.5;
      ctx.beginPath();
      ctx.moveTo(this.x + Math.cos(a) * this.radius, this.y + Math.sin(a) * this.radius);
      ctx.lineTo(this.x + Math.cos(a) * (this.radius + 8), this.y + Math.sin(a) * (this.radius + 8));
      ctx.stroke();
    }
  }
}
