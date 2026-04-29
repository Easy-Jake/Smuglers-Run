// Import GRID_SIZE separately to avoid circular dependencies
import { GRID_SIZE } from './constants.js';
// Import other constants
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  CONSTANTS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GAME_CONSTANTS,
  COSMIC_RESOURCES,
} from './constants.js';

// Calculate quadrant dimensions
const QUADRANT_WIDTH = WORLD_WIDTH / GRID_SIZE;
const QUADRANT_HEIGHT = WORLD_HEIGHT / GRID_SIZE;

// Game State Configuration
export const gameConfig = {
  state: 'start', // "start", "play", "hub", "trading", "jumping", or "gameover"
  camera: { x: 0, y: 0 },
  wave: {
    number: 1,
    timer: 0,
  },
  hubInteraction: {
    active: null,
    checkEnabled: false,
    selectedJumpDestination: null,
  },
  effects: {
    launchDuration: 0, // Frames for launch effect
  },
};

// Game Entities
export const gameEntities = {
  players: [],
  enemies: [],
  asteroids: [],
  projectiles: [],
  resources: [],
  particles: [],
};

// Game World Configuration
export const galaxies = [
  {
    name: 'Milky Way',
    tier: 1,
    jumpCost: 0,
    resourceMultipliers: {
      Hydrogen: 2.0,
      Helium: 1.5,
      Carbon: 1.2,
      Oxygen: 1.0,
      Silicon: 0.8,
    },
    enemyLevel: 1,
    background: '#000022',
  },
  {
    name: 'Andromeda',
    tier: 2,
    jumpCost: 1000,
    resourceMultipliers: {
      Carbon: 2.0,
      Oxygen: 1.8,
      Silicon: 1.5,
      Iron: 1.2,
      Copper: 1.0,
    },
    enemyLevel: 2,
    background: '#002222',
  },
  // ... Add other galaxies here
];

// Create immutable game world object
const gameWorld = {
  hubs: [
    { x: 400, y: 400, size: 40, type: 'trading' },
    { x: 2000, y: 2000, size: 40, type: 'upgrade' },
    { x: 1200, y: 1200, size: 40, type: 'jumpgate' },
  ],
  quadrants: []
};

// Generate game world quadrants
for (let y = 0; y < GRID_SIZE; y++) {
  for (let x = 0; x < GRID_SIZE; x++) {
    gameWorld.quadrants.push({
      x: x * QUADRANT_WIDTH,
      y: y * QUADRANT_HEIGHT,
      width: QUADRANT_WIDTH,
      height: QUADRANT_HEIGHT,
      explored: false,
    });
  }
}

// Private state (module scope)
let _currentGalaxy = galaxies[0];
let _localPlayerId = null;

// Export immutable constants
export const GAME_CONFIG = Object.freeze(GAME_CONSTANTS);

// Getter for current galaxy
export function getCurrentGalaxy() {
  return { ..._currentGalaxy }; // Return a copy to prevent direct mutation
}

// Setter for current galaxy
export function setCurrentGalaxy(galaxy) {
  if (galaxy && galaxies.includes(galaxy)) {
    _currentGalaxy = galaxy;
    return true;
  }
  return false;
}

// Getter for local player ID
export function getLocalPlayerId() {
  return _localPlayerId;
}

// Setter for local player ID
export function setLocalPlayerId(id) {
  _localPlayerId = id;
}

/**
 * Get the game world object
 * @returns {Object} A copy of the game world
 */
export function getGameWorld() {
  return JSON.parse(JSON.stringify(gameWorld)); // Deep copy to prevent mutation
}

/**
 * Get a quadrant at specific coordinates
 * @param {number} x - X coordinate in the world
 * @param {number} y - Y coordinate in the world
 * @returns {Object|null} The quadrant at the given coordinates or null if none found
 */
export function getQuadrantAt(x, y) {
  return gameWorld.quadrants.find(
    q => x >= q.x && x < q.x + q.width && y >= q.y && y < q.y + q.height
  );
}

/**
 * Mark a quadrant as explored
 * @param {number} index - The index of the quadrant to mark as explored
 * @returns {boolean} Whether the operation was successful
 */
export function markQuadrantAsExplored(index) {
  if (index >= 0 && index < gameWorld.quadrants.length) {
    gameWorld.quadrants[index].explored = true;
    return true;
  }
  return false;
}

/**
 * Get quadrant index from world coordinates
 * @param {number} x - X coordinate in the world
 * @param {number} y - Y coordinate in the world
 * @returns {number} The index of the quadrant or -1 if not found
 */
export function getQuadrantIndex(x, y) {
  return gameWorld.quadrants.findIndex(
    q => x >= q.x && x < q.x + q.width && y >= q.y && y < q.y + q.height
  );
}
