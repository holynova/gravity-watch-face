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

interface FloorTextureSet {
  floorMap: THREE.CanvasTexture;
  floorRoughnessMap?: THREE.CanvasTexture;
  floorBumpMap?: THREE.CanvasTexture;
}

interface ItemTextureSet {
  itemMap?: THREE.CanvasTexture;
  itemBumpMap?: THREE.CanvasTexture;
  itemRoughnessMap?: THREE.CanvasTexture;
  sparkleMap?: THREE.CanvasTexture;
}

export const FLOOR_BLEED = 1.26;

function getFloorCanvasDims(aspect: number): { W: number; H: number } {
  const clamped = Math.max(0.4, Math.min(2.6, aspect || 9 / 19.5));
  if (clamped <= 1) {
    return {
      W: 1024,
      H: Math.max(1024, Math.min(2240, Math.round(1024 / clamped))),
    };
  }
  return {
    W: Math.max(1024, Math.min(2240, Math.round(1024 * clamped))),
    H: 1024,
  };
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

function createTennisCourtTexture(aspect: number): THREE.CanvasTexture {
  const { W, H } = getFloorCanvasDims(aspect);
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

  const isLandscape = W > H;
  const shortSide = Math.min(W, H);
  const longSide = Math.max(W, H);

  // Regulation tennis court: 10.97m doubles width x 23.77m length (scaled to visible center area inside bleed canvas)
  const visShort = shortSide / FLOOR_BLEED;
  const visLong = longSide / FLOOR_BLEED;
  const pxPerM = Math.min((visShort * 0.78) / 10.97, (visLong * 0.82) / 23.77);
  const cw = Math.round(10.97 * pxPerM);
  const ch = Math.round(23.77 * pxPerM);
  const cx0 = -Math.round(cw * 0.5);
  const cy0 = -Math.round(ch * 0.5);

  ctx.save();
  ctx.translate(W * 0.5, H * 0.5);
  if (isLandscape) ctx.rotate(-Math.PI / 2);

  // Inner moist terracotta clay rectangle
  ctx.fillStyle = '#a53f28';
  ctx.fillRect(cx0, cy0, cw, ch);

  // Clay mineral grain using offscreen patch so rotated coordinate stays crisp
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx0, cy0, cw, ch);
  ctx.clip();
  for (let i = 0; i < 4200; i++) {
    const gx = cx0 + hash2D(i * 1.1, 2.3) * cw;
    const gy = cy0 + hash2D(3.7, i * 1.3) * ch;
    const light = hash2D(i, i * 0.7) > 0.5;
    ctx.fillStyle = light ? 'rgba(235, 130, 95, 0.14)' : 'rgba(90, 28, 16, 0.16)';
    ctx.fillRect(gx, gy, 3, 3);
  }
  ctx.restore();

  // Subtle net shadow across center
  const netGrad = ctx.createLinearGradient(0, -ch * 0.025, 0, ch * 0.025);
  netGrad.addColorStop(0, 'rgba(0,0,0,0)');
  netGrad.addColorStop(0.5, 'rgba(0,0,0,0.34)');
  netGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = netGrad;
  ctx.fillRect(cx0 - 24, -ch * 0.025, cw + 48, ch * 0.05);

  // Crisp regulation white court markings
  ctx.strokeStyle = 'rgba(246, 245, 240, 0.94)';
  ctx.lineWidth = Math.max(5, Math.round(0.08 * pxPerM));
  ctx.strokeRect(cx0, cy0, cw, ch);

  // Singles sidelines (8.23m wide)
  const sxHalf = 4.115 * pxPerM;
  const syServ = 6.4 * pxPerM;
  ctx.beginPath();
  ctx.moveTo(-sxHalf, cy0);
  ctx.lineTo(-sxHalf, cy0 + ch);
  ctx.moveTo(sxHalf, cy0);
  ctx.lineTo(sxHalf, cy0 + ch);

  // Service lines
  ctx.moveTo(-sxHalf, -syServ);
  ctx.lineTo(sxHalf, -syServ);
  ctx.moveTo(-sxHalf, syServ);
  ctx.lineTo(sxHalf, syServ);

  // Center service line
  ctx.moveTo(0, -syServ);
  ctx.lineTo(0, syServ);

  // Baseline center marks
  ctx.moveTo(0, cy0);
  ctx.lineTo(0, cy0 + 22);
  ctx.moveTo(0, cy0 + ch);
  ctx.lineTo(0, cy0 + ch - 22);
  ctx.stroke();

  // Subtle net cord line
  ctx.strokeStyle = 'rgba(235, 238, 235, 0.42)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx0 - 24, 0);
  ctx.lineTo(cx0 + cw + 24, 0);
  ctx.stroke();

  ctx.restore();

  return toTexture(canvas);
}

function createBasketballCourtTextures(aspect: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const { W, H } = getFloorCanvasDims(aspect);
  const [canvas, ctx] = makeCanvas(W, H);
  const [rCanvas, rCtx] = makeCanvas(W, H);

  ctx.fillStyle = '#1d1713';
  ctx.fillRect(0, 0, W, H);
  rCtx.fillStyle = '#686868';
  rCtx.fillRect(0, 0, W, H);

  const isLandscape = W > H;

  // Smoked walnut hardwood planks aligned along court length
  const spanAcross = isLandscape ? H : W;
  const spanAlong = isLandscape ? W : H;
  const plankCount = Math.max(24, Math.round(spanAcross / 34));
  const plankW = spanAcross / plankCount;

  const paintPlanks = (c: CanvasRenderingContext2D, rc: CanvasRenderingContext2D) => {
    c.save();
    rc.save();
    if (isLandscape) {
      c.translate(W * 0.5, H * 0.5);
      c.rotate(-Math.PI / 2);
      c.translate(-spanAcross * 0.5, -spanAlong * 0.5);
      rc.translate(W * 0.5, H * 0.5);
      rc.rotate(-Math.PI / 2);
      rc.translate(-spanAcross * 0.5, -spanAlong * 0.5);
    }
    for (let p = 0; p < plankCount; p++) {
      const x = p * plankW;
      let y = -Math.floor(hash2D(p, 1.3) * 180);
      while (y < spanAlong) {
        const len = 240 + Math.floor(hash2D(p, y * 0.02) * 300);
        const tone = hash2D(p * 3.1, y * 0.07);
        const r = Math.round(26 + tone * 18);
        const g = Math.round(19 + tone * 13);
        const b = Math.round(15 + tone * 10);
        c.fillStyle = `rgb(${r},${g},${b})`;
        c.fillRect(x, y, plankW + 0.6, len);

        const rough = Math.round(92 + tone * 34);
        rc.fillStyle = `rgb(${rough},${rough},${rough})`;
        rc.fillRect(x, y, plankW + 0.6, len);

        // Fine wood grain streaks
        c.fillStyle = 'rgba(0,0,0,0.16)';
        for (let s = 0; s < 5; s++) {
          const gx = x + hash2D(p + s * 0.3, y) * (plankW - 3);
          c.fillRect(gx, y, 1.5, len);
        }

        c.fillStyle = 'rgba(6,4,3,0.72)';
        c.fillRect(x, y, plankW, 2);
        y += len;
      }
      c.fillStyle = 'rgba(6,4,3,0.75)';
      c.fillRect(x, 0, 2, spanAlong);
    }
    c.restore();
    rc.restore();
  };

  paintPlanks(ctx, rCtx);

  // Regulation FIBA/NBA court markings (15.0m x 28.0m) using single uniform scale within visible viewport area
  const visAcross = spanAcross / FLOOR_BLEED;
  const visAlong = spanAlong / FLOOR_BLEED;
  const pxPerM = Math.min((visAcross * 0.88) / 15.0, (visAlong * 0.9) / 28.0);
  const courtW = 15.0 * pxPerM;
  const courtH = 28.0 * pxPerM;

  ctx.save();
  ctx.translate(W * 0.5, H * 0.5);
  if (isLandscape) ctx.rotate(-Math.PI / 2);

  // Outer court boundary
  ctx.strokeStyle = 'rgba(238, 234, 226, 0.88)';
  ctx.lineWidth = Math.max(4.5, 0.085 * pxPerM);
  ctx.strokeRect(-courtW * 0.5, -courtH * 0.5, courtW, courtH);

  // Half-court line + center circles (1.8m & 0.6m)
  ctx.beginPath();
  ctx.moveTo(-courtW * 0.5, 0);
  ctx.lineTo(courtW * 0.5, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 1.8 * pxPerM, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 0.6 * pxPerM, 0, Math.PI * 2);
  ctx.stroke();

  const drawHalf = (sign: -1 | 1) => {
    const baseY = sign * 14.0 * pxPerM;
    const inDir = -sign;

    const keyW = 4.9 * pxPerM;
    const keyH = 5.8 * pxPerM;
    const ftY = baseY + inDir * keyH;
    const keyTop = sign === -1 ? baseY : ftY;

    // Subtle smoked stain inside the paint
    ctx.fillStyle = 'rgba(10, 7, 5, 0.34)';
    ctx.fillRect(-keyW * 0.5, keyTop, keyW, keyH);

    // Paint / Free-throw lane
    ctx.strokeRect(-keyW * 0.5, keyTop, keyW, keyH);

    // 4 exterior rebound lane ticks along both paint edges
    const tickOffsetsM = [1.75, 2.65, 3.5, 4.35];
    ctx.beginPath();
    for (const dM of tickOffsetsM) {
      const ty = baseY + inDir * dM * pxPerM;
      const tickLen = dM === 2.65 ? 0.3 * pxPerM : 0.16 * pxPerM;
      ctx.moveTo(-keyW * 0.5, ty);
      ctx.lineTo(-keyW * 0.5 - tickLen, ty);
      ctx.moveTo(keyW * 0.5, ty);
      ctx.lineTo(keyW * 0.5 + tickLen, ty);
    }
    ctx.stroke();

    // Free-throw circle (r = 1.8m): solid outside paint, dashed inside paint
    const ftR = 1.8 * pxPerM;
    ctx.beginPath();
    if (sign === -1) {
      ctx.arc(0, ftY, ftR, 0, Math.PI, false);
    } else {
      ctx.arc(0, ftY, ftR, Math.PI, Math.PI * 2, false);
    }
    ctx.stroke();

    ctx.save();
    ctx.setLineDash([Math.max(8, 0.25 * pxPerM), Math.max(8, 0.25 * pxPerM)]);
    ctx.beginPath();
    if (sign === -1) {
      ctx.arc(0, ftY, ftR, Math.PI, Math.PI * 2, false);
    } else {
      ctx.arc(0, ftY, ftR, 0, Math.PI, false);
    }
    ctx.stroke();
    ctx.restore();

    // Rim, backboard & restricted-area semicircle (1.25m)
    const rimY = baseY + inDir * 1.575 * pxPerM;
    const boardY = baseY + inDir * 1.2 * pxPerM;
    const restR = 1.25 * pxPerM;

    ctx.beginPath();
    if (sign === -1) {
      ctx.arc(0, rimY, restR, 0, Math.PI, false);
    } else {
      ctx.arc(0, rimY, restR, Math.PI, Math.PI * 2, false);
    }
    ctx.moveTo(-restR, boardY);
    ctx.lineTo(-restR, rimY);
    ctx.moveTo(restR, boardY);
    ctx.lineTo(restR, rimY);
    ctx.stroke();

    // Backboard & rim ring
    ctx.beginPath();
    ctx.moveTo(-0.9 * pxPerM, boardY);
    ctx.lineTo(0.9 * pxPerM, boardY);
    ctx.moveTo(0, boardY);
    ctx.lineTo(0, rimY - inDir * 0.23 * pxPerM);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, rimY, Math.max(7, 0.23 * pxPerM), 0, Math.PI * 2);
    ctx.stroke();

    // Mathematically seamless 3-point line (6.75m arc meeting 0.9m sideline insets)
    const threeR = 6.75 * pxPerM;
    const cornerX = 6.6 * pxPerM;
    const dy = Math.sqrt(threeR * threeR - cornerX * cornerX);
    const joinY = rimY + inDir * dy;
    const a0 = Math.atan2(dy, cornerX);

    ctx.beginPath();
    ctx.moveTo(-cornerX, baseY);
    ctx.lineTo(-cornerX, joinY);
    ctx.moveTo(cornerX, baseY);
    ctx.lineTo(cornerX, joinY);
    ctx.stroke();

    ctx.beginPath();
    if (sign === -1) {
      ctx.arc(0, rimY, threeR, a0, Math.PI - a0, false);
    } else {
      ctx.arc(0, rimY, threeR, Math.PI + a0, Math.PI * 2 - a0, false);
    }
    ctx.stroke();
  };

  drawHalf(-1);
  drawHalf(1);
  ctx.restore();

  return {
    map: toTexture(canvas),
    roughnessMap: toTexture(rCanvas, THREE.NoColorSpace),
  };
}

function createSoccerPitchTexture(aspect: number): THREE.CanvasTexture {
  const { W, H } = getFloorCanvasDims(aspect);
  const [canvas, ctx] = makeCanvas(W, H);

  const isLandscape = W > H;
  const stripes = 12;
  if (isLandscape) {
    const stripeW = W / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#27511b' : '#336522';
      ctx.fillRect(i * stripeW, 0, stripeW + 1, H);
    }
  } else {
    const stripeH = H / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#27511b' : '#336522';
      ctx.fillRect(0, i * stripeH, W, stripeH + 1);
    }
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

  // Regulation 68m x 105m pitch markings under uniform pxPerM scale within visible viewport area
  const shortSide = Math.min(W, H);
  const longSide = Math.max(W, H);
  const visShort = shortSide / FLOOR_BLEED;
  const visLong = longSide / FLOOR_BLEED;
  const pxPerM = Math.min((visShort * 0.86) / 68, (visLong * 0.9) / 105);
  const pw = 68 * pxPerM;
  const ph = 105 * pxPerM;

  ctx.save();
  ctx.translate(W * 0.5, H * 0.5);
  if (isLandscape) ctx.rotate(-Math.PI / 2);

  ctx.strokeStyle = 'rgba(244, 248, 240, 0.88)';
  ctx.lineWidth = Math.max(5, 0.55 * pxPerM);
  ctx.strokeRect(-pw * 0.5, -ph * 0.5, pw, ph);

  // Halfway line & true 9.15m center circle
  ctx.beginPath();
  ctx.moveTo(-pw * 0.5, 0);
  ctx.lineTo(pw * 0.5, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 9.15 * pxPerM, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(244, 248, 240, 0.9)';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(6, 0.55 * pxPerM), 0, Math.PI * 2);
  ctx.fill();

  const drawBox = (sign: -1 | 1) => {
    const goalY = sign * ph * 0.5;
    const inDir = -sign;
    const penW = 40.32 * pxPerM;
    const penH = 16.5 * pxPerM;
    const boxW = 18.32 * pxPerM;
    const boxH = 5.5 * pxPerM;

    ctx.strokeRect(-penW * 0.5, sign === -1 ? goalY : goalY - penH, penW, penH);
    ctx.strokeRect(-boxW * 0.5, sign === -1 ? goalY : goalY - boxH, boxW, boxH);

    const spotY = goalY + inDir * 11 * pxPerM;
    ctx.beginPath();
    ctx.arc(0, spotY, Math.max(5, 0.42 * pxPerM), 0, Math.PI * 2);
    ctx.fill();

    const penEdgeY = goalY + inDir * penH;
    const arcR = 9.15 * pxPerM;
    const dy = Math.abs(penEdgeY - spotY);
    const angle = Math.acos(Math.min(0.99, dy / arcR));
    ctx.beginPath();
    if (sign === -1) {
      ctx.arc(0, spotY, arcR, Math.PI * 0.5 - angle, Math.PI * 0.5 + angle);
    } else {
      ctx.arc(0, spotY, arcR, -Math.PI * 0.5 - angle, -Math.PI * 0.5 + angle);
    }
    ctx.stroke();
  };

  drawBox(-1);
  drawBox(1);

  // Corner arcs
  const cR = Math.max(16, 1.5 * pxPerM);
  ctx.beginPath();
  ctx.arc(-pw * 0.5, -ph * 0.5, cR, 0, Math.PI * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pw * 0.5, -ph * 0.5, cR, Math.PI * 0.5, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pw * 0.5, ph * 0.5, cR, Math.PI, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-pw * 0.5, ph * 0.5, cR, Math.PI * 1.5, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  return toTexture(canvas);
}

function createVaultFloorTexture(tintHex: string): THREE.CanvasTexture {
  const S = 512;
  const [canvas, ctx] = makeCanvas(S, S);
  ctx.fillStyle = tintHex;
  ctx.fillRect(0, 0, S, S);

  const grad = ctx.createRadialGradient(S * 0.5, S * 0.5, S * 0.08, S * 0.5, S * 0.5, S * 0.68);
  grad.addColorStop(0, 'rgba(255,255,255,0.03)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
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
        // Optic chartreuse-yellow fuzzy felt matching rich lit-to-core contrast
        cd[idx] = Math.max(0, Math.min(255, Math.round(180 + feltNoise)));
        cd[idx + 1] = Math.max(0, Math.min(255, Math.round(212 + feltNoise * 0.85)));
        cd[idx + 2] = Math.max(0, Math.min(255, Math.round(22 + feltNoise * 0.55)));
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
  const W = 1024;
  const H = 512;
  const [canvas, ctx] = makeCanvas(W, H);
  const [bCanvas, bCtx] = makeCanvas(W, H);

  const cImg = ctx.createImageData(W, H);
  const bImg = bCtx.createImageData(W, H);
  const cd = cImg.data;
  const bd = bImg.data;

  const seamW = 0.024;

  for (let py = 0; py < H; py++) {
    const phi = ((py + 0.5) / H) * Math.PI;
    const sinPhi = Math.sin(phi);
    const ny = Math.cos(phi);

    for (let px = 0; px < W; px++) {
      const theta = ((px + 0.5) / W) * Math.PI * 2;
      const nx = -sinPhi * Math.cos(theta);
      const nz = sinPhi * Math.sin(theta);

      // True 8-panel NBA/FIBA basketball seams on 3D unit sphere:
      // 1) Horizontal equator (ny = 0)
      // 2) Orthogonal meridian (nx = 0, passes through +/-Y and +/-Z, never crosses +/-X caps)
      // 3) Two symmetrical curved side loops encircling +/-X with normalized SDF thickness
      const dEq = Math.abs(ny);
      const dMer = Math.abs(nx);
      const psi = Math.atan2(ny, nz);
      const poleAng = Math.acos(Math.min(1, Math.abs(nx)));
      const targetAlpha = 0.84 + 0.22 * Math.cos(2 * psi);
      const gradNorm = Math.hypot(1, (-0.44 * Math.sin(2 * psi)) / Math.max(0.28, Math.sin(poleAng)));
      const dOval = Math.abs(poleAng - targetAlpha) / gradNorm;

      const minDist = Math.min(dEq, dMer, dOval);
      const idx = (py * W + px) * 4;

      // Dense 3D pebble dimples independent of UV pole pinching
      const pebble =
        Math.sin(nx * 165) * Math.sin(ny * 165) * Math.sin(nz * 165) * 0.5 +
        (hash2D(px * 0.9, py * 0.9) - 0.5) * 0.28;

      if (minDist < seamW) {
        const edge = Math.min(1, (seamW - minDist) / 0.008);
        cd[idx] = Math.round(16 + (1 - edge) * 58);
        cd[idx + 1] = Math.round(13 + (1 - edge) * 26);
        cd[idx + 2] = Math.round(11 + (1 - edge) * 14);
        cd[idx + 3] = 255;
        const bVal = Math.round(32 + (1 - edge) * 65);
        bd[idx] = bd[idx + 1] = bd[idx + 2] = bVal;
        bd[idx + 3] = 255;
      } else {
        const shade = pebble * 15;
        cd[idx] = Math.max(0, Math.min(255, Math.round(186 + shade)));
        cd[idx + 1] = Math.max(0, Math.min(255, Math.round(62 + shade * 0.6)));
        cd[idx + 2] = Math.max(0, Math.min(255, Math.round(19 + shade * 0.35)));
        cd[idx + 3] = 255;
        const bVal = Math.max(0, Math.min(255, Math.round(168 + pebble * 74)));
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

export class TextureBank {
  private readonly floorCache = new Map<string, FloorTextureSet>();
  private readonly itemCache = new Map<ThemeId, ItemTextureSet>();

  private getItems(id: ThemeId): ItemTextureSet {
    const hit = this.itemCache.get(id);
    if (hit) return hit;

    let items: ItemTextureSet;
    switch (id) {
      case 'tennis': {
        const ball = createTennisBallTextures();
        items = { itemMap: ball.map, itemBumpMap: ball.bumpMap };
        break;
      }
      case 'basketball': {
        const ball = createBasketballTextures();
        items = { itemMap: ball.map, itemBumpMap: ball.bumpMap };
        break;
      }
      case 'soccer': {
        const ball = createSoccerBallTextures();
        items = { itemMap: ball.map, itemBumpMap: ball.bumpMap };
        break;
      }
      case 'diamonds': {
        items = { sparkleMap: createDiamondSparkleTexture() };
        break;
      }
      case 'gold': {
        const ingot = createGoldIngotTextures();
        items = {
          itemMap: ingot.map,
          itemBumpMap: ingot.bumpMap,
          itemRoughnessMap: ingot.roughnessMap,
        };
        break;
      }
    }
    this.itemCache.set(id, items);
    return items;
  }

  private getFloor(id: ThemeId, aspect: number): FloorTextureSet {
    const isVault = id === 'diamonds' || id === 'gold';
    const bucket = isVault ? 'vault' : (Math.round(Math.max(0.4, Math.min(2.6, aspect)) * 20) / 20).toFixed(2);
    const key = `${id}_${bucket}`;
    const hit = this.floorCache.get(key);
    if (hit) return hit;

    let floor: FloorTextureSet;
    switch (id) {
      case 'tennis':
        floor = { floorMap: createTennisCourtTexture(Number(bucket)) };
        break;
      case 'basketball': {
        const court = createBasketballCourtTextures(Number(bucket));
        floor = { floorMap: court.map, floorRoughnessMap: court.roughnessMap };
        break;
      }
      case 'soccer':
        floor = { floorMap: createSoccerPitchTexture(Number(bucket)) };
        break;
      case 'diamonds':
        floor = { floorMap: createVaultFloorTexture('#0a0f18') };
        break;
      case 'gold':
        floor = { floorMap: createVaultFloorTexture('#120d06') };
        break;
    }

    if (this.floorCache.size >= 8) {
      const oldestKey = this.floorCache.keys().next().value;
      if (oldestKey) {
        const old = this.floorCache.get(oldestKey);
        old?.floorMap.dispose();
        old?.floorRoughnessMap?.dispose();
        old?.floorBumpMap?.dispose();
        this.floorCache.delete(oldestKey);
      }
    }

    this.floorCache.set(key, floor);
    return floor;
  }

  get(id: ThemeId, aspect = 9 / 19.5): ThemeTextureSet {
    const floor = this.getFloor(id, aspect);
    const items = this.getItems(id);
    return { ...floor, ...items };
  }

  dispose(): void {
    for (const f of this.floorCache.values()) {
      f.floorMap.dispose();
      f.floorRoughnessMap?.dispose();
      f.floorBumpMap?.dispose();
    }
    this.floorCache.clear();
    for (const it of this.itemCache.values()) {
      it.itemMap?.dispose();
      it.itemBumpMap?.dispose();
      it.itemRoughnessMap?.dispose();
      it.sparkleMap?.dispose();
    }
    this.itemCache.clear();
  }
}
