const TRIGGER = /make a quiz\b([\s\S]*)$/i;

// Checks that a message contains "Make a quiz" followed by a topic.
// When a PDF is attached, the topic is optional.
// Returns { status: "ok" | "unknown" | "no-topic", topic? }
export function parseRequest(text, { hasDocument = false } = {}) {
  const match = text.match(TRIGGER);
  if (!match) return { status: "unknown" };

  const topic = match[1]
    .replace(/^[\s:,.-]+/, "")
    .replace(/^(on|about|for|regarding|of)\b[\s:,.-]*/i, "")
    .trim();

  if (topic) return { status: "ok", topic };
  return hasDocument ? { status: "ok", topic: "the attached PDF" } : { status: "no-topic" };
}

export const LOCAL_REPLIES = {
  unknown:
    'Unknown command. Say "Make a quiz" followed by a topic to create a quiz, for example: "Make a quiz on photosynthesis". A PDF can also be attached first.',
  "no-topic":
    'A topic is missing. Add one after "Make a quiz", or attach a PDF first. Example: "Make a quiz on photosynthesis".',
};
