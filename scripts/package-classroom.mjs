import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const distDir = join(root, "dist");
const packageDir = join(distDir, "huaer-yu-shaonian-classroom");
const zipPath = join(distDir, "huaer-yu-shaonian-classroom.zip");

const entries = [
  ".github",
  ".nojekyll",
  "index.html",
  "package.json",
  "scripts",
  "src",
  "assets",
  "tests",
  "README.md",
  "DEPLOYMENT.md",
  "ACCEPTANCE.md",
  "vercel.json"
];

await rm(packageDir, { recursive: true, force: true });
await rm(zipPath, { force: true });
await mkdir(packageDir, { recursive: true });

for (const entry of entries) {
  await cp(join(root, entry), join(packageDir, entry), { recursive: true });
}

await writeFile(
  join(packageDir, "CLASSROOM_README.txt"),
  [
    "《花儿与少年》音乐课堂网页游戏",
    "",
    "1. 部署前运行 npm run verify。",
    "2. 将本文件夹部署到 GitHub Pages、Vercel 或学校 HTTPS 静态站点。",
    "3. 用部署后的 HTTPS 地址生成二维码。",
    "4. 不要使用 file://、localhost 或 /Users/... 作为学生扫码地址。",
    "5. 课堂验收清单见 DEPLOYMENT.md 和 ACCEPTANCE.md。"
  ].join("\n")
);

const zipResult = spawnSync("zip", ["-qry", zipPath, "huaer-yu-shaonian-classroom"], {
  cwd: distDir,
  encoding: "utf8"
});

if (zipResult.status !== 0) {
  console.error(zipResult.stderr || "生成 zip 失败。");
  process.exit(zipResult.status ?? 1);
}

console.log(`课堂交付包已生成：${zipPath}`);
