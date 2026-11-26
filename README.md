# 物理重力交互表盘

[English](README.en.md) · [打开网站](https://gravity-watch-face.xiaosang.cc/) · [GitHub](https://github.com/holynova/gravity-watch-face)

转动手机，18 套物理场景即刻响应重力倾斜：球场、金库、灯泡、骰子、冰块与瓷球之外，新增高弹力超级弹力球、揉皱纸球、原木圆球、天然石球与轻重对比鲜明的「纸木石混合」。

<img src="assets/screenshot.png" width="360" alt="手机上的重力互动场景">

内置 Kenney Impact Sounds 与 Meta Open Sound 开源拟音（CC0 实录音效）及分级触觉反馈；底栏换上辨识度更高的彩色矢量图标，并支持上一套 / 下一套快捷切换。

## 本地运行

```sh
npm install
npm run dev
```

局域网真机测试运动传感器时，运行 `npm run dev:https`。

从主分支 `main` 运行 `npm run deploy`，发布到已配置的 Cloudflare Worker。

<a href="https://gravity-watch-face.xiaosang.cc/"><img src="assets/qr.png" width="112" alt="扫码打开网站"></a>

执行 `git push origin main` 后，Cloudflare Workers Builds 会运行 `npm run build`，并部署正式站。
