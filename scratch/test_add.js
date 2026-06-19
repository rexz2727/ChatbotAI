const { ChromaClient } = require('chromadb');

// A deterministic dummy embedding function that generates 1536 (or 768) dimensions
const dummyEmbeddingFunction = {
  generate: async (texts) => {
    // Let's generate a 768-dimension vector
    return texts.map(text => {
      const arr = new Array(768).fill(0.1);
      // add some variation based on text
      for (let i = 0; i < Math.min(text.length, 768); i++) {
        arr[i] = text.charCodeAt(i) / 255.0;
      }
      return arr;
    });
  }
};

async function run() {
  const client = new ChromaClient({ host: "localhost", port: 8000 });
  try {
    // delete collection if exists
    try {
      await client.deleteCollection({ name: "test_coll" });
      console.log("Deleted existing test_coll");
    } catch (e) {
      // ignore
    }

    const collection = await client.createCollection({
      name: "test_coll",
      embeddingFunction: dummyEmbeddingFunction
    });
    console.log("Collection created:", collection.name);

    await collection.add({
      ids: ["id1", "id2"],
      documents: ["Hello world", "Xin chao Vietnam"],
      metadatas: [{ source: "test" }, { source: "test" }]
    });
    console.log("Documents added.");

    const results = await collection.query({
      queryTexts: ["Hello"],
      nResults: 2
    });
    console.log("Query results:", JSON.stringify(results, null, 2));

  } catch (err) {
    console.error("Error in Chroma test:", err);
  }
}

run();
