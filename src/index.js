import { getGameInstance } from './core/Game.js';

// Wait for DOM to be fully loaded before initializing the game
document.addEventListener('DOMContentLoaded', () => {
  // DOM fully loaded
  
  // Make sure all assets are loaded before initializing the game
  window.addEventListener('load', () => {
    // All resources loaded
    
    // Show game UI before initialization to ensure canvas elements are accessible
    const gameUI = document.getElementById('gameUI');
    if (gameUI) {
      gameUI.classList.remove('not-started');
      gameUI.classList.add('started');
    }

    // Short delay to ensure DOM is updated
    setTimeout(() => {
      // Initialize and start the game
      const game = getGameInstance();
      game.initialize()
        .then(() => {
          game.start();
        })
        .catch(error => {
          console.error('Error initializing game:', error);
          // Handle error silently or through proper error handling
        });
    }, 100);
  });
});
