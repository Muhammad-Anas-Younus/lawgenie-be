/**
 * LawGenie — ChromaDB Inspector
 *
 * Run with: node scripts/inspectChroma.js
 *
 * Shows a summary of what is currently stored in ChromaDB:
 *  - Total chunk count
 *  - Chunks per source document
 *  - Optional: print first N chunks with their text preview
 */

import 'dotenv/config';
import { ChromaClient } from 'chromadb';

const COLLECTION_NAME = 'lawgenie_docs';
const PREVIEW_LENGTH = 120; // characters to show per chunk preview

async function main() {
  const client = new ChromaClient({
    path: process.env.CHROMA_URL || 'http://localhost:8000',
  });

  // Check collection exists
  let collection;
  try {
    collection = await client.getCollection({ name: COLLECTION_NAME });
  } catch {
    console.log(`No collection named "${COLLECTION_NAME}" found in ChromaDB.`);
    console.log('Run "npm run ingest" first.');
    process.exit(0);
  }

  const total = await collection.count();
  console.log('\n=================================================');
  console.log(`  ChromaDB — "${COLLECTION_NAME}"`);
  console.log('=================================================');
  console.log(`  Total chunks stored: ${total}\n`);

  if (total === 0) {
    console.log('  Collection is empty. Run "npm run ingest" to populate it.');
    process.exit(0);
  }

  // Fetch all chunks (ids + metadatas only, skip embeddings for speed)
  const result = await collection.get({
    limit: total,
    include: ['metadatas', 'documents'],
  });

  // Group by source document
  const bySource = {};
  for (let i = 0; i < result.ids.length; i++) {
    const source = result.metadatas[i]?.source || 'unknown';
    if (!bySource[source]) bySource[source] = [];
    bySource[source].push({
      id: result.ids[i],
      chunkIndex: result.metadatas[i]?.chunkIndex,
      preview: result.documents[i]?.slice(0, PREVIEW_LENGTH).replace(/\n/g, ' '),
    });
  }

  // Print summary per document
  console.log('  Chunks per document:');
  console.log('  -------------------------------------------');
  for (const [source, chunks] of Object.entries(bySource)) {
    console.log(`  ${source}: ${chunks.length} chunks`);
  }

  // Print detailed chunk list per document
  console.log('\n  Detailed chunk list:');
  console.log('  -------------------------------------------');
  for (const [source, chunks] of Object.entries(bySource)) {
    console.log(`\n  [ ${source} ]`);
    for (const chunk of chunks) {
      console.log(`    #${chunk.chunkIndex} (${chunk.id})`);
      console.log(`    "${chunk.preview}..."`);
    }
  }

  console.log('\n=================================================\n');
}

main().catch((err) => {
  console.error('Inspector failed:', err.message || err);
  process.exit(1);
});
