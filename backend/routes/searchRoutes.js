import express from "express";
import Chunk from "../models/Chunk.js";
import { protect } from "../middleware/authMiddleware.js";
import { embedText } from "../utils/embeddings.js";

const router = express.Router();

// POST /api/search/semantic
// Body: { query: "some question", limit: 5 }
//
// This is the core "semantic search" step of RAG:
// 1. Embed the user's query into the SAME vector space as the chunks
// 2. Ask Atlas Vector Search for the chunks whose vectors are closest
//    (by cosine similarity) to the query vector
// 3. Filter to only this user's documents, return the results
//
// Requires a Vector Search Index named "vector_index" on the "chunks"
// collection (see README for the exact JSON to paste into Atlas).
router.post("/semantic", protect, async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    if (!query) {
      return res.status(400).json({ message: "query is required" });
    }

    const queryVector = await embedText(query);

    const results = await Chunk.aggregate([
      {
        // $vectorSearch MUST be the first stage in the pipeline.
        // numCandidates: how many approximate nearest neighbors to consider
        // before ranking - higher = more accurate but slower.
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector,
          numCandidates: 100,
          limit: limit * 4, // overfetch a bit, since we filter by user next
        },
      },
      // $vectorSearch doesn't know about "users" - it just finds nearest
      // vectors across the whole collection. We filter to this user's own
      // chunks afterward. (At larger scale you'd instead add `user` as a
      // pre-filter field directly in the index definition - faster, but
      // more setup. Post-filtering like this is the simpler starting point.)
      { $match: { user: req.user._id } },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: "documents",
          localField: "document",
          foreignField: "_id",
          as: "sourceDoc",
        },
      },
      { $unwind: "$sourceDoc" },
      {
        $project: {
          _id: 0,
          text: 1,
          chunkIndex: 1,
          sourceDocument: "$sourceDoc.originalName",
          // vectorSearchScore is a similarity score (closer to 1 = more relevant)
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
