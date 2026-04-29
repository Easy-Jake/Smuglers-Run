/**
 * Class for monitoring performance metrics and triggering alerts
 */
export class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      thresholds: {
        insertTime: { warning: 2, critical: 5 }, // ms
        queryTime: { warning: 1, critical: 3 }, // ms
        collisionTime: { warning: 1, critical: 3 }, // ms
        totalTime: { warning: 4, critical: 8 }, // ms
        checksPerFrame: { warning: 100, critical: 200 },
        collisionsPerFrame: { warning: 10, critical: 20 },
      },
      alertCooldown: options.alertCooldown || 5000, // ms
      historySize: options.historySize || 60, // frames
    };

    this.alerts = [];
    this.lastAlertTime = 0;
    this.metricHistory = {
      insertTime: [],
      queryTime: [],
      collisionTime: [],
      totalTime: [],
      checksPerFrame: [],
      collisionsPerFrame: [],
    };
    
    this.isRunning = false;
    this.startTime = 0;
    this.frameCount = 0;
    this.frameStartTime = 0;
    this.currentPhase = null;
    this.phaseStartTime = 0;
  }
  
  /**
   * Start performance monitoring
   * @returns {PerformanceMonitor} This monitor for chaining
   */
  start() {
    this.isRunning = true;
    this.startTime = performance.now();
    this.frameCount = 0;
    this.clear();
    return this;
  }
  
  /**
   * Stop performance monitoring
   * @returns {PerformanceMonitor} This monitor for chaining
   */
  stop() {
    this.isRunning = false;
    return this;
  }
  
  /**
   * Begin a new frame for performance tracking
   * @returns {number} Timestamp when frame began
   */
  beginFrame() {
    if (!this.isRunning) return 0;
    
    this.frameStartTime = performance.now();
    return this.frameStartTime;
  }
  
  /**
   * End the current frame and record metrics
   * @param {Object} metrics - Additional metrics to record
   * @returns {Object} Frame metrics
   */
  endFrame(metrics = {}) {
    if (!this.isRunning) return {};
    
    const frameEndTime = performance.now();
    const frameDuration = frameEndTime - (this.frameStartTime || this.startTime);
    
    // Combine provided metrics with frame timing
    const frameMetrics = {
      ...metrics,
      totalTime: frameDuration
    };
    
    // Update metrics
    this.update(frameMetrics);
    
    return frameMetrics;
  }

  /**
   * Update performance metrics and check for alerts
   * @param {Object} metrics - Current performance metrics
   * @returns {Array} Array of active alerts
   */
  update(metrics) {
    if (!this.isRunning) return this.alerts;
    
    this.frameCount++;
    const currentTime = performance.now();
    const activeAlerts = [];

    // Update metric history
    Object.keys(metrics).forEach(key => {
      if (this.metricHistory[key]) {
        this.metricHistory[key].push(metrics[key]);
        if (this.metricHistory[key].length > this.options.historySize) {
          this.metricHistory[key].shift();
        }
      }
    });

    // Add default metrics if not provided
    if (!metrics.totalTime) {
      metrics.totalTime = currentTime - this.startTime;
      this.metricHistory.totalTime.push(metrics.totalTime);
      if (this.metricHistory.totalTime.length > this.options.historySize) {
        this.metricHistory.totalTime.shift();
      }
    }

    // Check each metric against thresholds
    Object.entries(this.options.thresholds).forEach(([metric, thresholds]) => {
      const value = metrics[metric];
      if (value >= thresholds.critical) {
        activeAlerts.push({
          type: 'critical',
          metric,
          value,
          threshold: thresholds.critical,
          timestamp: currentTime,
        });
      } else if (value >= thresholds.warning) {
        activeAlerts.push({
          type: 'warning',
          metric,
          value,
          threshold: thresholds.warning,
          timestamp: currentTime,
        });
      }
    });

    // Check for sustained performance issues
    this.checkSustainedIssues(activeAlerts);

    // Update alerts with cooldown
    if (currentTime - this.lastAlertTime >= this.options.alertCooldown) {
      this.alerts = activeAlerts;
      this.lastAlertTime = currentTime;
    }

    return this.alerts;
  }

  /**
   * Check for sustained performance issues
   * @private
   * @param {Array} activeAlerts - Current active alerts
   */
  checkSustainedIssues(activeAlerts) {
    const sustainedThreshold = 0.8; // 80% of history must exceed warning threshold

    Object.entries(this.options.thresholds).forEach(([metric, thresholds]) => {
      const history = this.metricHistory[metric];
      if (history.length >= this.options.historySize) {
        const warningCount = history.filter(value => value >= thresholds.warning).length;
        const criticalCount = history.filter(value => value >= thresholds.critical).length;

        if (criticalCount / history.length >= sustainedThreshold) {
          activeAlerts.push({
            type: 'sustained_critical',
            metric,
            duration: 'sustained',
            timestamp: performance.now(),
          });
        } else if (warningCount / history.length >= sustainedThreshold) {
          activeAlerts.push({
            type: 'sustained_warning',
            metric,
            duration: 'sustained',
            timestamp: performance.now(),
          });
        }
      }
    });
  }

  /**
   * Get the current performance status
   * @returns {Object} Performance status object
   */
  getStatus() {
    const status = {
      alerts: this.alerts,
      history: this.metricHistory,
      thresholds: this.options.thresholds,
    };

    // Calculate averages for each metric
    Object.keys(this.metricHistory).forEach(metric => {
      const history = this.metricHistory[metric];
      if (history.length > 0) {
        status[`${metric}Average`] = history.reduce((a, b) => a + b, 0) / history.length;
      }
    });

    return status;
  }

  /**
   * Clear all alerts and history
   */
  clear() {
    this.alerts = [];
    this.lastAlertTime = 0;
    Object.keys(this.metricHistory).forEach(key => {
      this.metricHistory[key] = [];
    });
  }

  /**
   * Get color for a metric value
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @returns {string} Color code
   */
  getMetricColor(metric, value) {
    const thresholds = this.options.thresholds[metric];
    if (!thresholds) return '#ffffff';

    if (value >= thresholds.critical) return '#ff0000';
    if (value >= thresholds.warning) return '#ffff00';
    return '#00ff00';
  }

  /**
   * Begin a performance monitoring phase
   * @param {string} phase - Name of the phase to begin
   * @returns {number} Timestamp when phase began
   */
  beginPhase(phase) {
    if (!this.isRunning) return 0;
    
    const timestamp = performance.now();
    this.currentPhase = phase;
    this.phaseStartTime = timestamp;
    return timestamp;
  }
  
  /**
   * End the current performance monitoring phase
   * @param {Object} metrics - Additional metrics to record
   * @returns {Object} Phase metrics
   */
  endPhase(metrics = {}) {
    if (!this.isRunning || !this.currentPhase) return {};
    
    const timestamp = performance.now();
    const duration = timestamp - this.phaseStartTime;
    
    // Record phase metrics
    const phaseMetrics = {
      ...metrics,
      duration,
      timestamp
    };
    
    // Update metric history
    if (!this.metricHistory[this.currentPhase]) {
      this.metricHistory[this.currentPhase] = [];
    }
    this.metricHistory[this.currentPhase].push(phaseMetrics);
    
    // Trim history if needed
    if (this.metricHistory[this.currentPhase].length > this.options.historySize) {
      this.metricHistory[this.currentPhase].shift();
    }
    
    // Clear current phase
    this.currentPhase = null;
    this.phaseStartTime = 0;
    
    return phaseMetrics;
  }
}
