const QUESTION_COUNT = 20;

export const GEMINI = {
  label: "Google Gemini",
  model: import.meta.env.VITE_GEMINI_MODEL || "gemini-3.5-flash-lite",
  envKey: import.meta.env.VITE_GEMINI_API_KEY || "",
  keyUrl: "https://aistudio.google.com/apikey",
};

const SYSTEM_PROMPT = `You are TwentyQ, a friendly quiz-maker chatbot.

When the user asks for a quiz or names a topic, create a ${QUESTION_COUNT}-item multiple choice quiz.
Respond with ONLY valid JSON (no markdown fences, no commentary) in exactly one of these shapes:

1) A quiz:
{
  "type": "quiz",
  "title": "Short quiz title",
  "topic": "The topic",
  "questions": [
    { "question": "...", "choices": ["...", "...", "...", "..."], "answer": 0, "explanation": "One short sentence." }
  ]
}

2) If the message is NOT a quiz request or a topic (greetings, small talk, questions about the bot):
{ "type": "chat", "reply": "A short friendly reply that invites the user to give a topic." }

Quiz rules:
- Exactly ${QUESTION_COUNT} questions, each with exactly 4 choices.
- "answer" is the zero-based index (0-3) of the single correct choice.
- Do NOT include letters like "A." in the choice text.
- Spread the correct answers fairly evenly across positions.
- Factually accurate, unambiguous questions with plausible distractors.
- Never use em dashes or en dashes in any text.
- Follow any extra instructions from the user (difficulty, grade level, language, focus).`;

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

/* Gemini request */

async function readError(response) {
  try {
    const body = await response.json();
    return body?.error?.message || "";
  } catch {
    return "";
  }
}

async function callGemini(history, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI.model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: history.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text }],
        })),
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 16384,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const detail = await readError(response);
    if (response.status === 400 && /api key/i.test(detail)) {
      throw new Error("The Gemini API key is not valid. Check the .env file or the custom key in Settings.");
    }
    if (response.status === 403) {
      throw new Error("The Gemini API key was rejected. Check the .env file or the custom key in Settings.");
    }
    if (response.status === 404) {
      throw new Error(`The model "${GEMINI.model}" was not found. Set VITE_GEMINI_MODEL in the .env file.`);
    }
    if (response.status === 429) throw new Error("Gemini rate limit reached. Wait a moment and try again.");
    throw new Error(detail || `Gemini request failed (${response.status}).`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!parts) {
    const reason = data?.promptFeedback?.blockReason;
    throw new Error(reason ? `Gemini blocked the request (${reason}).` : "Gemini returned an empty response.");
  }
  return parts.map((p) => p.text || "").join("");
}

/**
 * history: [{ role: "user" | "assistant", text: string }]
 * Returns { type: "quiz", quiz } or { type: "chat", reply }
 */
export async function askTwentyQ(history, apiKey) {
  const parsed = extractJson(await callGemini(history, apiKey));

  if (parsed.type === "quiz") return { type: "quiz", quiz: normalizeQuiz(parsed) };
  return { type: "chat", reply: tidy(parsed.reply) || "Send a topic and a 20-item quiz will be created." };
}
