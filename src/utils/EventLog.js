/**
 * In-game event log for tuning & debugging
 *
 * Records timestamped gameplay events to help understand what happened
 * during a session. Categorized, persistent, viewable in-game.
 *
 * Usage:
 *   import { eventLog } from '../utils/EventLog.js';
 *   eventLog.log('mining', 'Mined silicrystal x3', { type: 'silicrystal', count: 3 });
 *
 * View:
 *   - Press L in-game to toggle the log overlay
 *   - eventLog.export() returns JSON string
 *   - eventLog.dump() prints last 50 to console
 */

const MAX_EVENTS = 1000;
const STORAGE_KEY = 'smugRunEventLog';

// Event category colors for the in-game overlay
const CATEGORY_COLORS = {
  combat:    '#f66',
  mining:    '#4af',
  docking:   '#0ff',
  system:    '#fa4',
  death:     '#f00',
  damage:    '#f88',
  pickup:    '#4f4',
  trade:     '#ff0',
  enemy:     '#f4f',
  navigation:'#aaa',
  info:      '#888',
};

class EventLogger {
  constructor() {
    this.events = [];
    this.sessionStart = Date.now();
    this.gameStart = null; // set when game actually starts
    this.enabled = true;
  }

  startSession() {
    this.events = [];
    this.gameStart = Date.now();
    this.log('info', 'Session started', {});
  }

  /**
   * Log an event
   * @param {string} category - one of: combat, mining, docking, system, death, damage, pickup, trade, enemy, navigation, info
   * @param {string} message - short human-readable description
   * @param {Object} data - optional structured data
   */
  log(category, message, data = {}) {
    if (!this.enabled) return;
    const now = Date.now();
    const event = {
      t: this.gameStart ? (now - this.gameStart) / 1000 : 0, // seconds since game start
      ts: now,
      category,
      message,
      data,
    };
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) {
      this.events.shift();
    }
    // Save tail to localStorage (best-effort)
    this._saveToStorage();
  }

  _saveToStorage() {
    try {
      // Only save last 200 to keep storage small
      const tail = this.events.slice(-200);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sessionStart: this.sessionStart,
        gameStart: this.gameStart,
        events: tail,
      }));
    } catch (e) { /* ignore quota errors */ }
  }

  /** Print last N events to console for inspection */
  dump(n = 50) {
    const tail = this.events.slice(-n);
    console.group(`📜 Event Log — last ${tail.length} events`);
    tail.forEach(e => {
      const time = e.t.toFixed(1).padStart(6) + 's';
      const cat = e.category.padEnd(10);
      console.log(`%c${time} %c${cat}%c ${e.message}`,
        'color:#888', `color:${CATEGORY_COLORS[e.category] || '#fff'}`, 'color:#fff',
        e.data && Object.keys(e.data).length ? e.data : '');
    });
    console.groupEnd();
    return this.events;
  }

  /** Get summary statistics for the session */
  summary() {
    const counts = {};
    const damageDealt = [];
    const damageTaken = [];
    const resourcesMined = {};
    let kills = 0;
    let deaths = 0;
    let docks = 0;
    let systemFailures = 0;
    let creditsEarned = 0;

    for (const e of this.events) {
      counts[e.category] = (counts[e.category] || 0) + 1;
      if (e.category === 'damage') {
        if (e.data?.target === 'player') damageTaken.push(e.data.amount || 0);
        else damageDealt.push(e.data.amount || 0);
      }
      if (e.category === 'mining' && e.data?.type) {
        resourcesMined[e.data.type] = (resourcesMined[e.data.type] || 0) + (e.data.count || 1);
      }
      if (e.category === 'enemy' && e.data?.action === 'destroyed') kills++;
      if (e.category === 'death') deaths++;
      if (e.category === 'docking' && e.data?.action === 'docked') docks++;
      if (e.category === 'system' && e.data?.failure) systemFailures++;
      if (e.category === 'trade' && e.data?.credits) creditsEarned += e.data.credits;
    }

    return {
      sessionTime: this.gameStart ? ((Date.now() - this.gameStart) / 1000).toFixed(1) + 's' : '0s',
      totalEvents: this.events.length,
      byCategory: counts,
      enemiesKilled: kills,
      deaths,
      docks,
      systemFailures,
      damageDealt: { total: damageDealt.reduce((a, b) => a + b, 0), hits: damageDealt.length },
      damageTaken: { total: damageTaken.reduce((a, b) => a + b, 0), hits: damageTaken.length },
      resourcesMined,
      creditsEarned,
    };
  }

  /** Export full log as JSON */
  export() {
    return JSON.stringify({
      sessionStart: this.sessionStart,
      gameStart: this.gameStart,
      events: this.events,
      summary: this.summary(),
    }, null, 2);
  }

  /** Download as JSON file */
  download() {
    const data = this.export();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smug-run-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clear() {
    this.events = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  /** Load last session from storage (debug only) */
  loadLast() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  getCategoryColor(cat) {
    return CATEGORY_COLORS[cat] || '#fff';
  }
}

export const eventLog = new EventLogger();

// Expose to window for console debugging
if (typeof window !== 'undefined') {
  window.__eventLog = eventLog;
}
