/**
 * LawGenie — Document Ingestion Script
 *
 * Run with: npm run ingest
 *
 * Features:
 *  - Resume support: skips chunks already stored in ChromaDB, so re-running
 *    after a crash or rate limit error picks up exactly where it left off
 *  - Incremental upsert: each chunk is saved to ChromaDB immediately after
 *    embedding, not at the end — so no progress is lost on failure
 *  - Rate limiting: 650ms delay between Gemini API calls (~92 RPM, under 100 RPM cap)
 *  - Exponential backoff: on a 429, waits 60s / 120s / 240s before retrying
 *
 * Prerequisites:
 *  - ChromaDB must be running: docker run -p 8000:8000 chromadb/chroma
 *  - .env must contain OPENROUTER_API_KEY and CHROMA_URL
 *
 * IMPORTANT — RPD (Requests Per Day) limit is 1,000 on the free tier.
 *  Hedaya.pdf alone produces ~3,267 chunks, which exceeds the daily limit.
 *  Run this script across multiple days — it will resume automatically.
 *  Each run will embed up to ~900 new chunks (leaving headroom for the API).
 */

import "dotenv/config";
import { loadAllDocuments } from "../src/services/documentLoader.js";
import { embedBatch } from "../src/services/embeddingService.js";
import {
  getOrCreateCollection,
  getStoredIds,
  upsertSingleChunk,
} from "../src/services/vectorStore.js";

// Safety cap: stop after embedding this many NEW chunks per run to stay
// within the 1K RPD (requests per day) limit. Set to 0 to disable.
const MAX_NEW_CHUNKS_PER_RUN = 900;

async function main() {
  const startTime = Date.now();
  console.log("=================================================");
  console.log("  LawGenie — Document Ingestion");
  console.log("=================================================\n");

  // -----------------------------------------------------------------------
  // Step 1: Get or create ChromaDB collection (no wipe — preserve progress)
  // -----------------------------------------------------------------------
  console.log("[ Step 1 ] Connecting to ChromaDB collection...");
  const collection = await getOrCreateCollection();
  console.log("  Done.\n");

  // -----------------------------------------------------------------------
  // Step 2: Load and chunk all documents
  // -----------------------------------------------------------------------
  console.log("[ Step 2 ] Loading and chunking documents...");
  const chunks = await loadAllDocuments();
  console.log(`\n  Total chunks produced: ${chunks.length}\n`);

  if (chunks.length === 0) {
    console.error(
      "  No chunks found. Make sure the documents/ directory contains PDFs or .md files.",
    );
    process.exit(1);
  }

  const countsBySource = {};
  for (const chunk of chunks) {
    const src = chunk.metadata.source;
    countsBySource[src] = (countsBySource[src] || 0) + 1;
  }
  console.log("  Chunks per document:");
  for (const [source, count] of Object.entries(countsBySource)) {
    console.log(`    ${source}: ${count} chunks`);
  }
  console.log();

  // -----------------------------------------------------------------------
  // Step 3: Determine which chunks are already stored (resume support)
  // -----------------------------------------------------------------------
  console.log("[ Step 3 ] Checking for previously stored chunks...");
  const storedIds = await getStoredIds();
  const pendingChunks = chunks.filter((c) => !storedIds.has(c.id));

  console.log(`  Already stored: ${storedIds.size} chunks`);
  console.log(`  Pending:        ${pendingChunks.length} chunks\n`);

  if (pendingChunks.length === 0) {
    console.log("  All chunks are already stored. Nothing to do.");
    console.log(
      "  If you want to re-ingest from scratch, clear the ChromaDB collection first.",
    );
    process.exit(0);
  }

  // Apply per-run cap to stay within RPD limit
  const chunksThisRun =
    MAX_NEW_CHUNKS_PER_RUN > 0
      ? pendingChunks.slice(0, MAX_NEW_CHUNKS_PER_RUN)
      : pendingChunks;

  if (
    MAX_NEW_CHUNKS_PER_RUN > 0 &&
    chunksThisRun.length < pendingChunks.length
  ) {
    console.log(
      `  RPD cap active: embedding ${chunksThisRun.length} of ${pendingChunks.length} pending chunks this run.`,
    );
    console.log(
      `  Re-run tomorrow to continue. Progress is saved automatically.\n`,
    );
  }

  // -----------------------------------------------------------------------
  // Step 4: Embed + incrementally upsert into ChromaDB
  // -----------------------------------------------------------------------
  console.log("[ Step 4 ] Embedding and storing chunks...");
  console.log(`  Rate limit: ~92 RPM (650ms between calls)`);
  const estimatedMinutes = ((chunksThisRun.length * 650) / 60_000).toFixed(1);
  console.log(`  Estimated time: ~${estimatedMinutes} minutes\n`);

  let upsertedCount = 0;

  const embeddedCount = await embedBatch(
    chunksThisRun,
    new Set(), // no skips needed — we already filtered above
    async (embeddedChunk) => {
      // Upsert immediately after each embedding — progress is saved in real time
      await upsertSingleChunk(embeddedChunk, collection);
      upsertedCount++;
    },
  );

  console.log(`\n  Embedded and stored: ${upsertedCount} chunks\n`);

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalStored = storedIds.size + upsertedCount;
  const remaining = chunks.length - totalStored;

  console.log("=================================================");
  console.log(`  Ingestion run complete.`);
  console.log(`  Chunks stored this run:  ${upsertedCount}`);
  console.log(`  Total stored in ChromaDB: ${totalStored} / ${chunks.length}`);
  if (remaining > 0) {
    console.log(`  Remaining (next run):    ${remaining}`);
    console.log(`  Run "npm run ingest" again tomorrow to continue.`);
  } else {
    console.log(`  All chunks ingested. RAG pipeline is ready.`);
  }
  console.log(`  Total time: ${elapsed}s`);
  console.log("=================================================");
}

main().catch((err) => {
  console.error("\nIngestion failed:", err.message || err);
  console.error('Progress has been saved. Re-run "npm run ingest" to resume.');
  process.exit(1);
});
