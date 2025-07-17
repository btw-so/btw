import Dexie from 'dexie';

function createSessionsDB(dbName = 'IntelligenceSessionsDB') {
  const db = new Dexie(dbName);
  db.version(1).stores({
    sessions: '++id,createdAt,updatedAt', // id is auto-incremented
  });

  return {
    async addSession({ name, tabs }) {
      const now = Date.now();
      const id = await db.sessions.add({
        name: name || new Date(now).toLocaleString(),
        createdAt: now,
        updatedAt: now,
        tabs: tabs || [],
      });
      return id;
    },

    // Get sessions paginated (most recent first)
    async getSessionsPaginated({ page = 0, pageSize = 30 } = {}) {
      const total = await db.sessions.count();
      const sessions = await db.sessions
        .orderBy('createdAt')
        .reverse()
        .offset(page * pageSize)
        .limit(pageSize)
        .toArray();
      return { sessions, total };
    },

    // Get a session by id
    async getSessionById(id) {
      return db.sessions.get(id);
    },

    // Update a session (by id)
    async updateSession(id, updates) {
      updates.updatedAt = Date.now();
      return db.sessions.update(id, updates);
    },

    // Delete a session
    async deleteSession(id) {
      return db.sessions.delete(id);
    },

    // Expire sessions older than 30 days
    async expireOldSessions() {
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const oldSessions = await db.sessions
        .where('createdAt')
        .below(now - THIRTY_DAYS)
        .primaryKeys();
      if (oldSessions.length > 0) {
        await db.sessions.bulkDelete(oldSessions);
      }
      return oldSessions.length;
    },
  };
}

// Default export for backward compatibility
const sessionsDB = createSessionsDB('IntelligenceSessionsDB');
export default sessionsDB;
export { createSessionsDB }; 