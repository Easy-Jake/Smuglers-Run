/**
 * Component representing an entity's sensor capabilities
 */
export class SensorComponent {
  /**
   * Create a new SensorComponent
   * @param {Object} options - Component options
   * @param {number} options.range - Base sensor range
   * @param {boolean} options.enabled - Whether sensors are enabled
   * @param {number} options.upgradeLevel - Sensor technology level
   * @param {string} options.type - Sensor type (standard, advanced, military, etc)
   */
  constructor(options = {}) {
    // Base detection range in world units
    this.range = options.range || 200;
    
    // Whether sensor is currently active
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    
    // Sensor upgrade level (affects range and capabilities)
    this.upgradeLevel = options.upgradeLevel || 0;
    
    // Type of sensor technology
    this.type = options.type || 'standard';
    
    // Enhanced capabilities
    this.canDetectCloaked = this.upgradeLevel >= 2;
    this.canScanResources = this.upgradeLevel >= 1;
    this.canIdentifyEnemies = this.upgradeLevel >= 1;
    
    // Calculate effective range based on upgrade level
    this._calculateEffectiveRange();
  }
  
  /**
   * Enable or disable the sensor
   * @param {boolean} isEnabled - Whether sensor should be enabled
   */
  setEnabled(isEnabled) {
    this.enabled = isEnabled;
  }
  
  /**
   * Check if sensor is currently enabled
   * @returns {boolean} Whether sensor is enabled
   */
  isEnabled() {
    return this.enabled;
  }
  
  /**
   * Set the sensor's upgrade level
   * @param {number} level - New upgrade level
   */
  setUpgradeLevel(level) {
    if (level >= 0) {
      this.upgradeLevel = level;
      
      // Update capabilities based on new level
      this.canDetectCloaked = this.upgradeLevel >= 2;
      this.canScanResources = this.upgradeLevel >= 1;
      this.canIdentifyEnemies = this.upgradeLevel >= 1;
      
      // Recalculate effective range
      this._calculateEffectiveRange();
    }
  }
  
  /**
   * Calculate the sensor's effective range based on type and upgrade level
   * @private
   */
  _calculateEffectiveRange() {
    // Base multiplier based on sensor type
    let typeMultiplier = 1.0;
    switch (this.type) {
      case 'advanced':
        typeMultiplier = 1.5;
        break;
      case 'military':
        typeMultiplier = 2.0;
        break;
      case 'alien':
        typeMultiplier = 2.5;
        break;
      default:
        typeMultiplier = 1.0;
    }
    
    // Upgrade level adds 20% per level
    const upgradeMultiplier = 1.0 + (this.upgradeLevel * 0.2);
    
    // Calculate effective range
    this.effectiveRange = this.range * typeMultiplier * upgradeMultiplier;
  }
  
  /**
   * Get the effective sensor range
   * @returns {number} Current effective sensor range
   */
  getEffectiveRange() {
    return this.enabled ? this.effectiveRange : 0;
  }
} 