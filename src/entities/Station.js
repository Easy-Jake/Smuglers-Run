import { GAME_CONFIG } from '../config/gameConfig.js';
import { Entity } from './Entity.js';

const SC = GAME_CONFIG.STATION;

export class Station extends Entity {
  constructor(x, y, type = 'trading') {
    super(x, y);
    this.stationType = type; // 'trading', 'military', etc.
    this.type = 'station';  // entity type for collision system
    this.radius = SC.RADIUS;
    this.width = SC.RADIUS * 2;
    this.height = SC.RADIUS * 2;
    this.active = true;
    this.rotation = 0;

    // Docking zones
    this.dockingRadius = SC.DOCKING_RADIUS;
    this.approachRadius = SC.APPROACH_RADIUS;
    this.safeZoneRadius = SC.SAFE_ZONE_RADIUS;
    this.maxDockingSpeed = SC.MAX_DOCKING_SPEED;
    this.dockingCooldown = SC.DOCKING_COOLDOWN;

    // Docking state
    this.shipInDockingZone = false;
    this.shipApproaching = false;
    this.shipTooFast = false;
    this.playerInSafeZone = false;
    this.dockingSequenceActive = false;
    this.dockingRequested = false;
    this.lastDockingAttempt = 0;

    // Tractor beam
    this.magneticForce = 0.05;

    // Station sprite image
    this.image = null;
    this._loadImage();

    // Trading config
    this.prices = { buy: GAME_CONFIG.TRADING.SELL_PRICE, sell: GAME_CONFIG.TRADING.BUY_PRICE };
    this.items = this._generateItems();
    this.services = this._generateServices();
  }

  _loadImage() {
    const img = new Image();
    img.src = GAME_CONFIG.ASSETS.STATION_IMAGE;
    img.onload = () => { this.image = img; };
  }

  _generateItems() {
    if (this.stationType !== 'trading') return [];
    return [
      { name: 'Common Minerals', buyPrice: 5, sellPrice: 3 },
      { name: 'Rare Metals', buyPrice: 15, sellPrice: 10 },
      { name: 'Exotic Matter', buyPrice: 30, sellPrice: 20 },
      { name: 'Medical Supplies', buyPrice: 20, sellPrice: 15 },
      { name: 'Food Rations', buyPrice: 8, sellPrice: 5 },
      { name: 'Luxury Goods', buyPrice: 40, sellPrice: 30 },
    ];
  }

  _generateServices() {
    return [
      { name: 'Hull Repair', price: 20, effect: 'health', amount: 25 },
      { name: 'Full Repair', price: 70, effect: 'health', amount: 100 },
      { name: 'Refuel', price: 30, effect: 'fuel', amount: 100 },
      { name: 'Cargo Expansion', price: 200, effect: 'maxCargoHold', amount: 50 },
      { name: 'Engine Upgrade', price: 150, effect: 'maxSpeed', amount: 1 },
      { name: 'Weapon Upgrade', price: 180, effect: 'weaponPower', amount: 0.5 },
    ];
  }

  update(deltaTime) {
    this.rotation += 0.001;
  }

  /**
   * Check if a ship can dock and manage docking sequence
   * @param {Object} ship - Player ship
   * @returns {boolean} true if docking completed this frame
   */
  checkDocking(ship) {
    const dx = this.x - ship.x;
    const dy = this.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.sqrt((ship.velocity?.x || 0) ** 2 + (ship.velocity?.y || 0) ** 2);

    // Update zone flags
    this.playerInSafeZone = dist < this.safeZoneRadius;
    this.shipApproaching = dist < this.approachRadius;
    this.shipInDockingZone = dist < this.dockingRadius;
    this.shipTooFast = speed > this.maxDockingSpeed;

    if (!this.shipInDockingZone) {
      this.dockingSequenceActive = false;
      return false;
    }

    if (this.shipTooFast && !this.dockingSequenceActive) {
      return false;
    }

    if (this.dockingRequested) {
      this.dockingSequenceActive = true;
      this.dockingRequested = false;
    }

    // Active docking — tractor beam pulls ship in
    if (this.dockingSequenceActive) {
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);

      // Dampen velocity and pull toward station
      if (ship.velocity) {
        ship.velocity = new ship.velocity.constructor(
          ship.velocity.x * 0.95 + nx * this.magneticForce,
          ship.velocity.y * 0.95 + ny * this.magneticForce
        );
      }

      if (dist < 20 && speed < 0.3) {
        ship.x = this.x;
        ship.y = this.y;
        this.dockingSequenceActive = false;
        this.lastDockingAttempt = Date.now();
        return true;
      }
    }

    return false;
  }

  render(ctx) {
    if (!this.active) return;

    // Safe zone indicator
    if (this.playerInSafeZone) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 170, 255, 0.3)';
      ctx.setLineDash([15, 10]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.safeZoneRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Approach zone
    if (this.shipApproaching) {
      ctx.save();
      ctx.strokeStyle = 'rgba(68, 170, 255, 0.5)';
      ctx.setLineDash([10, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.approachRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Docking zone
    if (this.shipInDockingZone) {
      ctx.save();
      ctx.strokeStyle = this.shipTooFast ? '#f77' : '#7f7';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.dockingRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Station body
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.image) {
      const size = this.radius * 2.5;
      ctx.drawImage(this.image, -size / 2, -size / 2, size, size);
    } else {
      // Fallback procedural
      ctx.fillStyle = '#5588aa';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#88ccff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#336688';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Docking ports
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.fillStyle = '#88ccff';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * this.radius * 0.7, Math.sin(a) * this.radius * 0.7, this.radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Label
    ctx.fillStyle = '#0ff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Trading Station', this.x, this.y + this.radius + 20);
  }
}
