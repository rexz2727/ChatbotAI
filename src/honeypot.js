// Using native fetch instead of axios
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const quarantinedFilePath = path.join(quarantineDir, `${hash}.quarantined`);
    
    fs.writeFileSync(quarantinedFilePath, buffer, { mode: 0o400 });

    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    if (apiKey && apiKey !== 'your_virustotal_api_key_here') {
      try {
        const vtResponse = await fetch(`https://www.virustotal.com/api/v3/files/${hash}`, {
            headers: { 'x-apikey': apiKey }
        });
        if (!vtResponse.ok) {
            if (vtResponse.status === 404) return { status: 'safe' };
            console.log(`[Honeypot] VirusTotal API error for hash ${hash}`);
            return { status: 'error' };
        }
        const data = await vtResponse.json();
        const stats = data.data.attributes.last_analysis_stats;
        if (stats && stats.malicious > 0) {
          const reportPath = path.join(forensicsDir, `report_${hash}.txt`);
          const reportContent = `Sender ID: ${senderId}\nPlatform: ${platform}\nTimestamp: ${new Date().toISOString()}\nHash (SHA-256): ${hash}\nStatus: Malicious (${stats.malicious} engines detected)\n`;
          fs.writeFileSync(reportPath, reportContent);

          execSync(`zip -P infected ../forensics/malware_${hash}.zip ${hash}.quarantined`, { cwd: quarantineDir });
          
          fs.unlinkSync(quarantinedFilePath);
          
          return { status: 'malicious' };
        }
      } catch (vtError) {
        if (vtError.response && vtError.response.status === 404) {
          // File not found on VT, assume safe
          return { status: 'safe' };
        }
        throw vtError;
      }
    }
    
    return { status: 'safe' };
  } catch (error) {
    console.error(`[HONEYPOT] Error processing attachment: ${error.message}`);
    return { status: 'error' };
  }
}

module.exports = {
  processAttachment
};
