const { ChromaClient } = require('chromadb');

async function test() {
  const client = new ChromaClient({ host: "localhost", port: 8000 });
  console.log("Client instantiated. Checking version/heartbeat...");
  try {
    const heartbeat = await client.heartbeat();
    console.log("ChromaDB heartbeat:", heartbeat);
    const version = await client.version();
    console.log("ChromaDB version:", version);
  } catch (err) {
    console.error("Failed to connect/query ChromaDB:", err);
  }
}

test();
