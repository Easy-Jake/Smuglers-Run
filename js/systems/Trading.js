import { FUEL_PRICE } from '../config/constants.js';
import { getCurrentGalaxy } from '../config/gameConfig.js';

/**
 * Trading system for buying and selling resources
 */
export class Trading {
  /**
   * Create a new Trading system
   */
  constructor() {
    /**
     * Current resource prices
     * @type {Map<string, number>}
     * @private
     */
    this.prices = new Map();
    
    /**
     * Supply and demand for resources
     * @type {Map<string, number>}
     * @private
     */
    this.supplyDemand = new Map();
    
    /**
     * Last price update timestamp
     * @type {number}
     * @private
     */
    this.lastUpdate = 0;
    
    /**
     * Update interval for prices (in frames at 60fps)
     * @type {number}
     * @private
     */
    this.updateInterval = 300; // Update prices every 5 seconds (at 60fps)
    
    // Initialize prices
    this.init();
  }

  /**
   * Initialize trading system
   */
  init() {
    // Initialize base prices for all resources
    this.updatePrices();
  }

  /**
   * Update resource prices based on supply and demand
   */
  updatePrices() {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval * (1000 / 60)) return;

    this.lastUpdate = now;

    // Get current galaxy data
    const galaxy = getCurrentGalaxy();
    
    // Update prices based on supply and demand
    for (const resource of Object.values(galaxy.resources)) {
      const baseValue = resource.baseValue;
      const multiplier = galaxy.resourceMultipliers[resource.name] || 0.5;

      // Add some market fluctuation
      const fluctuation = 0.8 + Math.random() * 0.4; // ±20% variation
      const supply = this.supplyDemand.get(resource.name) || 1;

      // Price formula: base * multiplier * fluctuation * supply/demand factor
      const price = Math.round(baseValue * multiplier * fluctuation * Math.pow(0.95, supply - 1));

      this.prices.set(resource.name, price);
    }
  }

  /**
   * Sell cargo from a ship
   * @param {Object} ship - Ship selling cargo
   * @param {string} resourceType - Resource type to sell
   * @param {number} amount - Amount to sell
   * @returns {number} Value of sold cargo
   */
  sellCargo(ship, resourceType, amount) {
    const cargo = ship.cargo.find(c => c.type.name === resourceType);
    if (!cargo || cargo.amount < amount) return 0;

    const price = this.prices.get(resourceType) || cargo.type.baseValue;
    const value = price * amount;

    // Update cargo
    cargo.amount -= amount;
    if (cargo.amount <= 0) {
      const index = ship.cargo.indexOf(cargo);
      ship.cargo.splice(index, 1);
    }

    // Update ship stats
    ship.currentCargoSpace -= amount;
    ship.credits += value;

    // Update market supply
    const currentSupply = this.supplyDemand.get(resourceType) || 0;
    this.supplyDemand.set(resourceType, currentSupply + 1);

    return value;
  }

  /**
   * Buy fuel for a ship
   * @param {Object} ship - Ship buying fuel
   * @param {number} amount - Amount of fuel to buy
   * @returns {number} Cost of purchased fuel
   */
  buyFuel(ship, amount) {
    const cost = FUEL_PRICE * amount;
    if (ship.credits < cost || ship.fuel + amount > ship.maxFuel) return 0;

    ship.credits -= cost;
    ship.fuel = Math.min(ship.maxFuel, ship.fuel + amount);

    return cost;
  }

  /**
   * Get the price of a resource
   * @param {string} resourceType - Resource type
   * @returns {number} Price of the resource
   */
  getResourcePrice(resourceType) {
    return this.prices.get(resourceType) || 0;
  }

  /**
   * Check if a ship can afford a certain amount of fuel
   * @param {Object} ship - Ship to check
   * @param {number} amount - Amount of fuel
   * @returns {boolean} Whether the ship can afford the fuel
   */
  canAffordFuel(ship, amount) {
    return ship.credits >= FUEL_PRICE * amount;
  }

  /**
   * Get the maximum amount of fuel a ship can afford
   * @param {Object} ship - Ship to check
   * @returns {number} Maximum amount of fuel
   */
  getMaxAffordableFuel(ship) {
    return Math.floor(ship.credits / FUEL_PRICE);
  }

  /**
   * Sell all cargo from a ship
   * @param {Object} ship - Ship selling cargo
   * @returns {number} Total value of sold cargo
   */
  sellAllCargo(ship) {
    let totalValue = 0;

    while (ship.cargo.length > 0) {
      const cargo = ship.cargo[0];
      totalValue += this.sellCargo(ship, cargo.type.name, cargo.amount);
    }

    return totalValue;
  }
}

// Create and export a singleton instance
const tradingSystem = new Trading();
export default tradingSystem;
