/**
 * Base class for all game services
 * Provides common functionality for service lifecycle management
 */
export class BaseService {
  constructor() {
    this.state = 'uninitialized';
    this.dependencies = new Map();
    this.initializationPromise = null;
    this.error = null;
  }

  /**
   * Initialize the service
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.state === 'initialized') return;
    if (this.state === 'initializing') return this.initializationPromise;
    
    this.state = 'initializing';
    this.error = null;
    
    try {
      this.initializationPromise = this.doInitialize();
      await this.initializationPromise;
      this.state = 'initialized';
    } catch (error) {
      this.state = 'error';
      this.error = error;
      throw error;
    }
  }

  /**
   * Perform actual initialization
   * @protected
   * @returns {Promise<void>}
   */
  async doInitialize() {
    // Override in subclasses
  }

  /**
   * Check if service is ready
   * @returns {boolean}
   */
  isReady() {
    return this.state === 'initialized';
  }

  /**
   * Get service state
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * Get service error if any
   * @returns {Error|null}
   */
  getError() {
    return this.error;
  }

  /**
   * Add a dependency
   * @param {string} name - Dependency name
   * @param {BaseService} service - Service instance
   */
  addDependency(name, service) {
    this.dependencies.set(name, service);
  }

  /**
   * Get a dependency
   * @param {string} name - Dependency name
   * @returns {BaseService|null}
   */
  getDependency(name) {
    return this.dependencies.get(name) || null;
  }

  /**
   * Wait for all dependencies to be ready
   * @returns {Promise<void>}
   */
  async waitForDependencies() {
    const promises = Array.from(this.dependencies.values())
      .map(service => service.initialize());
    await Promise.all(promises);
  }
} 