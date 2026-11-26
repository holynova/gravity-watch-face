# 物理重力交互表盘

[English](README.en.md) · [打开网站](https://gravity-watch-face.xiaosang.cc/) · [GitHub](https://github.com/holynova/gravity-watch-face)

转动手机，就能看着网球沿球场滚落，或让金条在盒子里重新堆叠。五套场景共用实时刚体物理，横屏和竖屏都能玩。

<img src="assets/screenshot.png" width="360" alt="手机上的重力互动场景">

选一套场景，用手机倾斜设备，或在桌面拖动倾角模拟器。全屏按钮能展开无黑边铺满的场地，纯净模式只保留地板、真实柔光阴影与物体。兼容设备还会提供碰撞振动。

## 本地运行

```sh
npm install
npm run dev
```

局域网真机测试运动传感器时，运行 `npm run dev:https`。

从主分支 `main` 运行 `npm run deploy`，发布到已配置的 Cloudflare Worker。

<a href="https://gravity-watch-face.xiaosang.cc/"><img src="assets/qr.png" width="112" alt="扫码打开网站"></a>

执行 `git push origin main` 后，Cloudflare Workers Builds 会运行 `npm run build`，并部署正式站。
