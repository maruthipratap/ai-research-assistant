import { pipeline } from "@xenova/transformers";

// We load the embedding model ONCE and reuse it for every request.
// Model: all-MiniLM-L6-v2 - a small, fast sentence-embedding model
// (384-dimensional vectors). It runs locally via ONNX, no network call,
// no API cost. First call downloads ~90MB of weights from Hugging Face
// and caches them locally; every call after that is fast.
let embedderPromise = null;

function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedderPromise;
}

// Converts one piece of text into a 384-number vector.
// `pooling: "mean"` collapses the per-word vectors into one sentence vector.
// `normalize: true` scales it to unit length, which is what makes cosine
// similarity (used by Atlas Vector Search) meaningful and consistent.
export async function embedText(text) {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// Embeds many chunks. Done sequentially here for simplicity/clarity -
// in v1 you could parallelize this or move it to a background job queue
// (this is exactly the kind of step that becomes an async "Workflow"
// in production architecture, instead of blocking an HTTP request).
export async function embedBatch(texts) {
  const results = [];
  for (const text of texts) {
    results.push(await embedText(text));
  }
  return results;
}
