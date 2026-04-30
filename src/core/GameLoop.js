import { GAME_CONFIG } from '../config/gameConfig.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { PerformanceOptimizer } from '../utils/PerformanceOptimizer.js';
import { EventTypes } from '../ecs/events/EventTypes.js';
import { CollisionHandler } from './CollisionHandler.js';
import { ZONES } from '../config/mapLayout.js';
import { startMusic, toggleMute } from '../audio/SoundEngine.js';

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
          const added = player.addResources(1);
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

    // Escape key — pause toggle
    if (im.isKeyPressed('Escape') && !this._escHeld) {
      this._escHeld = true;
      if (this.gameState.tradingActive) {
        this._closeTrade();
      } else {
        this.gameState.pauseGame();
      }
    }
    if (!im.isKeyPressed('Escape')) this._escHeld = false;

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
    // Update HTML HUD elements
    const gs = this.gameState;
    const setEl = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    setEl('score', `Score: ${gs.score}`);
    setEl('health', `Health: ${Math.floor(gs.health)}`);
    setEl('fuel', `Energy: ${Math.floor(gs.player?.energy || gs.fuel)}`);
    setEl('cargo', `Cargo: ${gs.player?.resources || 0}/${gs.player?.cargoCapacity || 50}`);
    setEl('credits', `Credits: ${gs.credits}`);

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
    const worldW = 8000;
    const worldH = 8000;
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
      { key: 'engines',    label: 'ENG', color: '#4af' },
      { key: 'weapons',    label: 'WPN', color: '#fa4' },
      { key: 'stabilizer', label: 'STB', color: '#4f4' },
    ];

    const panelW = 160;
    const panelH = 80;
    const px = width - panelW - 10;
    const py = height - panelH - 10;

    // Panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeRect(px, py, panelW, panelH);

    ctx.font = '9px monospace';
    ctx.textAlign = 'left';

    systems.forEach((sys, i) => {
      const y = py + 10 + i * 22;
      const alloc = ps.allocation[sys.key];
      const heat = ps.heat[sys.key];
      const status = ps.status[sys.key];

      // Label
      ctx.fillStyle = status === 'nominal' ? sys.color : '#f44';
      ctx.fillText(sys.label, px + 5, y + 9);

      // Power bar (allocation 0-9)
      const barX = px + 35;
      const barW = 80;
      const barH = 10;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, y, barW, barH);
      ctx.fillStyle = sys.color;
      ctx.fillRect(barX, y, barW * (alloc / 9), barH);

      // Allocation text
      ctx.fillStyle = '#fff';
      ctx.fillText(`${alloc * 10}%`, barX + barW + 4, y + 9);

      // Heat indicator (small bar under power bar)
      const heatY = y + barH + 1;
      const heatH = 3;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, heatY, barW, heatH);
      // Heat color
      let heatColor = '#4CAF50'; // green
      if (heat > 50) heatColor = '#FFEB3B'; // yellow
      if (heat > 75) heatColor = '#FF9800'; // orange
      if (heat > 85) heatColor = '#F44336'; // red (redline)
      if (heat > 95) heatColor = '#9C27B0'; // purple (critical)
      ctx.fillStyle = heatColor;
      ctx.fillRect(barX, heatY, barW * Math.min(1, heat / 100), heatH);
    });

    // Oxygen indicator (when in inertial mode)
    if (ps.inertialMode) {
      const oxy = ps.oxygenLevel;
      let oxyColor = '#4f4';
      if (oxy < 70) oxyColor = '#ff0';
      if (oxy < 30) oxyColor = '#f44';
      ctx.fillStyle = oxyColor;
      ctx.font = '10px monospace';
      ctx.fillText(`O₂: ${Math.round(oxy)}%`, px + 5, py - 5);
    }

    // Power allocation hint
    if (ps.selectedSystem) {
      ctx.fillStyle = '#ff0';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${ps.selectedSystem.toUpperCase()}: press 0-9`, width / 2, height - 30);
      ctx.textAlign = 'left';
    }
  }

  /**
   * Close trading UI
   * @private
   */
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
   * @private
   */
  renderTradingUI(ctx, width, height) {
    const player = this.gameState.player;
    const station = this.gameState.currentStation;
    if (!player || !station) return;

    const panelW = 500;
    const panelH = 400;
    const px = (width - panelW) / 2;
    const py = (height - panelH) / 2;

    // Panel background
    ctx.fillStyle = 'rgba(0, 0, 20, 0.9)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#4af';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, panelW, panelH);

    // Header
    ctx.fillStyle = '#0ff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TRADING STATION', px + panelW / 2, py + 30);

    // Player stats
    ctx.font = '13px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Credits: ${player.credits}`, px + 20, py + 60);
    ctx.fillText(`Cargo: ${player.resources}/${player.cargoCapacity}`, px + 200, py + 60);
    ctx.fillText(`Energy: ${Math.floor(player.energy)}/${player.maxEnergy}`, px + 350, py + 60);

    // Divider
    ctx.strokeStyle = '#4af';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 20, py + 75);
    ctx.lineTo(px + panelW - 20, py + 75);
    ctx.stroke();

    // Store trading button info for click handling
    if (!this._tradeButtons) this._tradeButtons = [];
    this._tradeButtons = [];

    let yOff = py + 95;

    // Sell resources section
    ctx.fillStyle = '#8bf';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('SELL RESOURCES', px + 20, yOff);
    yOff += 25;

    ctx.font = '13px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Sell price: ${station.prices.sell} credits each`, px + 30, yOff);

    // Sell button
    this._drawTradeButton(ctx, px + 350, yOff - 15, 120, 25, 'SELL ALL', '#4a4', () => {
      if (player.resources > 0) {
        const earned = player.resources * station.prices.sell;
        player.credits += earned;
        this.gameState.score += earned;
        player.resources = 0;
      }
    });
    yOff += 35;

    // Buy resources section
    ctx.fillStyle = '#8bf';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('BUY RESOURCES', px + 20, yOff);
    yOff += 25;

    ctx.font = '13px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Buy price: ${station.prices.buy} credits each`, px + 30, yOff);

    this._drawTradeButton(ctx, px + 350, yOff - 15, 120, 25, 'BUY x10', '#44a', () => {
      const cost = station.prices.buy * 10;
      const space = player.cargoCapacity - player.resources;
      const canBuy = Math.min(10, space, Math.floor(player.credits / station.prices.buy));
      if (canBuy > 0) {
        player.credits -= canBuy * station.prices.buy;
        player.resources += canBuy;
      }
    });
    yOff += 40;

    // Energy section
    ctx.fillStyle = '#4af';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('ENERGY', px + 20, yOff);
    yOff += 25;

    const ec = GAME_CONFIG.TRADING.ENERGY_CELL;
    ctx.font = '13px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Energy Cell: +${ec.AMOUNT} energy for ${ec.COST} credits`, px + 30, yOff);

    this._drawTradeButton(ctx, px + 350, yOff - 15, 120, 25, 'BUY', '#448', () => {
      if (player.credits >= ec.COST) {
        player.credits -= ec.COST;
        player.refuelEnergy(ec.AMOUNT);
      }
    });
    yOff += 40;

    // Upgrades section
    ctx.fillStyle = '#fa4';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('UPGRADES', px + 20, yOff);
    yOff += 5;

    const upgrades = [
      { name: 'Cargo +50', level: player.cargoCapacityLevel, cfg: GAME_CONFIG.TRADING.UPGRADES.CAPACITY, fn: () => player.upgradeCargoCapacity() },
      { name: 'Thrust Eff.', level: player.thrustEfficiencyLevel, cfg: GAME_CONFIG.TRADING.UPGRADES.THRUST_EFFICIENCY, fn: () => player.upgradeThrustEfficiency() },
      { name: 'Speed', level: player.speedLevel, cfg: GAME_CONFIG.TRADING.UPGRADES.SPEED, fn: () => player.upgradeSpeed() },
      { name: 'Blaster Dmg', level: player.blasterDamageLevel, cfg: GAME_CONFIG.TRADING.UPGRADES.BLASTER_DAMAGE, fn: () => player.upgradeBlasterDamage() },
      { name: 'Pickup Range', level: player.resourceRangeLevel, cfg: GAME_CONFIG.TRADING.UPGRADES.RESOURCE_RANGE, fn: () => player.upgradeResourceRange() },
    ];

    for (const upg of upgrades) {
      yOff += 22;
      const cost = Math.floor(upg.cfg.BASE_COST * (upg.level + (upg.cfg.DEGRADATION_FACTOR || 0.1) * upg.level * upg.level));
      ctx.font = '12px Arial';
      ctx.fillStyle = '#fff';
      ctx.fillText(`${upg.name} (Lv${upg.level})`, px + 30, yOff);
      ctx.fillStyle = '#aaa';
      ctx.fillText(`${cost}cr`, px + 250, yOff);

      this._drawTradeButton(ctx, px + 350, yOff - 13, 120, 20, 'UPGRADE', '#654', () => {
        if (player.credits >= cost) {
          player.credits -= cost;
          upg.fn();
        }
      });
    }

    // Close instructions
    ctx.fillStyle = '#888';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press ESC or E to undock', px + panelW / 2, py + panelH - 15);
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