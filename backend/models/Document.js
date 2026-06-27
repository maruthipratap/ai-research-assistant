import mongoose from "mongoose";

// Note: chunks + embeddings now live in their own `Chunk` collection
// (see models/Chunk.js) - one document per chunk, each with its own
// embedding. This matches the standard pattern most vector databases
// (including MongoDB Atlas Vector Search) expect.
const documentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    originalName: { type: String, required: true },
    storedPath: { type: String, required: true },
    mimeType: { type: String, required: true },
    extractedText: { type: String, default: "" },
    status: {
      type: String,
      enum: ["uploaded", "processing", "ready", "failed"],
      default: "uploaded",
    },
    processingError: { type: String, default: "" },
    chunkCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Document = mongoose.model("Document", documentSchema);
export default Document;
