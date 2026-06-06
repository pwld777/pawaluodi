import * as Phaser from "phaser";

const sceneAsset = "./assets/images/compose-stage-scene.png";

let game = null;

function destroyStage() {
  if (game) {
    game.destroy(true);
    game = null;
  }
}

function fitBackground(scene, image) {
  const scale = Math.max(scene.scale.width / image.width, scene.scale.height / image.height);
  image.setScale(scale);
  image.setPosition(scene.scale.width / 2, scene.scale.height / 2);
}

function makeText(scene, text, x, y, size = 28) {
  return scene.add.text(x, y, text, {
    fontFamily: "Trebuchet MS, sans-serif",
    fontSize: `${size}px`,
    fontStyle: "900",
    color: "#fff7d1",
    stroke: "#7c351a",
    strokeThickness: 7,
    shadow: {
      offsetX: 0,
      offsetY: 4,
      color: "#5c260e",
      blur: 4,
      fill: true
    }
  });
}

function drawPit(scene, pit, index) {
  const group = scene.add.group();
  const base = scene.add.graphics();
  const width = pit.capacity === 3 ? 96 : 132;
  const x = 244 + index * 178;
  const y = 228;

  base.fillStyle(pit.complete ? 0x84e36f : 0xfff3bf, pit.complete ? 0.9 : 0.72);
  base.lineStyle(5, pit.complete ? 0x2f7b2d : 0xb66c20, 0.9);
  base.fillRoundedRect(x, y, width, 92, 18);
  base.strokeRoundedRect(x, y, width, 92, 18);

  const label = makeText(scene, `${pit.filled}/${pit.capacity}`, x + width / 2 - 23, y + 24, 24);
  const glow = scene.add.graphics();
  glow.lineStyle(4, 0xffe066, 0.0);
  glow.strokeRoundedRect(x - 6, y - 6, width + 12, 104, 24);

  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.15, to: 0.75 },
    duration: 780,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut"
  });

  group.addMultiple([base, glow, label]);
  return group;
}

function drawRhythmCard(scene, card, index) {
  const x = 164 + (index % 5) * 126;
  const y = 450 + Math.floor(index / 5) * 98;
  const width = card.beats > 1 ? 112 + card.beats * 24 : 112;
  const shell = scene.add.graphics();

  shell.fillStyle(0xfff1a9, 0.94);
  shell.lineStyle(4, 0x973a1b, 0.92);
  shell.fillRoundedRect(x, y, width, 74, 16);
  shell.strokeRoundedRect(x, y, width, 74, 16);

  const tag = makeText(scene, `${card.beats}格`, x + 12, y + 10, 18);
  const note = makeText(scene, card.icon, x + width / 2 - 22, y + 20, 30);
  note.setStroke("#2e2619", 2);
  note.setColor("#2e2619");

  scene.tweens.add({
    targets: [shell, tag, note],
    y: `+=${index % 2 === 0 ? 5 : -5}`,
    duration: 900 + index * 45,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut"
  });
}

function launchStage(container, data) {
  destroyStage();
  container.setAttribute("data-stage-status", "phaser");

  class ComposeStageScene extends Phaser.Scene {
    preload() {
      this.load.image("composeStage", sceneAsset);
    }

    create() {
      const bg = this.add.image(0, 0, "composeStage");
      fitBackground(this, bg);

      const overlay = this.add.graphics();
      overlay.fillStyle(0x2c1308, 0.18);
      overlay.fillRoundedRect(70, 72, this.scale.width - 140, this.scale.height - 116, 32);

      makeText(this, "小乐队闯关台", 92, 92, 34);
      makeText(this, `${data.mode} · ${data.meter}`, 92, 142, 24);

      data.pits.forEach((pit, index) => drawPit(this, pit, index));
      data.cards.forEach((card, index) => drawRhythmCard(this, card, index));

      const star = makeText(this, "★", this.scale.width - 140, 92, 44);
      this.tweens.add({
        targets: star,
        scale: { from: 0.92, to: 1.18 },
        rotate: { from: -0.05, to: 0.08 },
        duration: 720,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });

      const cursor = this.add.graphics();
      cursor.fillStyle(0xfff15b, 0.88);
      cursor.fillCircle(0, 0, 12);
      cursor.setPosition(154, 354);
      this.tweens.add({
        targets: cursor,
        x: this.scale.width - 170,
        duration: 2400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
  }

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: 960,
    height: 620,
    backgroundColor: "#f6d27b",
    transparent: true,
    scene: ComposeStageScene,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  });
}

export function renderComposeGameStage({ root, composition, blocks }) {
  const host = root.querySelector("[data-compose-game-stage]");
  if (!host) {
    destroyStage();
    return;
  }

  const iconByPattern = {
    "sixteenth-run": "♬♬",
    "eighth-pair": "♫",
    "eighth-sixteenth": "♪♬",
    "sixteenth-eighth": "♬♪",
    "quarter-note": "♩",
    "half-note": "𝅗𝅥",
    "dotted-half-note": "𝅗𝅥.",
    "two-quarters": "♩♩",
    "three-quarters": "♩♩♩",
    "quarter-rest": "休"
  };

  launchStage(host, {
    mode: composition.mode,
    meter: composition.meter,
    pits: composition.bars.map((bar) => ({
      capacity: bar.capacity,
      filled: bar.filledBeats,
      complete: bar.status === "complete"
    })),
    cards: blocks.map((block) => ({
      beats: block.beats,
      icon: iconByPattern[block.pattern] ?? "♪"
    }))
  });
}
