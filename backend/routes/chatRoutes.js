import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { retrieveRelevantChunks } from "../utils/retrieval.js";
import { generateChatResponse } from "../utils/llm.js";

const router = express.Router();

// POST /api/chat
// Body: { message: "explain chapter 5" }
//
// This is the full RAG loop:
//   question -> embed -> vector search -> top chunks -> prompt -> LLM -> answer
//
// The "augmented" in Retrieval-Augmented Generation just means: we don't
// let the LLM answer from its own training data alone - we force it to
// answer using ONLY the chunks we retrieved, and tell it to say "I don't
// know" if the answer isn't in there. That's what makes RAG more
// trustworthy than a raw chatbot for document Q&A.
router.post("/", protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }

    const chunks = await retrieveRelevantChunks(message, req.user._id, 5);

    if (chunks.length === 0) {
      return res.json({
        answer:
          "I don't have any relevant documents to answer that yet. Try uploading something first.",
        sources: [],
      });
    }

    // Build the context block the LLM will be grounded in. Numbering each
    // chunk lets the model (and the UI) reference sources as [1], [2], etc.
    const context = chunks
      .map(
        (c, i) =>
          `[${i + 1}] (Source: ${c.sourceDocument}, chunk #${c.chunkIndex})\n${c.text}`
      )
      .join("\n\n");

    const systemPrompt = `You are a research assistant. Answer the user's question using ONLY the context below - do not use outside knowledge. If the answer isn't in the context, say you don't know rather than guessing. When you use information from a source, cite it like [1] or [2].

Context:
${context}`;

    const answer = await generateChatResponse([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);

    res.json({
      answer,
      sources: chunks.map((c, i) => ({
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