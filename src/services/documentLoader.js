import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

// pdf-parse is a CommonJS module — use createRequire to import it in ESM
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const DOCUMENTS_DIR = path.resolve('documents');

// ---------------------------------------------------------------------------
// PDF loading
// ---------------------------------------------------------------------------

/**
 * Reads a PDF file and returns its raw extracted text.
 * @param {string} filePath - Absolute path to the PDF file.
 * @returns {Promise<string>}
 */
async function loadPDF(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

// ---------------------------------------------------------------------------
// Markdown loading
// ---------------------------------------------------------------------------

/**
 * Reads a markdown file and returns its raw text.
 * @param {string} filePath - Absolute path to the .md file.
 * @returns {Promise<string>}
 */
async function loadMarkdown(filePath) {
  return fs.readFile(filePath, 'utf-8');
}

// ---------------------------------------------------------------------------
// Chunking — PDF: recursive character split with overlap
// ---------------------------------------------------------------------------

/**
 * Splits text into overlapping chunks to avoid cutting context at boundaries.
 *
 * Strategy:
 *  1. Try to split on double newlines (paragraph boundaries) first.
 *  2. If a paragraph is still too large, split on single newlines.
 *  3. If still too large, split on sentences (". ").
 *  4. Last resort: hard split at chunkSize.
 *
 * Each chunk carries a chunkIndex and source filename as metadata.
 *
 * @param {string} text       - Raw document text.
 * @param {string} filename   - Source filename for metadata.
 * @param {number} chunkSize  - Target chunk size in characters (default 800).
 * @param {number} overlap    - Overlap between consecutive chunks (default 150).
 * @returns {{ id: string, text: string, metadata: object }[]}
 */
export function chunkPDF(text, filename, chunkSize = 800, overlap = 150) {
  // Normalise whitespace: collapse 3+ newlines to 2
  const normalised = text.replace(/\n{3,}/g, '\n\n').trim();

  const separators = ['\n\n', '\n', '. ', ' ', ''];
  const rawChunks = recursiveSplit(normalised, separators, chunkSize);

  // Apply overlap: each chunk starts `overlap` chars into the previous chunk
  const overlappedChunks = [];
  let i = 0;
  while (i < rawChunks.length) {
    const current = rawChunks[i];
    if (overlappedChunks.length > 0 && overlap > 0) {
      const prev = overlappedChunks[overlappedChunks.length - 1].text;
      const tail = prev.slice(-overlap);
      overlappedChunks.push({
        text: (tail + current).trim(),
        metadata: { source: filename, chunkIndex: overlappedChunks.length },
      });
    } else {
      overlappedChunks.push({
        text: current.trim(),
        metadata: { source: filename, chunkIndex: overlappedChunks.length },
      });
    }
    i++;
  }

  // Assign stable IDs
  return overlappedChunks
    .filter((c) => c.text.length > 50) // drop near-empty chunks
    .map((c, idx) => ({
      id: `${sanitiseId(filename)}-chunk-${idx}`,
      text: c.text,
      metadata: { source: filename, chunkIndex: idx },
    }));
}

/**
 * Recursively splits text using a priority list of separators.
 * Tries to keep chunks at or below maxSize. Falls back to the next
 * separator when chunks are still too large.
 */
function recursiveSplit(text, separators, maxSize) {
  if (text.length <= maxSize) return [text];

  const [separator, ...remainingSeparators] = separators;

  // No more separators — hard cut
  if (separator === '') {
    const chunks = [];
    for (let i = 0; i < text.length; i += maxSize) {
      chunks.push(text.slice(i, i + maxSize));
    }
    return chunks;
  }

  const parts = text.split(separator).filter(Boolean);
  const result = [];
  let buffer = '';

  for (const part of parts) {
    const candidate = buffer ? buffer + separator + part : part;
    if (candidate.length <= maxSize) {
      buffer = candidate;
    } else {
      if (buffer) result.push(buffer);
      // If the single part itself exceeds maxSize, recurse with next separator
      if (part.length > maxSize) {
        result.push(...recursiveSplit(part, remainingSeparators, maxSize));
        buffer = '';
      } else {
        buffer = part;
      }
    }
  }
  if (buffer) result.push(buffer);

  return result;
}

// ---------------------------------------------------------------------------
// Chunking — Markdown: split by ## headings
// ---------------------------------------------------------------------------

/**
 * Splits a markdown document on "## " headings so that each Q&A section
 * (like those in nikkah-nama.md) becomes a single, self-contained chunk.
 *
 * @param {string} text     - Raw markdown text.
 * @param {string} filename - Source filename for metadata.
 * @returns {{ id: string, text: string, metadata: object }[]}
 */
export function chunkMarkdown(text, filename) {
  // Split on lines that start with "## " (second-level heading)
  const sections = text.split(/(?=\n## )/);

  return sections
    .map((section) => section.trim())
    .filter((section) => section.length > 50)
    .map((section, idx) => ({
      id: `${sanitiseId(filename)}-chunk-${idx}`,
      text: section,
      metadata: { source: filename, chunkIndex: idx },
    }));
}

// ---------------------------------------------------------------------------
// Main entry point: load all documents from documents/
// ---------------------------------------------------------------------------

/**
 * Discovers all supported files in the documents/ directory, loads them,
 * chunks them with the appropriate strategy, and returns a flat array of
 * all chunks ready for embedding.
 *
 * @returns {Promise<{ id: string, text: string, metadata: object }[]>}
 */
export async function loadAllDocuments() {
  const entries = await fs.readdir(DOCUMENTS_DIR);
  const allChunks = [];

  for (const filename of entries) {
    const filePath = path.join(DOCUMENTS_DIR, filename);
    const ext = path.extname(filename).toLowerCase();

    if (ext === '.pdf') {
      console.log(`  Loading PDF: ${filename}`);
      const text = await loadPDF(filePath);
      const chunks = chunkPDF(text, filename);
      console.log(`    → ${chunks.length} chunks`);
      allChunks.push(...chunks);
    } else if (ext === '.md') {
      console.log(`  Loading Markdown: ${filename}`);
      const text = await loadMarkdown(filePath);
      const chunks = chunkMarkdown(text, filename);
      console.log(`    → ${chunks.length} chunks`);
      allChunks.push(...chunks);
    } else {
      console.log(`  Skipping unsupported file: ${filename}`);
    }
  }

  return allChunks;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Converts a filename into a safe string for use as a ChromaDB document ID.
 * e.g. "MFLO, 1961.pdf" → "mflo-1961-pdf"
 */
function sanitiseId(filename) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
