import { renderBeatGame, bindBeatGame } from "./modules/beat-game.js";
import { renderRhythmGame, bindRhythmGame } from "./modules/rhythm-drag-game.js";
import { renderCompositionWorkshop, bindCompositionWorkshop } from "./modules/composition-workshop.js";
import { bindNavigation, updateNavigation } from "./modules/navigation.js";
import { addStar } from "./modules/feedback.js";
import { createInitialState, restoreState, serializeState } from "./modules/game-logic.js";
import { primeAudio } from "./modules/audio-engine.js";
import { rhythmQuestions } from "./data/rhythm-questions.js";

const storageKey = "huaer-yu-shaonian-state";
const viewRoot = document.querySelector("#viewRoot");
const starCount = document.querySelector("#starCount");
const scoreBoard = document.querySelector(".score-board");
const pageTitle = document.querySelector(".game-header h1");

let appState = restoreState(localStorage.getItem(storageKey)) ?? createInitialState();
let audioPrimed = false;

const stateRef = {
  get: () => appState
};

function setState(nextState) {
  appState = nextState;
  localStorage.setItem(storageKey, serializeState(appState));
  starCount.textContent = String(appState.stars);
}

function reward(amount) {
  flyRewardStar(amount);
  setState(addStar(appState, amount));
  starCount.classList.remove("pop");
  void starCount.offsetWidth;
  starCount.classList.add("pop");
}

function primeClassroomAudio() {
  if (audioPrimed) {
    return;
  }

  audioPrimed = true;
  void primeAudio(["hand-drum", "bass-drum", "triangle", "tambourine", "shaker"]).catch(() => {
    audioPrimed = false;
  });
}

function flyRewardStar(amount = 1) {
  if (!scoreBoard) {
    return;
  }

  const startRect = viewRoot.getBoundingClientRect();
  const targetRect = scoreBoard.getBoundingClientRect();
  const star = document.createElement("span");
  star.className = "reward-star-flight";
  star.textContent = amount > 1 ? `+${amount}` : "★";
  star.style.setProperty("--star-start-x", `${startRect.left + startRect.width * 0.5}px`);
  star.style.setProperty("--star-start-y", `${Math.min(startRect.top + startRect.height * 0.52, window.innerHeight - 160)}px`);
  star.style.setProperty("--star-end-x", `${targetRect.left + targetRect.width * 0.5}px`);
  star.style.setProperty("--star-end-y", `${targetRect.top + targetRect.height * 0.5}px`);
  document.body.append(star);
  star.addEventListener("animationend", () => star.remove(), { once: true });
}

function renderHome() {
  const completeBars = appState.composition.bars.filter((bar) => bar.status === "complete").length;
  const levels = [
    {
      view: "beat",
      number: "01",
      title: "花鼓",
      desc: "",
      status: appState.beatGame.score > 0 ? "继续" : "开始",
      badge: `连击 ${appState.beatGame.streak}`,
      icon: "鼓",
      isDone: appState.beatGame.score >= 4,
      progress: Math.min(appState.beatGame.score, 4),
      total: 4
    },
    {
      view: "rhythm",
      number: "02",
      title: "节奏",
      desc: "",
      status: appState.rhythmGame.correctCount > 0 ? "继续" : "开始",
      badge: `${appState.rhythmGame.correctCount}/${rhythmQuestions.length}`,
      icon: "花",
      isDone: appState.rhythmGame.correctCount >= rhythmQuestions.length,
      progress: appState.rhythmGame.correctCount,
      total: rhythmQuestions.length
    },
    {
      view: "compose",
      number: "03",
      title: "创编",
      desc: "",
      status: completeBars > 0 ? "继续" : "开始",
      badge: `${completeBars}/${appState.composition.bars.length} 小节`,
      icon: "乐",
      isDone: completeBars >= appState.composition.bars.length,
      progress: completeBars,
      total: appState.composition.bars.length
    }
  ];
  const completedLevels = levels.filter((level) => level.isDone).length;

  return `
    <section class="home-view enter-view">
      <div class="festival-hud" aria-label="今日闯关进度">
        <div>
          <strong>小舞台</strong>
        </div>
        <div class="hud-badges">
          <span>星星 ${appState.stars}</span>
          <span>${completedLevels}/3 关</span>
        </div>
      </div>
      <div class="quest-map" aria-label="花儿会闯关路线">
        <div class="quest-path" aria-hidden="true"></div>
        ${levels.map((level) => `
          <button class="level-card level-${level.view} ${level.isDone ? "is-complete" : ""}" data-go-view="${level.view}" type="button">
            <span class="level-art" aria-hidden="true"></span>
            <span class="level-icon" aria-hidden="true">${level.icon}</span>
            <strong>${level.title}</strong>
            <span class="level-meter" aria-hidden="true"><b style="--level-progress:${(level.progress / level.total) * 100}%"></b></span>
            <em>${level.status}</em>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderShowcase() {
  const completeBars = appState.composition.bars.filter((bar) => bar.status === "complete").length;
  const beatDone = appState.beatGame.score >= 4;
  const rhythmDone = appState.rhythmGame.correctCount >= rhythmQuestions.length;
  const composeDone = completeBars >= appState.composition.bars.length;
  const allDone = beatDone && rhythmDone && composeDone;
  return `
    <section class="showcase-view enter-view">
      <div class="stage-card finale-card">
        <div class="finale-spotlight" aria-hidden="true"></div>
        <p class="eyebrow">班级小舞台</p>
        <h2>${allDone ? "花儿会表演准备好啦" : "还差一点就能登台"}</h2>
        <div class="badge-wall" aria-label="闯关徽章">
          <span class="${beatDone ? "is-lit" : ""}">花鼓 ${beatDone ? "已点亮" : "练习中"}</span>
          <span class="${rhythmDone ? "is-lit" : ""}">节奏 ${appState.rhythmGame.correctCount}/${rhythmQuestions.length}</span>
          <span class="${composeDone ? "is-lit" : ""}">创编 ${completeBars}/${appState.composition.bars.length}</span>
          <span class="is-star">星星 ${appState.stars}</span>
        </div>
        <p>${allDone ? "展示时听一听：节拍稳吗？两段有对比吗？音色合适吗？" : "先把没点亮的徽章补齐，再来班级小舞台展示。"}</p>
        <div class="finale-actions">
          <button class="primary-action" data-go-view="compose" type="button">播放小乐队</button>
          <button data-go-view="home" type="button">回到闯关地图</button>
        </div>
      </div>
    </section>
  `;
}

function render() {
  document.body.dataset.view = appState.currentView;
  updateNavigation(appState.currentView);
  updateNavProgress();
  starCount.textContent = String(appState.stars);
  if (pageTitle) {
    pageTitle.textContent = appState.currentView === "home" ? "闯三关" : "《花儿与少年》音乐闯关";
  }

  if (appState.currentView === "home") {
    viewRoot.innerHTML = renderHome();
  } else if (appState.currentView === "beat") {
    viewRoot.innerHTML = renderBeatGame({ state: appState });
    bindBeatGame({ root: viewRoot, state: stateRef, setState, render, onReward: reward });
  } else if (appState.currentView === "rhythm") {
    viewRoot.innerHTML = renderRhythmGame({ state: appState });
    bindRhythmGame({ root: viewRoot, state: stateRef, setState, render, onReward: reward });
  } else if (appState.currentView === "compose") {
    const existingStage = viewRoot.querySelector("[data-compose-game-stage]");
    existingStage?.remove();
    viewRoot.innerHTML = renderCompositionWorkshop({ state: appState });
    const nextStage = viewRoot.querySelector("[data-compose-game-stage]");
    if (existingStage && nextStage) {
      nextStage.replaceWith(existingStage);
    }
    bindCompositionWorkshop({ root: viewRoot, state: stateRef, setState, render, onReward: reward });
  } else {
    viewRoot.innerHTML = renderShowcase();
  }

  viewRoot.querySelectorAll("[data-go-view]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ ...appState, currentView: button.dataset.goView });
      render();
    });
  });

  window.scrollTo(0, 0);
  viewRoot.focus({ preventScroll: true });
}

function updateNavProgress() {
  const completeBars = appState.composition.bars.filter((bar) => bar.status === "complete").length;
  const doneViews = new Set([
    appState.beatGame.score >= 4 ? "beat" : null,
    appState.rhythmGame.correctCount >= rhythmQuestions.length ? "rhythm" : null,
    completeBars >= appState.composition.bars.length ? "compose" : null
  ].filter(Boolean));

  document.querySelectorAll(".nav-tab").forEach((button) => {
    const view = button.dataset.view;
    const isDone = view === "showcase"
      ? doneViews.size === 3
      : doneViews.has(view);
    button.dataset.complete = isDone ? "true" : "false";
  });
}

bindNavigation({ state: stateRef, setState, render });
["pointerdown", "touchstart", "click", "keydown"].forEach((eventName) => {
  window.addEventListener(eventName, primeClassroomAudio, { once: true, passive: true });
});
render();
