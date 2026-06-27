import mongoose from "mongoose";

// One row per chunk, not nested inside Document. This is the standard
// pattern for RAG systems: a flat "vector store" collection where each
// entry has exactly one embedding, which is what Atlas Vector Search
// (and most vector DBs) expect to index.
const chunkSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true }, // 384 floats from all-MiniLM-L6-v2
    chunkIndex: { type: Number, required: true },
  },
  { timestamps: true }
);

const Chunk = mongoose.model("Chunk", chunkSchema);
export default Chunk;
