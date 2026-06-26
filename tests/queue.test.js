'use strict';

// Must be set before requiring db.js — the module reads this at load time.
// Real in-memory SQLite (CLAUDE.md rule 5: never mock the DB).
process.env.SQLITE_DB_PATH = ':memory:';

const {
  enqueueMessage,
  dequeueMessage,
  completeMessage,
  db
} = require('../src/db');

// Insert a queue row with an explicit created_at so ordering is deterministic.
function enqueueAt(platform, senderId, text, createdAt) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO message_queue (platform, sender_id, message_text, payload, created_at, status) VALUES (?, ?, ?, ?, ?, ?)',
      [platform, senderId, text, null, createdAt, 'pending'],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

function countByStatus(status) {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS c FROM message_queue WHERE status = ?', [status], (err, row) => {
      if (err) return reject(err);
      resolve(row.c);
    });
  });
}

describe('dequeueMessage — concurrency & atomic claim', () => {
  beforeEach((done) => {
    db.run('DELETE FROM message_queue', (err) => done(err));
  });

  // ── Case A: no duplicate claim across many concurrent dequeues ───────────────
  test('drains the queue with no id claimed twice and no message lost', async () => {
    const senders = ['userA', 'userB', 'userC'];
    let ts = 1_000_000;
    for (const s of senders) {
      for (let i = 0; i < 3; i++) {
        await enqueueAt('facebook', s, `${s}-${i}`, ts++);
      }
    }
    // 9 messages total from 3 senders.

    const claimedIds = [];
    const inFlight = new Set();

    // Simulate the bounded-concurrency worker draining the queue.
    // Each pass fires up to 3 concurrent dequeues with the in-flight exclusion,
    // then "completes" each claimed message (freeing its sender).
    let safety = 100;
    while ((await countByStatus('pending')) > 0 && safety-- > 0) {
      const batch = await Promise.all([
        dequeueMessage([...inFlight]),
        dequeueMessage([...inFlight]),
        dequeueMessage([...inFlight])
      ]);
      const claimed = batch.filter(Boolean);
      for (const msg of claimed) {
        claimedIds.push(msg.id);
        inFlight.add(msg.sender_id);
      }
      for (const msg of claimed) {
        await completeMessage(msg.id);
        inFlight.delete(msg.sender_id);
      }
    }

    expect(claimedIds.length).toBe(9);                       // nothing lost
    expect(new Set(claimedIds).size).toBe(9);                // no id claimed twice
    expect(await countByStatus('pending')).toBe(0);
  });

  // ── Case B: per-sender ordering preserved ────────────────────────────────────
  test('claims a single sender\'s messages strictly oldest-first, never two at once', async () => {
    const id1 = await enqueueAt('facebook', 'solo', 'first', 1000);
    const id2 = await enqueueAt('facebook', 'solo', 'second', 2000);
    const id3 = await enqueueAt('facebook', 'solo', 'third', 3000);

    const inFlight = new Set();

    // Claim message 1.
    const m1 = await dequeueMessage([...inFlight]);
    expect(m1.id).toBe(id1);
    expect(m1.message_text).toBe('first');
    inFlight.add(m1.sender_id);

    // While 'solo' is in-flight, no other message can be claimed (sender excluded).
    const blocked = await dequeueMessage([...inFlight]);
    expect(blocked).toBeNull();

    // Complete message 1, free the sender, then the next oldest is claimable.
    await completeMessage(m1.id);
    inFlight.delete(m1.sender_id);

    const m2 = await dequeueMessage([...inFlight]);
    expect(m2.id).toBe(id2);
    inFlight.add(m2.sender_id);
    expect(await dequeueMessage([...inFlight])).toBeNull();
    await completeMessage(m2.id);
    inFlight.delete(m2.sender_id);

    const m3 = await dequeueMessage([...inFlight]);
    expect(m3.id).toBe(id3);
  });

  // ── Case C: atomic claim under two simultaneous dequeues ─────────────────────
  test('two concurrent dequeues on a single message → exactly one wins', async () => {
    await enqueueAt('facebook', 'racer', 'only', 5000);

    const [a, b] = await Promise.all([
      dequeueMessage(),   // no-arg: backward-compatible
      dequeueMessage()
    ]);

    const winners = [a, b].filter(Boolean);
    expect(winners.length).toBe(1);                // exactly one claim
    expect(winners[0].message_text).toBe('only');
    expect([a, b].filter((x) => x === null).length).toBe(1); // other got null
    expect(await countByStatus('processing')).toBe(1);
  });
});
