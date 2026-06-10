import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, relative } from "node:path";

const root = process.cwd();
const distDir = join(root, "dist");
const offlineDir = join(distDir, "offline");
const bundlePath = join(offlineDir, "app.bundle.js");
const offlineHtmlPath = join(offlineDir, "musicgame-offline.html");

const assetVersion = "qq-safe-25";
const cssEntries = [
  "src/styles/base.css",
  "src/styles/animations.css",
  "src/styles/tablet.css"
];

const assetEntries = [
  "assets/images/compose-stage-scene.jpg",
  "assets/images/flower-drum-3d.png",
  "assets/images/flower-drum-tablet.png",
  "assets/images/flower-drum-real.png",
  "assets/images/game-lobby-scene.png",
  "assets/images/home-hero-scene.png",
  "assets/images/level-cards-sheet.jpg",
  "assets/images/qinghai-folk-background.jpg",
  "assets/instruments/bass-drum.svg",
  "assets/instruments/real-instruments-sheet.jpg",
  "assets/instruments/triangle.svg",
  "assets/audio/percussion/bass-drum-soft.wav",
  "assets/audio/percussion/bass-drum-strong.wav",
  "assets/audio/percussion/hand-drum-rim.wav",
  "assets/audio/percussion/hand-drum-strong.wav",
  "assets/audio/percussion/maracas.wav",
  "assets/audio/percussion/shaker.wav",
  "assets/audio/percussion/tambourine.wav",
  "assets/audio/percussion/triangle-soft.wav",
  "assets/audio/percussion/triangle-strong.wav",
  "assets/audio/percussion/woodblock.wav"
];

const mimeTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".wav", "audio/wav"]
]);

function getMimeType(path) {
  const dotIndex = path.lastIndexOf(".");
  const extension = dotIndex === -1 ? "" : path.slice(dotIndex).toLowerCase();
  const mimeType = mimeTypes.get(extension);
  if (!mimeType) {
    throw new Error(`未配置 MIME 类型：${path}`);
  }
  return mimeType;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAllAssetReferences(content, assetDataUrls) {
  let output = content;

  for (const [assetPath, dataUrl] of assetDataUrls) {
    const variants = [
      `../../${assetPath}`,
      `./${assetPath}`,
      `../${assetPath}`,
      assetPath
    ].sort((left, right) => right.length - left.length);

    for (const variant of variants) {
      const pattern = new RegExp(`${escapeRegExp(variant)}(?:\\?v=${escapeRegExp(assetVersion)})?`, "g");
      output = output.replace(pattern, dataUrl);
    }
  }

  return output;
}

async function buildAssetDataUrls() {
  const entries = [];

  for (const assetPath of assetEntries) {
    const bytes = await readFile(join(root, assetPath));
    entries.push([assetPath, `data:${getMimeType(assetPath)};base64,${bytes.toString("base64")}`]);
  }

  return entries;
}

async function buildCss(assetDataUrls) {
  const sections = [];

  for (const entry of cssEntries) {
    const css = await readFile(join(root, entry), "utf8");
    sections.push(`/* ${entry} */\n${css}`);
  }

  return replaceAllAssetReferences(sections.join("\n\n"), assetDataUrls);
}

function bundleJavaScript() {
  const result = spawnSync(
    "npx",
    [
      "--yes",
      "esbuild",
      "src/app.js",
      "--bundle",
      "--format=iife",
      "--alias:phaser=./assets/vendor/phaser.esm.js",
      `--outfile=${bundlePath}`
    ],
    {
      cwd: root,
      encoding: "utf8"
    }
  );

  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status ?? 1);
  }

  if (result.stderr.trim()) {
    console.warn(result.stderr.trim());
  }
}

function extractBody(html) {
  const match = html.match(/<body>([\s\S]*)<\/body>/);
  if (!match) {
    throw new Error("无法从 index.html 提取 body。");
  }
  return match[1].replace(/<script type="module"[\s\S]*?<\/script>/, "").trim();
}

async function writeOfflineHtml({ css, script }) {
  const sourceHtml = await readFile(join(root, "index.html"), "utf8");
  const body = extractBody(sourceHtml);
  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>花儿与少年音乐课堂游戏（离线版）</title>
    <link rel="icon" href="data:,">
    <style>
${css}
    </style>
  </head>
  <body>
${body}
    <script>
${script}
    </script>
  </body>
</html>
`;

  await writeFile(offlineHtmlPath, html);
}

await mkdir(offlineDir, { recursive: true });
bundleJavaScript();

const assetDataUrls = await buildAssetDataUrls();
const css = await buildCss(assetDataUrls);
const rawScript = await readFile(bundlePath, "utf8");
const script = replaceAllAssetReferences(rawScript, assetDataUrls);

await writeOfflineHtml({ css, script });

console.log(`离线单文件已生成：${relative(root, offlineHtmlPath)}`);
