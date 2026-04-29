export const WORLD_WIDTH = 10000;
export const WORLD_HEIGHT = 10000;

export const FUEL_CELL_TYPES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
};

export const FUEL_CELL_CAPACITIES = {
  [FUEL_CELL_TYPES.SMALL]: 100,
  [FUEL_CELL_TYPES.MEDIUM]: 250,
  [FUEL_CELL_TYPES.LARGE]: 500,
};

export const FUEL_CELL_COSTS = {
  [FUEL_CELL_TYPES.SMALL]: 100,
  [FUEL_CELL_TYPES.MEDIUM]: 250,
  [FUEL_CELL_TYPES.LARGE]: 500,
};

export const SHIP_TYPES = {
  FIGHTER: 'fighter',
  CARGO: 'cargo',
  EXPLORER: 'explorer',
};

export const SHIP_STATS = {
  [SHIP_TYPES.FIGHTER]: {
    speed: 5,
    handling: 8,
    cargo: 100,
    weapons: 3,
  },
  [SHIP_TYPES.CARGO]: {
    speed: 3,
    handling: 5,
    cargo: 500,
    weapons: 1,
  },
  [SHIP_TYPES.EXPLORER]: {
    speed: 4,
    handling: 7,
    cargo: 200,
    weapons: 2,
  },
};

export const SHIP_COSTS = {
  [SHIP_TYPES.FIGHTER]: 1000,
  [SHIP_TYPES.CARGO]: 2000,
  [SHIP_TYPES.EXPLORER]: 1500,
};

export const COSMIC_RESOURCES = [
  {
    name: 'Iron',
    rarity: 1,
    value: 10,
    color: '#888',
  },
  {
    name: 'Copper',
    rarity: 1,
    value: 15,
    color: '#b87333',
  },
  {
    name: 'Silver',
    rarity: 2,
    value: 25,
    color: '#c0c0c0',
  },
  {
    name: 'Gold',
    rarity: 2,
    value: 40,
    color: '#ffd700',
  },
  {
    name: 'Platinum',
    rarity: 3,
    value: 60,
    color: '#e5e4e2',
  },
  {
    name: 'Crystal',
    rarity: 3,
    value: 80,
    color: '#00ffff',
  },
  {
    name: 'Exotic Matter',
    rarity: 4,
    value: 100,
    color: '#ff00ff',
  },
];

export const CONSTANTS = {
  PLAYER: {
    MAX_HEALTH: 100,
    MAX_AMMO: 100,
  },
};
