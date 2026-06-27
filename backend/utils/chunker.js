// Splits text into overlapping word-based chunks.
//
// Why overlap? If a sentence/idea spans a chunk boundary, overlap ensures
// it still appears whole in at least one chunk - otherwise you risk
// "losing" context right at the cut point.
//
// Why words and not tokens? True LLM tokenization (subword units) is more
// precise, but word-count is a perfectly good approximation for learning
// this concept, and keeps this dependency-free. In production you'd often
// use a proper tokenizer (e.g. tiktoken) to chunk by actual token count,
// since that's what the embedding/LLM context window is measured in.
export function chunkText(text, chunkSize = 250, overlapSize = 40) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));

    if (end === words.length) break;
    start = end - overlapSize; // step back by the overlap before the next chunk
  }

  return chunks;
}
