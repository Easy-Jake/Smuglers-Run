export class StateHistory {
  constructor(maxSize = 50) {
    this.history = [];
    this.maxSize = maxSize;
  }

  /**
   * Set the maximum history size
   * @param {number} size - Maximum number of history entries to keep
   * @returns {StateHistory} This history object for chaining
   */
  setMaxHistorySize(size) {
    if (typeof size !== 'number' || size < 1) {
      console.warn('StateHistory: Invalid history size, must be a positive number');
      return this;
    }
    
    this.maxSize = size;
    
    // Trim history if it now exceeds the new max size
    if (this.history.length > this.maxSize) {
      this.history = this.history.slice(-this.maxSize);
    }
    
    return this;
  }

  add(path, oldValue, newValue) {
    this.history.push({ path, oldValue, newValue, timestamp: Date.now() });
    
    // Trim history if it exceeds max size
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }
  }

  undo() {
    if (this.history.length === 0) return null;
    
    const lastChange = this.history.pop();
    return {
      path: lastChange.path,
      value: lastChange.oldValue
    };
  }

  getHistory() {
    return [...this.history];
  }

  clear() {
    this.history = [];
  }
} 