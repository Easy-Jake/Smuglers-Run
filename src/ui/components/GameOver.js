export class GameOver {
  constructor() {
    this.screen = document.getElementById('gameOverScreen');
    this.scoreDisplay = this.screen.querySelector('.score-display');
    this.highScoreDisplay = this.screen.querySelector('.high-score-display');
    this.restartButton = this.screen.querySelector('.restart-button');
    this.mainMenuButton = this.screen.querySelector('.main-menu-button');
  }

  update(gameState) {
    if (!gameState.gameOver) return;

    // Update score displays
    this.scoreDisplay.textContent = `Score: ${gameState.score}`;
    this.highScoreDisplay.textContent = `High Score: ${gameState.highScore}`;

    // Show the screen
    this.show();
  }

  render() {
    // Game over screen is rendered using DOM elements, no canvas rendering needed
  }

  show() {
    this.screen.style.display = 'block';
  }

  hide() {
    this.screen.style.display = 'none';
  }

  addEventListeners(onRestart, onMainMenu) {
    this.restartButton.addEventListener('click', () => {
      this.hide();
      onRestart();
    });

    this.mainMenuButton.addEventListener('click', () => {
      this.hide();
      onMainMenu();
    });
  }
}
