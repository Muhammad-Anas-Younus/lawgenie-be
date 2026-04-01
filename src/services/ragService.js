import { getLLM } from "../config/gemini.js";
import { embedText } from "./embeddingService.js";
import { queryCollection } from "./vectorStore.js";
import { getHistory, appendMessage } from "../middleware/session.js";
import { checkIntent } from "./intentFilter.js";

// Number of chunks to retrieve from ChromaDB per query
const N_RESULTS = 5;

// ---------------------------------------------------------------------------
// System prompt — LawGenie persona
// ---------------------------------------------------------------------------

function buildSystemPrompt() {
  return `You are LawGenie, a compassionate AI legal assistant specialising in Pakistani family law and Islamic jurisprudence. Your sole purpose is to help women in Pakistan understand their legal rights in matters of marriage, divorce, Khula, custody, maintenance, Mehr, and property.

TONE & STYLE:
- Always begin by briefly acknowledging the user's emotional situation before answering legally. One sentence is enough.
- Write in plain, simple language. Avoid legal jargon unless you immediately explain it.
- Be warm, direct, and confident. Do not be overly hesitant or vague.
- If the user writes in Urdu, respond entirely in Urdu. If they write in English, respond in English.

ANSWERING RULES:
1. Answer ONLY based on the context documents provided. Do not use outside knowledge.
2. LEGAL INFERENCE IS ALLOWED: If the user's situation clearly maps to a legal ground in the context — even if not word-for-word — make that connection explicitly and confidently. For example, if a user says "extramarital affair", connect it to the relevant clause in the Dissolution of Muslim Marriages Act and name it clearly. Do not say "I cannot find this" if a reasonable legal inference exists.
3. Always tell the user their NEXT PRACTICAL STEP after explaining the law. What should they actually do tomorrow?
4. For complex or highly specific personal cases, recommend consulting a verified lawyer on LawGenie after giving your answer — not instead of it.
5. Never fabricate laws, sections, or case references that are not in the provided context.

CITATION FORMAT:
- Cite sources inline immediately after each legal claim using [Document Name] notation.
- Example: "The husband must send written notice to the Union Council Chairman within 7 days of pronouncing Talaq [MFLO 1961]."
- Do not cite the same source repeatedly in every sentence — cite once per paragraph or when introducing a new legal point.
- Never expose raw file names with extensions to the user (e.g., do not write "[MFLO_1961.pdf]", write "[MFLO 1961]").

RESPONSE STRUCTURE:
- Start with one sentence of empathy (where emotionally appropriate).
- Give the legal answer clearly, with citations.
- State the next practical step the user should take.
- End with an offer to help further or recommend a lawyer if the case is complex.`;
}

// ---------------------------------------------------------------------------
// Context block builder
// ---------------------------------------------------------------------------

/**
 * Formats the retrieved chunks into a clearly labelled context block
 * that is injected into the prompt.
 *
 * @param {{ text: string, metadata: object, distance: number }[]} chunks
 * @returns {string}
 */
function buildContextBlock(chunks) {
  if (chunks.length === 0) {
    return "No relevant context found in the knowledge base.";
  }

  return chunks
    .map(
      (chunk, idx) =>
        `[Context ${idx + 1} — Source: ${chunk.metadata.source}]\n${chunk.text}`,
    )
    .join("\n\n---\n\n");
}

// ---------------------------------------------------------------------------
// Source extractor
// ---------------------------------------------------------------------------

/**
 * Deduplicates the source documents from the retrieved chunks and counts
 * how many chunks came from each document.
 *
 * @param {{ text: string, metadata: object }[]} chunks
 * @returns {{ document: string, chunks: number }[]}
 */
function extractSources(chunks) {
  const counts = {};
  for (const chunk of chunks) {
    const source = chunk.metadata.source;
    counts[source] = (counts[source] || 0) + 1;
  }
  return Object.entries(counts).map(([document, count]) => ({
    document,
    chunks: count,
  }));
}

// ---------------------------------------------------------------------------
// Main chat function
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full RAG pipeline for a single chat turn:
 *
 *  0. Intent filter — if out of scope, return immediately (no RAG)
 *  1. Retrieve session history (last 6 messages)
 *  2. Embed the user's message
 *  3. Query ChromaDB for top-N relevant chunks
 *  4. Build a prompt (system + context + history + message)
 *  5. Call Gemini for a grounded answer
 *  6. Update session memory
 *  7. Return { answer, sources, inScope }
 *
 * @param {string} sessionId   - The client's session identifier.
 * @param {string} userMessage - The user's current message.
 * @returns {Promise<{ answer: string, sources: { document: string, chunks: number }[], inScope: boolean }>}
 */
export async function chat(sessionId, userMessage) {
  // 0. Intent filter — short-circuit before touching ChromaDB
  const { inScope, outOfScopeResponse } = await checkIntent(userMessage);

  if (!inScope) {
    // Still store the turn in memory so follow-up context is preserved
    appendMessage(sessionId, 'user', userMessage);
    appendMessage(sessionId, 'model', outOfScopeResponse);

    return {
      answer: outOfScopeResponse,
      sources: [],
      inScope: false,
    };
  }

  // 1. Session history
  const history = getHistory(sessionId);

  // 2. Embed the user's message
  const queryEmbedding = await embedText(userMessage);

  // 3. Retrieve top-N chunks from ChromaDB
  const retrievedChunks = await queryCollection(queryEmbedding, N_RESULTS);

  // 4. Build prompt components
  const systemPrompt = buildSystemPrompt();
  const contextBlock = buildContextBlock(retrievedChunks);

  // 5. Assemble the full prompt
  //
  // We use Gemini's generateContent API with a structured turn history.
  // The system prompt + context are prepended as the first "user" turn
  // so they anchor the entire conversation, followed by the actual history
  // and the new user message.
  const model = getLLM();

  const fullPromptParts = [
    {
      role: "user",
      parts: [
        {
          text: `${systemPrompt}\n\n---\nRELEVANT CONTEXT FROM KNOWLEDGE BASE:\n\n${contextBlock}\n\n---\nUsing only the context above, answer the user's question.`,
        },
      ],
    },
    {
      role: "model",
      parts: [
        {
          text: "Understood. I will answer based solely on the provided context and cite sources inline using [Document Name] notation.",
        },
      ],
    },
    // Inject conversation history (last 6 messages = 3 turns)
    ...history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    })),
    // Current user message
    {
      role: "user",
      parts: [{ text: userMessage }],
    },
  ];

  const result = await model.generateContent({ contents: fullPromptParts });
  const answer = result.response.text();

  // 6. Update session memory with this turn
  appendMessage(sessionId, "user", userMessage);
  appendMessage(sessionId, "model", answer);

  // 7. Extract unique source documents used
  const sources = extractSources(retrievedChunks);

  return { answer, sources, inScope: true };
}
