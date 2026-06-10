import { renderBeatGame, bindBeatGame } from "./modules/beat-game.js?v=qq-safe-25";
import { renderRhythmGame, bindRhythmGame } from "./modules/rhythm-drag-game.js?v=qq-safe-25";
import { renderCompositionWorkshop, bindCompositionWorkshop } from "./modules/composition-workshop.js?v=qq-safe-25";
import { bindNavigation, updateNavigation } from "./modules/navigation.js?v=qq-safe-25";
import { addLevelStar } from "./modules/feedback.js?v=qq-safe-25";
import { createInitialState, normalizeProgressStars, restoreState, serializeState } from "./modules/game-logic.js?v=qq-safe-25";
import { primeAudio, unlockAudio } from "./modules/audio-engine.js?v=qq-safe-25";
import { addSafeTapListener } from "./modules/safe-tap.js";
import { rhythmQuestions } from "./data/rhythm-questions.js?v=qq-safe-25";

const classroomBuild = "qq-safe-25";
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

function getViewportSize() {
  const viewport = window.visualViewport;
  return {
    width: Math.round(viewport?.width ?? window.innerWidth),
    height: Math.round(viewport?.height ?? window.innerHeight)
  };
}

function detectQQBrowser(userAgent = navigator.userAgent) {
  return /\b(MQQBrowser|QQBrowser|TBS|QBWebViewType|TbsCore|V1_AND_SQ|QQ\/)/i.test(userAgent);
}

function syncClassroomViewport() {
  const size = getViewportSize();
  const shorterSide = Math.min(size.width, size.height);
  const longerSide = Math.max(size.width, size.height);
  const hasTouchInput = navigator.maxTouchPoints >= 1 || window.matchMedia("(pointer: coarse)").matches;
  const isIPadLike = /iPad|Macintosh/.test(navigator.userAgent) && hasTouchInput;
  const isQQBrowser = detectQQBrowser();
  const isTabletDevice = (hasTouchInput || isIPadLike) && longerSide >= 900 && shorterSide >= 520;
  const isCompactTablet = isTabletDevice && size.height <= 740;

  document.body.dataset.browser = isQQBrowser ? "qq" : "standard";
  document.body.dataset.device = isTabletDevice ? "tablet" : "desktop";
  document.body.dataset.tabletSize = isCompactTablet ? "compact" : "regular";
  document.documentElement.style.setProperty("--safe-vw", `${size.width}px`);
  document.documentElement.style.setProperty("--safe-vh", `${size.height}px`);
  document.documentElement.style.setProperty("--classroom-build", `"${classroomBuild}"`);
  updateClassroomVersionMarker(size, isTabletDevice);
}

function updateClassroomVersionMarker(size, isTabletDevice) {
  let marker = document.querySelector(".classroom-version-marker");
  if (!marker) {
    marker = document.createElement("span");
    marker.className = "classroom-version-marker";
    marker.setAttribute("aria-hidden", "true");
    document.body.append(marker);
  }

  const markerPrefix = isTabletDevice ? "v25 tablet" : "v25 desktop";
  marker.textContent = `${markerPrefix} ${size.width}x${size.height}`;
}

function setState(nextState) {
  appState = normalizeProgressStars(nextState);
  localStorage.setItem(storageKey, serializeState(appState));
  starCount.textContent = String(appState.stars);
}

function reward(levelId) {
  const previousStars = appState.stars;
  const nextState = addLevelStar(appState, levelId);
  if (nextState === appState) {
    return;
  }

  setState(nextState);
  if (nextState.stars <= previousStars) {
    return;
  }

  flyRewardStar(1);
  starCount.classList.remove("pop");
  void starCount.offsetWidth;
  starCount.classList.add("pop");
}

function primeClassroomAudio() {
  if (audioPrimed) {
    return;
  }

  audioPrimed = true;
  void unlockAudio()
    .then(() => {
      window.setTimeout(() => {
        void primeAudio(["hand-drum", "bass-drum", "triangle", "tambourine", "shaker"]).catch(() => {
          audioPrimed = false;
        });
      }, 900);
    })
    .catch(() => {
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
    addSafeTapListener(button, () => {
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
syncClassroomViewport();
window.visualViewport?.addEventListener("resize", syncClassroomViewport);
window.visualViewport?.addEventListener("scroll", syncClassroomViewport);
window.addEventListener("resize", syncClassroomViewport);
window.addEventListener("orientationchange", syncClassroomViewport);
["pointerdown", "touchstart", "click", "keydown"].forEach((eventName) => {
  window.addEventListener(eventName, primeClassroomAudio, { once: true, passive: true });
});
render();
