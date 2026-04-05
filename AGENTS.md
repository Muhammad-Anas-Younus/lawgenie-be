# AGENTS.md — LawGenie Backend

## Overview

LawGenie is a RAG-powered legal chatbot API for Pakistani family law. It uses Google Gemini (LLM + embeddings) and ChromaDB (vector store) to answer questions with inline source citations. Built with Node.js + Express, ESM module system.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v18+ |
| Framework | Express |
| LLM | Gemini 1.5 Flash |
| Embeddings | Gemini Embedding 001 (3072-dim) |
| Vector Store | ChromaDB (Docker) |
| PDF Parsing | pdf-parse |
| Module System | ESM (`"type": "module"`) |

## Essential Setup

```bash
npm install --legacy-peer-deps
cp .env.example .env  # Set GEMINI_API_KEY, CHROMA_URL, PORT

# Start ChromaDB (Docker required)
docker volume create chromadb_data
docker run -d -p 8000:8000 --name chromadb -v chromadb_data:/chroma/chroma chromadb/chroma

# Ingest documents (one-time, rate-limited to 900 chunks/run)
npm run ingest
```

## Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `start` | `node src/index.js` | Production server |
| `dev` | `nodemon src/index.js` | Development (auto-restart) |
| `ingest` | `node scripts/ingestDocuments.js` | Embed documents into ChromaDB |
| `inspect` | `node scripts/inspectChroma.js` | View stored chunks in ChromaDB |

## Key Conventions

### ESM Only
All files use `import`/`export`. No CommonJS. Exception: `pdf-parse` is a CJS package imported via `createRequire` in `documentLoader.js`.

### Rate Limiting
- Embedding calls have a 650ms delay (~92 RPM, under 100 RPM limit)
- `MAX_NEW_CHUNKS_PER_RUN = 900` caps ingestion per day
- Script auto-resumes on restart (skips stored IDs)

### Session Memory
In-memory only (`Map<sessionId, Message[]>`). Lost on server restart. Last 6 messages kept per session.

### Intent Filter
Questions outside scope (non-family-law topics) return immediately with `inScope: false` — ChromaDB is not queried.

## File Structure

```
src/
├── config/gemini.js          # Gemini client (LLM + embeddings)
├── middleware/session.js     # In-memory session history
├── routes/chat.js            # POST /api/chat, DELETE /api/chat/:id
├── services/
│   ├── documentLoader.js     # PDF/md loading + chunking
│   ├── embeddingService.js   # Gemini embedding with retry
│   ├── intentFilter.js       # Scope classification
│   ├── ragService.js         # Core RAG orchestration
│   └── vectorStore.js        # ChromaDB client
└── index.js                  # Express entry point

documents/                    # Knowledge base (PDFs, .md)
scripts/
├── ingestDocuments.js        # Ingestion script
└── inspectChroma.js          # Diagnostic tool
```

## Modifying Core Behavior

| What | Where |
|---|---|
| LawGenie persona, citation format | `src/services/ragService.js` → `buildSystemPrompt()` |
| In-scope topics | `src/services/intentFilter.js` → `IN_SCOPE_TOPICS` |
| Chunk size/overlap | `src/services/documentLoader.js` |
| Rate limit parameters | `scripts/ingestDocuments.js`, `src/services/embeddingService.js` |

## API Endpoints

- `POST /api/chat` — `{ sessionId, message }` → `{ answer, sources, inScope }`
- `DELETE /api/chat/:sessionId` — Clear session history
- `GET /health` — Health check with active session count

## Gotchas

- **Never use `require()`** — use `import` in all new files
- **ChromaDB must be running** before server or ingestion starts
- **Hedaya.pdf is disabled** (`.bak` extension, ~3,267 chunks). Remove extension to re-enable.
- **Do not commit `.env`** — it is gitignored; update `.env.example` for new variables
- **`--legacy-peer-deps`** is required during install due to chromadb's optional peer dependency
