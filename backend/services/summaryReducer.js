import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "models/gemini-2.5-flash";

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
        Math.min(30_000, 1000 * 2 ** attempt + Math.floor(Math.random() * 400));
      attempt += 1;
      // eslint-disable-next-line no-await-in-loop
      await sleep(backoffMs);
    }
  }
}

export async function reduceSummaries(chunkSummaries) {
  if (!chunkSummaries || chunkSummaries.length === 0) {
    return {
      keyIdeas: [],
      mainLessons: [],
      chapterHighlights: [],
      shortSummary: "",
    };
  }

  // Limit how many section summaries and total characters we feed into the
  // final reducer to stay comfortably within the model context window.
  const MAX_SECTIONS = 12;
  const MAX_JOINED_CHARS = 8000;

  const ordered = chunkSummaries.sort((a, b) => a.idx - b.idx);
  const limited = ordered.slice(0, MAX_SECTIONS);

  let joined = limited
    .map((c, i) => `Section ${i + 1} (from chunk ${c.idx + 1}):\n${c.summary}`)
    .join("\n\n");

  if (joined.length > MAX_JOINED_CHARS) {
    joined = joined.slice(0, MAX_JOINED_CHARS);
  }

  const prompt =
    "Using the following summarized sections of a book, produce a concise, structured summary highlighting the key ideas, lessons, and themes.\n" +
    "Important: the value of \"shortSummary\" must be between 700 and 800 words (inclusive). Aim for ~750 words.\n" +
    "Return JSON with this shape:\n" +
    "{\n" +
    '  \"keyIdeas\": [\"...\"],\n' +
    '  \"mainLessons\": [\"...\"],\n' +
    '  \"chapterHighlights\": [\"...\"],\n' +
    '  \"shortSummary\": \"...\" \n' +
    "}\n\n" +
    "Here are the section summaries:\n\n" +
    joined +
    "\n\nNow respond with ONLY the JSON. Do not include any markdown or extra text.";

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const { data } = await postWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    },
    { timeout: 1000 * 60 * 5 }
  );

  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

  try {
    const parsed = JSON.parse(raw);
    return {
      keyIdeas: parsed.keyIdeas || [],
      mainLessons: parsed.mainLessons || [],
      chapterHighlights: parsed.chapterHighlights || [],
      shortSummary: parsed.shortSummary || "",
    };
  } catch (_err) {
    // Fallback: treat raw as plain text summary
    return {
      keyIdeas: [],
      mainLessons: [],
      chapterHighlights: [],
      shortSummary: raw,
    };
  }
}

