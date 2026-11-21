import * as THREE from 'three';
import { ThemeId } from './types';

export interface ThemeTextureSet {
  floorMap: THREE.CanvasTexture;
  floorRoughnessMap?: THREE.CanvasTexture;
  floorBumpMap?: THREE.CanvasTexture;
  itemMap?: THREE.CanvasTexture;
  itemBumpMap?: THREE.CanvasTexture;
  itemRoughnessMap?: THREE.CanvasTexture;
  sparkleMap?: THREE.CanvasTexture;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return [canvas, ctx];
}

function toTexture(
  canvas: HTMLCanvasElement,
  colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace,
  anisotropy = 8,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = colorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function hash2D(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

// ---------- Floors ----------

function createTennisCourtTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 2048;
  const [canvas, ctx] = makeCanvas(W, H);

  // Outer green apron (deep Roland Garros emerald)
  ctx.fillStyle = '#143723';
  ctx.fillRect(0, 0, W, H);

  // Subtle green apron grain
  const img = ctx.getImageData(0, 0, W, H);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const px = (i / 4) % W;
    const py = Math.floor(i / 4 / W);
    const n = (hash2D(px * 0.6, py * 0.6) - 0.5) * 14;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  // Inner moist terracotta clay rectangle
  const cx0 = Math.round(W * 0.13);
  const cw = Math.round(W * 0.74);
  const cy0 = Math.round(H * 0.11);
  const ch = Math.round(H * 0.78);

  ctx.fillStyle = '#a53f28';
  ctx.fillRect(cx0, cy0, cw, ch);

  // Clay mineral grain inside court
  const clayImg = ctx.getImageData(cx0, cy0, cw, ch);
  const cd = clayImg.data;
  for (let i = 0; i < cd.length; i += 4) {
    const px = (i / 4) % cw;
    const py = Math.floor(i / 4 / cw);
    const fine = (hash2D(px * 0.85, py * 0.85) - 0.5) * 24;
    const streak = (hash2D(Math.floor(px * 0.12), py * 0.08) - 0.5) * 10;
    const delta = fine + streak;
    cd[i] = Math.max(0, Math.min(255, cd[i] + delta));
    cd[i + 1] = Math.max(0, Math.min(255, cd[i + 1] + delta * 0.6));
    cd[i + 2] = Math.max(0, Math.min(255, cd[i + 2] + delta * 0.45));
  }
  ctx.putImageData(clayImg, cx0, cy0);

  // Subtle net shadow across center
  const netGrad = ctx.createLinearGradient(0, H * 0.48, 0, H * 0.52);
  netGrad.addColorStop(0, 'rgba(0,0,0,0)');
  netGrad.addColorStop(0.5, 'rgba(0,0,0,0.34)');
  netGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = netGrad;
  ctx.fillRect(cx0 - 30, H * 0.48, cw + 60, H * 0.04);

  // Crisp regulation white court markings
  ctx.strokeStyle = 'rgba(246, 245, 240, 0.94)';
  ctx.lineWidth = 8;
  ctx.strokeRect(cx0, cy0, cw, ch);

  // Singles sidelines
  const sx0 = cx0 + Math.round(cw * 0.13);
  const sx1 = cx0 + cw - Math.round(cw * 0.13);
  ctx.beginPath();
  ctx.moveTo(sx0, cy0);
  ctx.lineTo(sx0, cy0 + ch);
  ctx.moveTo(sx1, cy0);
  ctx.lineTo(sx1, cy0 + ch);

  // Service lines
  const syTop = cy0 + Math.round(ch * 0.235);
  const syBot = cy0 + Math.round(ch * 0.765);
  ctx.moveTo(sx0, syTop);
  ctx.lineTo(sx1, syTop);
  ctx.moveTo(sx0, syBot);
  ctx.lineTo(sx1, syBot);

  // Center service line
  const midX = W * 0.5;
  ctx.moveTo(midX, syTop);
  ctx.lineTo(midX, syBot);

  // Baseline center marks
  ctx.moveTo(midX, cy0);
  ctx.lineTo(midX, cy0 + 26);
  ctx.moveTo(midX, cy0 + ch);
  ctx.lineTo(midX, cy0 + ch - 26);
  ctx.stroke();

  // Subtle net cord line
  ctx.strokeStyle = 'rgba(235, 238, 235, 0.42)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx0 - 28, H * 0.5);
  ctx.lineTo(cx0 + cw + 28, H * 0.5);
  ctx.stroke();

  // Inner edge shadow vignette (deepened perimeter recess)
  const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.2, W * 0.5, H * 0.5, H * 0.64);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.7, 'rgba(0,0,0,0.16)');
  vig.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  return toTexture(canvas);
}

function createBasketballCourtTextures(): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const W = 1024;
  const H = 2048;
  const [canvas, ctx] = makeCanvas(W, H);
  const [rCanvas, rCtx] = makeCanvas(W, H);

  ctx.fillStyle = '#1d1713';
  ctx.fillRect(0, 0, W, H);
  rCtx.fillStyle = '#686868';
  rCtx.fillRect(0, 0, W, H);

  // Smoked walnut vertical hardwood planks
  const plankCount = 26;
  const plankW = W / plankCount;
  for (let p = 0; p < plankCount; p++) {
    const x = p * plankW;
    let y = -Math.floor(hash2D(p, 1.3) * 180);
    while (y < H) {
      const len = 260 + Math.floor(hash2D(p, y * 0.02) * 320);
      const tone = hash2D(p * 3.1, y * 0.07);
      const r = Math.round(25 + tone * 18);
      const g = Math.round(19 + tone * 14);
      const b = Math.round(16 + tone * 11);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, plankW + 0.5, len);

      const rough = Math.round(92 + tone * 34);
      rCtx.fillStyle = `rgb(${rough},${rough},${rough})`;
      rCtx.fillRect(x, y, plankW + 0.5, len);

      // Fine vertical wood grain lines
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      for (let s = 0; s < 5; s++) {
        const gx = x + hash2D(p + s * 0.3, y) * (plankW - 3);
        ctx.fillRect(gx, y, 1.5, len);
      }

      // Plank butt joint
      ctx.fillStyle = 'rgba(6,4,3,0.72)';
      ctx.fillRect(x, y, plankW, 2);

      y += len;
    }

    // Vertical plank seam
    ctx.fillStyle = 'rgba(6,4,3,0.75)';
    ctx.fillRect(x, 0, 2, H);
  }

  // Court perimeter & markings
  const mx = Math.round(W * 0.08);
  const my = Math.round(H * 0.055);
  const cw = W - mx * 2;
  const ch = H - my * 2;

  ctx.strokeStyle = 'rgba(235, 231, 224, 0.86)';
  ctx.lineWidth = 6;
  ctx.strokeRect(mx, my, cw, ch);

  // Half-court line & center circle
  const midX = W * 0.5;
  const midY = H * 0.5;
  ctx.beginPath();
  ctx.moveTo(mx, midY);
  ctx.lineTo(mx + cw, midY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(midX, midY, cw * 0.145, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(midX, midY, cw * 0.048, 0, Math.PI * 2);
  ctx.stroke();

  // Draw top & bottom half-court markings (3pt arc, key, free-throw circle, rim)
  const drawHalf = (isTop: boolean) => {
    const baseline = isTop ? my : my + ch;
    const dir = isTop ? 1 : -1;
    const hoopY = baseline + dir * (ch * 0.055);
    const keyW = cw * 0.32;
    const keyH = ch * 0.195;
    const keyTop = isTop ? baseline : baseline - keyH;

    // Free-throw lane
    ctx.strokeRect(midX - keyW * 0.5, keyTop, keyW, keyH);

    // Free-throw circle (outer solid arc + inner dashed arc)
    const ftY = baseline + dir * keyH;
    const ftR = keyW * 0.5;
    ctx.beginPath();
    ctx.arc(midX, ftY, ftR, isTop ? 0 : Math.PI, isTop ? Math.PI : Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.arc(midX, ftY, ftR, isTop ? Math.PI : 0, isTop ? Math.PI * 2 : Math.PI);
    ctx.stroke();
    ctx.restore();

    // 3-point corner lines & arc
    const threeR = cw * 0.425;
    const cornerXOffset = threeR;
    const arcCenterY = hoopY;
    const cornerEndY = arcCenterY + dir * (ch * 0.085);

    ctx.beginPath();
    ctx.moveTo(midX - cornerXOffset, baseline);
    ctx.lineTo(midX - cornerXOffset, cornerEndY);
    ctx.moveTo(midX + cornerXOffset, baseline);
    ctx.lineTo(midX + cornerXOffset, cornerEndY);
    ctx.stroke();

    const dy = cornerEndY - arcCenterY;
    const angle = Math.asin(Math.min(0.99, Math.abs(dy) / threeR));
    ctx.beginPath();
    if (isTop) {
      ctx.arc(midX, arcCenterY, threeR, angle, Math.PI - angle);
    } else {
      ctx.arc(midX, arcCenterY, threeR, Math.PI + angle, Math.PI * 2 - angle);
    }
    ctx.stroke();

    // Backboard & hoop ring
    const boardY = baseline + dir * (ch * 0.036);
    ctx.beginPath();
    ctx.moveTo(midX - cw * 0.08, boardY);
    ctx.lineTo(midX + cw * 0.08, boardY);
    ctx.moveTo(midX, boardY);
    ctx.lineTo(midX, hoopY - dir * 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(midX, hoopY, 16, 0, Math.PI * 2);
    ctx.stroke();
  };

  drawHalf(true);
  drawHalf(false);

  // Subtle dark court vignette
  const vig = ctx.createRadialGradient(midX, midY, W * 0.2, midX, midY, H * 0.65);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.48)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  return {
    map: toTexture(canvas),
    roughnessMap: toTexture(rCanvas, THREE.NoColorSpace),
  };
}

function createSoccerPitchTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 2048;
  const [canvas, ctx] = makeCanvas(W, H);

  const stripes = 10;
  const stripeH = H / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#27511b' : '#336522';
    ctx.fillRect(0, i * stripeH, W, stripeH + 1);
  }

  // Organic turf noise
  const img = ctx.getImageData(0, 0, W, H);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const px = (i / 4) % W;
    const py = Math.floor(i / 4 / W);
    const n = (hash2D(px * 0.9, py * 0.9) - 0.5) * 20;
    data[i] = Math.max(0, Math.min(255, data[i] + n * 0.7));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n * 0.55));
  }
  ctx.putImageData(img, 0, 0);

  // Crisp white pitch lines
  const mx = Math.round(W * 0.08);
  const my = Math.round(H * 0.06);
  const pw = W - mx * 2;
  const ph = H - my * 2;
  const midX = W * 0.5;
  const midY = H * 0.5;

  ctx.strokeStyle = 'rgba(244, 248, 240, 0.88)';
  ctx.lineWidth = 7;
  ctx.strokeRect(mx, my, pw, ph);

  // Halfway line & center circle
  ctx.beginPath();
  ctx.moveTo(mx, midY);
  ctx.lineTo(mx + pw, midY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(midX, midY, pw * 0.16, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(244, 248, 240, 0.9)';
  ctx.beginPath();
  ctx.arc(midX, midY, 8, 0, Math.PI * 2);
  ctx.fill();

  const drawBox = (isTop: boolean) => {
    const goalY = isTop ? my : my + ph;
    const dir = isTop ? 1 : -1;
    const penW = pw * 0.56;
    const penH = ph * 0.145;
    const boxW = pw * 0.26;
    const boxH = ph * 0.055;

    ctx.strokeRect(midX - penW * 0.5, isTop ? goalY : goalY - penH, penW, penH);
    ctx.strokeRect(midX - boxW * 0.5, isTop ? goalY : goalY - boxH, boxW, boxH);

    const spotY = goalY + dir * (ph * 0.102);
    ctx.beginPath();
    ctx.arc(midX, spotY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Penalty arc extending outside penalty box
    const penEdgeY = goalY + dir * penH;
    const arcR = pw * 0.15;
    const dy = Math.abs(penEdgeY - spotY);
    const angle = Math.acos(Math.min(0.99, dy / arcR));
    ctx.beginPath();
    if (isTop) {
      ctx.arc(midX, spotY, arcR, Math.PI * 0.5 - angle, Math.PI * 0.5 + angle);
    } else {
      ctx.arc(midX, spotY, arcR, -Math.PI * 0.5 - angle, -Math.PI * 0.5 + angle);
    }
    ctx.stroke();
  };

  drawBox(true);
  drawBox(false);

  // Corner arcs
  const cR = 26;
  ctx.beginPath();
  ctx.arc(mx, my, cR, 0, Math.PI * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(mx + pw, my, cR, Math.PI * 0.5, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(mx + pw, my + ph, cR, Math.PI, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(mx, my + ph, cR, Math.PI * 1.5, Math.PI * 2);
  ctx.stroke();

  const vig = ctx.createRadialGradient(midX, midY, W * 0.22, midX, midY, H * 0.65);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.46)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  return toTexture(canvas);
}

function createVaultFloorTexture(tintHex: string): THREE.CanvasTexture {
  const S = 512;
  const [canvas, ctx] = makeCanvas(S, S);
  ctx.fillStyle = tintHex;
  ctx.fillRect(0, 0, S, S);

  const grad = ctx.createRadialGradient(S * 0.5, S * 0.5, S * 0.08, S * 0.5, S * 0.5, S * 0.68);
  grad.addColorStop(0, 'rgba(255,255,255,0.03)');
  grad.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  return toTexture(canvas);
}

// ---------- Object PBR Maps ----------

function createTennisBallTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const W = 512;
  const H = 256;
  const [canvas, ctx] = makeCanvas(W, H);
  const [bCanvas, bCtx] = makeCanvas(W, H);

  const cImg = ctx.createImageData(W, H);
  const bImg = bCtx.createImageData(W, H);
  const cd = cImg.data;
  const bd = bImg.data;

  // Parametric 3D tennis ball seam curve on unit sphere
  const samples = 220;
  const curve = new Float32Array(samples * 3);
  const a = 0.65;
  const b = 0.35;
  const k = 2 * Math.sqrt(a * b);
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    curve[i * 3] = a * Math.cos(t) + b * Math.cos(3 * t);
    curve[i * 3 + 1] = a * Math.sin(t) - b * Math.sin(3 * t);
    curve[i * 3 + 2] = k * Math.sin(2 * t);
  }

  const cosSeamOuter = Math.cos(0.085);
  const cosSeamInner = Math.cos(0.056);

  for (let py = 0; py < H; py++) {
    const v = (py + 0.5) / H;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const ny = Math.cos(phi);

    for (let px = 0; px < W; px++) {
      const u = (px + 0.5) / W;
      const theta = u * Math.PI * 2;
      const nx = -sinPhi * Math.cos(theta);
      const nz = sinPhi * Math.sin(theta);

      let maxDot = -1;
      for (let s = 0; s < samples; s++) {
        const d = nx * curve[s * 3] + ny * curve[s * 3 + 1] + nz * curve[s * 3 + 2];
        if (d > maxDot) maxDot = d;
      }

      const idx = (py * W + px) * 4;
      const feltNoise = (hash2D(px * 1.37, py * 1.37) - 0.5) * 26;

      if (maxDot >= cosSeamInner) {
        // White rubber seam
        cd[idx] = 240;
        cd[idx + 1] = 242;
        cd[idx + 2] = 232;
        cd[idx + 3] = 255;
        bd[idx] = bd[idx + 1] = bd[idx + 2] = 70;
        bd[idx + 3] = 255;
      } else if (maxDot >= cosSeamOuter) {
        // Dark crisp seam border
        const t = (maxDot - cosSeamOuter) / (cosSeamInner - cosSeamOuter);
        cd[idx] = Math.round(145 + t * 85);
        cd[idx + 1] = Math.round(168 + t * 65);
        cd[idx + 2] = Math.round(45 + t * 180);
        cd[idx + 3] = 255;
        const bVal = Math.round(45 + t * 25);
        bd[idx] = bd[idx + 1] = bd[idx + 2] = bVal;
        bd[idx + 3] = 255;
      } else {
        // Optic yellow fuzzy felt (saturated for authentic light-to-shadow modeling)
        cd[idx] = Math.max(0, Math.min(255, Math.round(192 + feltNoise)));
        cd[idx + 1] = Math.max(0, Math.min(255, Math.round(224 + feltNoise * 0.85)));
        cd[idx + 2] = Math.max(0, Math.min(255, Math.round(34 + feltNoise * 0.6)));
        cd[idx + 3] = 255;
        const bVal = Math.max(0, Math.min(255, Math.round(170 + feltNoise * 2.2)));
        bd[idx] = bd[idx + 1] = bd[idx + 2] = bVal;
        bd[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(cImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  return {
    map: toTexture(canvas),
    bumpMap: toTexture(bCanvas, THREE.NoColorSpace),
  };
}

function createBasketballTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const W = 512;
  const H = 256;
  const [canvas, ctx] = makeCanvas(W, H);
  const [bCanvas, bCtx] = makeCanvas(W, H);

  const cImg = ctx.createImageData(W, H);
  const bImg = bCtx.createImageData(W, H);
  const cd = cImg.data;
  const bd = bImg.data;

  const seamW = 0.036;

  for (let py = 0; py < H; py++) {
    const phi = ((py + 0.5) / H) * Math.PI;
    const sinPhi = Math.sin(phi);
    const ny = Math.cos(phi);

    for (let px = 0; px < W; px++) {
      const theta = ((px + 0.5) / W) * Math.PI * 2;
      const nx = -sinPhi * Math.cos(theta);
      const nz = sinPhi * Math.sin(theta);

      // Authentic basketball rib equations on 3D unit sphere
      const dEq = Math.abs(ny);
      const dMer = Math.abs(nz);
      const ang = Math.atan2(ny, nz);
      const poleAng = Math.acos(Math.min(1, Math.abs(nx)));
      const target = 0.72 + 0.24 * Math.cos(2 * ang);
      const dOval = Math.abs(poleAng - target);

      const minDist = Math.min(dEq, dMer, dOval);
      const idx = (py * W + px) * 4;

      // Dense 3D pebble bumps independent of UV pole pinching
      const pebble =
        Math.sin(nx * 145) * Math.sin(ny * 145) * Math.sin(nz * 145) * 0.5 +
        (hash2D(px * 0.9, py * 0.9) - 0.5) * 0.3;

      if (minDist < seamW) {
        const edge = Math.min(1, (seamW - minDist) / 0.012);
        cd[idx] = Math.round(18 + (1 - edge) * 60);
        cd[idx + 1] = Math.round(14 + (1 - edge) * 28);
        cd[idx + 2] = Math.round(12 + (1 - edge) * 16);
        cd[idx + 3] = 255;
        const bVal = Math.round(40 + (1 - edge) * 60);
        bd[idx] = bd[idx + 1] = bd[idx + 2] = bVal;
        bd[idx + 3] = 255;
      } else {
        const shade = pebble * 15;
        cd[idx] = Math.max(0, Math.min(255, Math.round(184 + shade)));
        cd[idx + 1] = Math.max(0, Math.min(255, Math.round(58 + shade * 0.6)));
        cd[idx + 2] = Math.max(0, Math.min(255, Math.round(18 + shade * 0.35)));
        cd[idx + 3] = 255;
        const bVal = Math.max(0, Math.min(255, Math.round(165 + pebble * 74)));
        bd[idx] = bd[idx + 1] = bd[idx + 2] = bVal;
        bd[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(cImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  return {
    map: toTexture(canvas),
    bumpMap: toTexture(bCanvas, THREE.NoColorSpace),
  };
}

function createSoccerBallTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const W = 512;
  const H = 256;
  const [canvas, ctx] = makeCanvas(W, H);
  const [bCanvas, bCtx] = makeCanvas(W, H);

  const cImg = ctx.createImageData(W, H);
  const bImg = bCtx.createImageData(W, H);
  const cd = cImg.data;
  const bd = bImg.data;

  // 12 normalized icosahedron vertices = pentagon centers
  const g = (1 + Math.sqrt(5)) / 2;
  const rawVerts: [number, number, number][] = [
    [-1, g, 0],
    [1, g, 0],
    [-1, -g, 0],
    [1, -g, 0],
    [0, -1, g],
    [0, 1, g],
    [0, -1, -g],
    [0, 1, -g],
    [g, 0, -1],
    [g, 0, 1],
    [-g, 0, -1],
    [-g, 0, 1],
  ];
  const pentCenters = rawVerts.map(([x, y, z]) => {
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l] as [number, number, number];
  });

  // 20 dual dodecahedron vertices (face centroids) = hexagon centers
  const hexCenters: [number, number, number][] = [];
  for (let i = 0; i < 12; i++) {
    for (let j = i + 1; j < 12; j++) {
      const dij =
        pentCenters[i][0] * pentCenters[j][0] +
        pentCenters[i][1] * pentCenters[j][1] +
        pentCenters[i][2] * pentCenters[j][2];
      if (dij < 0.4) continue;
      for (let k = j + 1; k < 12; k++) {
        const dik =
          pentCenters[i][0] * pentCenters[k][0] +
          pentCenters[i][1] * pentCenters[k][1] +
          pentCenters[i][2] * pentCenters[k][2];
        const djk =
          pentCenters[j][0] * pentCenters[k][0] +
          pentCenters[j][1] * pentCenters[k][1] +
          pentCenters[j][2] * pentCenters[k][2];
        if (dik > 0.4 && djk > 0.4) {
          const sx = pentCenters[i][0] + pentCenters[j][0] + pentCenters[k][0];
          const sy = pentCenters[i][1] + pentCenters[j][1] + pentCenters[k][1];
          const sz = pentCenters[i][2] + pentCenters[j][2] + pentCenters[k][2];
          const l = Math.hypot(sx, sy, sz);
          hexCenters.push([sx / l, sy / l, sz / l]);
        }
      }
    }
  }

  // Exact truncated icosahedron Voronoi weight: r_pent / r_hex ≈ 0.796
  const ratio = 0.796;

  for (let py = 0; py < H; py++) {
    const phi = ((py + 0.5) / H) * Math.PI;
    const sinPhi = Math.sin(phi);
    const ny = Math.cos(phi);

    for (let px = 0; px < W; px++) {
      const theta = ((px + 0.5) / W) * Math.PI * 2;
      const nx = -sinPhi * Math.cos(theta);
      const nz = sinPhi * Math.sin(theta);

      let maxDotP = -1;
      for (let i = 0; i < 12; i++) {
        const d = nx * pentCenters[i][0] + ny * pentCenters[i][1] + nz * pentCenters[i][2];
        if (d > maxDotP) maxDotP = d;
      }

      let maxDotH = -1;
      let secondDotH = -1;
      for (let i = 0; i < hexCenters.length; i++) {
        const d = nx * hexCenters[i][0] + ny * hexCenters[i][1] + nz * hexCenters[i][2];
        if (d > maxDotH) {
          secondDotH = maxDotH;
          maxDotH = d;
        } else if (d > secondDotH) {
          secondDotH = d;
        }
      }

      const dP = Math.acos(Math.min(1, Math.max(-1, maxDotP)));
      const dH1 = Math.acos(Math.min(1, Math.max(-1, maxDotH)));
      const dH2 = Math.acos(Math.min(1, Math.max(-1, secondDotH)));

      const isPent = dP < ratio * dH1;
      const borderPH = Math.abs(dP - ratio * dH1);
      const borderHH = isPent ? 1 : Math.abs(dH2 - dH1);
      const seamDist = Math.min(borderPH, borderHH * 0.85);

      const idx = (py * W + px) * 4;
      const leatherGrain = (hash2D(px * 1.1, py * 1.1) - 0.5) * 10;

      if (seamDist < 0.022) {
        // Stitched panel seam groove
        const gShade = Math.round(95 + (seamDist / 0.022) * 55);
        cd[idx] = gShade;
        cd[idx + 1] = gShade;
        cd[idx + 2] = gShade + 2;
        cd[idx + 3] = 255;
        bd[idx] = bd[idx + 1] = bd[idx + 2] = 40;
        bd[idx + 3] = 255;
      } else if (isPent) {
        const val = Math.max(12, Math.min(48, Math.round(25 + leatherGrain * 0.5)));
        cd[idx] = val;
        cd[idx + 1] = val;
        cd[idx + 2] = val + 3;
        cd[idx + 3] = 255;
        const bVal = Math.round(170 + leatherGrain * 2);
        bd[idx] = bd[idx + 1] = bd[idx + 2] = bVal;
        bd[idx + 3] = 255;
      } else {
        const val = Math.max(198, Math.min(238, Math.round(224 + leatherGrain * 0.6)));
        cd[idx] = val;
        cd[idx + 1] = val;
        cd[idx + 2] = val - 2;
        cd[idx + 3] = 255;
        const bVal = Math.round(190 + leatherGrain * 2);
        bd[idx] = bd[idx + 1] = bd[idx + 2] = bVal;
        bd[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(cImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  return {
    map: toTexture(canvas),
    bumpMap: toTexture(bCanvas, THREE.NoColorSpace),
  };
}

function createGoldIngotTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const W = 512;
  const H = 1024;
  const [canvas, ctx] = makeCanvas(W, H);
  const [bCanvas, bCtx] = makeCanvas(W, H);
  const [rCanvas, rCtx] = makeCanvas(W, H);

  // Rich 24K base gold
  ctx.fillStyle = '#f6cb52';
  ctx.fillRect(0, 0, W, H);

  // Longitudinal brushed gold grain
  for (let x = 0; x < W; x += 2) {
    const shade = (hash2D(x * 0.4, 3.7) - 0.5) * 18;
    ctx.fillStyle = shade > 0 ? `rgba(255,244,200,${shade / 255})` : `rgba(140,95,12,${-shade / 255})`;
    ctx.fillRect(x, 0, 2, H);
  }

  // Bump neutral mid-high; roughness smooth mirror-brushed (~0.20)
  bCtx.fillStyle = '#d0d0d0';
  bCtx.fillRect(0, 0, W, H);
  rCtx.fillStyle = '#383838';
  rCtx.fillRect(0, 0, W, H);

  for (let x = 0; x < W; x += 3) {
    const r = Math.round(46 + hash2D(x * 0.7, 9.1) * 28);
    rCtx.fillStyle = `rgb(${r},${r},${r})`;
    rCtx.fillRect(x, 0, 2, H);
  }

  // Stamp zone aligned with top plateau UVs [0.16..0.84, 0.08..0.92]
  const drawStampOn = (
    c: CanvasRenderingContext2D,
    strokeColor: string,
    fillColor: string,
    crestAlpha = 0.88,
  ) => {
    const sx = W * 0.22;
    const sy = H * 0.14;
    const sw = W * 0.56;
    const sh = H * 0.72;

    c.strokeStyle = strokeColor;
    c.lineWidth = 4;
    c.beginPath();
    c.roundRect(sx, sy, sw, sh, 16);
    c.stroke();

    c.fillStyle = fillColor;
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    // Bullion crest emblem
    c.save();
    c.globalAlpha = crestAlpha;
    c.beginPath();
    c.arc(W * 0.5, H * 0.26, 44, 0, Math.PI * 2);
    c.lineWidth = 4;
    c.stroke();
    c.font = '700 22px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    c.fillText('Au', W * 0.5, H * 0.262);
    c.restore();

    c.font = '700 32px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    c.fillText('FINE GOLD', W * 0.5, H * 0.43);

    c.font = '800 58px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    c.fillText('999.9', W * 0.5, H * 0.54);

    c.font = '600 28px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    c.fillText('100 g', W * 0.5, H * 0.67);

    c.font = '600 18px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    c.fillText('MELTER ASSAYER', W * 0.5, H * 0.77);
  };

  drawStampOn(ctx, 'rgba(130, 88, 12, 0.55)', 'rgba(122, 80, 10, 0.68)', 0.65);
  drawStampOn(bCtx, '#303030', '#2a2a2a', 1);
  drawStampOn(rCtx, '#8a8a8a', '#969696', 1);

  return {
    map: toTexture(canvas),
    bumpMap: toTexture(bCanvas, THREE.NoColorSpace),
    roughnessMap: toTexture(rCanvas, THREE.NoColorSpace),
  };
}

function createDiamondSparkleTexture(): THREE.CanvasTexture {
  const S = 128;
  const [canvas, ctx] = makeCanvas(S, S);
  const c = S * 0.5;

  ctx.clearRect(0, 0, S, S);

  const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.22, 'rgba(230,246,255,0.8)');
  glow.addColorStop(0.5, 'rgba(170,220,255,0.2)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  // Crisp 4-point star rays
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  for (const angle of [0, Math.PI * 0.5]) {
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-S * 0.47, 0);
    ctx.quadraticCurveTo(0, -3.5, S * 0.47, 0);
    ctx.quadraticCurveTo(0, 3.5, -S * 0.47, 0);
    ctx.fill();
    ctx.restore();
  }

  return toTexture(canvas);
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const S = 128;
  const [canvas, ctx] = makeCanvas(S, S);
  const img = ctx.createImageData(S, S);
  const d = img.data;
  const half = S * 0.5;

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const dx = (px + 0.5 - half) / half;
      const dy = (py + 0.5 - half) / half;
      const r = Math.hypot(dx, dy);
      const t = Math.max(0, Math.min(1, (r - 0.62) / 0.38));
      const edgeFade = 1 - t * t * (3 - 2 * t);
      const alpha = Math.exp(-4.2 * r * r) * edgeFade;
      const idx = (py * S + px) * 4;
      d[idx] = 4;
      d[idx + 1] = 5;
      d[idx + 2] = 8;
      d[idx + 3] = Math.round(Math.max(0, Math.min(255, alpha * 255)));
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(canvas, THREE.SRGBColorSpace, 4);
}

export function createWallAoTexture(baseHex: string): THREE.CanvasTexture {
  const W = 64;
  const H = 256;
  const [canvas, ctx] = makeCanvas(W, H);

  // v = 0 (bottom of canvas, floor seam -hz) -> near-black AO; v = 1 (top, front glass +hz) -> baseHex
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, baseHex);
  grad.addColorStop(0.45, baseHex);
  grad.addColorStop(0.84, '#050608');
  grad.addColorStop(1, '#020203');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle recessed micro-vignette darkening
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(0,0,0,0.06)');
  shade.addColorStop(0.55, 'rgba(0,0,0,0.34)');
  shade.addColorStop(1, 'rgba(0,0,0,0.88)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  return toTexture(canvas, THREE.SRGBColorSpace, 4);
}

export class TextureBank {
  private readonly cache = new Map<ThemeId, ThemeTextureSet>();
  private contactShadowTex: THREE.CanvasTexture | null = null;
  private readonly wallAoCache = new Map<string, THREE.CanvasTexture>();

  getContactShadow(): THREE.CanvasTexture {
    if (!this.contactShadowTex) {
      this.contactShadowTex = createContactShadowTexture();
    }
    return this.contactShadowTex;
  }

  getWallAo(baseHex: string): THREE.CanvasTexture {
    let tex = this.wallAoCache.get(baseHex);
    if (!tex) {
      tex = createWallAoTexture(baseHex);
      this.wallAoCache.set(baseHex, tex);
    }
    return tex;
  }

  get(id: ThemeId): ThemeTextureSet {
    const hit = this.cache.get(id);
    if (hit) return hit;

    let set: ThemeTextureSet;
    switch (id) {
      case 'tennis': {
        const ball = createTennisBallTextures();
        set = {
          floorMap: createTennisCourtTexture(),
          itemMap: ball.map,
          itemBumpMap: ball.bumpMap,
        };
        break;
      }
      case 'basketball': {
        const court = createBasketballCourtTextures();
        const ball = createBasketballTextures();
        set = {
          floorMap: court.map,
          floorRoughnessMap: court.roughnessMap,
          itemMap: ball.map,
          itemBumpMap: ball.bumpMap,
        };
        break;
      }
      case 'soccer': {
        const ball = createSoccerBallTextures();
        set = {
          floorMap: createSoccerPitchTexture(),
          itemMap: ball.map,
          itemBumpMap: ball.bumpMap,
        };
        break;
      }
      case 'diamonds': {
        set = {
          floorMap: createVaultFloorTexture('#050608'),
          sparkleMap: createDiamondSparkleTexture(),
        };
        break;
      }
      case 'gold': {
        const ingot = createGoldIngotTextures();
        set = {
          floorMap: createVaultFloorTexture('#060503'),
          itemMap: ingot.map,
          itemBumpMap: ingot.bumpMap,
          itemRoughnessMap: ingot.roughnessMap,
        };
        break;
      }
    }

    this.cache.set(id, set);
    return set;
  }

  dispose(): void {
    for (const set of this.cache.values()) {
      set.floorMap.dispose();
      set.floorRoughnessMap?.dispose();
      set.floorBumpMap?.dispose();
      set.itemMap?.dispose();
      set.itemBumpMap?.dispose();
      set.itemRoughnessMap?.dispose();
      set.sparkleMap?.dispose();
    }
    this.cache.clear();
    this.contactShadowTex?.dispose();
    this.contactShadowTex = null;
    for (const tex of this.wallAoCache.values()) {
      tex.dispose();
    }
    this.wallAoCache.clear();
  }
}
