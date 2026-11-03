import { useState } from "react";
import Modal from "./Modal.jsx";
import { GEMINI } from "../lib/generateQuiz.js";

export default function SettingsModal({ customKey, onSave, onClose }) {
  const [draft, setDraft] = useState(customKey);
  const hasDefault = Boolean(GEMINI.envKey);

  const submit = (e) => {
    e.preventDefault();
    onSave(draft.trim());
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="status-row">
          <span>
            <strong>{GEMINI.label} </strong>
            <small>{GEMINI.model} </small>
          </span>
          <span className={`pill ${hasDefault ? "ok" : "warn"}`}>
            {hasDefault ? "Default key active" : "No default key"}
          </span>
        </div>

        {!hasDefault && (
          <p className="note">
            Add VITE_GEMINI_API_KEY to the .env file to set the default key, or open Advanced below to use a custom
            key.
          </p>
        )}

        <details className="advanced" open={!hasDefault || Boolean(customKey)}>
          <summary>Advanced</summary>
          <label className="field-label" htmlFor="custom-key">
            Custom Gemini API key
          </label>
          <input
            id="custom-key"
            className="text-input"
            type="password"
            autoComplete="off"
            placeholder="Input API Key..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <p className="note">
            Overrides the default key. Stored only in this browser.{" "}<br/>
            <a href={GEMINI.keyUrl} target="_blank" rel="noreferrer">
              Get a Gemini key
            </a>
          </p>
          {draft && (
            <button type="button" className="ghost small" onClick={() => setDraft("")}>
              Clear custom key
            </button>
          )}
        </details>

        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
