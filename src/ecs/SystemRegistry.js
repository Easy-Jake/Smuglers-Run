/**
 * Registry for system types that provides factory methods for creating systems
 * This centralizes system management and enables dynamic system creation
 */
export class SystemRegistry {
  /**
   * Create a new SystemRegistry
   */
  constructor() {
    // Map of system constructors by name
    this.systemTypes = new Map();
    
    // Map of system dependencies
    this.systemDependencies = new Map();
    
    // Map of system priorities
    this.systemPriorities = new Map();

    // Map of system options
    this.systemOptions = new Map();
  }

  /**
   * Register a system type
   * @param {string} name - System type name
   * @param {Function} constructor - System constructor
   * @param {Object} options - System registration options
   * @param {number} options.priority - System execution priority (lower runs first)
   * @param {Array<string>} options.dependencies - Names of systems this system depends on
   * @returns {SystemRegistry} This registry for chaining
   */
  register(name, constructor, options = {}) {
    if (this.systemTypes.has(name)) {
      console.warn(`System type '${name}' is being overwritten`);
    }
    
    this.systemTypes.set(name, constructor);
    this.systemPriorities.set(name, options.priority || 0);
    
    if (options.dependencies && options.dependencies.length > 0) {
      this.systemDependencies.set(name, new Set(options.dependencies));
    } else {
      this.systemDependencies.set(name, new Set());
    }
    
    this.systemOptions.set(name, options.options || {});
    
    return this;
  }

  /**
   * Create a system by type name
   * @param {string} name - System type name
   * @param {Object} params - Additional parameters to pass to constructor
   * @returns {System} New system instance
   * @throws {Error} If system type is not registered
   */
  create(name, params = {}) {
    const constructor = this.systemTypes.get(name);
    
    if (!constructor) {
      throw new Error(`System type '${name}' is not registered`);
    }
    
    const priority = this.systemPriorities.get(name) || 0;
    const system = new constructor(priority, params);
    
    return system;
  }

  /**
   * Check if a system type is registered
   * @param {string} name - System type name
   * @returns {boolean} Whether the system type is registered
   */
  has(name) {
    return this.systemTypes.has(name);
  }

  /**
   * Get a system constructor by name
   * @param {string} name - System type name
   * @returns {Function|null} System constructor or null if not found
   */
  getConstructor(name) {
    return this.systemTypes.get(name) || null;
  }

  /**
   * Get system information including options
   * @param {string} name - System type name 
   * @returns {Object|null} System information or null if not found
   */
  getSystemInfo(name) {
    if (!this.has(name)) {
      return null;
    }
    
    return {
      constructor: this.systemTypes.get(name),
      priority: this.getPriority(name),
      dependencies: Array.from(this.getDependencies(name)),
      options: this.systemOptions.get(name) || {}
    };
  }

  /**
   * Get all registered system type names
   * @returns {Array<string>} Array of system type names
   */
  getSystemTypes() {
    return Array.from(this.systemTypes.keys());
  }

  /**
   * Get system priority
   * @param {string} name - System type name
   * @returns {number} System priority
   */
  getPriority(name) {
    return this.systemPriorities.get(name) || 0;
  }

  /**
   * Get system dependencies
   * @param {string} name - System type name
   * @returns {Set<string>} Set of system dependencies
   */
  getDependencies(name) {
    return this.systemDependencies.get(name) || new Set();
  }

  /**
   * Get dependency graph for registered systems
   * @returns {Map<string, Set<string>>} Map of system dependencies
   */
  getDependencyGraph() {
    return new Map(this.systemDependencies);
  }

  /**
   * Get ordered list of system names based on dependencies and priorities
   * @returns {Array<string>} Ordered system names
   */
  getOrderedSystemNames() {
    const systems = this.getSystemTypes();
    const dependencies = this.getDependencyGraph();
    const result = [];
    const visited = new Set();
    const temp = new Set();
    
    // Topological sort function
    const visit = (systemName) => {
      if (temp.has(systemName)) {
        throw new Error(`Circular dependency detected: ${Array.from(temp).join(' -> ')} -> ${systemName}`);
      }
      
      if (visited.has(systemName)) {
        return;
      }
      
      temp.add(systemName);
      
      const deps = dependencies.get(systemName) || new Set();
      for (const dep of deps) {
        visit(dep);
      }
      
      temp.delete(systemName);
      visited.add(systemName);
      result.push(systemName);
    };
    
    // Visit all systems
    for (const systemName of systems) {
      if (!visited.has(systemName)) {
        visit(systemName);
      }
    }
    
    // Sort by priority within dependency constraints
    return result.sort((a, b) => {
      const aDeps = dependencies.get(a) || new Set();
      const bDeps = dependencies.get(b) || new Set();
      
      // If b depends on a, a comes first
      if (bDeps.has(a)) return -1;
      
      // If a depends on b, b comes first
      if (aDeps.has(b)) return 1;
      
      // Otherwise, sort by priority
      return this.getPriority(a) - this.getPriority(b);
    });
  }

  /**
   * Reset the registry (remove all registered system types)
   */
  reset() {
    this.systemTypes.clear();
    this.systemDependencies.clear();
    this.systemPriorities.clear();
    this.systemOptions.clear();
  }
} 