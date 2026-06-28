import { retrieveRelevantChunks } from "./retrieval.js";
import { create, all } from "mathjs";
import { tavily } from "@tavily/core";

const math = create(all);

let tavilyClient = null;
function getTavilyClient() {
  if (!tavilyClient) {
    if (!process.env.TAVILY_API_KEY) {
      throw new Error(
        "TAVILY_API_KEY is not set - add it to backend/.env (free, no card required, at tavily.com)"
      );
    }
    tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });
  }
  return tavilyClient;
}

// Tool declarations - this is the schema Gemini reads to decide WHEN and
// HOW to call each tool. Good name + description = good tool selection.
// This shape (name, description, parameters as JSON Schema) is the same
// pattern used by OpenAI, Anthropic, and basically every LLM tool-calling
// API - learn this shape once, it transfers everywhere.
export const toolDeclarations = [
  {
    name: "search_my_documents",
    description:
      "Search the user's own uploaded documents for relevant passages. Use this whenever the question could be about something the user has personally uploaded (notes, resumes, papers, study material, etc).",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to find relevant passages",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the public web for current information, facts, prices, or anything time-sensitive that is unlikely to be in the user's uploaded documents.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "calculate",
    description:
      "Evaluate a mathematical expression and return the numeric result. Use for arithmetic, percentages, unit conversions, etc.",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "A math expression, e.g. '12 * (3 + 4) / 2'",
        },
      },
      required: ["expression"],
    },
  },
];

// Actually RUNS a tool by name. This is the part the LLM can't do itself -
// the model only decides WHAT to call and WITH WHAT arguments; your own
// server code is what actually executes it. That separation is the core
// safety property of tool calling: the model never directly touches your
// database or the network, it just requests an action.
export async function executeTool(name, args, userId) {
  switch (name) {
    case "search_my_documents": {
      const chunks = await retrieveRelevantChunks(args.query, userId, 4);
      if (chunks.length === 0) {
        return { result: "No relevant documents found.", chunks: [] };
      }
      const text = chunks
        .map((c, i) => `[${i + 1}] (${c.sourceDocument}): ${c.text}`)
        .join("\n\n");
      return { result: text, chunks };
    }

    case "web_search": {
      // Tavily is a search API built specifically for LLM agents - it
      // returns clean, structured results (and an optional synthesized
      // answer) instead of raw HTML, which is exactly what an agent needs
      // to reason over. Free tier: 1,000 searches/month, no card required.
      try {
        const tvly = getTavilyClient();
        const response = await tvly.search(args.query, {
          maxResults: 3,
          includeAnswer: true,
        });

        if (response.answer) {
          const sources = response.results?.map((r) => r.url).join(", ") || "";
          return { result: `${response.answer}\n\nSources: ${sources}` };
        }

        if (response.results?.length > 0) {
          const text = response.results
            .map((r, i) => `[${i + 1}] ${r.title}: ${r.content} (${r.url})`)
            .join("\n\n");
          return { result: text };
        }

        return { result: "No web results found for that query." };
      } catch (err) {
        return { result: "Web search failed: " + err.message };
      }
    }

    case "calculate": {
      try {
        const value = math.evaluate(args.expression);
        return { result: String(value) };
      } catch (err) {
        return { result: "Could not evaluate that expression: " + err.message };
      }
    }

    default:
      return { result: `Unknown tool: ${name}` };
  }
}