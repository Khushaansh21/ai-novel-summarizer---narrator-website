import { cosineSim } from "../utils/math.js";

export function buildVectorIndex(embeddings) {
  return {
    embeddings,
    queryTopK(queryEmbedding, k = 10) {
      const scores = embeddings.map((emb, idx) => ({
        idx,
        score: cosineSim(queryEmbedding, emb),
      }));
      scores.sort((a, b) => b.score - a.score);
      return scores.slice(0, k);
    },
  };
}

