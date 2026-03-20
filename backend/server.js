import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import summarizeRouter from "./routes/summarize.js";
import { formatForNarration } from "./services/narrationFormatter.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  })
);

app.use(express.json({ limit: "10mb" }));

// Mount routes at root – main upload endpoint is POST /upload-book
app.use("/", summarizeRouter);

// Optional: raw text-to-narration endpoint
app.post("/narrate-text", (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing 'text' field in request body" });
  }
  const script = formatForNarration(text);
  res.json({ narrationScript: script });
});

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Book Narrator backend running" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

