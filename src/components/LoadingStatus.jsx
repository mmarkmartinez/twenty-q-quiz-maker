import { useEffect, useState } from "react";

const STEPS = [
  { text: "Building Questions...", after: 0 },
  { text: "Preparing Choices...", after: 5000 },
  { text: "Preparing Word File...", after: 11000 },
  { text: "Almost there...", after: 17000 },
];

export default function LoadingStatus() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = STEPS.slice(1).map((s, i) => setTimeout(() => setStep(i + 1), s.after));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <>
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
      <em key={step} className="status-text">
        {STEPS[step].text}
      </em>
    </>
  );
}
