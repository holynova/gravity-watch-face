# Gravity Watch Face

[简体中文](README.md) · [Open the site](https://gravity-watch-face.xiaosang.cc/) · [GitHub](https://github.com/holynova/gravity-watch-face)

Tilt your phone or drag the desktop gimbal to tumble 13 real-time 3D PBR physics scenes: Tennis, Diamonds, Basketball, Gold Bars, Soccer, Edison Bulbs, Party Balloons, Casino Dice, Glass Marbles, Ice Cubes, Jelly Balls, Chrome Bearings, and Porcelain Orbs.

<img src="assets/screenshot.png" width="360" alt="Gravity playground on a phone">

Tap balloons to pop confetti, double-tap or slam glass marbles, bulbs, ice cubes, and porcelain orbs for crackles and shatters, and enjoy borderless full-bleed grounds with analytical soft shadows and material-specific haptics.

## Run locally

```sh
npm install
npm run dev
```

For mobile sensor testing on your local network, run `npm run dev:https`.

Publish the Cloudflare Worker from `main` with `npm run deploy`.

<a href="https://gravity-watch-face.xiaosang.cc/"><img src="assets/qr.png" width="112" alt="Scan to open the site"></a>

Cloudflare Workers Builds runs `npm run build` and deploys the production Worker after `git push origin main`.
