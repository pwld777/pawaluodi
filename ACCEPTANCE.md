# MVP 验收矩阵

来源：`花儿与少年音乐游戏整体架构与推进计划.md` 的“第一版最小可用范围”和“课堂测试与部署”。

## 已落地并已验证

| 要求 | 当前实现 | 证据 |
| --- | --- | --- |
| 一个首页和底部导航 | `index.html` + `src/app.js` 实现首页、花鼓、节奏、创编、展示 5 个视图 | 浏览器烟测横屏和竖屏五个视图均可切换，无控制台错误 |
| 花鼓游戏 2/4、3/4、变拍三模式 | `src/modules/beat-game.js` + `src/data/beat-patterns.js` | `npm run verify` 覆盖强弱拍、错区、漏拍、变拍早/准/晚 |
| 节奏拖拽 6 道题 | `src/modules/rhythm-drag-game.js` + `src/data/rhythm-questions.js` | `npm run verify` 覆盖 2/4、3/4、疏密和风格题答案 |
| 创编工坊 4 小节标准节奏拼图 | `src/modules/composition-workshop.js` + `src/modules/game-logic.js` | `npm run verify` 覆盖默认 4 小节、小节容量、超出拒绝、3/4 附点二分音符完成 |
| 至少 4 个音色可播放 | `src/data/instrument-sounds.js` + `src/modules/audio-engine.js` | `npm run verify` 覆盖 4 个乐器 id；真实采样资源通过本地 HTTP 200 检查 |
| 平板横屏适配 | `src/styles/base.css` + `src/styles/tablet.css` | 浏览器烟测 `1180x820` 五视图可渲染，无控制台错误 |
| 平板竖屏可用 | `src/styles/tablet.css` | 浏览器烟测 `768x1024` 五视图可渲染，无横向溢出级别错误 |
| 本机状态保存 | `localStorage` 状态序列化 | `npm run verify` 覆盖状态序列化/恢复 |
| 不依赖本机绝对资源路径 | 所有运行时资源使用相对路径；采样许可证记录来源 | `rg -n "/Users|file://" index.html src assets README.md package.json` 仅命中文档或许可证说明，不命中代码引用 |
| 部署前验证命令 | `npm run verify` | 已运行通过，13/13 测试通过 |
| HTTPS 二维码 URL 校验 | `scripts/validate-classroom-url.mjs` | `npm run check:url -- https://pwld777.github.io/pawaluodi/` 通过；`http://localhost:4173` 被拒绝 |
| 学校网络受限时的局域网备用地址 | `scripts/print-lan-urls.mjs` | `npm run lan:urls` 可输出同 Wi-Fi 访问地址 |

## 已完成部署

| 要求 | 当前准备 | 缺口 |
| --- | --- | --- |
| GitHub Pages HTTPS 访问 | `.github/workflows/pages.yml` 已部署到 `https://pwld777.github.io/pawaluodi/` | 无 |
| 用部署后的 HTTPS 地址生成课堂二维码 | `npm run check:url -- https://pwld777.github.io/pawaluodi/` 已通过 | 需要按该 URL 生成实际二维码图片 |
| 至少 2 台真实设备扫码测试 | `DEPLOYMENT.md` 提供设备验收清单 | 需要真实教室网络或学生设备 |

## 当前验证命令

```bash
npm run verify
npm run check:url -- https://pwld777.github.io/pawaluodi/
npm run lan:urls
npm run serve
```
