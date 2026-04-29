/**
 * Class for visualizing performance metrics as graphs
 */
export class PerformanceGraph {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = {
      width: options.width || 300,
      height: options.height || 150,
      padding: options.padding || 20,
      maxDataPoints: options.maxDataPoints || 60, // 1 second at 60fps
      colors: {
        insert: '#00ff00',
        query: '#ffff00',
        collision: '#ff0000',
        total: '#ffffff',
        background: 'rgba(0, 0, 0, 0.7)',
        grid: 'rgba(255, 255, 255, 0.1)',
      },
    };

    // Initialize data arrays
    this.data = {
      insertTime: [],
      queryTime: [],
      collisionTime: [],
      totalTime: [],
      checksPerFrame: [],
      collisionsPerFrame: [],
    };

    // Set canvas size
    this.resize();
  }

  /**
   * Resize the canvas
   */
  resize() {
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
  }

  /**
   * Add a new data point
   * @param {Object} metrics - Performance metrics
   */
  addDataPoint(metrics) {
    // Add new data points
    this.data.insertTime.push(metrics.insertTime);
    this.data.queryTime.push(metrics.queryTime);
    this.data.collisionTime.push(metrics.collisionTime);
    this.data.totalTime.push(metrics.totalTime);
    this.data.checksPerFrame.push(metrics.averageChecksPerFrame);
    this.data.collisionsPerFrame.push(metrics.averageCollisionsPerFrame);

    // Remove old data points if exceeding max
    Object.keys(this.data).forEach(key => {
      if (this.data[key].length > this.options.maxDataPoints) {
        this.data[key].shift();
      }
    });
  }

  /**
   * Draw the performance graphs
   */
  draw() {
    const ctx = this.ctx;
    const { width, height, padding, colors } = this.options;

    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    this.drawGrid();

    // Calculate scales
    const maxTime = Math.max(
      ...this.data.insertTime,
      ...this.data.queryTime,
      ...this.data.collisionTime,
      ...this.data.totalTime
    );
    const timeScale = (height - padding * 2) / maxTime;

    const maxChecks = Math.max(...this.data.checksPerFrame);
    const checksScale = (height - padding * 2) / maxChecks;

    // Draw time metrics
    this.drawLine(this.data.insertTime, colors.insert, timeScale);
    this.drawLine(this.data.queryTime, colors.query, timeScale);
    this.drawLine(this.data.collisionTime, colors.collision, timeScale);
    this.drawLine(this.data.totalTime, colors.total, timeScale);

    // Draw legend
    this.drawLegend();
  }

  /**
   * Draw the grid
   * @private
   */
  drawGrid() {
    const ctx = this.ctx;
    const { width, height, padding, colors } = this.options;

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = padding; x < width - padding; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = padding; y < height - padding; y += 30) {
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
  }

  /**
   * Draw a line graph
   * @private
   * @param {number[]} data - Data points
   * @param {string} color - Line color
   * @param {number} scale - Scale factor
   */
  drawLine(data, color, scale) {
    const ctx = this.ctx;
    const { width, height, padding } = this.options;

    if (data.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    const xStep = (width - padding * 2) / (this.options.maxDataPoints - 1);
    data.forEach((value, index) => {
      const x = padding + index * xStep;
      const y = height - padding - value * scale;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }

  /**
   * Draw the legend
   * @private
   */
  drawLegend() {
    const ctx = this.ctx;
    const { colors } = this.options;

    const legendItems = [
      { color: colors.insert, label: 'Insert' },
      { color: colors.query, label: 'Query' },
      { color: colors.collision, label: 'Collision' },
      { color: colors.total, label: 'Total' },
    ];

    ctx.font = '10px monospace';
    ctx.textAlign = 'left';

    legendItems.forEach((item, index) => {
      const y = 15 + index * 15;

      // Draw color indicator
      ctx.fillStyle = item.color;
      ctx.fillRect(10, y - 8, 8, 8);

      // Draw label
      ctx.fillStyle = '#fff';
      ctx.fillText(item.label, 25, y);
    });
  }

  /**
   * Clear all data
   */
  clear() {
    Object.keys(this.data).forEach(key => {
      this.data[key] = [];
    });
  }
}
