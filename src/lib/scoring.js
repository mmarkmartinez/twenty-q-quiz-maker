export function percentOf(score, total) {
  return total ? Math.round((score / total) * 100) : 0;
}

export function gradeLabel(percent) {
  if (percent >= 90) return "Excellent work!";
  if (percent >= 75) return "Great job!";
  if (percent >= 60) return "Good effort.";
  return "Keep practicing.";
}
