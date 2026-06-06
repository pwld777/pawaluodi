import { getAllowedBlocksForMeter, getNotationCard, getPlaybackEvents } from "../data/notation-cards.js";
import { instruments } from "../data/instrument-sounds.js";
import { clearCompositionBar, placeBlockInBar, resetComposition } from "./game-logic.js";
import { playInstrument, preloadInstrument, unlockAudio } from "./audio-engine.js";
import { announceFeedback } from "./feedback.js";
import { renderRhythmMark } from "./rhythm-mark.js";

let playbackTimers = [];

function clearPlayback() {
  playbackTimers.forEach((timer) => clearTimeout(timer));
  playbackTimers = [];
}

function completionMessage(composition, barIndex, action = "place") {
  if (composition.isComplete || composition.bars.every((bar) => bar.status === "complete")) {
    return "排练成功！";
  }

  const bar = composition.bars[barIndex];
  if (action === "clear") {
    return "已清空";
  }

  const remaining = bar.capacity - bar.filledBeats;
  return remaining === 0 ? "刚好！" : (bar.blocks.length === 1 ? "已替换" : `还差 ${remaining} 格`);
}

function shakeBar(root, barIndex) {
  const bar = root.querySelector(`[data-bar-index="${barIndex}"]`);
  bar?.classList.remove("shake");
  void bar?.offsetWidth;
  bar?.classList.add("shake");
}

function shortFeedback(message) {
  if (!message) {
    return "选节奏块，填空坑";
  }

  if (message.includes("放不下")) {
    return "放不下";
  }

  if (message.includes("刚好")) {
    return "刚好！";
  }

  if (message.includes("排练成功")) {
    return "排练成功！";
  }

  if (message.includes("还差")) {
    return message.replace("拍", "格").replace("。", "");
  }

  return message;
}

function updateComposition({ root, state, setState, render, onReward, feedback, barIndex, action, blockId }) {
  try {
    const current = state.get();
    const nextComposition = action === "clear"
      ? clearCompositionBar(current.composition, barIndex)
      : placeBlockInBar(current.composition, barIndex, blockId);
    const filled = nextComposition.bars[barIndex].status === "complete";
    const message = completionMessage(nextComposition, barIndex, action);
    setState({
      ...current,
      composition: {
        ...nextComposition,
        feedbackMessage: message
      }
    });
    announceFeedback(feedback, message, filled ? "good" : "info");
    if (nextComposition.isComplete) {
      onReward(2);
    }
    render();
  } catch (error) {
    const message = shortFeedback(error.message);
    shakeBar(root, barIndex);
    announceFeedback(feedback, message, "warn");
    const current = state.get();
    setState({
      ...current,
      composition: {
        ...current.composition,
        feedbackMessage: message
      }
    });
  }
}

export function renderCompositionWorkshop({ state }) {
  const composition = state.composition;
  const blocks = getAllowedBlocksForMeter(composition.meter);
  const activeBarIndex = composition.activeBarIndex ?? 0;
  const feedbackMessage = shortFeedback(composition.feedbackMessage);

  return `
    <section class="compose-game-shell enter-view">
      <div class="compose-arcade-stage compose-quiet-stage">
        <div class="compose-stage-canvas" data-compose-game-stage aria-label="小乐队闯关台动画舞台">
          <img class="compose-stage-fallback" src="./assets/images/compose-stage-scene.png" alt="小乐队节奏闯关舞台">
        </div>

        <div class="compose-play-layer">
          <div class="compose-top-strip">
            <h2>节奏填坑闯关</h2>
            <strong>4 个小节一起填</strong>
            <label>节拍
              <select data-compose-meter>
                <option ${composition.meter === "2/4" ? "selected" : ""}>2/4</option>
                <option ${composition.meter === "3/4" ? "selected" : ""}>3/4</option>
              </select>
            </label>
            <label>段落
              <select data-compose-mode>
                <option ${composition.mode === "欢快段" ? "selected" : ""}>欢快段</option>
                <option ${composition.mode === "悠扬段" ? "selected" : ""}>悠扬段</option>
              </select>
            </label>
          </div>

          <p class="feedback-pill compose-feedback-main" id="composeFeedback" data-tone="info">${feedbackMessage}</p>

          <div class="four-bar-board" aria-label="四个小节">
            ${composition.bars.map((bar, index) => `
              <div class="compose-bar-stage ${bar.status} ${index === activeBarIndex ? "is-current" : ""}" data-bar-index="${index}" style="--bar-beats:${bar.capacity}">
                <div class="compose-bar-header">
                  <span>第 ${index + 1} 小节</span>
                  <button class="bar-clear-button" data-clear-bar="${index}" type="button" aria-label="清空第 ${index + 1} 小节">清空</button>
                </div>
                <div class="compose-bar-fill">
                  <div class="compose-beat-pits" aria-label="${composition.meter} 空坑">
                    ${Array.from({ length: bar.capacity }, (_, beatIndex) => `<i class="compose-beat-pit">${beatIndex + 1}</i>`).join("")}
                  </div>
                  <div class="placed-notes rhythm-pieces compose-rhythm-pieces" style="--bar-beats:${bar.capacity}">
                    ${bar.blocks.map((blockId) => {
                      const card = getNotationCard(blockId);
                      return `<span class="rhythm-piece compose-rhythm-piece" style="--piece-beats:${card.beats}" data-piece-beats="${card.beats}">
                        ${renderRhythmMark(card, "rhythm-mark-piece")}
                      </span>`;
                    }).join("")}
                  </div>
                </div>
              </div>
            `).join("")}
          </div>

          <div class="compose-bottom-actions">
            <button class="primary-action" data-play-composition type="button">播放</button>
            <button data-clear-composition type="button">重做</button>
          </div>

          <div class="compose-instrument-row" aria-label="选择乐器">
            ${instruments.map((instrument) => `
              <button class="${composition.instrument === instrument.id ? "active" : ""}" data-instrument="${instrument.id}" type="button" style="--instrument:${instrument.color}">
                <span class="instrument-photo" style="background-image:url('${instrument.image}'); background-position:${instrument.imagePosition}" aria-hidden="true"></span>
                <strong>${instrument.name}</strong>
              </button>
            `).join("")}
          </div>
        </div>
      </div>

      <div class="block-tray compose-main-tray">
        ${blocks.map((block) => `
          <button class="notation-card block-card" data-block-id="${block.id}" data-piece-beats="${block.beats}" type="button" style="--tray-beats:${block.beats}">
            <span class="card-tag">${block.beats} 格</span>
            ${renderRhythmMark(block, "rhythm-mark-card")}
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

export function bindCompositionWorkshop({ root, state, setState, render, onReward }) {
  const feedback = root.querySelector("#composeFeedback");
  let selectedBlockId = null;
  const composition = state.get().composition;
  const blocks = getAllowedBlocksForMeter(composition.meter);

  if (typeof window !== "undefined") {
    import("./compose-game-stage.js")
      .then(({ renderComposeGameStage }) => renderComposeGameStage({ root, composition, blocks }))
      .catch((error) => {
        const stage = root.querySelector("[data-compose-game-stage]");
        stage?.setAttribute("data-stage-status", "fallback");
        stage?.setAttribute("data-stage-error", error.message);
      });
  }

  root.querySelector("[data-compose-mode]")?.addEventListener("change", (event) => {
    const current = state.get();
    setState({
      ...current,
      composition: {
        ...current.composition,
        mode: event.target.value
      }
    });
    render();
  });

  root.querySelector("[data-compose-meter]")?.addEventListener("change", (event) => {
    const current = state.get();
    setState({
      ...current,
      composition: resetComposition({
        meter: event.target.value,
        instrument: current.composition.instrument,
        mode: event.target.value === "2/4" ? "欢快段" : "悠扬段"
      })
    });
    render();
  });

  root.querySelectorAll("[data-instrument]").forEach((button) => {
    button.addEventListener("click", () => {
      const current = state.get();
      const instrumentId = button.dataset.instrument;
      setState({
        ...current,
        composition: {
          ...current.composition,
          instrument: instrumentId
        }
      });
      render();
      unlockAudio()
        .then(() => playInstrument(instrumentId, { volume: current.settings.volume }))
        .catch(() => {
          // Browsers may deny audio until a trusted gesture; selection should still work.
        });
    });
  });

  root.querySelectorAll("[data-block-id]").forEach((block) => {
    block.addEventListener("pointerdown", (event) => {
      block.dataset.pointerDrag = "1";
      setTimeout(() => {
        delete block.dataset.pointerDrag;
      }, 0);
      startBlockDrag(event, block, root, (barIndex) => {
        updateComposition({
          root,
          state,
          setState,
          render,
          onReward,
          feedback,
          blockId: block.dataset.blockId,
          barIndex: Number.isInteger(barIndex) ? barIndex : 0
        });
      });
    });

    block.addEventListener("mousedown", (event) => {
      if (block.dataset.pointerDrag) {
        return;
      }
      startMouseBlockDrag(event, block, root, (barIndex) => {
        updateComposition({
          root,
          state,
          setState,
          render,
          onReward,
          feedback,
          blockId: block.dataset.blockId,
          barIndex: Number.isInteger(barIndex) ? barIndex : 0
        });
      });
    });

    block.addEventListener("click", () => {
      if (block.dataset.skipClick) {
        return;
      }

      selectedBlockId = block.dataset.blockId;
      root.querySelectorAll("[data-block-id]").forEach((candidate) => candidate.classList.toggle("is-selected", candidate === block));
      announceFeedback(feedback, "点小节", "info");
    });
  });

  root.querySelectorAll("[data-bar-index]").forEach((bar) => {
    bar.addEventListener("click", () => {
      if (!selectedBlockId) {
        announceFeedback(feedback, "选节奏块", "info");
        return;
      }

      try {
        const barIndex = Number(bar.dataset.barIndex);
        updateComposition({ root, state, setState, render, onReward, feedback, blockId: selectedBlockId, barIndex });
        selectedBlockId = null;
      } catch (error) {
        shakeBar(root, Number(bar.dataset.barIndex));
        announceFeedback(feedback, shortFeedback(error.message), "warn");
      }
    });
  });

  root.querySelectorAll("[data-clear-bar]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      clearPlayback();
      updateComposition({
        root,
        state,
        setState,
        render,
        onReward,
        feedback,
        action: "clear",
        barIndex: Number(button.dataset.clearBar)
      });
    });
  });

  root.querySelector("[data-clear-composition]")?.addEventListener("click", () => {
    clearPlayback();
    const current = state.get();
    setState({
      ...current,
      composition: resetComposition({
        meter: current.composition.meter,
        instrument: current.composition.instrument,
        mode: current.composition.mode
      })
    });
    render();
  });

  root.querySelector("[data-play-composition]")?.addEventListener("click", async () => {
    await unlockAudio();
    clearPlayback();
    const current = state.get();
    await preloadInstrument(current.composition.instrument).catch(() => {});
    const beatMs = current.composition.meter === "2/4" ? 625 : 830;

    current.composition.bars.forEach((bar, barIndex) => {
      let blockStartBeat = 0;
      bar.blocks.forEach((blockId, blockIndex) => {
        const card = getNotationCard(blockId);
        getPlaybackEvents(blockId, blockStartBeat).forEach((event) => {
          const timer = setTimeout(() => {
            playInstrument(current.composition.instrument, { volume: current.settings.volume, accent: event.accent || blockIndex === 0 });
          }, (barIndex * bar.capacity + event.beat) * beatMs);
          playbackTimers.push(timer);
        });

        const highlightTimer = setTimeout(() => {
          root.querySelectorAll(".music-bar").forEach((barNode) => barNode.classList.remove("is-playing"));
          root.querySelector(`[data-bar-index="${barIndex}"]`)?.classList.add("is-playing");
        }, barIndex * bar.capacity * beatMs + blockStartBeat * beatMs);
        playbackTimers.push(highlightTimer);
        blockStartBeat += card.beats;
      });
    });

    const cursor = current.composition.bars.length * current.composition.bars[0].capacity * beatMs;
    playbackTimers.push(setTimeout(() => {
      root.querySelectorAll(".music-bar").forEach((barNode) => barNode.classList.remove("is-playing"));
      announceFeedback(feedback, "小乐队排练成功！", "good");
    }, cursor + 80));
  });
}

function startBlockDrag(event, element, root, onDrop) {
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  element.setPointerCapture?.(event.pointerId);
  element.classList.add("is-dragging");

  function move(moveEvent) {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    element.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 20}deg)`;
    root.querySelectorAll("[data-bar-index]").forEach((bar) => {
      bar.classList.toggle("is-hot", isInside(moveEvent, bar));
    });
  }

  function up(upEvent) {
    element.classList.remove("is-dragging");
    element.style.transform = "";
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", up);
    const bar = [...root.querySelectorAll("[data-bar-index]")].find((candidate) => isInside(upEvent, candidate));
    root.querySelectorAll("[data-bar-index]").forEach((candidate) => candidate.classList.remove("is-hot"));
    if (bar) {
      element.dataset.skipClick = "1";
      setTimeout(() => {
        delete element.dataset.skipClick;
      }, 160);
      onDrop(Number(bar.dataset.barIndex));
    }
  }

  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", up);
}

function startMouseBlockDrag(event, element, root, onDrop) {
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  element.classList.add("is-dragging");

  function move(moveEvent) {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    element.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 20}deg)`;
    root.querySelectorAll("[data-bar-index]").forEach((bar) => {
      bar.classList.toggle("is-hot", isInside(moveEvent, bar));
    });
  }

  function up(upEvent) {
    element.classList.remove("is-dragging");
    element.style.transform = "";
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
    const bar = [...root.querySelectorAll("[data-bar-index]")].find((candidate) => isInside(upEvent, candidate));
    root.querySelectorAll("[data-bar-index]").forEach((candidate) => candidate.classList.remove("is-hot"));
    if (bar) {
      element.dataset.skipClick = "1";
      setTimeout(() => {
        delete element.dataset.skipClick;
      }, 160);
      onDrop(Number(bar.dataset.barIndex));
    }
  }

  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
}

function isInside(event, target) {
  const rect = target.getBoundingClientRect();
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}
