import { GAME_CONFIG } from '../config/gameConfig.js';
import { Player } from '../entities/Player.js';
import { Asteroid } from '../entities/Asteroid.js';
import { Station } from '../entities/Station.js';
import { Enemy } from '../entities/Enemy.js';
import { Debris } from '../entities/Debris.js';
import { NPCShip } from '../entities/NPCShip.js';
import { Beacon } from '../entities/Beacon.js';
import { ASTEROID_FIELDS, FIXED_STATIONS, MAP_WIDTH, MAP_HEIGHT, ZONES, ENEMY_TIERS, RESOURCE_TYPES } from '../config/mapLayout.js';

export class GameState {
  constructor() {
    this.gameStarted = false;
    this.gameTime = 0;
    this.credits = GAME_CONFIG.PLAYER.STARTING_CREDITS;
    this.score = 0;
    this.difficulty = 1;
    this.waveNumber = 1;
    this.waveTimer = GAME_CONFIG.GAME.WAVE_DURATION;
    this.isPaused = false;
    this.isGameOver = false;
    this.health = 100;
    this.fuel = 100;
    this.cargoAmount = 0;

    // Game objects
    this.player = null;
    this.asteroids = [];
    this.enemies = [];
    this.stations = [];
    this.projectiles = [];
    this.particles = [];
    this.cargoItems = [];
    this.resources = [];
    this.debris = [];          // ambient drifting junk
    this.npcShips = [];        // neutral NPCs
    this.beacons = [];         // distress signals
    this._beaconSpawnTimer = 0; // countdown to next beacon

    // Stars background
    this.stars = [];

    // Camera
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1,
    };

    // Input state
    this.input = {
      thrust: false,
      rotateLeft: false,
      rotateRight: false,
      shoot: false,
      boost: false,
    };
    
    // Trading state
    this.tradingActive = false;
    this.currentStation = null;
  }

  update(deltaTime) {
    if (!this.gameStarted || this.isPaused || this.isGameOver) return;

    this.gameTime += deltaTime;

    // Update all game objects
    this.player?.update(deltaTime);
    this.asteroids.forEach(asteroid => asteroid.update(deltaTime, this));
    this.enemies.forEach(enemy => enemy.update(deltaTime, this));
    this.stations.forEach(station => station.update(deltaTime));
    this.projectiles.forEach(projectile => projectile.update(deltaTime));
    this.particles.forEach(particle => particle.update(deltaTime));
    this.cargoItems.forEach(cargo => cargo.update(deltaTime));
    if (this.resources) this.resources.forEach(r => r.update(deltaTime));
    if (this.debris) this.debris.forEach(d => d.update(deltaTime, this));
    if (this.npcShips) this.npcShips.forEach(n => n.update(deltaTime, this));
    if (this.beacons) this.beacons.forEach(b => b.update(deltaTime, this));

    // Periodically spawn a new beacon in the free zone
    this._beaconSpawnTimer = (this._beaconSpawnTimer || 0) - deltaTime;
    const activeBeacons = (this.beacons || []).filter(b => b.active).length;
    if (this._beaconSpawnTimer <= 0 && activeBeacons < 2) {
      this._spawnRandomBeacon();
      this._beaconSpawnTimer = 60 + Math.random() * 60; // every 60-120 seconds
    }

    // Remove inactive objects
    this.projectiles = this.projectiles.filter(p => p.active);
    this.particles = this.particles.filter(p => p.active);
    this.asteroids = this.asteroids.filter(a => a.active);
    this.enemies = this.enemies.filter(e => e.active);
    this.cargoItems = this.cargoItems.filter(c => c.active);
    if (this.resources) this.resources = this.resources.filter(r => r.active);
    if (this.debris) this.debris = this.debris.filter(d => d.active);
    if (this.npcShips) this.npcShips = this.npcShips.filter(n => n.active);
    if (this.beacons) this.beacons = this.beacons.filter(b => b.active);

    // Sync player stats to gameState for HUD
    if (this.player) {
      this.health = this.player.health;
      this.fuel = this.player.energy;
      this.credits = this.player.credits;
      this.cargoAmount = this.player.resources;
    }

    // Update camera to follow player
    if (this.player) {
      this.camera.x = this.player.x - window.innerWidth / 2;
      this.camera.y = this.player.y - window.innerHeight / 2;
    }
  }

  _generateWorld() {
    // Spawn all stations from map layout
    for (const stationDef of FIXED_STATIONS) {
      const station = new Station(stationDef.x, stationDef.y, stationDef.type, stationDef);
      this.stations.push(station);
    }

    // Spawn asteroids from field definitions
    const sizes = ['small', 'medium', 'large'];
    for (const [, field] of Object.entries(ASTEROID_FIELDS)) {
      for (let i = 0; i < field.count; i++) {
        let ax, ay;

        if (field.pattern === 'ring') {
          // Ring pattern — between inner and outer radius
          const angle = Math.random() * Math.PI * 2;
          const inner = field.innerRadius || field.radius * 0.6;
          const dist = inner + Math.random() * (field.radius - inner);
          ax = field.x + Math.cos(angle) * dist;
          ay = field.y + Math.sin(angle) * dist;
        } else {
          // Scattered within rect
          ax = field.x + (Math.random() - 0.5) * field.width;
          ay = field.y + (Math.random() - 0.5) * field.height;
        }

        // Check safe zone around stations
        let inSafeZone = false;
        for (const station of this.stations) {
          const dx = ax - station.x;
          const dy = ay - station.y;
          if (Math.sqrt(dx * dx + dy * dy) < station.safeZoneRadius) {
            inSafeZone = true;
            break;
          }
        }
        if (inSafeZone) continue;

        // Pick size
        let size;
        if (field.size === 'mixed') {
          size = sizes[Math.floor(Math.random() * 3)];
        } else {
          size = field.size;
        }

        const asteroid = new Asteroid(ax, ay, size, field.resourceType);
        this.asteroids.push(asteroid);
      }
    }

    // Spawn enemies from zone definitions
    this._spawnEnemies();

    // Spawn ambient drifting debris throughout the world
    this._spawnDebris();

    // Spawn NPC traffic — gives the world life
    this._spawnNPCs();

    // Initial beacon to greet new players
    this._beaconSpawnTimer = 20;
  }

  _spawnRandomBeacon() {
    // Place in free zone, away from station center
    const center = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
    const angle = Math.random() * Math.PI * 2;
    const dist = 1500 + Math.random() * 1500;
    const x = center.x + Math.cos(angle) * dist;
    const y = center.y + Math.sin(angle) * dist;
    // 60% reward, 40% trap — favor the player
    const kind = Math.random() < 0.6 ? 'reward' : 'trap';
    this.beacons.push(new Beacon(x, y, kind));
  }

  _spawnNPCs() {
    // Station-to-station traders
    const stationPositions = this.stations.map(s => ({ x: s.x, y: s.y }));

    // 3 traders that loop between station and a far waypoint
    for (let i = 0; i < 3; i++) {
      const startStation = stationPositions[i % stationPositions.length];
      // Create a loop: station → random point in free zone → back
      const looper = [
        { x: startStation.x + 1500, y: startStation.y + 1500 },
        { x: startStation.x - 1500, y: startStation.y + 1200 },
        { x: startStation.x + 1200, y: startStation.y - 1500 },
        { x: startStation.x, y: startStation.y + 2000 },
      ];
      const sx = looper[0].x + (Math.random() - 0.5) * 500;
      const sy = looper[0].y + (Math.random() - 0.5) * 500;
      this.npcShips.push(new NPCShip(sx, sy, 'trader', looper));
    }

    // 5 drifters wandering randomly through free zone
    const freeCenter = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
    for (let i = 0; i < 5; i++) {
      const waypoints = [];
      for (let w = 0; w < 4; w++) {
        const a = Math.random() * Math.PI * 2;
        const d = 1000 + Math.random() * 2000;
        waypoints.push({
          x: freeCenter.x + Math.cos(a) * d,
          y: freeCenter.y + Math.sin(a) * d,
        });
      }
      const sx = waypoints[0].x;
      const sy = waypoints[0].y;
      this.npcShips.push(new NPCShip(sx, sy, 'drifter', waypoints));
    }

    // 4 miners hanging around asteroid fields
    const miningFields = ['junkyardDebris', 'ferroFieldScatter', 'mineShafts', 'gangField'];
    for (const fieldName of miningFields) {
      const field = ASTEROID_FIELDS[fieldName];
      if (!field) continue;
      const waypoints = [];
      for (let w = 0; w < 4; w++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * 600;
        waypoints.push({
          x: field.x + Math.cos(a) * d,
          y: field.y + Math.sin(a) * d,
        });
      }
      this.npcShips.push(new NPCShip(field.x, field.y, 'miner', waypoints));
    }
  }

  _spawnDebris() {
    // ~250 pieces scattered across the world
    const count = 250;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * MAP_WIDTH;
      const y = Math.random() * MAP_HEIGHT;
      // Skip if too close to a station safe zone
      let inSafeZone = false;
      for (const s of this.stations) {
        const dx = x - s.x;
        const dy = y - s.y;
        if (Math.sqrt(dx*dx + dy*dy) < s.safeZoneRadius) {
          inSafeZone = true;
          break;
        }
      }
      if (inSafeZone) continue;
      this.debris.push(new Debris(x, y));
    }
  }

  _spawnEnemies() {
    for (const [, zone] of Object.entries(ZONES)) {
      if (!zone.enemyTypes || zone.enemyCount === 0) continue;

      // Give each enemy its OWN territory in the zone — divide the zone into sectors
      // so enemies don't cluster in the center
      const count = zone.enemyCount;
      for (let i = 0; i < count; i++) {
        // Each enemy gets a unique sector of the zone (evenly distributed)
        const sectorAngle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
        const sectorDist = zone.radius * (0.4 + Math.random() * 0.4); // 40-80% out from center
        const territoryCenter = {
          x: zone.center.x + Math.cos(sectorAngle) * sectorDist,
          y: zone.center.y + Math.sin(sectorAngle) * sectorDist,
        };

        // Pick a random enemy type from the zone's allowed types
        const typeKey = zone.enemyTypes[Math.floor(Math.random() * zone.enemyTypes.length)];
        const tierConfig = ENEMY_TIERS[typeKey];
        if (!tierConfig) continue;

        // Patrol waypoints in this enemy's territory (small loop around territory center)
        const territoryRadius = Math.min(400, zone.radius / 4);
        const waypoints = [];
        const wpCount = 3 + Math.floor(Math.random() * 2);
        for (let w = 0; w < wpCount; w++) {
          const wa = (w / wpCount) * Math.PI * 2 + Math.random() * 0.5;
          const wd = territoryRadius * (0.5 + Math.random() * 0.5);
          waypoints.push({
            x: territoryCenter.x + Math.cos(wa) * wd,
            y: territoryCenter.y + Math.sin(wa) * wd,
          });
        }

        const enemy = new Enemy(territoryCenter.x, territoryCenter.y, {
          enemyType: tierConfig.health > 60 ? 'heavy' : 'scout',
          waypoints,
        });

        // Override stats from tier config
        enemy.health = tierConfig.health;
        enemy.maxHealth = tierConfig.health;
        enemy.speed = tierConfig.speed;
        enemy.maxSpeed = tierConfig.speed;
        enemy.damage = tierConfig.damage;
        enemy.sensorRange = zone.enemyDetectionRange || tierConfig.sensorRange;
        enemy.attackRange = tierConfig.attackRange;
        enemy.shootRate = tierConfig.shootRate;
        enemy.creditReward = tierConfig.creditReward;
        enemy.projectileDamage = tierConfig.damage;
        enemy.enemyTier = tierConfig.name;
        enemy.territory = territoryCenter; // store for AI use

        this.enemies.push(enemy);
      }
    }
  }

  startGame() {
    this.gameStarted = true;
    this.gameTime = 0;
    this.credits = GAME_CONFIG.PLAYER.STARTING_CREDITS;
    this.score = 0;
    this.difficulty = 1;
    this.isPaused = false;
    this.isGameOver = false;
    this.health = 100;
    this.fuel = 100;
    this.cargoAmount = 0;
    this.tradingActive = false;
    this.currentStation = null;

    // Spawn player near station but outside docking zone
    this.player = new Player(MAP_WIDTH / 2 + 200, MAP_HEIGHT / 2);
    this.asteroids = [];
    this.enemies = [];
    this.stations = [];
    this.projectiles = [];
    this.particles = [];
    this.debris = [];
    this.npcShips = [];
    this.beacons = [];
    this.cargoItems = [];
    this.resources = [];

    // Generate world from map layout
    this._generateWorld();

    // Expose for dev debugging (remove in production)
    window.__gameState = this;
  }

  pauseGame() {
    this.isPaused = !this.isPaused;
  }

  gameOver() {
    if (this.isGameOver) return; // already game over, don't double-fire
    this.isGameOver = true;

    // Determine cause of death from recent events
    let cause = 'destroyed';
    try {
      const log = window.__eventLog;
      if (log?.events?.length) {
        const recent = log.events.slice(-10).reverse();
        const last = recent.find(e => e.category === 'damage' || e.message.includes('suffocat'));
        if (last) cause = last.data?.source || (last.message.includes('suffocat') ? 'suffocation' : 'damage');
      }
      log?.log('death', `Player died — ${cause} | final score ${this.score}`, {
        cause, score: this.score, credits: this.credits, time: Math.floor(this.gameTime),
      });
    } catch (e) {}

    // Calculate final stats
    const finalScore = this.score;
    const creditsEarned = this.credits;
    const timeSurvived = Math.floor(this.gameTime);

    // Save best run to localStorage (persistent across browser reloads)
    let best = { score: 0, credits: 0, time: 0 };
    try {
      best = JSON.parse(localStorage.getItem('smugRunBest') || '{}');
    } catch (e) {}
    const isNewBest = finalScore > (best.score || 0);
    if (isNewBest) {
      try {
        localStorage.setItem('smugRunBest', JSON.stringify({
          score: finalScore,
          credits: creditsEarned,
          time: timeSurvived,
          date: new Date().toISOString(),
        }));
      } catch (e) {}
    }
    this.lastRun = { score: finalScore, credits: creditsEarned, time: timeSurvived, isNewBest, prevBest: best.score || 0 };

    // Update game over screen
    const elements = {
      finalScore: document.getElementById('finalScore'),
      creditsEarned: document.getElementById('creditsEarned'),
      timeSurvived: document.getElementById('timeSurvived'),
      gameOverScreen: document.getElementById('gameOverScreen')
    };

    // Safely update UI elements if they exist
    if (elements.finalScore) elements.finalScore.textContent = finalScore;
    if (elements.creditsEarned) elements.creditsEarned.textContent = creditsEarned;
    if (elements.timeSurvived) elements.timeSurvived.textContent = timeSurvived;
    
    // Show game over screen
    if (elements.gameOverScreen) {
      elements.gameOverScreen.classList.add('active');
    }

    // Wire restart button
    const restartBtn = document.querySelector('.restart-button');
    if (restartBtn) {
      restartBtn.onclick = () => {
        if (elements.gameOverScreen) elements.gameOverScreen.classList.remove('active');
        this.reset();
      };
    }
    const menuBtn = document.querySelector('.main-menu-button');
    if (menuBtn) {
      menuBtn.onclick = () => {
        if (elements.gameOverScreen) elements.gameOverScreen.classList.remove('active');
        window.location.reload();
      };
    }
  }

  updateScore(points) {
    this.score += points;
  }

  updateHealth(amount) {
    this.health = Math.max(0, Math.min(100, this.health + amount));
  }

  updateFuel(amount) {
    this.fuel = Math.max(0, Math.min(100, this.fuel + amount));
  }

  updateCargo(amount) {
    this.cargoAmount = Math.max(0, this.cargoAmount + amount);
  }

  updateCredits(amount) {
    this.credits += amount;
  }
  
  // Methods to add game objects with validation
  addProjectile(projectile) {
    if (projectile) {
      this.projectiles.push(projectile);
    }
  }
  
  addParticle(particle) {
    if (particle) {
      this.particles.push(particle);
    }
  }
  
  addCargo(cargo) {
    if (cargo) {
      this.cargoItems.push(cargo);
    }
  }
  
  addEnemy(enemy) {
    if (enemy) {
      this.enemies.push(enemy);
    }
  }
  
  addAsteroid(asteroid) {
    if (asteroid) {
      this.asteroids.push(asteroid);
    }
  }
  
  addResource(resource) {
    if (resource) {
      this.resources.push(resource);
    }
  }

  addStation(station) {
    if (station) {
      this.stations.push(station);
    }
  }
  
  // Reset method for restarting game
  reset() {
    this.startGame();
  }

  /**
   * Get cargo item count for tests and external access
   */
  getCargoCount() {
    return this.cargoAmount;
  }
}
