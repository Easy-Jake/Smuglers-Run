import { Projectile } from '../entities/Projectile.js';
import { Particle } from '../entities/Particle.js';
import { Resource } from '../entities/Resource.js';

export class ObjectPool {
  // Initialize static properties
  static pools = {
    projectile: [],
    particle: [],
    resource: [],
  };

  static activeObjects = {
    projectile: [],
    particle: [],
    resource: [],
  };

  // Get an object from the pool or create a new one
  static get(type, ...args) {
    let obj;
    if (this.pools[type].length > 0) {
      obj = this.pools[type].pop();
      // Reinitialize the object with new parameters
      obj = Object.assign(obj, new (this._getConstructor(type))(...args));
    } else {
      obj = new (this._getConstructor(type))(...args);
    }

    // Add to active objects
    this.activeObjects[type].push(obj);
    return obj;
  }

  // Release an object back to the pool
  static release(type, obj) {
    const index = this.activeObjects[type].indexOf(obj);
    if (index !== -1) {
      this.activeObjects[type].splice(index, 1);
      this.pools[type].push(obj);
    }
  }

  // Update all objects of a specific type
  static update(type) {
    const active = this.activeObjects[type];
    for (let i = active.length - 1; i >= 0; i--) {
      const obj = active[i];
      if (!obj.update()) {
        active.splice(i, 1);
        this.pools[type].push(obj);
      }
    }
  }

  // Draw all objects of a specific type
  static draw(type, ctx, cameraX, cameraY) {
    this.activeObjects[type].forEach(obj => obj.draw(ctx, cameraX, cameraY));
  }

  // Clear all pools and active objects
  static clear() {
    for (const type in this.pools) {
      this.pools[type].length = 0;
      this.activeObjects[type].length = 0;
    }
  }

  // Helper method to get the constructor for a specific type
  static _getConstructor(type) {
    switch (type) {
      case 'projectile':
        return Projectile;
      case 'particle':
        return Particle;
      case 'resource':
        return Resource;
      default:
        throw new Error(`Unknown object type: ${type}`);
    }
  }
}
