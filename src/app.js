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
  setState(addStar(appState, amount));
  starCount.classList.remove("pop");
  void starCount.offsetWidth;
  starCount.classList.add("pop");
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
      badge: `连击 ${appState.beatGame.streak}`
    },
    {
      view: "rhythm",
      number: "02",
      title: "节奏采花路",
      desc: "把正确节奏花拖进答案槽",
      status: appState.rhythmGame.correctCount > 0 ? "继续采花" : "开始采花",
      badge: `${appState.rhythmGame.correctCount}/${rhythmQuestions.length}`
    },
    {
      view: "compose",
      number: "03",
      title: "小乐队拼图台",
      desc: "拼 4 小节，再播放自己的节奏",
      status: completeBars > 0 ? "继续创编" : "开始创编",
      badge: `${completeBars}/${appState.composition.bars.length} 小节`
    }
  ];

  return `
    <section class="home-view enter-view">
      <div class="hero-card stage-card game-lobby">
        <img class="hero-scene" src="./assets/images/game-lobby-scene.png" alt="青海花儿会小舞台上，学生小乐队准备闯关">
        <div class="hero-copy">
          <p class="eyebrow">青海花儿会 · 小花鼓队</p>
          <h2>闯三关，组一支会打节奏的小乐队。</h2>
          <p>先打花鼓识别强弱，再采节奏花，最后拼出自己的 4 小节节奏。</p>
          <button class="primary-action" data-go-view="beat" type="button">进入第一关</button>
        </div>
      </div>
      <div class="level-grid">
        ${levels.map((level) => `
          <button class="level-card level-${level.view}" data-go-view="${level.view}" type="button">
            <span class="level-art" aria-hidden="true"></span>
            <span>${level.number}</span>
            <strong>${level.title}</strong>
            <small>${level.desc}</small>
            <i>${level.badge}</i>
            <em>${level.status}</em>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderShowcase() {
  const completeBars = appState.composition.bars.filter((bar) => bar.status === "complete").length;
  return `
    <section class="showcase-view enter-view">
      <div class="stage-card finale-card">
        <p class="eyebrow">展示与小结</p>
        <h2>今天的小小花鼓队</h2>
        <div class="badge-wall">
          <span>星星 ${appState.stars}</span>
          <span>节奏题 ${appState.rhythmGame.correctCount}/${rhythmQuestions.length}</span>
          <span>创编 ${completeBars}/${appState.composition.bars.length} 小节</span>
        </div>
        <p>互评时可以问：节拍稳吗？两段有对比吗？音色合适吗？有没有自己的创意？</p>
        <button class="primary-action" data-go-view="compose" type="button">继续打磨作品</button>
      </div>
    </section>
  `;
}

function render() {
  updateNavigation(appState.currentView);
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

bindNavigation({ state: stateRef, setState, render });
render();
