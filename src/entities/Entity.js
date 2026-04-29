export class Entity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 0;
    this.height = 0;
    this.rotation = 0;
    this.zIndex = 0;
    this.active = true;
  }

  update(deltaTime) {
    // To be implemented by child classes
  }

  render(ctx) {
    // To be implemented by child classes
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  isCollidingWith(other) {
    const bounds = this.getBounds();
    const otherBounds = other.getBounds();

    return (
      bounds.x < otherBounds.x + otherBounds.width &&
      bounds.x + bounds.width > otherBounds.x &&
      bounds.y < otherBounds.y + otherBounds.height &&
      bounds.y + bounds.height > otherBounds.y
    );
  }

  destroy() {
    this.active = false;
  }
}
