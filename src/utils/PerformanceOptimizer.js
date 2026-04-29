/**
 * Class for analyzing performance metrics and providing optimization suggestions
 */
export class PerformanceOptimizer {
  constructor(options = {}) {
    this.options = {
      analysisInterval: options.analysisInterval || 5000, // ms
      minDataPoints: options.minDataPoints || 30, // frames
      sustainedThreshold: options.sustainedThreshold || 0.8, // 80% of frames
      autoOptimize: options.autoOptimize || true, // Whether to automatically apply optimizations
      optimizationCooldown: options.optimizationCooldown || 10000, // ms between optimizations
      rollbackThreshold: options.rollbackThreshold || 1.5, // Performance degradation threshold for rollback
      maxChainLength: options.maxChainLength || 3, // Maximum number of chained optimizations
      dependencyTimeout: options.dependencyTimeout || 5000, // ms to wait for dependent optimizations
      effectivenessWindow: options.effectivenessWindow || 10000, // ms to track optimization effectiveness
      patternLearningEnabled: options.patternLearningEnabled || true, // Whether to enable pattern learning
      patternHistorySize: options.patternHistorySize || 100, // Number of patterns to keep in history
      patternConfidenceThreshold: options.patternConfidenceThreshold || 0.7, // Minimum confidence for pattern application
      patternStorageKey: options.patternStorageKey || 'performance_optimizer_patterns', // Key for localStorage
      autoSaveInterval: options.autoSaveInterval || 300000, // 5 minutes
      patternSharingEnabled: options.patternSharingEnabled || true, // Whether to enable pattern sharing
      patternSharingInterval: options.patternSharingInterval || 600000, // 10 minutes
      patternSharingServer: options.patternSharingServer || 'https://api.example.com/patterns', // Server endpoint for pattern sharing
      instanceId: options.instanceId || this.generateInstanceId(), // Unique identifier for this instance
      patternValidationEnabled: options.patternValidationEnabled || true, // Whether to validate patterns
      patternMinEffectiveness: options.patternMinEffectiveness || 0.6, // Minimum effectiveness score for pattern validation
      patternMaxAge: options.patternMaxAge || 86400000, // 24 hours in milliseconds
      patternMinSamples: options.patternMinSamples || 3, // Minimum number of samples for pattern validation
      patternFilterThreshold: options.patternFilterThreshold || 0.8, // Threshold for pattern filtering
      patternValidationInterval: options.patternValidationInterval || 3600000, // 1 hour in milliseconds
    };

    this.metricHistory = {
      insertTime: [],
      queryTime: [],
      collisionTime: [],
      totalTime: [],
      checksPerFrame: [],
      collisionsPerFrame: [],
    };

    this.lastAnalysis = 0;
    this.lastOptimization = 0;
    this.suggestions = [];
    this.activeOptimizations = new Set();
    this.optimizationHistory = new Map();
    this.optimizationDependencies = new Map();
    this.optimizationChain = [];
    this.effectivenessHistory = new Map();
    this.patternHistory = new Map(); // Store learned optimization patterns
    this.lastSaveTime = 0;
    this.lastShareTime = 0;
    this.sharedPatterns = new Set(); // Track which patterns have been shared
    this.patternValidationHistory = new Map(); // Track pattern validation results
    this.lastValidationTime = 0;

    // Load patterns from storage if available
    this.loadPatterns();

    // Set up auto-save
    if (this.options.autoSaveInterval > 0) {
      setInterval(() => this.savePatterns(), this.options.autoSaveInterval);
    }

    // Set up pattern sharing
    if (this.options.patternSharingEnabled) {
      setInterval(() => this.sharePatterns(), this.options.patternSharingInterval);
    }

    // Set up pattern validation
    if (this.options.patternValidationEnabled) {
      setInterval(() => this.validatePatterns(), this.options.patternValidationInterval);
    }
  }

  /**
   * Generate a unique instance ID
   * @private
   * @returns {string} Unique instance ID
   */
  generateInstanceId() {
    return `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Share patterns with other instances
   * @private
   */
  async sharePatterns() {
    try {
      const currentTime = Date.now();
      if (currentTime - this.lastShareTime < this.options.patternSharingInterval) {
        return; // Don't share too frequently
      }

      // Get patterns that haven't been shared yet
      const patternsToShare = Array.from(this.patternHistory.entries())
        .filter(([key]) => !this.sharedPatterns.has(key))
        .map(([key, value]) => ({
          key,
          pattern: value.pattern,
          optimizations: value.optimizations,
          instanceId: this.options.instanceId,
          timestamp: currentTime,
        }));

      if (patternsToShare.length === 0) return;

      // Send patterns to server
      const response = await fetch(this.options.patternSharingServer, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patterns: patternsToShare,
          instanceId: this.options.instanceId,
          timestamp: currentTime,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to share patterns: ${response.statusText}`);
      }

      // Mark patterns as shared
      patternsToShare.forEach(({ key }) => {
        this.sharedPatterns.add(key);
      });

      this.lastShareTime = currentTime;

      // Emit share event if gameState is available
      if (this.gameState) {
        this.gameState.emit('patternsShared', {
          count: patternsToShare.length,
          timestamp: currentTime,
        });
      }
    } catch (error) {
      console.error('Failed to share patterns:', error);
    }
  }

  /**
   * Fetch shared patterns from other instances
   * @private
   */
  async fetchSharedPatterns() {
    try {
      const response = await fetch(
        `${this.options.patternSharingServer}?instanceId=${this.options.instanceId}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch patterns: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.patterns || !Array.isArray(data.patterns)) {
        throw new Error('Invalid pattern data received');
      }

      // Process received patterns
      data.patterns.forEach(({ key, pattern, optimizations, instanceId, timestamp }) => {
        // Skip if we already have this pattern
        if (this.patternHistory.has(key)) return;

        // Skip if pattern is too old (e.g., > 24 hours)
        if (Date.now() - timestamp > 86400000) return;

        // Add pattern to history
        this.patternHistory.set(key, {
          pattern,
          optimizations: optimizations.map(opt => ({
            ...opt,
            effectiveness: opt.effectiveness || 'neutral',
            source: instanceId,
          })),
        });

        // Mark as shared to prevent re-sharing
        this.sharedPatterns.add(key);
      });

      // Trim history if needed
      if (this.patternHistory.size > this.options.patternHistorySize) {
        const entries = Array.from(this.patternHistory.entries());
        entries.sort((a, b) => {
          const aEffectiveness = this.getEffectivenessScore(a[1].optimizations);
          const bEffectiveness = this.getEffectivenessScore(b[1].optimizations);
          return bEffectiveness - aEffectiveness;
        });

        this.patternHistory = new Map(entries.slice(0, this.options.patternHistorySize));
      }

      // Save updated patterns
      this.savePatterns();

      // Emit fetch event if gameState is available
      if (this.gameState) {
        this.gameState.emit('patternsFetched', {
          count: data.patterns.length,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Failed to fetch shared patterns:', error);
    }
  }

  /**
   * Get pattern sharing statistics
   * @returns {Object} Sharing statistics
   */
  getSharingStats() {
    return {
      totalPatterns: this.patternHistory.size,
      sharedPatterns: this.sharedPatterns.size,
      lastShareTime: this.lastShareTime,
      instanceId: this.options.instanceId,
    };
  }

  /**
   * Define optimization dependencies
   * @private
   */
  #defineDependencies() {
    return {
      collision: {
        dependsOn: ['memory'],
        affects: ['objects', 'sustained'],
        priority: 0,
      },
      memory: {
        dependsOn: [],
        affects: ['collision', 'objects', 'sustained'],
        priority: 1,
      },
      objects: {
        dependsOn: ['memory'],
        affects: ['collision', 'sustained'],
        priority: 2,
      },
      sustained: {
        dependsOn: ['memory', 'collision', 'objects'],
        affects: [],
        priority: 3,
      },
    };
  }

  /**
   * Update performance metrics and analyze for optimization opportunities
   * @param {Object} metrics - Current performance metrics
   * @param {Object} gameState - Current game state
   * @returns {Array} Array of optimization suggestions
   */
  update(metrics, gameState) {
    const currentTime = performance.now();

    // Update metric history
    Object.keys(metrics).forEach(key => {
      if (this.metricHistory[key]) {
        this.metricHistory[key].push(metrics[key]);
        if (this.metricHistory[key].length > this.options.minDataPoints) {
          this.metricHistory[key].shift();
        }
      }
    });

    // Analyze metrics if enough time has passed
    if (currentTime - this.lastAnalysis >= this.options.analysisInterval) {
      this.suggestions = this.analyzeMetrics(metrics, gameState);
      this.lastAnalysis = currentTime;

      // Apply automatic optimizations if enabled
      if (
        this.options.autoOptimize &&
        currentTime - this.lastOptimization >= this.options.optimizationCooldown
      ) {
        this.applyOptimizations(gameState);
        this.lastOptimization = currentTime;
      }
    }

    return this.suggestions;
  }

  /**
   * Apply automatic optimizations based on current suggestions
   * @private
   * @param {Object} gameState - Current game state
   */
  applyOptimizations(gameState) {
    const dependencies = this.#defineDependencies();

    // Sort suggestions by priority and dependencies
    const highPrioritySuggestions = this.suggestions
      .filter(s => s.priority === 'high')
      .sort((a, b) => {
        const depsA = dependencies[a.type];
        const depsB = dependencies[b.type];
        return depsA.priority - depsB.priority;
      });

    // Apply optimizations in dependency order
    for (const suggestion of highPrioritySuggestions) {
      if (this.optimizationChain.length >= this.options.maxChainLength) break;

      const deps = dependencies[suggestion.type];
      if (this.canApplyOptimization(suggestion.type, deps)) {
        this.applyOptimization(suggestion, gameState);
      }
    }
  }

  /**
   * Check if an optimization can be applied based on dependencies
   * @private
   * @param {string} type - Optimization type
   * @param {Object} deps - Dependencies configuration
   * @returns {boolean} Whether the optimization can be applied
   */
  canApplyOptimization(type, deps) {
    // Check if all dependencies are satisfied
    const dependenciesSatisfied = deps.dependsOn.every(depType =>
      this.activeOptimizations.has(depType)
    );

    // Check if we're not already optimizing this type
    const notAlreadyActive = !this.activeOptimizations.has(type);

    // Check if we're not in a rollback state
    const notRollingBack = !this.optimizationHistory.has(`${type}_rollback`);

    return dependenciesSatisfied && notAlreadyActive && notRollingBack;
  }

  /**
   * Apply a single optimization
   * @private
   * @param {Object} suggestion - Optimization suggestion
   * @param {Object} gameState - Current game state
   */
  applyOptimization(suggestion, gameState) {
    const optimizationId = `${suggestion.type}_${Date.now()}`;

    // Store original state before optimization
    const originalState = this.captureGameState(gameState, suggestion.type);

    // Store baseline metrics
    const baselineMetrics = this.getCurrentMetrics();

    // Apply optimization
    let success = false;
    switch (suggestion.type) {
      case 'collision':
        success = this.optimizeCollisionDetection(gameState);
        break;
      case 'objects':
        success = this.optimizeObjectCount(gameState);
        break;
      case 'memory':
        success = this.optimizeMemoryUsage(gameState);
        break;
      case 'sustained':
        success = this.optimizeSustainedIssues(gameState, suggestion.metric);
        break;
    }

    if (success) {
      // Track optimization in chain
      this.optimizationChain.push({
        id: optimizationId,
        type: suggestion.type,
        timestamp: Date.now(),
      });

      // Store optimization state
      this.optimizationHistory.set(optimizationId, {
        type: suggestion.type,
        originalState,
        timestamp: Date.now(),
        suggestion,
        chainIndex: this.optimizationChain.length - 1,
        baselineMetrics,
      });

      // Initialize effectiveness tracking
      this.effectivenessHistory.set(optimizationId, {
        type: suggestion.type,
        baselineMetrics,
        currentMetrics: [],
        improvements: {},
        startTime: Date.now(),
      });

      // Add to active optimizations
      this.activeOptimizations.add(suggestion.type);

      // Schedule performance check and potential rollback
      this.scheduleRollbackCheck(optimizationId, gameState);

      // Schedule effectiveness update
      this.scheduleEffectivenessUpdate(optimizationId, gameState);

      // Emit optimization event
      gameState.emit('optimizationApplied', {
        type: suggestion.type,
        id: optimizationId,
        chainIndex: this.optimizationChain.length - 1,
      });
    }
  }

  /**
   * Capture the relevant game state before optimization
   * @private
   * @param {Object} gameState - Current game state
   * @param {string} type - Type of optimization
   * @returns {Object} Captured state
   */
  captureGameState(gameState, type) {
    const state = {};

    switch (type) {
      case 'collision':
        if (gameState.asteroids) {
          state.asteroids = gameState.asteroids.map(a => ({
            id: a.id,
            collisionCheckInterval: a.collisionCheckInterval,
          }));
        }
        if (gameState.enemies) {
          state.enemies = gameState.enemies.map(e => ({
            id: e.id,
            collisionRadius: e.collisionRadius,
          }));
        }
        break;
      case 'objects':
        state.objectCounts = {
          asteroids: gameState.asteroids?.length || 0,
          enemies: gameState.enemies?.length || 0,
          particles: gameState.particles?.length || 0,
        };
        break;
      case 'memory':
        state.particleCount = gameState.particles?.length || 0;
        state.poolSize = gameState.objectPool?.size || 0;
        break;
      case 'sustained':
        state.metrics = { ...this.metricHistory };
        break;
    }

    return state;
  }

  /**
   * Schedule a check for potential rollback
   * @private
   * @param {string} optimizationId - ID of the optimization
   * @param {Object} gameState - Current game state
   */
  scheduleRollbackCheck(optimizationId, gameState) {
    setTimeout(() => {
      this.checkOptimizationPerformance(optimizationId, gameState);
    }, 2000); // Check after 2 seconds
  }

  /**
   * Check if optimization should be rolled back
   * @private
   * @param {string} optimizationId - ID of the optimization
   * @param {Object} gameState - Current game state
   */
  checkOptimizationPerformance(optimizationId, gameState) {
    const optimization = this.optimizationHistory.get(optimizationId);
    if (!optimization) return;

    const currentMetrics = this.getCurrentMetrics();
    const originalMetrics = optimization.originalState.metrics;

    // Check if performance has degraded
    const shouldRollback = Object.entries(currentMetrics).some(([metric, value]) => {
      const originalValue = originalMetrics[metric];
      return value > originalValue * this.options.rollbackThreshold;
    });

    if (shouldRollback) {
      this.rollbackOptimization(optimizationId, gameState);
    }
  }

  /**
   * Roll back an optimization and its dependent optimizations
   * @private
   * @param {string} optimizationId - ID of the optimization
   * @param {Object} gameState - Current game state
   */
  rollbackOptimization(optimizationId, gameState) {
    const optimization = this.optimizationHistory.get(optimizationId);
    if (!optimization) return;

    const { type, chainIndex } = optimization;
    const dependencies = this.#defineDependencies();
    const deps = dependencies[type];

    // Roll back dependent optimizations first
    deps.affects.forEach(affectedType => {
      const affectedOptimizations = Array.from(this.optimizationHistory.entries())
        .filter(([_, opt]) => opt.type === affectedType && opt.chainIndex > chainIndex)
        .map(([id]) => id);

      affectedOptimizations.forEach(id => {
        this.rollbackOptimization(id, gameState);
      });
    });

    // Roll back the current optimization
    this.rollbackOptimizationInternal(optimizationId, gameState);
  }

  /**
   * Internal rollback implementation
   * @private
   * @param {string} optimizationId - ID of the optimization
   * @param {Object} gameState - Current game state
   */
  rollbackOptimizationInternal(optimizationId, gameState) {
    const optimization = this.optimizationHistory.get(optimizationId);
    if (!optimization) return;

    const { type, originalState, chainIndex } = optimization;

    // Perform the rollback
    switch (type) {
      case 'collision':
        this.rollbackCollisionOptimization(gameState, originalState);
        break;
      case 'objects':
        this.rollbackObjectOptimization(gameState, originalState);
        break;
      case 'memory':
        this.rollbackMemoryOptimization(gameState, originalState);
        break;
      case 'sustained':
        this.rollbackSustainedOptimization(gameState, originalState);
        break;
    }

    // Remove from chain
    this.optimizationChain.splice(chainIndex, 1);

    // Update chain indices for remaining optimizations
    this.optimizationChain.forEach((opt, index) => {
      const optState = this.optimizationHistory.get(opt.id);
      if (optState) {
        optState.chainIndex = index;
      }
    });

    // Remove from history and active optimizations
    this.optimizationHistory.delete(optimizationId);
    this.activeOptimizations.delete(type);

    // Emit rollback event
    gameState.emit('optimizationRollback', {
      type,
      reason: 'Performance degradation detected',
      chainIndex,
    });
  }

  /**
   * Roll back collision optimization
   * @private
   * @param {Object} gameState - Current game state
   * @param {Object} originalState - Original state
   */
  rollbackCollisionOptimization(gameState, originalState) {
    if (gameState.asteroids && originalState.asteroids) {
      originalState.asteroids.forEach(original => {
        const asteroid = gameState.asteroids.find(a => a.id === original.id);
        if (asteroid) {
          asteroid.collisionCheckInterval = original.collisionCheckInterval;
        }
      });
    }

    if (gameState.enemies && originalState.enemies) {
      originalState.enemies.forEach(original => {
        const enemy = gameState.enemies.find(e => e.id === original.id);
        if (enemy) {
          enemy.collisionRadius = original.collisionRadius;
        }
      });
    }
  }

  /**
   * Roll back object optimization
   * @private
   * @param {Object} gameState - Current game state
   * @param {Object} originalState - Original state
   */
  rollbackObjectOptimization(gameState, originalState) {
    // Note: We can't restore removed objects, but we can adjust spawn rates
    if (gameState.objectSpawner) {
      gameState.objectSpawner.resetSpawnRates();
    }
  }

  /**
   * Roll back memory optimization
   * @private
   * @param {Object} gameState - Current game state
   * @param {Object} originalState - Original state
   */
  rollbackMemoryOptimization(gameState, originalState) {
    if (gameState.objectPool) {
      gameState.objectPool.resetSize(originalState.poolSize);
    }
  }

  /**
   * Roll back sustained optimization
   * @private
   * @param {Object} gameState - Current game state
   * @param {Object} originalState - Original state
   */
  rollbackSustainedOptimization(gameState, originalState) {
    // Restore original update frequencies
    if (gameState.asteroids) {
      gameState.asteroids.forEach(asteroid => {
        asteroid.updateInterval = 1;
      });
    }

    if (gameState.quadTree) {
      gameState.quadTree.maxDepth = 4; // Default depth
    }

    if (gameState.enemies) {
      gameState.enemies.forEach(enemy => {
        enemy.collisionComplexity = 'normal';
      });
    }
  }

  /**
   * Get current performance metrics
   * @private
   * @returns {Object} Current metrics
   */
  getCurrentMetrics() {
    return Object.entries(this.metricHistory).reduce((acc, [key, values]) => {
      acc[key] = values[values.length - 1] || 0;
      return acc;
    }, {});
  }

  /**
   * Get optimization priority for different types
   * @private
   * @param {string} type - Optimization type
   * @returns {number} Priority value (lower is higher priority)
   */
  getOptimizationPriority(type) {
    const priorities = {
      collision: 0,
      memory: 1,
      objects: 2,
      sustained: 3,
    };
    return priorities[type] || 4;
  }

  /**
   * Optimize collision detection
   * @private
   * @param {Object} gameState - Current game state
   */
  optimizeCollisionDetection(gameState) {
    if (this.activeOptimizations.has('collision')) return;

    // Reduce collision check frequency for distant objects
    if (gameState.asteroids) {
      gameState.asteroids.forEach(asteroid => {
        const distance = Math.sqrt(
          Math.pow(asteroid.x - gameState.player.x, 2) +
            Math.pow(asteroid.y - gameState.player.y, 2)
        );
        asteroid.collisionCheckInterval = distance > 1000 ? 2 : 1;
      });
    }

    // Optimize collision box sizes
    if (gameState.enemies) {
      gameState.enemies.forEach(enemy => {
        enemy.collisionRadius *= 0.9; // Reduce collision radius by 10%
      });
    }

    this.activeOptimizations.add('collision');
    setTimeout(() => this.activeOptimizations.delete('collision'), 5000);
  }

  /**
   * Optimize object count
   * @private
   * @param {Object} gameState - Current game state
   */
  optimizeObjectCount(gameState) {
    if (this.activeOptimizations.has('objects')) return;

    // Remove off-screen objects
    const screenMargin = 500; // Margin beyond screen bounds
    const removeOffScreen = (objects, type) => {
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        const distance = Math.sqrt(
          Math.pow(obj.x - gameState.player.x, 2) + Math.pow(obj.y - gameState.player.y, 2)
        );
        if (distance > screenMargin) {
          objects.splice(i, 1);
          gameState.emit(`${type}Removed`, { object: obj });
        }
      }
    };

    if (gameState.asteroids) removeOffScreen(gameState.asteroids, 'asteroid');
    if (gameState.enemies) removeOffScreen(gameState.enemies, 'enemy');
    if (gameState.particles) removeOffScreen(gameState.particles, 'particle');

    this.activeOptimizations.add('objects');
    setTimeout(() => this.activeOptimizations.delete('objects'), 5000);
  }

  /**
   * Optimize memory usage
   * @private
   * @param {Object} gameState - Current game state
   */
  optimizeMemoryUsage(gameState) {
    if (this.activeOptimizations.has('memory')) return;

    // Reduce particle count
    if (gameState.particles) {
      const maxParticles = 100;
      if (gameState.particles.length > maxParticles) {
        gameState.particles.splice(maxParticles);
      }
    }

    // Optimize object pooling
    if (gameState.objectPool) {
      gameState.objectPool.trim(0.8); // Keep 80% of pool size
    }

    this.activeOptimizations.add('memory');
    setTimeout(() => this.activeOptimizations.delete('memory'), 5000);
  }

  /**
   * Optimize sustained performance issues
   * @private
   * @param {Object} gameState - Current game state
   * @param {string} metric - The metric with sustained issues
   */
  optimizeSustainedIssues(gameState, metric) {
    if (this.activeOptimizations.has(`sustained_${metric}`)) return;

    switch (metric) {
      case 'insertTime':
        // Reduce update frequency for non-critical objects
        if (gameState.asteroids) {
          gameState.asteroids.forEach(asteroid => {
            asteroid.updateInterval = 2;
          });
        }
        break;
      case 'queryTime':
        // Optimize spatial queries
        if (gameState.quadTree) {
          gameState.quadTree.maxDepth = Math.max(0, gameState.quadTree.maxDepth - 1);
        }
        break;
      case 'collisionTime':
        // Reduce collision complexity
        if (gameState.enemies) {
          gameState.enemies.forEach(enemy => {
            enemy.collisionComplexity = 'simple';
          });
        }
        break;
    }

    this.activeOptimizations.add(`sustained_${metric}`);
    setTimeout(() => this.activeOptimizations.delete(`sustained_${metric}`), 5000);
  }

  /**
   * Analyze performance metrics and generate optimization suggestions
   * @private
   * @param {Object} metrics - Current performance metrics
   * @param {Object} gameState - Current game state
   * @returns {Array} Array of optimization suggestions
   */
  analyzeMetrics(metrics, gameState) {
    const suggestions = [];

    // Get current performance pattern
    const currentPattern = this.identifyPerformancePattern(metrics, gameState);

    // Check for matching patterns in history
    if (this.options.patternLearningEnabled) {
      const patternSuggestions = this.getPatternBasedSuggestions(currentPattern);
      suggestions.push(...patternSuggestions);
    }

    // Fall back to standard analysis if no patterns match
    if (suggestions.length === 0) {
      // Standard analysis logic
      if (metrics.collisionTime > 2) {
        suggestions.push({
          type: 'collision',
          priority: 'high',
          message: 'High collision detection time detected',
          suggestions: [
            'Consider reducing the number of active objects',
            'Optimize collision detection algorithm',
            'Implement object pooling for frequently created/destroyed objects',
          ],
        });
      }

      if (gameState) {
        const totalObjects = this.calculateTotalObjects(gameState);
        if (totalObjects > 1000) {
          suggestions.push({
            type: 'objects',
            priority: 'medium',
            message: 'High number of active objects detected',
            suggestions: [
              'Implement object culling for off-screen objects',
              'Reduce spawn rates for non-essential objects',
              'Consider using object pooling for frequently spawned objects',
            ],
          });
        }
      }

      if (metrics.checksPerFrame > 500) {
        suggestions.push({
          type: 'memory',
          priority: 'high',
          message: 'High number of collision checks detected',
          suggestions: [
            'Implement spatial partitioning (e.g., QuadTree)',
            'Reduce collision check frequency for distant objects',
            'Optimize collision box sizes',
          ],
        });
      }

      this.analyzeSustainedIssues(suggestions);
    }

    // Sort suggestions by priority
    suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return suggestions;
  }

  /**
   * Identify current performance pattern
   * @private
   * @param {Object} metrics - Current performance metrics
   * @param {Object} gameState - Current game state
   * @returns {Object} Identified performance pattern
   */
  identifyPerformancePattern(metrics, gameState) {
    const pattern = {
      metrics: {
        collisionTime: this.categorizeMetric(metrics.collisionTime),
        totalTime: this.categorizeMetric(metrics.totalTime),
        checksPerFrame: this.categorizeMetric(metrics.checksPerFrame),
        collisionsPerFrame: this.categorizeMetric(metrics.collisionsPerFrame),
      },
      state: {
        objectCount: this.categorizeObjectCount(gameState),
        particleCount: this.categorizeParticleCount(gameState),
        activeOptimizations: Array.from(this.activeOptimizations),
      },
      timestamp: Date.now(),
    };

    return pattern;
  }

  /**
   * Categorize a metric value
   * @private
   * @param {number} value - Metric value
   * @returns {string} Category
   */
  categorizeMetric(value) {
    if (value < 1) return 'low';
    if (value < 5) return 'medium';
    if (value < 10) return 'high';
    return 'critical';
  }

  /**
   * Categorize object count
   * @private
   * @param {Object} gameState - Current game state
   * @returns {string} Category
   */
  categorizeObjectCount(gameState) {
    const count = this.calculateTotalObjects(gameState);
    if (count < 100) return 'low';
    if (count < 500) return 'medium';
    if (count < 1000) return 'high';
    return 'critical';
  }

  /**
   * Categorize particle count
   * @private
   * @param {Object} gameState - Current game state
   * @returns {string} Category
   */
  categorizeParticleCount(gameState) {
    const count = gameState.particles?.length || 0;
    if (count < 50) return 'low';
    if (count < 200) return 'medium';
    if (count < 500) return 'high';
    return 'critical';
  }

  /**
   * Get suggestions based on learned patterns
   * @private
   * @param {Object} currentPattern - Current performance pattern
   * @returns {Array} Array of optimization suggestions
   */
  getPatternBasedSuggestions(currentPattern) {
    const suggestions = [];
    const matchingPatterns = this.findMatchingPatterns(currentPattern);

    matchingPatterns.forEach(pattern => {
      if (pattern.confidence >= this.options.patternConfidenceThreshold) {
        pattern.optimizations.forEach(opt => {
          suggestions.push({
            type: opt.type,
            priority: opt.priority,
            message: `Pattern-based optimization: ${opt.message}`,
            suggestions: opt.suggestions,
            confidence: pattern.confidence,
          });
        });
      }
    });

    return suggestions;
  }

  /**
   * Find patterns matching the current performance state
   * @private
   * @param {Object} currentPattern - Current performance pattern
   * @returns {Array} Array of matching patterns with confidence scores
   */
  findMatchingPatterns(currentPattern) {
    const matches = [];

    this.patternHistory.forEach((pattern, id) => {
      const confidence = this.calculatePatternConfidence(currentPattern, pattern);
      if (confidence > 0) {
        matches.push({
          id,
          pattern,
          confidence,
        });
      }
    });

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate confidence score for pattern matching
   * @private
   * @param {Object} currentPattern - Current performance pattern
   * @param {Object} historicalPattern - Historical pattern
   * @returns {number} Confidence score
   */
  calculatePatternConfidence(currentPattern, historicalPattern) {
    let score = 0;
    let total = 0;

    // Compare metrics
    Object.entries(currentPattern.metrics).forEach(([key, value]) => {
      if (historicalPattern.metrics[key] === value) {
        score += 1;
      }
      total += 1;
    });

    // Compare state
    Object.entries(currentPattern.state).forEach(([key, value]) => {
      if (historicalPattern.state[key] === value) {
        score += 1;
      }
      total += 1;
    });

    return score / total;
  }

  /**
   * Calculate total number of active objects in the game state
   * @private
   * @param {Object} gameState - Current game state
   * @returns {number} Total number of active objects
   */
  calculateTotalObjects(gameState) {
    return (
      (gameState.asteroids?.length || 0) +
      (gameState.enemies?.length || 0) +
      (gameState.projectiles?.length || 0) +
      (gameState.particles?.length || 0) +
      (gameState.cargo?.length || 0)
    );
  }

  /**
   * Analyze sustained performance issues
   * @private
   * @param {Array} suggestions - Array to add suggestions to
   */
  analyzeSustainedIssues(suggestions) {
    Object.entries(this.metricHistory).forEach(([metric, history]) => {
      if (history.length >= this.options.minDataPoints) {
        const average = history.reduce((a, b) => a + b, 0) / history.length;
        const highValueCount = history.filter(v => v > average * 1.5).length;

        if (highValueCount / history.length >= this.options.sustainedThreshold) {
          suggestions.push({
            type: 'sustained',
            priority: 'high',
            message: `Sustained high ${metric} detected`,
            suggestions: [
              `Investigate root cause of sustained high ${metric}`,
              'Consider implementing performance monitoring',
              'Profile the code to identify bottlenecks',
            ],
          });
        }
      }
    });
  }

  /**
   * Get formatted suggestion text
   * @param {Object} suggestion - Suggestion object
   * @returns {string} Formatted suggestion text
   */
  formatSuggestion(suggestion) {
    return (
      `[${suggestion.priority.toUpperCase()}] ${suggestion.message}\n` +
      suggestion.suggestions.map(s => `  • ${s}`).join('\n')
    );
  }

  /**
   * Schedule effectiveness update for an optimization
   * @private
   * @param {string} optimizationId - ID of the optimization
   * @param {Object} gameState - Current game state
   */
  scheduleEffectivenessUpdate(optimizationId, gameState) {
    const updateInterval = 1000; // Update every second
    const maxDuration = this.options.effectivenessWindow;

    const updateEffectiveness = () => {
      const effectiveness = this.effectivenessHistory.get(optimizationId);
      if (!effectiveness) return;

      const currentTime = Date.now();
      const duration = currentTime - effectiveness.startTime;

      if (duration >= maxDuration) {
        this.finalizeEffectiveness(optimizationId, gameState);
        return;
      }

      // Update current metrics
      const currentMetrics = this.getCurrentMetrics();
      effectiveness.currentMetrics.push(currentMetrics);

      // Calculate improvements
      this.calculateImprovements(optimizationId);

      // Schedule next update
      setTimeout(updateEffectiveness, updateInterval);
    };

    setTimeout(updateEffectiveness, updateInterval);
  }

  /**
   * Calculate improvements for an optimization
   * @private
   * @param {string} optimizationId - ID of the optimization
   */
  calculateImprovements(optimizationId) {
    const effectiveness = this.effectivenessHistory.get(optimizationId);
    if (!effectiveness) return;

    const { baselineMetrics, currentMetrics } = effectiveness;
    const latestMetrics = currentMetrics[currentMetrics.length - 1];

    // Calculate percentage improvements
    effectiveness.improvements = Object.entries(baselineMetrics).reduce(
      (acc, [metric, baseline]) => {
        const current = latestMetrics[metric];
        const improvement = ((baseline - current) / baseline) * 100;
        acc[metric] = improvement;
        return acc;
      },
      {}
    );
  }

  /**
   * Finalize effectiveness tracking for an optimization
   * @private
   * @param {string} optimizationId - ID of the optimization
   * @param {Object} gameState - Current game state
   */
  finalizeEffectiveness(optimizationId, gameState) {
    const effectiveness = this.effectivenessHistory.get(optimizationId);
    if (!effectiveness) return;

    const { type, improvements, currentMetrics } = effectiveness;

    // Calculate average improvements
    const avgImprovements = Object.entries(improvements).reduce((acc, [metric, values]) => {
      acc[metric] = values.reduce((a, b) => a + b, 0) / values.length;
      return acc;
    }, {});

    // Determine overall effectiveness
    const overallEffectiveness = this.determineOverallEffectiveness(avgImprovements);

    // Store final results
    effectiveness.finalResults = {
      averageImprovements: avgImprovements,
      overallEffectiveness,
      duration: this.options.effectivenessWindow,
      metricHistory: currentMetrics,
    };

    // Learn from the optimization results
    this.learnFromEffectiveness(optimizationId, effectiveness);

    // Emit effectiveness event
    gameState.emit('optimizationEffectiveness', {
      type,
      id: optimizationId,
      results: effectiveness.finalResults,
    });

    // Remove from tracking if not effective
    if (overallEffectiveness === 'negative') {
      this.rollbackOptimization(optimizationId, gameState);
    }
  }

  /**
   * Determine overall effectiveness of an optimization
   * @private
   * @param {Object} improvements - Metric improvements
   * @returns {string} Effectiveness rating
   */
  determineOverallEffectiveness(improvements) {
    const criticalMetrics = ['collisionTime', 'totalTime'];
    const criticalImprovement =
      criticalMetrics.reduce((acc, metric) => {
        return acc + (improvements[metric] || 0);
      }, 0) / criticalMetrics.length;

    const allImprovements = Object.values(improvements);
    const avgImprovement = allImprovements.reduce((a, b) => a + b, 0) / allImprovements.length;

    if (criticalImprovement > 20 && avgImprovement > 10) {
      return 'excellent';
    } else if (criticalImprovement > 10 && avgImprovement > 5) {
      return 'good';
    } else if (criticalImprovement > 0 && avgImprovement > 0) {
      return 'moderate';
    } else if (criticalImprovement < -10 || avgImprovement < -5) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }

  /**
   * Get effectiveness report for an optimization
   * @param {string} optimizationId - ID of the optimization
   * @returns {Object} Effectiveness report
   */
  getEffectivenessReport(optimizationId) {
    const effectiveness = this.effectivenessHistory.get(optimizationId);
    if (!effectiveness) return null;

    return {
      type: effectiveness.type,
      duration: Date.now() - effectiveness.startTime,
      currentImprovements: effectiveness.improvements,
      finalResults: effectiveness.finalResults,
    };
  }

  /**
   * Learn from optimization effectiveness
   * @private
   * @param {string} optimizationId - ID of the optimization
   * @param {Object} effectiveness - Effectiveness data
   */
  learnFromEffectiveness(optimizationId, effectiveness) {
    const optimization = this.optimizationHistory.get(optimizationId);
    if (!optimization) return;

    const pattern = this.identifyPerformancePattern(
      optimization.baselineMetrics,
      optimization.originalState
    );

    // Store pattern with optimization results
    const patternKey = this.generatePatternKey(pattern);
    const existingPattern = this.patternHistory.get(patternKey);

    if (existingPattern) {
      // Update existing pattern
      existingPattern.optimizations.push({
        type: optimization.type,
        priority: optimization.suggestion.priority,
        message: optimization.suggestion.message,
        suggestions: optimization.suggestion.suggestions,
        effectiveness: effectiveness.finalResults.overallEffectiveness,
      });

      // Trim history if needed
      if (this.patternHistory.size > this.options.patternHistorySize) {
        const oldestKey = Array.from(this.patternHistory.keys())[0];
        this.patternHistory.delete(oldestKey);
      }
    } else {
      // Create new pattern
      this.patternHistory.set(patternKey, {
        pattern,
        optimizations: [
          {
            type: optimization.type,
            priority: optimization.suggestion.priority,
            message: optimization.suggestion.message,
            suggestions: optimization.suggestion.suggestions,
            effectiveness: effectiveness.finalResults.overallEffectiveness,
          },
        ],
      });
    }
  }

  /**
   * Generate a unique key for a pattern
   * @private
   * @param {Object} pattern - Performance pattern
   * @returns {string} Pattern key
   */
  generatePatternKey(pattern) {
    return JSON.stringify({
      metrics: pattern.metrics,
      state: pattern.state,
    });
  }

  /**
   * Save patterns to persistent storage
   * @private
   */
  savePatterns() {
    try {
      const currentTime = Date.now();
      if (currentTime - this.lastSaveTime < this.options.autoSaveInterval) {
        return; // Don't save too frequently
      }

      const patterns = Array.from(this.patternHistory.entries()).map(([key, value]) => ({
        key,
        pattern: value.pattern,
        optimizations: value.optimizations.map(opt => ({
          type: opt.type,
          priority: opt.priority,
          message: opt.message,
          suggestions: opt.suggestions,
          effectiveness: opt.effectiveness,
        })),
      }));

      const data = {
        version: '1.0',
        timestamp: currentTime,
        patterns,
        options: {
          patternHistorySize: this.options.patternHistorySize,
          patternConfidenceThreshold: this.options.patternConfidenceThreshold,
        },
      };

      localStorage.setItem(this.options.patternStorageKey, JSON.stringify(data));
      this.lastSaveTime = currentTime;

      // Emit save event if gameState is available
      if (this.gameState) {
        this.gameState.emit('patternsSaved', {
          count: patterns.length,
          timestamp: currentTime,
        });
      }
    } catch (error) {
      console.error('Failed to save patterns:', error);
    }
  }

  /**
   * Load patterns from persistent storage
   * @private
   */
  loadPatterns() {
    try {
      const data = localStorage.getItem(this.options.patternStorageKey);
      if (!data) return;

      const parsed = JSON.parse(data);
      if (parsed.version !== '1.0') {
        console.warn('Pattern data version mismatch, skipping load');
        return;
      }

      // Update options if they differ
      if (parsed.options) {
        this.options.patternHistorySize =
          parsed.options.patternHistorySize || this.options.patternHistorySize;
        this.options.patternConfidenceThreshold =
          parsed.options.patternConfidenceThreshold || this.options.patternConfidenceThreshold;
      }

      // Load patterns
      parsed.patterns.forEach(({ key, pattern, optimizations }) => {
        this.patternHistory.set(key, {
          pattern,
          optimizations: optimizations.map(opt => ({
            ...opt,
            effectiveness: opt.effectiveness || 'neutral', // Handle legacy data
          })),
        });
      });

      // Trim history if needed
      if (this.patternHistory.size > this.options.patternHistorySize) {
        const entries = Array.from(this.patternHistory.entries());
        entries.sort((a, b) => {
          // Sort by effectiveness and timestamp
          const aEffectiveness = this.getEffectivenessScore(a[1].optimizations);
          const bEffectiveness = this.getEffectivenessScore(b[1].optimizations);
          return bEffectiveness - aEffectiveness;
        });

        // Keep only the best performing patterns
        this.patternHistory = new Map(entries.slice(0, this.options.patternHistorySize));
      }

      // Emit load event if gameState is available
      if (this.gameState) {
        this.gameState.emit('patternsLoaded', {
          count: this.patternHistory.size,
          timestamp: parsed.timestamp,
        });
      }
    } catch (error) {
      console.error('Failed to load patterns:', error);
    }
  }

  /**
   * Calculate effectiveness score for pattern optimizations
   * @private
   * @param {Array} optimizations - Array of optimizations
   * @returns {number} Effectiveness score
   */
  getEffectivenessScore(optimizations) {
    const scores = {
      excellent: 4,
      good: 3,
      moderate: 2,
      neutral: 1,
      negative: 0,
    };

    return (
      optimizations.reduce((acc, opt) => {
        return acc + (scores[opt.effectiveness] || 0);
      }, 0) / optimizations.length
    );
  }

  /**
   * Export patterns to a file
   * @returns {string} JSON string of patterns
   */
  exportPatterns() {
    const data = {
      version: '1.0',
      timestamp: Date.now(),
      patterns: Array.from(this.patternHistory.entries()).map(([key, value]) => ({
        key,
        pattern: value.pattern,
        optimizations: value.optimizations,
      })),
      options: {
        patternHistorySize: this.options.patternHistorySize,
        patternConfidenceThreshold: this.options.patternConfidenceThreshold,
      },
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import patterns from a JSON string
   * @param {string} jsonString - JSON string of patterns
   * @returns {boolean} Whether import was successful
   */
  importPatterns(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.version !== '1.0') {
        throw new Error('Invalid pattern data version');
      }

      // Clear existing patterns
      this.patternHistory.clear();

      // Import new patterns
      data.patterns.forEach(({ key, pattern, optimizations }) => {
        this.patternHistory.set(key, {
          pattern,
          optimizations: optimizations.map(opt => ({
            ...opt,
            effectiveness: opt.effectiveness || 'neutral',
          })),
        });
      });

      // Update options if provided
      if (data.options) {
        this.options.patternHistorySize =
          data.options.patternHistorySize || this.options.patternHistorySize;
        this.options.patternConfidenceThreshold =
          data.options.patternConfidenceThreshold || this.options.patternConfidenceThreshold;
      }

      // Save to storage
      this.savePatterns();

      // Emit import event if gameState is available
      if (this.gameState) {
        this.gameState.emit('patternsImported', {
          count: this.patternHistory.size,
          timestamp: Date.now(),
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to import patterns:', error);
      return false;
    }
  }

  /**
   * Validate patterns in the history
   * @private
   */
  validatePatterns() {
    try {
      const currentTime = Date.now();
      if (currentTime - this.lastValidationTime < this.options.patternValidationInterval) {
        return;
      }

      const validationResults = new Map();
      let validPatterns = 0;
      let invalidPatterns = 0;

      this.patternHistory.forEach((pattern, key) => {
        const validation = this.validatePattern(pattern);
        validationResults.set(key, validation);

        if (validation.isValid) {
          validPatterns++;
        } else {
          invalidPatterns++;
        }
      });

      // Remove invalid patterns
      Array.from(validationResults.entries())
        .filter(([_, validation]) => !validation.isValid)
        .forEach(([key]) => {
          this.patternHistory.delete(key);
          this.sharedPatterns.delete(key);
        });

      this.patternValidationHistory = validationResults;
      this.lastValidationTime = currentTime;

      // Save validated patterns
      this.savePatterns();

      // Emit validation event if gameState is available
      if (this.gameState) {
        this.gameState.emit('patternsValidated', {
          total: this.patternHistory.size,
          valid: validPatterns,
          invalid: invalidPatterns,
          timestamp: currentTime,
        });
      }
    } catch (error) {
      console.error('Failed to validate patterns:', error);
    }
  }

  /**
   * Validate a single pattern
   * @private
   * @param {Object} pattern - Pattern to validate
   * @returns {Object} Validation result
   */
  validatePattern(pattern) {
    const validation = {
      isValid: true,
      reasons: [],
      metrics: {
        effectiveness: 0,
        age: 0,
        samples: 0,
      },
    };

    // Check pattern age
    const age = Date.now() - pattern.pattern.timestamp;
    validation.metrics.age = age;
    if (age > this.options.patternMaxAge) {
      validation.isValid = false;
      validation.reasons.push('Pattern too old');
    }

    // Check number of samples
    const samples = pattern.optimizations.length;
    validation.metrics.samples = samples;
    if (samples < this.options.patternMinSamples) {
      validation.isValid = false;
      validation.reasons.push('Insufficient samples');
    }

    // Check effectiveness
    const effectiveness = this.getEffectivenessScore(pattern.optimizations);
    validation.metrics.effectiveness = effectiveness;
    if (effectiveness < this.options.patternMinEffectiveness) {
      validation.isValid = false;
      validation.reasons.push('Low effectiveness');
    }

    // Check pattern consistency
    const consistency = this.checkPatternConsistency(pattern);
    if (!consistency.isValid) {
      validation.isValid = false;
      validation.reasons.push(...consistency.reasons);
    }

    return validation;
  }

  /**
   * Check pattern consistency
   * @private
   * @param {Object} pattern - Pattern to check
   * @returns {Object} Consistency check result
   */
  checkPatternConsistency(pattern) {
    const result = {
      isValid: true,
      reasons: [],
    };

    // Check metric consistency
    const metricVariance = this.calculateMetricVariance(pattern);
    if (metricVariance > 0.5) {
      // 50% variance threshold
      result.isValid = false;
      result.reasons.push('High metric variance');
    }

    // Check optimization consistency
    const optimizationConsistency = this.checkOptimizationConsistency(pattern.optimizations);
    if (!optimizationConsistency.isValid) {
      result.isValid = false;
      result.reasons.push(...optimizationConsistency.reasons);
    }

    return result;
  }

  /**
   * Calculate metric variance in a pattern
   * @private
   * @param {Object} pattern - Pattern to analyze
   * @returns {number} Metric variance
   */
  calculateMetricVariance(pattern) {
    const metrics = Object.values(pattern.pattern.metrics);
    const mean = metrics.reduce((a, b) => a + b, 0) / metrics.length;
    const variance = metrics.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / metrics.length;
    return variance / mean; // Coefficient of variation
  }

  /**
   * Check optimization consistency
   * @private
   * @param {Array} optimizations - Array of optimizations
   * @returns {Object} Consistency check result
   */
  checkOptimizationConsistency(optimizations) {
    const result = {
      isValid: true,
      reasons: [],
    };

    // Group optimizations by type
    const typeGroups = optimizations.reduce((acc, opt) => {
      if (!acc[opt.type]) {
        acc[opt.type] = [];
      }
      acc[opt.type].push(opt);
      return acc;
    }, {});

    // Check each type group
    Object.entries(typeGroups).forEach(([type, group]) => {
      if (group.length < 2) {
        result.isValid = false;
        result.reasons.push(`Insufficient samples for ${type} optimization`);
        return;
      }

      // Check effectiveness consistency
      const effectivenessVariance = this.calculateEffectivenessVariance(group);
      if (effectivenessVariance > 0.3) {
        // 30% variance threshold
        result.isValid = false;
        result.reasons.push(`High effectiveness variance for ${type} optimization`);
      }
    });

    return result;
  }

  /**
   * Calculate effectiveness variance in a group of optimizations
   * @private
   * @param {Array} optimizations - Array of optimizations
   * @returns {number} Effectiveness variance
   */
  calculateEffectivenessVariance(optimizations) {
    const scores = {
      excellent: 4,
      good: 3,
      moderate: 2,
      neutral: 1,
      negative: 0,
    };

    const values = optimizations.map(opt => scores[opt.effectiveness] || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return variance / mean; // Coefficient of variation
  }

  /**
   * Filter patterns based on validation results
   * @private
   * @param {Map} patterns - Patterns to filter
   * @returns {Map} Filtered patterns
   */
  filterPatterns(patterns) {
    const filtered = new Map();

    patterns.forEach((pattern, key) => {
      const validation = this.patternValidationHistory.get(key);
      if (validation && validation.isValid) {
        filtered.set(key, pattern);
      }
    });

    return filtered;
  }

  /**
   * Get pattern validation statistics
   * @returns {Object} Validation statistics
   */
  getValidationStats() {
    let valid = 0;
    let invalid = 0;
    let totalEffectiveness = 0;
    let totalAge = 0;

    this.patternValidationHistory.forEach(validation => {
      if (validation.isValid) {
        valid++;
      } else {
        invalid++;
      }
      totalEffectiveness += validation.metrics.effectiveness;
      totalAge += validation.metrics.age;
    });

    const total = valid + invalid;
    return {
      total,
      valid,
      invalid,
      averageEffectiveness: total > 0 ? totalEffectiveness / total : 0,
      averageAge: total > 0 ? totalAge / total : 0,
      lastValidation: this.lastValidationTime,
    };
  }

  /**
   * Clear all metrics, suggestions, and active optimizations
   */
  clear() {
    this.metricHistory = {
      insertTime: [],
      queryTime: [],
      collisionTime: [],
      totalTime: [],
      checksPerFrame: [],
      collisionsPerFrame: [],
    };
    this.lastAnalysis = 0;
    this.lastOptimization = 0;
    this.suggestions = [];
    this.activeOptimizations.clear();
    this.optimizationHistory.clear();
    this.optimizationChain = [];
    this.effectivenessHistory.clear();
    this.patternHistory.clear();
    this.sharedPatterns.clear();
    this.patternValidationHistory.clear();
    this.lastValidationTime = 0;

    // Clear stored patterns
    try {
      localStorage.removeItem(this.options.patternStorageKey);
    } catch (error) {
      console.error('Failed to clear stored patterns:', error);
    }
  }
}
