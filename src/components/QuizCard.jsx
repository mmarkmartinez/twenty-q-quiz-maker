import { useState } from "react";
import { downloadQuizDocx, quizFileName } from "../lib/buildDocx.js";
import { icon } from "../lib/icons.js";

const LETTERS = ["A", "B", "C", "D"];

export default function QuizCard({ quiz }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
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
        <img className="file-icon" src={icon("docx", "png")} alt="Word document" />
        <div>
          <div className="quiz-title">{quiz.title}</div>
          <div className="quiz-meta">
            {quiz.questions.length} multiple choice items · {quizFileName(quiz)}
          </div>
        </div>
      </div>

      <div className="quiz-actions">
        <button className="primary with-icon" onClick={handleDownload} disabled={busy}>
          <img src={icon("download", "png")} alt="" />
          {busy ? "Preparing..." : "Download .docx"}
        </button>
        <button className="ghost" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide preview" : "Preview questions"}
        </button>
      </div>

      {open && (
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
