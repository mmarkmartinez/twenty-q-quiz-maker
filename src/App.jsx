import { useEffect, useRef, useState } from "react";
import AboutModal from "./components/AboutModal.jsx";
import LoadingStatus from "./components/LoadingStatus.jsx";
import QuizCard from "./components/QuizCard.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import { extractPdfText, MAX_PDF_BYTES } from "./lib/extractPdf.js";
import { askTwentyQ, GEMINI } from "./lib/generateQuiz.js";
import { icon } from "./lib/icons.js";
import { LOCAL_REPLIES, parseRequest } from "./lib/parseRequest.js";

const SETTINGS_STORAGE = "twentyq_settings";
const SUGGESTIONS = ["Photosynthesis", "World War II", "JavaScript basics", "The Solar System"];

const GREETING = {
  id: "greeting",
  role: "assistant",
  greeting: true,
  text: "Hi, I'm TwentyQ. Say \"Make a quiz on\" followed by any topic, or attach a PDF (up to 10 MB) and say \"Make a quiz\". The quiz can be answered right here, or downloaded as a Word file or a live .html quiz.",
};

function loadCustomKey() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE) || "null");
    return saved?.customKey || saved?.keys?.gemini || "";
  } catch {
    return "";
  }
}

function formatSize(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
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
  const [attachment, setAttachment] = useState(null); // { name, size, pages, text, truncated }
  const [reading, setReading] = useState(false);
  const [attachError, setAttachError] = useState("");
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  // Loading screen: visible briefly, then fades out
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

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAttachError("");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setAttachError("Only PDF files can be attached.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setAttachError(`That file is ${formatSize(file.size)}. The limit is 10 MB.`);
      return;
    }

    setReading(true);
    try {
      const { text, pages, truncated } = await extractPdfText(file);
      setAttachment({ name: file.name, size: file.size, pages, text, truncated });
    } catch (err) {
      setAttachment(null);
      setAttachError(err.message);
    } finally {
      setReading(false);
    }
  };

  const send = async (text) => {
    const content = text.trim();
    if (!content || loading || reading) return;

    // Only messages containing "Make a quiz" reach the API (a topic is optional with a PDF)
    const check = parseRequest(content, { hasDocument: Boolean(attachment) });
    if (check.status !== "ok") {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "user", text: content, local: true },
        { id: crypto.randomUUID(), role: "assistant", text: LOCAL_REPLIES[check.status], local: true },
      ]);
      setInput("");
      return;
    }

    const doc = attachment ? { name: attachment.name, text: attachment.text } : null;
    const userMsg = {
      id: crypto.randomUUID(),
      role: "user",
      text: content,
      attachment: attachment ? { name: attachment.name } : undefined,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setAttachment(null);
    setAttachError("");
    setLoading(true);

    try {
      const result = await askTwentyQ(toApiHistory(next), customKey, doc);
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

        <main className="chat">
          {messages.map((m) => (
            <div key={m.id} className={`row ${m.role}`}>
              <img className="avatar" src={icon(m.role === "user" ? "user" : "bot")} alt="" />
              <div className={`bubble ${m.error ? "error" : ""} ${m.quiz ? "wide" : ""}`}>
                {m.error && <img className="inline-icon" src={icon("warning", "png")} alt="" />}
                {m.attachment && (
                  <div className="msg-attach">
                    <img src={icon("pdf")} alt="" />
                    <span>{m.attachment.name}</span>
                  </div>
                )}
                <p>{m.text}</p>
                {m.quiz && <QuizCard quiz={m.quiz} />}
              </div>
            </div>
          ))}

          {messages.length === 1 && (
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => send(`Make a quiz on ${s}`)}>
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
          {(attachment || reading || attachError) && (
            <div className="attach-row">
              {reading && <span className="attach-status">Reading PDF...</span>}
              {attachment && (
                <div className="attach-chip">
                  <img src={icon("pdf")} alt="" />
                  <span className="attach-name">{attachment.name}</span>
                  <small>
                    {attachment.pages} {attachment.pages === 1 ? "page" : "pages"} · {formatSize(attachment.size)}
                    {attachment.truncated ? " · long text trimmed" : ""}
                  </small>
                  <button type="button" onClick={() => setAttachment(null)} aria-label="Remove PDF">
                    &times;
                  </button>
                </div>
              )}
              {attachError && (
                <div className="attach-error">
                  <img src={icon("warning", "png")} alt="" />
                  <span>{attachError}</span>
                </div>
              )}
            </div>
          )}

          <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={handleFile} />
          <button
            type="button"
            className="attach-btn"
            onClick={() => fileRef.current?.click()}
            disabled={loading || reading}
            aria-label="Attach a PDF (max 10 MB)"
            title="Attach a PDF (max 10 MB)"
          >
            <img src="icons/attach.png" alt="Attach PDF" />
          </button>
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={'e.g. Make a quiz on HTML'}
            disabled={loading}
          />
          <button type="submit" disabled={loading || reading || !input.trim()}>
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
