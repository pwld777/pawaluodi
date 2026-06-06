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

      makeText(this, "节奏填坑", 92, 92, 34);

      if (data.isComplete) {
        const star = makeText(this, "★", this.scale.width - 150, 92, 50);
        this.tweens.add({
          targets: star,
          scale: { from: 0.6, to: 1.25 },
          alpha: { from: 0.45, to: 1 },
          duration: 520,
          yoyo: true,
          repeat: 2,
          ease: "Sine.easeInOut"
        });
      }
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

  launchStage(host, {
    isComplete: composition.isComplete || composition.bars.every((bar) => bar.status === "complete")
  });
}
