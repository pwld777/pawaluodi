import test from "node:test";
import assert from "node:assert/strict";

import { classifyDrumHit } from "../src/modules/beat-game.js";

test("flower drum sound zone follows the visual drum position", () => {
  const size = { width: 660, height: 482 };

  assert.equal(classifyDrumHit({ ...size, x: 330, y: 149 }), "center");
  assert.equal(classifyDrumHit({ ...size, x: 330, y: 241 }), "center");
  assert.equal(classifyDrumHit({ ...size, x: 112, y: 149 }), "rim");
  assert.equal(classifyDrumHit({ ...size, x: 330, y: 366 }), "rim");
});
