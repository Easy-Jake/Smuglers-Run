import { GameInitializer } from './core/GameInitializer.js';

// Create and initialize the game
const gameInitializer = new GameInitializer();

// Start the game
gameInitializer.initialize().catch(error => {
  console.error('Failed to start game:', error);
  // Handle fatal error (e.g., show error screen)
}); 