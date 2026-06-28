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

const SYSTEM_INSTRUCTION = `You are a helpful research assistant with access to three tools:
- search_my_documents: search the user's own uploaded documents
- web_search: look up current information from the public web
- calculate: evaluate math expressions

Decide which tool(s), if any, you need to answer the question - you don't need a tool for greetings or things you already know confidently. When you use search_my_documents, cite sources like [1], [2] matching the order the results came back in. When you use web_search, mention the source. Be concise and don't make up information you don't have.`;

const MAX_STEPS = 5; // safety cap so a confused agent can't loop forever

// This is the actual "agent loop":
//   1. Send the conversation + tool definitions to the model
//   2. If the model requests a tool call, RUN it ourselves and feed the
//      result back in
//   3. Repeat until the model responds with plain text instead of a tool call
//
// This loop - "let the model decide, execute on its behalf, feed results
// back, repeat" - is the actual definition of an "agent." Frameworks like
// LangChain wrap this same loop in a class; here you can see exactly what's
// happening underneath.
export async function runAgent(userMessage, userId) {
  const ai = getClient();

  let contents = [{ role: "user", parts: [{ text: userMessage }] }];
  const toolsUsed = [];
  let sourceChunks = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });

    const calls = response.functionCalls;

    // No tool call requested - the model is done reasoning, return its answer
    if (!calls || calls.length === 0) {
      return { answer: response.text, toolsUsed, sources: sourceChunks };
    }

    // Push the model's turn (which contains the function call request)
    // into the conversation history before we respond to it.
    contents.push(response.candidates[0].content);

    // Execute every requested tool call and build the response parts
    // we'll send back to the model.
    const responseParts = [];
    for (const call of calls) {
      const { result, chunks } = await executeTool(call.name, call.args, userId);
      toolsUsed.push({ name: call.name, args: call.args });
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
    // Loop continues: the model now sees the tool result and decides
    // whether it needs another tool call or can answer directly.
  }

  return {
    answer:
      "I wasn't able to finish reasoning about that within the step limit - try rephrasing your question.",
    toolsUsed,
    sources: sourceChunks,
  };
}