import { GAME_CONFIG } from '../config/gameConfig.js';
import { Player } from '../entities/Player.js';
import { Asteroid } from '../entities/Asteroid.js';
import { Station } from '../entities/Station.js';
import { Enemy } from '../entities/Enemy.js';
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
    this.asteroids.forEach(asteroid => asteroid.update(deltaTime));
    this.enemies.forEach(enemy => enemy.update(deltaTime, this));
    this.stations.forEach(station => station.update(deltaTime));
    this.projectiles.forEach(projectile => projectile.update(deltaTime));
    this.particles.forEach(particle => particle.update(deltaTime));
    this.cargoItems.forEach(cargo => cargo.update(deltaTime));
    if (this.resources) this.resources.forEach(r => r.update(deltaTime));

    // Remove inactive objects
    this.projectiles = this.projectiles.filter(p => p.active);
    this.particles = this.particles.filter(p => p.active);
    this.asteroids = this.asteroids.filter(a => a.active);
    this.enemies = this.enemies.filter(e => e.active);
    this.cargoItems = this.cargoItems.filter(c => c.active);
    if (this.resources) this.resources = this.resources.filter(r => r.active);

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
    // Spawn stations from map layout
    for (const stationDef of FIXED_STATIONS) {
      const station = new Station(stationDef.x, stationDef.y, stationDef.type);
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
  }

  _spawnEnemies() {
    for (const [, zone] of Object.entries(ZONES)) {
      if (!zone.enemyTypes || zone.enemyCount === 0) continue;

      for (let i = 0; i < zone.enemyCount; i++) {
        // Pick a random enemy type from the zone's allowed types
        const typeKey = zone.enemyTypes[Math.floor(Math.random() * zone.enemyTypes.length)];
        const tierConfig = ENEMY_TIERS[typeKey];
        if (!tierConfig) continue;

        // Spawn position within zone radius
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * zone.radius * 0.8;
        const sx = zone.center.x + Math.cos(angle) * dist;
        const sy = zone.center.y + Math.sin(angle) * dist;

        // Generate patrol waypoints within zone
        const waypoints = [];
        const wpCount = 3 + Math.floor(Math.random() * 2);
        for (let w = 0; w < wpCount; w++) {
          const wa = Math.random() * Math.PI * 2;
          const wd = Math.random() * zone.radius * 0.7;
          waypoints.push({
            x: zone.center.x + Math.cos(wa) * wd,
            y: zone.center.y + Math.sin(wa) * wd,
          });
        }

        const enemy = new Enemy(sx, sy, {
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
    this.isGameOver = true;
    // Calculate final stats
    const finalScore = this.score;
    const creditsEarned = this.credits;
    const timeSurvived = Math.floor(this.gameTime / 60); // Convert frames to seconds

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
