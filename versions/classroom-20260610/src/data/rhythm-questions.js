export const rhythmQuestions = [
  {
    id: "section-a-main",
    title: "第一乐段主节奏",
    prompt: "选第一乐段的主要节奏。",
    type: "single",
    options: ["sixteenth-run", "eighth-pair", "quarter-note", "half-note"],
    answer: ["sixteenth-run"],
    summary: "第一乐段：四个十六分音符。"
  },
  {
    id: "section-b-main",
    title: "第二乐段主节奏",
    prompt: "选第二乐段的长音。",
    type: "single",
    options: ["half-note", "two-quarters", "quarter-note", "sixteenth-run"],
    answer: ["half-note"],
    summary: "第二乐段：二分音符长音。"
  }
];

function normalizeAnswers(answerIds) {
  return [...answerIds].sort().join("|");
}

export function evaluateRhythmAnswer(questionId, answerIds) {
  const question = rhythmQuestions.find((item) => item.id === questionId);
  if (!question) {
    throw new Error(`未知节奏题：${questionId}`);
  }

  const correct = normalizeAnswers(question.answer) === normalizeAnswers(answerIds);
  return {
    correct,
    summary: correct ? question.summary : "再听一次，找主要节奏。"
  };
}
