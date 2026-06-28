import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { runAgent } from "../utils/agent.js";

const router = express.Router();

// POST /api/chat
// Body: { message: "explain chapter 5", history: [{role, content}, ...] }
//
// `history` is the recent back-and-forth of the conversation, sent by the
// frontend on every request. Without it, every message would be treated
// as a brand new conversation with no memory of what was just discussed -
// which breaks follow-up questions like "what about the second one?"
router.post("/", protect, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }

    const { answer, toolsUsed, sources, modelUsed } = await runAgent(
      message,
      req.user._id,
      history
    );

    res.json({
      answer,
      toolsUsed,
      modelUsed,
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