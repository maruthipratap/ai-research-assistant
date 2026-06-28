import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { runAgent } from "../utils/agent.js";

const router = express.Router();

// POST /api/chat
// Body: { message: "explain chapter 5" }
//
// This now runs the full agent loop instead of a fixed "always retrieve
// then answer" pipeline. The model itself decides whether to search the
// user's documents, search the web, do a calculation, some combination,
// or just answer directly - that decision-making is what makes this an
// "agent" rather than a plain RAG chatbot.
router.post("/", protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }

    const { answer, toolsUsed, sources } = await runAgent(message, req.user._id);

    res.json({
      answer,
      toolsUsed, // e.g. [{ name: "calculate", args: { expression: "12*4" } }]
      sources: sources.map((c, i) => ({
        id: i + 1,
        sourceDocument: c.sourceDocument,
        chunkIndex: c.chunkIndex,
        score: c.score,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;