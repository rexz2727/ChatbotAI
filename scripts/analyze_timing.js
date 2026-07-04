#!/usr/bin/env node
// F1 — Tổng hợp p50/p95 từ log [TIMING].
'use strict';
const readline = require('readline');

const rows = [];
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const i = line.indexOf('[TIMING] ');
  if (i === -1) return;
  try { rows.push(JSON.parse(line.slice(i + '[TIMING] '.length))); } catch (_) { /* dòng hỏng, bỏ qua */ }
});
rl.on('close', () => {
  if (rows.length === 0) { console.log('Không tìm thấy dòng [TIMING] nào trên stdin.'); return; }

  const pct = (arr, p) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
  };

  const hits = rows.filter(r => r.cache_hit).length;
  const nonCache = rows.filter(r => !r.cache_hit);
  console.log(`Tổng tin RAG: ${rows.length} | cache-hit: ${hits} (${(hits / rows.length * 100).toFixed(1)}%)`);
  console.log('\nGiai đoạn |  p50(ms) |  p95(ms) |  max(ms)   [chỉ tin KHÔNG trúng cache]');
  for (const st of ['rag', 'pass1', 'pass2', 'send', 'total']) {
    const vals = nonCache.map(r => r[st]).filter(v => typeof v === 'number');
    if (vals.length === 0) continue;
    console.log(`${st.padEnd(9)} | ${String(pct(vals, 50)).padStart(8)} | ${String(pct(vals, 95)).padStart(8)} | ${String(Math.max(...vals)).padStart(8)}`);
  }

  const byModel = {};
  for (const r of nonCache) {
    const k = r.model_used || '(thất bại toàn bộ)';
    byModel[k] = (byModel[k] || 0) + 1;
  }
  console.log('\nModel thành công:', JSON.stringify(byModel, null, 2));

  const tried = nonCache.map(r => r.models_tried).filter(v => typeof v === 'number');
  if (tried.length > 0) {
    console.log(`models_tried: p50=${pct(tried, 50)} p95=${pct(tried, 95)} max=${Math.max(...tried)}  (>2 = có failover/503)`);
  }
});
