import { cleanText } from "../utils/text.js";

// Simple keyword lists to drive pitch / pace heuristics.
const EXCITED_WORDS = [
  "suddenly",
  "incredible",
  "amazing",
  "finally",
  "discovered",
  "treasure",
  "victory",
  "breakthrough",
];

const DARK_WORDS = [
  "silent",
  "dark",
  "alone",
  "fear",
  "danger",
  "mystery",
  "secret",
  "loss",
];

const EMPHASIS_WORDS = ["truth", "secret", "hidden", "key", "crucial", "important"];

function chooseMood(sentenceLower) {
  const hasExcited = EXCITED_WORDS.some((w) => sentenceLower.includes(w));
  const hasDark = DARK_WORDS.some((w) => sentenceLower.includes(w));

  if (hasExcited && !hasDark) {
    return { pitch: "[high-pitch]", pace: "[fast]" };
  }
  if (hasDark && !hasExcited) {
    return { pitch: "[low-pitch]", pace: "[slow]" };
  }
  return { pitch: "[normal-pitch]", pace: "[normal]" };
}

function addPausesAndBreath(sentence, isImportant) {
  // Short pauses after commas
  let s = sentence.replace(/,/g, ",[pause-short]");

  // Ensure sentence-level pause at the end
  if (!s.endsWith("[pause-long]")) {
    s = s.replace(/([.!?])\s*$/u, "$1[pause-long]");
  }

  // Dramatic pause before obviously important sentences
  if (isImportant) {
    s = "[pause-long]" + s;
  }

  return s;
}

function addEmphasis(sentence) {
  let s = sentence;
  for (const word of EMPHASIS_WORDS) {
    const re = new RegExp(`\\b(${word})\\b`, "i");
    if (re.test(s)) {
      s = s.replace(
        re,
        (_m, g1) => `[emphasis]${g1}[/emphasis]`
      );
    }
  }
  return s;
}

// Convert plain text into a narration script with pause, pitch, pace and emphasis markers.
export function formatForNarration(rawText) {
  const base = cleanText(rawText || "");
  if (!base) return "";

  // Split into sentences (simple heuristic).
  const roughSentences = base
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const lines = [];
  let sentenceCountSinceBreath = 0;

  roughSentences.forEach((sentence, idx) => {
    const lower = sentence.toLowerCase();

    const { pitch, pace } = chooseMood(lower);

    const isImportant =
      EMPHASIS_WORDS.some((w) => lower.includes(w)) ||
      idx === 0 ||
      idx === roughSentences.length - 1;

    let line = addEmphasis(sentence);
    line = addPausesAndBreath(line, isImportant);

    // Occasionally add a breath marker at natural transitions
    sentenceCountSinceBreath += 1;
    if (sentenceCountSinceBreath >= 3 || isImportant) {
      line += "[breath]";
      sentenceCountSinceBreath = 0;
    }

    lines.push(`${pace}${pitch}${line}`);
  });

  // Join as short lines suitable for TTS.
  return lines.join("\n\n");
}

