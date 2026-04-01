import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Returns a Gemini generative model instance for chat/completion.
 * Using gemini-1.5-flash — 15 RPM on free tier, fast and cost-effective.
 */
export function getLLM() {
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

/**
 * Returns a Gemini model instance for generating text embeddings.
 * gemini-embedding-001 is the current stable embedding model.
 */
export function getEmbeddingModel() {
  return genAI.getGenerativeModel({ model: "gemini-embedding-001" });
}
