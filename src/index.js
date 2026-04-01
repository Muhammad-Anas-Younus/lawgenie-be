import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat.js";
import { getSessionCount } from "./middleware/session.js";

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

dotenv.config();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use("/api/chat", chatRouter);

// Health check — also exposes active session count for diagnostics
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    activeSessions: getSessionCount(),
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("[Unhandled Error]", err);
  res.status(500).json({ error: "An unexpected error occurred." });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`LawGenie API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Chat endpoint: POST http://localhost:${PORT}/api/chat`);
});
