import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { retrieveRelevantChunks } from "../utils/retrieval.js";

const router = express.Router();

// POST /api/search/semantic
// Body: { query: "some question", limit: 5 }
//
// This is the core "semantic search" step of RAG:
// 1. Embed the user's query into the SAME vector space as the chunks
// 2. Ask Atlas Vector Search for the chunks whose vectors are closest
//    (by cosine similarity) to the query vector
// 3. Filter to only this user's documents, return the results
router.post("/semantic", protect, async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    if (!query) {
      return res.status(400).json({ message: "query is required" });
    }

    const results = await retrieveRelevantChunks(query, req.user._id, limit);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;