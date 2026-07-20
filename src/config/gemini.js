import { OpenRouter } from "@openrouter/sdk";
import "dotenv/config";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
}

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  httpReferer: "https://lawgenie.app",
  appTitle: "LawGenie",
});

export const CHAT_MODEL = "google/gemini-2.5-flash";
export const EMBEDDING_MODEL = "google/gemini-embedding-001";

export function getLLM() {
  return openrouter;
}

export function getEmbeddingModel() {
  return openrouter;
}
