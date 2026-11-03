import { useState } from "react";

export default function ApiKeyBar({ onSave }) {
  const [value, setValue] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (value.trim()) onSave(value.trim());
  };

  return (
    <form className="keybar" onSubmit={submit}>
      <span>🔑 Enter your Anthropic API key to start (stored only in this browser):</span>
      <div className="keybar-row">
        <input
          type="password"
          placeholder="sk-ant-..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" disabled={!value.trim()}>
          Save
        </button>
      </div>
    </form>
  );
}
