// RAG accuracy guard — chống "địa chỉ bịa" và chunk rác phân trang.
// Bối cảnh (2026-06-24): embedding 503 từng âm thầm dùng vector mock → ChromaDB
// trả chunk rác ("-- 8 of 30 --") và LLM bịa địa chỉ ("Số 12 Lý Tự Trọng").
// Địa chỉ ĐÚNG nằm ở data/knowledge/_chung/lien_he_co_quan.txt (chứa "D27").
//
// CLAUDE.md rule 5: KHÔNG mock Chroma/SQLite. Case A query ChromaDB THẬT (container
// chatbot-chromadb) bằng đúng embedding model đã seed; nếu Chroma/API key không sẵn
// thì soft-skip (warn, không fail giả). Case B kiểm tầng chunking offline, luôn chạy.

require('dotenv').config({ override: true });
const { ChromaClient } = require('chromadb');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const _port = process.env.CHROMA_PORT ? parseInt(process.env.CHROMA_PORT, 10) : 8000;
const CHROMA_PORT = isNaN(_port) ? 8000 : _port;

// Phải khớp src/chatbot.js (EMBEDDING_MODELS) để query rơi vào ĐÚNG không gian vector đã seed.
const EMBEDDING_MODELS = ['gemini-embedding-2', 'gemini-embedding-001'];

// Marker phân trang PDF cần KHÔNG xuất hiện trong kết quả (dạng "-- 8 of 30 --").
const PAGE_MARKER = /-{2,}\s*\d+\s+of\s+\d+\s*-{2,}/;
const FAKE_ADDRESS = /Số\s*12\s*Lý\s*Tự\s*Trọng/i;

function isRealKey(k) {
  return !!k && k !== 'your_gemini_api_key_here' && k.trim() !== '';
}

async function embedText(genAI, text) {
  let lastErr;
  for (const modelName of EMBEDDING_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const r = await model.embedContent(text);
      return r.embedding.values;
    } catch (err) {
      lastErr = err; // thử model embedding kế tiếp
    }
  }
  throw lastErr || new Error('All embedding models failed');
}

// Embedding function khớp src/chatbot.js — KHÔNG fallback mock: vector sai còn tệ hơn không có.
function makeEmbeddingFunction(genAI) {
  return {
    generate: async (texts) => {
      const out = [];
      for (const t of texts) out.push(await embedText(genAI, t));
      return out;
    }
  };
}

async function retrieve(genAI, dbName, queryText, nResults = 3) {
  const client = new ChromaClient({ host: CHROMA_HOST, port: CHROMA_PORT });
  const col = await client.getCollection({ name: dbName, embeddingFunction: makeEmbeddingFunction(genAI) });
  const res = await col.query({ queryTexts: [queryText], nResults });
  return (res.documents && res.documents[0]) || [];
}

// ---- Case A: ChromaDB thật ----
describe('Case A — RAG thật không trả địa chỉ bịa / chunk rác', () => {
  let chromaUp = false;
  let genAI = null;
  const present = new Set();

  beforeAll(async () => {
    const key = process.env.GEMINI_API_KEY;
    if (!isRealKey(key)) {
      console.warn('[rag_accuracy] GEMINI_API_KEY không thật → bỏ qua Case A.');
      return;
    }
    try {
      const client = new ChromaClient({ host: CHROMA_HOST, port: CHROMA_PORT });
      await client.heartbeat();
      const cols = await client.listCollections();
      for (const c of cols) present.add(typeof c === 'string' ? c : c.name);
      genAI = new GoogleGenerativeAI(key);
      chromaUp = true;
    } catch (err) {
      console.warn(`[rag_accuracy] Chroma không reachable (${err.message}) → bỏ qua Case A.`);
    }
  }, 30000);

  const QUERIES = [
    { db: 'db__chung_lien_he_co_quan', q: 'trụ sở công an phường ở đâu' },
    { db: 'db__chung_lien_he_co_quan', q: 'số điện thoại trực ban công an phường' },
    { db: 'db_pc06_can_cuoc', q: 'lệ phí làm căn cước công dân' },
    { db: 'db_pc06_cu_tru', q: 'đăng ký tạm trú cần giấy tờ gì' },
    { db: 'db_pc06_cu_tru', q: 'thủ tục đăng ký thường trú' },
    { db: 'db_pc08_giao_thong', q: 'phạt nguội xe máy tra cứu ở đâu' },
    { db: 'db__chung_thu_tuc_hanh_chinh', q: 'thủ tục hành chính nộp hồ sơ trực tuyến' }
  ];

  test.each(QUERIES)('[$db] "$q" → không có địa chỉ bịa / marker phân trang', async ({ db, q }) => {
    if (!chromaUp || !present.has(db)) {
      console.warn(`[rag_accuracy] skip "${q}" (Chroma/collection ${db} không sẵn).`);
      return;
    }
    const docs = await retrieve(genAI, db, q);
    const joined = docs.join('\n');
    expect(joined).not.toMatch(FAKE_ADDRESS);
    expect(joined).not.toMatch(PAGE_MARKER);
  }, 30000);

  test('[positive] hỏi trụ sở → trả đúng địa chỉ chứa "D27"', async () => {
    const db = 'db__chung_lien_he_co_quan';
    if (!chromaUp || !present.has(db)) {
      console.warn('[rag_accuracy] skip positive D27 (Chroma không sẵn).');
      return;
    }
    const docs = await retrieve(genAI, db, 'trụ sở công an phường ở đâu');
    expect(docs.join('\n')).toMatch(/D27/);
  }, 30000);
});

// ---- Case B: tầng chunking offline (luôn chạy, không cần Chroma) ----
// Giữ ĐỒNG BỘ với src/init_db.js (~dòng 140-161). Không require init_db.js trực tiếp
// vì file đó tự chạy seed() khi import.
describe('Case B — chunking loại bỏ marker phân trang', () => {
  const STRIP_MARKER = /^[ \t]*-+[ \t]*\d+[ \t]+of[ \t]+\d+[ \t]*-+[ \t]*$/gm;

  function chunk(raw) {
    const text = raw.replace(STRIP_MARKER, '');
    const paragraphs = text.split(/\r?\n\r?\n/).map(p => p.trim()).filter(p => p.length > 10);
    const chunks = [];
    let cur = '';
    for (const p of paragraphs) {
      if (cur.length + p.length > 1000 && cur.length > 0) { chunks.push(cur); cur = p; }
      else cur = cur ? cur + '\n\n' + p : p;
    }
    if (cur.length > 0) chunks.push(cur);
    return chunks;
  }

  test('không chunk nào còn marker "-- N of M --", nội dung hợp lệ được giữ', () => {
    const raw = [
      'Trụ sở Công an phường tại Số 01, đường D27, khu phố Hòa Phú 1.',
      '',
      '-- 8 of 30 --',
      '',
      'Số điện thoại trực ban liên hệ khi cần được hỗ trợ kịp thời trong giờ hành chính.',
      '',
      '   --  12 of 30  --   ',
      '',
      'Người dân có thể đến trực tiếp trụ sở để được cán bộ hướng dẫn thủ tục.'
    ].join('\n');

    const chunks = chunk(raw);
    expect(chunks.length).toBeGreaterThan(0);
    for (const c of chunks) expect(c).not.toMatch(PAGE_MARKER);
    expect(chunks.join('\n')).toMatch(/D27/); // dữ kiện thật vẫn còn
  });

  test('marker đứng riêng dòng bị strip, không sinh chunk rác', () => {
    const raw = 'Đoạn nội dung pháp lý đủ dài để vượt ngưỡng lọc.\n\n-- 1 of 5 --\n\nĐoạn nội dung thứ hai cũng đủ dài để giữ lại.';
    const chunks = chunk(raw);
    for (const c of chunks) expect(c).not.toMatch(PAGE_MARKER);
  });
});
