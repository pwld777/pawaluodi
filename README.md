# 《花儿与少年》音乐课堂网页游戏

面向小学四年级音乐课堂的单页网页游戏原型。学生扫码进入同一个页面后，可以完成花鼓节拍挑战、节奏拖拽选择和拼图创编工坊。

## 本地运行

```bash
npm test
npm run serve
```

然后打开 `http://localhost:4173`。

## 学校网络不好时

本项目的课堂资源已随项目本地携带，包括图片、采样音频和 Phaser 游戏库，不需要临时访问公网 CDN。

如果学校访问 GitHub Pages、Vercel 或外网很慢，可以在教师电脑上运行：

```bash
npm run serve
npm run lan:urls
```

让学生设备和教师电脑连接同一个 Wi-Fi 或手机热点，把 `npm run lan:urls` 输出的 `http://局域网IP:4173/` 做成临时二维码即可。不要直接双击 `index.html` 给学生扫码，也不要把二维码指向 `localhost` 或 `/Users/...` 本机路径。

## 课堂地址

GitHub Pages 已部署：

```text
https://pwld777.github.io/pawaluodi/
```

## 验证

```bash
find src tests scripts \( -name '*.js' -o -name '*.mjs' \) -print0 | xargs -0 -n1 node --check
npm test
npm run verify
npm run check:url -- https://pwld777.github.io/pawaluodi/
npm run lan:urls
npm run package:classroom
```

已用浏览器烟测覆盖：

- 首页、花鼓、节奏、创编、展示五个视图导航切换。
- 平板横屏 `1180x820` 与竖屏 `768x1024` 渲染。
- 花鼓鼓心点击反馈。
- 节奏题重做后从第 1 题答对推进到第 2 题。
- 创编工坊点选谱例积木后放入小节，并保留完成反馈。

## 第一版范围

- 纯前端静态网页，无后端依赖。
- 本机状态使用 `localStorage` 保存。
- 花鼓节拍挑战支持 2/4、3/4 和变拍窗口练习。
- 节奏拖拽选择包含 4 道谱例卡题。
- 创编工坊支持 4 小节标准节奏拼图、时值校验和按学生拼图节奏播放。
- 已接入 image2 生成的大厅/关卡情景图、真实花鼓图和真实打击乐采样；缺少精确单件采样时保留 Web Audio fallback。

## 部署提醒

课堂二维码应指向 GitHub Pages、Vercel 或学校可访问的 HTTPS 静态站点。不要把二维码指向 `file://`、本机绝对路径或只在开发电脑可访问的地址。

部署步骤和扫码验收清单见 [DEPLOYMENT.md](DEPLOYMENT.md)。
