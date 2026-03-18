export function countWords(text) {
  return text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean).length;
}

export function cleanText(text) {
  return text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim();
}

