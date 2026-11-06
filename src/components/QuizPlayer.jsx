import { useState } from "react";
import { gradeLabel, percentOf } from "../lib/scoring.js";

const LETTERS = ["A", "B", "C", "D"];

export default function QuizPlayer({ quiz, onClose }) {
  const total = quiz.questions.length;
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [done, setDone] = useState(false);

  const score = answers.reduce((n, a, i) => n + (a === quiz.questions[i].answer ? 1 : 0), 0);

  const choose = (i) => {
    if (picked !== null) return;
    setPicked(i);
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = i;
      return next;
    });
  };

  const next = () => {
    if (index === total - 1) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
    }
  };

  const retake = () => {
    setIndex(0);
    setPicked(null);
    setAnswers([]);
    setDone(false);
  };

  if (done) {
    const percent = percentOf(score, total);
    const missed = quiz.questions
      .map((q, i) => ({ q, i, given: answers[i] }))
      .filter(({ q, given }) => given !== q.answer);

    return (
      <div className="player result">
        <div className="big-score">
          {score} / {total}
        </div>
        <div className="pct">{percent}%</div>
        <h3>{gradeLabel(percent)}</h3>

        {missed.length > 0 && (
          <div className="missed">
            <h4>Review ({missed.length} missed)</h4>
            <ol>
              {missed.map(({ q, i, given }) => (
                <li key={i} value={i + 1}>
                  <div>{q.question}</div>
                  <small>
                    Your answer: {LETTERS[given]}. {q.choices[given]}
                  </small>
                  <small>
                    Correct answer: {LETTERS[q.answer]}. {q.choices[q.answer]}
                  </small>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="quiz-actions center">
          <button className="primary" onClick={retake}>
            Retake quiz
          </button>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const q = quiz.questions[index];
  const answered = picked !== null;
  const correct = answered && picked === q.answer;

  return (
    <div className="player">
      <div className="player-meta">
        <span>
          Question {index + 1} of {total}
        </span>
        <span className="score-live">Score: {score}</span>
      </div>
      <div className="progress">
        <span style={{ width: `${((index + (answered ? 1 : 0)) / total) * 100}%` }} />
      </div>

      <h3 className="player-q">{q.question}</h3>

      <div className="choices">
        {q.choices.map((c, i) => {
          let state = "";
          if (answered) state = i === q.answer ? "correct" : i === picked ? "wrong" : "dim";
          return (
            <button key={i} className={`choice ${state}`} disabled={answered} onClick={() => choose(i)}>
              <b>{LETTERS[i]}.</b>
              <span>{c}</span>
            </button>
          );
        })}
      </div>

      {answered && (
        <>
          <div className={`feedback ${correct ? "ok" : "bad"}`}>
            <strong>{correct ? "Correct!" : `Not quite. The answer is ${LETTERS[q.answer]}.`}</strong>
            {q.explanation && <p>{q.explanation}</p>}
          </div>
          <div className="quiz-actions">
            <button className="primary" onClick={next}>
              {index === total - 1 ? "See results" : "Next question"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
