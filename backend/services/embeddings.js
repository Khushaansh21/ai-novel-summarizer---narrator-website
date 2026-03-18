import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// Gemini embedding configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBED_MODEL =
  process.env.GEMINI_EMBED_MODEL || "models/gemini-embedding-001";

// Guardrail to avoid sending extremely long text to the embedding model.
const MAX_EMBED_CHARS = 4000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function postWithRetry(url, body, { timeout, maxRetries = 6 } = {}) {
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
        Math.min(45_000, 900 * 2 ** attempt + Math.floor(Math.random() * 400));
      attempt += 1;
      // eslint-disable-next-line no-await-in-loop
      await sleep(backoffMs);
    }
  }
}

async function embedOne(text) {
  const trimmed =
    text.length > MAX_EMBED_CHARS ? text.slice(0, MAX_EMBED_CHARS) : text;

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const { data } = await postWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/${GEMINI_EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      content: {
        parts: [
          {
            text: trimmed,
          },
        ],
      },
    },
    {
      timeout: 1000 * 60,
    }
  );

  const embedding = data?.embedding?.values;
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Invalid embedding response from Gemini");
  }

  return embedding;
}

export async function embedChunks(chunks) {
  // For a 300–400 page book, the number of chunks is modest; Promise.all is acceptable.
  return Promise.all(chunks.map((c) => embedOne(c)));
}

