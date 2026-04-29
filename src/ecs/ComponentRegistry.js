/**
 * Registry for component types that provides factory methods for creating components
 * This centralizes component management and enables dynamic component creation
 */
export class ComponentRegistry {
  /**
   * Create a new ComponentRegistry
   */
  constructor() {
    // Map of component constructors by name
    this.componentTypes = new Map();
    
    // Map of component schemas (for serialization/validation)
    this.componentSchemas = new Map();
  }

  /**
   * Register a component type
   * @param {string} name - Component type name
   * @param {Function} constructor - Component constructor
   * @param {Object} schema - Optional JSON schema for component data validation
   * @returns {ComponentRegistry} This registry for chaining
   */
  register(name, constructor, schema = null) {
    if (this.componentTypes.has(name)) {
      console.warn(`Component type '${name}' is being overwritten`);
    }
    
    this.componentTypes.set(name, constructor);
    
    if (schema) {
      this.componentSchemas.set(name, schema);
    }
    
    return this;
  }

  /**
   * Create a component by type name
   * @param {string} name - Component type name
   * @param {Object} data - Initial component data
   * @returns {Component} New component instance
   * @throws {Error} If component type is not registered
   */
  create(name, data = {}) {
    const constructor = this.componentTypes.get(name);
    
    if (!constructor) {
      throw new Error(`Component type '${name}' is not registered`);
    }
    
    const component = new constructor();
    
    // Initialize with data if provided
    if (data && Object.keys(data).length > 0) {
      Object.assign(component, data);
    }
    
    return component;
  }

  /**
   * Check if a component type is registered
   * @param {string} name - Component type name
   * @returns {boolean} Whether the component type is registered
   */
  has(name) {
    return this.componentTypes.has(name);
  }

  /**
   * Get a component constructor by name
   * @param {string} name - Component type name
   * @returns {Function|null} Component constructor or null if not found
   */
  getConstructor(name) {
    return this.componentTypes.get(name) || null;
  }

  /**
   * Get all registered component type names
   * @returns {Array<string>} Array of component type names
   */
  getComponentTypes() {
    return Array.from(this.componentTypes.keys());
  }

  /**
   * Get schema for a component type
   * @param {string} name - Component type name
   * @returns {Object|null} Component schema or null if not found
   */
  getSchema(name) {
    return this.componentSchemas.get(name) || null;
  }

  /**
   * Validate component data against its schema
   * @param {string} name - Component type name
   * @param {Object} data - Component data to validate
   * @returns {boolean} Whether the data is valid
   * @throws {Error} If component type is not registered or has no schema
   */
  validateData(name, data) {
    const schema = this.getSchema(name);
    
    if (!schema) {
      throw new Error(`No schema for component type '${name}'`);
    }
    
    // Basic validation - in a real implementation you would use a schema validator
    const required = schema.required || [];
    for (const field of required) {
      if (data[field] === undefined) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Reset the registry (remove all registered component types)
   */
  reset() {
    this.componentTypes.clear();
    this.componentSchemas.clear();
  }
} 