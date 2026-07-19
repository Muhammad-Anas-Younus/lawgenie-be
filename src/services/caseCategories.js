// Shared family-law case-type taxonomy for the chatbot's structured
// categorization (ragService) and the DB-driven cost estimator
// (lawyerService.getCostEstimate). Deliberately the same vocabulary as the
// frontend's lawyer specialization picker (LawyerProfile.jsx SPECIALISATIONS)
// so a category the chatbot assigns can be passed straight through as a
// `specialization`/`caseType` filter elsewhere in the platform.
export const CASE_CATEGORIES = [
  "Khula",
  "Divorce (Talaq)",
  "Child Custody",
  "Maintenance",
  "Mehr Recovery",
  "Domestic Violence",
  "Marriage Registration",
  "Family Law",
];

/**
 * Fuzzy-matches a freeform case-type string (e.g. a lawyer's own
 * `feeStructure.caseType` text on a Proposal) against the fixed category
 * list above via case-insensitive substring matching in both directions —
 * the same approach lawyerService.getRecommendations already uses to match
 * a client's caseType against a lawyer's specialization array.
 *
 * @param {string} text
 * @returns {string} a CASE_CATEGORIES entry, or "Family Law" if nothing matches.
 */
export function matchCategory(text) {
  if (!text) return "Family Law";
  const lower = text.toLowerCase();
  const match = CASE_CATEGORIES.find(
    (category) => lower.includes(category.toLowerCase()) || category.toLowerCase().includes(lower)
  );
  return match ?? "Family Law";
}
