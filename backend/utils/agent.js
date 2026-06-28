import { GoogleGenAI } from "@google/genai";
import { executeTool, toolDeclarations } from "./tools.js";

let client = null;

function getClient() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is not set - add it to backend/.env (get one free at aistudio.google.com/apikey)"
      );
    }
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

// Tried in this order. gemini-3.1-flash-lite first because its free-tier
// quota is far more generous (500 requests/day vs 20/day for 2.5 Flash, as
// of when this was written - check your own Google AI Studio "Rate Limit"
// page, since free-tier quotas change). If a model gets rate-limited, we
// fall back to the next one instead of failing the whole request.
const MODEL_CHAIN = ["gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"];

function isRateLimitError(err) {
  const msg = err?.message?.toLowerCase() || "";
  return (
    err?.status === 429 ||
    err?.code === 429 ||
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota")
  );
}

// This is the actual "fallback chain" pattern: try the preferred model,
// and only if it's SPECIFICALLY rate-limited (not some other kind of
// error - those should fail loudly, not get silently swallowed), move to
// the next model in the list. This is the same idea production systems
// like LiteLLM/OpenRouter implement for resilience against any single
// provider/model having an outage or quota issue.
async function generateWithFallback(ai, params) {
  let lastError;

  for (const model of MODEL_CHAIN) {
    try {
      const response = await ai.models.generateContent({ ...params, model });
      return { response, modelUsed: model };
    } catch (err) {
      lastError = err;
      if (isRateLimitError(err)) {
        console.warn(`${model} hit a rate limit - falling back to next model`);
        continue;
      }
      throw err; // a real error, not a quota issue - don't mask it
    }
  }

  throw lastError; // every model in the chain was rate-limited
}

// Built fresh on every call (not a static constant) so the date is always
// today's actual date, not whatever it was when the server started.
function buildSystemInstruction() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are a helpful research assistant with access to three tools:
- search_my_documents: search the user's own uploaded documents
- web_search: look up current information from the public web
- calculate: evaluate math expressions

Today's date is ${today}. Treat this as ground truth - your own training data has a knowledge cutoff and is NOT reliable for "what is today's date" or anything time-dependent. For current events, prices, or anything that changes over time, use web_search instead of guessing from memory.

CRITICAL - grounding rule: when you use a tool, you may only state specific facts (scores, dates, numbers, names, outcomes) that are EXPLICITLY present in that tool's returned text. Never infer, extrapolate, or fill in a plausible-sounding detail that the tool result didn't actually contain - this includes things like assuming a match/event has concluded just because of the date, unless the tool result explicitly says so. If the tool result is incomplete, ambiguous, or doesn't clearly answer the question, say exactly that ("I found information about X, but the result doesn't confirm Y") rather than guessing. Being honestly uncertain is always better than being confidently wrong.

Decide which tool(s), if any, you need to answer the question - you don't need a tool for greetings or things you already know confidently. When you use search_my_documents, cite sources like [1], [2] matching the order the results came back in. When you use web_search, mention the source. Be concise.`;
}

const MAX_STEPS = 5; // safety cap so a confused agent can't loop forever

// This is the actual "agent loop":
//   1. Send the conversation (including prior history) + tool definitions
//      to the model
//   2. If the model requests a tool call, RUN it ourselves and feed the
//      result back in
//   3. Repeat until the model responds with plain text instead of a tool call
export async function runAgent(userMessage, userId, history = []) {
  const ai = getClient();

  // Convert the frontend's {role: "user"|"assistant", content} shape into
  // Gemini's {role: "user"|"model", parts: [{text}]} shape, then add the
  // new message on the end. This is what gives the agent "memory" of the
  // conversation so far - without this, every message would start from
  // zero context, which breaks follow-up questions.
  const historyContents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let contents = [...historyContents, { role: "user", parts: [{ text: userMessage }] }];
  const toolsUsed = [];
  let sourceChunks = [];
  let lastModelUsed = null;

  for (let step = 0; step < MAX_STEPS; step++) {
    const { response, modelUsed } = await generateWithFallback(ai, {
      contents,
      config: {
        systemInstruction: buildSystemInstruction(),
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });
    lastModelUsed = modelUsed;

    const calls = response.functionCalls;

    // No tool call requested - the model is done reasoning, return its answer
    if (!calls || calls.length === 0) {
      return { answer: response.text, toolsUsed, sources: sourceChunks, modelUsed };
    }

    contents.push(response.candidates[0].content);

    const responseParts = [];
    for (const call of calls) {
      const { result, chunks } = await executeTool(call.name, call.args, userId);
      toolsUsed.push({ name: call.name, args: call.args, result });
      if (chunks) sourceChunks = sourceChunks.concat(chunks);

      responseParts.push({
        functionResponse: {
          name: call.name,
          response: { result },
          id: call.id,
        },
      });
    }

    contents.push({ role: "user", parts: responseParts });
  }

  return {
    answer:
      "I wasn't able to finish reasoning about that within the step limit - try rephrasing your question.",
    toolsUsed,
    sources: sourceChunks,
    modelUsed: lastModelUsed,
  };
}