const url = process.argv[2];

if (!url) {
  fail("请提供部署后的课堂 URL，例如：npm run check:url -- https://example.github.io/game/");
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  fail("URL 格式不正确。");
}

const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const blockedPatterns = [/^file:/i, /\/Users\//i, /微信临时|WeChat/i];

if (parsed.protocol !== "https:") {
  fail("课堂二维码必须使用 HTTPS 地址。");
}

if (blockedHosts.has(parsed.hostname)) {
  fail("课堂二维码不能指向本机地址。");
}

if (blockedPatterns.some((pattern) => pattern.test(url))) {
  fail("课堂二维码不能使用 file、本机绝对路径或微信临时文件路径。");
}

console.log(`课堂 URL 可用于生成二维码：${parsed.href}`);

function fail(message) {
  console.error(message);
  process.exit(1);
}
