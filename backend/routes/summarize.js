import express from "express";
import multer from "multer";
import { extractTextFromPdfBuffer } from "../services/pdfParser.js";
import { semanticChunk } from "../services/semanticChunker.js";
import { embedChunks } from "../services/embeddings.js";
import { buildVectorIndex } from "../services/vectorIndex.js";
import { rankImportantChunks } from "../services/importanceRanker.js";
import { summarizeChunksInParallel } from "../services/summarizer.js";
import { reduceSummaries } from "../services/summaryReducer.js";
import { formatForNarration } from "../services/narrationFormatter.js";

const router = express.Router();

function pickRepresentativeChunks(chunks, { maxSelected = 10 } = {}) {
  if (!chunks || chunks.length === 0) return [];
  if (chunks.length <= maxSelected) return chunks;

  // Evenly sample across the book to keep coverage without embeddings.
  const selected = [];
  const step = (chunks.length - 1) / (maxSelected - 1);
  for (let i = 0; i < maxSelected; i += 1) {
    const idx = Math.round(i * step);
    selected.push(chunks[idx]);
  }
  return selected;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 80 * 1024 * 1024, // 80MB
  },
});

// Main endpoint: POST /upload-book
router.post("/upload-book", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const pdfBuffer = req.file.buffer;

    // Step 1: Fast full-text extraction
    const fullText = await extractTextFromPdfBuffer(pdfBuffer);

    if (!fullText || fullText.trim().length === 0) {
      return res.status(400).json({ error: "Could not extract text from PDF" });
    }

    // Step 2: Semantic chunking (2k–4k word chunks on paragraph boundaries)
    const chunks = semanticChunk(fullText, {
      minWords: 2000,
      maxWords: 4000,
    });

    if (!chunks.length) {
      return res.status(400).json({ error: "No textual content found in PDF" });
    }

    const useEmbeddings = process.env.USE_EMBEDDINGS !== "false";

    let selected = [];
    if (useEmbeddings) {
      // Step 3: Embeddings for each chunk
      const embeddings = await embedChunks(chunks);

      // Step 4: In-memory vector index
      const index = buildVectorIndex(embeddings);

      // Step 5: Select most important & diverse chunks (top ~15%)
      selected = rankImportantChunks(chunks, embeddings, index, {
        topFraction: 0.15,
      });
    } else {
      // No-embeddings mode: drastically reduces API calls (avoids 429s on free tiers).
      selected = pickRepresentativeChunks(chunks, { maxSelected: 10 });
    }

    // Step 6: Parallel summarization (map step)
    const chunkSummaries = await summarizeChunksInParallel(selected, {
      maxConcurrency: 1,
    });

    // Step 7: Final reduction (reduce step)
    const structured = await reduceSummaries(chunkSummaries);

    // Build narration script from the final short summary
    const narrationScript = formatForNarration(structured.shortSummary);

    // Preserve backwards-compatible fields for the existing frontend:
    return res.json({
      // New structured fields
      keyIdeas: structured.keyIdeas,
      mainLessons: structured.mainLessons,
      chapterHighlights: structured.chapterHighlights,
      shortSummary: structured.shortSummary,

      // Old fields so the current UI keeps working
      summary: structured.shortSummary,
      chunkSummaries: chunkSummaries.map((c) => c.summary),
      chunkCount: chunks.length,
      selectedChunkCount: selected.length,
      narrationScript,
    });
  } catch (error) {
    console.error("Error in upload-book route:", error);
    return res.status(500).json({
      error: "Failed to process PDF",
      details:
        error.message ||
        "The language model or embedding provider is not reachable or returned an error.",
    });
  }
});

export default router;

