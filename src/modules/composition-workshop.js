import { getAllowedBlocksForMeter, getNotationCard } from "../data/notation-cards.js";
import { instruments } from "../data/instrument-sounds.js";
import { addBlockToBar, resetComposition } from "./game-logic.js";
import { playInstrument, unlockAudio } from "./audio-engine.js";
import { announceFeedback } from "./feedback.js";

let playbackTimers = [];

function clearPlayback() {
  playbackTimers.forEach((timer) => clearTimeout(timer));
  playbackTimers = [];
}

export function renderCompositionWorkshop({ state }) {
  const composition = state.composition;
  const blocks = getAllowedBlocksForMeter(composition.meter);

  return `
    <section class="compose-grid enter-view">
      <aside class="toolbox stage-card">
        <p class="eyebrow">游戏三</p>
        <h2>拼图创编工坊</h2>
        <label>创编段落
          <select data-compose-mode>
            <option ${composition.mode === "欢快段" ? "selected" : ""}>欢快段</option>
            <option ${composition.mode === "悠扬段" ? "selected" : ""}>悠扬段</option>
          </select>
        </label>
        <label>节拍
          <select data-compose-meter>
            <option ${composition.meter === "2/4" ? "selected" : ""}>2/4</option>
            <option ${composition.meter === "3/4" ? "selected" : ""}>3/4</option>
          </select>
        </label>
        <div class="instrument-grid">
          ${instruments.map((instrument) => `
            <button class="${composition.instrument === instrument.id ? "active" : ""}" data-instrument="${instrument.id}" type="button" style="--instrument:${instrument.color}">
              <span>${instrument.symbol}</span>${instrument.name}
            </button>
          `).join("")}
        </div>
        <div class="control-row">
          <button class="primary-action" data-play-composition type="button">播放</button>
          <button data-clear-composition type="button">清空</button>
        </div>
        <p class="feedback-pill" id="composeFeedback" data-tone="info">${composition.feedbackMessage ?? "把谱例积木拖进小节，刚好装满会亮起。"}</p>
      </aside>

      <div class="stage-card score-paper">
        <div class="score-title">
          <strong>${composition.mode}</strong>
          <span>${composition.meter}</span>
        </div>
        <div class="bar-row">
          ${composition.bars.map((bar, index) => `
            <div class="music-bar ${bar.status}" data-bar-index="${index}">
              <span class="bar-number">第 ${index + 1} 小节</span>
              <div class="staff-lines"><i></i><i></i><i></i><i></i><i></i></div>
              <div class="placed-notes">
                ${bar.blocks.map((blockId) => `<span>${getNotationCard(blockId).glyph}</span>`).join("")}
              </div>
              <small>${bar.filledBeats}/${bar.capacity} 拍</small>
            </div>
          `).join("")}
        </div>
        <div class="block-tray">
          ${blocks.map((block) => `
            <button class="notation-card block-card" data-block-id="${block.id}" type="button">
              <span class="card-tag">${block.beats} 拍</span>
              <span class="block-glyph">${block.glyph}</span>
              <strong>${block.name}</strong>
              <small>${block.mood}</small>
            </button>
          `).join("")}
        </div>
      </div>

      <aside class="review-card stage-card">
        <h3>互评贴纸</h3>
        <span>节拍稳定</span>
        <span>两段有对比</span>
        <span>音色合适</span>
        <span>有创意</span>
      </aside>
    </section>
  `;
}

export function bindCompositionWorkshop({ root, state, setState, render, onReward }) {
  const feedback = root.querySelector("#composeFeedback");
  let selectedBlockId = null;

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
      try {
        const current = state.get();
        const nextComposition = addBlockToBar(current.composition, barIndex, block.dataset.blockId);
        const filled = nextComposition.bars[barIndex].status === "complete";
        const message = filled ? "这一小节刚好装满！" : "还差一点，再补一块。";
        setState({
          ...current,
          composition: {
            ...nextComposition,
            feedbackMessage: message
          }
        });
        announceFeedback(feedback, message, filled ? "good" : "info");
        if (nextComposition.bars.every((bar) => bar.status === "complete")) {
          onReward(2);
        }
        render();
      } catch (error) {
        announceFeedback(feedback, error.message, "warn");
      }
      });
    });

    block.addEventListener("mousedown", (event) => {
      if (block.dataset.pointerDrag) {
        return;
      }
      startMouseBlockDrag(event, block, root, (barIndex) => {
        try {
          const current = state.get();
          const nextComposition = addBlockToBar(current.composition, barIndex, block.dataset.blockId);
          const filled = nextComposition.bars[barIndex].status === "complete";
          const message = filled ? "这一小节刚好装满！" : "还差一点，再补一块。";
          setState({
            ...current,
            composition: {
              ...nextComposition,
              feedbackMessage: message
            }
          });
          announceFeedback(feedback, message, filled ? "good" : "info");
          if (nextComposition.bars.every((bar) => bar.status === "complete")) {
            onReward(2);
          }
          render();
        } catch (error) {
          announceFeedback(feedback, error.message, "warn");
        }
      });
    });

    block.addEventListener("click", () => {
      selectedBlockId = block.dataset.blockId;
      root.querySelectorAll("[data-block-id]").forEach((candidate) => candidate.classList.toggle("is-selected", candidate === block));
      announceFeedback(feedback, `已选中 ${block.querySelector("strong")?.textContent ?? "谱例积木"}，再点一个小节。`, "info");
    });
  });

  root.querySelectorAll("[data-bar-index]").forEach((bar) => {
    bar.addEventListener("click", () => {
      if (!selectedBlockId) {
        announceFeedback(feedback, "先选一张谱例积木，再点小节。", "info");
        return;
      }

      try {
        const current = state.get();
        const nextComposition = addBlockToBar(current.composition, Number(bar.dataset.barIndex), selectedBlockId);
        const filled = nextComposition.bars[Number(bar.dataset.barIndex)].status === "complete";
        const message = filled ? "这一小节刚好装满！" : "还差一点，再补一块。";
        setState({
          ...current,
          composition: {
            ...nextComposition,
            feedbackMessage: message
          }
        });
        selectedBlockId = null;
        announceFeedback(feedback, message, filled ? "good" : "info");
        if (nextComposition.bars.every((item) => item.status === "complete")) {
          onReward(2);
        }
        render();
      } catch (error) {
        announceFeedback(feedback, error.message, "warn");
      }
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
    const beatMs = current.composition.meter === "2/4" ? 625 : 830;
    let cursor = 0;

    current.composition.bars.forEach((bar, barIndex) => {
      bar.blocks.forEach((blockId, blockIndex) => {
        const card = getNotationCard(blockId);
        const timer = setTimeout(() => {
          playInstrument(current.composition.instrument, { volume: current.settings.volume, accent: blockIndex === 0 });
          root.querySelectorAll(".music-bar").forEach((barNode) => barNode.classList.remove("is-playing"));
          root.querySelector(`[data-bar-index="${barIndex}"]`)?.classList.add("is-playing");
        }, cursor);
        playbackTimers.push(timer);
        cursor += card.beats * beatMs;
      });
    });

    playbackTimers.push(setTimeout(() => {
      root.querySelectorAll(".music-bar").forEach((barNode) => barNode.classList.remove("is-playing"));
      announceFeedback(feedback, "播放完成，可以展示给同桌听。", "good");
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
