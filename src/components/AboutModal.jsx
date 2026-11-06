import Modal from "./Modal.jsx";
import { icon } from "../lib/icons.js";

export default function AboutModal({ onClose }) {
  return (
    <Modal title="About TwentyQ" onClose={onClose}>
      <div className="about-logo">
        <img src={icon("2Q_logo")} alt="TwentyQ logo" />
        <div>
          <strong>TwentyQ</strong>
          <span>AI Quiz Maker, version 1.1.0</span>
        </div>
      </div>

      <p>
        TwentyQ is a chat-style quiz maker. Send any topic and it writes a 20-item multiple choice
        quiz with an answer key, ready to download as a Word document.
      </p>

      <ul className="about-list">
        <li>Powered by Google Gemini.</li>
        <li>Quizzes can be taken in the chat with instant feedback and a score.</li>
        <li>A PDF up to 10 MB can be attached as the source material.</li>
        <li>Download as a Word file or as a live quiz in a single .html file.</li>
        <li>A custom API key can be added under Advanced in Settings. It stays in this browser.</li>
      </ul>

      <p className="note">AI can make mistakes. Review the questions and answers before using them in class.</p>

      <div className="modal-actions">
        <button className="primary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
