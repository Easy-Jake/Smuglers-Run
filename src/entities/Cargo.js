import { Vector2D } from '../utils/Vector2D.js';

/**
 * Represents a collectable cargo item in the game
 */
export class Cargo {
  constructor(x, y, value = 100) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.radius = 15;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.05;
    this.color = '#ffff00';
    this.active = true; // Add active property for consistency with other entities
  }

  update() {
    // Update rotation
    this.rotation += this.rotationSpeed;
    
    // Update pulse effect
    this.pulsePhase += this.pulseSpeed;
    if (this.pulsePhase > Math.PI * 2) {
      this.pulsePhase -= Math.PI * 2;
    }
  }

  renderWithOffset(ctx, offsetX, offsetY) {
    if (!this.active) return;
    
    ctx.save();
    ctx.translate(this.x + offsetX, this.y + offsetY);
    ctx.rotate(this.rotation);

    // Calculate pulse effect
    const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.1;

    // Draw cargo container
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.rect(
      -this.radius * pulseScale,
      -this.radius * pulseScale,
      this.radius * 2 * pulseScale,
      this.radius * 2 * pulseScale
    );
    ctx.fill();
    ctx.stroke();

    // Draw cargo details
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.5, 0);
    ctx.lineTo(this.radius * 0.5, 0);
    ctx.moveTo(0, -this.radius * 0.5);
    ctx.lineTo(0, this.radius * 0.5);
    ctx.stroke();

    ctx.restore();
  }
  
  // Add regular render method for when offsets aren't needed
  render(ctx) {
    this.renderWithOffset(ctx, 0, 0);
  }
}
