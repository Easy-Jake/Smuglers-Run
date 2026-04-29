// Grid Configuration - Define this first
export const GRID_SIZE = 24; // Explicitly define GRID_SIZE with a reasonable value

// Canvas and World Dimensions
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 800;
export const WORLD_WIDTH = 2400; // 3x the canvas size
export const WORLD_HEIGHT = 2400; // 3x the canvas size

// Derived grid dimensions
export const QUADRANT_WIDTH = WORLD_WIDTH / GRID_SIZE;
export const QUADRANT_HEIGHT = WORLD_HEIGHT / GRID_SIZE;

// Game Object Counts
export const ASTEROID_COUNT = 120;
export const ENEMY_COUNT = 12;

// Game Timing
export const WAVE_DURATION = 3600; // 60 seconds at 60fps

// Prices
export const FUEL_PRICE = 25; // Credits per unit of fuel

// Debug Settings
export const DEBUG_MODE = false;

// Game Constants
export const GAME_CONSTANTS = {
  WORLD: {
    SIZE: 3000,
    GRID_SIZE: 24,
    VISIBLE_AREA: 1200,
  },
  PLAYER: {
    ROTATION_SPEED: 0.05,
    ACCELERATION: 0.2,
    MAX_SPEED: 4,
    STARTING_HEALTH: 100,
    STARTING_FUEL: 100,
    WEAPON_COOLDOWN: 15,
    MAX_AMMO: 50,
  },
  GAME: {
    FRICTION: 0.995,
    ASTEROID_COUNT: 150,
    ENEMY_COUNT: 15,
    STATION_COUNT: 3,
    CARGO_COUNT: 40,
  },
  CONTROLS: {
    MOVEMENT: {
      UP: ['w', 'ArrowUp'],
      DOWN: ['s', 'ArrowDown'],
      LEFT: ['a', 'ArrowLeft'],
      RIGHT: ['d', 'ArrowRight'],
    },
    SHOOT: 'Space',
    BOOST: 'Shift',
    INTERACT: 'e',
  },
  SHIP: {
    BOOST: {
      FUEL_COST: 0.5,
      MULTIPLIER: 1.5,
    },
    THRUST: {
      FUEL_COST: 0.2,
    },
  },
};

// Resource Types
export const COSMIC_RESOURCES = [
  { name: 'Hydrogen', baseValue: 10, rarity: 1, color: '#aaccff' },
  { name: 'Helium', baseValue: 20, rarity: 2, color: '#ffeeaa' },
  { name: 'Carbon', baseValue: 30, rarity: 2, color: '#555555' },
  { name: 'Oxygen', baseValue: 40, rarity: 3, color: '#88ffaa' },
  { name: 'Silicon', baseValue: 50, rarity: 3, color: '#aaaaaa' },
  { name: 'Iron', baseValue: 60, rarity: 4, color: '#aa5533' },
  { name: 'Copper', baseValue: 70, rarity: 4, color: '#dd7722' },
  { name: 'Silver', baseValue: 100, rarity: 5, color: '#dddddd' },
  { name: 'Gold', baseValue: 150, rarity: 6, color: '#ffdd22' },
  { name: 'Platinum', baseValue: 200, rarity: 7, color: '#aaddff' },
  { name: 'Iridium', baseValue: 300, rarity: 8, color: '#ffffff' },
  { name: 'Neutronium', baseValue: 500, rarity: 9, color: '#aaffff' },
  { name: 'Dark Matter', baseValue: 1000, rarity: 10, color: '#550055' },
];

// Fuel Cell Types
export const FUEL_CELL_TYPES = [
  {
    name: 'Red Dwarf',
    capacity: 100,
    efficiency: 1.0,
    thrustBonus: 1.0,
    color: '#ff5533',
    cost: 0, // Starting cell
  },
  {
    name: 'Blue Giant',
    capacity: 200,
    efficiency: 1.2,
    thrustBonus: 1.1,
    color: '#3388ff',
    cost: 500,
  },
  {
    name: 'Neutron Star',
    capacity: 300,
    efficiency: 1.5,
    thrustBonus: 1.2,
    color: '#88ffff',
    cost: 1500,
  },
  {
    name: 'Pulsar',
    capacity: 500,
    efficiency: 2.0,
    thrustBonus: 1.3,
    color: '#ff88ff',
    cost: 3000,
  },
  {
    name: 'Black Hole',
    capacity: 1000,
    efficiency: 3.0,
    thrustBonus: 1.5,
    color: '#550088',
    cost: 10000,
  },
];

export const CONSTANTS = {
  PLAYER: {
    MAX_SPEED: 5,
    ACCELERATION: 0.2,
    ROTATION_SPEED: 0.1,
    MAX_HEALTH: 100,
    MAX_FUEL: 100,
    MAX_CARGO: 100,
  },
  GAME: {
    WORLD_SIZE: 2000,
    ASTEROID_COUNT: 20,
    ENEMY_COUNT: 5,
    GRID_SIZE: 24, // Also include it here as a fallback
  },
  PRICES: {
    FUEL: 25,
    CARGO: 50,
  },
};
