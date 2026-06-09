import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";

import { beatGame, evaluateBeatHit } from "../src/data/beat-patterns.js";
import { compositionInstruments, instruments } from "../src/data/instrument-sounds.js";
import { getAllowedBlocksForMeter, getPlaybackEvents, notationCards } from "../src/data/notation-cards.js";
import { rhythmQuestions, evaluateRhythmAnswer } from "../src/data/rhythm-questions.js";
import { addBlockToBar, clearCompositionBar, createDefaultComposition, createInitialState, placeBlockInBar, serializeState, restoreState } from "../src/modules/game-logic.js";
import { renderBeatGame } from "../src/modules/beat-game.js";
import { renderCompositionWorkshop } from "../src/modules/composition-workshop.js";
import { renderRhythmGame } from "../src/modules/rhythm-drag-game.js";

function localAssetPath(url) {
  return url.replace("./", "").replace(/\?.*$/, "");
}

test("beat patterns map 2/4 to strong-weak and 3/4 to strong-weak-weak", () => {
  assert.deepEqual(beatGame.sectionA.pattern, ["strong", "weak"]);
  assert.deepEqual(beatGame.sectionB.pattern, ["strong", "weak", "weak"]);
});

test("beat hit evaluation accepts correct zones without fixed tempo", () => {
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak"], beatIndex: 0, zone: "center", offsetMs: 9999 }).result, "correct");
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak"], beatIndex: 1, zone: "rim", offsetMs: -9999 }).result, "correct");
});

test("beat hit evaluation distinguishes reversed strong and weak zones", () => {
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak"], beatIndex: 0, zone: "rim", offsetMs: 40 }).result, "wrong-zone");
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak"], beatIndex: 1, zone: "center", offsetMs: 420 }).result, "wrong-zone");
});

test("beat game screen does not reveal strong and weak answers", () => {
  const html = renderBeatGame({
    state: createInitialState(),
    setState: () => {},
    onReward: () => {}
  });
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, "");

  assert.match(html, /data-drum-surface/);
  assert.match(html, /data-beat-dot/);
  assert.doesNotMatch(visibleText, /强|弱|鼓心|鼓边/);
  assert.doesNotMatch(html, /aria-label="[^"]*(强|弱|鼓心|鼓边)[^"]*"/);
});

test("3/4 beat evaluation treats the third beat as weak", () => {
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak", "weak"], beatIndex: 2, zone: "rim", offsetMs: 40 }).result, "correct");
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak", "weak"], beatIndex: 2, zone: "center", offsetMs: 40 }).result, "wrong-third-beat");
});

test("rhythm game asks only the two main section rhythm questions", () => {
  const notationIds = new Set(notationCards.map((card) => card.id));

  assert.deepEqual(rhythmQuestions.map((question) => question.id), ["section-a-main", "section-b-main"]);
  assert.equal(evaluateRhythmAnswer("section-a-main", ["sixteenth-run"]).correct, true);
  assert.equal(evaluateRhythmAnswer("section-b-main", ["half-note"]).correct, true);

  for (const question of rhythmQuestions) {
    assert.equal(question.type, "single");
    assert.ok(question.options.length >= 4);
    assert.equal(new Set(question.options).size, question.options.length);
    assert.ok(question.options.every((optionId) => notationIds.has(optionId)));
    assert.ok(question.answer.every((optionId) => notationIds.has(optionId)));
  }
});

test("rhythm game clamps old saved progress to the current two questions", () => {
  const state = createInitialState();
  state.rhythmGame = {
    currentQuestionIndex: 5,
    correctCount: 6,
    completedAnswers: {}
  };

  const html = renderRhythmGame({ state });

  assert.match(html, /第二乐段主节奏/);
  assert.match(html, /第 2 \/ 2 题/);
  assert.doesNotMatch(html, /第 6 \/ 2 题/);
});

test("saved rhythm progress is normalized to the current question set", () => {
  const restored = restoreState(JSON.stringify({
    currentView: "home",
    rhythmGame: {
      currentQuestionIndex: 5,
      correctCount: 6,
      completedAnswers: {
        "section-a-main": ["sixteenth-run"],
        "style-match": ["joyful-a", "lyrical-b"]
      }
    },
    composition: createDefaultComposition()
  }));

  assert.equal(restored.rhythmGame.currentQuestionIndex, 1);
  assert.equal(restored.rhythmGame.correctCount, rhythmQuestions.length);
  assert.deepEqual(restored.rhythmGame.completedAnswers, {
    "section-a-main": ["sixteenth-run"]
  });
});

test("composition defaults to a four-bar student phrase", () => {
  const composition = createDefaultComposition({ meter: "2/4" });
  assert.equal(composition.bars.length, 4);
  assert.equal(composition.bars.every((bar) => bar.capacity === 2), true);
  assert.equal(composition.activeBarIndex, 0);
  assert.equal(composition.isComplete, false);
  assert.equal(createInitialState().composition.bars.length, 4);
});

test("composition bars reject overfilled rhythm blocks", () => {
  const composition = createDefaultComposition({ meter: "2/4", bars: 4 });
  const afterHalf = addBlockToBar(composition, 0, "half-note");
  assert.equal(afterHalf.bars[0].filledBeats, 2);
  assert.equal(afterHalf.activeBarIndex, 1);
  assert.throws(() => addBlockToBar(afterHalf, 0, "quarter-note"), /放不下/);
});

test("composition advances one active bar at a time", () => {
  const start = createDefaultComposition({ meter: "2/4", bars: 2 });
  const first = addBlockToBar(start, 0, "quarter-note");
  assert.equal(first.activeBarIndex, 0);
  const second = addBlockToBar(first, 0, "quarter-note");
  assert.equal(second.activeBarIndex, 1);
  assert.equal(second.isComplete, false);
  const done = addBlockToBar(second, 1, "half-note");
  assert.equal(done.activeBarIndex, 1);
  assert.equal(done.isComplete, true);
});

test("composition bars can be replaced and cleared directly", () => {
  const start = createDefaultComposition({ meter: "2/4", bars: 4 });
  const filled = placeBlockInBar(start, 2, "half-note");
  assert.equal(filled.bars[2].status, "complete");
  assert.deepEqual(filled.bars[2].blocks, ["half-note"]);
  assert.equal(filled.activeBarIndex, 2);

  const replaced = placeBlockInBar(filled, 2, "quarter-note");
  assert.equal(replaced.bars[2].status, "partial");
  assert.equal(replaced.bars[2].filledBeats, 1);
  assert.deepEqual(replaced.bars[2].blocks, ["quarter-note"]);

  const cleared = clearCompositionBar(replaced, 2);
  assert.equal(cleared.bars[2].status, "empty");
  assert.equal(cleared.bars[2].filledBeats, 0);
  assert.deepEqual(cleared.bars[2].blocks, []);
});

test("composition allows 3/4 completion with a dotted half note", () => {
  const composition = createDefaultComposition({ meter: "3/4", bars: 4 });
  const next = addBlockToBar(composition, 0, "dotted-half-note");
  assert.equal(next.bars[0].status, "complete");
});

test("rhythm block playback expands internal hits", () => {
  assert.deepEqual(getPlaybackEvents("eighth-pair", 0), [
    { beat: 0, accent: true, sustainBeats: 0.18 },
    { beat: 0.5, accent: false, sustainBeats: 0.18 }
  ]);
  assert.deepEqual(getPlaybackEvents("sixteenth-run", 1), [
    { beat: 1, accent: true, sustainBeats: 0.12 },
    { beat: 1.25, accent: false, sustainBeats: 0.12 },
    { beat: 1.5, accent: false, sustainBeats: 0.12 },
    { beat: 1.75, accent: false, sustainBeats: 0.12 }
  ]);
  assert.deepEqual(getPlaybackEvents("eighth-sixteenth", 0), [
    { beat: 0, accent: true, sustainBeats: 0.16 },
    { beat: 0.5, accent: false, sustainBeats: 0.16 },
    { beat: 0.75, accent: false, sustainBeats: 0.16 }
  ]);
  assert.deepEqual(getPlaybackEvents("sixteenth-eighth", 0), [
    { beat: 0, accent: true, sustainBeats: 0.16 },
    { beat: 0.25, accent: false, sustainBeats: 0.16 },
    { beat: 0.5, accent: false, sustainBeats: 0.16 }
  ]);
  assert.deepEqual(getPlaybackEvents("quarter-note", 0), [
    { beat: 0, accent: true, sustainBeats: 0.85 }
  ]);
  assert.deepEqual(getPlaybackEvents("half-note", 0), [
    { beat: 0, accent: true, sustainBeats: 2 }
  ]);
  assert.deepEqual(getPlaybackEvents("dotted-half-note", 0), [
    { beat: 0, accent: true, sustainBeats: 3 }
  ]);
});

test("composition block filtering keeps oversized 3-beat blocks out of 2/4", () => {
  assert.equal(getAllowedBlocksForMeter("2/4").some((card) => card.id === "dotted-half-note"), false);
  assert.equal(getAllowedBlocksForMeter("3/4").some((card) => card.id === "dotted-half-note"), true);
});

test("composition workshop renders clear beat pits and rhythm-only cards", () => {
  const state = createInitialState();
  const html = renderCompositionWorkshop({ state });

  assert.match(html, /compose-game-shell/);
  assert.match(html, /data-compose-game-stage/);
  assert.match(html, /four-bar-board/);
  assert.match(html, /class="compose-bar-stage/);
  assert.equal((html.match(/class="compose-bar-stage/g) ?? []).length, 4);
  assert.match(html, /class="compose-beat-pit"/);
  assert.equal((html.match(/class="compose-beat-pit"/g) ?? []).length, 8);
  assert.equal((html.match(/data-clear-bar/g) ?? []).length, 4);
  assert.match(html, /data-clear-composition/);
  assert.match(html, /compose-action-dock/);
  assert.match(html, /data-play-composition/);
  assert.match(html, /compose-instrument-row/);
  assert.equal((html.match(/data-instrument=/g) ?? []).length, 4);
  assert.doesNotMatch(html, /compose-award/);
  assert.doesNotMatch(html, /<details class="compose-settings">/);
  assert.doesNotMatch(html, /闯关星标|真实音色|准备展示|把节奏块放进空坑|每小节刚好填满/);
  assert.match(html, /data-piece-beats="2"/);
  assert.match(html, /style="--tray-beats:2"/);
  const blockTray = html.match(/<div class="block-tray compose-main-tray">[\s\S]*?<\/div>\s*<\/section>/)?.[0] ?? "";
  assert.match(blockTray, /data-block-id="eighth-sixteenth"/);
  assert.match(blockTray, /data-block-id="sixteenth-eighth"/);
  assert.match(blockTray, /2 格/);
  assert.doesNotMatch(blockTray, /2 拍/);
  assert.doesNotMatch(blockTray, /ta-ka-di-mi|ta-ti|欢快|舒展|四分音符|二分音符|八分音符|十六分音符/);
});

test("composition workshop keeps instruments in the top strip", () => {
  const html = renderCompositionWorkshop({ state: createInitialState() });
  const topStrip = html.match(/<div class="compose-top-strip">[\s\S]*?<\/div>\s*<p class="feedback-pill/)?.[0] ?? "";

  assert.match(topStrip, /compose-instrument-row/);
  assert.equal((topStrip.match(/data-instrument=/g) ?? []).length, 4);
});

test("composition workshop edits bars without full rerender hooks", () => {
  const source = readFileSync("src/modules/composition-workshop.js", "utf8");
  const updateCompositionSource = source.match(/function updateComposition[\s\S]*?\n}\n\nexport function renderCompositionWorkshop/)?.[0] ?? "";
  const instrumentListenerSource = source.match(/root\.querySelectorAll\("\[data-instrument\]"[\s\S]*?\n  }\);/)?.[0] ?? "";

  assert.doesNotMatch(updateCompositionSource, /\brender\(\);/);
  assert.doesNotMatch(instrumentListenerSource, /\brender\(\);/);
});

test("composition playback passes note sustain to instruments", () => {
  const source = readFileSync("src/modules/composition-workshop.js", "utf8");
  assert.match(source, /sustainSeconds:\s*event\.sustainBeats \* beatMs \/ 1000/);
});

test("composition playback gives short tablet audio status feedback", () => {
  const source = readFileSync("src/modules/composition-workshop.js", "utf8");

  assert.match(source, /音色加载中/);
  assert.match(source, /播放中/);
  assert.match(source, /音色加载失败，再点一次/);
});

test("composition playback warms tablet audio with a recorded sample in the tap handler", () => {
  const workshopSource = readFileSync("src/modules/composition-workshop.js", "utf8");
  const audioSource = readFileSync("src/modules/audio-engine.js", "utf8");
  const playHandlerSource = workshopSource.match(/data-play-composition[\s\S]*?announceFeedback\(feedback, "播放中"/)?.[0] ?? "";

  assert.match(audioSource, /export function warmAudioWithRecordedSample/);
  assert.match(audioSource, /context\.createBufferSource/);
  assert.match(workshopSource, /warmAudioWithRecordedSample/);
  assert.match(playHandlerSource, /warmAudioWithRecordedSample\(current\.composition\.instrument\)/);
  assert.ok(playHandlerSource.indexOf("warmAudioWithRecordedSample") < playHandlerSource.indexOf("await unlockAudio"));
});

test("tablet landscape keeps scenic images proportioned and touch controls visible", () => {
  const tabletCss = readFileSync("src/styles/tablet.css", "utf8");

  assert.match(tabletCss, /min-width:\s*921px\)\s*and\s*\(max-width:\s*1280px\)\s*and\s*\(orientation:\s*landscape\)/);
  assert.match(tabletCss, /qinghai-folk-background\.jpg\?v=tablet-touch-15"\)\s*center top \/ cover no-repeat/);
  assert.match(tabletCss, /\.compose-arcade-stage\s*\{[\s\S]*aspect-ratio:\s*16 \/ 9/);
  assert.match(tabletCss, /\.compose-beat-pit,\s*\n\s*\.compose-rhythm-piece\s*\{[\s\S]*min-height:\s*118px/);
  assert.match(tabletCss, /\.compose-main-tray\s*\{[\s\S]*overflow-x:\s*auto/);
  assert.match(tabletCss, /\.huagu\s*\{[\s\S]*min-width:\s*500px/);
});

test("bottom navigation uses only page names", () => {
  const source = readFileSync("src/modules/navigation.js", "utf8");
  assert.doesNotMatch(source, /const icons|nav-icon|home:\s*"会"|beat:\s*"鼓"|rhythm:\s*"花"|compose:\s*"乐"|showcase:\s*"奖"/);
  assert.match(source, /button\.textContent = labels\[view\]/);
});

test("classroom shell loads Phaser from a local classroom asset", () => {
  const html = readFileSync("index.html", "utf8");
  assert.match(html, /"\.\/assets\/vendor\/phaser\.esm\.js\?v=tablet-touch-15"/);
  assert.doesNotMatch(html, /cdn\.jsdelivr\.net|unpkg\.com|phaser@3\.90\.0/);
  assert.equal(existsSync("assets/vendor/phaser.esm.js"), true);
});

test("app preserves the Phaser stage host when composition rerenders", () => {
  const appSource = readFileSync("src/app.js", "utf8");
  assert.match(appSource, /existingStage.*data-compose-game-stage/s);
  assert.match(appSource, /nextStage\.replaceWith\(existingStage\)/);
});

test("composition workshop exposes four classroom percussion instruments", () => {
  assert.deepEqual(compositionInstruments.map((instrument) => instrument.id), ["bass-drum", "triangle", "tambourine", "shaker"]);
  assert.deepEqual(compositionInstruments.map((instrument) => instrument.name), ["大鼓", "三角铁", "铃鼓", "沙锤"]);
});

test("instrument sample files exist for classroom playback", () => {
  for (const instrument of instruments) {
    assert.equal(existsSync(localAssetPath(instrument.sample.strong)), true, `${instrument.id} strong sample missing`);
    assert.equal(existsSync(localAssetPath(instrument.sample.weak)), true, `${instrument.id} weak sample missing`);
  }
});

test("tablet-critical media urls force fresh classroom assets", () => {
  const beatHtml = renderBeatGame({
    state: createInitialState(),
    setState: () => {},
    onReward: () => {}
  });
  const composeHtml = renderCompositionWorkshop({ state: createInitialState() });
  const composeStageSource = readFileSync("src/modules/compose-game-stage.js", "utf8");

  assert.match(beatHtml, /flower-drum-3d\.png\?v=tablet-touch-15/);
  assert.match(beatHtml, /fetchpriority="high"/);
  assert.match(composeHtml, /compose-stage-scene\.jpg\?v=tablet-touch-15/);
  assert.match(composeStageSource, /compose-stage-scene\.jpg\?v=tablet-touch-15/);
  for (const instrument of instruments) {
    assert.match(instrument.sample.strong, /\?v=tablet-touch-15$/);
    assert.match(instrument.sample.weak, /\?v=tablet-touch-15$/);
  }
});

test("tablet shell prioritizes drum image before delayed audio warmup", () => {
  const html = readFileSync("index.html", "utf8");
  const appSource = readFileSync("src/app.js", "utf8");

  assert.match(html, /rel="preload" as="image" href="\.\/assets\/images\/flower-drum-3d\.png\?v=tablet-touch-15"/);
  assert.match(appSource, /unlockAudio\(\)/);
  assert.match(appSource, /setTimeout\(\(\) => \{/);
  assert.match(appSource, /primeAudio/);
});

test("tablet-critical media assets stay lightweight enough for classroom loading", () => {
  assert.ok(statSync("assets/images/flower-drum-3d.png").size < 750_000);
  assert.ok(statSync("assets/images/qinghai-folk-background.jpg").size < 650_000);
  assert.ok(statSync("assets/images/compose-stage-scene.jpg").size < 450_000);
  assert.ok(statSync("assets/images/level-cards-sheet.jpg").size < 320_000);
  assert.ok(statSync("assets/instruments/real-instruments-sheet.jpg").size < 120_000);
  assert.ok(statSync("assets/audio/percussion/bass-drum-strong.wav").size < 450_000);
  assert.ok(statSync("assets/audio/percussion/bass-drum-soft.wav").size < 450_000);
  assert.ok(statSync("assets/audio/percussion/triangle-strong.wav").size < 500_000);
  assert.ok(statSync("assets/audio/percussion/triangle-soft.wav").size < 500_000);
});

test("composition instruments use recorded samples for classroom playback", () => {
  for (const instrument of instruments) {
    assert.equal(typeof instrument.sample.strong, "string", `${instrument.id} strong sample missing`);
    assert.equal(typeof instrument.sample.weak, "string", `${instrument.id} weak sample missing`);
    assert.equal("tone" in instrument, false, `${instrument.id} must not use synthesized tone config`);
    assert.match(readFileSync(localAssetPath(instrument.sample.strong)).subarray(0, 12).toString("ascii"), /^RIFF....WAVE/s);
    assert.match(readFileSync(localAssetPath(instrument.sample.weak)).subarray(0, 12).toString("ascii"), /^RIFF....WAVE/s);
  }
});

test("audio sample loading retries after a failed tablet request", async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const fetchCountByUrl = new Map();
  const failedOnce = new Set();

  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    async resume() {}
    async decodeAudioData() {
      return { duration: 1 };
    }
  }

  globalThis.window = { AudioContext: FakeAudioContext };
  globalThis.fetch = async (url) => {
    fetchCountByUrl.set(url, (fetchCountByUrl.get(url) ?? 0) + 1);
    if (!failedOnce.has(url)) {
      failedOnce.add(url);
      return { ok: false };
    }
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(16) };
  };

  try {
    const { preloadInstrument } = await import(`../src/modules/audio-engine.js?retry=${Date.now()}`);
    await assert.rejects(() => preloadInstrument("bass-drum"), /无法加载音色/);
    await preloadInstrument("bass-drum");
    assert.equal([...fetchCountByUrl.values()].every((count) => count === 2), true);
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
});

test("audio sample loading decodes embedded student data urls without fetch", async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  let fetchCalled = false;
  let decodedBytes = 0;

  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    async resume() {}
    async decodeAudioData(arrayBuffer) {
      decodedBytes = arrayBuffer.byteLength;
      return { duration: 1 };
    }
  }

  globalThis.window = { AudioContext: FakeAudioContext };
  globalThis.fetch = async () => {
    fetchCalled = true;
    return { ok: false };
  };

  try {
    const { __testOnlyLoadSample } = await import(`../src/modules/audio-engine.js?dataurl=${Date.now()}`);
    await __testOnlyLoadSample("data:audio/wav;base64,UklGRg==");
    assert.equal(fetchCalled, false);
    assert.equal(decodedBytes, 4);
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
});

test("instrument asset versioning leaves embedded student data urls intact", () => {
  const instrumentSource = readFileSync("src/data/instrument-sounds.js", "utf8");
  assert.match(instrumentSource, /path\.startsWith\("data:"\)/);
  assert.match(instrumentSource, /return path;/);
});

test("audio engine never falls back to synthesized instrument sounds", () => {
  const audioSource = readFileSync("src/modules/audio-engine.js", "utf8");
  const instrumentSource = readFileSync("src/data/instrument-sounds.js", "utf8");

  assert.doesNotMatch(audioSource, /createOscillator|playSynth|playNoise/);
  assert.doesNotMatch(instrumentSource, /\btone\s*:/);
});

test("flower drum uses separate center and surface hit samples", () => {
  const handDrum = instruments.find((instrument) => instrument.id === "hand-drum");
  assert.equal(localAssetPath(handDrum.sample.strong), "assets/audio/percussion/hand-drum-strong.wav");
  assert.equal(localAssetPath(handDrum.sample.weak), "assets/audio/percussion/hand-drum-rim.wav");
  assert.notEqual(handDrum.sample.strong, handDrum.sample.weak);
});

test("tablet audio is unlocked and warmed from the first classroom gesture", () => {
  const appSource = readFileSync("src/app.js", "utf8");
  const audioSource = readFileSync("src/modules/audio-engine.js", "utf8");

  assert.match(audioSource, /webkitAudioContext/);
  assert.match(audioSource, /export async function primeAudio/);
  assert.match(appSource, /primeAudio/);
  assert.match(appSource, /"pointerdown"/);
  assert.match(appSource, /"touchstart"/);
  assert.match(appSource, /"click"/);
  assert.match(appSource, /"keydown"/);
});

test("old composition instruments migrate to the new classroom set", () => {
  const savedHandDrum = serializeState({ currentView: "compose", composition: { ...createDefaultComposition(), instrument: "hand-drum" } });
  const savedWoodblock = serializeState({ currentView: "compose", composition: { ...createDefaultComposition(), instrument: "woodblock" } });
  assert.equal(restoreState(savedHandDrum).composition.instrument, "bass-drum");
  assert.equal(restoreState(savedWoodblock).composition.instrument, "triangle");
});

test("state serialization round-trips current view and composition", () => {
  const composition = addBlockToBar(createDefaultComposition({ meter: "2/4", bars: 2 }), 0, "half-note");
  const saved = serializeState({ currentView: "compose", composition });
  const restored = restoreState(saved);
  assert.equal(restored.currentView, "compose");
  assert.equal(restored.composition.bars[0].status, "complete");
});
