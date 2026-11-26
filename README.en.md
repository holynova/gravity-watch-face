# Gravity Watch Face

[简体中文](README.md) · [Open the site](https://gravity-watch-face.xiaosang.cc/) · [GitHub](https://github.com/holynova/gravity-watch-face)

Tilt your phone to roll tennis balls across the court or let gold bars pile up against one wall. Five scenes share real-time rigid-body physics and adapt to portrait or landscape.

<img src="assets/screenshot.png" width="360" alt="Gravity playground on a phone">

Choose Tennis, Diamonds, Basketball, Gold Bars or Soccer. On desktop, drag the tilt simulator. Fullscreen expands the borderless court. Pure view keeps only the floor, soft shadows and objects. Compatible devices provide haptic feedback.

## Run locally

```sh
npm install
npm run dev
```

For mobile sensor testing on your local network, run `npm run dev:https`.

Publish the Cloudflare Worker from `main` with `npm run deploy`.

<a href="https://gravity-watch-face.xiaosang.cc/"><img src="assets/qr.png" width="112" alt="Scan to open the site"></a>

Cloudflare Workers Builds runs `npm run build` and deploys the production Worker after `git push origin main`.
