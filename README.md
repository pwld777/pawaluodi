# 《花儿与少年》音乐课堂网页游戏

面向小学四年级音乐课堂的单页网页游戏原型。学生扫码进入同一个页面后，可以完成花鼓节拍挑战、节奏拖拽选择和拼图创编工坊。

## 本地运行

```bash
npm test
npm run serve
```

然后打开 `http://localhost:4173`。

## 验证

```bash
find src tests -name '*.js' -print0 | xargs -0 -n1 node --check
npm test
npm run verify
npm run check:url -- https://example.github.io/huaer-yu-shaonian/
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
- 创编工坊支持 2 小节创编、时值校验和 4 个 Web Audio 合成打击音色。
- 所有素材均为 CSS/SVG/合成音色临时资产，后续可替换为真实授权图片与采样。

## 部署提醒

课堂二维码应指向 GitHub Pages、Vercel 或学校可访问的 HTTPS 静态站点。不要把二维码指向 `file://`、本机绝对路径或只在开发电脑可访问的地址。

部署步骤和扫码验收清单见 [DEPLOYMENT.md](/Users/shishangbo/花儿与少年/DEPLOYMENT.md)。
