import { renderBeatGame, bindBeatGame } from "./modules/beat-game.js";
import { renderRhythmGame, bindRhythmGame } from "./modules/rhythm-drag-game.js";
import { renderCompositionWorkshop, bindCompositionWorkshop } from "./modules/composition-workshop.js";
import { bindNavigation, updateNavigation } from "./modules/navigation.js";
import { addStar } from "./modules/feedback.js";
import { createInitialState, restoreState, serializeState } from "./modules/game-logic.js";
import { rhythmQuestions } from "./data/rhythm-questions.js";

const storageKey = "huaer-yu-shaonian-state";
const viewRoot = document.querySelector("#viewRoot");
const starCount = document.querySelector("#starCount");
const scoreBoard = document.querySelector(".score-board");

let appState = restoreState(localStorage.getItem(storageKey)) ?? createInitialState();

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
      title: "花鼓节奏台",
      desc: "听清 2/4 强弱、3/4 强弱弱",
      status: appState.beatGame.score > 0 ? "继续挑战" : "开始挑战",
      badge: `连击 ${appState.beatGame.streak}`,
      icon: "鼓",
      isDone: appState.beatGame.score >= 4,
      progress: Math.min(appState.beatGame.score, 4),
      total: 4
    },
    {
      view: "rhythm",
      number: "02",
      title: "节奏采花路",
      desc: "把正确节奏花拖进答案槽",
      status: appState.rhythmGame.correctCount > 0 ? "继续采花" : "开始采花",
      badge: `${appState.rhythmGame.correctCount}/${rhythmQuestions.length}`,
      icon: "花",
      isDone: appState.rhythmGame.correctCount >= rhythmQuestions.length,
      progress: appState.rhythmGame.correctCount,
      total: rhythmQuestions.length
    },
    {
      view: "compose",
      number: "03",
      title: "小乐队拼图台",
      desc: "拼 4 小节，再播放自己的节奏",
      status: completeBars > 0 ? "继续创编" : "开始创编",
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
          <span class="hud-kicker">今日任务</span>
          <strong>点亮花儿会小舞台</strong>
        </div>
        <div class="hud-badges">
          <span>星星 ${appState.stars}</span>
          <span>${completedLevels}/3 关</span>
        </div>
      </div>
      <div class="hero-card stage-card game-lobby">
        <img class="hero-scene" src="./assets/images/game-lobby-scene.png" alt="青海花儿会小舞台上，学生小乐队准备闯关">
        <div class="hero-copy">
          <p class="eyebrow">青海花儿会 · 小花鼓队</p>
          <h2>闯三关，组一支会打节奏的小乐队。</h2>
          <p>先敲花鼓识强弱，再采节奏花，最后把 4 个小节排成班级小舞台。</p>
          <button class="primary-action" data-go-view="beat" type="button">开始敲花鼓</button>
          <div class="mini-awards" aria-label="关卡奖章">
            ${levels.map((level) => `<span class="${level.isDone ? "is-lit" : ""}">${level.icon}</span>`).join("")}
          </div>
        </div>
      </div>
      <div class="quest-map" aria-label="花儿会闯关路线">
        <div class="quest-path" aria-hidden="true"></div>
        ${levels.map((level) => `
          <button class="level-card level-${level.view} ${level.isDone ? "is-complete" : ""}" data-go-view="${level.view}" type="button">
            <span class="level-art" aria-hidden="true"></span>
            <span class="level-number">${level.number}</span>
            <span class="level-icon" aria-hidden="true">${level.icon}</span>
            <strong>${level.title}</strong>
            <small>${level.desc}</small>
            <i>${level.badge}</i>
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
render();
