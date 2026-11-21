# Gravity Watch Face · 物理重力交互表盘

中文：基于 Three.js PBR、HDR 工作室环境光与 cannon-es 3D 刚体物理引擎打造的手机全屏重力互动空间。自适应横竖屏与全面屏尺寸，支持一键全屏与纯净无时钟展示；倾斜手机即可驱动网球场、钻石库、标准划线篮球场（8 片式纹理篮球）、黄金库与足球场五套主题实时翻滚，配多通道细腻震动反馈与桌面 360° 倾角模拟。

English: A mobile-first 3D physics interactive playground powered by Three.js PBR, procedural HDR studio lighting, and cannon-es rigid-body physics. Adapts cleanly across mobile screen sizes and orientations with one-tap fullscreen and a distraction-free floor-and-object view. Tilting your phone tumbles objects across five themes—Tennis, Diamonds, regulation Basketball court & 8-panel ball, Gold Bars, and Soccer—with layered haptic feedback and desktop 360° tilt simulation.

![Gravity Watch Face screenshot](./assets/screenshot.png)

## 在线体验 / Live Demo

- [Cloudflare Demo](https://gravity-watch-face.xiaosang.cc/)
- [GitHub Repo](https://github.com/holynova/gravity-watch-face)

<img src="./assets/qr.png" width="180" alt="扫码访问 Cloudflare 在线体验">

## 本地运行 / Run locally

```bash
npm install
npm run dev
```

For HTTPS mobile sensor testing over LAN:

```bash
npm run dev:https
```

## 发布 / Deploy

```bash
npm run deploy
```

Cloudflare Workers · Custom Domain: `gravity-watch-face.xiaosang.cc`

源码与部署配置均在 `main` 主分支维护；在本地构建并手动执行发布，不创建 Cloudflare 专用分支或 GitHub Action。
