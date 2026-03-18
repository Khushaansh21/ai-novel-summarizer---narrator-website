import { countWords } from "../utils/text.js";
import { cosineSim } from "../utils/math.js";

function normalize(arr, value) {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

// Rank and select the most informative and diverse chunks.
export function rankImportantChunks(
  chunks,
  embeddings,
  _index,
  { topFraction = 0.3 } = {}
) {
  const n = chunks.length;
  if (n === 0) return [];

  const targetCount = Math.max(1, Math.round(n * topFraction));

  // 1) Centrality score: similarity to mean embedding
  const dim = embeddings[0].length;
  const mean = Array(dim).fill(0);

  embeddings.forEach((e) => {
    for (let i = 0; i < dim; i++) mean[i] += e[i];
  });
  for (let i = 0; i < dim; i++) mean[i] /= embeddings.length;

  const centralityScores = embeddings.map((e) => cosineSim(e, mean));

  // 2) Simple keyword density proxy = log(word count)
  const wordCounts = chunks.map((c) => countWords(c));
  const wordScores = wordCounts.map((c) => Math.log(1 + c));

  // 3) Combine
  const combined = chunks.map((_c, idx) => ({
    idx,
    score:
      0.7 * centralityScores[idx] + 0.3 * normalize(wordScores, wordScores[idx]),
  }));

  combined.sort((a, b) => b.score - a.score);

  // 4) Diversity filter: avoid chunks too similar to already selected ones
  const selected = [];
  const selectedEmbeddings = [];

  for (const entry of combined) {
    if (selected.length >= targetCount) break;
    const emb = embeddings[entry.idx];

    const tooClose = selectedEmbeddings.some(
      (e) => cosineSim(e, emb) > 0.9
    );
    if (tooClose) continue;

    selected.push({ idx: entry.idx, text: chunks[entry.idx] });
    selectedEmbeddings.push(emb);
  }

  return selected;
}

