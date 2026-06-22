require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ChromaClient } = require('chromadb');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const parsedPort = process.env.CHROMA_PORT ? parseInt(process.env.CHROMA_PORT, 10) : 8000;
const chromaPort = isNaN(parsedPort) ? 8000 : parsedPort;
const client = new ChromaClient({ 
  host: process.env.CHROMA_HOST || "localhost", 
  port: chromaPort 
});

// Deterministic fallback embedding function for development/testing
function getMockEmbedding(text) {
  const embedding = new Array(3072).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  for (let d = 0; d < 3072; d++) {
    const seed = hash + d;
    const x = Math.sin(seed) * 10000;
    embedding[d] = x - Math.floor(x);
  }
  return embedding;
}

// Custom Embedding Helper using Gemini with Fallback
const geminiEmbeddingFunction = {
  generate: async (texts) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const isDefaultKey = !apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '';

    if (isDefaultKey) {
      console.warn("Using deterministic mock embeddings because GEMINI_API_KEY is not set or is placeholder.");
      return texts.map(text => getMockEmbedding(text));
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
      const embeddings = [];

      for (const text of texts) {
        let success = false;
        let retries = 3;
        let lastError = null;

        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            const result = await model.embedContent(text);
            embeddings.push(result.embedding.values);
            success = true;
            break;
          } catch (err) {
            lastError = err;
            const isRateLimit = err.status === 429 || 
                                (err.message && err.message.includes('429')) ||
                                (err.message && err.message.includes('RESOURCE_EXHAUSTED'));
            if (isRateLimit && attempt < retries - 1) {
              const delay = 2000 * (attempt + 1);
              console.warn(`Gemini Embedding API rate limited. Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              break;
            }
          }
        }

        if (!success) {
          console.error(`Failed to embed text: "${text.substring(0, 50)}...". Error:`, lastError);
          console.warn("Falling back to deterministic mock embedding for this chunk.");
          embeddings.push(getMockEmbedding(text));
        }
      }

      return embeddings;
    } catch (error) {
      console.error('General error in Gemini embedding generation:', error);
      console.warn("Falling back to deterministic mock embeddings for all remaining texts.");
      return texts.map(text => getMockEmbedding(text));
    }
  }
};

const collectionsConfig = [
  { name: "db_cu_tru", files: ["PC06/cu_tru.txt"] },
  { name: "db_can_cuoc", files: ["PC06/can_cuoc.txt"] },
  { name: "db_giao_thong", files: ["PC08/giao_thong.txt"] },
  { name: "db_an_ninh", files: ["PC06/an_ninh_trat_tu.txt", "PC07/pccc_cnch.txt", "PA05/an_ninh_mang.txt"] },
  { name: "db_ngoai_kieu", files: ["PA08/ngoai_kieu.txt"] },
  { name: "db_khieu_nai", files: ["thanh_tra/khieu_nai_to_cao.txt", "cqdt/to_giac_tin_bao_toi_pham.txt"] },
  { name: "db_thu_tuc_hanh_chinh", files: ["_chung/thu_tuc_hanh_chinh.txt"] },
  { name: "db_lien_he", files: ["_chung/lien_he_co_quan.txt"] }
];

async function seed() {
  console.log("Starting database seeding process...");
  for (const config of collectionsConfig) {
    console.log(`\n--------------------------------------------`);
    console.log(`Processing collection: ${config.name} from files: ${config.files.join(', ')}...`);
    
    // Delete existing collection if it exists
    try {
      await client.deleteCollection({ name: config.name });
      console.log(`Deleted existing collection: ${config.name}`);
    } catch (e) {
      // Collection does not exist, ignore
    }

    // Create collection
    const collection = await client.createCollection({
      name: config.name,
      embeddingFunction: geminiEmbeddingFunction
    });

    const documents = [];
    const ids = [];
    const metadatas = [];
    let globalChunkIndex = 0;

    for (const file of config.files) {
      const filePath = path.join(__dirname, '..', 'data', file);
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        continue;
      }

      const rawText = fs.readFileSync(filePath, 'utf-8');
      
      // Chunking by double newlines or empty lines
      const paragraphs = rawText
        .split(/\r?\n\r?\n/)
        .map(p => p.trim())
        .filter(p => p.length > 10); // Ignore small lines or title headers without body

      if (paragraphs.length === 0) {
        console.warn(`No valid content found to seed in ${file}`);
        continue;
      }

      console.log(`Split ${file} into ${paragraphs.length} paragraphs/chunks.`);

      paragraphs.forEach((para) => {
        documents.push(para);
        ids.push(`${config.name}_chunk_${globalChunkIndex}`);
        metadatas.push({ source: file, chunk_index: globalChunkIndex });
        globalChunkIndex++;
      });
    }

    // Insert documents in batches to avoid overwhelming embedding APIs
    const batchSize = 10;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batchDocs = documents.slice(i, i + batchSize);
      const batchIds = ids.slice(i, i + batchSize);
      const batchMetas = metadatas.slice(i, i + batchSize);

      try {
        await collection.add({
          ids: batchIds,
          documents: batchDocs,
          metadatas: batchMetas
        });
        console.log(`Added batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)} (${batchDocs.length} chunks)`);
      } catch (err) {
        console.error(`Failed to add batch starting at index ${i} to collection ${config.name}:`, err);
        throw err;
      }
    }

    console.log(`Successfully completed seeding for collection: ${config.name}`);
  }

  console.log(`\n============================================`);
  console.log("Database seeding completed successfully.");
}

seed().catch(err => {
  console.error("Database seeding failed:", err);
  process.exit(1);
});
