/**
 * Game asset configurations
 *
 * This file defines all game assets and their properties.
 * Assets are organized by type and scene for efficient loading.
 */

export const ASSETS = {
  // Common assets used across multiple scenes
  common: {
    // UI elements
    'ui/button': {
      type: 'image',
      url: 'assets/ui/button.png',
    },
    'ui/button-hover': {
      type: 'image',
      url: 'assets/ui/button-hover.png',
    },
    'ui/background': {
      type: 'image',
      url: 'assets/ui/background.png',
    },
    'ui/loading-bar': {
      type: 'image',
      url: 'assets/ui/loading-bar.png',
    },

    // Audio
    'audio/background-music': {
      type: 'audio',
      url: 'assets/audio/background-music.mp3',
      loop: true,
    },
    'audio/click': {
      type: 'audio',
      url: 'assets/audio/click.mp3',
    },
    'audio/hover': {
      type: 'audio',
      url: 'assets/audio/hover.mp3',
    },
  },

  // Main menu scene assets
  mainMenu: {
    'menu/title': {
      type: 'image',
      url: 'assets/menu/title.png',
    },
    'menu/start-button': {
      type: 'image',
      url: 'assets/menu/start-button.png',
    },
    'menu/options-button': {
      type: 'image',
      url: 'assets/menu/options-button.png',
    },
    'menu/credits-button': {
      type: 'image',
      url: 'assets/menu/credits-button.png',
    },
  },

  // Game scene assets
  game: {
    // Player assets
    'player/ship': {
      type: 'image',
      url: 'assets/player/ship.png',
    },
    'player/thrust': {
      type: 'image',
      url: 'assets/player/thrust.png',
    },
    'player/shield': {
      type: 'image',
      url: 'assets/player/shield.png',
    },

    // Enemy assets
    'enemy/ship': {
      type: 'image',
      url: 'assets/enemy/ship.png',
    },
    'enemy/explosion': {
      type: 'image',
      url: 'assets/enemy/explosion.png',
    },

    // Projectile assets
    'projectile/player': {
      type: 'image',
      url: 'assets/projectile/player.png',
    },
    'projectile/enemy': {
      type: 'image',
      url: 'assets/projectile/enemy.png',
    },

    // Station assets
    'station/base': {
      type: 'image',
      url: 'assets/station/base.png',
    },
    'station/dock': {
      type: 'image',
      url: 'assets/station/dock.png',
    },

    // Audio
    'audio/engine': {
      type: 'audio',
      url: 'assets/audio/engine.mp3',
      loop: true,
    },
    'audio/shoot': {
      type: 'audio',
      url: 'assets/audio/shoot.mp3',
    },
    'audio/explosion': {
      type: 'audio',
      url: 'assets/audio/explosion.mp3',
    },
    'audio/dock': {
      type: 'audio',
      url: 'assets/audio/dock.mp3',
    },
  },

  // Trading scene assets
  trading: {
    'trading/background': {
      type: 'image',
      url: 'assets/trading/background.png',
    },
    'trading/item-frame': {
      type: 'image',
      url: 'assets/trading/item-frame.png',
    },
    'trading/button-buy': {
      type: 'image',
      url: 'assets/trading/button-buy.png',
    },
    'trading/button-sell': {
      type: 'image',
      url: 'assets/trading/button-sell.png',
    },
  },
};

/**
 * Get all assets for a specific scene
 * @param {string} scene - Scene identifier
 * @returns {Object} Scene assets
 */
export function getSceneAssets(scene) {
  return {
    ...ASSETS.common,
    ...ASSETS[scene],
  };
}

/**
 * Get total number of assets
 * @returns {number} Total number of assets
 */
export function getTotalAssetCount() {
  let count = 0;
  for (const scene of Object.values(ASSETS)) {
    count += Object.keys(scene).length;
  }
  return count;
}

/**
 * Get asset type
 * @param {string} key - Asset key
 * @returns {string} Asset type
 */
export function getAssetType(key) {
  for (const scene of Object.values(ASSETS)) {
    if (scene[key]) {
      return scene[key].type;
    }
  }
  return null;
}

/**
 * Get asset URL
 * @param {string} key - Asset key
 * @returns {string} Asset URL
 */
export function getAssetUrl(key) {
  for (const scene of Object.values(ASSETS)) {
    if (scene[key]) {
      return scene[key].url;
    }
  }
  return null;
}
