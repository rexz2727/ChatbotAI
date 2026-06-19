'use strict';

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PDF_DIR = path.join(PROJECT_ROOT, 'docs', 'legal_pdfs');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');

// Mapping: PDF filename → target .txt knowledge base file
const PDF_TO_KB = {
  'luat_cu_tru_2020.pdf':   'cu_tru.txt',
  'nghi_dinh_56_2023.pdf':  'cu_tru.txt',
  'thong_tu_66_2023.pdf':   'cu_tru.txt',
  'luat_can_cuoc_2023.pdf': 'can_cuoc.txt',
  'thong_tu_28_2024.pdf':   'can_cuoc.txt',
  'thong_tu_24_2023.pdf':   'can_cuoc.txt',
  'nghi_dinh_136_2020.pdf': 'giao_thong.txt',
  'nghi_dinh_144_2021.pdf': 'an_ninh.txt',
  'luat_khieu_nai_2011.pdf':'khieu_nai.txt',
  'luat_to_cao_2018.pdf':   'khieu_nai.txt',
};

/**
 * Clean raw extracted PDF text:
 * - Collapse excessive blank lines (>2 consecutive) into a single blank line
 * - Remove standalone page number lines (e.g. "- 1 -", "1", "Trang 1")
 * - Remove trailing whitespace on each line
 */
function cleanText(raw) {
  return raw
    .split('\n')
    .map(line => line.trimEnd())
    // Remove standalone page number patterns
    .filter(line => !(/^[-–\s]*\d+[-–\s]*$/.test(line)))
    .filter(line => !(/^(Trang|Page)\s+\d+(\s+of\s+\d+)?$/i.test(line)))
    .join('\n')
    // Collapse 3+ consecutive blank lines into 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractPdf(pdfPath) {
  const buffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function main() {
  const stats = {
    success: 0,
    skipped: 0,
    failed: 0,
    bytesAdded: {},
  };

  // Initialise bytesAdded counters
  for (const kb of new Set(Object.values(PDF_TO_KB))) {
    stats.bytesAdded[kb] = 0;
  }

  const pdfFiles = Object.keys(PDF_TO_KB);

  for (const pdfName of pdfFiles) {
    const pdfPath = path.join(PDF_DIR, pdfName);
    const kbFile  = PDF_TO_KB[pdfName];
    const kbPath  = path.join(DATA_DIR, kbFile);
    const marker  = `NGUỒN: ${pdfName}`;

    console.log(`\n[PROCESSING] ${pdfName} → ${kbFile}`);

    // --- Skip if PDF does not exist ---
    if (!fs.existsSync(pdfPath)) {
      console.warn(`  [WARN] PDF not found, skipping: ${pdfPath}`);
      stats.failed++;
      continue;
    }

    // --- Skip if already appended ---
    if (fs.existsSync(kbPath)) {
      const existing = fs.readFileSync(kbPath, 'utf8');
      if (existing.includes(marker)) {
        console.log(`  [SKIP] Already present in ${kbFile}`);
        stats.skipped++;
        continue;
      }
    }

    // --- Extract text ---
    let rawText;
    try {
      rawText = await extractPdf(pdfPath);
    } catch (err) {
      console.error(`  [ERROR] Failed to parse ${pdfName}: ${err.message}`);
      console.error('         File may be encrypted or image-based (scanned). Skipping.');
      stats.failed++;
      continue;
    }

    if (!rawText || rawText.trim().length === 0) {
      console.warn(`  [WARN] No text extracted from ${pdfName} (possibly scanned/image PDF). Skipping.`);
      stats.failed++;
      continue;
    }

    const cleaned = cleanText(rawText);
    const separator = `\n\n=== NGUỒN: ${pdfName} ===\n\n`;
    const appendContent = separator + cleaned + '\n';

    // --- Append to knowledge base file ---
    try {
      fs.appendFileSync(kbPath, appendContent, 'utf8');
      const bytes = Buffer.byteLength(appendContent, 'utf8');
      stats.bytesAdded[kbFile] += bytes;
      stats.success++;
      console.log(`  [OK] Appended ${bytes.toLocaleString()} bytes to ${kbFile}`);
    } catch (err) {
      console.error(`  [ERROR] Could not write to ${kbPath}: ${err.message}`);
      stats.failed++;
    }
  }

  // --- Summary ---
  console.log('\n========== SUMMARY ==========');
  console.log(`PDFs extracted successfully : ${stats.success}`);
  console.log(`PDFs skipped (already done) : ${stats.skipped}`);
  console.log(`PDFs failed / not extracted : ${stats.failed}`);
  console.log('\nBytes appended per knowledge base file:');
  for (const [kb, bytes] of Object.entries(stats.bytesAdded)) {
    if (bytes > 0) {
      console.log(`  ${kb}: +${bytes.toLocaleString()} bytes`);
    }
  }
  console.log('==============================\n');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
