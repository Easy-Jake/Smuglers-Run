import { FUEL_CELL_TYPES, FUEL_CELL_CAPACITIES } from '../../config/constants.js';
import { currentGalaxy } from '../../config/gameConfig.js';

export class ShipResourceComponent {
  constructor(ship) {
    this.ship = ship;
    
    // Cargo and Resources
    this.mass = 100;
    this.cargo = [];
    this.cargoCapacity = 50;
    this.currentCargoSpace = 0;
    this.credits = 100;

    // Fuel System
    this.fuelCellType = FUEL_CELL_TYPES.SMALL;
    this.maxFuel = FUEL_CELL_CAPACITIES[this.fuelCellType] || 100;
    this.fuel = this.maxFuel;
    this.fuelEfficiency = 1.0;
    this.fuelCellColor = '#00ff00'; // Default green

    // Galaxy Jump Capability
    this.jumpRange = 0;
    this.jumpCooldown = 0;
    this.currentGalaxy = currentGalaxy;
  }

  update() {
    if (!this.ship.isAlive) return;

    // Handle cooldowns
    if (this.jumpCooldown > 0) this.jumpCooldown--;
  }

  addCargo(item) {
    if (this.currentCargoSpace + item.size <= this.cargoCapacity) {
      this.cargo.push(item);
      this.currentCargoSpace += item.size;
      this.mass += item.mass || 0;
      return true;
    }
    return false;
  }

  removeCargo(item) {
    const index = this.cargo.indexOf(item);
    if (index !== -1) {
      this.cargo.splice(index, 1);
      this.currentCargoSpace -= item.size;
      this.mass -= item.mass || 0;
      return true;
    }
    return false;
  }

  addCredits(amount) {
    this.credits += amount;
  }

  removeCredits(amount) {
    if (this.credits >= amount) {
      this.credits -= amount;
      return true;
    }
    return false;
  }

  addFuel(amount) {
    this.fuel = Math.min(this.maxFuel, this.fuel + amount);
  }

  removeFuel(amount) {
    if (this.fuel >= amount) {
      this.fuel -= amount;
      return true;
    }
    return false;
  }

  setFuelCellType(type) {
    this.fuelCellType = type;
    this.maxFuel = FUEL_CELL_CAPACITIES[type] || 100;
    this.fuel = Math.min(this.fuel, this.maxFuel);
  }

  setFuelEfficiency(efficiency) {
    this.fuelEfficiency = efficiency;
  }

  setJumpRange(range) {
    this.jumpRange = range;
  }

  setJumpCooldown(cooldown) {
    this.jumpCooldown = cooldown;
  }

  canJump() {
    return this.jumpCooldown <= 0 && this.fuel >= this.jumpRange;
  }

  jump() {
    if (this.canJump()) {
      this.fuel -= this.jumpRange;
      this.jumpCooldown = 60; // 1 second cooldown
      return true;
    }
    return false;
  }

  getCargoSpace() {
    return this.cargoCapacity - this.currentCargoSpace;
  }

  getFuelPercentage() {
    return (this.fuel / this.maxFuel) * 100;
  }
} 