'use strict';

// Must be set before requiring admin.js / db.js — both read env at load time.
process.env.SQLITE_DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret-for-admin-tokens';

const {
  signToken,
  verifyToken,
  getClientIp,
  isLoginBlocked,
  recordLoginFailure,
  resetLoginFailures,
  loginRetryAfterSeconds,
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
} = require('../src/admin');

describe('admin.js auth tokens', () => {
  test('signToken produces a verifiable token and verifyToken returns the payload', () => {
    const token = signToken({ u: 'admin', iat: Date.now() });
    const payload = verifyToken(token);

    expect(payload).not.toBeNull();
    expect(payload.u).toBe('admin');
    expect(typeof payload.iat).toBe('number');
  });

  test('verifyToken rejects a token with a tampered signature', () => {
    const token = signToken({ u: 'admin', iat: Date.now() });
    const [payload, sig] = token.split('.');
    // Flip the last hex char of the signature
    const lastChar = sig[sig.length - 1];
    const flipped = sig.slice(0, -1) + (lastChar === '0' ? '1' : '0');
    const tampered = `${payload}.${flipped}`;

    expect(verifyToken(tampered)).toBeNull();
  });

  test('verifyToken rejects a token whose payload was tampered (signature mismatch)', () => {
    const token = signToken({ u: 'admin', iat: Date.now() });
    const sig = token.split('.')[1];
    const forgedPayload = Buffer.from(JSON.stringify({ u: 'hacker', iat: Date.now() })).toString('base64url');

    expect(verifyToken(`${forgedPayload}.${sig}`)).toBeNull();
  });

  test('verifyToken rejects an expired token (iat older than 8 hours)', () => {
    const nineHoursAgo = Date.now() - 9 * 60 * 60 * 1000;
    const token = signToken({ u: 'admin', iat: nineHoursAgo });

    expect(verifyToken(token)).toBeNull();
  });

  test('verifyToken returns null for malformed input', () => {
    expect(verifyToken(null)).toBeNull();
    expect(verifyToken('')).toBeNull();
    expect(verifyToken('no-dot-here')).toBeNull();
    expect(verifyToken('a.b.c')).toBeNull();
  });
});

describe('admin.js login rate limiting', () => {
  // Distinct IP per test so the shared in-memory Map cannot leak state between cases.
  test('allows up to LOGIN_MAX_FAILURES failures then blocks the next attempt', () => {
    const ip = '10.0.0.1';
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
      expect(isLoginBlocked(ip)).toBe(false);
      recordLoginFailure(ip);
    }
    // 6th attempt (after 5 recorded failures) is blocked
    expect(isLoginBlocked(ip)).toBe(true);
  });

  test('successful login (resetLoginFailures) clears the counter for that IP', () => {
    const ip = '10.0.0.2';
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) recordLoginFailure(ip);
    expect(isLoginBlocked(ip)).toBe(true);

    resetLoginFailures(ip);
    expect(isLoginBlocked(ip)).toBe(false);
  });

  test('block expires after the time window elapses', () => {
    const ip = '10.0.0.3';
    const start = 1_000_000;
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) recordLoginFailure(ip, start);
    expect(isLoginBlocked(ip, start)).toBe(true);

    const afterWindow = start + LOGIN_WINDOW_MS + 1;
    expect(isLoginBlocked(ip, afterWindow)).toBe(false);
  });

  test('failures from different IPs are counted independently', () => {
    const ipA = '10.0.0.4';
    const ipB = '10.0.0.5';
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) recordLoginFailure(ipA);
    expect(isLoginBlocked(ipA)).toBe(true);
    expect(isLoginBlocked(ipB)).toBe(false);
  });

  test('loginRetryAfterSeconds returns a positive value while blocked', () => {
    const ip = '10.0.0.6';
    const start = 2_000_000;
    recordLoginFailure(ip, start);
    const retry = loginRetryAfterSeconds(ip, start);
    expect(retry).toBeGreaterThan(0);
    expect(retry).toBeLessThanOrEqual(LOGIN_WINDOW_MS / 1000);
  });

  test('getClientIp prefers first x-forwarded-for entry, then req.ip, then socket', () => {
    expect(getClientIp({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })).toBe('1.2.3.4');
    expect(getClientIp({ headers: {}, ip: '9.9.9.9' })).toBe('9.9.9.9');
    expect(getClientIp({ headers: {}, socket: { remoteAddress: '8.8.8.8' } })).toBe('8.8.8.8');
  });
});
