# 部署与扫码验收

本项目是纯前端静态网页，可以部署到 GitHub Pages、Vercel 或学校可访问的 HTTPS 静态站点。

课堂所需的图片、采样音频和 Phaser 游戏库都随项目本地携带，不依赖公网 CDN。学校网络不好时，优先用下方“局域网备用方案”。

当前 GitHub Pages 课堂地址：

```text
https://pwld777.github.io/pawaluodi/
```

## 部署前本地验证

```bash
npm run verify
npm run serve
```

本地打开 `http://localhost:4173`，确认首页、花鼓、节奏、创编、展示五个视图都能切换。

如需交给技术老师或上传静态托管平台，可以生成课堂交付包：

```bash
npm run package:classroom
```

生成文件：`dist/huaer-yu-shaonian-classroom.zip`。

## GitHub Pages

1. 在 GitHub 创建新仓库。
2. 把本文件夹内容提交并推送到 `main` 分支。
3. 打开仓库 `Settings -> Pages`，Source 选择 `GitHub Actions`。
4. 等待 `Deploy static classroom game` 工作流完成。
5. 使用工作流输出的 `page_url` 作为课堂二维码地址。

项目已包含 `.github/workflows/pages.yml`，推送到 `main` 后会先运行 `npm run verify`，再部署静态页面。

部署完成后运行：

```bash
npm run check:url -- https://pwld777.github.io/pawaluodi/
```

## Vercel

1. 导入仓库到 Vercel。
2. Framework Preset 选择 `Other`。
3. Build Command 留空或填写 `npm run verify`。
4. Output Directory 留空或填写 `.`。
5. 部署完成后使用 Vercel 提供的 HTTPS URL 生成课堂二维码。

部署完成后运行：

```bash
npm run check:url -- https://你的项目.vercel.app/
```

## 二维码验收

二维码必须指向部署后的 HTTPS 地址，不要使用：

- `file://...`
- `/Users/...` 本机绝对路径
- `localhost`
- 微信临时文件路径

至少用两类设备扫码测试：

- 教师电脑或教室多媒体端
- 学生平板或手机

验收清单：

- 扫码一次进入首页。
- 底部导航能切换首页、花鼓、节奏、创编、展示。
- 花鼓鼓心/鼓边点击有反馈。
- 节奏题能重做并推进题目。
- 创编工坊能选择 4 个音色，能把谱例积木放入小节并播放。
- 刷新后本机进度能恢复。

## 局域网备用方案

如果学校网络暂时无法访问 GitHub Pages 或 Vercel，可以让教师电脑和学生设备连接同一个 Wi-Fi，然后运行：

```bash
npm run serve
npm run lan:urls
```

把 `npm run lan:urls` 输出的 `http://局域网IP:4173/` 做成临时二维码。这个方案只适合同一局域网内试课，不替代正式 HTTPS 部署。

现场注意：

- 不要让学生扫 `localhost`，这个地址只代表学生自己的设备。
- 不要让学生扫 `file://`、`/Users/...` 或微信临时文件路径。
- 如果学校 Wi-Fi 隔离学生设备，改用教师手机热点或一台便携路由器，让所有设备进同一个局域网。
- 课前先用一台学生设备扫码打开首页、花鼓、节奏、创编、展示五个视图。
