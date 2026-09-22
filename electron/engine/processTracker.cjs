const EventEmitter = require('events');

class ProcessTracker extends EventEmitter {
  constructor() {
    super();
    this.activeSessions = new Map();
  }

  /**
   * Start tracking a game session.
   * @param {string} gameId
   * @param {string} gameTitle
   */
  startSession(gameId, gameTitle) {
    if (this.activeSessions.has(gameId)) {
      return this.activeSessions.get(gameId);
    }

    const session = {
      gameId,
      gameTitle,
      startTime: Date.now(),
      lastHeartbeat: Date.now(),
    };

    this.activeSessions.set(gameId, session);
    this.emit('session-started', { gameId, gameTitle, startTime: session.startTime });
    return session;
  }

  /**
   * End a game session and calculate playtime.
   * @param {string} gameId
   * @returns {{ gameId: string, durationMinutes: number, endedAt: string }}
   */
  endSession(gameId) {
    const session = this.activeSessions.get(gameId);
    if (!session) return null;

    this.activeSessions.delete(gameId);
    const durationMs = Date.now() - session.startTime;
    const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));
    const endedAt = new Date().toISOString();

    const result = {
      gameId,
      gameTitle: session.gameTitle,
      durationMinutes,
      endedAt,
    };

    this.emit('session-ended', result);
    return result;
  }

  getActiveSessions() {
    return Array.from(this.activeSessions.values()).map((s) => ({
      gameId: s.gameId,
      gameTitle: s.gameTitle,
      durationMinutes: Math.round((Date.now() - s.startTime) / (1000 * 60)),
      startTime: s.startTime,
    }));
  }
}

module.exports = new ProcessTracker();
