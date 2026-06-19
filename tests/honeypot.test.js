'use strict';

// ── Module-level mocks ────────────────────────────────────────────────────────

jest.mock('axios');

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  readFileSync: jest.fn()
}));

jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const axios = require('axios');
const fs = require('fs');
const { processAttachment } = require('../src/honeypot');

// ── Test suite ────────────────────────────────────────────────────────────────

describe('honeypot.js — processAttachment', () => {
  const MOCK_URL = 'https://example.com/attachment.pdf';
  const SENDER_ID = 'user_123';
  const PLATFORM = 'facebook';

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.VIRUSTOTAL_API_KEY;
    // Default: directories already exist → no mkdirSync call
    fs.existsSync.mockReturnValue(true);
    fs.writeFileSync.mockReturnValue(undefined);
  });

  // ── No VirusTotal key → safe ────────────────────────────────────────────────

  test('returns { status: "safe" } when VIRUSTOTAL_API_KEY is not configured', async () => {
    axios.get.mockResolvedValue({ data: Buffer.from('mock file content') });

    const result = await processAttachment(MOCK_URL, SENDER_ID, PLATFORM);

    expect(result).toEqual({ status: 'safe' });
  });

  // ── axios.get throws → error ────────────────────────────────────────────────

  test('returns { status: "error" } when the file download throws', async () => {
    axios.get.mockRejectedValue(new Error('Network timeout'));

    const result = await processAttachment(MOCK_URL, SENDER_ID, PLATFORM);

    expect(result).toEqual({ status: 'error' });
  });

  // ── VT key set but VT responds 404 → safe ──────────────────────────────────

  test('returns { status: "safe" } when VirusTotal responds with 404 (file unknown)', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'vt_real_key_12345';
    const notFoundError = Object.assign(new Error('Not found'), {
      response: { status: 404 }
    });
    axios.get
      .mockResolvedValueOnce({ data: Buffer.from('unknown file content') })
      .mockRejectedValueOnce(notFoundError);

    const result = await processAttachment(MOCK_URL, SENDER_ID, PLATFORM);

    expect(result).toEqual({ status: 'safe' });
  });

  // ── Directories do not exist → mkdirSync called ───────────────────────────

  test('creates quarantine and forensics directories when they are absent', async () => {
    fs.existsSync.mockReturnValue(false);
    axios.get.mockResolvedValue({ data: Buffer.from('some content') });

    const result = await processAttachment(MOCK_URL, SENDER_ID, PLATFORM);

    expect(fs.mkdirSync).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ status: 'safe' });
  });

  // ── VT detects malicious file ─────────────────────────────────────────────

  test('returns { status: "malicious" } when VT reports malicious engines', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'vt_key_99999';
    axios.get
      .mockResolvedValueOnce({ data: Buffer.from('definitely malware') })
      .mockResolvedValueOnce({
        data: {
          data: {
            attributes: {
              last_analysis_stats: { malicious: 3, undetected: 60 }
            }
          }
        }
      });

    const result = await processAttachment(MOCK_URL, SENDER_ID, PLATFORM);

    expect(result).toEqual({ status: 'malicious' });
  });

  // ── Non-404 VT error is re-thrown and caught as "error" ───────────────────

  test('returns { status: "error" } when VT API throws a non-404 server error', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'vt_key_99999';
    const serverError = Object.assign(new Error('Internal Server Error'), {
      response: { status: 500 }
    });
    axios.get
      .mockResolvedValueOnce({ data: Buffer.from('some content') })
      .mockRejectedValueOnce(serverError);

    const result = await processAttachment(MOCK_URL, SENDER_ID, PLATFORM);

    expect(result).toEqual({ status: 'error' });
  });
});
