import { GoogleGenAI } from "@google/genai";

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

// Takes the same { role, content } messages array shape used everywhere
// else in this app (the standard OpenAI-style chat format). Gemini's SDK
// wants a separate `systemInstruction` plus a `contents` array using
// "user"/"model" roles instead of "user"/"assistant" - we translate
// between the two shapes here, so chatRoutes.js doesn't need to know or
// care which LLM provider is actually plugged in underneath.
export async function generateChatResponse(messages) {
  const ai = getClient();

  const systemMessage = messages.find((m) => m.role === "system");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash", // fast, cheap, generous free tier
    contents,
    config: systemMessage
      ? { systemInstruction: systemMessage.content }
      : undefined,
  });

  return response.text;
}