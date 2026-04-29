export class PauseMenu {
  constructor() {
    this.screen = document.getElementById('pauseMenuScreen');
    this.resumeButton = this.screen.querySelector('.resume-button');
    this.optionsButton = this.screen.querySelector('.options-button');
    this.mainMenuButton = this.screen.querySelector('.main-menu-button');
    this.isPaused = false;
  }

  update(gameState) {
    if (gameState.gameOver) return;

    // Toggle pause state when Escape key is pressed
    if (gameState.input.isKeyPressed('Escape')) {
      this.togglePause();
    }
  }

  render() {
    // Pause menu is rendered using DOM elements, no canvas rendering needed
  }

  show() {
    this.screen.style.display = 'block';
    this.isPaused = true;
  }

  hide() {
    this.screen.style.display = 'none';
    this.isPaused = false;
  }

  togglePause() {
    if (this.isPaused) {
      this.hide();
    } else {
      this.show();
    }
  }

  addEventListeners(onResume, onOptions, onMainMenu) {
    this.resumeButton.addEventListener('click', () => {
      this.hide();
      onResume();
    });

    this.optionsButton.addEventListener('click', () => {
      this.hide();
      onOptions();
    });

    this.mainMenuButton.addEventListener('click', () => {
      this.hide();
      onMainMenu();
    });
  }

  isGamePaused() {
    return this.isPaused;
  }
}
