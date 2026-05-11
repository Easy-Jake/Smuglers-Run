import { GAME_CONFIG } from '../config/gameConfig.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { PerformanceOptimizer } from '../utils/PerformanceOptimizer.js';
import { EventTypes } from '../ecs/events/EventTypes.js';
import { CollisionHandler } from './CollisionHandler.js';
import { ZONES, RESOURCE_TYPES } from '../config/mapLayout.js';
import { startMusic, toggleMute } from '../audio/SoundEngine.js';
import * as TradingConfig from '../config/tradingConfig.js';
import { eventLog } from '../utils/EventLog.js';

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
    // Begin event log session
    eventLog.startSession();
    
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

    // Ensure player has back-reference for emergency gameOver triggers
    if (this.gameState.player && !this.gameState.player._gameLoop) {
      this.gameState.player._gameLoop = this;
    }

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
          eventLog.log('docking', `Docked at ${station.stationName}`, {
            action: 'docked', station: station.stationName,
            cargoValue: player.getCargoValue?.() || 0,
            credits: player.credits, energy: Math.round(player.energy),
          });
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
            this.addPickupToast(resource.resourceType || 'carbon');
            eventLog.log('mining', `Picked up ${resource.resourceType || 'resource'}`, {
              type: resource.resourceType, count: 1, value: resource.value,
            });
          }
        }
      }
    }

    // === GOVERNOR CHECK — uncle's leash until debt paid ===
    if (player && player.debt > 0 && player.governorRadius < Infinity) {
      const gdx = player.x - player.governorOrigin.x;
      const gdy = player.y - player.governorOrigin.y;
      const gdist = Math.sqrt(gdx * gdx + gdy * gdy);
      const warningRadius = player.governorRadius * 0.85;

      if (gdist > player.governorRadius && !player.governorViolating) {
        // Crossed the line — dispatch repo ship
        player.governorViolating = true;
        this._spawnRepoShip(player);
        eventLog.log('system', `Repo ship dispatched — you owe ${player.debt}cr`, {
          repoDispatched: true, distance: Math.round(gdist),
        });
      } else if (gdist > warningRadius && !player.governorWarned) {
        player.governorWarned = true;
      } else if (gdist < warningRadius * 0.7) {
        // Reset warning when well back inside
        player.governorWarned = false;
      }
      // If player returned inside the radius, despawn repo ships
      if (gdist < player.governorRadius * 0.9 && player.governorViolating) {
        player.governorViolating = false;
        const repoShips = this.gameState.enemies.filter(e => e.isRepoShip && e.active);
        repoShips.forEach(s => { s.active = false; });
        if (repoShips.length > 0) {
          eventLog.log('system', 'Repo ships called off — you returned to Ricky\'s range', {});
        }
      }
    }
  }

  _spawnRepoShip(player) {
    // Spawn near player to give them no chance to escape easily
    const angle = Math.random() * Math.PI * 2;
    const dist = 800;
    const sx = player.x + Math.cos(angle) * dist;
    const sy = player.y + Math.sin(angle) * dist;
    // Lazy-import to avoid circular issues
    import('../entities/Enemy.js').then(({ Enemy }) => {
      const repo = new Enemy(sx, sy, {
        enemyType: 'heavy',
        waypoints: [{ x: player.x, y: player.y }],
      });
      repo.health = 60;
      repo.maxHealth = 60;
      repo.speed = 2.5; // FAST — hard to outrun
      repo.maxSpeed = 2.5;
      repo.damage = 12;
      repo.sensorRange = 5000; // can find you anywhere
      repo.attackRange = 350;
      repo.shootRate = 50;
      repo.creditReward = 0; // doesn't pay — just punishment
      repo.projectileDamage = 12;
      repo.isRepoShip = true;
      repo.target = player;
      repo.state = 'chase';
      repo.enemyTier = 'Repo Ship';
      this.gameState.enemies.push(repo);
    });
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

    // L key — event log overlay
    if (im.isKeyPressed('l') && !this._lHeld && !this.gameState.tradingActive) {
      this._lHeld = true;
      this._showLog = !this._showLog;
      if (this._showLog) eventLog.dump(30); // also dump to console
    }
    if (!im.isKeyPressed('l') && !im.isKeyPressed('L')) this._lHeld = false;

    // Shift+L = download log as JSON file
    if (im.isKeyPressed('L') && im.isKeyPressed('Shift') && !this._downloadHeld) {
      this._downloadHeld = true;
      eventLog.download();
    }
    if (!im.isKeyPressed('L')) this._downloadHeld = false;

    if (this.gameState.isPaused) return;

    // If trading UI is open, block game input
    if (this.gameState.tradingActive) return;

    if (!player) return;

    // E key — dock/undock toggle
    const ePressed = im.isKeyPressed('e') || im.isKeyPressed('E');
    if (ePressed && !this._eHeld) {
      this._eHeld = true;
      if (player.isDocked) {
        // Undock — clear any pending dock requests so we don't auto-redock
        const station = this.gameState.currentStation;
        if (station) {
          eventLog.log('docking', `Undocked from ${station.stationName}`, {
            action: 'undocked', station: station.stationName,
            credits: player.credits, energy: Math.round(player.energy),
          });
          player.startUndocking(station);
          this.gameState.tradingActive = false;
          this.gameState.currentStation = null;
        }
        for (const s of this.gameState.stations) {
          s.dockingRequested = false;
          s.dockingSequenceActive = false;
        }
      } else if (!player.isUndocking) {
        // Request docking only at the NEAREST station within docking radius
        let nearest = null;
        let nearestDist = Infinity;
        for (const station of this.gameState.stations) {
          const dx = station.x - player.x;
          const dy = station.y - player.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < station.dockingRadius && d < nearestDist) {
            nearest = station;
            nearestDist = d;
          }
        }
        if (nearest) {
          nearest.dockingRequested = true;
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

        // Render asteroid labels when player is close (resource name + value)
        const p = this.gameState.player;
        for (const a of this.gameState.asteroids) {
          if (!a.active || !a.renderLabel) continue;
          const dx = a.x - p.x;
          const dy = a.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            a.renderLabel(ctx, dist);
          }
        }
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

      // Governor warning
      this._renderGovernorWarning(ctx, width, height);

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
      if (this._showLog) {
        this._renderEventLog(ctx, width, height);
      }

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

    // Cargo manifest — shows what's in the hold by type with values
    this._renderCargoManifest(ctx, width, height);

    // Recent pickup toast
    this._renderPickupToast(ctx, width, height);
  }

  /**
   * Render cargo manifest in top-left below HUD
   */
  _renderCargoManifest(ctx, width, height) {
    const player = this.gameState.player;
    if (!player?.cargoByType) return;
    const cargo = player.cargoByType;
    const types = Object.keys(cargo).filter(t => cargo[t] > 0);
    if (types.length === 0) return;

    const PRICES = { hydro: 8, carbon: 15, ferro: 30, silicrystal: 45, titan: 85, nebula: 150, aurum: 300, thorium: 500, darkmatter: 2000 };
    const NAMES = { hydro: 'Hydro', carbon: 'Carbon', ferro: 'Ferro', silicrystal: 'Sili-Cry', titan: 'Titan', nebula: 'Nebula', aurum: 'Aurum', thorium: 'Thorium', darkmatter: 'DarkMtr' };
    const COLORS = { hydro: '#aaddff', carbon: '#aaa', ferro: '#da8a44', silicrystal: '#8cf', titan: '#bbaaee', nebula: '#c8f', aurum: '#ffe44d', thorium: '#88ff88', darkmatter: '#fff' };

    // Sort by value descending so most valuable shows first
    types.sort((a, b) => (PRICES[b] || 0) - (PRICES[a] || 0));

    // Position to the right of the thermometers (x = 12 + 4 thermometers × ~44 + margin)
    const px = 12 + 4 * 44 + 16;
    const py = 280;
    const lineH = 16;
    const panelW = 180;
    const panelH = types.length * lineH + 28;

    ctx.fillStyle = 'rgba(0, 0, 20, 0.7)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#446';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, panelW, panelH);

    // Header
    ctx.fillStyle = '#88f';
    ctx.font = "bold 9px 'Press Start 2P', monospace";
    ctx.textAlign = 'left';
    ctx.fillText('CARGO HOLD', px + 8, py + 14);

    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    types.forEach((type, i) => {
      const y = py + 28 + i * lineH;
      const count = cargo[type];
      const value = count * (PRICES[type] || 0);
      // Color dot
      ctx.fillStyle = COLORS[type] || '#fff';
      ctx.fillRect(px + 8, y - 7, 6, 6);
      // Name + count
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.fillText(`${NAMES[type] || type} ×${count}`, px + 20, y);
      // Value
      ctx.fillStyle = '#ff0';
      ctx.textAlign = 'right';
      ctx.fillText(`${value}cr`, px + panelW - 8, y);
      ctx.textAlign = 'left';
    });
  }

  /**
   * Render a fading toast for recent resource pickups
   */
  _renderPickupToast(ctx, width, height) {
    if (!this._pickupToasts || this._pickupToasts.length === 0) return;
    const now = Date.now();
    // Remove expired
    this._pickupToasts = this._pickupToasts.filter(t => now - t.time < 2000);

    const PRICES = { hydro: 8, carbon: 15, ferro: 30, silicrystal: 45, titan: 85, nebula: 150, aurum: 300, thorium: 500, darkmatter: 2000 };
    const NAMES = { hydro: 'Hydro Cells', carbon: 'Carbon', ferro: 'Ferro Scrap', silicrystal: 'Sili-Crystal', titan: 'Titan Ore', nebula: 'Nebula', aurum: 'Aurum', thorium: 'Thorium', darkmatter: 'Dark Matter' };
    const COLORS = { hydro: '#aaddff', carbon: '#ddd', ferro: '#da8a44', silicrystal: '#8cf', titan: '#bbaaee', nebula: '#c8f', aurum: '#ffe44d', thorium: '#88ff88', darkmatter: '#fff' };

    // Stack from bottom
    this._pickupToasts.forEach((t, i) => {
      const age = (now - t.time) / 2000;
      const alpha = age < 0.7 ? 1 : 1 - (age - 0.7) / 0.3;
      const y = height - 200 - i * 22;
      const value = PRICES[t.type] || 0;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(width / 2 - 110, y - 16, 220, 22);
      ctx.fillStyle = COLORS[t.type] || '#fff';
      ctx.font = "bold 12px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(`+1 ${NAMES[t.type] || t.type} (+${value}cr)`, width / 2, y);
      ctx.textAlign = 'left';
      ctx.restore();
    });
  }

  /**
   * Add a pickup toast (called when collecting a resource)
   */
  addPickupToast(resourceType) {
    if (!this._pickupToasts) this._pickupToasts = [];
    this._pickupToasts.unshift({ type: resourceType, time: Date.now() });
    // Cap to last 5
    if (this._pickupToasts.length > 5) this._pickupToasts.length = 5;
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

    // Governor radius circle (Uncle Ricky's leash)
    if (p.debt > 0 && p.governorRadius < Infinity) {
      const gx = mx + p.governorOrigin.x * scaleX;
      const gy = my + p.governorOrigin.y * scaleY;
      const gr = p.governorRadius * scaleX;
      ctx.strokeStyle = p.governorViolating ? '#f00' : '#f80';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
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
      { key: 'battery',    label: 'BAT', color: '#ff4', accent: '#ff8', isBattery: true },
    ];

    // Vertical thermometers on left side — wider to fit power bar + heat bar
    const thermW = 38;
    const thermH = 200;
    const startY = 280; // below top-left HUD
    const startX = 12;
    const gap = 6;

    systems.forEach((sys, i) => {
      const x = startX + i * (thermW + gap);
      const y = startY;

      // Battery uses different stats (health for "power", batteryHeat for heat)
      const isBattery = sys.isBattery;
      const alloc = isBattery ? Math.round(ps.batteryHealth / 10) : ps.allocation[sys.key];
      const heat = isBattery ? Math.min(100, ps.batteryHeat) : ps.heat[sys.key];
      const status = isBattery ? ps.batteryStatus : ps.status[sys.key];
      const sysHealth = isBattery ? ps.batteryHealth : ps.systemHealth[sys.key];

      // Label at top
      ctx.fillStyle = status === 'nominal' ? sys.color : '#f44';
      ctx.font = "bold 9px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(sys.label, x + thermW / 2, y - 14);

      // POWER %/HEALTH displayed prominently above bars
      ctx.fillStyle = sys.color;
      ctx.font = "bold 11px 'Press Start 2P', monospace";
      const topVal = isBattery ? `${Math.round(ps.batteryHealth)}%` : `${alloc * 10}%`;
      ctx.fillText(topVal, x + thermW / 2, y - 2);

      // Outer thermometer body
      ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';
      ctx.fillRect(x, y, thermW, thermH);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, thermW, thermH);

      // Divider between power bar (left) and heat bar (right)
      const halfW = thermW / 2;
      ctx.strokeStyle = '#222';
      ctx.beginPath();
      ctx.moveTo(x + halfW, y);
      ctx.lineTo(x + halfW, y + thermH);
      ctx.stroke();

      // Mini-labels for the bars
      ctx.fillStyle = '#666';
      ctx.font = '7px monospace';
      ctx.fillText(isBattery ? 'HP' : 'PWR', x + halfW / 2, y + thermH + 11);
      ctx.fillText('HEAT', x + halfW + halfW / 2, y + thermH + 11);

      // POWER FILL (left half, fills from bottom)
      // Battery shows health instead of power allocation
      const powerPct = isBattery ? (ps.batteryHealth / 100) : (alloc / 9);
      const powerH = thermH * powerPct;
      // Stripes effect to make it look "active"
      ctx.fillStyle = sys.color;
      ctx.fillRect(x + 2, y + thermH - powerH + 1, halfW - 3, powerH - 2);
      // Subtle shine at top of power fill
      if (powerPct > 0) {
        ctx.fillStyle = sys.accent;
        ctx.fillRect(x + 2, y + thermH - powerH + 1, halfW - 3, 2);
      }

      // HEAT FILL (right half, fills from bottom — heat color)
      const heatPct = Math.min(1, heat / 100);
      const fillH = thermH * heatPct;
      let heatColor = '#4CAF50';
      if (heat > 50) heatColor = '#FFEB3B';
      if (heat > 75) heatColor = '#FF9800';
      if (heat > 85) heatColor = '#F44336';
      if (heat > 95) heatColor = '#9C27B0';
      ctx.fillStyle = heatColor;
      ctx.fillRect(x + halfW + 1, y + thermH - fillH + 1, halfW - 3, fillH - 2);

      // PULSING WARNING when in redline window (before failure rolls)
      const redlineTime = isBattery ? (ps.batteryRedlineTimer || 0) : (ps.redlineTimer?.[sys.key] || 0);
      if (heat > 85 && redlineTime < 0.5) {
        // Warning window — pulse the heat bar
        const pulse = 0.5 + Math.sin(Date.now() / 60) * 0.5;
        ctx.fillStyle = `rgba(255, 200, 0, ${pulse * 0.6})`;
        ctx.fillRect(x + halfW + 1, y + thermH - fillH + 1, halfW - 3, fillH - 2);
      }

      // Redline marker on heat side at 85%
      const redlineY = y + thermH - thermH * 0.85;
      ctx.strokeStyle = '#f00';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x + halfW, redlineY);
      ctx.lineTo(x + thermW, redlineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Power level tick marks (every 10%) on power side for reference
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      for (let t = 1; t < 10; t++) {
        const tickY = y + thermH - thermH * (t / 10);
        ctx.beginPath();
        ctx.moveTo(x + 1, tickY);
        ctx.lineTo(x + halfW - 1, tickY);
        ctx.stroke();
      }

      // System damage bar at bottom
      if (sysHealth < 100) {
        const dmgY = y + thermH + 22;
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
        ctx.fillText(statusShort, x + thermW / 2, y + thermH + 32);
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

    // === BROWNOUT BANNERS (more prominent than minor failures) ===
    let bannerY = 45;

    // Battery brownout banner takes priority
    if (ps.batteryStatus === 'brownout') {
      const pulse = 0.6 + Math.sin(Date.now() / 150) * 0.4;
      ctx.fillStyle = `rgba(255, 50, 50, ${pulse * 0.85})`;
      ctx.fillRect(width / 2 - 200, bannerY, 400, 28);
      ctx.fillStyle = '#fff';
      ctx.font = "bold 12px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('⚠ BATTERY BROWNOUT — POWER CAPPED AT 5', width / 2, bannerY + 18);
      ctx.textAlign = 'left';
      bannerY += 32;
    }
    if (ps.batteryStatus === 'dead') {
      ctx.fillStyle = `rgba(255, 0, 0, 0.95)`;
      ctx.fillRect(width / 2 - 200, bannerY, 400, 28);
      ctx.fillStyle = '#fff';
      ctx.font = "bold 12px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('☠ BATTERY DEAD — TOTAL SHUTDOWN', width / 2, bannerY + 18);
      ctx.textAlign = 'left';
      bannerY += 32;
    }

    for (const sys of systems) {
      if (sys.isBattery) continue; // battery has its own banner above
      if (ps.isBrownedOut?.(sys.key)) {
        const pulse = 0.6 + Math.sin(Date.now() / 200) * 0.4;
        ctx.fillStyle = `rgba(255, 100, 0, ${pulse * 0.8})`;
        ctx.fillRect(width / 2 - 180, bannerY, 360, 26);
        ctx.fillStyle = '#fff';
        ctx.font = "bold 11px 'Press Start 2P', monospace";
        ctx.textAlign = 'center';
        const msg = sys.key === 'engines' ? 'ENGINE BROWNOUT — LIMP MODE'
          : sys.key === 'weapons' ? 'WEAPON BROWNOUT — DEGRADED'
          : 'STABILIZER BROWNOUT — DRIFT MODE';
        ctx.fillText(msg, width / 2, bannerY + 17);
        ctx.textAlign = 'left';
        bannerY += 30;
      } else if (ps.status[sys.key] !== 'nominal') {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(width / 2 - 160, bannerY, 320, 24);
        ctx.fillStyle = '#fff';
        ctx.font = "bold 11px 'Press Start 2P', monospace";
        ctx.textAlign = 'center';
        const tier = ps.status[sys.key].replace('_failure', '').toUpperCase();
        ctx.fillText(`${sys.label} ${tier} FAILURE`, width / 2, bannerY + 16);
        ctx.textAlign = 'left';
        bannerY += 28;
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
   * Render governor boundary warning (uncle's leash)
   */
  _renderGovernorWarning(ctx, width, height) {
    const p = this.gameState.player;
    if (!p || p.debt <= 0 || p.governorRadius >= Infinity) return;

    if (p.governorViolating) {
      // Crossed the line — repo ship warning
      const pulse = 0.5 + Math.sin(Date.now() / 150) * 0.5;
      ctx.fillStyle = `rgba(255, 0, 0, ${pulse * 0.85})`;
      ctx.fillRect(width / 2 - 220, 80, 440, 30);
      ctx.fillStyle = '#fff';
      ctx.font = "bold 13px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('⚠ REPO SHIP DISPATCHED — RETURN OR PAY', width / 2, 100);
      ctx.textAlign = 'left';
    } else if (p.governorWarned) {
      // Approaching boundary
      ctx.fillStyle = 'rgba(255, 140, 0, 0.7)';
      ctx.fillRect(width / 2 - 200, 80, 400, 26);
      ctx.fillStyle = '#fff';
      ctx.font = "bold 11px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('LEAVING RICKY\'S RANGE — TURN BACK', width / 2, 98);
      ctx.textAlign = 'left';
    }
  }

  /**
   * Render event log overlay (L key) — shows last N gameplay events
   */
  _renderEventLog(ctx, width, height) {
    const panelW = 460;
    const panelH = Math.min(height - 100, 500);
    const px = (width - panelW) / 2;
    const py = 60;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 10, 0.92)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#446';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, panelW, panelH);

    // Header
    ctx.fillStyle = '#4af';
    ctx.font = "bold 12px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('EVENT LOG — L close · Shift+L save JSON', px + panelW / 2, py + 18);

    // Summary line
    const summary = eventLog.summary();
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    const summaryY = py + 38;
    ctx.fillText(`time: ${summary.sessionTime} | events: ${summary.totalEvents}`, px + 12, summaryY);
    ctx.fillText(`dmg taken: ${summary.damageTaken.total}hp (${summary.damageTaken.hits} hits) | kills: ${summary.enemiesKilled} | docks: ${summary.docks}`, px + 12, summaryY + 12);
    const mined = Object.entries(summary.resourcesMined || {})
      .map(([t, c]) => `${t}:${c}`).join(' ');
    if (mined) ctx.fillText(`mined: ${mined}`, px + 12, summaryY + 24);

    // Events list (newest first)
    ctx.font = '9px monospace';
    const events = eventLog.events.slice(-30).reverse();
    let lineY = py + 80;
    const lineH = 11;
    for (const e of events) {
      if (lineY > py + panelH - 14) break;
      const time = e.t.toFixed(1).padStart(6) + 's';
      ctx.fillStyle = '#555';
      ctx.fillText(time, px + 8, lineY);
      ctx.fillStyle = eventLog.getCategoryColor(e.category);
      ctx.fillText(e.category, px + 60, lineY);
      ctx.fillStyle = '#ccc';
      const msg = e.message.length > 50 ? e.message.slice(0, 47) + '...' : e.message;
      ctx.fillText(msg, px + 130, lineY);
      lineY += lineH;
    }
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

    // Player stats bar (with debt indicator)
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff0';
    ctx.fillText(`💰 ${player.credits}`, px + 15, py + 60);
    ctx.fillStyle = '#4f4';
    ctx.fillText(`⚡ ${Math.floor(player.energy)}/${player.maxEnergy}`, px + 110, py + 60);
    ctx.fillStyle = '#8bf';
    ctx.fillText(`📦 ${player.resources}/${player.cargoCapacity}`, px + 240, py + 60);
    ctx.fillStyle = '#f88';
    ctx.fillText(`❤️ ${Math.floor(player.health)}`, px + 370, py + 60);
    if (player.debt > 0) {
      ctx.fillStyle = '#f44';
      ctx.fillText(`📋 DEBT ${player.debt}`, px + 430, py + 60);
    }

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
    const PRICES = { hydro: 8, carbon: 15, ferro: 30, silicrystal: 45, titan: 85, nebula: 150, aurum: 300, thorium: 500, darkmatter: 2000 };
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

    // Get station services + upgrade access from config
    const services = TC.STATION_SERVICES?.[station.stationType] || { sell: true, refuel: true, repair: true, upgrades: true };
    const allowedUpgradeIds = TC.STATION_UPGRADES?.[station.stationType] || [];

    // === DEBT PAYMENT — only at the starting trading station, only if debt remains ===
    if (services.debt && player.debt > 0) {
      ctx.fillStyle = '#f44';
      ctx.font = 'bold 13px Arial';
      ctx.fillText("UNCLE'S DEBT", px + 15, y);

      ctx.font = '11px Arial';
      ctx.fillStyle = '#aaa';
      ctx.fillText(`${player.debt}cr owed — pay off to unlock upgrades`, px + 130, y);

      // Pay 100 button
      const pay100 = Math.min(100, player.debt);
      const canPay100 = player.credits >= pay100 && player.debt > 0;
      this._drawTradeButton(ctx, px + panelW - 245, y - 13, 70, 22, `-${pay100}cr`,
        canPay100 ? '#a33' : '#333', () => {
          if (canPay100) {
            player.credits -= pay100;
            player.debt -= pay100;
            import('../audio/SoundEngine.js').then(m => m.playSFX('pickup'));
            import('../utils/EventLog.js').then(m => m.eventLog.log('trade', `Paid ${pay100}cr toward debt (${player.debt} left)`, { paid: pay100, remaining: player.debt }));
          }
        });

      // Pay all button
      const payAll = Math.min(player.credits, player.debt);
      const canPayAll = payAll > 0;
      this._drawTradeButton(ctx, px + panelW - 165, y - 13, 150, 22,
        player.credits >= player.debt ? `PAY OFF (${player.debt}cr)` : `PAY ${payAll}cr`,
        canPayAll ? '#c44' : '#333', () => {
          if (canPayAll) {
            player.credits -= payAll;
            player.debt -= payAll;
            import('../audio/SoundEngine.js').then(m => m.playSFX('dock'));
            // Lift governor when debt is fully paid
            if (player.debt <= 0) {
              player.governorRadius = Infinity;
              player.governorViolating = false;
              player.governorWarned = false;
              // Despawn any repo ships
              this.gameState.enemies.forEach(e => { if (e.isRepoShip) e.active = false; });
              // Unlock the next stations
              const nextStation = this.gameState.stations.find(s => s.stationType === 'salvage');
              if (nextStation) nextStation.locked = false;
            }
            import('../utils/EventLog.js').then(m => {
              m.eventLog.log('trade', player.debt === 0 ? "Debt paid off — governor lifted, Junkyard unlocked" : `Paid ${payAll}cr toward debt`,
                { paid: payAll, remaining: player.debt, debtCleared: player.debt === 0 });
            });
          }
        });
      y += 35;
    }

    // === ENERGY REFUEL — pay per unit (gas pump style) ===
    if (!services.refuel) {
      // Skip refuel section entirely for stations that don't offer it
    } else {
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

    // Helper that re-checks state at click time (prevents double-charging from rapid clicks)
    const buyEnergy = (maxUnits) => {
      // Use CURRENT player state, not cached render-time values
      const energyRoom = player.maxEnergy - player.energy;
      const canAfford = Math.floor(player.credits / PRICE_PER_UNIT);
      const units = Math.min(maxUnits, energyRoom, canAfford);
      if (units <= 0) return;
      player.credits -= units * PRICE_PER_UNIT;
      player.energy = Math.min(player.maxEnergy, player.energy + units);
      import('../audio/SoundEngine.js').then(m => m.playSFX('pickup'));
    };

    // +1 unit button
    const canBuyUnit = player.credits >= PRICE_PER_UNIT && player.energy < player.maxEnergy;
    this._drawTradeButton(ctx, px + panelW - 245, y - 13, 50, 22,
      `+1`,
      canBuyUnit ? '#246' : '#333',
      () => buyEnergy(1));

    // +10 button
    const canBuyTen = player.credits >= PRICE_PER_UNIT * 10 && player.energy < player.maxEnergy - 9;
    this._drawTradeButton(ctx, px + panelW - 190, y - 13, 50, 22,
      `+10`,
      canBuyTen ? '#246' : '#333',
      () => buyEnergy(10));

    // FILL UP button (max affordable)
    const canFillUp = fillUpUnits > 0;
    this._drawTradeButton(ctx, px + panelW - 135, y - 13, 120, 22,
      player.energy >= player.maxEnergy ? 'FULL' : canFillUp ? `FILL UP (${fillUpUnits * PRICE_PER_UNIT}cr)` : 'NO CREDITS',
      canFillUp ? '#448' : '#333',
      () => buyEnergy(player.maxEnergy)); // re-checks at click time
    y += 30;
    } // end refuel else block

    // === REPAIR ===
    if (services.repair && player.health < player.maxHealth) {
      ctx.fillStyle = '#f44';
      ctx.font = 'bold 13px Arial';
      ctx.fillText('REPAIR HULL', px + 15, y);
      const repairCost = Math.ceil((player.maxHealth - player.health) * 2);
      ctx.font = '11px Arial';
      ctx.fillStyle = '#aaa';
      ctx.fillText(`Full repair: ${repairCost}cr`, px + 150, y);

      this._drawTradeButton(ctx, px + panelW - 135, y - 13, 120, 22, 'REPAIR', '#a33', () => {
        const cost = Math.ceil((player.maxHealth - player.health) * 2);
        if (cost > 0 && player.credits >= cost) {
          player.credits -= cost;
          player.health = player.maxHealth;
          import('../audio/SoundEngine.js').then(m => m.playSFX('dock'));
        }
      });
      y += 30;
    }

    // === UPGRADES — filtered by station type, gated by debt ===
    ctx.strokeStyle = '#335';
    ctx.beginPath();
    ctx.moveTo(px + 15, y - 5);
    ctx.lineTo(px + panelW - 15, y - 5);
    ctx.stroke();

    ctx.fillStyle = '#fa4';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('UPGRADES', px + 15, y + 10);
    y += 25;

    // All possible upgrades — will be filtered by station
    const allUpgrades = [
      { name: 'Cargo Hold', desc: '+20 capacity', id: 'CARGO', levelKey: 'cargoCapacityLevel', fn: () => player.upgradeCargoCapacity(), effect: 'MOD' },
      { name: 'Thrust Eff.', desc: 'Less energy/thrust', id: 'THRUST_EFFICIENCY', levelKey: 'thrustEfficiencyLevel', fn: () => player.upgradeThrustEfficiency(), effect: 'EFF' },
      { name: 'Ammo Eff.', desc: 'Less energy/shot', id: 'AMMO_EFFICIENCY', levelKey: 'ammoEfficiencyLevel', fn: () => player.upgradeAmmoEfficiency(), effect: 'EFF' },
      { name: 'Speed', desc: '+1 max speed', id: 'SPEED', levelKey: 'speedLevel', fn: () => player.upgradeSpeed(), effect: 'PWR' },
      { name: 'Pickup Range', desc: '+20% radius', id: 'RESOURCE_RANGE', levelKey: 'resourceRangeLevel', fn: () => player.upgradeResourceRange(), effect: 'MOD' },
      { name: 'Blaster Dmg', desc: '+25% damage', id: 'BLASTER_DAMAGE', levelKey: 'blasterDamageLevel', fn: () => player.upgradeBlasterDamage(), effect: 'PWR' },
      { name: 'Energy Tank', desc: '+25 max energy', id: 'CAPACITY', levelKey: 'energyCapacityLevel', fn: () => player.upgradeEnergyCapacity(), effect: 'MOD' },
    ];
    // Filter to only upgrades this station offers
    const upgrades = allowedUpgradeIds.length > 0
      ? allUpgrades.filter(u => allowedUpgradeIds.includes(u.id))
      : allUpgrades;
    upgrades.forEach(u => { u.level = player[u.levelKey] || 1; });

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

      // Click area for the whole card — re-check cost at click time
      this._tradeButtons.push({
        x: ux, y: uy, w: colW, h: 36,
        onClick: () => {
          const liveLevel = player[upg.levelKey] || 1;
          const liveCost = TC.getUpgradeCost(upg.id, liveLevel);
          if (player.credits >= liveCost) {
            player.credits -= liveCost;
            upg.fn();
            import('../audio/SoundEngine.js').then(m => m.playSFX('pickup'));
          }
        }
      });
    }

    y += Math.ceil(upgrades.length / 2) * 42 + 15;

    // Close instructions
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