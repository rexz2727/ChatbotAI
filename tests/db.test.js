'use strict';

// Must be set before requiring db.js — the module reads this at load time
process.env.SQLITE_DB_PATH = ':memory:';

const {
  getSession,
  setSession,
  saveMessage,
  getConversationHistory,
  isMessageProcessed,
  markMessageProcessed,
  db
} = require('../src/db');

describe('db.js', () => {
  // Clean all tables before each test.
  // sqlite3 serializes all operations on the same db handle, so DELETEs queue
  // behind the CREATE TABLE statements issued at module load.
  beforeEach((done) => {
    db.serialize(() => {
      db.run('DELETE FROM sessions');
      db.run('DELETE FROM messages');
      db.run('DELETE FROM processed_messages', (err) => {
        if (err) done(err);
        else done();
      });
    });
  });

  afterEach(() => {
    // Restore any spies set up during individual tests
    jest.restoreAllMocks();
  });

  // ── getSession ─────────────────────────────────────────────────────────────

  describe('getSession', () => {
    test('returns null when user does not exist', async () => {
      const result = await getSession('ghost_user_001');
      expect(result).toBeNull();
    });

    test('rejects and propagates database errors', async () => {
      jest.spyOn(db, 'get').mockImplementationOnce((_q, _p, cb) => {
        cb(new Error('db read error'));
      });
      await expect(getSession('user_err')).rejects.toThrow('db read error');
    });
  });

  // ── setSession ─────────────────────────────────────────────────────────────

  describe('setSession', () => {
    test('creates a new session; getSession then returns the correct state', async () => {
      await setSession('user_a', 'AGENT_CU_TRU');
      const session = await getSession('user_a');

      expect(session).not.toBeNull();
      expect(session.user_id).toBe('user_a');
      expect(session.agent_state).toBe('AGENT_CU_TRU');
      expect(typeof session.updated_at).toBe('number');
    });

    test('updates an existing session (upsert) when called twice', async () => {
      await setSession('user_b', 'AGENT_CU_TRU');
      await setSession('user_b', 'AGENT_CAN_CUOC');

      const session = await getSession('user_b');
      expect(session.agent_state).toBe('AGENT_CAN_CUOC');
    });

    test('rejects and propagates database errors', async () => {
      jest.spyOn(db, 'run').mockImplementationOnce((_q, _p, cb) => {
        cb(new Error('db write error'));
      });
      await expect(setSession('user_err', 'STATE')).rejects.toThrow('db write error');
    });
  });

  // ── saveMessage ────────────────────────────────────────────────────────────

  describe('saveMessage', () => {
    test('returns a lastID that is a positive number', async () => {
      const lastID = await saveMessage('user_c', 'user', 'Xin chào');

      expect(typeof lastID).toBe('number');
      expect(lastID).toBeGreaterThan(0);
    });

    test('rejects and propagates database errors', async () => {
      jest.spyOn(db, 'run').mockImplementationOnce(function (_q, _p, cb) {
        cb.call({ lastID: 0 }, new Error('insert error'));
      });
      await expect(saveMessage('user_err', 'user', 'msg')).rejects.toThrow('insert error');
    });
  });

  // ── getConversationHistory ─────────────────────────────────────────────────

  describe('getConversationHistory', () => {
    test('returns messages in chronological order (oldest first)', async () => {
      let ts = 1_000_000;
      const spy = jest.spyOn(Date, 'now').mockImplementation(() => (ts += 100));

      await saveMessage('user_d', 'user', 'Message 1');
      await saveMessage('user_d', 'bot', 'Message 2');
      await saveMessage('user_d', 'user', 'Message 3');

      spy.mockRestore();

      const history = await getConversationHistory('user_d', 10);

      expect(history).toHaveLength(3);
      expect(history[0].content).toBe('Message 1');
      expect(history[1].content).toBe('Message 2');
      expect(history[2].content).toBe('Message 3');
    });

    test('respects the limit parameter', async () => {
      await saveMessage('user_e', 'user', 'Msg A');
      await saveMessage('user_e', 'bot', 'Msg B');
      await saveMessage('user_e', 'user', 'Msg C');

      const history = await getConversationHistory('user_e', 2);
      expect(history).toHaveLength(2);
    });

    test('rejects and propagates database errors', async () => {
      jest.spyOn(db, 'all').mockImplementationOnce((_q, _p, cb) => {
        cb(new Error('all error'));
      });
      await expect(getConversationHistory('user_err', 5)).rejects.toThrow('all error');
    });
  });

  // ── isMessageProcessed / markMessageProcessed ──────────────────────────────

  describe('isMessageProcessed and markMessageProcessed', () => {
    test('returns false for a mid that has never been processed', async () => {
      const processed = await isMessageProcessed('mid_unknown_xyz');
      expect(processed).toBe(false);
    });

    test('returns true after markMessageProcessed is called for that mid', async () => {
      await markMessageProcessed('mid_abc_001');
      const processed = await isMessageProcessed('mid_abc_001');
      expect(processed).toBe(true);
    });

    test('markMessageProcessed is idempotent (INSERT OR IGNORE)', async () => {
      await markMessageProcessed('mid_dup_001');
      await expect(markMessageProcessed('mid_dup_001')).resolves.toBeUndefined();
      expect(await isMessageProcessed('mid_dup_001')).toBe(true);
    });

    test('isMessageProcessed rejects on database error', async () => {
      jest.spyOn(db, 'get').mockImplementationOnce((_q, _p, cb) => {
        cb(new Error('get error'));
      });
      await expect(isMessageProcessed('mid_err')).rejects.toThrow('get error');
    });

    test('markMessageProcessed rejects on database error', async () => {
      jest.spyOn(db, 'run').mockImplementationOnce((_q, _p, cb) => {
        cb(new Error('run error'));
      });
      await expect(markMessageProcessed('mid_err')).rejects.toThrow('run error');
    });
  });
});
