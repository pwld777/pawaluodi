import { networkInterfaces } from "node:os";

const port = process.argv[2] ?? "4173";
const urlSuffix = process.argv[3] ?? "";
const urls = [];

for (const interfaces of Object.values(networkInterfaces())) {
  for (const item of interfaces ?? []) {
    if (item.family !== "IPv4" || item.internal) {
      continue;
    }
    urls.push(`http://${item.address}:${port}/${urlSuffix}`);
  }
}

if (urls.length === 0) {
  console.error("没有找到可用于局域网访问的 IPv4 地址。请确认电脑已连接教室 Wi-Fi。");
  process.exit(1);
}

console.log("局域网备用访问地址：");
for (const url of urls) {
  console.log(`- ${url}`);
}
console.log("");
console.log("提示：局域网地址只适合作为学校网络受限时的备用方案；正式课堂二维码优先使用 HTTPS 部署地址。");
