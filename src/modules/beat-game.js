import { beatGame, evaluateBeatHit, evaluateMeterSwitch } from "../data/beat-patterns.js";
import { playInstrument, unlockAudio } from "./audio-engine.js";
import { announceFeedback } from "./feedback.js";

let ticker = null;
let session = null;

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
  const stepLabel = beatState.currentStep === "switch" ? "变拍挑战" : patternConfig.name;

  return `
    <section class="game-layout beat-layout enter-view">
      <aside class="task-rail">
        <p class="eyebrow">游戏一</p>
        <h2>花鼓节拍挑战</h2>
        <ol class="step-list">
          <li class="${beatState.currentStep === "intro" ? "active" : ""}">认识强弱</li>
          <li class="${beatState.currentMeter === "2/4" && beatState.currentStep !== "intro" ? "active" : ""}">第一段 2/4</li>
          <li class="${beatState.currentMeter === "3/4" ? "active" : ""}">第二段 3/4</li>
          <li class="${beatState.currentStep === "switch" ? "active" : ""}">变拍挑战</li>
        </ol>
        <div class="mode-buttons">
          <button type="button" data-beat-mode="2/4">练 2/4</button>
          <button type="button" data-beat-mode="3/4">练 3/4</button>
          <button type="button" data-beat-switch>变拍</button>
        </div>
      </aside>

      <div class="stage-card drum-stage">
        <p class="round-label">${stepLabel}</p>
        <div class="beat-track" aria-label="拍点轨道">
          ${patternConfig.pattern.map((beat, index) => `<span class="beat-dot ${beat}" data-beat-dot="${index}">${beat === "strong" ? "强" : "弱"}</span>`).join("")}
        </div>
        <div class="huagu" role="group" aria-label="可点击花鼓">
          <button class="drum-zone drum-center" data-drum-zone="center" type="button">鼓心<br><small>强拍</small></button>
          <button class="drum-zone drum-rim" data-drum-zone="rim" type="button">鼓边<br><small>弱拍</small></button>
        </div>
        <div class="control-row">
          <button class="primary-action" data-start-beat type="button">开始练习</button>
          <button data-stop-beat type="button">停止</button>
          <button data-reset-beat type="button">重来</button>
        </div>
        <p class="feedback-pill" id="beatFeedback" data-tone="info">教师口令 3、2、1 后开始，网页负责练强弱拍。</p>
      </div>

      <aside class="hint-panel">
        <h3>拍子提示</h3>
        <div class="meter-card"><strong>2/4</strong><span>强 弱</span></div>
        <div class="meter-card"><strong>3/4</strong><span>强 弱 弱</span></div>
        <p>练习模式用宽容窗口判定；课堂跟音乐时更适合看强弱区域是否合理。</p>
      </aside>
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
          lastResult: null
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
        streak: 0
      }
    });
    render();
  });

  root.querySelector("[data-start-beat]")?.addEventListener("click", async () => {
    await unlockAudio();
    stopTicker();
    const current = state.get();
    const patternConfig = current.beatGame.currentMeter === "3/4" ? beatGame.sectionB : beatGame.sectionA;
    const beatMs = 60000 / patternConfig.bpm;
    session = {
      startedAt: performance.now(),
      beatMs,
      pattern: patternConfig.pattern,
      beatIndex: 0
    };

    announceFeedback(feedback, current.beatGame.currentStep === "switch" ? "开始后听到第二段，点“变拍”按钮。" : "看光点，鼓心强拍，鼓边弱拍。");
    tickBeat(root, patternConfig.pattern);
    ticker = setInterval(() => tickBeat(root, patternConfig.pattern), beatMs);
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
        lastResult: null
      }
    });
    render();
  });

  root.querySelectorAll("[data-drum-zone]").forEach((button) => {
    button.addEventListener("pointerdown", () => {
      button.classList.add("is-hit");
      setTimeout(() => button.classList.remove("is-hit"), 180);

      if (!session) {
        const expectedZone = state.get().beatGame.currentStep === "intro" && button.dataset.drumZone === "center";
        announceFeedback(feedback, expectedZone ? "准！强拍在鼓心。" : "再听一听，强拍在鼓心。", expectedZone ? "good" : "warn");
        if (expectedZone) {
          onReward(1);
        }
        return;
      }

      const now = performance.now();
      const nearestBeat = Math.round((now - session.startedAt) / session.beatMs);
      const targetTime = session.startedAt + nearestBeat * session.beatMs;
      const result = evaluateBeatHit({
        pattern: session.pattern,
        beatIndex: nearestBeat,
        zone: button.dataset.drumZone,
        offsetMs: now - targetTime
      });

      if (result.result === "correct") {
        const current = state.get();
        const streak = current.beatGame.streak + 1;
        setState({
          ...current,
          beatGame: {
            ...current.beatGame,
            score: current.beatGame.score + 1,
            streak,
            lastResult: result.result
          }
        });
        playInstrument("hand-drum", { accent: button.dataset.drumZone === "center", volume: current.settings.volume });
        announceFeedback(feedback, streak >= 4 ? "小小花鼓手！连续四次真稳。" : result.message, "good");
        if (streak === 4) {
          onReward(2);
        }
      } else {
        const current = state.get();
        setState({
          ...current,
          beatGame: {
            ...current.beatGame,
            streak: 0,
            lastResult: result.result
          }
        });
        announceFeedback(feedback, result.message, result.result === "missed" ? "warn" : "bad");
      }
    });
  });

  root.querySelector(".primary-action")?.insertAdjacentHTML("afterend", '<button data-switch-now type="button">换到 3/4</button>');
  root.querySelector("[data-switch-now]")?.addEventListener("click", () => {
    if (!session) {
      announceFeedback(feedback, "先点开始，再挑战变拍。", "warn");
      return;
    }
    const result = evaluateMeterSwitch({
      elapsedMs: performance.now() - session.startedAt,
      switchAtMs: beatGame.switchChallenge.switchAtMs,
      toleranceMs: beatGame.switchChallenge.toleranceMs
    });
    announceFeedback(feedback, result.message, result.result === "correct" ? "good" : "warn");
    if (result.result === "correct") {
      onReward(2);
      setState({
        ...state.get(),
        beatGame: {
          ...state.get().beatGame,
          currentMeter: "3/4",
          currentStep: "practice"
        }
      });
      stopTicker();
      setTimeout(render, 600);
    }
  });
}

function tickBeat(root, pattern) {
  if (!session) {
    return;
  }

  const dots = root.querySelectorAll("[data-beat-dot]");
  dots.forEach((dot) => dot.classList.remove("is-now"));
  const activeIndex = session.beatIndex % pattern.length;
  dots[activeIndex]?.classList.add("is-now");
  session.beatIndex += 1;
}

