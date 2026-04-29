import { TradeInterface } from './components/TradeInterface.js';
import { GameOver } from './components/GameOver.js';
import { HUD } from './components/HUD.js';
import { MainMenu } from './components/MainMenu.js';
import { Options } from './components/Options.js';
import { Credits } from './components/Credits.js';
import { PauseMenu } from './components/PauseMenu.js';
import { LoadingScreen } from './components/LoadingScreen.js';
import { EventTypes } from '../ecs/events/EventTypes.js';

/**
 * Manages all UI operations and DOM manipulation.
 *
 * This class centralizes all UI-related operations and provides a clean interface
 * for managing game UI elements. It handles:
 * - UI element creation and management
 * - Screen transitions
 * - HUD updates
 * - Menu management
 * - UI state management
 */
export class UIManager {
  /** @private Map of UI elements */
  #elements;
  /** @private Current active screen */
  #activeScreen;
  /** @private Game state reference */
  #gameState;
  /** @private Whether debug mode is enabled */
  #debug;
  /** @private UI update queue */
  #updateQueue;
  /** @private Whether UI updates are active */
  #isUpdating;
  /** @private Update screen method */
  #updateScreen;
  /** @private Game UI container */
  #container;

  /**
   * Create a new UI manager
   * @param {GameState} gameState - Reference to game state
   * @param {Object} options - UI options
   * @param {boolean} options.debug - Whether debug mode is enabled
   */
  constructor(gameState, options = {}) {
    this.#elements = new Map();
    this.#activeScreen = null;
    this.#gameState = gameState;
    this.#debug = options.debug ?? false;
    this.#updateQueue = [];
    this.#isUpdating = false;
    
    // Initialize update screen method
    this.#updateScreen = (value) => {
      const element = this.getElement('screen');
      if (element) {
        element.textContent = value;
      }
    };
    
    // Initialize UI
    this.initialize();
  }

  /**
   * Initialize the UI manager
   */
  initialize() {
    // Instead of creating elements that should already exist in DOM,
    // we'll find them and store references
    this.#findElements();
    this.#setupEventListeners();
    this.#startUpdateLoop();
  }

  /**
   * Find and store UI elements
   * @private
   */
  #findElements() {
    this.#container = document.getElementById('gameUI');
    if (!this.#container) {
      console.warn('Game UI container not found, creating one');
      this.#container = document.createElement('div');
      this.#container.id = 'gameUI';
      this.#container.className = 'game-ui';
      document.body.appendChild(this.#container);
    }
    
    // Create element if it doesn't exist
    const ensureElement = (id, type = 'div', className = '') => {
      let element = document.getElementById(id);
      
      if (!element) {
        // For development purposes, create minimal UI elements if they don't exist
        console.info(`Creating missing UI element: ${id}`);
        element = document.createElement(type);
        element.id = id;
        
        if (className) {
          element.className = className;
        }
        
        // For buttons, set appropriate type and text
        if (type === 'button') {
          element.textContent = id.replace('Button', '');
          element.style.display = 'none'; // Hide by default
        }
        
        this.#container.appendChild(element);
      }
      
      return element;
    };
    
    // List of elements to find/create
    const elementsToFind = [
      // Game screens
      'mainMenuScreen', 'gameOverScreen', 'optionsScreen', 'creditsScreen',
      
      // HUD elements
      'score', 'health', 'fuel', 'cargo', 'credits',
      
      // Trade screen
      'loadScreen', 'exitUpgrade',
      
      // Buttons
      ['startButton', 'button', 'start-button'],
      ['restartButton', 'button', 'restart-button'],
      ['muteButton', 'button', 'mute-button'],
      ['musicVolume', 'input'],
      ['sfxVolume', 'input']
    ];
    
    // Find each element
    for (const item of elementsToFind) {
      if (Array.isArray(item)) {
        const [id, type, className] = item;
        const element = ensureElement(id, type, className);
        this.#elements.set(id, element);
      } else {
        const element = ensureElement(item);
        this.#elements.set(item, element);
      }
    }
  }

  /**
   * Setup event listeners
   * @private
   */
  #setupEventListeners() {
    // Safely add event listener only if element exists
    const safeAddListener = (id, event, handler) => {
      const element = this.#elements.get(id);
      if (element) {
        element.addEventListener(event, handler);
      } else {
        console.warn(`Cannot add listener to non-existent element: ${id}`);
      }
    };

    // Set up button event listeners
    safeAddListener('startButton', 'click', () => {
      this.#gameState.startGame();
      this.showScreen('game');
    });
    
    safeAddListener('restartButton', 'click', () => {
      this.#gameState.startGame();
      this.hideScreen('gameOver');
    });
    
    safeAddListener('exitUpgrade', 'click', () => {
      this.hideTradingMenu();
    });
    
    safeAddListener('muteButton', 'click', () => {
      // Mute toggle functionality would go here
    });
    
    // Volume controls
    safeAddListener('musicVolume', 'input', (e) => {
      // Music volume control
    });
    
    safeAddListener('sfxVolume', 'input', (e) => {
      // Sound effects volume control
    });
  }

  /**
   * Start the UI update loop
   * @private
   */
  #startUpdateLoop() {
    this.#isUpdating = true;
    this.#updateLoop();
  }

  /**
   * The UI update loop
   * @private
   */
  #updateLoop() {
    if (!this.#isUpdating) return;

    // Process update queue
    while (this.#updateQueue.length > 0) {
      const update = this.#updateQueue.shift();
      this.#processUpdate(update);
    }

    // Request next frame
    requestAnimationFrame(() => this.#updateLoop());
  }

  /**
   * Process a UI update
   * @private
   * @param {Object} update - Update to process
   */
  #processUpdate(update) {
    switch (update.type) {
      case 'health':
        this.#updateHealthBar(update.value);
        break;
      case 'score':
        this.#updateScoreDisplay(update.value);
        break;
      case 'resources':
        this.#updateResourceDisplay(update.value);
        break;
      case 'screen':
        this.#updateScreen(update.value);
        break;
      default:
        console.warn(`Unknown update type: ${update.type}`);
    }
  }

  /**
   * Queue a UI update
   * @param {string} type - Update type
   * @param {any} value - Update value
   */
  queueUpdate(type, value) {
    this.#updateQueue.push({ type, value });
  }

  /**
   * Show a screen
   * @param {string} screen - Screen to show
   */
  showScreen(screen) {
    // Hide current screen
    if (this.#activeScreen) {
      this.hideScreen(this.#activeScreen);
    }

    // Show new screen
    const screenElement = this.#elements.get(`${screen}Screen`);
    if (screenElement) {
      screenElement.classList.remove('hidden');
      this.#activeScreen = screen;
    }
  }

  /**
   * Hide a screen
   * @param {string} screen - Screen to hide
   */
  hideScreen(screen) {
    const screenElement = this.#elements.get(`${screen}Screen`);
    if (screenElement) {
      screenElement.classList.add('hidden');
    }
  }

  /**
   * Update health bar
   * @private
   * @param {number} health - Current health value
   */
  #updateHealthBar(health) {
    const healthBar = this.#elements.get('healthBar');
    const percentage = (health / this.#gameState.player.maxHealth) * 100;
    healthBar.style.width = `${percentage}%`;
  }

  /**
   * Update score display
   * @private
   * @param {number} score - Current score value
   */
  #updateScoreDisplay(score) {
    const scoreDisplay = this.#elements.get('scoreDisplay');
    scoreDisplay.textContent = `Score: ${score}`;
  }

  /**
   * Update resource display
   * @private
   * @param {Object} resources - Current resources
   */
  #updateResourceDisplay(resources) {
    const resourceDisplay = this.#elements.get('resourceDisplay');
    resourceDisplay.innerHTML = Object.entries(resources)
      .map(([resource, amount]) => `${resource}: ${amount}`)
      .join('<br>');
  }

  /**
   * Show game over screen
   * @param {Object} data - Game over data
   */
  showGameOver(data) {
    const gameOverMenu = this.#elements.get('gameOverMenu');
    gameOverMenu.querySelector('#finalScore').textContent = data.score;
    gameOverMenu.querySelector('#timeSurvived').textContent = Math.floor(this.#gameState.gameTime);
    this.showScreen('gameOver');
  }

  /**
   * Show trading menu
   * @param {Object} station - Current station
   */
  showTradingMenu(station) {
    const tradingScreen = this.#elements.get('tradingScreen');
    // Update trading menu content
    this.showScreen('trading');
  }

  /**
   * Hide trading menu
   */
  hideTradingMenu() {
    this.hideScreen('trading');
  }

  /**
   * Reset UI state
   */
  reset() {
    // Clear update queue
    this.#updateQueue = [];

    // Reset all screens
    this.#elements.forEach((element, key) => {
      if (key.endsWith('Screen') || key.endsWith('Menu')) {
        element.classList.add('hidden');
      }
    });

    // Show main menu
    this.showScreen('main');
  }

  /**
   * Update UI state
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Update HUD elements
    this.queueUpdate('health', this.#gameState.player.health);
    this.queueUpdate('score', this.#gameState.score);
    this.queueUpdate('resources', this.#gameState.resources);
  }

  /**
   * Get a UI element
   * @param {string} id - Element ID
   * @returns {HTMLElement} The UI element
   */
  getElement(id) {
    return this.#elements.get(id);
  }

  /**
   * Set whether debug mode is enabled
   * @param {boolean} enabled - Whether debug mode is enabled
   */
  setDebugEnabled(enabled) {
    this.#debug = enabled;
  }

  /**
   * Check if debug mode is enabled
   * @returns {boolean} Whether debug mode is enabled
   */
  isDebugEnabled() {
    return this.#debug;
  }

  /**
   * Clean up UI resources
   */
  dispose() {
    this.#isUpdating = false;
    this.#elements.clear();
  }

  /**
   * Update UI based on game state changes
   * @param {Object} data - Game state data
   */
  updateState(data) {
    if (!data || !data.state) return;
    
    try {
      const state = data.state;
      
      // Handle different game states
      switch (state) {
        case 'start':
          this.showScreen('main');
          break;
        case 'play':
          this.hideScreen('main');
          this.hideScreen('gameOver');
          this.hideScreen('pause');
          break;
        case 'pause':
          this.showScreen('pause');
          break;
        case 'gameover':
          this.showGameOver({
            score: data.score || 0,
            time: data.time || 0
          });
          break;
        case 'hub':
        case 'trading':
        case 'jumping':
          // These states might need specific UI updates
          break;
      }
      
      // Queue updates for HUD elements if they exist in the data
      if (data.health !== undefined) {
        this.queueUpdate('health', data.health);
      }
      
      if (data.score !== undefined) {
        this.queueUpdate('score', data.score);
      }
      
      if (data.resources !== undefined) {
        this.queueUpdate('resources', data.resources);
      }
    } catch (error) {
      console.error('UIManager: Error updating state', error);
    }
  }
}
