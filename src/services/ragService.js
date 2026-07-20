import { getLLM, CHAT_MODEL } from "../config/gemini.js";
import { embedText } from "./embeddingService.js";
import { queryCollection } from "./vectorStore.js";
import { getHistory, appendMessage } from "../middleware/session.js";
import { checkIntent } from "./intentFilter.js";
import { CASE_CATEGORIES } from "./caseCategories.js";
import { getCostEstimate, getRecommendations } from "./lawyerService.js";

// Number of chunks to retrieve from ChromaDB per query
const N_RESULTS = 5;

// Forces Gemini to return category/checklist as real, parseable fields
// instead of prose the frontend would have to regex out of the answer —
// see the write-up on why this needs to be structured output, not just a
// prompt instruction to "always mention the category."
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      description:
        "The full answer to the user, written per the system prompt's tone/structure/citation rules.",
    },
    category: {
      type: "string",
      enum: CASE_CATEGORIES,
      description:
        "The single best-matching case category for the user's situation.",
    },
    checklist: {
      type: "array",
      items: { type: "string" },
      description:
        "Documents the user would need to move forward with this case type (e.g. Nikah Nama, CNIC). Empty array if the conversation hasn't reached a point where a checklist is useful yet (e.g. small talk, a purely informational question).",
    },
  },
  required: ["answer", "category", "checklist"],
  additionalProperties: false,
};

// ---------------------------------------------------------------------------
// System prompt — LawGenie persona
// ---------------------------------------------------------------------------

function buildSystemPrompt() {
  return `You are LawGenie, a compassionate AI legal assistant specialising in Pakistani family law and Islamic jurisprudence. Your sole purpose is to help women in Pakistan understand their legal rights in matters of marriage, divorce, Khula, custody, maintenance, Mehr, and property.

IMPORTANT — TWO OPERATING MODES:
MODE 1 — Legal Q&A: When the user asks a legal question, answer using the context below. Cite sources with [Document Name]. Include category, checklist, etc.
MODE 2 — Lawyer Recommendations: When the user asks you to recommend, find, suggest, or connect them with a lawyer, switch to MODE 2. In MODE 2 you MUST immediately set "category" to "Lawyer Recommendation" and include "recommendationCriteria" with what the user has told you. Do NOT provide legal answers, citations, or ask follow-up questions.

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

CRITICAL — LAWYER RECOMMENDATIONS:
When the user asks you to recommend, find, suggest, or connect them with a lawyer, you MUST immediately set "category" to "Lawyer Recommendation" and include "recommendationCriteria" with whatever information is available. Do NOT ask for confirmation, location, or budget. Do NOT engage in a back-and-forth. The system will handle matching. Just extract "caseType" from their message and set the fields. If they already told you their city or budget, include those too. If not, omit them — the system works fine with just a case type.

CITATION FORMAT:

CITATION FORMAT:
- Cite sources inline immediately after each legal claim using [Document Name] notation.
- Example: "The husband must send written notice to the Union Council Chairman within 7 days of pronouncing Talaq [MFLO 1961]."
- Do not cite the same source repeatedly in every sentence — cite once per paragraph or when introducing a new legal point.
- Never expose raw file names with extensions to the user (e.g., do not write "[MFLO_1961.pdf]", write "[MFLO 1961]").

RESPONSE STRUCTURE (for the "answer" field):
- Start with one sentence of empathy (where emotionally appropriate).
- Give the legal answer clearly, with citations.
- State the next practical step the user should take.
- End with an offer to help further or recommend a lawyer if the case is complex.

OUTPUT FORMAT:
You must respond with a JSON object — never plain text.

When the user is asking about legal information:
- "answer": the full response, following the rules above.
- "category": one of: ${CASE_CATEGORIES.join(", ")}. Pick "Family Law" only if nothing more specific applies.
- "checklist": documents needed (string[]). Empty array if not applicable.

When the user is asking for a LAWYER RECOMMENDATION:
- "category": "Lawyer Recommendation" (MUST be exactly this)
- "answer": a brief message like "I'll find matching lawyers for you."
- "recommendationCriteria": { "caseType": "child custody", "budget": 50000, "location": "Karachi" }
  - "caseType": REQUIRED — extract from their message
  - "budget": include only if mentioned (number, optional)
  - "location": include only if mentioned (string, optional)

CRITICAL: Do NOT ask the user any follow-up questions about lawyers. If they ask for a lawyer, immediately output the Lawyer Recommendation format with whatever details they've already provided. The system will handle the rest.`;
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
 *  5. Call Gemini for a grounded, structured (category/checklist) answer
 *  6. Update session memory (answer text only — not the raw JSON envelope)
 *  7. Look up a real, DB-derived cost estimate for the assigned category
 *  8. Return { answer, category, checklist, costEstimate, sources, inScope }
 *
 * @param {string} sessionId   - The client's session identifier.
 * @param {string} userMessage - The user's current message.
 * @returns {Promise<{
 *   answer: string,
 *   category: string|null,
 *   checklist: string[],
 *   costEstimate: object|null,
 *   sources: { document: string, chunks: number }[],
 *   inScope: boolean,
 * }>}
 */
export async function chat(sessionId, userMessage) {
  // 0. Fetch history early so the intent filter has context
  const history = getHistory(sessionId);

  // 1. Intent filter — short-circuit before touching ChromaDB
  const { inScope, outOfScopeResponse } = await checkIntent(userMessage, history);

  if (!inScope) {
    // Still store the turn in memory so follow-up context is preserved
    appendMessage(sessionId, "user", userMessage);
    appendMessage(sessionId, "model", outOfScopeResponse);

    return {
      answer: outOfScopeResponse,
      category: null,
      checklist: [],
      costEstimate: null,
      sources: [],
      inScope: false,
    };
  }

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
  const openrouter = getLLM();

  const messages = [
    {
      role: "system",
      content: `${systemPrompt}\n\n---\nRELEVANT CONTEXT FROM KNOWLEDGE BASE:\n\n${contextBlock}\n\n---\nAnswer the user's question. If the user wants a lawyer recommendation, ignore the context above and follow the LAWYER RECOMMENDATIONS rule instead.`,
    },
    {
      role: "assistant",
      content:
        "Understood. I will answer based on the provided context for legal questions, cite sources inline using [Document Name] notation, and return the JSON object with the correct fields. If the user asks for a lawyer recommendation, I will set category to 'Lawyer Recommendation' and include recommendationCriteria so the system can match them to real lawyers.",
    },
    // Inject conversation history (last 6 messages = 3 turns)
    ...history.map((msg) => ({
      role: msg.role === "model" ? "assistant" : "user",
      content: msg.content,
    })),
    // Current user message
    {
      role: "user",
      content: userMessage,
    },
  ];

  const completion = await openrouter.chat.send({
    chatRequest: {
      model: CHAT_MODEL,
      messages,
      responseFormat: { type: "json_object" },
    },
  });

  const responseText = completion.choices[0].message.content ?? "";

  // Structured output is enforced by responseFormat, but parse
  // defensively anyway — if it ever fails, degrade to plain text rather
  // than 500ing the whole chat turn.
  let answer;
  let category = null;
  let checklist = [];
  let lawyers = null;
  try {
    const parsed = JSON.parse(responseText);
    answer = parsed.answer;
    category =
      parsed.category === "Lawyer Recommendation" ||
      CASE_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : null;
    checklist = Array.isArray(parsed.checklist) ? parsed.checklist : [];

    if (
      parsed.category === "Lawyer Recommendation" &&
      parsed.recommendationCriteria
    ) {
      const { caseType, budget, location } = parsed.recommendationCriteria;
      const result = await getRecommendations({ caseType, budget, location });
      if (result.recommendations && result.recommendations.length > 0) {
        lawyers = result.recommendations;
      } else {
        lawyers = null;
        answer =
          "I'm sorry, but there are currently no verified lawyers on LawGenie matching your criteria. Please check back later or try adjusting your search criteria.";
      }
    }
  } catch {
    answer = responseText;
  }

  // 6. Update session memory with this turn (answer text only, so future
  // history replay stays clean prose rather than a raw JSON blob)
  appendMessage(sessionId, "user", userMessage);
  appendMessage(sessionId, "model", answer);

  // 7. A real, DB-derived cost estimate for the assigned category — kept
  // entirely separate from the LLM's own output so no dollar figure the
  // user sees was ever generated (and possibly hallucinated) by the model.
  const costEstimate =
    category && category !== "Lawyer Recommendation"
      ? await getCostEstimate(category)
      : null;

  // 8. Extract unique source documents used
  const sources = extractSources(retrievedChunks);

  return {
    answer,
    category,
    checklist,
    costEstimate,
    sources,
    lawyers,
    inScope: true,
  };
}
