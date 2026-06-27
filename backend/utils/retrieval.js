import Chunk from "../models/Chunk.js";
import { embedText } from "./embeddings.js";

// The same retrieval step powers both plain "semantic search" and the
// RAG chat endpoint - chat is just retrieval + an LLM call on top.
// Keeping this in one function means we only maintain the vector search
// pipeline in one place.
export async function retrieveRelevantChunks(query, userId, limit = 5) {
  const queryVector = await embedText(query);

  const results = await Chunk.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector,
        numCandidates: 100,
        limit: limit * 4,
      },
    },
    { $match: { user: userId } },
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
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  return results;
}