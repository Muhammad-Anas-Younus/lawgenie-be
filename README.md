# LawGenie — AI Legal Chatbot Backend

A RAG-powered (Retrieval-Augmented Generation) chatbot API built for the LawGenie platform. It answers questions about Pakistani family law and Islamic jurisprudence by grounding every response in a curated knowledge base of legal documents, citing sources inline the way Perplexity or Gemini do.

Built with **Node.js + Express**, **Google Gemini** (LLM + embeddings), and **ChromaDB** (vector store).

---

## Table of Contents

- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Running the Project](#running-the-project)
- [API Reference](#api-reference)
- [Folder Structure](#folder-structure)
- [File-by-File Breakdown](#file-by-file-breakdown)
- [Knowledge Base Documents](#knowledge-base-documents)
- [Rate Limits & Ingestion](#rate-limits--ingestion)
- [Contributing](#contributing)

---

## How It Works

```
User message
     │
     ▼
Intent Filter (Gemini)
  → Out of scope? Return polite redirect immediately. No RAG.
  → In scope? Continue.
     │
     ▼
Embed user message (Gemini text-embedding-001)
     │
     ▼
Query ChromaDB → Top 5 most relevant chunks + source metadata
     │
     ▼
Build prompt:
  System prompt (LawGenie persona)
  + Retrieved context (labelled by source document)
  + Session memory (last 6 messages)
  + User message
     │
     ▼
Gemini 1.5 Flash → Grounded answer with inline citations
     │
     ▼
Response: { answer, sources: [{ document, chunks }], inScope }
```

Every answer cites sources inline like `[MFLO 1961]`. The `sources` array in the response tells the frontend exactly which documents were used and how many chunks from each.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v18+ |
| Framework | Express |
| LLM | Gemini 1.5 Flash (`gemini-1.5-flash`) |
| Embeddings | Gemini Embedding 001 (`gemini-embedding-001`, 3072-dim) |
| Vector Store | ChromaDB (Docker) |
| PDF Parsing | pdf-parse |
| Module System | ESM (`"type": "module"`) |

---

## Prerequisites

Before you start, make sure you have:

- **Node.js** v18 or higher
- **npm** v9 or higher
- **Docker** (for ChromaDB)
- A **Google Gemini API key** — get one free at [aistudio.google.com](https://aistudio.google.com)

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd lawgenie-be
```

### 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required because `chromadb` has an optional peer dependency on an older version of `@google/generative-ai`. This flag is safe — we use the Gemini SDK directly and don't rely on ChromaDB's Gemini integration.

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
GEMINI_API_KEY=your_gemini_api_key_here
CHROMA_URL=http://localhost:8000
PORT=3000
```

### 4. Start ChromaDB

ChromaDB runs as a Docker container. The `-v` flag mounts a named volume so your data persists across restarts.

```bash
docker volume create chromadb_data

docker run -d -p 8000:8000 --name chromadb \
  -v chromadb_data:/chroma/chroma \
  chromadb/chroma
```

After the first time, you only need:
```bash
docker start chromadb
```

### 5. Run document ingestion

This is a one-time script that loads all documents from the `documents/` folder, chunks them, embeds them with Gemini, and stores them in ChromaDB.

```bash
npm run ingest
```

> **Note on rate limits:** The free Gemini tier allows 1,000 embedding requests per day. If you have all documents including `Hedaya.pdf` (~3,267 chunks), you'll need to run ingestion across multiple days. The script automatically resumes from where it left off — already-stored chunks are skipped. See [Rate Limits & Ingestion](#rate-limits--ingestion) for details.

### 6. Start the server

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

The API will be running at `http://localhost:3000`.

---

## Running the Project

### Available npm scripts

| Script | Command | Description |
|---|---|---|
| `npm start` | `node src/index.js` | Start the server |
| `npm run dev` | `nodemon src/index.js` | Start with auto-reload (development) |
| `npm run ingest` | `node scripts/ingestDocuments.js` | Embed documents into ChromaDB |
| `npm run inspect` | `node scripts/inspectChroma.js` | View what's stored in ChromaDB |

### Verify everything is working

```bash
# Health check
curl http://localhost:3000/health

# Expected response
# { "status": "ok", "activeSessions": 0, "timestamp": "..." }
```

---

## API Reference

### `POST /api/chat`

Send a message to the chatbot.

**Request body:**
```json
{
  "sessionId": "user-abc-123",
  "message": "Can my husband marry again without telling me?"
}
```

- `sessionId` — A string you generate on the client side. Use the same ID across messages to maintain conversation memory. You can use any unique string (e.g. a UUID).
- `message` — The user's question.

**Response:**
```json
{
  "answer": "Under Section 6 of the MFLO 1961, your husband cannot contract a second marriage without first obtaining permission from the Arbitration Council and your consent [MFLO 1961]. Violation is a criminal offence punishable by up to one year imprisonment...",
  "sources": [
    { "document": "MFLO, 1961.pdf", "chunks": 3 },
    { "document": "nikkah-nama.md", "chunks": 1 }
  ],
  "sessionId": "user-abc-123",
  "inScope": true
}
```

- `answer` — The grounded response with inline source citations.
- `sources` — Which documents were used to generate the answer, and how many chunks from each.
- `inScope` — `true` if the question was about family law, `false` if it was out of scope (in which case `sources` will be empty).

**Out-of-scope example:**
```json
// Request
{ "sessionId": "abc", "message": "My landlord is evicting me unfairly." }

// Response
{
  "answer": "I'm sorry, but that falls outside my area of expertise. LawGenie specialises in Pakistani family law...",
  "sources": [],
  "sessionId": "abc",
  "inScope": false
}
```

---

### `DELETE /api/chat/:sessionId`

Clear the conversation history for a session. Call this when the user wants to start a fresh conversation.

```bash
curl -X DELETE http://localhost:3000/api/chat/user-abc-123
```

**Response:**
```json
{ "message": "Session cleared.", "sessionId": "user-abc-123" }
```

---

### `GET /health`

Health check endpoint.

**Response:**
```json
{ "status": "ok", "activeSessions": 2, "timestamp": "2026-04-01T12:00:00.000Z" }
```

---

## Folder Structure

```
lawgenie-be/
│
├── documents/                        # Knowledge base source files
│   ├── MFLO, 1961.pdf                # Muslim Family Laws Ordinance 1961
│   ├── THE WEST PAKISTAN FAMILY      # Family Courts Act 1964
│   │   COURTS ACT, 1964.pdf
│   ├── The Dissolution of Muslim     # Dissolution of Muslim Marriages Act
│   │   Marriages Act.pdf
│   ├── Gw act.pdf                    # Guardians and Wards Act
│   ├── Hedaya.pdf.bak                # Classical Islamic jurisprudence (temporarily
│   │                                 #   disabled — re-enable by removing .bak)
│   └── nikkah-nama.md                # Structured Q&A knowledge base for Nikah Nama
│
├── documentation/
│   └── PRD.md                        # Product Requirements Document
│
├── scripts/
│   ├── ingestDocuments.js            # One-time ingestion script (load → chunk → embed → store)
│   └── inspectChroma.js              # Diagnostic: view what's stored in ChromaDB
│
├── src/
│   ├── config/
│   │   └── gemini.js                 # Gemini client setup (LLM + embedding model)
│   │
│   ├── middleware/
│   │   └── session.js                # In-memory conversation history (sliding window)
│   │
│   ├── routes/
│   │   └── chat.js                   # Express routes: POST /api/chat, DELETE /api/chat/:id
│   │
│   ├── services/
│   │   ├── documentLoader.js         # Load PDFs + .md files, chunk them
│   │   ├── embeddingService.js       # Gemini embedding calls with rate limiting + retry
│   │   ├── intentFilter.js           # Classify messages as in-scope / out-of-scope
│   │   ├── ragService.js             # Core RAG orchestration (retrieve → prompt → generate)
│   │   └── vectorStore.js            # ChromaDB client (upsert, query, inspect)
│   │
│   └── index.js                      # Express app entry point
│
├── .env.example                      # Environment variable template
├── .gitignore
└── package.json
```

---

## File-by-File Breakdown

### `src/index.js`
Express app entry point. Sets up `cors` and `express.json()` middleware, mounts the chat router at `/api/chat`, and exposes the `/health` endpoint. Starts the HTTP server on `PORT`.

---

### `src/config/gemini.js`
Initialises the Google Generative AI client using `GEMINI_API_KEY`. Exports two factory functions:
- `getLLM()` — returns a `gemini-1.5-flash` model instance for chat completions
- `getEmbeddingModel()` — returns a `gemini-embedding-001` model instance for generating 3072-dimensional embedding vectors

---

### `src/services/intentFilter.js`
Runs a fast Gemini classification call before any RAG work. Classifies the user's message as `IN_SCOPE` or `OUT_OF_SCOPE` based on a strict list of allowed topics (Pakistani family law, marriage, divorce, Khula, Mehr, custody, maintenance, etc.).

If out of scope, `chat()` in `ragService.js` returns immediately with a polite redirect and an empty `sources` array — ChromaDB is never queried.

---

### `src/services/ragService.js`
The core orchestration layer. The `chat(sessionId, userMessage)` function:
1. Runs the intent filter — short-circuits if out of scope
2. Fetches session history from memory
3. Embeds the user message
4. Queries ChromaDB for the top 5 most relevant chunks
5. Builds a structured prompt (system prompt + labelled context + history + message)
6. Calls Gemini 1.5 Flash for a grounded answer
7. Updates session memory
8. Returns `{ answer, sources, inScope }`

Also contains `buildSystemPrompt()` which defines the LawGenie persona, citation rules, tone, and response structure.

---

### `src/services/documentLoader.js`
Handles loading and chunking of all documents in the `documents/` folder.

- **PDFs** — extracted with `pdf-parse`, then split using a recursive character splitter (800 char chunks, 150 char overlap). The overlap ensures context is not lost at chunk boundaries.
- **Markdown** — split on `## ` headings. The `nikkah-nama.md` file is pre-structured as Q&A sections, so each heading becomes one self-contained chunk.

Each chunk gets an `id` (e.g. `mflo-1961-pdf-chunk-3`) and `metadata: { source, chunkIndex }`.

---

### `src/services/embeddingService.js`
Calls `gemini-embedding-001` to convert text chunks into 3072-dimensional vectors.

- **Rate limiting:** 650ms delay between calls (~92 RPM, safely under the 100 RPM free tier cap)
- **Retry with exponential backoff:** On a 429 error, waits 60s → 120s → 240s before retrying (3 attempts max)
- **`onChunkEmbedded` callback:** Fires immediately after each embedding so the ingestion script can save to ChromaDB in real time — no progress is lost if the process crashes

---

### `src/services/vectorStore.js`
ChromaDB client wrapper. Key functions:

| Function | Purpose |
|---|---|
| `getOrCreateCollection()` | Gets existing collection or creates one (preserves data for resume) |
| `resetCollection()` | Wipes and re-creates the collection (full re-ingest) |
| `upsertChunks(chunks, collection)` | Batch upsert in groups of 100 |
| `upsertSingleChunk(chunk, collection)` | Single chunk upsert (used during incremental ingestion) |
| `queryCollection(embedding, n)` | Returns top-N similar chunks with text + metadata + distance |
| `getStoredIds()` | Returns a Set of all IDs currently in ChromaDB (for resume) |

---

### `src/middleware/session.js`
In-memory conversation history using a `Map<sessionId, Message[]>`.

- `getHistory(sessionId)` — returns the last 6 messages (3 user + 3 assistant turns)
- `appendMessage(sessionId, role, content)` — adds a message, trims to max 20 per session
- `clearSession(sessionId)` — deletes a session entirely
- `getSessionCount()` — returns number of active sessions (used in health check)

Sessions are ephemeral — they live only for the server process lifetime. A server restart clears all sessions.

---

### `src/routes/chat.js`
Express router with two endpoints:
- `POST /api/chat` — validates `sessionId` and `message`, calls `ragService.chat()`, returns response
- `DELETE /api/chat/:sessionId` — clears session memory

---

### `scripts/ingestDocuments.js`
One-time (or on-demand) script to populate ChromaDB. Features:
- **Resume support** — checks stored IDs at start, skips already-embedded chunks
- **Incremental upsert** — saves each chunk to ChromaDB immediately after embedding
- **RPD cap** (`MAX_NEW_CHUNKS_PER_RUN = 900`) — stops after 900 new chunks per run to stay within the free tier 1K requests/day limit
- **Estimated time** printed upfront

---

### `scripts/inspectChroma.js`
Diagnostic tool. Shows total chunk count, chunks per document, and a text preview of every chunk currently stored in ChromaDB. Run with `npm run inspect`.

---

## Knowledge Base Documents

| Document | Description | Chunks (approx.) |
|---|---|---|
| `MFLO, 1961.pdf` | Muslim Family Laws Ordinance 1961 — primary statute governing Muslim marriage and divorce in Pakistan | ~25 |
| `THE WEST PAKISTAN FAMILY COURTS ACT, 1964.pdf` | Establishes Family Courts and their jurisdiction for matrimonial disputes | ~51 |
| `The Dissolution of Muslim Marriages Act.pdf` | Grounds on which a Muslim woman can seek dissolution of marriage in court | ~8 |
| `Gw act.pdf` | Guardians and Wards Act — governs child custody and guardianship | ~77 |
| `nikkah-nama.md` | Structured Q&A knowledge base covering each column of the Pakistani Nikah Nama (marriage contract) | ~16 |
| `Hedaya.pdf` *(disabled)* | Classical Islamic jurisprudence text (Al-Hedaya). Disabled temporarily due to size (~3,267 chunks). Re-enable by removing `.bak` extension. | ~3,267 |

### Adding new documents

1. Drop the file (PDF or `.md`) into the `documents/` folder
2. Run `npm run ingest` — it will only embed the new chunks, skipping everything already stored

---

## Rate Limits & Ingestion

The free tier of the Gemini API has these limits for `gemini-embedding-001`:

| Limit | Value |
|---|---|
| RPM (requests per minute) | 100 |
| TPM (tokens per minute) | 30,000 |
| RPD (requests per day) | 1,000 |

The ingestion script is designed to work within these limits:

- **650ms delay** between embedding calls (~92 RPM)
- **`MAX_NEW_CHUNKS_PER_RUN = 900`** in `scripts/ingestDocuments.js` caps each run to stay under 1K RPD
- **Automatic resume** — re-running `npm run ingest` skips already-stored chunks

If you upgrade to a paid Gemini tier, you can set `MAX_NEW_CHUNKS_PER_RUN = 0` to disable the cap and ingest everything in one run.

---

## Contributing

### Setup

Follow the [Getting Started](#getting-started) steps above. Make sure you have your own Gemini API key.

### Branch naming

```
feature/your-feature-name
fix/what-you-are-fixing
docs/what-you-are-documenting
```

### Adding a new document to the knowledge base

1. Add the file to `documents/`
2. Run `npm run inspect` to verify current state
3. Run `npm run ingest` to embed the new document
4. Run `npm run inspect` again to confirm new chunks were added

### Modifying the system prompt

The LawGenie persona, citation format, and response structure are all defined in `buildSystemPrompt()` in `src/services/ragService.js`.

### Modifying the intent filter

The list of in-scope topics is defined in `IN_SCOPE_TOPICS` in `src/services/intentFilter.js`. Add new topics there if you expand the knowledge base.

### Environment variables

Never commit your `.env` file. It is in `.gitignore`. Always update `.env.example` if you add a new environment variable.

### Key things to know before contributing

- The project uses **ESM** (`import`/`export`), not CommonJS (`require`). All new files must use ESM syntax.
- `pdf-parse` is a CommonJS package — it is imported using `createRequire` in `documentLoader.js`. Do not try to `import` it directly.
- ChromaDB must be running locally before starting the server or running ingestion.
- Session memory is in-memory only — it is lost on server restart by design (v1).
