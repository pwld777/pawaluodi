export const rhythmQuestions = [
  {
    id: "section-a-main",
    title: "第一段哪张谱例更像它？",
    prompt: "听欢快段，找出更密、更跳动的谱例。",
    type: "single",
    options: ["sixteenth-run", "quarter-note", "half-note"],
    answer: ["sixteenth-run"],
    summary: "节奏越密，音乐越跳动。"
  },
  {
    id: "section-b-main",
    title: "第二段哪张谱例更像它？",
    prompt: "听悠扬段，找出更舒展的长音。",
    type: "single",
    options: ["eighth-pair", "sixteenth-run", "half-note", "quarter-note"],
    answer: ["half-note"],
    summary: "长音更多，音乐更舒展。"
  },
  {
    id: "density-compare",
    title: "节奏疏密比较",
    prompt: "把“更密”和“更疏”放到合适段落。",
    type: "multi",
    options: ["dense-a", "open-b", "open-a"],
    answer: ["dense-a", "open-b"],
    summary: "第一段密，第二段疏。"
  },
  {
    id: "style-match",
    title: "风格与谱例匹配",
    prompt: "把欢快、悠扬分别配给两段音乐。",
    type: "multi",
    options: ["joyful-a", "lyrical-b", "joyful-b"],
    answer: ["joyful-a", "lyrical-b"],
    summary: "两段风格形成对比。"
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
    summary: correct ? question.summary : "再听听它是跳动还是舒展。"
  };
}

