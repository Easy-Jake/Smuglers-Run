import { GAME_CONFIG, currentGalaxy } from './gameConfig.js';
import * as constants from './constants.js';
import { ASSETS, getAssetType, getAssetUrl, getSceneAssets, getTotalAssetCount } from './assets.js';

/**
 * Centralized configuration management system
 * Provides a single point of access for all game configuration
 */
export class ConfigManager {
  /**
   * Create a new ConfigManager
   */
  constructor() {
    // Core configuration
    this.game = GAME_CONFIG;
    this.galaxy = currentGalaxy;
    this.constants = constants;
    
    // Asset configuration
    this.assets = ASSETS;
    
    // State configuration
    this.state = {
      historySize: 50,
      persistEnabled: true,
      storageKey: 'smugglers-run-state'
    };
    
    // Environment-specific overrides
    this.environment = this.detectEnvironment();
    
    // Allow runtime value overrides (useful for testing/debugging)
    this.overrides = new Map();
  }

  /**
   * Detect current environment
   * @private
   * @returns {string} Environment name
   */
  detectEnvironment() {
    // Detect environment based on environment variables or window location
    if (typeof process !== 'undefined' && process.env.NODE_ENV) {
      return process.env.NODE_ENV;
    }
    
    // Browser-based detection
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
      }
      if (hostname.includes('test') || hostname.includes('staging')) {
        return 'test';
      }
    }
    
    return 'production';
  }

  /**
   * Get a configuration value
   * @param {string} path - Dot-notation path to configuration value
   * @param {*} defaultValue - Default value if path is not found
   * @returns {*} Configuration value
   */
  get(path, defaultValue = null) {
    // Check for override
    if (this.overrides.has(path)) {
      return this.overrides.get(path);
    }
    
    // Split path into parts
    const parts = path.split('.');
    
    // Determine root object based on first part
    let obj;
    const root = parts[0].toLowerCase();
    
    switch (root) {
      case 'game':
        obj = this.game;
        parts.shift(); // Remove root element
        break;
      case 'constants':
        obj = this.constants;
        parts.shift();
        break;
      case 'assets':
        obj = this.assets;
        parts.shift();
        break;
      case 'galaxy':
        obj = this.galaxy;
        parts.shift();
        break;
      case 'state':
        obj = this.state;
        parts.shift();
        break;
      default:
        // Try to find the value in all objects
        const gameValue = this.getNestedValue(this.game, parts);
        if (gameValue !== undefined && gameValue !== null) return gameValue;
        
        const constantsValue = this.getNestedValue(this.constants, parts);
        if (constantsValue !== undefined && constantsValue !== null) return constantsValue;
        
        const galaxyValue = this.getNestedValue(this.galaxy, parts);
        if (galaxyValue !== undefined && galaxyValue !== null) return galaxyValue;
        
        const stateValue = this.getNestedValue(this.state, parts);
        if (stateValue !== undefined && stateValue !== null) return stateValue;
        
        return defaultValue;
    }
    
    // Navigate to nested value
    const value = this.getNestedValue(obj, parts, defaultValue);
    return value !== null && value !== undefined ? value : defaultValue;
  }

  /**
   * Get a nested value from an object using an array of property names
   * @private
   * @param {Object} obj - Object to navigate
   * @param {Array<string>} parts - Property names to navigate
   * @param {*} defaultValue - Default value if path is not found
   * @returns {*} Nested value or default
   */
  getNestedValue(obj, parts, defaultValue = null) {
    // If object is null or undefined, return default
    if (obj === null || obj === undefined) {
      return defaultValue;
    }
    
    // Start with the object
    let current = obj;
    
    // Navigate through parts
    for (const part of parts) {
      // Convert to uppercase if the current object has uppercase keys
      const key = this.findMatchingKey(current, part);
      
      // If key doesn't exist, return default
      if (key === null || current[key] === undefined) {
        return defaultValue;
      }
      
      // Move to next level
      current = current[key];
    }
    
    return current;
  }

  /**
   * Find a matching key in an object, case-insensitive
   * @private
   * @param {Object} obj - Object to search
   * @param {string} key - Key to find
   * @returns {string|null} Matching key or null if not found
   */
  findMatchingKey(obj, key) {
    // If the object is not an object, return null
    if (obj === null || typeof obj !== 'object') {
      return null;
    }
    
    // Check for exact match
    if (obj[key] !== undefined) {
      return key;
    }
    
    // Check for case-insensitive match
    const lowerKey = key.toLowerCase();
    
    for (const objKey of Object.keys(obj)) {
      if (objKey.toLowerCase() === lowerKey) {
        return objKey;
      }
    }
    
    return null;
  }

  /**
   * Set a configuration override
   * @param {string} path - Dot-notation path to configuration value
   * @param {*} value - Value to set
   * @returns {ConfigManager} This ConfigManager for chaining
   */
  override(path, value) {
    this.overrides.set(path, value);
    return this;
  }

  /**
   * Remove a configuration override
   * @param {string} path - Dot-notation path to configuration value
   * @returns {ConfigManager} This ConfigManager for chaining
   */
  clearOverride(path) {
    this.overrides.delete(path);
    return this;
  }

  /**
   * Clear all configuration overrides
   * @returns {ConfigManager} This ConfigManager for chaining
   */
  clearAllOverrides() {
    this.overrides.clear();
    return this;
  }

  /**
   * Get asset information
   * @param {string} key - Asset key
   * @returns {Object} Asset information
   */
  getAsset(key) {
    // First check common assets
    let asset = this.assets.common[key];
    
    // If not found, check other scenes
    if (!asset) {
      for (const scene of Object.keys(this.assets)) {
        if (scene === 'common') continue;
        
        asset = this.assets[scene][key];
        if (asset) break;
      }
    }
    
    if (!asset) {
      return null;
    }
    
    return {
      ...asset,
      key,
      type: getAssetType(key) || asset.type,
      url: getAssetUrl(key) || asset.url
    };
  }

  /**
   * Get assets for a scene
   * @param {string} scene - Scene name
   * @returns {Object} Scene assets
   */
  getSceneAssets(scene) {
    return getSceneAssets(scene);
  }

  /**
   * Get total asset count
   * @returns {number} Total asset count
   */
  getTotalAssetCount() {
    return getTotalAssetCount();
  }
}

// Create and export a singleton instance
const configManager = new ConfigManager();
export default configManager; 