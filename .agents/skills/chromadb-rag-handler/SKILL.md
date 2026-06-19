---
name: chromadb-rag-handler
description: Guidelines for setting up ChromaDB collections, chunking text, and querying the vector database for RAG.
---

# ChromaDB RAG Handler Skill

## Use this skill when
- Initializing the ChromaDB vector database with text content.
- Querying ChromaDB collections to retrieve relevant documents for prompt engineering.

## Instructions
1. **Collections Setup**: Use 6 distinct collections as required:
   - `db_cu_tru` (Cư trú & Địa bàn)
   - `db_can_cuoc` (Căn cước & Định danh)
   - `db_giao_thong` (Giao thông & Vi phạm)
   - `db_an_ninh` (An ninh Trật tự & PCCC)
   - `db_ngoai_kieu` (Ngoại kiều & Xuất nhập cảnh)
   - `db_khieu_nai` (Khiếu nại & Vi phạm Hành chính)
2. **Data Processing (Chunking)**:
   - Read source text files from the `data/` directory.
   - Segment text into logical paragraphs or chunks of ~200-500 words, preserving semantic context.
   - Use metadata to track the origin file or section.
3. **Embeddings**:
   - Use ChromaDB default embeddings or use Gemini Embedding API to ensure Vietnamese semantic search works optimally.
4. **Retrieval**:
   - Fetch the top 3-5 most similar text chunks based on the user's message query.
   - Format the fetched text chunks as context for the LLM system prompt.
