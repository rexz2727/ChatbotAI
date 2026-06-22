'use strict';

// Must be set before requiring db.js / honeypot.js — both read these at load time.
process.env.SQLITE_DB_PATH = ':memory:';
process.env.MAX_ATTACHMENT_SIZE = '100';
delete process.env.VIRUSTOTAL_API_KEY;
delete process.env.VT_UPLOAD_UNKNOWN;

const {
  recordSecurityIncident,
  getSecurityIncidents,
  getSecurityIncidentSummary,
  db
} = require('../src/db');
const { processAttachment } = require('../src/honeypot');

beforeEach((done) => {
  db.run('DELETE FROM security_incidents', (err) => (err ? done(err) : done()));
});

afterEach(() => {
  jest.restoreAllMocks();
  if (global.fetch && global.fetch.mockRestore) {
    global.fetch.mockRestore();
  }
});

// ── db security incident functions (real SQLite :memory:) ──────────────────────

describe('db.js — security incidents', () => {
  test('recordSecurityIncident returns a positive lastID and auto-fills ts', async () => {
    const before = Date.now();
    const id = await recordSecurityIncident({
      platform: 'facebook',
      senderId: 'user_1',
      sha256: 'abc123',
      verdict: 'malicious',
      engines: 5,
      action: 'blocked'
    });

    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);

    const rows = await getSecurityIncidents(10);
    expect(rows).toHaveLength(1);
    expect(rows[0].verdict).toBe('malicious');
    expect(rows[0].engines).toBe(5);
    expect(rows[0].ts).toBeGreaterThanOrEqual(before);
  });

  test('getSecurityIncidents returns newest first and respects the limit', async () => {
    let ts = 2_000_000;
    const spy = jest.spyOn(Date, 'now').mockImplementation(() => (ts += 100));

    await recordSecurityIncident({ platform: 'fb', senderId: 'u', sha256: 'h1', verdict: 'safe', engines: 0, action: 'allowed' });
    await recordSecurityIncident({ platform: 'fb', senderId: 'u', sha256: 'h2', verdict: 'unknown', engines: null, action: 'quarantined-flagged' });
    await recordSecurityIncident({ platform: 'fb', senderId: 'u', sha256: 'h3', verdict: 'malicious', engines: 2, action: 'blocked' });

    spy.mockRestore();

    const rows = await getSecurityIncidents(2);
    expect(rows).toHaveLength(2);
    expect(rows[0].sha256).toBe('h3');
    expect(rows[1].sha256).toBe('h2');
  });

  test('getSecurityIncidentSummary categorizes verdicts correctly', async () => {
    const insert = (verdict) =>
      recordSecurityIncident({ platform: 'fb', senderId: 'u', sha256: 'h', verdict, engines: null, action: 'x' });

    await insert('malicious');
    await insert('safe');
    await insert('safe');
    await insert('unknown');   // suspicious
    await insert('oversize');  // suspicious
    await insert('error');

    const summary = await getSecurityIncidentSummary();
    expect(summary).toEqual({ scanned: 6, malicious: 1, suspicious: 2, safe: 2, error: 1 });
  });

  test('getSecurityIncidentSummary returns zeroes on an empty table', async () => {
    const summary = await getSecurityIncidentSummary();
    expect(summary).toEqual({ scanned: 0, malicious: 0, suspicious: 0, safe: 0, error: 0 });
  });
});

// ── honeypot offline behaviour (fetch stubbed, SQLite real) ────────────────────

describe('honeypot.js — processAttachment (offline)', () => {
  test('rejects an oversize attachment via declared content-length and logs incident', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: { get: (k) => (k === 'content-length' ? '999999' : null) }
    });

    const result = await processAttachment('https://x/file', 'user_big', 'facebook');

    expect(result).toEqual({ status: 'error' });

    const rows = await getSecurityIncidents(10);
    expect(rows).toHaveLength(1);
    expect(rows[0].verdict).toBe('oversize');
    expect(rows[0].action).toBe('rejected');
    expect(rows[0].sender_id).toBe('user_big');
  });

  test('rejects an oversize attachment when content-length is absent but body exceeds MAX', async () => {
    const bigBody = Buffer.alloc(500);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      arrayBuffer: async () => bigBody.buffer.slice(bigBody.byteOffset, bigBody.byteOffset + bigBody.length)
    });

    const result = await processAttachment('https://x/file', 'user_nolen', 'facebook');

    expect(result).toEqual({ status: 'error' });

    const rows = await getSecurityIncidents(10);
    expect(rows.some((r) => r.verdict === 'oversize' && r.action === 'rejected')).toBe(true);
  });

  test('records an error incident when the download fails (does not throw)', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    const result = await processAttachment('https://x/file', 'user_err', 'facebook');

    expect(result).toEqual({ status: 'error' });

    const rows = await getSecurityIncidents(10);
    expect(rows.some((r) => r.verdict === 'error')).toBe(true);
  });
});
