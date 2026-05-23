import { Entity } from './Entity.js';

/**
 * Drifting space debris — small inert chunks that drift through space.
 * Mild collision damage. Adds ambient texture so space doesn't feel empty.
 *
 * Visual: small jagged shapes that tumble slowly. Various sizes.
 * Doesn't block lasers. Bounces off bigger objects gently.
 */
const DEBRIS_TYPES = [
  { color: '#665544', stroke: '#887766', minR: 4, maxR: 8 },   // brown rock chunks
  { color: '#555566', stroke: '#777788', minR: 3, maxR: 6 },   // metal scrap
  { color: '#776655', stroke: '#998866', minR: 5, maxR: 10 },  // wood/plastic-looking
  { color: '#444455', stroke: '#666677', minR: 4, maxR: 7 },   // dark metal
];

export class Debris extends Entity {
  constructor(x, y) {
    super(x, y);
    this.type = 'debris';

    const cfg = DEBRIS_TYPES[Math.floor(Math.random() * DEBRIS_TYPES.length)];
    this.radius = cfg.minR + Math.random() * (cfg.maxR - cfg.minR);
    this.width = this.radius * 2;
    this.height = this.radius * 2;
    this.color = cfg.color;
    this.strokeColor = cfg.stroke;
    this.active = true;

    // Slow drift
    const speed = 0.1 + Math.random() * 0.3;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    // Tumble
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.04;

    // Jagged shape (3-6 vertices, irregular)
    const vertexCount = 3 + Math.floor(Math.random() * 4);
    this.vertices = [];
    for (let i = 0; i < vertexCount; i++) {
      const a = (i / vertexCount) * Math.PI * 2;
      const r = this.radius * (0.6 + Math.random() * 0.5);
      this.vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }

    // Damage on collision (small — just enough to feel)
    this.collisionDamage = Math.floor(this.radius / 2); // 1-5 hp
    this.lastCollisionTime = 0;
  }

  update(deltaTime, gameState) {
    if (!this.active) return;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;

    // Wrap around world bounds (debris flows in/out)
    const w = 20000, h = 20000;
    if (this.x < -50) this.x = w + 50;
    if (this.x > w + 50) this.x = -50;
    if (this.y < -50) this.y = h + 50;
    if (this.y > h + 50) this.y = -50;

    // Push out of station safe zones — debris doesn't enter docking areas
    if (gameState?.stations) {
      for (const station of gameState.stations) {
        const dx = this.x - station.x;
        const dy = this.y - station.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = station.safeZoneRadius + this.radius;
        if (dist < minDist) {
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          this.x = station.x + nx * minDist;
          this.y = station.y + ny * minDist;
          const dot = this.vx * nx + this.vy * ny;
          if (dot < 0) {
            this.vx -= 2 * dot * nx;
            this.vy -= 2 * dot * ny;
          }
        }
      }
    }
  }

  takeDamage() {
    // Debris breaks on first hit
    this.active = false;
    return true;
  }

  render(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}
