# TwentyQ: AI Quiz Maker

A chat-style quiz maker built with React, JavaScript and Vite.
Say "Make a quiz on" followed by a topic and TwentyQ generates a 20-item multiple choice quiz,
downloadable as a Word (.docx) file with an answer key. It uses the Google Gemini API
(default model `gemini-3.1-flash-lite`).

## How the API key is handled

The Gemini key lives on the server only. The browser calls `/api/generate`, a serverless function
(`api/generate.js`) that adds the key and forwards the request to Gemini. The key is never bundled
into the client code, so it is safe to publish the site publicly.

## Run locally

```bash
cd twenty-q-quiz-maker
npm install
```

1. Open `.env` and paste a Gemini key after `GEMINI_API_KEY=` (get one at https://aistudio.google.com/apikey).
2. Start the app:

```bash
npm run dev
```

`npm run dev` serves `/api/generate` locally through a small Vite plugin, so no extra tools are needed.