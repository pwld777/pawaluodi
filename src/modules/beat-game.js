import { beatGame, evaluateBeatHit, evaluateMeterSwitch } from "../data/beat-patterns.js";
import { playInstrument, unlockAudio } from "./audio-engine.js";
import { announceFeedback } from "./feedback.js";

let ticker = null;
let session = null;

const drumHeadGeometry = {
  centerX: 0.5,
  centerY: 0.31,
  radiusX: 0.39,
  radiusY: 0.27,
  centerThreshold: 0.42
};

export function classifyDrumHit({ x, y, width, height }) {
  const normalizedX = (x / width - drumHeadGeometry.centerX) / drumHeadGeometry.radiusX;
  const normalizedY = (y / height - drumHeadGeometry.centerY) / drumHeadGeometry.radiusY;
  const distanceFromHeadCenter = Math.hypot(normalizedX, normalizedY);

  return distanceFromHeadCenter <= drumHeadGeometry.centerThreshold ? "center" : "rim";
}

function getDrumHitZone(event, drum) {
  if (!event.clientX && !event.clientY) {
    return "center";
  }

  const rect = drum.getBoundingClientRect();
  return classifyDrumHit({
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    width: rect.width,
    height: rect.height
  });
}

function stopTicker() {
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
  session = null;
}

export function renderBeatGame({ state, setState, onReward }) {
  const beatState = state.beatGame;
  const patternConfig = beatState.currentMeter === "3/4" ? beatGame.sectionB : beatGame.sectionA;
  const stepLabel = beatState.currentStep === "switch" ? "节拍转换" : patternConfig.name;

  return `
    <section class="game-layout beat-layout enter-view">
      <aside class="task-rail">
        <p class="eyebrow">游戏一</p>
        <h2>花鼓</h2>
        <ol class="step-list">
          <li class="${beatState.currentStep === "intro" ? "active" : ""}">听鼓</li>
          <li class="${beatState.currentMeter === "2/4" && beatState.currentStep !== "intro" ? "active" : ""}">2/4拍</li>
          <li class="${beatState.currentMeter === "3/4" ? "active" : ""}">3/4拍</li>
          <li class="${beatState.currentStep === "switch" ? "active" : ""}">节拍转换</li>
        </ol>
        <div class="mode-buttons">
          <button type="button" data-beat-mode="2/4">2/4拍</button>
          <button type="button" data-beat-mode="3/4">3/4拍</button>
          <button type="button" data-beat-switch>节拍转换</button>
        </div>
      </aside>

      <div class="stage-card drum-stage">
        <div class="stage-hud beat-stage-hud" aria-label="花鼓关卡状态">
          <span>关卡 1</span>
          <strong>连击 ${beatState.streak}</strong>
          <span>得分 ${beatState.score}</span>
        </div>
        <p class="round-label">${stepLabel}</p>
        <div class="beat-track" aria-label="拍点轨道">
          ${patternConfig.pattern.map((beat, index) => `<span class="beat-dot ${beat}" data-beat-dot="${index}" aria-label="第 ${index + 1} 拍">${index + 1}</span>`).join("")}
        </div>
        <div class="huagu" role="group" aria-label="可点击花鼓">
          <img class="huagu-image" src="./assets/images/flower-drum-3d.png?v=tablet-touch-14" alt="红色大花鼓，鼓面朝上，鼓身贴有花纹">
          <button class="drum-zone drum-hit-surface" data-drum-surface type="button" aria-label="敲花鼓"><span>敲花鼓</span></button>
        </div>
        <p class="feedback-pill" id="beatFeedback" data-tone="info">先听，再敲。</p>
        <div class="control-row">
          <button class="primary-action" data-start-beat type="button">开始</button>
          <button data-stop-beat type="button">停止</button>
          <button data-reset-beat type="button">重来</button>
        </div>
      </div>
    </section>
  `;
}

export function bindBeatGame({ root, state, setState, render, onReward }) {
  const feedback = root.querySelector("#beatFeedback");

  root.querySelectorAll("[data-beat-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      stopTicker();
      const meter = button.dataset.beatMode;
      setState({
        ...state.get(),
        beatGame: {
          ...state.get().beatGame,
          currentStep: "practice",
          currentMeter: meter,
          streak: 0,
          lastResult: null,
          sequenceIndex: 0
        }
      });
      render();
    });
  });

  root.querySelector("[data-beat-switch]")?.addEventListener("click", () => {
    stopTicker();
    setState({
      ...state.get(),
      beatGame: {
        ...state.get().beatGame,
        currentStep: "switch",
        currentMeter: "2/4",
        streak: 0,
        sequenceIndex: 0
      }
    });
    render();
  });

  root.querySelector("[data-start-beat]")?.addEventListener("click", async () => {
    await unlockAudio();
    stopTicker();
    const current = state.get();
    const patternConfig = current.beatGame.currentMeter === "3/4" ? beatGame.sectionB : beatGame.sectionA;
    session = {
      pattern: patternConfig.pattern
    };

    setState({
      ...current,
      beatGame: {
        ...current.beatGame,
        currentStep: current.beatGame.currentStep === "intro" ? "practice" : current.beatGame.currentStep,
        sequenceIndex: 0
      }
    });
    highlightExpectedBeat(root, patternConfig.pattern, 0);
    announceFeedback(feedback, current.beatGame.currentStep === "switch" ? "先敲第一段，准备好再换段。" : "听清楚后，按自己的速度敲。");
  });

  root.querySelector("[data-stop-beat]")?.addEventListener("click", () => {
    stopTicker();
    announceFeedback(feedback, "已经停止，可以等教师口令再开始。");
  });

  root.querySelector("[data-reset-beat]")?.addEventListener("click", () => {
    stopTicker();
    setState({
      ...state.get(),
      beatGame: {
        currentStep: "intro",
        currentMeter: "2/4",
        score: 0,
        streak: 0,
        lastResult: null,
        sequenceIndex: 0
      }
    });
    render();
  });

  root.querySelectorAll("[data-drum-surface]").forEach((button) => {
    let lastPointerHitAt = 0;
    const handleDrumHit = async (event) => {
      const now = performance.now();
      if (event.type === "click" && now - lastPointerHitAt < 320) {
        return;
      }
      if (event.type === "pointerdown") {
        lastPointerHitAt = now;
      }

      const current = state.get();
      const drum = button.closest(".huagu");
      const zone = getDrumHitZone(event, drum);
      const isCenterHit = zone === "center";
      drum.dataset.hitZone = zone;
      button.classList.add("is-hit");
      drum?.classList.add("is-hit");
      void unlockAudio().catch(() => {});
      playInstrument("hand-drum", { accent: isCenterHit, volume: current.settings.volume });
      setTimeout(() => {
        button.classList.remove("is-hit");
        drum?.classList.remove("is-hit");
        delete drum.dataset.hitZone;
      }, 180);

      if (current.beatGame.currentStep === "intro") {
        const expectedZone = current.beatGame.currentStep === "intro" && isCenterHit;
        announceFeedback(feedback, expectedZone ? "对了！" : "不对，再听一次。", expectedZone ? "good" : "warn");
        if (expectedZone) {
          onReward(1);
        }
        return;
      }

      const patternConfig = current.beatGame.currentMeter === "3/4" ? beatGame.sectionB : beatGame.sectionA;
      const sequenceIndex = current.beatGame.sequenceIndex ?? 0;
      const result = evaluateBeatHit({
        pattern: patternConfig.pattern,
        beatIndex: sequenceIndex,
        zone
      });

      if (result.result === "correct") {
        const streak = current.beatGame.streak + 1;
        const nextSequenceIndex = (sequenceIndex + 1) % patternConfig.pattern.length;
        setState({
          ...current,
          beatGame: {
            ...current.beatGame,
            score: current.beatGame.score + 1,
            streak,
            lastResult: result.result,
            sequenceIndex: nextSequenceIndex
          }
        });
        highlightExpectedBeat(root, patternConfig.pattern, nextSequenceIndex);
        announceFeedback(feedback, nextSequenceIndex === 0 ? "这一组对了！继续。" : "对了！", "good");
        if (streak === 4) {
          onReward(2);
        }
      } else {
        setState({
          ...current,
          beatGame: {
            ...current.beatGame,
            streak: 0,
            lastResult: result.result,
            sequenceIndex: 0
          }
        });
        highlightExpectedBeat(root, patternConfig.pattern, 0);
        announceFeedback(feedback, "不对，从头再来。", "bad");
      }
    };

    button.addEventListener("pointerdown", handleDrumHit);
    button.addEventListener("click", handleDrumHit);
  });

  root.querySelector(".primary-action")?.insertAdjacentHTML("afterend", '<button data-switch-now type="button">换段</button>');
  root.querySelector("[data-switch-now]")?.addEventListener("click", () => {
    if (!session) {
      announceFeedback(feedback, "先点开始，再练节拍转换。", "warn");
      return;
    }
    onReward(2);
    setState({
      ...state.get(),
      beatGame: {
        ...state.get().beatGame,
        currentMeter: "3/4",
        currentStep: "practice",
        sequenceIndex: 0
      }
    });
    stopTicker();
    announceFeedback(feedback, "已经换段，现在听着敲。", "good");
    setTimeout(render, 600);
  });
}

function highlightExpectedBeat(root, pattern, beatIndex) {
  const dots = root.querySelectorAll("[data-beat-dot]");
  dots.forEach((dot) => dot.classList.remove("is-now"));
  const activeIndex = beatIndex % pattern.length;
  dots[activeIndex]?.classList.add("is-now");
}
