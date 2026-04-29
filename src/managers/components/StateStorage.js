export class StateStorage {
  constructor() {
    this.storageKey = 'gameState';
  }

  /**
   * Set the storage key
   * @param {string} key - Storage key to use
   * @returns {StateStorage} This storage object for chaining
   */
  setStorageKey(key) {
    if (typeof key === 'string' && key.trim() !== '') {
      this.storageKey = key;
    } else {
      console.warn('StateStorage: Invalid storage key, using default');
    }
    return this;
  }

  async load() {
    try {
      const savedState = localStorage.getItem(this.storageKey);
      if (savedState) {
        return JSON.parse(savedState);
      }
      return null;
    } catch (error) {
      console.warn('Failed to load saved state:', error);
      return null;
    }
  }

  async save(state) {
    try {
      const serializedState = this.serializeState(state);
      localStorage.setItem(this.storageKey, serializedState);
    } catch (error) {
      console.warn('Failed to save state:', error);
    }
  }

  serializeState(state) {
    const serializableState = {};
    for (const [key, value] of state) {
      if (value instanceof Map) {
        serializableState[key] = Array.from(value.entries());
      } else {
        serializableState[key] = value;
      }
    }
    return JSON.stringify(serializableState);
  }

  deserializeState(loadedState) {
    const state = new Map();
    for (const [key, value] of Object.entries(loadedState)) {
      if (Array.isArray(value)) {
        state.set(key, new Map(value));
      } else {
        state.set(key, value);
      }
    }
    return state;
  }
} 