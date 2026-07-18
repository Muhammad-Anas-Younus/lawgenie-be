import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat.js";
import filesRouter from "./routes/files.js";
import authRouter from "./routes/auth.js";
import lawyersRouter from "./routes/lawyers.js";
import muftisRouter from "./routes/muftis.js";
import consultationsRouter from "./routes/consultations.js";
import paymentsRouter from "./routes/payments.js";
import proposalsRouter from "./routes/proposals.js";
import muftiQueriesRouter from "./routes/muftiQueries.js";
import adminRouter from "./routes/admin.js";
import threadsRouter from "./routes/threads.js";
import documentsRouter from "./routes/documents.js";
import usersRouter from "./routes/users.js";
import casesRouter from "./routes/cases.js";
import hearingsRouter from "./routes/hearings.js";
import reviewsRouter from "./routes/reviews.js";
import { getSessionCount } from "./middleware/session.js";
import { errorHandler } from "./middleware/errorHandler.js";

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
app.use("/api/files", filesRouter);
app.use("/api/auth", authRouter);
app.use("/api/lawyers", lawyersRouter);
app.use("/api/muftis", muftisRouter);
app.use("/api/consultations", consultationsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/proposals", proposalsRouter);
app.use("/api/mufti-queries", muftiQueriesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/threads", threadsRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/users", usersRouter);
app.use("/api/cases", casesRouter);
app.use("/api/hearings", hearingsRouter);
app.use("/api/reviews", reviewsRouter);

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
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`LawGenie API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Chat endpoint: POST http://localhost:${PORT}/api/chat`);
});
