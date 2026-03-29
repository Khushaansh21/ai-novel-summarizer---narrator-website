
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
import { runWithConcurrency } from "../utils/concurrency.js";

// Gemini configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "models/gemini-1.5-flash-latest";

// Rough safety limit on section text length to avoid exceeding context.
// Character-based guardrail; conservative to avoid "context length" errors.
const MAX_SECTION_CHARS = 4000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function postWithRetry(url, body, { timeout, maxRetries = 5 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await axios.post(url, body, { timeout });
    } catch (err) {
      const status = err?.response?.status;
      const retryAfterHeader = err?.response?.headers?.["retry-after"];
      const retryAfterMs = retryAfterHeader
        ? Number(retryAfterHeader) * 1000
        : null;

      const shouldRetry =
        attempt < maxRetries &&
        (status === 429 || (status >= 500 && status < 600));
      if (!shouldRetry) throw err;

      const backoffMs =
        retryAfterMs ??
        Math.min(60000, 2000 * 2 ** attempt);
      attempt += 1;
      // eslint-disable-next-line no-await-in-loop
      await sleep(backoffMs);
    }
  }
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const { data } = await postWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    },
    {
      timeout: 1000 * 60 * 5,
    }
  );

  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content || typeof content !== "string") {
    throw new Error("Invalid response from Gemini generateContent");
  }

  return content.trim();
}

async function summarizeOne({ text, idx }) {
  await sleep(1000); // 1 second gap
  const trimmedText =
    text.length > MAX_SECTION_CHARS
      ? text.slice(0, MAX_SECTION_CHARS)
      : text;

  const prompt =
    "Summarize this book section clearly and concisely with key ideas:\n\n" +
    trimmedText;

  const summary = await callGemini(prompt);

  return {
    idx,
    summary,
  };
}

export async function summarizeChunksInParallel(
  selectedChunks,
  { maxConcurrency = 1 } = {}
) {
  return runWithConcurrency(selectedChunks, summarizeOne, maxConcurrency);
}

