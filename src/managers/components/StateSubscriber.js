/**
 * Handles subscriptions to state changes
 */
export class StateSubscriber {
  constructor() {
    this.subscribers = new Map();
    this.eventSystem = null;
  }

  /**
   * Set the event system for state subscription events
   * @param {EventSystem} eventSystem - The event system to use
   * @returns {StateSubscriber} This subscriber for chaining
   */
  setEventSystem(eventSystem) {
    if (!eventSystem || typeof eventSystem.emit !== 'function') {
      console.warn('StateSubscriber: Invalid event system provided');
      return this;
    }
    this.eventSystem = eventSystem;
    return this;
  }

  /**
   * Subscribe to changes at a specific state path
   * @param {string} path - Path to subscribe to (e.g., 'player.position')
   * @param {Function} callback - Function to call when state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }
    
    this.subscribers.get(path).add(callback);
    
    // Emit subscription event if event system exists
    if (this.eventSystem) {
      this.eventSystem.emit('state:subscribed', { path });
    }
    
    // Return unsubscribe function
    return () => this.unsubscribe(path, callback);
  }

  /**
   * Unsubscribe from a path
   * @param {string} path - Path to unsubscribe from
   * @param {Function} callback - Callback to remove
   */
  unsubscribe(path, callback) {
    if (!this.subscribers.has(path)) return;
    
    const subscribers = this.subscribers.get(path);
    subscribers.delete(callback);
    
    // Clean up if no subscribers left
    if (subscribers.size === 0) {
      this.subscribers.delete(path);
      
      // Emit unsubscription event if event system exists
      if (this.eventSystem) {
        this.eventSystem.emit('state:unsubscribed', { path });
      }
    }
  }

  notify(path, oldValue, newValue) {
    const callbacks = this.subscribers.get(path);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(oldValue, newValue);
        } catch (error) {
          console.error(`Error in state subscriber callback for ${path}:`, error);
        }
      });
    }
  }

  clear() {
    this.subscribers.clear();
  }
} 