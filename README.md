# LawGenie — Legal Services Platform Backend

An Express + PostgreSQL API for LawGenie: a platform connecting clients in Pakistan with verified lawyers and Islamic legal scholars (Muftis), built around a family-law focus. It combines a **RAG-powered AI chatbot** (grounded in Pakistani family law statutes, with inline citations) with a full **lawyer/mufti marketplace** — directory & verification, consultation booking, manually-reviewed payments, case proposals, milestone-based case management, hearings, reviews, and dispute resolution.

Built against a [PRD](./documentation/PRD.md) and [PROPOSAL](./documentation/PROPOSAL.md), with the implementation plan tracked as ordered, checkable tasks in [TASKS/TODO.md](./TASKS/TODO.md).

---

## Built with AI agents

This backend (and its [companion frontend](https://github.com/Muhammad-Anas-Younus/lawgenie-frontend)) was built using [Claude Code](https://claude.com/product/claude-code) as an active development partner, not just an autocomplete tool. The workflow:

1. **PRD → task breakdown** — the [PRD](./documentation/PRD.md) was decomposed into an ordered, checkable task list in [TASKS/TODO.md](./TASKS/TODO.md), covering both this repo and the frontend, with explicit "locked decisions" recorded up front (see below) so scope wouldn't drift mid-build.
2. **Parallel execution** — once the task list stabilized, independent chunks of work (no file overlap, no shared dependencies) were grouped into **waves of tracks** and run as separate agents on separate git worktrees/branches, merged back after review. The process is documented in [TASKS/PARALLEL_EXECUTION.md](./TASKS/PARALLEL_EXECUTION.md).
3. **Verify, don't trust** — "done" meant the endpoint was actually hit (or the page actually clicked through), not just that code compiled. A task is only checked off in the TODO once it was manually confirmed working end-to-end, including across this repo and the frontend for full-stack features.

The git history reflects this: commits map to individual TODO tasks or merged tracks, and the `documentation/` + `TASKS/` folders are the actual planning artifacts used during the build, not written after the fact.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM, `"type": "module"`) |
| Framework | Express |
| Database | PostgreSQL, via **Prisma** (`@prisma/adapter-pg`) |
| Auth | JWT (`jsonwebtoken`) + `bcrypt`, stateless — no server-side session store |
| LLM / Embeddings | Routed through **OpenRouter** (`google/gemini-2.5-flash` for chat, `google/gemini-embedding-001` for embeddings) |
| Vector Store | ChromaDB (Docker) |
| Validation | Zod |
| File uploads | Multer, stored on local disk (`uploads/`) |
| Local orchestration | Docker Compose (Postgres + ChromaDB + API) |

---

## Architecture Overview

The platform has two halves that share one Express app and one Postgres database:

### 1. AI Legal Chatbot (RAG)

```
User message
     │
     ▼
Intent filter (LLM) — out of scope? → polite redirect, no RAG.
     │
     ▼
Embed message → query ChromaDB → top-5 relevant chunks + source metadata
     │
     ▼
Build prompt: system persona + retrieved context + session history + message
     │
     ▼
LLM call → grounded answer with inline citations, e.g. [MFLO 1961]
     │
     ▼
Response: { answer, sources: [{ document, chunks }], inScope }
```

Knowledge base: Muslim Family Laws Ordinance 1961, Family Courts Act 1964, Dissolution of Muslim Marriages Act, Guardians and Wards Act, and a structured Nikah Nama Q&A doc — chunked, embedded, and stored in ChromaDB by `scripts/ingestDocuments.js`. See [`src/services/ragService.js`](./src/services/ragService.js) and [`src/services/intentFilter.js`](./src/services/intentFilter.js).

### 2. Lawyer/Mufti Marketplace

| Domain | What it covers | Key files |
|---|---|---|
| **Auth & Users** | Registration (OTP-verified), login, JWT sessions, role-based access (`CLIENT`, `LAWYER`, `MUFTI`, `ADMIN`), user settings | `routes/auth.js`, `routes/users.js`, `middleware/auth.js` |
| **Lawyer & Mufti directory** | Public browse/filter/search, profile management, verification-gated visibility, earnings summaries | `routes/lawyers.js`, `routes/muftis.js` |
| **Consultations** | Client books a paid consultation with a lawyer; requires proof-of-payment before admin approval | `routes/consultations.js` |
| **Proposals & Cases** | A lawyer can only send a case proposal *after* a prior approved consultation with that client (no cold proposals). A client can have only one active case at a time | `routes/proposals.js`, `routes/cases.js` |
| **Milestones & Hearings** | Case progress tracked via milestones; lawyers log hearing dates | `routes/cases.js` (milestones), `routes/hearings.js` |
| **Mufti queries** | Islamic legal guidance — lawyer-only access to a Mufti (clients only get the AI chatbot directly) | `routes/muftiQueries.js` |
| **Payments** | Manual, screenshot-based proof of payment (no payment gateway, no escrow) reviewed and approved/rejected by an admin. Polymorphic — one payment record can back a consultation, case, milestone, or Mufti query | `routes/payments.js` |
| **Reviews & Disputes** | Post-engagement reviews (with moderation), formal dispute filing for admin resolution | `routes/reviews.js`, `routes/disputes.js` |
| **Documents & Files** | Authenticated upload/retrieval of case documents, credentials, and payment proofs | `routes/documents.js`, `routes/files.js`, `middleware/upload.js` |
| **Messaging** | Threaded messages scoped per-consultation or per-case (not one continuous inbox) | `routes/threads.js` |
| **Admin** | Payment/verification/dispute review queues, message & review moderation, platform analytics | `routes/admin.js` |

### Key design decisions

A few decisions were locked in early (recorded in [TASKS/TODO.md](./TASKS/TODO.md)) to keep scope bounded for an FYP timeline:

- **No payment gateway, no escrow** — payments are verified via manually uploaded screenshots + admin approval.
- **No dedicated Case Agent role** — the admin absorbs those responsibilities.
- **No 2FA, no CNIC-for-clients, no SMS, no OCR.**
- **Lawyer/Mufti-gated verification** — new lawyer/mufti accounts start `PENDING_VERIFICATION` and only become publicly visible after admin review of submitted credentials.
- **One active case per client** at a time; lawyers have no such limit.
- **Proposals require a prior approved consultation** between the same lawyer and client.

---

## Data Model

15 Prisma models power the platform (see [`prisma/schema.prisma`](./prisma/schema.prisma)): `User`, `LawyerProfile`, `MuftiProfile`, `AdminProfile`, `Consultation`, `Payment`, `Proposal`, `Case`, `Milestone`, `Hearing`, `Review`, `Message`, `Document`, `MuftiQuery`, `Dispute`. Roles (`CLIENT` / `LAWYER` / `MUFTI` / `ADMIN`) and status enums (`VerificationStatus`, `ConsultationStatus`, `PaymentStatus`, `ProposalStatus`, `CaseStatus`) drive most of the workflow logic.

---

## Getting Started

### 1. Clone & install

```bash
git clone <repo-url>
cd lawgenie-be
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required because `chromadb` has an optional peer dependency on an older `@google/generative-ai` version, which this project doesn't use directly.

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
CHROMA_URL=http://localhost:8000
PORT=3000
JWT_SECRET=replace_with_a_long_random_string
DATABASE_URL="postgresql://user:password@localhost:5432/lawgenie?schema=public"
```

### 3. Start Postgres + ChromaDB

The included `docker-compose.yml` runs Postgres, ChromaDB, and (optionally) the API itself:

```bash
docker compose up -d postgres chromadb
```

### 4. Run migrations

```bash
npx prisma migrate dev
```

### 5. Ingest the legal knowledge base

One-time (or on-demand) script that chunks, embeds, and stores the documents in `documents/` into ChromaDB. Safe to re-run — already-embedded chunks are skipped.

```bash
npm run ingest
```

> The embedding call is rate-limited (~92 requests/min with exponential backoff on 429s) and capped per run to spread large ingestion jobs across multiple invocations — see [`scripts/ingestDocuments.js`](./scripts/ingestDocuments.js).

### 6. Start the server

```bash
npm run dev    # auto-reload, development
npm start      # production
```

```bash
curl http://localhost:3000/health
# { "status": "ok", "activeSessions": 0, "timestamp": "..." }
```

### Available npm scripts

| Script | Command | Description |
|---|---|---|
| `npm start` | `node src/index.js` | Start the server |
| `npm run dev` | `nodemon src/index.js` | Start with auto-reload |
| `npm run ingest` | `node scripts/ingestDocuments.js` | Embed knowledge-base documents into ChromaDB |
| `npm run inspect` | `node scripts/inspectChroma.js` | Inspect what's currently stored in ChromaDB |

---

## API Reference

All routes are mounted under `/api`. Most non-public routes require a `Authorization: Bearer <jwt>` header (`requireAuth`); several are further role-gated (`requireRole(...)`).

| Base path | Purpose |
|---|---|
| `POST /api/chat`, `DELETE /api/chat/:sessionId` | RAG chatbot — ask a question, clear session memory |
| `/api/auth` | Register, OTP verification, login, logout, `GET /me` |
| `/api/users` | Get/update own account settings |
| `/api/lawyers`, `/api/muftis` | Public directory browse/search, own profile management, earnings |
| `/api/consultations` | Book a consultation, view own consultations |
| `/api/proposals` | Send/accept/decline case proposals |
| `/api/cases` | View/manage active cases, milestones |
| `/api/hearings` | Lawyer-logged hearing records |
| `/api/mufti-queries` | Lawyer-only Islamic legal query submission & retrieval |
| `/api/payments` | Submit proof-of-payment for review |
| `/api/documents`, `/api/files` | Upload and securely retrieve case/credential/payment files |
| `/api/threads` | Per-consultation / per-case message threads |
| `/api/reviews` | Post-engagement reviews |
| `/api/disputes` | File a formal dispute |
| `/api/admin` | Payment/verification/dispute review queues, moderation, analytics |
| `GET /health` | Health check + active chatbot session count |

For exact request/response shapes, see the relevant route file under [`src/routes/`](./src/routes/) and its paired validator under [`src/validators/`](./src/validators/).

---

## Folder Structure

```
lawgenie-be/
├── documentation/           # PRD, feature proposal
├── TASKS/                   # Build plan (TODO.md) + parallel-execution workflow
├── documents/                # RAG knowledge base source files (statutes, Nikah Nama Q&A)
├── prisma/                   # schema.prisma + migrations
├── scripts/
│   ├── ingestDocuments.js    # Chunk → embed → store knowledge base into ChromaDB
│   └── inspectChroma.js      # Diagnostic: view what's stored in ChromaDB
├── src/
│   ├── config/                # OpenRouter client, Prisma client
│   ├── middleware/            # auth, upload (multer), validation, error handling, chat session memory
│   ├── routes/                 # One file per domain (auth, lawyers, cases, payments, admin, ...)
│   ├── services/                # RAG orchestration, document loading/chunking, embeddings, vector store
│   ├── validators/              # Zod schemas, one per domain
│   ├── utils/                   # JWT helpers
│   └── index.js                 # Express app entry point
├── uploads/                  # Gitignored — case documents, credentials, payment proofs
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Contributing

- Uses **ESM** (`import`/`export`) throughout — new files must follow suit. `pdf-parse` is CommonJS and is imported via `createRequire` in `documentLoader.js`.
- Postgres + ChromaDB must be running before starting the server or running ingestion (`docker compose up -d postgres chromadb`).
- Chatbot session memory is in-memory only — lost on server restart, by design.
- Never commit `.env`. Update `.env.example` whenever a new environment variable is introduced.
- New work should follow the existing pattern of updating [TASKS/TODO.md](./TASKS/TODO.md) as tasks are planned and completed.
