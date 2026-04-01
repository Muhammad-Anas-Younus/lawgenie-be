import { ChromaClient } from 'chromadb';
import 'dotenv/config';

const COLLECTION_NAME = 'lawgenie_docs';

/**
 * Returns a configured ChromaDB client pointed at CHROMA_URL.
 */
function getClient() {
  return new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });
}

/**
 * Gets the collection if it exists, or creates it fresh if it doesn't.
 * Used by the ingestion script — does NOT wipe existing data,
 * preserving previously embedded chunks for resume support.
 *
 * @returns {Promise<Collection>}
 */
export async function getOrCreateCollection() {
  const client = getClient();
  try {
    const collection = await client.getCollection({ name: COLLECTION_NAME });
    const count = await collection.count();
    console.log(`  Found existing collection "${COLLECTION_NAME}" with ${count} chunks.`);
    return collection;
  } catch {
    const collection = await client.createCollection({
      name: COLLECTION_NAME,
      metadata: { 'hnsw:space': 'cosine' },
    });
    console.log(`  Created new collection: "${COLLECTION_NAME}"`);
    return collection;
  }
}

/**
 * Deletes the existing collection (if it exists) and creates a fresh one.
 * Uses cosine distance — appropriate for comparing semantic embeddings.
 *
 * Called only when a full re-ingest from scratch is needed.
 *
 * @returns {Promise<Collection>}
 */
export async function resetCollection() {
  const client = getClient();

  // Delete existing collection if present — ignore error if it doesn't exist
  try {
    await client.deleteCollection({ name: COLLECTION_NAME });
    console.log(`  Deleted existing collection: "${COLLECTION_NAME}"`);
  } catch {
    console.log(`  No existing collection to delete. Creating fresh.`);
  }

  const collection = await client.createCollection({
    name: COLLECTION_NAME,
    metadata: { 'hnsw:space': 'cosine' },
  });

  console.log(`  Created collection: "${COLLECTION_NAME}"`);
  return collection;
}

/**
 * Retrieves the existing collection for querying at runtime.
 * Throws if the collection doesn't exist (ingestion hasn't been run yet).
 *
 * @returns {Promise<Collection>}
 */
export async function getCollection() {
  const client = getClient();
  return client.getCollection({ name: COLLECTION_NAME });
}

/**
 * Upserts an array of embedded chunks into ChromaDB.
 *
 * Each chunk must have: { id, text, embedding, metadata }
 * ChromaDB upsert is batched in groups of 100 to avoid payload size limits.
 *
 * @param {{ id: string, text: string, embedding: number[], metadata: object }[]} chunks
 * @param {Collection} collection - The ChromaDB collection to upsert into.
 */
export async function upsertChunks(chunks, collection) {
  const BATCH_SIZE = 100;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    await collection.upsert({
      ids: batch.map((c) => c.id),
      embeddings: batch.map((c) => c.embedding),
      documents: batch.map((c) => c.text),
      metadatas: batch.map((c) => c.metadata),
    });

    console.log(
      `  Upserted batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(chunks.length / BATCH_SIZE)} (${batch.length} chunks)`
    );
  }
}

/**
 * Upserts a single embedded chunk into ChromaDB immediately.
 * Used during ingestion to persist each chunk right after embedding,
 * so progress is not lost if the process crashes or hits a rate limit.
 *
 * @param {{ id: string, text: string, embedding: number[], metadata: object }} chunk
 * @param {Collection} collection
 */
export async function upsertSingleChunk(chunk, collection) {
  await collection.upsert({
    ids: [chunk.id],
    embeddings: [chunk.embedding],
    documents: [chunk.text],
    metadatas: [chunk.metadata],
  });
}

/**
 * Returns a Set of all document IDs currently stored in the collection.
 * Used by the ingestion script to skip chunks that are already embedded,
 * enabling safe resume after a crash or rate limit failure.
 *
 * Returns an empty Set if the collection doesn't exist yet.
 *
 * @returns {Promise<Set<string>>}
 */
export async function getStoredIds() {
  try {
    const collection = await getCollection();
    const count = await collection.count();
    if (count === 0) return new Set();

    // ChromaDB requires a limit — fetch all IDs in one call
    const result = await collection.get({ limit: count, include: [] });
    return new Set(result.ids);
  } catch {
    // Collection doesn't exist yet — treat as empty
    return new Set();
  }
}

/**
 * Queries the collection for the top-N most semantically similar chunks
 * to a given query embedding vector.
 *
 * Returns an array of result objects, each with:
 *  - text      {string}  the chunk content
 *  - metadata  {object}  { source, chunkIndex }
 *  - distance  {number}  cosine distance (lower = more similar)
 *
 * @param {number[]} queryEmbedding - The embedded query vector.
 * @param {number}   nResults       - Number of results to return (default 5).
 * @returns {Promise<{ text: string, metadata: object, distance: number }[]>}
 */
export async function queryCollection(queryEmbedding, nResults = 5) {
  const collection = await getCollection();

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
    include: ['documents', 'metadatas', 'distances'],
  });

  // Flatten the results (ChromaDB returns nested arrays, one per query)
  const documents = results.documents[0];
  const metadatas = results.metadatas[0];
  const distances = results.distances[0];

  return documents.map((text, idx) => ({
    text,
    metadata: metadatas[idx],
    distance: distances[idx],
  }));
}
