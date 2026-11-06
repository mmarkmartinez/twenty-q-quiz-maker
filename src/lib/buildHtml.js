// Builds an offline "live quiz" page from a quiz object.

const STYLE = `
:root{--bg:#f4f5fb;--panel:#fff;--text:#1f2937;--muted:#6b7280;--border:#e5e7eb;--brand:#4f46e5;--ok:#047857;--okbg:#ecfdf5;--bad:#b91c1c;--badbg:#fef2f2}
@media (prefers-color-scheme:dark){:root{--bg:#0f1020;--panel:#181a2e;--text:#e5e7eb;--muted:#9ca3af;--border:#2b2e4a;--ok:#34d399;--okbg:#0f2a22;--bad:#fca5a5;--badbg:#3b1820}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.5}
.wrap{max-width:720px;margin:0 auto;padding:24px 16px 48px}
header h1{margin:0 0 4px;font-size:1.6rem}
header p{margin:0 0 20px;color:var(--muted)}
#app{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:20px}
.meta{display:flex;justify-content:space-between;font-size:.9rem;color:var(--muted);margin-bottom:8px}
.score{font-weight:700;color:var(--brand)}
.bar{height:6px;background:var(--border);border-radius:99px;overflow:hidden;margin-bottom:18px}
.bar span{display:block;height:100%;background:var(--brand);transition:width .3s}
.q{font-size:1.15rem;margin:0 0 14px}
.choices{display:grid;gap:10px}
.choice{display:flex;gap:10px;text-align:left;padding:12px 14px;border:1px solid var(--border);border-radius:12px;background:transparent;color:inherit;font:inherit;cursor:pointer}
.choice:hover:not(:disabled){border-color:var(--brand)}
.choice:disabled{cursor:default}
.choice.correct{border-color:var(--ok);background:var(--okbg)}
.choice.wrong{border-color:var(--bad);background:var(--badbg)}
.choice.dim{opacity:.55}
.feedback{margin-top:14px;padding:12px 14px;border-radius:12px}
.feedback p{margin:4px 0 0}
.feedback.ok{background:var(--okbg);color:var(--ok)}
.feedback.bad{background:var(--badbg);color:var(--bad)}
.primary{margin-top:16px;padding:10px 18px;border:0;border-radius:10px;background:var(--brand);color:#fff;font:inherit;font-weight:600;cursor:pointer}
.result{text-align:center}
.big{font-size:3rem;font-weight:800;color:var(--brand)}
.pct{color:var(--muted)}
.missed{text-align:left;margin-top:18px}
.missed h3{margin:0 0 8px}
.missed li{margin-bottom:10px}
.missed small{display:block;color:var(--muted)}
footer{text-align:center;margin-top:18px;font-size:.8rem;color:var(--muted)}
`;

const SCRIPT = `
(function () {
  var L = ["A", "B", "C", "D"];
  var app = document.getElementById("app");
  var state;

  function reset() { state = { i: 0, picked: null, score: 0, answers: [], done: false }; }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function label(p) {
    if (p >= 90) return "Excellent work!";
    if (p >= 75) return "Great job!";
    if (p >= 60) return "Good effort.";
    return "Keep practicing.";
  }

  function render() {
    app.innerHTML = "";
    if (state.done) renderResult(); else renderQuestion();
  }

  function renderQuestion() {
    var q = QUIZ.questions[state.i];
    var total = QUIZ.questions.length;

    var meta = el("div", "meta");
    meta.appendChild(el("span", "", "Question " + (state.i + 1) + " of " + total));
    meta.appendChild(el("span", "score", "Score: " + state.score));
    app.appendChild(meta);

    var bar = el("div", "bar");
    var fill = el("span");
    fill.style.width = ((state.i + (state.picked === null ? 0 : 1)) / total * 100) + "%";
    bar.appendChild(fill);
    app.appendChild(bar);

    app.appendChild(el("h2", "q", q.question));

    var list = el("div", "choices");
    q.choices.forEach(function (c, idx) {
      var b = el("button", "choice");
      b.type = "button";
      b.appendChild(el("b", "", L[idx] + "."));
      b.appendChild(el("span", "", c));
      if (state.picked !== null) {
        b.disabled = true;
        if (idx === q.answer) b.classList.add("correct");
        else if (idx === state.picked) b.classList.add("wrong");
        else b.classList.add("dim");
      } else {
        b.addEventListener("click", function () { choose(idx); });
      }
      list.appendChild(b);
    });
    app.appendChild(list);

    if (state.picked !== null) {
      var ok = state.picked === q.answer;
      var fb = el("div", "feedback " + (ok ? "ok" : "bad"));
      fb.appendChild(el("strong", "", ok ? "Correct!" : "Not quite. The answer is " + L[q.answer] + "."));
      if (q.explanation) fb.appendChild(el("p", "", q.explanation));
      app.appendChild(fb);

      var next = el("button", "primary", state.i === total - 1 ? "See results" : "Next question");
      next.type = "button";
      next.addEventListener("click", advance);
      app.appendChild(next);
    }
  }

  function choose(idx) {
    var q = QUIZ.questions[state.i];
    state.picked = idx;
    state.answers[state.i] = idx;
    if (idx === q.answer) state.score++;
    render();
  }

  function advance() {
    if (state.i === QUIZ.questions.length - 1) {
      state.done = true;
    } else {
      state.i++;
      state.picked = null;
    }
    render();
  }

  function renderResult() {
    var total = QUIZ.questions.length;
    var pct = Math.round(state.score / total * 100);
    var box = el("div", "result");
    box.appendChild(el("div", "big", state.score + " / " + total));
    box.appendChild(el("div", "pct", pct + "%"));
    box.appendChild(el("h2", "", label(pct)));

    var missed = [];
    QUIZ.questions.forEach(function (q, i) {
      if (state.answers[i] !== q.answer) missed.push(i);
    });

    if (missed.length) {
      var wrap = el("div", "missed");
      wrap.appendChild(el("h3", "", "Review (" + missed.length + " missed)"));
      var ol = el("ol");
      missed.forEach(function (i) {
        var q = QUIZ.questions[i];
        var li = el("li");
        li.value = i + 1;
        li.appendChild(el("div", "", q.question));
        li.appendChild(el("small", "", "Your answer: " + L[state.answers[i]] + ". " + q.choices[state.answers[i]]));
        li.appendChild(el("small", "", "Correct answer: " + L[q.answer] + ". " + q.choices[q.answer]));
        ol.appendChild(li);
      });
      wrap.appendChild(ol);
      box.appendChild(wrap);
    }

    var again = el("button", "primary", "Retake quiz");
    again.type = "button";
    again.addEventListener("click", function () { reset(); render(); });
    box.appendChild(again);
    app.appendChild(box);
  }

  reset();
  render();
})();
`;

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "quiz"
  );
}

export function quizHtmlFileName(quiz) {
  return `${slugify(quiz.title)}-live.html`;
}

export function buildQuizHtml(quiz) {
  const data = JSON.stringify({
    title: quiz.title,
    questions: quiz.questions.map((q) => ({
      question: q.question,
      choices: q.choices,
      answer: q.answer,
      explanation: q.explanation,
    })),
  })
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  const title = escapeHtml(quiz.title);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
<header>
<h1>${title}</h1>
<p>${quiz.questions.length}-item multiple choice quiz</p>
</header>
<main id="app"></main>
<footer>Made with TwentyQ</footer>
</div>
<script>
var QUIZ = ${data};
${SCRIPT}
</script>
</body>
</html>
`;
}

export function downloadQuizHtml(quiz) {
  const blob = new Blob([buildQuizHtml(quiz)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = quizHtmlFileName(quiz);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
