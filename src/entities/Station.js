import { GAME_CONFIG } from '../config/gameConfig.js';
import { Entity } from './Entity.js';

const SC = GAME_CONFIG.STATION;

export class Station extends Entity {
  constructor(x, y, type = 'trading', config = {}) {
    super(x, y);
    this.stationType = type; // 'trading', 'salvage', 'mining', 'bar', 'gang_hq'
    this.type = 'station';  // entity type for collision system
    this.radius = SC.RADIUS;
    this.width = SC.RADIUS * 2;
    this.height = SC.RADIUS * 2;
    this.active = true;
    this.rotation = 0;

    // Station identity
    this.stationId = config.id || 'station_unknown';
    this.stationName = config.name || 'Unknown Station';
    this.locked = config.locked || false;
    this.unlockRequirement = config.unlockRequirement || null;
    this.reward = config.reward || null;

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

    // Can't dock at locked stations
    if (this.locked) {
      this.dockingRequested = false;
      return false;
    }

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

      // Progressive pull — stronger as ship gets closer
      const pullStrength = this.magneticForce * (1 + (1 - dist / this.dockingRadius) * 2);

      // Dampen velocity aggressively and pull toward station
      if (ship.velocity) {
        ship.velocity = new ship.velocity.constructor(
          ship.velocity.x * 0.93 + nx * pullStrength,
          ship.velocity.y * 0.93 + ny * pullStrength
        );
      }

      // Auto-rotate ship to face station
      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - ship.rotation;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      ship.rotation += angleDiff * 0.05;
      ship.angle = ship.rotation;

      // Store beam data for rendering
      this._beamActive = true;
      this._beamTarget = { x: ship.x, y: ship.y };

      if (dist < 20 && speed < 0.3) {
        ship.x = this.x;
        ship.y = this.y;
        this.dockingSequenceActive = false;
        this._beamActive = false;
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

    // Tractor beam visual
    if (this._beamActive && this._beamTarget) {
      ctx.save();
      const pulse = 0.3 + Math.sin(Date.now() / 100) * 0.2;
      ctx.strokeStyle = `rgba(100, 255, 200, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this._beamTarget.x, this._beamTarget.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Glow at ship end
      ctx.fillStyle = `rgba(100, 255, 200, ${pulse * 0.5})`;
      ctx.beginPath();
      ctx.arc(this._beamTarget.x, this._beamTarget.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      this._beamActive = false;
    }

    // Station body
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Locked stations are dimmed
    if (this.locked) {
      ctx.globalAlpha = 0.4;
    }

    if (this.image) {
      const size = this.radius * 2.5;
      ctx.drawImage(this.image, -size / 2, -size / 2, size, size);
    } else {
      // Fallback procedural — color varies by type
      const typeColors = {
        trading: { fill: '#5588aa', stroke: '#88ccff', inner: '#336688', ports: '#88ccff' },
        salvage: { fill: '#887744', stroke: '#bbaa66', inner: '#665533', ports: '#ccbb77' },
        mining:  { fill: '#668844', stroke: '#88bb66', inner: '#446633', ports: '#aadd88' },
        bar:     { fill: '#885588', stroke: '#bb88bb', inner: '#664466', ports: '#dd99dd' },
        gang_hq: { fill: '#884444', stroke: '#bb6666', inner: '#663333', ports: '#dd8888' },
      };
      const c = typeColors[this.stationType] || typeColors.trading;

      ctx.fillStyle = c.fill;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c.stroke;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = c.inner;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Docking ports
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.fillStyle = c.ports;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * this.radius * 0.7, Math.sin(a) * this.radius * 0.7, this.radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    // Lock icon for locked stations
    if (this.locked) {
      ctx.fillStyle = '#f44';
      ctx.font = "bold 18px Arial";
      ctx.textAlign = 'center';
      ctx.fillText('🔒', this.x, this.y + 6);
    }

    // Station name label
    const labelColor = this.locked ? '#666' : '#0ff';
    ctx.fillStyle = labelColor;
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.stationName, this.x, this.y + this.radius + 20);

    // Type subtitle
    if (!this.locked) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '9px Arial';
      ctx.fillText(this.stationType.replace('_', ' ').toUpperCase(), this.x, this.y + this.radius + 33);
    }
  }
}
