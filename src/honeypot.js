// Using native fetch instead of axios
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const MAX_ATTACHMENT_SIZE = parseInt(process.env.MAX_ATTACHMENT_SIZE) || 25 * 1024 * 1024;

// Best-effort incident logging — must never break the webhook flow.
async function safeRecord(incident) {
  try {
    await db.recordSecurityIncident(incident);
  } catch (err) {
    console.error(`[HONEYPOT] Failed to record incident: ${err.message}`);
  }
}

async function processAttachment(url, senderId, platform) {
  try {
    const quarantineDir = path.join(process.cwd(), 'data', 'logs', 'quarantine');
    const forensicsDir = path.join(process.cwd(), 'data', 'logs', 'forensics');

    if (!fs.existsSync(quarantineDir)) {
      fs.mkdirSync(quarantineDir, { recursive: true });
    }
    if (!fs.existsSync(forensicsDir)) {
      fs.mkdirSync(forensicsDir, { recursive: true });
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const declaredSize = parseInt(response.headers.get('content-length'));
    if (!Number.isNaN(declaredSize) && declaredSize > MAX_ATTACHMENT_SIZE) {
      console.warn(`[HONEYPOT] Rejected oversize attachment (declared ${declaredSize} bytes) from ${senderId}`);
      await safeRecord({ platform, senderId, sha256: null, verdict: 'oversize', engines: null, action: 'rejected' });
      return { status: 'error' };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // content-length may be absent or lie; enforce the real size after download.
    if (buffer.length > MAX_ATTACHMENT_SIZE) {
      console.warn(`[HONEYPOT] Rejected oversize attachment (actual ${buffer.length} bytes) from ${senderId}`);
      await safeRecord({ platform, senderId, sha256: null, verdict: 'oversize', engines: null, action: 'rejected' });
      return { status: 'error' };
    }

    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const quarantinedFilePath = path.join(quarantineDir, `${hash}.quarantined`);

    // Same sha256 == identical bytes already quarantined. The file is written mode 0o400
    // (read-only), so re-writing the same hash (e.g. a common FB sticker many users send)
    // fails with EACCES. Skip the write when it already exists.
    if (!fs.existsSync(quarantinedFilePath)) {
      fs.writeFileSync(quarantinedFilePath, buffer, { mode: 0o400 });
    }

    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    if (apiKey && apiKey !== 'your_virustotal_api_key_here') {
      const vtResponse = await fetch(`https://www.virustotal.com/api/v3/files/${hash}`, {
        headers: { 'x-apikey': apiKey }
      });

      if (!vtResponse.ok) {
        if (vtResponse.status === 404) {
          // VT has never seen this file — keep it quarantined and flag for review.
          console.warn(`[HONEYPOT] Unknown file (VT 404) quarantined: ${hash} from ${senderId}`);
          await safeRecord({ platform, senderId, sha256: hash, verdict: 'unknown', engines: null, action: 'quarantined-flagged' });

          if (process.env.VT_UPLOAD_UNKNOWN === 'true') {
            try {
              const form = new FormData();
              form.append('file', new Blob([buffer]), `${hash}.bin`);
              await fetch('https://www.virustotal.com/api/v3/files', {
                method: 'POST',
                headers: { 'x-apikey': apiKey },
                body: form
              });
              console.warn(`[HONEYPOT] Submitted unknown file ${hash} to VirusTotal for analysis`);
            } catch (uploadErr) {
              console.error(`[HONEYPOT] VT upload failed for ${hash}: ${uploadErr.message}`);
            }
          }

          return { status: 'unknown' };
        }
        console.warn(`[HONEYPOT] VirusTotal API error (HTTP ${vtResponse.status}) for hash ${hash}`);
        await safeRecord({ platform, senderId, sha256: hash, verdict: 'error', engines: null, action: 'allowed' });
        return { status: 'error' };
      }

      const data = await vtResponse.json();
      const stats = data.data.attributes.last_analysis_stats;
      if (stats && stats.malicious > 0) {
        const reportPath = path.join(forensicsDir, `report_${hash}.txt`);
        const reportContent = `Sender ID: ${senderId}\nPlatform: ${platform}\nTimestamp: ${new Date().toISOString()}\nHash (SHA-256): ${hash}\nStatus: Malicious (${stats.malicious} engines detected)\n`;
        fs.writeFileSync(reportPath, reportContent);

        // Keep the quarantined file intact for forensic analysis — do not zip or delete.
        console.warn(`[HONEYPOT] Malicious file blocked: ${hash} (${stats.malicious} engines) from ${senderId}`);
        await safeRecord({ platform, senderId, sha256: hash, verdict: 'malicious', engines: stats.malicious, action: 'blocked' });
        return { status: 'malicious' };
      }

      // VT reports clean — safe to discard the quarantined copy.
      try {
        fs.unlinkSync(quarantinedFilePath);
      } catch (unlinkErr) {
        console.error(`[HONEYPOT] Could not remove clean quarantine file ${hash}: ${unlinkErr.message}`);
      }
      await safeRecord({ platform, senderId, sha256: hash, verdict: 'safe', engines: 0, action: 'allowed' });
      return { status: 'safe' };
    }

    // No VirusTotal key configured — cannot scan, treat as safe but log.
    await safeRecord({ platform, senderId, sha256: hash, verdict: 'safe', engines: null, action: 'allowed' });
    return { status: 'safe' };
  } catch (error) {
    console.error(`[HONEYPOT] Error processing attachment: ${error.message}`);
    await safeRecord({ platform, senderId, sha256: null, verdict: 'error', engines: null, action: 'allowed' });
    return { status: 'error' };
  }
}

module.exports = {
  processAttachment
};
