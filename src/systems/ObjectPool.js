export class ObjectPool {
  constructor(createFn, initialSize = 10) {
    this.createFn = createFn;
    this.pool = [];
    this.active = new Set();
    this.initialize(initialSize);
  }

  initialize(size) {
    for (let i = 0; i < size; i++) {
      this.pool.push(this.createFn());
    }
  }

  acquire() {
    let obj;
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      obj = this.createFn();
    }
    this.active.add(obj);
    return obj;
  }

  release(obj) {
    if (this.active.has(obj)) {
      this.active.delete(obj);
      this.pool.push(obj);
    }
  }

  releaseAll() {
    this.active.forEach(obj => {
      this.pool.push(obj);
    });
    this.active.clear();
  }

  getActiveCount() {
    return this.active.size;
  }

  getPoolSize() {
    return this.pool.length;
  }
}
