import { GAME_CONFIG } from '../config/gameConfig.js';

export class Particle {
  constructor(x, y, type = 'default') {
    this.x = x;
    this.y = y;
    this.active = true;
    this.lifetime = 1000; // 1 second by default
    
    // Set properties based on particle type
    switch (type) {
      case 'engine':
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
        this.color = '#ff9900';
        this.lifetime = Math.random() * 500 + 300; // 300-800ms
        break;
        
      case 'explosion':
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3;
        this.size = Math.random() * 3 + 2;
        this.color = '#ff3300';
        this.lifetime = Math.random() * 800 + 400; // 400-1200ms
        break;
        
      case 'damage':
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.size = Math.random() * 2 + 1;
        this.color = '#ff0000';
        this.lifetime = Math.random() * 600 + 200; // 200-800ms
        break;
        
      case 'collect':
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = (Math.random() - 0.5) * 1;
        this.size = Math.random() * 2 + 1;
        this.color = '#00ff00';
        this.lifetime = Math.random() * 400 + 200; // 200-600ms
        break;
        
      default:
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = (Math.random() - 0.5) * 1;
        this.size = Math.random() * 2 + 1;
        this.color = '#ffffff';
        this.lifetime = Math.random() * 500 + 500; // 500-1000ms
        break;
    }
    
    // Initialize rotation for some particle types
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.1;
  }

  update(deltaTime) {
    if (!this.active) return;
    
    // Update position
    this.x += this.vx;
    this.y += this.vy;
    
    // Update rotation
    this.rotation += this.rotationSpeed;
    
    // Update lifetime
    this.lifetime -= deltaTime * 1000; // Convert seconds to milliseconds
    
    // Deactivate if lifetime is over
    if (this.lifetime <= 0) {
      this.active = false;
    }
    
    // Slowly reduce velocity (drag)
    this.vx *= 0.98;
    this.vy *= 0.98;
  }

  renderWithOffset(ctx, offsetX, offsetY) {
    if (!this.active) return;
    
    // Calculate alpha based on remaining lifetime
    const alpha = Math.min(1, this.lifetime / 300);
    
    // Save context
    ctx.save();
    
    // Set drawing properties
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    
    // Draw particle
    ctx.beginPath();
    ctx.arc(
      this.x + offsetX,
      this.y + offsetY,
      this.size,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    // Restore context
    ctx.restore();
  }
  
  // Add regular render method for when offsets aren't needed
  render(ctx) {
    this.renderWithOffset(ctx, 0, 0);
  }
}
