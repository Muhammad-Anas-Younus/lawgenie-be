import { getEmbeddingModel } from '../config/gemini.js';

// ---------------------------------------------------------------------------
// Rate limit constants — based on Gemini free tier:
//   RPM: 100  →  minimum 600ms between calls gives ~100 RPM safely
//   TPM: 30K  →  each chunk ~200-800 tokens, well within limit per call
//   RPD: 1K   →  3444 chunks exceeds this; ingestion uses resume to spread
//                across multiple days if needed
// ---------------------------------------------------------------------------
const DELAY_BETWEEN_CALLS_MS = 650; // ~92 RPM, safely under 100 RPM cap
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 60_000; // 60s initial wait on 429, then 120s, 240s

/**
 * Generates an embedding vector for a single piece of text using
 * Gemini gemini-embedding-001 (3072 dimensions).
 *
 * @param {string} text - The text to embed.
 * @returns {Promise<number[]>}
 */
export async function embedText(text) {
  const model = getEmbeddingModel();
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Wraps embedText with exponential backoff retry logic for 429 errors.
 *
 * On a 429 (rate limit exceeded):
 *   Attempt 1 retry: wait 60s
 *   Attempt 2 retry: wait 120s
 *   Attempt 3 retry: wait 240s
 *   After 3 retries: throw the error
 *
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function embedWithRetry(text) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await embedText(text);
    } catch (err) {
      lastError = err;

      const is429 = err?.status === 429 || err?.message?.includes('429');
      if (!is429 || attempt === MAX_RETRIES) {
        throw err;
      }

      const waitMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      const waitSec = (waitMs / 1000).toFixed(0);
      process.stdout.write(
        `\n  [429 Rate limit] Waiting ${waitSec}s before retry ${attempt + 1}/${MAX_RETRIES}...`
      );
      await sleep(waitMs);
      process.stdout.write(' Retrying.\n');
    }
  }

  throw lastError;
}

/**
 * Embeds an array of chunks sequentially with rate limiting and retry logic.
 *
 * Unlike a simple batch embed, this function accepts an optional callback
 * `onChunkEmbedded` that is called immediately after each chunk is embedded.
 * The ingestion script uses this to upsert chunks to ChromaDB one-by-one,
 * so progress is saved incrementally — a crash won't lose already-embedded chunks.
 *
 * Chunks listed in `skipIds` are skipped entirely (resume support).
 *
 * @param {object[]}  chunks           - Array of { id, text, metadata }
 * @param {Set}       skipIds          - Set of chunk IDs already in ChromaDB
 * @param {Function}  onChunkEmbedded  - Called with the embedded chunk immediately after embedding
 * @returns {Promise<number>}          - Total number of chunks actually embedded (not skipped)
 */
export async function embedBatch(chunks, skipIds = new Set(), onChunkEmbedded = null) {
  let embedded = 0;
  let skipped = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Skip chunks that are already stored in ChromaDB
    if (skipIds.has(chunk.id)) {
      skipped++;
      process.stdout.write(
        `\r  Skipped: ${skipped} already stored | Embedding: ${embedded} / ${chunks.length - skipped} remaining...`
      );
      continue;
    }

    process.stdout.write(
      `\r  Embedding chunk ${i + 1} / ${chunks.length} (${skipped} skipped, ${embedded} done)...`
    );

    const embedding = await embedWithRetry(chunk.text);
    const embeddedChunk = { ...chunk, embedding };
    embedded++;

    // Fire the callback immediately so the caller can persist to ChromaDB
    // right away — no waiting for the full batch to finish
    if (onChunkEmbedded) {
      await onChunkEmbedded(embeddedChunk);
    }

    // Rate limit pause between calls (skip after last non-skipped chunk)
    const remaining = chunks.slice(i + 1).filter((c) => !skipIds.has(c.id));
    if (remaining.length > 0) {
      await sleep(DELAY_BETWEEN_CALLS_MS);
    }
  }

  process.stdout.write('\n');
  return embedded;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
