/**
 * Enumeration of all possible event types in the game.
 * This provides type safety and autocompletion for event handling.
 */
export const EventTypes = {
  // Game state events
  GAME_START: 'gameStart',
  GAME_PAUSE: 'gamePause',
  GAME_RESUME: 'gameResume',
  GAME_OVER: 'gameOver',
  GAME_RESET: 'gameReset',

  // Entity events
  ENTITY_CREATED: 'entityCreated',
  ENTITY_DESTROYED: 'entityDestroyed',
  ENTITY_UPDATED: 'entityUpdated',
  ENTITY_COLLISION: 'entityCollision',

  // Player events
  PLAYER_SPAWNED: 'playerSpawned',
  PLAYER_DIED: 'playerDied',
  PLAYER_DAMAGED: 'playerDamaged',
  PLAYER_HEALED: 'playerHealed',
  PLAYER_LEVEL_UP: 'playerLevelUp',

  // Combat events
  PROJECTILE_FIRED: 'projectileFired',
  PROJECTILE_HIT: 'projectileHit',
  EXPLOSION: 'explosion',
  DAMAGE_DEALT: 'damageDealt',
  DAMAGE_RECEIVED: 'damageReceived',

  // Resource events
  RESOURCE_COLLECTED: 'resourceCollected',
  RESOURCE_DEPOSITED: 'resourceDeposited',
  CREDITS_EARNED: 'creditsEarned',
  CREDITS_SPENT: 'creditsSpent',

  // Station events
  STATION_DOCKED: 'stationDocked',
  STATION_UNDOCKED: 'stationUndocked',
  TRADING_STARTED: 'tradingStarted',
  TRADING_ENDED: 'tradingEnded',
  ITEM_PURCHASED: 'itemPurchased',
  ITEM_SOLD: 'itemSold',

  // UI events
  UI_SHOW: 'uiShow',
  UI_HIDE: 'uiHide',
  UI_UPDATE: 'uiUpdate',
  MENU_OPEN: 'menuOpen',
  MENU_CLOSE: 'menuClose',

  // Audio events
  SOUND_PLAYED: 'soundPlayed',
  MUSIC_STARTED: 'musicStarted',
  MUSIC_STOPPED: 'musicStopped',
  VOLUME_CHANGED: 'volumeChanged',

  // Input events
  KEY_PRESSED: 'keyPressed',
  KEY_RELEASED: 'keyReleased',
  MOUSE_MOVED: 'mouseMoved',
  MOUSE_CLICKED: 'mouseClicked',
  MOUSE_RELEASED: 'mouseReleased',

  // Debug events
  DEBUG_TOGGLED: 'debugToggled',
  PERFORMANCE_METRICS: 'performanceMetrics',
  ERROR_OCCURRED: 'errorOccurred',
};

/**
 * Type guard to check if a string is a valid event type
 * @param {string} type - The type to check
 * @returns {boolean} Whether the type is valid
 */
export function isValidEventType(type) {
  return Object.values(EventTypes).includes(type);
}

/**
 * Get all event types as an array
 * @returns {string[]} Array of event types
 */
export function getAllEventTypes() {
  return Object.values(EventTypes);
}
