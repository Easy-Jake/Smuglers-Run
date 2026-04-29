import { GAME_CONFIG } from './config/gameConfig.js';
import { Player } from '../entities/Player.js';
import { Asteroid } from '../entities/Asteroid.js';
import { Ship as EnemyShip } from '../entities/Ship.js';
import { Station } from '../entities/Station.js';
import { Cargo } from '../entities/Cargo.js';

export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    // Game objects
    this.player = null;
    this.asteroids = [];
    this.enemies = [];
    this.stations = [];
    this.projectiles = [];
    this.particles = [];
    this.cargo = [];

    // Game state
    this.camera = { x: 0, y: 0 };
    this.gameTime = 0;
    this.paused = false;
    this.gameStarted = false;
    this.gameLoopStarted = false;

    // Player state
    this.playerName = '';
    this.credits = GAME_CONFIG.PLAYER.STARTING_CREDITS;

    // World state
    this.wave = 1;
    this.tradingActive = false;
    this.currentStation = null;
    this.currentSector = 1;
    this.sectors = [{ id: 1, name: 'Alpha', x: 0, y: 0 }];
  }

  initializeGameObjects(playerX, playerY) {
    // Initialize player
    this.player = new Player(playerX, playerY);

    // Initialize stations
    const numStations = GAME_CONFIG.STATIONS.COUNT;
    for (let i = 0; i < numStations; i++) {
      const x = Math.random() * GAME_CONFIG.WORLD.SIZE;
      const y = Math.random() * GAME_CONFIG.WORLD.SIZE;
      this.stations.push(new Station(x, y));
    }

    // Initialize asteroids
    const numAsteroids = GAME_CONFIG.ASTEROIDS.INITIAL_COUNT;
    for (let i = 0; i < numAsteroids; i++) {
      const x = Math.random() * GAME_CONFIG.WORLD.SIZE;
      const y = Math.random() * GAME_CONFIG.WORLD.SIZE;
      this.asteroids.push(new Asteroid(x, y));
    }

    // Initialize enemies
    const numEnemies = GAME_CONFIG.ENEMIES.INITIAL_COUNT;
    for (let i = 0; i < numEnemies; i++) {
      const x = Math.random() * GAME_CONFIG.WORLD.SIZE;
      const y = Math.random() * GAME_CONFIG.WORLD.SIZE;
      this.enemies.push(new EnemyShip(x, y));
    }

    // Initialize cargo
    const numCargo = GAME_CONFIG.CARGO.INITIAL_COUNT;
    for (let i = 0; i < numCargo; i++) {
      const x = Math.random() * GAME_CONFIG.WORLD.SIZE;
      const y = Math.random() * GAME_CONFIG.WORLD.SIZE;
      this.cargo.push(new Cargo(x, y));
    }
  }

  startGame() {
    const worldSize = GAME_CONFIG.WORLD.SIZE;
    this.initializeGameObjects(worldSize / 2, worldSize / 2);
    this.gameStarted = true;
    this.gameLoopStarted = true;
  }

  endGame() {
    this.gameStarted = false;
    this.gameLoopStarted = false;
  }

  togglePause() {
    this.paused = !this.paused;
  }

  update(deltaTime) {
    if (this.paused) return;
    this.gameTime += deltaTime;
  }
}
