import Modal from "./Modal.jsx";
import { icon } from "../lib/icons.js";

export default function AboutModal({ onClose }) {
  return (
    <Modal title="About TwentyQ" onClose={onClose}>
      <div className="about-logo">
        <img src={icon("2Q_logo")} alt="TwentyQ logo" />
        <div>
          <strong>TwentyQ</strong>
          <span>AI Quiz Maker, version 1.0.0</span>
        </div>
      </div>

      <p>
        TwentyQ is a chat-style quiz maker. Send any topic and it writes a 20-item multiple choice
        quiz with an answer key, ready to download as a Word document.
      </p>

      <ul className="about-list">
        <li>Works with Google Gemini or Anthropic Claude, chosen in Settings.</li>
        <li>Questions can be previewed in the chat before downloading.</li>
        <li>API keys stay in this browser and are sent only to the selected provider.</li>
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
