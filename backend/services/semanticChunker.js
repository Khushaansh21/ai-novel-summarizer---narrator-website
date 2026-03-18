import { cleanText, countWords } from "../utils/text.js";

// Semantic-ish chunking: 2000–4000 words, preserving paragraph boundaries.
export function semanticChunk(
  text,
  { minWords = 2000, maxWords = 4000 } = {}
) {
  const cleaned = cleanText(text);
  const paragraphs = cleaned
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";
  let currentWords = 0;

  for (const para of paragraphs) {
    const w = countWords(para);

    // Huge single paragraph → its own chunk
    if (w >= maxWords) {
      if (current) {
        chunks.push(current.trim());
        current = "";
        currentWords = 0;
      }
      chunks.push(para);
      continue;
    }

    if (currentWords + w <= maxWords) {
      current += (current ? "\n\n" : "") + para;
      currentWords += w;
    } else {
      if (current) chunks.push(current.trim());
      current = para;
      currentWords = w;
    }
  }

  if (current) chunks.push(current.trim());

  // If all are tiny, merge to a single chunk
  if (chunks.length > 1 && chunks.every((c) => countWords(c) < minWords)) {
    return [chunks.join("\n\n")];
  }

  return chunks;
}

