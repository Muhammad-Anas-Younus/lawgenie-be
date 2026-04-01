import { getLLM } from '../config/gemini.js';

// ---------------------------------------------------------------------------
// In-scope topics for LawGenie
// ---------------------------------------------------------------------------
// These are the ONLY topics the chatbot should answer. Anything outside
// this list is classified as OUT_OF_SCOPE and short-circuited before
// ChromaDB is ever queried.

const IN_SCOPE_TOPICS = `
- Nikah / Islamic marriage contract (Nikah Nama)
- Talaq (divorce initiated by husband)
- Khula (divorce initiated by wife)
- Mehr / Mahr (dower — financial right of wife)
- Iddat (waiting period after divorce or death of spouse)
- Tafwiz-e-Talaq (delegated right of divorce)
- Polygamy / second marriage under Pakistani law
- Dissolution of Muslim marriage
- Maintenance / Nafaqa (financial support for wife or children)
- Child custody and guardianship
- Family court procedure and jurisdiction in Pakistan
- Muslim Family Laws Ordinance 1961 (MFLO)
- West Pakistan Family Courts Act 1964
- Dissolution of Muslim Marriages Act 1939
- Guardians and Wards Act
- Islamic jurisprudence on marriage and family matters
- Rights of women under Pakistani family law
- Property rights within a marriage or divorce context
- Domestic abuse as grounds for dissolution of marriage
`.trim();

// ---------------------------------------------------------------------------
// Intent classification prompt
// ---------------------------------------------------------------------------

function buildClassificationPrompt(userMessage) {
  return `You are a strict topic classifier for LawGenie, a legal chatbot that ONLY handles Pakistani family law and Islamic jurisprudence.

Your job: classify the user's message as either IN_SCOPE or OUT_OF_SCOPE.

IN_SCOPE topics (the ONLY things LawGenie handles):
${IN_SCOPE_TOPICS}

CLASSIFICATION RULES:
1. If the message is clearly about any IN_SCOPE topic, output: IN_SCOPE
2. If the message is about anything else (landlord disputes, criminal law, employment, business, traffic, tax, immigration, etc.), output: OUT_OF_SCOPE
3. If the message is a greeting, small talk, or a follow-up that refers back to a previous family law question (e.g. "tell me more", "what about custody?", "explain that again"), output: IN_SCOPE
4. If the message is ambiguous but could reasonably relate to marriage, divorce, or family rights in Pakistan, output: IN_SCOPE — err on the side of inclusion.
5. Output ONLY the single word: IN_SCOPE or OUT_OF_SCOPE. No explanation. No punctuation. Nothing else.

User message: "${userMessage}"`;
}

// ---------------------------------------------------------------------------
// Out-of-scope response
// ---------------------------------------------------------------------------

const OUT_OF_SCOPE_RESPONSE =
  "I'm sorry, but that falls outside my area of expertise. LawGenie specialises in Pakistani family law — matters like marriage, divorce, Khula, Mehr, custody, and maintenance. For other legal issues, I'd recommend consulting a qualified lawyer. If you have any questions about family law, I'm here to help.";

// ---------------------------------------------------------------------------
// Main intent filter function
// ---------------------------------------------------------------------------

/**
 * Classifies a user message as in-scope or out-of-scope for LawGenie.
 *
 * Uses a fast Gemini call with a strict classification prompt.
 * If out-of-scope, returns a ready-made response so the caller can
 * short-circuit the RAG pipeline entirely — no embedding, no ChromaDB query.
 *
 * @param {string} userMessage
 * @returns {Promise<{ inScope: boolean, outOfScopeResponse: string | null }>}
 */
export async function checkIntent(userMessage) {
  const model = getLLM();

  const result = await model.generateContent(
    buildClassificationPrompt(userMessage)
  );
  const classification = result.response.text().trim().toUpperCase();

  const inScope = classification === 'IN_SCOPE';

  return {
    inScope,
    outOfScopeResponse: inScope ? null : OUT_OF_SCOPE_RESPONSE,
  };
}
