export const rhythmQuestions = [
  {
    id: "meter-two-four",
    title: "2/4 的强弱在哪里？",
    prompt: "把“强弱”节拍花拖进答案槽。",
    type: "single",
    options: ["strong-weak", "strong-weak-weak", "weak-strong"],
    answer: ["strong-weak"],
    summary: "2/4 是强弱，像小花鼓队踏步。"
  },
  {
    id: "meter-three-four",
    title: "3/4 的强弱弱在哪里？",
    prompt: "把“强弱弱”节拍花拖进答案槽。",
    type: "single",
    options: ["strong-weak-weak", "strong-weak", "strong-strong-weak"],
    answer: ["strong-weak-weak"],
    summary: "3/4 是强弱弱，后两拍都要轻。"
  },
  {
    id: "section-a-main",
    title: "A 段哪块更欢快？",
    prompt: "听欢快段，找出更密、更跳动的节奏块。",
    type: "single",
    options: ["sixteenth-run", "quarter-note", "half-note"],
    answer: ["sixteenth-run"],
    summary: "十六分音符更密，A 段更跳动。"
  },
  {
    id: "section-b-main",
    title: "B 段哪块更舒展？",
    prompt: "听悠扬段，找出更舒展的长音。",
    type: "single",
    options: ["eighth-pair", "sixteenth-run", "half-note", "quarter-note"],
    answer: ["half-note"],
    summary: "长音更多，B 段更舒展。"
  },
  {
    id: "density-compare",
    title: "节奏疏密比较",
    prompt: "把“更密”和“更疏”放到合适段落。",
    type: "multi",
    options: ["dense-a", "open-b", "open-a"],
    answer: ["dense-a", "open-b"],
    summary: "A 段节奏更密，B 段更舒展。"
  },
  {
    id: "style-match",
    title: "风格与谱例匹配",
    prompt: "把欢快、悠扬分别配给两段音乐。",
    type: "multi",
    options: ["joyful-a", "lyrical-b", "joyful-b"],
    answer: ["joyful-a", "lyrical-b"],
    summary: "A 段欢快，B 段悠扬，最后 A 段再现。"
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
    summary: correct ? question.summary : "再听听：强弱顺序、节奏疏密和段落风格要对上。"
  };
}
