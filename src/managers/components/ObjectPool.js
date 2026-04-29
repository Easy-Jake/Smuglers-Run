import { Projectile } from '../../entities/Projectile.js';
import { Particle } from '../../entities/Particle.js';
import { Cargo } from '../../entities/Cargo.js';

export class ObjectPool {
  constructor() {
    this.pools = new Map();
    this.initializePools();
  }

  initializePools() {
    // Projectile pool
    this.pools.set('projectile', {
      active: new Set(),
      inactive: new Set(),
      factory: () => new Projectile(0, 0, 0, 0),
      maxSize: 100,
    });

    // Particle pool
    this.pools.set('particle', {
      active: new Set(),
      inactive: new Set(),
      factory: () => new Particle(0, 0, 0, 0, '#fff'),
      maxSize: 1000,
    });

    // Cargo pool
    this.pools.set('cargo', {
      active: new Set(),
      inactive: new Set(),
      factory: () => new Cargo(0, 0),
      maxSize: 50,
    });
  }

  getFromPool(type, params) {
    const pool = this.pools.get(type);
    if (!pool) {
      throw new Error(`No pool found for type: ${type}`);
    }

    let obj;
    if (pool.inactive.size > 0) {
      obj = pool.inactive.values().next().value;
      pool.inactive.delete(obj);
    } else if (pool.active.size < pool.maxSize) {
      obj = pool.factory();
    } else {
      // Reuse oldest active object if pool is full
      obj = pool.active.values().next().value;
      pool.active.delete(obj);
    }

    // Initialize object with params
    Object.assign(obj, params);
    pool.active.add(obj);

    return obj;
  }

  returnToPool(type, obj) {
    const pool = this.pools.get(type);
    if (!pool) {
      throw new Error(`No pool found for type: ${type}`);
    }

    pool.active.delete(obj);
    pool.inactive.add(obj);

    // Reset object state
    Object.assign(obj, pool.factory());
  }

  clearInactive() {
    for (const pool of this.pools.values()) {
      pool.inactive.clear();
    }
  }

  dispose() {
    this.pools.clear();
  }
} 