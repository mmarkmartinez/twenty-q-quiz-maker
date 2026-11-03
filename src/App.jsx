import { useEffect, useRef, useState } from "react";
import AboutModal from "./components/AboutModal.jsx";
import LoadingStatus from "./components/LoadingStatus.jsx";
import QuizCard from "./components/QuizCard.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import { askTwentyQ, GEMINI } from "./lib/generateQuiz.js";
import { icon } from "./lib/icons.js";
import { LOCAL_REPLIES, parseRequest } from "./lib/parseRequest.js";

const SETTINGS_STORAGE = "twentyq_settings";
const SUGGESTIONS = ["Photosynthesis", "World War II", "JavaScript basics", "The Solar System"];

const GREETING = {
  id: "greeting",
  role: "assistant",
  greeting: true,
  text: "Hi, I'm TwentyQ. Say \"Make a quiz on\" followed by any topic and a 20-item multiple choice quiz will be created, ready to download as a Word document.",
};

function loadCustomKey() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE) || "null");
    return saved?.customKey || saved?.keys?.gemini || "";
  } catch {
    return "";
  }
}

// Converts chat messages into plain-text history for the API.
function toApiHistory(messages) {
  const history = messages
    .filter((m) => !m.greeting && !m.error && !m.local)
    .map((m) => ({
      role: m.role,
      text: m.quiz ? `Generated quiz "${m.quiz.title}" (${m.quiz.questions.length} questions).` : m.text,
    }));
  return history.slice(-8);
}

export default function App() {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [customKey, setCustomKey] = useState(loadCustomKey);
  const [modal, setModal] = useState(null); // "about" | "settings" | null
  const [splash, setSplash] = useState("show"); // "show" | "fade" | "gone"
  const bottomRef = useRef(null);

  // A custom key from Settings takes priority over the default key in .env
  const apiKey = customKey || GEMINI.envKey;

  // Loading screen
  useEffect(() => {
    const fade = setTimeout(() => setSplash("fade"), 1800);
    const gone = setTimeout(() => setSplash("gone"), 2400);
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const saveSettings = (nextKey) => {
    setCustomKey(nextKey);
    try {
      localStorage.setItem(SETTINGS_STORAGE, JSON.stringify({ customKey: nextKey }));
    } catch {
      /* storage unavailable */
    }
    setModal(null);
  };

  const send = async (text) => {
    const content = text.trim();
    if (!content || loading) return;

    // Only messages containing "Make a quiz" and a topic reach the API
    const check = parseRequest(content);
    if (check.status !== "ok") {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "user", text: content, local: true },
        { id: crypto.randomUUID(), role: "assistant", text: LOCAL_REPLIES[check.status], local: true },
      ]);
      setInput("");
      return;
    }
    if (!apiKey) return;

    const userMsg = { id: crypto.randomUUID(), role: "user", text: content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const result = await askTwentyQ(toApiHistory(next), apiKey);
      const botMsg =
        result.type === "quiz"
          ? {
              id: crypto.randomUUID(),
              role: "assistant",
              text: `Here is the quiz on ${result.quiz.topic || result.quiz.title}.`,
              quiz: result.quiz,
            }
          : { id: crypto.randomUUID(), role: "assistant", text: result.reply };
      setMessages((m) => [...m, botMsg]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", error: true, text: err.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
    {splash !== "gone" && (
      <div className={`splash ${splash === "fade" ? "fade" : ""}`} role="status" aria-label="Loading TwentyQ">
        <img className="splash-logo" src={icon("2Q_logo")} alt="TwentyQ" />
        <h2>TwentyQ</h2>
        <p>AI Quiz Maker</p>
        <div className="splash-bar">
          <span />
        </div>
      </div>
    )}
    <div className="app">
      <header className="header">
        <div className="brand">
          <img className="logo" src={icon("2Q_logo")} alt="TwentyQ logo" />
          <div>
            <h1>TwentyQ</h1>
            <p>AI Quiz Maker</p>
          </div>
        </div>
        <div className="header-actions">
          {/* <span className="provider-badge">{GEMINI.label}</span> */}
          <button className="icon-btn" onClick={() => setModal("settings")} aria-label="Settings" title="Settings">
            <img src={icon("settings", "png")} alt="" />
          </button>
          <button className="icon-btn" onClick={() => setModal("about")} aria-label="About" title="About">
            <img src={icon("about", "png")} alt="" />
          </button>
        </div>
      </header>

      {!apiKey && (
        <div className="keybar">
          <span>No API key is set. Add one to the .env file or in Settings.</span>
          <button className="primary" onClick={() => setModal("settings")}>
            Open Settings
          </button>
        </div>
      )}

      <main className="chat">
        {messages.map((m) => (
          <div key={m.id} className={`row ${m.role}`}>
            <img className="avatar" src={icon(m.role === "user" ? "user" : "bot")} alt="" />
            <div className={`bubble ${m.error ? "error" : ""}`}>
              {m.error && <img className="inline-icon" src={icon("warning", "png")} alt="" />}
              <p>{m.text}</p>
              {m.quiz && <QuizCard quiz={m.quiz} />}
            </div>
          </div>
        ))}

        {messages.length === 1 && (
          <div className="chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" disabled={!apiKey} onClick={() => send(`Make a quiz on ${s}`)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="row assistant">
            <img className="avatar" src={icon("bot")} alt="" />
            <div className="bubble typing">
              <LoadingStatus />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <form className="composer" onSubmit={onSubmit}>
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={apiKey ? 'e.g. Make a quiz on JavaScript basics' : "Add an API key to begin"}
          disabled={!apiKey || loading}
        />
        <button type="submit" disabled={!apiKey || loading || !input.trim()}>
          Send
        </button>
      </form>

      {modal === "about" && <AboutModal onClose={() => setModal(null)} />}
      {modal === "settings" && (
        <SettingsModal customKey={customKey} onSave={saveSettings} onClose={() => setModal(null)} />
      )}
    </div>
    </>
  );
}
