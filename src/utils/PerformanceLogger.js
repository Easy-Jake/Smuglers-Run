/**
 * Class for logging performance metrics to a file
 */
export class PerformanceLogger {
  constructor(options = {}) {
    this.logFile = options.logFile || 'performance.log';
    this.logInterval = options.logInterval || 60000; // 1 minute
    this.maxLogSize = options.maxLogSize || 5 * 1024 * 1024; // 5MB
    this.metrics = [];
    this.lastLogTime = performance.now();
    this.isLogging = false;
  }

  /**
   * Start logging performance metrics
   */
  start() {
    if (this.isLogging) return;
    this.isLogging = true;
    this.lastLogTime = performance.now();
  }

  /**
   * Stop logging performance metrics
   */
  stop() {
    this.isLogging = false;
    this.flush();
  }

  /**
   * Add performance metrics
   * @param {Object} metrics - Performance metrics to log
   */
  addMetrics(metrics) {
    if (!this.isLogging) return;

    this.metrics.push({
      timestamp: performance.now(),
      ...metrics,
    });

    // Check if we should log based on interval
    if (performance.now() - this.lastLogTime >= this.logInterval) {
      this.flush();
    }
  }

  /**
   * Flush metrics to file
   */
  async flush() {
    if (this.metrics.length === 0) return;

    try {
      // Format metrics as CSV
      const csv = this.formatMetricsAsCSV();

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance_${new Date().toISOString()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      // Clear metrics
      this.metrics = [];
      this.lastLogTime = performance.now();
    } catch (error) {
      console.error('Failed to flush performance metrics:', error);
    }
  }

  /**
   * Format metrics as CSV
   * @returns {string} CSV formatted metrics
   */
  formatMetricsAsCSV() {
    if (this.metrics.length === 0) return '';

    // Get headers from first metric
    const headers = Object.keys(this.metrics[0]);

    // Create CSV rows
    const rows = [
      headers.join(','),
      ...this.metrics.map(metric =>
        headers
          .map(header => {
            const value = metric[header];
            // Handle special cases
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
            if (typeof value === 'number') {
              return value.toFixed(2);
            }
            return value;
          })
          .join(',')
      ),
    ];

    return rows.join('\n');
  }

  /**
   * Get current metrics
   * @returns {Object[]} Current metrics
   */
  getMetrics() {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
    this.lastLogTime = performance.now();
  }
}
