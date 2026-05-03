import { GAME_CONFIG } from '../config/gameConfig.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { PerformanceOptimizer } from '../utils/PerformanceOptimizer.js';
import { EventTypes } from '../ecs/events/EventTypes.js';
import { CollisionHandler } from './CollisionHandler.js';
import { ZONES, RESOURCE_TYPES } from '../config/mapLayout.js';
import { startMusic, toggleMute } from '../audio/SoundEngine.js';
import * as TradingConfig from '../config/tradingConfig.js';

/**
 * Manages the main game loop with fixed timestep
 */
export class GameLoop {
  /**
   * Create a new game loop
   * @param {Object} services - Game services
   * @param {GameState} gameState - Game state
   */
  constructor(services, gameState) {
    this.services = services;
    this.gameState = gameState;
    gameState._gameLoop = this; // back-reference for screen shake

    // Timing variables
    this.lastTime = 0;
    this.accumulator = 0;
    this.timeStep = 1000 / GAME_CONFIG.fps;
    this.frameCount = 0;
    
    // Loop state
    this.isRunning = false;
    this.isInitialized = false;
    
    // Performance monitoring
    this.performanceMonitor = new PerformanceMonitor();
    this.performanceOptimizer = new PerformanceOptimizer();

    // Collision handler
    this.collisionHandler = new CollisionHandler(services, gameState);

    // Audio starts muted
    this._isMuted = true;

    // Bind methods for callbacks
    this.update = this.update.bind(this);
  }

  /**
   * Initialize the game loop
   * @returns {Promise<void>}
   */
  async initialize() {
    // Verify required services are available
    const requiredServices = ['renderManager', 'canvasManager', 'eventSystem'];
    for (const serviceName of requiredServices) {
      if (!this.services[serviceName]) {
        throw new Error(`GameLoop: Required service ${serviceName} is not available`);
      }
    }

    // Wait for render manager to be ready
    if (this.services.renderManager.initialize) {
      await this.services.renderManager.initialize();
    }

    // Wire up mouse click for trading UI
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.addEventListener('click', (e) => {
        if (!this.gameState.tradingActive) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        this.handleTradeClick(mouseX, mouseY);
      });
    }

    this.isInitialized = true;
  }

  /**
   * Start the game loop
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRunning) return;

    if (!this.isInitialized) {
      await this.initialize();
    }

    // Start background music
    startMusic();
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.performanceMonitor.start();
    
    // Notify game loop starting
    this.services.eventSystem.emit(EventTypes.GAME_LOOP_STARTED, {
      timestamp: this.lastTime
    });
    
    // Begin the loop
    requestAnimationFrame(this.update);
  }

  /**
   * Stop the game loop
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.performanceMonitor.stop();
    
    // Notify game loop stopped
    this.services.eventSystem.emit(EventTypes.GAME_LOOP_STOPPED, {
      timestamp: performance.now(),
      totalFrames: this.frameCount
    });
  }

  /**
   * Main update function called by requestAnimationFrame
   * @param {number} currentTime - Current timestamp
   */
  update(currentTime) {
    if (!this.isRunning) return;

    try {
      // Start frame timing
      this.performanceMonitor.beginFrame();

      // Calculate delta time
      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;

      // Cap delta time to prevent spiral of death on slow devices
      const cappedDeltaTime = Math.min(deltaTime, GAME_CONFIG.maxDeltaTime);

      // Accumulate time for fixed timestep
      this.accumulator += cappedDeltaTime;

      // Process input first
      this.processInput();

      // Update game state at fixed time step
      this.performanceMonitor.beginPhase('update');
      while (this.accumulator >= this.timeStep) {
        this.fixedUpdate(this.timeStep / 1000); // Convert to seconds
        this.accumulator -= this.timeStep;
      }
      this.performanceMonitor.endPhase('update');

      // Check for collisions
      this.performanceMonitor.beginPhase('collisions');
      this.checkCollisions();
      this.performanceMonitor.endPhase('collisions');

      // Render frame with interpolation
      this.performanceMonitor.beginPhase('render');
      const alpha = this.accumulator / this.timeStep;
      this.render(alpha);
      this.performanceMonitor.endPhase('render');

      // End frame timing
      this.performanceMonitor.endFrame();
      this.frameCount++;

      // Apply performance optimizations if needed
      if (this.frameCount % 60 === 0) {
        this.checkPerformance();
      }
    } catch (err) {
      console.error('GameLoop: update error', err);
    }

    // Continue game loop
    requestAnimationFrame(this.update);
  }

  /**
   * Fixed timestep update
   * @param {number} deltaTime - Time step in seconds
   * @private
   */
  fixedUpdate(deltaTime) {
    if (this.gameState.isPaused || this.gameState.isGameOver) return;

    // Update game state
    this.gameState.update(deltaTime);

    // Check station docking & update zone flags
    const player = this.gameState.player;
    if (player) {
      for (const station of this.gameState.stations) {
        if (player.isDocked || player.isUndocking) {
          // Just update zone flags without attempting dock
          const dx = station.x - player.x;
          const dy = station.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          station.playerInSafeZone = dist < station.safeZoneRadius;
          station.shipApproaching = dist < station.approachRadius;
          station.shipInDockingZone = dist < station.dockingRadius;
        } else if (station.checkDocking(player)) {
          // Docking completed
          player.isDocked = true;
          this.gameState.currentStation = station;
          this.gameState.tradingActive = true;
        }
      }
    }

    // Auto-collect resources near player
    if (player && this.gameState.resources) {
      for (const resource of this.gameState.resources) {
        if (!resource.active) continue;
        const dx = player.x - resource.x;
        const dy = player.y - resource.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.resourcePickupRange) {
          const added = player.addResources(1, resource.resourceType || 'carbon');
          if (added > 0) {
            this.gameState.score += resource.value;
            resource.active = false;
            import('../audio/SoundEngine.js').then(m => m.playSFX('pickup'));
          }
        }
      }
    }
  }

  /**
   * Process player input
   * @private
   */
  processInput() {
    if (this.gameState.isGameOver) return;
    if (!this.services.inputManager) return;

    const im = this.services.inputManager;
    const player = this.gameState.player;

    // Escape key — close overlays or pause
    if (im.isKeyPressed('Escape') && !this._escHeld) {
      this._escHeld = true;
      if (this._showFullMap) {
        this._showFullMap = false;
      } else if (this._showDebug) {
        this._showDebug = false;
      } else if (this.gameState.tradingActive) {
        this._closeTrade();
      } else {
        this.gameState.pauseGame();
      }
    }
    if (!im.isKeyPressed('Escape')) this._escHeld = false;

    // Tab key — full map toggle (prevent browser default)
    if (im.isKeyPressed('Tab') && !this._tabHeld) {
      this._tabHeld = true;
      this._showFullMap = !this._showFullMap;
    }
    if (!im.isKeyPressed('Tab')) this._tabHeld = false;

    // D key — debug overlay toggle
    if (im.isKeyPressed('d') && !this._dHeld && !this.gameState.tradingActive) {
      this._dHeld = true;
      this._showDebug = !this._showDebug;
    }
    if (!im.isKeyPressed('d') && !im.isKeyPressed('D')) this._dHeld = false;

    if (this.gameState.isPaused) return;

    // If trading UI is open, block game input
    if (this.gameState.tradingActive) return;

    if (!player) return;

    // E key — dock/undock toggle
    const ePressed = im.isKeyPressed('e') || im.isKeyPressed('E');
    if (ePressed && !this._eHeld) {
      this._eHeld = true;
      if (player.isDocked) {
        // Undock
        const station = this.gameState.currentStation;
        if (station) {
          player.startUndocking(station);
          this.gameState.tradingActive = false;
          this.gameState.currentStation = null;
        }
      } else if (!player.isUndocking) {
        // Request docking at nearest station
        for (const station of this.gameState.stations) {
          station.dockingRequested = true;
        }
      }
    }
    if (!im.isKeyPressed('e') && !im.isKeyPressed('E')) this._eHeld = false;

    // X key or Backspace — Kill Switch (toggle all power)
    const xPressed = im.isKeyPressed('x') || im.isKeyPressed('X') || im.isKeyPressed('Backspace');
    if (xPressed && !this._xHeld) {
      this._xHeld = true;
      player.togglePower();
    }
    if (!im.isKeyPressed('x') && !im.isKeyPressed('X') && !im.isKeyPressed('Backspace')) this._xHeld = false;

    // Power allocation keys: T/F/G then 0-9
    const powerKeys = ['t','T','f','F','g','G','0','1','2','3','4','5','6','7','8','9'];
    for (const pk of powerKeys) {
      if (im.isKeyPressed(pk) && !this['_powerKey_' + pk]) {
        this['_powerKey_' + pk] = true;
        player.powerSystem?.processKey(pk);
      }
      if (!im.isKeyPressed(pk)) this['_powerKey_' + pk] = false;
    }

    // Rotation + Thrust controls (Asteroids-style)
    // M key — mute toggle
    const mPressed = im.isKeyPressed('m') || im.isKeyPressed('M');
    if (mPressed && !this._mHeld) {
      this._mHeld = true;
      this._isMuted = toggleMute();
    }
    if (!im.isKeyPressed('m') && !im.isKeyPressed('M')) this._mHeld = false;

    // Movement
    const rotateLeft  = im.isKeyPressed('ArrowLeft')  || im.isKeyPressed('a');
    const rotateRight = im.isKeyPressed('ArrowRight') || im.isKeyPressed('d');
    const thrust      = im.isKeyPressed('ArrowUp')    || im.isKeyPressed('w');
    const reverse     = im.isKeyPressed('ArrowDown')  || im.isKeyPressed('s');
    const boost       = im.isKeyPressed('Shift');
    const jump        = im.isKeyPressed('q');
    const space       = im.isKeyPressed(' ');

    if (rotateLeft || rotateRight || thrust || reverse || boost || jump) {
      player.move({ rotateLeft, rotateRight, thrust, reverse, boost, jump });
    }

    if (space && player.shootCooldown <= 0) {
      player.shoot(this.gameState);
    }

    // Update gamepad state after reading keys
    if (typeof im.update === 'function') {
      try {
        im.update();
      } catch (error) {
        console.warn('GameLoop: Error updating input manager', error);
      }
    }
  }

  /**
   * Check for collisions between game objects
   * @private
   */
  checkCollisions() {
    if (this.gameState.isPaused || this.gameState.isGameOver) return;

    // Run the full collision handler (spatial partitioning + response)
    this.collisionHandler.update(0);
  }

  /**
   * Render the game state
   * @param {number} interpolation - Interpolation factor between frames
   * @private
   */
  render(interpolation) {
    if (!this.services.renderManager || !this.services.canvasManager) {
      console.warn('GameLoop: Required rendering services not available');
      return;
    }

    try {
      const ctx = this.services.canvasManager.getContext();
      if (!ctx) return;

      const canvas = this.services.canvasManager.getCanvas();
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Fill background
      ctx.fillStyle = '#0a0a2e';
      ctx.fillRect(0, 0, width, height);

      const cam = this.gameState.camera;

      // Screen shake
      if (!this._shakeIntensity) this._shakeIntensity = 0;
      if (this._shakeIntensity > 0.1) {
        this._shakeIntensity *= 0.9; // decay
      } else {
        this._shakeIntensity = 0;
      }

      ctx.save();
      const shakeX = this._shakeIntensity ? (Math.random() - 0.5) * this._shakeIntensity : 0;
      const shakeY = this._shakeIntensity ? (Math.random() - 0.5) * this._shakeIntensity : 0;
      ctx.translate(-cam.x + shakeX, -cam.y + shakeY);

      // Draw stars
      ctx.fillStyle = '#ffffff';
      if (this.gameState.stars) {
        for (const star of this.gameState.stars) {
          ctx.globalAlpha = star.brightness || 0.8;
          ctx.fillRect(star.x, star.y, star.size || 1, star.size || 1);
        }
      }
      ctx.globalAlpha = 1;

      // Draw game objects
      const drawEntity = (entity) => {
        if (!entity || !entity.active) return;
        if (typeof entity.render === 'function') {
          entity.render(ctx);
        } else if (typeof entity.draw === 'function') {
          entity.draw(ctx, cam.x, cam.y);
        }
      };

      this.gameState.stations.forEach(drawEntity);
      this.gameState.cargoItems.forEach(drawEntity);
      if (this.gameState.resources) this.gameState.resources.forEach(drawEntity);
      this.gameState.asteroids.forEach(drawEntity);
      this.gameState.enemies.forEach(drawEntity);
      this.gameState.projectiles.forEach(drawEntity);
      this.gameState.particles.forEach(drawEntity);

      // Draw player
      if (this.gameState.player) {
        drawEntity(this.gameState.player);
      }

      ctx.restore();

      // Draw HUD
      this.renderHUD(ctx, width, height);

      // Draw trading UI if docked
      if (this.gameState.tradingActive && this.gameState.currentStation) {
        this.renderTradingUI(ctx, width, height);
      }

      // Draw docking prompt
      if (!this.gameState.tradingActive && this.gameState.player) {
        this._renderDockingPrompt(ctx, width, height);
      }

      // Draw kill switch indicator
      if (this.gameState.player?.isPowered && !this.gameState.player.isPowered()) {
        this._renderKillSwitchHUD(ctx, width, height);
      }

      // Draw minimap (top-right area, below Map Exploration)
      this._renderMinimap(ctx, width, height);

      // Draw power system HUD (bottom-right)
      if (this.gameState.player?.powerSystem) {
        this._renderPowerHUD(ctx, width, height);
      }

      // Full map overlay (Tab)
      if (this._showFullMap) {
        this._renderFullMap(ctx, width, height);
      }

      // Debug overlay (D)
      if (this._showDebug) {
        this._renderDebug(ctx, width, height);
      }
    } catch (error) {
      console.error('GameLoop: Error during rendering:', error);
    }
  }

  /**
   * Render the HUD overlay
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   * @private
   */
  renderHUD(ctx, width, height) {
    // Update HTML HUD elements with both text and progress bars
    const gs = this.gameState;
    const player = gs.player;

    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    const setBar = (id, label, value, max) => {
      const el = document.getElementById(id);
      if (!el) return;
      const pct = Math.max(0, Math.min(100, (value / max) * 100));
      el.style.setProperty('--value', `${pct}%`);
      el.setAttribute('data-value', `${label} ${Math.floor(value)}/${max}`);
    };

    setText('score', `Score: ${gs.score}`);
    setBar('health', 'HULL', player?.health || gs.health, player?.maxHealth || 100);
    setBar('fuel', 'ENERGY', player?.energy || 0, player?.maxEnergy || 100);
    setText('cargo', `Cargo: ${player?.resources || 0}/${player?.cargoCapacity || 20}`);
    setText('credits', `Credits: ${gs.credits}`);

    // Mute indicator (top center)
    if (this._isMuted) {
      ctx.fillStyle = 'rgba(255, 100, 100, 0.7)';
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('MUTED [M]', width / 2, 20);
      ctx.textAlign = 'left';
    }
  }

  /**
   * Show docking prompt when near a station
   * @private
   */
  _renderDockingPrompt(ctx, width, height) {
    const player = this.gameState.player;
    if (!player || player.isDocked) return;

    for (const station of this.gameState.stations) {
      const name = station.stationName || 'Station';

      if (station.locked && station.shipApproaching) {
        // Locked station — show lock message
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(width / 2 - 160, height - 70, 320, 50);
        ctx.fillStyle = '#f44';
        ctx.font = "bold 13px Arial";
        ctx.textAlign = 'center';
        ctx.fillText(`🔒 ${name}`, width / 2, height - 50);
        ctx.fillStyle = '#a88';
        ctx.font = '11px Arial';
        const req = station.unlockRequirement;
        ctx.fillText(req ? `Requires: ${req.replace('_', ' ')}` : 'LOCKED', width / 2, height - 33);
      } else if (station.shipInDockingZone && !station.shipTooFast && !station.locked) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(width / 2 - 140, height - 65, 280, 45);
        ctx.fillStyle = '#7f7';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(name, width / 2, height - 46);
        ctx.font = '12px Arial';
        ctx.fillText('Press E to Dock', width / 2, height - 28);
      } else if (station.shipInDockingZone && station.shipTooFast && !station.locked) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(width / 2 - 140, height - 65, 280, 45);
        ctx.fillStyle = '#f77';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(name, width / 2, height - 46);
        ctx.font = '12px Arial';
        ctx.fillText('Too Fast — Slow Down', width / 2, height - 28);
      } else if (station.shipApproaching && !station.locked) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(width / 2 - 120, height - 55, 240, 35);
        ctx.fillStyle = '#4af';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Approaching ${name}`, width / 2, height - 33);
      }
    }
  }

  /**
   * Render kill switch / systems offline overlay
   * @private
   */
  _renderKillSwitchHUD(ctx, width, height) {
    // Pulsing "SYSTEMS OFFLINE" warning
    const pulse = 0.4 + Math.sin(Date.now() / 500) * 0.3;

    // Dark vignette border to sell the "going dark" feel
    const grad = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${0.3 * pulse})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // "SYSTEMS OFFLINE" text
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#f44';
    ctx.font = "bold 20px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('SYSTEMS OFFLINE', width / 2, 80);

    // Subtitle
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillStyle = '#f88';
    ctx.fillText('RUNNING DARK — PRESS X TO RESTORE', width / 2, 105);
    ctx.restore();
  }

  /**
   * Render power system HUD — shows allocation bars + heat for each subsystem
   * @private
   */
  /**
   * Render minimap showing player position, station, and asteroids on the world
   * @private
   */
  _renderMinimap(ctx, width, height) {
    const gs = this.gameState;
    const p = gs.player;
    if (!p) return;

    const mapSize = 150;
    const mx = width - mapSize - 10;
    const my = 130; // below Map Exploration widget
    const worldW = GAME_CONFIG.WORLD.WIDTH;
    const worldH = GAME_CONFIG.WORLD.HEIGHT;
    const scaleX = mapSize / worldW;
    const scaleY = mapSize / worldH;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 20, 0.7)';
    ctx.strokeStyle = 'rgba(100, 100, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.fillRect(mx, my, mapSize, mapSize);
    ctx.strokeRect(mx, my, mapSize, mapSize);

    // Grid lines (every 2000 units)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    for (let g = 2000; g < worldW; g += 2000) {
      const gx = mx + g * scaleX;
      const gy = my + g * scaleY;
      ctx.beginPath(); ctx.moveTo(gx, my); ctx.lineTo(gx, my + mapSize); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx, gy); ctx.lineTo(mx + mapSize, gy); ctx.stroke();
    }

    // Zone boundaries
    const zoneColors = {
      0: 'rgba(0, 255, 0, 0.2)',    // free — green
      1: 'rgba(255, 255, 0, 0.15)', // low — yellow
      2: 'rgba(255, 165, 0, 0.15)', // medium — orange
      3: 'rgba(255, 0, 0, 0.15)',   // hard — red
      4: 'rgba(128, 0, 255, 0.2)',  // boss — purple
    };
    for (const [, zone] of Object.entries(ZONES)) {
      const zx = mx + zone.center.x * scaleX;
      const zy = my + zone.center.y * scaleY;
      const zr = zone.radius * scaleX;
      ctx.strokeStyle = zoneColors[zone.tier] || 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(zx, zy, zr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Asteroids (tiny gray dots)
    ctx.fillStyle = 'rgba(150, 130, 100, 0.5)';
    for (const a of gs.asteroids) {
      if (!a.active) continue;
      const ax = mx + a.x * scaleX;
      const ay = my + a.y * scaleY;
      const ar = Math.max(1, a.radius * scaleX);
      ctx.fillRect(ax - ar/2, ay - ar/2, ar, ar);
    }

    // Resources (light blue dots)
    if (gs.resources) {
      ctx.fillStyle = '#4ff';
      for (const r of gs.resources) {
        if (!r.active) continue;
        const rx = mx + r.x * scaleX;
        const ry = my + r.y * scaleY;
        ctx.fillRect(rx - 1, ry - 1, 2, 2);
      }
    }

    // Station (cyan square)
    for (const s of gs.stations) {
      const sx = mx + s.x * scaleX;
      const sy = my + s.y * scaleY;
      ctx.fillStyle = '#0ff';
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
    }

    // Enemies (red dots)
    if (gs.enemies) {
      for (const e of gs.enemies) {
        if (!e.active) continue;
        const ex = mx + e.x * scaleX;
        const ey = my + e.y * scaleY;
        ctx.fillStyle = e.state === 'chase' || e.state === 'attack' ? '#f00' : '#a44';
        ctx.beginPath();
        ctx.arc(ex, ey, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player (bright green dot)
    const px = mx + p.x * scaleX;
    const py = my + p.y * scaleY;
    ctx.fillStyle = '#0f0';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();

    // Player direction indicator
    const dirLen = 8;
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(p.rotation) * dirLen, py + Math.sin(p.rotation) * dirLen);
    ctx.stroke();

    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(p.x)}, ${Math.round(p.y)}`, mx + mapSize - 2, my + mapSize - 3);
    ctx.textAlign = 'left';
  }

  /**
   * Render power system HUD — shows allocation bars + heat for each subsystem
   * @private
   */
  _renderPowerHUD(ctx, width, height) {
    const ps = this.gameState.player.powerSystem;
    const systems = [
      { key: 'engines',    label: 'ENG', color: '#4af', accent: '#7cf' },
      { key: 'weapons',    label: 'WPN', color: '#fa4', accent: '#fc7' },
      { key: 'stabilizer', label: 'STB', color: '#4f4', accent: '#7f7' },
    ];

    // Vertical thermometers on left side
    const thermW = 26;
    const thermH = 200;
    const startY = 280; // below top-left HUD
    const startX = 12;
    const gap = 4;

    systems.forEach((sys, i) => {
      const x = startX + i * (thermW + gap);
      const y = startY;
      const alloc = ps.allocation[sys.key];
      const heat = ps.heat[sys.key];
      const status = ps.status[sys.key];
      const sysHealth = ps.systemHealth[sys.key];

      // Label at top
      ctx.fillStyle = status === 'nominal' ? sys.color : '#f44';
      ctx.font = "bold 9px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(sys.label, x + thermW / 2, y - 6);

      // Allocation % below label
      ctx.fillStyle = '#aaa';
      ctx.font = '9px monospace';
      ctx.fillText(`${alloc * 10}%`, x + thermW / 2, y + thermH + 14);

      // Outer thermometer body (rounded rect look)
      ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';
      ctx.fillRect(x, y, thermW, thermH);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, thermW, thermH);

      // Heat fill (from bottom up)
      const heatPct = Math.min(1, heat / 100);
      const fillH = thermH * heatPct;
      let heatColor = '#4CAF50';
      if (heat > 50) heatColor = '#FFEB3B';
      if (heat > 75) heatColor = '#FF9800';
      if (heat > 85) heatColor = '#F44336';
      if (heat > 95) heatColor = '#9C27B0';
      ctx.fillStyle = heatColor;
      ctx.fillRect(x + 2, y + thermH - fillH + 2, thermW - 4, fillH - 4);

      // Redline marker at 85%
      const redlineY = y + thermH - thermH * 0.85;
      ctx.strokeStyle = '#f00';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, redlineY);
      ctx.lineTo(x + thermW, redlineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Power allocation indicator on right edge of thermometer
      const allocY = y + thermH - thermH * (alloc / 9);
      ctx.fillStyle = sys.accent;
      ctx.fillRect(x + thermW, allocY - 2, 4, 4);

      // System damage bar at bottom
      if (sysHealth < 100) {
        const dmgY = y + thermH + 18;
        ctx.fillStyle = '#400';
        ctx.fillRect(x, dmgY, thermW, 3);
        ctx.fillStyle = sysHealth < 30 ? '#f44' : sysHealth < 60 ? '#fa4' : '#ff4';
        ctx.fillRect(x, dmgY, thermW * (sysHealth / 100), 3);
      }

      // Status indicator below
      if (status !== 'nominal') {
        ctx.fillStyle = '#f44';
        ctx.font = '8px monospace';
        const statusShort = status === 'minor_failure' ? 'MIN'
          : status === 'major_failure' ? 'MAJ'
          : status === 'critical_failure' ? 'CRIT' : '';
        ctx.fillText(statusShort, x + thermW / 2, y + thermH + 30);
      }
    });

    ctx.textAlign = 'left';

    // OXYGEN METER (only when relevant — power off or O2 < 100)
    if (ps.oxygenLevel < 100 || !ps.isPowered()) {
      const oxR = startX + 3 * (thermW + gap) + 8;
      const oxY = startY;
      const oxW = 20;
      const oxH = thermH;

      // Label
      ctx.fillStyle = ps.oxygenLevel < 30 ? '#f44' : '#4ff';
      ctx.font = "bold 8px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('O₂', oxR + oxW / 2, oxY - 6);

      // Tank
      ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';
      ctx.fillRect(oxR, oxY, oxW, oxH);
      ctx.strokeStyle = '#444';
      ctx.strokeRect(oxR, oxY, oxW, oxH);

      // Fill
      const oxPct = ps.oxygenLevel / 100;
      const oxFillH = oxH * oxPct;
      let oxColor = '#4ff';
      if (ps.oxygenLevel < 70) oxColor = '#ff4';
      if (ps.oxygenLevel < 30) oxColor = '#f44';
      ctx.fillStyle = oxColor;
      ctx.fillRect(oxR + 2, oxY + oxH - oxFillH + 2, oxW - 4, oxFillH - 4);

      // Percentage
      ctx.fillStyle = '#aaa';
      ctx.font = '9px monospace';
      ctx.fillText(`${Math.round(ps.oxygenLevel)}%`, oxR + oxW / 2, oxY + oxH + 14);
      ctx.textAlign = 'left';
    }

    // === HEAT WARNING (center top) ===
    let warningSystem = null;
    let maxHeat = 0;
    for (const sys of systems) {
      if (ps.heat[sys.key] > maxHeat) {
        maxHeat = ps.heat[sys.key];
        warningSystem = sys;
      }
    }
    if (maxHeat > 85 && warningSystem) {
      const pulse = 0.4 + Math.sin(Date.now() / 200) * 0.4;
      ctx.fillStyle = `rgba(255, 0, 0, ${pulse * 0.6})`;
      ctx.fillRect(width / 2 - 140, 10, 280, 28);
      ctx.fillStyle = '#fff';
      ctx.font = "bold 12px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(`⚠ ${warningSystem.label} OVERHEATING`, width / 2, 28);
      ctx.textAlign = 'left';
    }

    // === SYSTEM FAILURE BANNER ===
    for (const sys of systems) {
      if (ps.status[sys.key] !== 'nominal') {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(width / 2 - 160, 45, 320, 24);
        ctx.fillStyle = '#fff';
        ctx.font = "bold 11px 'Press Start 2P', monospace";
        ctx.textAlign = 'center';
        const tier = ps.status[sys.key].replace('_failure', '').toUpperCase();
        ctx.fillText(`${sys.label} ${tier} FAILURE`, width / 2, 61);
        ctx.textAlign = 'left';
        break;
      }
    }

    // Power allocation key hint
    if (ps.selectedSystem) {
      ctx.fillStyle = '#ff0';
      ctx.font = "12px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(`${ps.selectedSystem.toUpperCase()}: press 0-9`, width / 2, height - 100);
      ctx.textAlign = 'left';
    }

    // === SUFFOCATION WARNING ===
    if (ps.graceTimer > 0) {
      const remaining = Math.max(0, 7 - ps.graceTimer).toFixed(1);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.fillRect(width / 2 - 200, height / 2 - 30, 400, 60);
      ctx.fillStyle = '#fff';
      ctx.font = "bold 16px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('SUFFOCATING', width / 2, height / 2);
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.fillText(`${remaining}s — RESTORE POWER`, width / 2, height / 2 + 18);
      ctx.textAlign = 'left';
    }
  }

  /**
   * Close trading UI
   * @private
   */
  /**
   * Render full-screen map overlay (Tab key)
   */
  _renderFullMap(ctx, width, height) {
    const gs = this.gameState;
    const p = gs.player;
    if (!p) return;

    // Darken background
    ctx.fillStyle = 'rgba(0, 0, 10, 0.85)';
    ctx.fillRect(0, 0, width, height);

    const padding = 40;
    const mapW = width - padding * 2;
    const mapH = height - padding * 2;
    const worldW = GAME_CONFIG.WORLD.WIDTH;
    const worldH = GAME_CONFIG.WORLD.HEIGHT;
    const scale = Math.min(mapW / worldW, mapH / worldH);
    const ox = (width - worldW * scale) / 2;
    const oy = (height - worldH * scale) / 2;

    // Map border
    ctx.strokeStyle = '#335';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, worldW * scale, worldH * scale);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let g = 2000; g < worldW; g += 2000) {
      ctx.beginPath(); ctx.moveTo(ox + g * scale, oy); ctx.lineTo(ox + g * scale, oy + worldH * scale); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, oy + g * scale); ctx.lineTo(ox + worldW * scale, oy + g * scale); ctx.stroke();
    }

    // Zone circles with labels
    const zoneColors = { 0: '#0f04', 1: '#ff04', 2: '#f804', 3: '#f004', 4: '#80f4' };
    for (const [, zone] of Object.entries(ZONES)) {
      const zx = ox + zone.center.x * scale;
      const zy = oy + zone.center.y * scale;
      const zr = zone.radius * scale;

      // Fill
      ctx.fillStyle = zoneColors[zone.tier] || '#fff1';
      ctx.beginPath();
      ctx.arc(zx, zy, zr, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = zoneColors[zone.tier]?.replace('4', '8') || '#fff3';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(zone.name, zx, zy - zr - 5);
    }

    // Asteroids
    ctx.fillStyle = 'rgba(150, 130, 100, 0.3)';
    for (const a of gs.asteroids) {
      if (!a.active) continue;
      ctx.fillRect(ox + a.x * scale - 1, oy + a.y * scale - 1, 2, 2);
    }

    // Stations
    for (const s of gs.stations) {
      const sx = ox + s.x * scale;
      const sy = oy + s.y * scale;
      ctx.fillStyle = s.locked ? '#666' : '#0ff';
      ctx.fillRect(sx - 4, sy - 4, 8, 8);
      ctx.fillStyle = s.locked ? '#555' : '#0ff';
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(s.stationName, sx, sy + 12);
    }

    // Enemies
    for (const e of (gs.enemies || [])) {
      if (!e.active) continue;
      ctx.fillStyle = e.state === 'chase' || e.state === 'attack' ? '#f00' : '#a44';
      ctx.fillRect(ox + e.x * scale - 2, oy + e.y * scale - 2, 4, 4);
    }

    // Player
    const px = ox + p.x * scale;
    const py = oy + p.y * scale;
    ctx.fillStyle = '#0f0';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(p.rotation) * 12, py + Math.sin(p.rotation) * 12);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#4af';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SYSTEM MAP — Press Tab to close', width / 2, 25);
    ctx.textAlign = 'left';
  }

  /**
   * Render debug overlay (D key)
   */
  _renderDebug(ctx, width, height) {
    const gs = this.gameState;
    const p = gs.player;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, height - 200, 280, 190);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(10, height - 200, 280, 190);

    ctx.fillStyle = '#0f0';
    ctx.font = '11px monospace';
    let y = height - 185;
    const line = (text) => { ctx.fillText(text, 20, y); y += 16; };

    line(`FPS: ${Math.round(1000 / (this.timeStep || 16.67))}`);
    line(`Pos: ${Math.round(p?.x || 0)}, ${Math.round(p?.y || 0)}`);
    line(`Vel: ${p?.velocity ? p.velocity.x.toFixed(2) + ', ' + p.velocity.y.toFixed(2) : '0,0'}`);
    line(`Speed: ${p?.velocity ? Math.sqrt(p.velocity.x**2 + p.velocity.y**2).toFixed(2) : '0'}`);
    line(`Energy: ${Math.floor(p?.energy || 0)}/${p?.maxEnergy || 0}`);
    line(`Asteroids: ${gs.asteroids?.filter(a => a.active).length || 0}/${gs.asteroids?.length || 0}`);
    line(`Enemies: ${gs.enemies?.filter(e => e.active).length || 0}/${gs.enemies?.length || 0}`);
    line(`Projectiles: ${gs.projectiles?.filter(pr => pr.active).length || 0}`);
    line(`Resources: ${gs.resources?.filter(r => r.active).length || 0}`);
    line(`Power: ${p?.powerSystem?.powerState || '?'} | O2: ${Math.round(p?.powerSystem?.oxygenLevel || 0)}%`);

    ctx.fillStyle = '#888';
    ctx.font = '9px monospace';
    ctx.fillText('Press D to close', 20, height - 15);
  }

  _closeTrade() {
    const player = this.gameState.player;
    const station = this.gameState.currentStation;
    if (player && station) {
      player.startUndocking(station);
    }
    this.gameState.tradingActive = false;
    this.gameState.currentStation = null;
  }

  /**
   * Render the trading interface on canvas
   * Uses dynamic upgrade formulas from tradingConfig.js
   * @private
   */
  renderTradingUI(ctx, width, height) {
    const player = this.gameState.player;
    const station = this.gameState.currentStation;
    if (!player || !station) return;

    const TC = TradingConfig;
    const RT = RESOURCE_TYPES;

    const panelW = 560;
    const panelH = 520;
    const px = (width - panelW) / 2;
    const py = (height - panelH) / 2;

    // Panel background
    ctx.fillStyle = 'rgba(0, 0, 20, 0.92)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#4af';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, panelW, panelH);

    // Header — station name
    ctx.fillStyle = '#0ff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(station.stationName || 'Trading Station', px + panelW / 2, py + 25);
    ctx.font = '10px Arial';
    ctx.fillStyle = '#4af';
    ctx.fillText(station.stationType?.replace('_', ' ').toUpperCase() || '', px + panelW / 2, py + 40);

    // Player stats bar
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff0';
    ctx.fillText(`💰 ${player.credits}`, px + 15, py + 60);
    ctx.fillStyle = '#4f4';
    ctx.fillText(`⚡ ${Math.floor(player.energy)}/${player.maxEnergy}`, px + 130, py + 60);
    ctx.fillStyle = '#8bf';
    ctx.fillText(`📦 ${player.resources}/${player.cargoCapacity}`, px + 280, py + 60);
    ctx.fillStyle = '#f88';
    ctx.fillText(`❤️ ${Math.floor(player.health)}`, px + 420, py + 60);

    // Divider
    ctx.strokeStyle = '#335';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 15, py + 70);
    ctx.lineTo(px + panelW - 15, py + 70);
    ctx.stroke();

    // Reset trade buttons
    this._tradeButtons = [];

    let y = py + 88;

    // === SELL CARGO (typed manifest) ===
    ctx.fillStyle = '#4a4';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('SELL CARGO', px + 15, y);

    const cargo = player.cargoByType || {};
    const cargoTypes = Object.keys(cargo).filter(t => cargo[t] > 0);
    const PRICES = { hydro: 3, carbon: 8, ferro: 18, silicrystal: 45, titan: 85, nebula: 150, aurum: 300, thorium: 500, darkmatter: 2000 };
    const NAMES = { hydro: 'Hydro', carbon: 'Carbon', ferro: 'Ferro', silicrystal: 'Sili-Cry', titan: 'Titan', nebula: 'Nebula', aurum: 'Aurum', thorium: 'Thorium', darkmatter: 'DarkMtr' };

    if (cargoTypes.length > 0) {
      const totalValue = player.getCargoValue();
      ctx.font = '11px Arial';
      ctx.fillStyle = '#aaa';
      ctx.fillText(`${player.resources} units · ${totalValue}cr total`, px + 130, y);

      this._drawTradeButton(ctx, px + panelW - 135, y - 13, 120, 22, `SELL ALL (+${totalValue})`, '#3a3', () => {
        const earned = player.sellAllCargo();
        this.gameState.score += earned;
        import('../audio/SoundEngine.js').then(m => m.playSFX('dock'));
      });

      // Manifest — what types and how much each
      y += 18;
      const typesPerRow = 3;
      cargoTypes.forEach((type, i) => {
        const col = i % typesPerRow;
        const row = Math.floor(i / typesPerRow);
        const mx = px + 25 + col * 175;
        const my = y + row * 14;
        const count = cargo[type];
        const value = count * (PRICES[type] || 5);
        ctx.font = '10px Arial';
        ctx.fillStyle = '#bbf';
        ctx.fillText(`${NAMES[type] || type} ×${count}`, mx, my);
        ctx.fillStyle = '#888';
        ctx.fillText(`${value}cr`, mx + 100, my);
      });
      y += Math.ceil(cargoTypes.length / typesPerRow) * 14 + 10;
    } else {
      ctx.font = '11px Arial';
      ctx.fillStyle = '#666';
      ctx.fillText('No cargo to sell', px + 130, y);
      y += 30;
    }

    // === ENERGY REFUEL — pay per unit (gas pump style) ===
    ctx.fillStyle = '#4af';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('REFUEL ENERGY', px + 15, y);

    const PRICE_PER_UNIT = 2; // 2 credits per energy unit
    const energyNeeded = Math.ceil(player.maxEnergy - player.energy);
    const fullCost = Math.ceil(energyNeeded * PRICE_PER_UNIT);
    const affordableUnits = Math.floor(player.credits / PRICE_PER_UNIT);
    const fillUpUnits = Math.min(energyNeeded, affordableUnits);

    ctx.font = '11px Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`${PRICE_PER_UNIT}cr per unit · need ${Math.ceil(energyNeeded)} (${fullCost}cr)`, px + 130, y);

    // +1 unit button
    const unitCost = PRICE_PER_UNIT;
    const canBuyUnit = player.credits >= unitCost && player.energy < player.maxEnergy;
    this._drawTradeButton(ctx, px + panelW - 245, y - 13, 50, 22,
      `+1`,
      canBuyUnit ? '#246' : '#333', () => {
        if (canBuyUnit) {
          player.credits -= unitCost;
          player.energy = Math.min(player.maxEnergy, player.energy + 1);
          import('../audio/SoundEngine.js').then(m => m.playSFX('pickup'));
        }
      });

    // +10 button
    const tenCost = PRICE_PER_UNIT * 10;
    const canBuyTen = player.credits >= tenCost && player.energy < player.maxEnergy - 9;
    this._drawTradeButton(ctx, px + panelW - 190, y - 13, 50, 22,
      `+10`,
      canBuyTen ? '#246' : '#333', () => {
        if (canBuyTen) {
          const units = Math.min(10, Math.floor(player.credits / PRICE_PER_UNIT), player.maxEnergy - player.energy);
          player.credits -= units * PRICE_PER_UNIT;
          player.energy = Math.min(player.maxEnergy, player.energy + units);
          import('../audio/SoundEngine.js').then(m => m.playSFX('pickup'));
        }
      });

    // FILL UP button (max affordable)
    const canFillUp = fillUpUnits > 0;
    this._drawTradeButton(ctx, px + panelW - 135, y - 13, 120, 22,
      player.energy >= player.maxEnergy ? 'FULL' : canFillUp ? `FILL UP (${fillUpUnits * PRICE_PER_UNIT}cr)` : 'NO CREDITS',
      canFillUp ? '#448' : '#333', () => {
        if (canFillUp) {
          player.credits -= fillUpUnits * PRICE_PER_UNIT;
          player.energy = Math.min(player.maxEnergy, player.energy + fillUpUnits);
          import('../audio/SoundEngine.js').then(m => m.playSFX('pickup'));
        }
      });
    y += 30;

    // === REPAIR ===
    if (player.health < player.maxHealth) {
      ctx.fillStyle = '#f44';
      ctx.font = 'bold 13px Arial';
      ctx.fillText('REPAIR HULL', px + 15, y);
      const repairCost = Math.ceil((player.maxHealth - player.health) * 2);
      ctx.font = '11px Arial';
      ctx.fillStyle = '#aaa';
      ctx.fillText(`Full repair: ${repairCost}cr`, px + 150, y);

      this._drawTradeButton(ctx, px + panelW - 135, y - 13, 120, 22, 'REPAIR', '#a33', () => {
        if (player.credits >= repairCost) {
          player.credits -= repairCost;
          player.health = player.maxHealth;
          import('../audio/SoundEngine.js').then(m => m.playSFX('dock'));
        }
      });
      y += 30;
    }

    // === UPGRADES ===
    ctx.strokeStyle = '#335';
    ctx.beginPath();
    ctx.moveTo(px + 15, y - 5);
    ctx.lineTo(px + panelW - 15, y - 5);
    ctx.stroke();

    ctx.fillStyle = '#fa4';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('UPGRADES', px + 15, y + 10);
    y += 25;

    // Two columns of upgrades
    const upgrades = [
      { name: 'Cargo Hold', desc: '+20 capacity', id: 'CARGO', level: player.cargoCapacityLevel, fn: () => player.upgradeCargoCapacity(), effect: 'MOD' },
      { name: 'Thrust Eff.', desc: 'Less energy/thrust', id: 'THRUST_EFFICIENCY', level: player.thrustEfficiencyLevel, fn: () => player.upgradeThrustEfficiency(), effect: 'EFF' },
      { name: 'Ammo Eff.', desc: 'Less energy/shot', id: 'AMMO_EFFICIENCY', level: player.ammoEfficiencyLevel, fn: () => player.upgradeAmmoEfficiency(), effect: 'EFF' },
      { name: 'Speed', desc: '+1 max speed', id: 'SPEED', level: player.speedLevel, fn: () => player.upgradeSpeed(), effect: 'PWR' },
      { name: 'Pickup Range', desc: '+20% radius', id: 'RESOURCE_RANGE', level: player.resourceRangeLevel, fn: () => player.upgradeResourceRange(), effect: 'MOD' },
      { name: 'Blaster Dmg', desc: '+25% damage', id: 'BLASTER_DAMAGE', level: player.blasterDamageLevel, fn: () => player.upgradeBlasterDamage(), effect: 'PWR' },
      { name: 'Energy Tank', desc: '+25 max energy', id: 'CAPACITY', level: player.energyCapacityLevel || 1, fn: () => player.upgradeEnergyCapacity(), effect: 'MOD' },
    ];

    const colW = (panelW - 40) / 2;
    for (let i = 0; i < upgrades.length; i++) {
      const upg = upgrades[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ux = px + 15 + col * (colW + 10);
      const uy = y + row * 42;

      const cost = TC.getUpgradeCost(upg.id, upg.level);
      const canAfford = player.credits >= cost;

      // Upgrade card background
      ctx.fillStyle = canAfford ? 'rgba(40, 40, 60, 0.8)' : 'rgba(30, 30, 40, 0.5)';
      ctx.fillRect(ux, uy, colW, 36);
      ctx.strokeStyle = canAfford ? '#556' : '#333';
      ctx.strokeRect(ux, uy, colW, 36);

      // Effect type badge
      const badgeColors = { PWR: '#f44', EFF: '#4f4', MOD: '#44f' };
      ctx.fillStyle = badgeColors[upg.effect] || '#888';
      ctx.font = 'bold 8px Arial';
      ctx.fillText(upg.effect, ux + 4, uy + 11);

      // Name + level
      ctx.fillStyle = canAfford ? '#fff' : '#666';
      ctx.font = '11px Arial';
      ctx.fillText(`${upg.name} Lv${upg.level}`, ux + 30, uy + 13);

      // Description
      ctx.fillStyle = '#888';
      ctx.font = '9px Arial';
      ctx.fillText(upg.desc, ux + 30, uy + 25);

      // Cost + button
      ctx.fillStyle = canAfford ? '#ff0' : '#664';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${cost}cr`, ux + colW - 5, uy + 13);
      ctx.textAlign = 'left';

      // Click area for the whole card
      this._tradeButtons.push({
        x: ux, y: uy, w: colW, h: 36,
        onClick: () => {
          if (player.credits >= cost) {
            player.credits -= cost;
            upg.fn();
            import('../audio/SoundEngine.js').then(m => m.playSFX('pickup'));
          }
        }
      });
    }

    // Close instructions
    y += Math.ceil(upgrades.length / 2) * 42 + 15;
    ctx.fillStyle = '#555';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press ESC or E to undock', px + panelW / 2, py + panelH - 12);
    ctx.textAlign = 'left';
  }

  /**
   * Draw a trade button and register click area
   * @private
   */
  _drawTradeButton(ctx, x, y, w, h, label, color, onClick) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 4);
    ctx.textAlign = 'left';

    this._tradeButtons.push({ x, y, w, h, onClick });
  }

  /**
   * Handle click on trading UI
   */
  handleTradeClick(mouseX, mouseY) {
    if (!this._tradeButtons) return;
    for (const btn of this._tradeButtons) {
      if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
          mouseY >= btn.y && mouseY <= btn.y + btn.h) {
        btn.onClick();
        return;
      }
    }
  }

  /**
   * Check performance and apply optimizations if needed
   * @private
   */
  checkPerformance() {
    // TODO: Wire up once PerformanceMonitor.getMetrics() is implemented
  }
}

class GameService {
  constructor() {
    this.state = 'uninitialized';
    this.dependencies = new Map();
    this.initializationPromise = null;
  }

  async initialize() {
    if (this.state === 'initialized') return;
    if (this.state === 'initializing') return this.initializationPromise;
    
    this.state = 'initializing';
    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }

  async doInitialize() {
    // Override in subclasses
  }

  isReady() {
    return this.state === 'initialized';
  }
}

class GameBootstrap {
  constructor() {
    this.services = new Map();
    this.initializationOrder = [
      'config',
      'eventSystem',
      'canvas',
      'render',
      'input',
      'gameLoop'
    ];
  }

  async bootstrap() {
    // Initialize services in order
    for (const serviceName of this.initializationOrder) {
      const service = this.services.get(serviceName);
      if (!service) throw new Error(`Missing required service: ${serviceName}`);
      await service.initialize();
    }

    // Start game loop only after all services are ready
    const gameLoop = this.services.get('gameLoop');
    await gameLoop.start();
  }
}

class RenderLoop {
  constructor(services) {
    this.services = services;
    this.isRunning = false;
    this.frameId = null;
  }

  async start() {
    if (this.isRunning) return;
    
    // Ensure all required services are ready
    await this.waitForServices();
    
    this.isRunning = true;
    this.frameId = requestAnimationFrame(this.render.bind(this));
  }

  async waitForServices() {
    const required = ['renderManager', 'canvasManager'];
    for (const name of required) {
      const service = this.services.get(name);
      if (!service || !service.isReady()) {
        throw new Error(`Service ${name} not ready`);
      }
    }
  }

  render(timestamp) {
    if (!this.isRunning) return;
    
    try {
      const renderManager = this.services.get('renderManager');
      const canvasManager = this.services.get('canvasManager');
      
      canvasManager.clear();
      const context = renderManager.beginRender();
      if (!context) return;
      
      // Render game state
      renderManager.renderWorld(this.gameState);
      renderManager.renderUI(this.gameState);
      
      renderManager.endRender();
    } catch (error) {
      console.error('Render error:', error);
    } finally {
      this.frameId = requestAnimationFrame(this.render.bind(this));
    }
  }
}

class GameState {
  constructor() {
    this.state = 'loading';
    this.entities = new Map();
    this.systems = new Map();
  }

  async load() {
    this.state = 'loading';
    try {
      await this.loadAssets();
      await this.initializeSystems();
      this.state = 'ready';
    } catch (error) {
      this.state = 'error';
      throw error;
    }
  }
} 