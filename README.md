# 物理重力交互表盘

[English](README.en.md) · [打开网站](https://gravity-watch-face.xiaosang.cc/) · [GitHub](https://github.com/holynova/gravity-watch-face)

转动手机，13 套物理场景即刻响应重力倾斜：球场与金库之外，新增钨丝灯泡、氦气气球、赌桌骰子、玻璃弹珠、威士忌冰块、霓虹弹力球、精工钢珠与青花瓷球。

<img src="assets/screenshot.png" width="360" alt="手机上的重力互动场景">

轻击气球可戳破撒花，猛摔或双击玻璃、灯泡与瓷球会触发裂纹与碎裂效果。全屏展开无黑边铺满场地与精确柔光阴影，兼容设备随材质提供差异化触觉反馈。

## 本地运行

```sh
npm install
npm run dev
```

局域网真机测试运动传感器时，运行 `npm run dev:https`。

从主分支 `main` 运行 `npm run deploy`，发布到已配置的 Cloudflare Worker。

<a href="https://gravity-watch-face.xiaosang.cc/"><img src="assets/qr.png" width="112" alt="扫码打开网站"></a>

执行 `git push origin main` 后，Cloudflare Workers Builds 会运行 `npm run build`，并部署正式站。
