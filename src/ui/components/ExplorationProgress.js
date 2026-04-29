/**
 * UI Component that displays exploration progress
 */
export class ExplorationProgress {
  /**
   * Create a new ExplorationProgress component
   * @param {Object} options - Component configuration
   * @param {string} options.containerId - ID of HTML container element
   * @param {boolean} options.showPercentage - Whether to show percentage
   * @param {boolean} options.showCount - Whether to show count of explored quadrants
   */
  constructor(options = {}) {
    this.containerId = options.containerId || 'exploration-progress';
    this.showPercentage = options.showPercentage !== undefined ? options.showPercentage : true;
    this.showCount = options.showCount !== undefined ? options.showCount : true;
    
    // Stats
    this.explored = 0;
    this.total = 0;
    this.percentage = 0;
    
    // DOM references
    this.container = null;
    this.progressBar = null;
    this.percentageText = null;
    this.countText = null;
    
    // Create UI
    this.initialize();
  }
  
  /**
   * Initialize the UI elements
   * @private
   */
  initialize() {
    try {
      // Create container if it doesn't exist
      this.container = document.getElementById(this.containerId);
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = this.containerId;
        this.container.className = 'exploration-progress';
        document.body.appendChild(this.container);
      }
      
      // Create UI elements
      this.container.innerHTML = `
        <div class="exploration-header">Map Exploration</div>
        <div class="exploration-progress-bar">
          <div class="exploration-progress-fill" style="width: 0%"></div>
        </div>
        ${this.showPercentage ? '<div class="exploration-percentage">0%</div>' : ''}
        ${this.showCount ? '<div class="exploration-count">0 / 0 Quadrants</div>' : ''}
      `;
      
      // Get references to elements
      this.progressBar = this.container.querySelector('.exploration-progress-fill');
      this.percentageText = this.container.querySelector('.exploration-percentage');
      this.countText = this.container.querySelector('.exploration-count');
      
      // Add CSS
      this.addStyles();
    } catch (error) {
      console.error('ExplorationProgress: Failed to initialize UI component', error);
    }
  }
  
  /**
   * Add required CSS styles
   * @private
   */
  addStyles() {
    try {
      const styleId = 'exploration-progress-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .exploration-progress {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid #444;
            border-radius: 4px;
            padding: 10px;
            width: 200px;
            font-family: 'Arial', sans-serif;
            color: #fff;
            z-index: 1000;
          }
          
          .exploration-header {
            font-size: 14px;
            margin-bottom: 5px;
            color: #aaa;
          }
          
          .exploration-progress-bar {
            height: 8px;
            background: #222;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 5px;
          }
          
          .exploration-progress-fill {
            height: 100%;
            background: linear-gradient(to right, #0066ff, #00ccff);
            width: 0%;
            transition: width 0.3s ease-in-out;
          }
          
          .exploration-percentage {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
          }
          
          .exploration-count {
            font-size: 12px;
            color: #aaa;
            text-align: center;
          }
        `;
        document.head.appendChild(style);
      }
    } catch (error) {
      console.error('ExplorationProgress: Failed to add styles', error);
    }
  }
  
  /**
   * Update the exploration progress display
   * @param {Object} stats - Exploration statistics
   * @param {number} stats.explored - Number of explored quadrants
   * @param {number} stats.total - Total number of quadrants
   * @param {number} stats.percentage - Percentage of explored quadrants
   */
  update(stats) {
    if (!stats) return;
    
    try {
      this.explored = stats.explored || 0;
      this.total = stats.total || 1; // Avoid division by zero
      this.percentage = stats.percentage || (this.explored / this.total * 100);
      
      // Update UI
      if (this.progressBar) {
        this.progressBar.style.width = `${this.percentage}%`;
      }
      
      if (this.percentageText) {
        this.percentageText.textContent = `${Math.round(this.percentage)}%`;
      }
      
      if (this.countText) {
        this.countText.textContent = `${this.explored} / ${this.total} Quadrants`;
      }
    } catch (error) {
      console.error('ExplorationProgress: Failed to update UI', error);
    }
  }
  
  /**
   * Show the exploration progress UI
   */
  show() {
    try {
      if (this.container) {
        this.container.style.display = 'block';
      }
    } catch (error) {
      console.error('ExplorationProgress: Failed to show UI', error);
    }
  }
  
  /**
   * Hide the exploration progress UI
   */
  hide() {
    try {
      if (this.container) {
        this.container.style.display = 'none';
      }
    } catch (error) {
      console.error('ExplorationProgress: Failed to hide UI', error);
    }
  }
} 