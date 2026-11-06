import { useState } from "react";
import { downloadQuizDocx, quizFileName } from "../lib/buildDocx.js";
import { downloadQuizHtml } from "../lib/buildHtml.js";
import { icon } from "../lib/icons.js";
import QuizPlayer from "./QuizPlayer.jsx";

const LETTERS = ["A", "B", "C", "D"];

export default function QuizCard({ quiz }) {
  const [preview, setPreview] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDocx = async () => {
    setBusy(true);
    try {
      await downloadQuizDocx(quiz);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="quiz-card">
      <div className="quiz-card-head">
        <img className="file-icon" src={icon("docx", "png")} alt="Quiz" />
        <div>
          <div className="quiz-title">{quiz.title}</div>
          <div className="quiz-meta">
            {quiz.questions.length} multiple choice items · {quizFileName(quiz)}
          </div>
        </div>
      </div>

      <div className="quiz-actions">
        <button className="primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Close quiz" : "Take quiz"}
        </button>
        <button className="ghost with-icon" onClick={handleDocx} disabled={busy}>
          <img src={icon("download", "png")} alt="" />
          {busy ? "Preparing..." : ".docx"}
        </button>
        <button className="ghost with-icon" onClick={() => downloadQuizHtml(quiz)}>
          <img src={icon("download", "png")} alt="" />
          Live quiz .html
        </button>
        <button className="ghost" onClick={() => setPreview((o) => !o)}>
          {preview ? "Hide answers" : "Preview"}
        </button>
      </div>

      {playing && <QuizPlayer quiz={quiz} onClose={() => setPlaying(false)} />}

      {preview && (
        <ol className="quiz-preview">
          {quiz.questions.map((q, i) => (
            <li key={i}>
              <p>{q.question}</p>
              <ul>
                {q.choices.map((c, ci) => (
                  <li key={ci} className={ci === q.answer ? "correct" : ""}>
                    {LETTERS[ci]}. {c}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
