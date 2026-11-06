import { QUESTION_COUNT } from "./geminiCore.js";

export const GEMINI = {
  label: "Google Gemini",
  keyUrl: "https://aistudio.google.com/apikey",
};

/* Parsing and validation */

function tidy(text) {
  return String(text ?? "")
    .replace(/\s*\u2014\s*/g, ", ")
    .replace(/\u2013/g, "-")
    .trim();
}

function extractJson(text) {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The AI reply was not valid JSON. Please try again.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeQuiz(data) {
  const questions = Array.isArray(data.questions) ? data.questions : [];
  if (questions.length !== QUESTION_COUNT) {
    throw new Error(`Expected ${QUESTION_COUNT} questions but received ${questions.length}. Please try again.`);
  }

  const cleanQuestions = questions.map((q, i) => {
    const choices = Array.isArray(q.choices) ? q.choices.map((c) => tidy(c)) : [];
    let answer = q.answer;
    if (typeof answer === "string") {
      const trimmed = answer.trim();
      answer = /^[A-D]/i.test(trimmed) ? trimmed.toUpperCase().charCodeAt(0) - 65 : parseInt(trimmed, 10);
    }
    if (choices.length !== 4 || !Number.isInteger(answer) || answer < 0 || answer > 3) {
      throw new Error(`Question ${i + 1} was malformed. Please try again.`);
    }
    return {
      question: tidy(q.question),
      choices: choices.map((c) => c.replace(/^[A-D][.)]\s+/i, "")),
      answer,
      explanation: tidy(q.explanation),
    };
  });

  return {
    title: tidy(data.title || `${data.topic || "General"} Quiz`),
    topic: tidy(data.topic),
    questions: cleanQuestions,
  };
}

/* Request to the serverless function */

async function callApi(history, customKey, document) {
  const headers = { "Content-Type": "application/json" };
  if (customKey) headers["x-user-api-key"] = customKey;

  let response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers,
      body: JSON.stringify({ history, document: document || undefined }),
    });
  } catch {
    throw new Error("Could not reach the server. Check the connection and try again.");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* response was not JSON */
  }

  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status}).`);
  if (!data?.text) throw new Error("The server returned an empty response.");
  return data.text;
}

/**
 * history: [{ role: "user" | "assistant", text: string }]
 * customKey: optional key from Settings, otherwise the server default is used
 * document: optional { name, text } extracted from an attached PDF
 * Returns { type: "quiz", quiz } or { type: "chat", reply }
 */
export async function askTwentyQ(history, customKey, document) {
  const parsed = extractJson(await callApi(history, customKey, document));

  if (parsed.type === "quiz") return { type: "quiz", quiz: normalizeQuiz(parsed) };
  return { type: "chat", reply: tidy(parsed.reply) || "Send a topic and a 20-item quiz will be created." };
}
