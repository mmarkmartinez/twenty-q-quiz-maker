const TRIGGER = /make a quiz\b([\s\S]*)$/i;

// Checks that a message contains "Make a quiz" followed by a topic.
// Returns { status: "ok" | "unknown" | "no-topic", topic? }
export function parseRequest(text) {
  const match = text.match(TRIGGER);
  if (!match) return { status: "unknown" };

  const topic = match[1]
    .replace(/^[\s:,.-]+/, "")
    .replace(/^(on|about|for|regarding|of)\b[\s:,.-]*/i, "")
    .trim();

  return topic ? { status: "ok", topic } : { status: "no-topic" };
}

export const LOCAL_REPLIES = {
  unknown:
    'Unknown command. Say "Make a quiz" followed by a topic to create a quiz, for example: "Make a quiz on photosynthesis".',
  "no-topic":
    'A topic is missing. Add one after "Make a quiz", for example: "Make a quiz on photosynthesis".',
};
