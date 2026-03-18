import dotenv from "dotenv";
import axios from "axios";

dotenv.config();



// This module is not currently used by the main upload flow, but it is kept
// as a helper for any future hierarchical summarization features.
// It now targets Gemini instead of Ollama/OpenAI.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "models/gemini-1.5-flash-latest";

const BASE_PROMPT =
  "You are an expert book storyteller.\n" +
  "Summarize the following text in an engaging storytelling style.\n" +
  "Use bullet points, simple language, and highlight key ideas.\n" +
  "Make it enjoyable to listen to in audio format.\n" +
  "Use simple language and make it engaging and easy to listen to as audio.\n\n";

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ]
        },
      ],
    },
    {
      timeout: 1000 * 60 * 5,
    }
  );

  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content || typeof content !== "string") {
    throw new Error("Unexpected response from Gemini generateContent");
  }

  return content.trim();
}

export async function summarizeTextChunk(text, index, total) {
  const prompt =
    BASE_PROMPT +
    `This is chunk ${index + 1} of ${total} from a book.\n\n` +
    "Text:\n\n" +
    text;

  return callGemini(prompt);
}

export async function summarizeChunksHierarchically(chunks) {
  if (!chunks || chunks.length === 0) {
    return { chunkSummaries: [], finalSummary: "" };
  }

  const chunkSummaries = [];
  for (let i = 0; i < chunks.length; i += 1) {
    // Sequential to keep token usage more predictable; adjust if needed.
    // eslint-disable-next-line no-await-in-loop
    const summary = await summarizeTextChunk(chunks[i], i, chunks.length);
    chunkSummaries.push(summary);
  }

  const combinedSummaryText = chunkSummaries
    .map((cs, idx) => `Chunk ${idx + 1} summary:\n${cs}`)
    .join("\n\n");

  const finalPrompt =
    "Create a clear and engaging summary of this book using the following summarized sections.\n" +
    "Highlight the most important lessons, key ideas, and overall message.\n" +
    "Write it so it is easy to understand and enjoyable to listen to as audio.\n\n" +
    "Here are the section summaries:\n\n" +
    combinedSummaryText +
    "\n\nNow write the final concise book summary.";

  const finalSummary = await callGemini(finalPrompt);

  return { chunkSummaries, finalSummary };
}

