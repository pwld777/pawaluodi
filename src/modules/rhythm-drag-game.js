import { notationCards } from "../data/notation-cards.js";
import { rhythmQuestions, evaluateRhythmAnswer } from "../data/rhythm-questions.js";
import { announceFeedback } from "./feedback.js";

const customOptionLabels = {
  "dense-a": "更密 → 第一段",
  "open-b": "更疏 → 第二段",
  "open-a": "更疏 → 第一段",
  "joyful-a": "欢快跳动 → 第一段",
  "lyrical-b": "悠扬舒展 → 第二段",
  "joyful-b": "欢快跳动 → 第二段"
};

export function renderRhythmGame({ state }) {
  const rhythmState = state.rhythmGame;
  const question = rhythmQuestions[rhythmState.currentQuestionIndex] ?? rhythmQuestions[0];

  return `
    <section class="game-layout rhythm-layout enter-view">
      <div class="stage-card rhythm-question">
        <p class="eyebrow">游戏二</p>
        <h2>${question.title}</h2>
        <p class="large-prompt">${question.prompt}</p>
        <div class="answer-zone" data-answer-zone>
          <span>把谱例卡拖到这里</span>
        </div>
        <div class="control-row">
          <button type="button" data-reset-rhythm>重做节奏题</button>
        </div>
        <p class="feedback-pill" id="rhythmFeedback" data-tone="info">第 ${rhythmState.currentQuestionIndex + 1} / ${rhythmQuestions.length} 题</p>
      </div>

      <div class="card-tray" aria-label="谱例卡">
        ${question.options.map((id) => renderRhythmOption(id)).join("")}
      </div>
    </section>
  `;
}

function renderRhythmOption(optionId) {
  const card = notationCards.find((item) => item.id === optionId);
  if (!card) {
    return `
      <button class="notation-card word-card" data-rhythm-option="${optionId}" type="button">
        <strong>${customOptionLabels[optionId]}</strong>
        <small>风格判断</small>
      </button>
    `;
  }

  return `
    <button class="notation-card" data-rhythm-option="${card.id}" type="button">
      <span class="card-tag">${card.tag}</span>
      <span class="mini-staff">${renderStaffMarks(card.staffMarks)}</span>
      <strong>${card.name}</strong>
      <small>${card.mood}</small>
    </button>
  `;
}

function renderStaffMarks(marks) {
  return `
    <i></i><i></i><i></i><i></i><i></i>
    <b class="${marks.join(" ")}">${marks.length > 2 ? "♬" : "♪"}</b>
  `;
}

export function bindRhythmGame({ root, state, setState, render, onReward }) {
  const selected = new Set();
  const feedback = root.querySelector("#rhythmFeedback");
  const zone = root.querySelector("[data-answer-zone]");
  const question = rhythmQuestions[state.get().rhythmGame.currentQuestionIndex] ?? rhythmQuestions[0];

  root.querySelector("[data-reset-rhythm]")?.addEventListener("click", () => {
    const current = state.get();
    setState({
      ...current,
      rhythmGame: {
        currentQuestionIndex: 0,
        correctCount: 0,
        completedAnswers: {}
      }
    });
    render();
  });

  root.querySelectorAll("[data-rhythm-option]").forEach((card) => {
    card.addEventListener("pointerdown", (event) => {
      card.dataset.pointerDrag = "1";
      setTimeout(() => {
        delete card.dataset.pointerDrag;
      }, 0);
      startDrag(event, card, zone, (optionId) => {
      selected.add(optionId);
      zone.classList.add("has-card");
      zone.innerHTML = [...selected].map((id) => `<span>${labelForOption(id)}</span>`).join("");

      if (question.type === "single" || selected.size >= question.answer.length) {
        const result = evaluateRhythmAnswer(question.id, [...selected]);
        if (result.correct) {
          announceFeedback(feedback, result.summary, "good");
          onReward(1);
          setTimeout(() => {
            const current = state.get();
            setState({
              ...current,
              rhythmGame: {
                ...current.rhythmGame,
                correctCount: current.rhythmGame.correctCount + 1,
                currentQuestionIndex: Math.min(rhythmQuestions.length - 1, current.rhythmGame.currentQuestionIndex + 1),
                completedAnswers: {
                  ...current.rhythmGame.completedAnswers,
                  [question.id]: [...selected]
                }
              }
            });
            render();
          }, 850);
        } else {
          announceFeedback(feedback, result.summary, "warn");
          selected.clear();
          zone.classList.remove("has-card");
          zone.innerHTML = "<span>把谱例卡拖到这里</span>";
          card.classList.add("shake");
          setTimeout(() => card.classList.remove("shake"), 350);
        }
      }
      });
    });

    card.addEventListener("mousedown", (event) => {
      if (card.dataset.pointerDrag) {
        return;
      }
      startMouseDrag(event, card, zone, (optionId) => {
        selected.add(optionId);
        zone.classList.add("has-card");
        zone.innerHTML = [...selected].map((id) => `<span>${labelForOption(id)}</span>`).join("");

        if (question.type === "single" || selected.size >= question.answer.length) {
          const result = evaluateRhythmAnswer(question.id, [...selected]);
          if (result.correct) {
            announceFeedback(feedback, result.summary, "good");
            onReward(1);
            setTimeout(() => {
              const current = state.get();
              setState({
                ...current,
                rhythmGame: {
                  ...current.rhythmGame,
                  correctCount: current.rhythmGame.correctCount + 1,
                  currentQuestionIndex: Math.min(rhythmQuestions.length - 1, current.rhythmGame.currentQuestionIndex + 1),
                  completedAnswers: {
                    ...current.rhythmGame.completedAnswers,
                    [question.id]: [...selected]
                  }
                }
              });
              render();
            }, 850);
          } else {
            announceFeedback(feedback, result.summary, "warn");
            selected.clear();
            zone.classList.remove("has-card");
            zone.innerHTML = "<span>把谱例卡拖到这里</span>";
          }
        }
      });
    });

    card.addEventListener("click", () => {
      selected.add(card.dataset.rhythmOption);
      zone.classList.add("has-card");
      zone.innerHTML = [...selected].map((id) => `<span>${labelForOption(id)}</span>`).join("");

      if (question.type === "single" || selected.size >= question.answer.length) {
        const result = evaluateRhythmAnswer(question.id, [...selected]);
        if (result.correct) {
          announceFeedback(feedback, result.summary, "good");
          onReward(1);
          setTimeout(() => {
            const current = state.get();
            setState({
              ...current,
              rhythmGame: {
                ...current.rhythmGame,
                correctCount: current.rhythmGame.correctCount + 1,
                currentQuestionIndex: Math.min(rhythmQuestions.length - 1, current.rhythmGame.currentQuestionIndex + 1),
                completedAnswers: {
                  ...current.rhythmGame.completedAnswers,
                  [question.id]: [...selected]
                }
              }
            });
            render();
          }, 850);
        } else {
          announceFeedback(feedback, result.summary, "warn");
          selected.clear();
          zone.classList.remove("has-card");
          zone.innerHTML = "<span>把谱例卡拖到这里</span>";
        }
      }
    });
  });
}

function labelForOption(optionId) {
  return notationCards.find((item) => item.id === optionId)?.name ?? customOptionLabels[optionId] ?? optionId;
}

function startDrag(event, element, target, onDrop) {
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  const optionId = element.dataset.rhythmOption;
  element.setPointerCapture?.(event.pointerId);
  element.classList.add("is-dragging");

  function move(moveEvent) {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    element.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 24}deg)`;
    target.classList.toggle("is-hot", isInside(moveEvent, target));
  }

  function up(upEvent) {
    element.classList.remove("is-dragging");
    target.classList.remove("is-hot");
    element.style.transform = "";
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", up);

    if (isInside(upEvent, target)) {
      onDrop(optionId);
    }
  }

  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", up);
}

function startMouseDrag(event, element, target, onDrop) {
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  const optionId = element.dataset.rhythmOption;
  element.classList.add("is-dragging");

  function move(moveEvent) {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    element.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 24}deg)`;
    target.classList.toggle("is-hot", isInside(moveEvent, target));
  }

  function up(upEvent) {
    element.classList.remove("is-dragging");
    target.classList.remove("is-hot");
    element.style.transform = "";
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);

    if (isInside(upEvent, target)) {
      onDrop(optionId);
    }
  }

  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
}

function isInside(event, target) {
  const rect = target.getBoundingClientRect();
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}
