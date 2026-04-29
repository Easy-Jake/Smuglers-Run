/**
 * Service Locator pattern implementation for dependency management
 * Provides centralized access to services while decoupling components
 */
export class ServiceLocator {
  /**
   * Error codes for ServiceLocator errors
   * @readonly
   * @enum {string}
   */
  static ErrorCodes = {
    SERVICE_NOT_REGISTERED: 'SERVICE_NOT_REGISTERED',
    SERVICE_OVERWRITTEN: 'SERVICE_OVERWRITTEN',
    CIRCULAR_DEPENDENCY: 'CIRCULAR_DEPENDENCY',
    MISSING_DEPENDENCY: 'MISSING_DEPENDENCY',
    FACTORY_ERROR: 'FACTORY_ERROR',
    INVALID_ARGUMENT: 'INVALID_ARGUMENT'
  };

  /**
   * Create a new service locator
   */
  constructor() {
    // Map of registered services
    this.services = new Map();
    
    // Map of service factories for lazy initialization
    this.factories = new Map();
    
    // Track service initialization status
    this.initialized = new Set();
    
    // Error handlers can be registered to handle specific error types
    this.errorHandlers = new Map();
    
    // Default error handler just logs and rethrows
    this.setErrorHandler('default', (error) => {
      console.error(`[ServiceLocator] ${error.message}`);
      throw error;
    });
  }

  /**
   * Set an error handler for a specific error code
   * @param {string} errorCode - Error code to handle
   * @param {Function} handler - Error handler function
   * @returns {ServiceLocator} This service locator for chaining
   */
  setErrorHandler(errorCode, handler) {
    if (typeof handler !== 'function') {
      throw new Error(`[${ServiceLocator.ErrorCodes.INVALID_ARGUMENT}] Error handler must be a function`);
    }
    this.errorHandlers.set(errorCode, handler);
    return this;
  }

  /**
   * Handle an error with the appropriate error handler
   * @param {Error} error - Error to handle
   * @param {string} errorCode - Error code
   * @param {Object} context - Additional context for the error
   * @private
   */
  handleError(error, errorCode, context = {}) {
    // Create a structured error object
    const structuredError = {
      code: errorCode,
      message: error.message || `Error in ServiceLocator: ${errorCode}`,
      originalError: error,
      context,
      timestamp: new Date(),
      stack: error.stack
    };
    
    // Find the appropriate error handler
    const handler = this.errorHandlers.get(errorCode) || this.errorHandlers.get('default');
    
    // Call the handler with the structured error
    return handler(structuredError);
  }

  /**
   * Register a service instance
   * @param {string} name - Service name
   * @param {Object} instance - Service instance
   * @returns {ServiceLocator} This service locator for chaining
   * @throws {Error} If the instance is invalid
   */
  register(name, instance) {
    try {
      // Validate input
      if (!name || typeof name !== 'string') {
        throw new Error(`Service name must be a non-empty string, got: ${typeof name}`);
      }
      
      if (!instance) {
        throw new Error(`Service instance for '${name}' cannot be null or undefined`);
      }
      
      // Check for overwrite
      if (this.services.has(name)) {
        const warning = `Service '${name}' is being overwritten`;
        console.warn(`[${ServiceLocator.ErrorCodes.SERVICE_OVERWRITTEN}] ${warning}`);
      }
      
      // Register the service
      this.services.set(name, instance);
      this.initialized.add(name);
      return this;
    } catch (error) {
      return this.handleError(error, ServiceLocator.ErrorCodes.INVALID_ARGUMENT, { name, instance });
    }
  }

  /**
   * Register a factory function for lazy service initialization
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that creates the service
   * @param {Array<string>} dependencies - Array of dependency service names
   * @returns {ServiceLocator} This service locator for chaining
   * @throws {Error} If the factory or dependencies are invalid
   */
  registerFactory(name, factory, dependencies = []) {
    try {
      // Validate input
      if (!name || typeof name !== 'string') {
        throw new Error(`Service name must be a non-empty string, got: ${typeof name}`);
      }
      
      if (typeof factory !== 'function') {
        throw new Error(`Factory for '${name}' must be a function, got: ${typeof factory}`);
      }
      
      if (!Array.isArray(dependencies)) {
        throw new Error(`Dependencies for '${name}' must be an array, got: ${typeof dependencies}`);
      }
      
      // Register the factory
      this.factories.set(name, { factory, dependencies });
      return this;
    } catch (error) {
      return this.handleError(error, ServiceLocator.ErrorCodes.INVALID_ARGUMENT, { name, dependencies });
    }
  }

  /**
   * Get a service by name, initializing it if needed
   * @param {string} name - Service name
   * @param {Object} options - Additional options
   * @param {boolean} options.required - Whether the service is required (default: true)
   * @param {*} options.defaultValue - Default value if service is not found and not required
   * @returns {Object} Service instance or default value
   * @throws {Error} If service is not found and required, or if there are circular dependencies
   */
  get(name, options = { required: true }) {
    try {
      // Validate input
      if (!name || typeof name !== 'string') {
        throw new Error(`Service name must be a non-empty string, got: ${typeof name}`);
      }
      
      // Return existing instance if already initialized
      if (this.services.has(name)) {
        return this.services.get(name);
      }
      
      // Check if we have a factory for this service
      if (!this.factories.has(name)) {
        if (options.required === false) {
          return options.defaultValue;
        }
        throw new Error(`Service '${name}' not registered`);
      }
      
      // Initialize the service
      return this.initializeService(name, new Set());
    } catch (error) {
      if (error.code === ServiceLocator.ErrorCodes.SERVICE_NOT_REGISTERED && options.required === false) {
        return options.defaultValue;
      }
      return this.handleError(error, error.code || ServiceLocator.ErrorCodes.SERVICE_NOT_REGISTERED, { name, options });
    }
  }

  /**
   * Initialize a service and its dependencies
   * @param {string} name - Service name
   * @param {Set} resolutionPath - Set of services being resolved (for cycle detection)
   * @returns {Object} Initialized service
   * @private
   * @throws {Error} If there are circular dependencies or initialization fails
   */
  async initializeService(name, resolutionPath) {
    try {
      // Check for circular dependencies
      if (resolutionPath.has(name)) {
        const path = Array.from(resolutionPath).join(' -> ');
        throw {
          code: ServiceLocator.ErrorCodes.CIRCULAR_DEPENDENCY,
          message: `Circular dependency detected: ${path} -> ${name}`
        };
      }
      
      // Add current service to resolution path
      resolutionPath.add(name);
      
      // Get factory info
      const factoryInfo = this.factories.get(name);
      
      // Resolve dependencies first
      const resolvedDependencies = [];
      for (const dep of factoryInfo.dependencies) {
        // If dependency is already resolved, use it
        if (this.services.has(dep)) {
          resolvedDependencies.push(this.services.get(dep));
          continue;
        }

        // Otherwise recursively resolve it
        if (!this.factories.has(dep)) {
          throw {
            code: ServiceLocator.ErrorCodes.MISSING_DEPENDENCY,
            message: `Dependency '${dep}' not registered for service '${name}'`
          };
        }

        resolvedDependencies.push(await this.initializeService(dep, new Set(resolutionPath)));
      }
      
      // Create the service (handle both sync and async factories)
      let service;
      try {
        service = factoryInfo.factory(...resolvedDependencies);
        // If the factory returned a Promise, resolve it
        if (service && typeof service.then === 'function') {
          service = await service;
        }
      } catch (factoryError) {
        throw {
          code: ServiceLocator.ErrorCodes.FACTORY_ERROR,
          message: `Failed to create service '${name}': ${factoryError.message}`,
          originalError: factoryError
        };
      }

      // Validate service was created
      if (!service) {
        throw {
          code: ServiceLocator.ErrorCodes.FACTORY_ERROR,
          message: `Factory for service '${name}' returned ${service}`
        };
      }

      // Register the initialized service
      this.services.set(name, service);
      this.initialized.add(name);
      
      return service;
    } catch (error) {
      return this.handleError(error, error.code || ServiceLocator.ErrorCodes.FACTORY_ERROR, { name, resolutionPath: Array.from(resolutionPath) });
    }
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean} Whether the service is registered
   */
  has(name) {
    if (!name || typeof name !== 'string') {
      console.warn(`[${ServiceLocator.ErrorCodes.INVALID_ARGUMENT}] Invalid service name: ${name}`);
      return false;
    }
    return this.services.has(name) || this.factories.has(name);
  }

  /**
   * Check if a service is initialized
   * @param {string} name - Service name
   * @returns {boolean} Whether the service is initialized
   */
  isInitialized(name) {
    if (!name || typeof name !== 'string') {
      console.warn(`[${ServiceLocator.ErrorCodes.INVALID_ARGUMENT}] Invalid service name: ${name}`);
      return false;
    }
    return this.initialized.has(name);
  }

  /**
   * Initialize all registered services
   */
  async initializeAll() {
    // Get all factory names that haven't been initialized
    const pending = Array.from(this.factories.keys())
      .filter(name => !this.initialized.has(name));

    // Track errors during initialization
    const errors = [];

    // Initialize each service (sequentially to respect dependency order)
    for (const name of pending) {
      try {
        if (!this.services.has(name)) {
          await this.initializeService(name, new Set());
        }
      } catch (error) {
        errors.push({ name, error });
        console.error(`Failed to initialize service '${name}':`, error);
      }
    }

    // If there were errors, provide a summary
    if (errors.length > 0) {
      console.error(`Failed to initialize ${errors.length} services:`,
        errors.map(e => e.name).join(', '));
    }

    return errors.length === 0;
  }

  /**
   * Remove a service registration
   * @param {string} name - Service name
   * @returns {boolean} Whether the service was unregistered
   */
  unregister(name) {
    if (!name || typeof name !== 'string') {
      console.warn(`[${ServiceLocator.ErrorCodes.INVALID_ARGUMENT}] Invalid service name: ${name}`);
      return false;
    }
    
    const hadService = this.services.delete(name);
    const hadFactory = this.factories.delete(name);
    this.initialized.delete(name);
    
    return hadService || hadFactory;
  }

  /**
   * Reset the service locator
   */
  reset() {
    this.services.clear();
    this.factories.clear();
    this.initialized.clear();
    
    // Keep default error handler
    const defaultHandler = this.errorHandlers.get('default');
    this.errorHandlers.clear();
    this.errorHandlers.set('default', defaultHandler);
  }
} 