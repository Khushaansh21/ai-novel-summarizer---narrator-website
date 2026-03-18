function countWords(text) {
  return text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean).length;
}

/**
 * Split long text into chunks by paragraphs, aiming for 1000–1500 words.
 * Paragraphs are separated by blank lines.
 */
export function chunkTextIntoParagraphs(
  text,
  { minWords = 1000, maxWords = 1500 } = {}
) {
  const paragraphs = text
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let currentChunk = "";
  let currentWordCount = 0;

  for (const paragraph of paragraphs) {
    const paraWords = countWords(paragraph);

    // If single paragraph is itself huge, just push as its own chunk
    if (paraWords >= maxWords) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
        currentWordCount = 0;
      }
      chunks.push(paragraph);
      continue;
    }

    if (currentWordCount + paraWords <= maxWords) {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      currentWordCount += paraWords;
    } else {
      // Close current chunk if it has enough content
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }

      // Start new chunk with this paragraph
      currentChunk = paragraph;
      currentWordCount = paraWords;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  // If chunks are too small (e.g., very short book), just return one combined chunk
  if (chunks.length > 1) {
    const allShort = chunks.every((c) => countWords(c) < minWords);
    if (allShort) {
      return [chunks.join("\n\n")];
    }
  }

  return chunks;
}

