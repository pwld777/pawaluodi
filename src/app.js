import { renderBeatGame, bindBeatGame } from "./modules/beat-game.js";
import { renderRhythmGame, bindRhythmGame } from "./modules/rhythm-drag-game.js";
import { renderCompositionWorkshop, bindCompositionWorkshop } from "./modules/composition-workshop.js";
import { bindNavigation, updateNavigation } from "./modules/navigation.js";
import { addStar } from "./modules/feedback.js";
import { createInitialState, restoreState, serializeState } from "./modules/game-logic.js";

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
  return `
    <section class="home-view enter-view">
      <div class="hero-card stage-card">
        <div class="hero-copy">
          <p class="eyebrow">一个链接 · 三个游戏 · 一次扫码</p>
          <h2>跟着花鼓，听见两段音乐的不同。</h2>
          <p>网页不替代教师播放主音乐，只帮助学生听、拍、选、创。</p>
          <button class="primary-action" data-go-view="beat" type="button">开始闯关</button>
        </div>
        <div class="hero-band" aria-hidden="true">
          <span class="kid kid-one">鼓</span>
          <span class="hero-drum"></span>
          <span class="kid kid-two">花</span>
        </div>
      </div>
      <div class="level-grid">
        ${[
          ["beat", "01", "花鼓节拍挑战", "鼓心强拍，鼓边弱拍"],
          ["rhythm", "02", "节奏拖拽选择", "找出跳动与舒展"],
          ["compose", "03", "拼图创编工坊", "拼出自己的小谱子"]
        ].map(([view, number, title, desc]) => `
          <button class="level-card" data-go-view="${view}" type="button">
            <span>${number}</span>
            <strong>${title}</strong>
            <small>${desc}</small>
            <i>☆☆☆</i>
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
          <span>节奏题 ${appState.rhythmGame.correctCount}/${4}</span>
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
    viewRoot.innerHTML = renderCompositionWorkshop({ state: appState });
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
