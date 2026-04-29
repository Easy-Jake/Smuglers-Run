/**
 * Map layout configuration - ported from Asteroid Driver
 * Defines asteroid fields, station positions, and safe zones.
 */

export const MAP_WIDTH = 8000;
export const MAP_HEIGHT = 8000;

export const ASTEROID_FIELDS = {
  center: {
    name: 'Center',
    x: 3500, y: 3500,
    width: 2000, height: 2000,
    radius: 2000,
    count: 40,
    size: 'mixed',
    pattern: 'scattered',
  },
  topLeft: {
    name: 'Top Left',
    x: 1200, y: 1200,
    width: 1300, height: 1300,
    radius: 800,
    count: 18,
    size: 'small',
    pattern: 'scattered',
  },
  topRight: {
    name: 'Top Right',
    x: 6000, y: 1500,
    width: 1200, height: 1200,
    radius: 1200,
    count: 15,
    size: 'medium',
    pattern: 'scattered',
  },
  bottomRight: {
    name: 'Bottom Right',
    x: 6000, y: 6000,
    width: 1500, height: 1500,
    radius: 1000,
    count: 20,
    size: 'large',
    pattern: 'scattered',
  },
  bottomLeft: {
    name: 'Bottom Left',
    x: 1500, y: 6000,
    width: 1200, height: 1200,
    radius: 1100,
    count: 20,
    size: 'mixed',
    pattern: 'scattered',
  },
  north: {
    name: 'North Field',
    x: 3000, y: 1500,
    width: 2000, height: 1200,
    radius: 1200,
    count: 25,
    size: 'mixed',
    pattern: 'scattered',
  },
  northCentral: {
    name: 'North Central',
    x: 4200, y: 800,
    width: 1800, height: 1400,
    radius: 1000,
    count: 18,
    size: 'mixed',
    pattern: 'scattered',
  },
  ring: {
    name: 'Ring',
    x: 4000, y: 4000,
    width: 2000, height: 2000,
    radius: 3000,
    innerRadius: 2000,
    count: 30,
    size: 'mixed',
    pattern: 'ring',
  },
};

export const FIXED_STATIONS = [
  { id: 'station_central', x: 4000, y: 4000, type: 'trading' },
];

export const MAP_CONFIG = {
  dimensions: { width: MAP_WIDTH, height: MAP_HEIGHT },
  asteroidFields: ASTEROID_FIELDS,
  stations: FIXED_STATIONS,
};
