import { buildGeminiBody, DEFAULT_MODEL, describeGeminiError, geminiUrl } from "../src/lib/geminiCore.js";
import { parseRequest } from "../src/lib/parseRequest.js";

const MAX_MESSAGES = 12;
const MAX_TEXT_LENGTH = 2000;

function validateHistory(history) {
  if (!Array.isArray(history) || history.length === 0 || history.length > MAX_MESSAGES) return false;
  const wellFormed = history.every(
    (m) =>
      m &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.text === "string" &&
      m.text.length > 0 &&
      m.text.length <= MAX_TEXT_LENGTH
  );
  if (!wellFormed) return false;

  // The latest message must be a valid "Make a quiz" request
  const last = history[history.length - 1];
  return last.role === "user" && parseRequest(last.text).status === "ok";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  // A custom key sent from Settings overrides the server default
  const headerKey = req.headers["x-user-api-key"];
  const customKey = typeof headerKey === "string" ? headerKey.trim() : "";
  const apiKey = customKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "No Gemini API key is configured on the server. Set GEMINI_API_KEY in the Vercel project settings.",
    });
  }

  const history = req.body?.history;
  if (!validateHistory(history)) {
    return res.status(400).json({ error: 'Invalid request. Say "Make a quiz" followed by a topic.' });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const upstream = await fetch(geminiUrl(model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(buildGeminiBody(history)),
    });

    if (!upstream.ok) {
      let detail = "";
      try {
        detail = (await upstream.json())?.error?.message || "";
      } catch {
        /* response was not JSON */
      }
      return res.status(upstream.status).json({
        error: describeGeminiError(upstream.status, detail, model, Boolean(customKey)),
      });
    }

    const data = await upstream.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!parts) {
      const reason = data?.promptFeedback?.blockReason;
      return res.status(502).json({
        error: reason ? `Gemini blocked the request (${reason}).` : "Gemini returned an empty response.",
      });
    }

    return res.status(200).json({ text: parts.map((p) => p.text || "").join("") });
  } catch {
    return res.status(502).json({ error: "Could not reach the Gemini API. Please try again." });
  }
}
