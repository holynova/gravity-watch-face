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
  itemMaps?: THREE.CanvasTexture[];
  itemBumpMaps?: THREE.CanvasTexture[];
  itemRoughnessMaps?: THREE.CanvasTexture[];
  crackedMaps?: THREE.CanvasTexture[];
  crackedBumpMap?: THREE.CanvasTexture;
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
  itemMaps?: THREE.CanvasTexture[];
  itemBumpMaps?: THREE.CanvasTexture[];
  itemRoughnessMaps?: THREE.CanvasTexture[];
  crackedMaps?: THREE.CanvasTexture[];
  crackedBumpMap?: THREE.CanvasTexture;
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

function seededRand(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

function createBulbsBenchFloorTextures(aspect: number): FloorTextureSet {
  const { W, H } = getFloorCanvasDims(aspect);
  const [canvas, ctx] = makeCanvas(W, H);
  const [rCanvas, rCtx] = makeCanvas(W, H);

  const grad = ctx.createRadialGradient(W * 0.42, H * 0.38, W * 0.05, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
  grad.addColorStop(0, '#1c1917');
  grad.addColorStop(0.55, '#131418');
  grad.addColorStop(1, '#0b0c0f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  rCtx.fillStyle = '#c4c4c4';
  rCtx.fillRect(0, 0, W, H);

  // Dark oiled workbench timber planks & grain
  const plankCount = 5;
  const plankW = W / plankCount;
  const rng = seededRand(4109);
  for (let p = 0; p < plankCount; p++) {
    const px = p * plankW;
    const toneShift = (rng() - 0.5) * 8;
    ctx.fillStyle = `rgba(${26 + toneShift}, ${23 + toneShift}, ${22 + toneShift}, 0.35)`;
    ctx.fillRect(px + 2, 0, plankW - 4, H);

    // Longitudinal grain streaks
    for (let g = 0; g < 42; g++) {
      const gx = px + 4 + rng() * (plankW - 8);
      ctx.strokeStyle = rng() > 0.5 ? 'rgba(255, 224, 178, 0.028)' : 'rgba(0, 0, 0, 0.22)';
      ctx.lineWidth = 0.8 + rng() * 1.6;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.bezierCurveTo(gx + (rng() - 0.5) * 14, H * 0.33, gx + (rng() - 0.5) * 14, H * 0.66, gx, H);
      ctx.stroke();

      rCtx.strokeStyle = rng() > 0.5 ? 'rgba(130, 130, 130, 0.35)' : 'rgba(215, 215, 215, 0.35)';
      rCtx.lineWidth = ctx.lineWidth;
      rCtx.beginPath();
      rCtx.moveTo(gx, 0);
      rCtx.lineTo(gx, H);
      rCtx.stroke();
    }

    if (p > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(px - 1, 0, 2.5, H);
      rCtx.fillStyle = '#ececec';
      rCtx.fillRect(px - 1, 0, 2.5, H);
    }
  }

  // Subtle brass inlaid workshop rule inside playable region
  const padX = W * 0.145;
  const padY = H * 0.145;
  ctx.strokeStyle = 'rgba(214, 166, 92, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padX, padY, W - padX * 2, H - padY * 2);

  return {
    floorMap: toTexture(canvas),
    floorRoughnessMap: toTexture(rCanvas, THREE.NoColorSpace),
  };
}

function createBalloonSkyFloorTexture(aspect: number): THREE.CanvasTexture {
  const { W, H } = getFloorCanvasDims(aspect);
  const [canvas, ctx] = makeCanvas(W, H);

  const skyGrad = ctx.createLinearGradient(0, 0, W * 0.35, H);
  skyGrad.addColorStop(0, '#d7eaff');
  skyGrad.addColorStop(0.55, '#c3defa');
  skyGrad.addColorStop(1, '#b0d1f6');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Warm upper-left sun glow
  const sun = ctx.createRadialGradient(W * 0.28, H * 0.22, 0, W * 0.28, H * 0.22, Math.max(W, H) * 0.52);
  sun.addColorStop(0, 'rgba(255, 251, 240, 0.88)');
  sun.addColorStop(0.45, 'rgba(255, 248, 236, 0.26)');
  sun.addColorStop(1, 'rgba(255, 248, 236, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  // Soft sunlit cloud puffs
  const rng = seededRand(8821);
  for (let i = 0; i < 24; i++) {
    const cx = rng() * W;
    const cy = rng() * H;
    const rx = W * (0.14 + rng() * 0.18);
    const puff = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    puff.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
    puff.addColorStop(0.65, 'rgba(255, 255, 255, 0.14)');
    puff.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = puff;
    ctx.fillRect(cx - rx, cy - rx, rx * 2, rx * 2);
  }

  return toTexture(canvas);
}

function createCasinoBaizeFloorTextures(aspect: number): FloorTextureSet {
  const { W, H } = getFloorCanvasDims(aspect);
  const [canvas, ctx] = makeCanvas(W, H);
  const [rCanvas, rCtx] = makeCanvas(W, H);

  const grad = ctx.createRadialGradient(W * 0.5, H * 0.45, W * 0.04, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
  grad.addColorStop(0, '#0f6136');
  grad.addColorStop(0.6, '#0a4828');
  grad.addColorStop(1, '#062d19');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  rCtx.fillStyle = '#e0e0e0';
  rCtx.fillRect(0, 0, W, H);

  // Fast 128x128 woven wool twill baize pattern overlay
  const tileSize = 128;
  const [cTile, cTileCtx] = makeCanvas(tileSize, tileSize);
  const [rTile, rTileCtx] = makeCanvas(tileSize, tileSize);
  const cImg = cTileCtx.createImageData(tileSize, tileSize);
  const rImg = rTileCtx.createImageData(tileSize, tileSize);
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const idx = (y * tileSize + x) * 4;
      const weave = ((x + y) & 1) === 0 ? 1 : -1;
      const n = (hash2D(x * 0.9, y * 0.9) - 0.5) * 14 + weave * 4;
      if (n >= 0) {
        cImg.data[idx] = 220;
        cImg.data[idx + 1] = 255;
        cImg.data[idx + 2] = 232;
        cImg.data[idx + 3] = Math.min(28, Math.round(n * 1.9));
      } else {
        cImg.data[idx] = 0;
        cImg.data[idx + 1] = 14;
        cImg.data[idx + 2] = 8;
        cImg.data[idx + 3] = Math.min(34, Math.round(-n * 2.2));
      }
      const rv = Math.max(190, Math.min(250, Math.round(224 + n * 1.4)));
      rImg.data[idx] = rv;
      rImg.data[idx + 1] = rv;
      rImg.data[idx + 2] = rv;
      rImg.data[idx + 3] = 255;
    }
  }
  cTileCtx.putImageData(cImg, 0, 0);
  rTileCtx.putImageData(rImg, 0, 0);

  const cPat = ctx.createPattern(cTile, 'repeat');
  if (cPat) {
    ctx.fillStyle = cPat;
    ctx.fillRect(0, 0, W, H);
  }
  const rPat = rCtx.createPattern(rTile, 'repeat');
  if (rPat) {
    rCtx.fillStyle = rPat;
    rCtx.fillRect(0, 0, W, H);
  }

  // Subtle Monte Carlo champagne-gold racetrack border
  const padX = W * 0.145;
  const padY = H * 0.135;
  const iw = W - padX * 2;
  const ih = H - padY * 2;
  const radius = Math.min(iw, ih) * 0.18;

  ctx.strokeStyle = 'rgba(222, 184, 96, 0.34)';
  ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.004);
  ctx.beginPath();
  ctx.roundRect(padX, padY, iw, ih, radius);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(222, 184, 96, 0.16)';
  ctx.lineWidth = Math.max(1, Math.min(W, H) * 0.002);
  ctx.beginPath();
  ctx.roundRect(padX + 10, padY + 10, iw - 20, ih - 20, Math.max(8, radius - 10));
  ctx.stroke();

  // Subtle central diamond emblem
  const cx = W * 0.5;
  const cy = H * 0.5;
  const dRad = Math.min(iw, ih) * 0.12;
  ctx.strokeStyle = 'rgba(222, 184, 96, 0.15)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - dRad);
  ctx.lineTo(cx + dRad * 0.85, cy);
  ctx.lineTo(cx, cy + dRad);
  ctx.lineTo(cx - dRad * 0.85, cy);
  ctx.closePath();
  ctx.stroke();

  return {
    floorMap: toTexture(canvas),
    floorRoughnessMap: toTexture(rCanvas, THREE.NoColorSpace),
  };
}

function createTerrazzoFloorTextures(aspect: number): FloorTextureSet {
  const { W, H } = getFloorCanvasDims(aspect);
  const [canvas, ctx] = makeCanvas(W, H);
  const [rCanvas, rCtx] = makeCanvas(W, H);

  const grad = ctx.createRadialGradient(W * 0.45, H * 0.38, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
  grad.addColorStop(0, '#eee9df');
  grad.addColorStop(1, '#ded6c7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  rCtx.fillStyle = '#b4b4b4';
  rCtx.fillRect(0, 0, W, H);

  // Fine sand grain in cement matrix
  const rng = seededRand(9903);
  for (let i = 0; i < 1600; i++) {
    const x = rng() * W;
    const y = rng() * H;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(130, 120, 108, 0.16)' : 'rgba(255, 252, 245, 0.25)';
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Honed angular marble aggregate chips (color + lower roughness on polished stones)
  const palette = ['#b86647', '#64836f', '#383d46', '#f6f2ea', '#cf9f4a', '#7c8b99', '#a68c74'];
  const minSpan = Math.min(W, H);
  for (let i = 0; i < 620; i++) {
    const cx = rng() * W;
    const cy = rng() * H;
    const size = minSpan * (0.0055 + Math.pow(rng(), 2.2) * 0.017);
    const verts = 4 + Math.floor(rng() * 3);
    const color = palette[Math.floor(rng() * palette.length)];

    const drawChip = (targetCtx: CanvasRenderingContext2D, fill: string) => {
      targetCtx.fillStyle = fill;
      targetCtx.beginPath();
      for (let v = 0; v < verts; v++) {
        const a = (v / verts) * Math.PI * 2 + (rng() - 0.5) * 0.55;
        const rr = size * (0.58 + rng() * 0.48);
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr;
        if (v === 0) targetCtx.moveTo(px, py);
        else targetCtx.lineTo(px, py);
      }
      targetCtx.closePath();
      targetCtx.fill();
    };

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    const pts: Array<[number, number]> = [];
    for (let v = 0; v < verts; v++) {
      const a = (v / verts) * Math.PI * 2 + (rng() - 0.5) * 0.55;
      const rr = size * (0.58 + rng() * 0.48);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    pts.forEach(([px, py], idx) => (idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    rCtx.fillStyle = '#5c5c5c';
    rCtx.beginPath();
    pts.forEach(([px, py], idx) => (idx === 0 ? rCtx.moveTo(px, py) : rCtx.lineTo(px, py)));
    rCtx.closePath();
    rCtx.fill();
    void drawChip;
  }

  return {
    floorMap: toTexture(canvas),
    floorRoughnessMap: toTexture(rCanvas, THREE.NoColorSpace),
  };
}

function createIceSteelFloorTextures(aspect: number): FloorTextureSet {
  const { W, H } = getFloorCanvasDims(aspect);
  const [canvas, ctx] = makeCanvas(W, H);
  const [rCanvas, rCtx] = makeCanvas(W, H);

  const grad = ctx.createLinearGradient(0, 0, W * 0.6, H);
  grad.addColorStop(0, '#1a2736');
  grad.addColorStop(0.55, '#131d29');
  grad.addColorStop(1, '#0c131c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  rCtx.fillStyle = '#505050';
  rCtx.fillRect(0, 0, W, H);

  // Vertical brushed steel tray grain
  const rng = seededRand(5512);
  for (let i = 0; i < 650; i++) {
    const x = rng() * W;
    ctx.strokeStyle = rng() > 0.5 ? 'rgba(185, 220, 250, 0.045)' : 'rgba(6, 12, 18, 0.22)';
    ctx.lineWidth = 0.8 + rng() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (rng() - 0.5) * 4, H);
    ctx.stroke();

    rCtx.strokeStyle = rng() > 0.5 ? 'rgba(62, 62, 62, 0.5)' : 'rgba(98, 98, 98, 0.5)';
    rCtx.lineWidth = ctx.lineWidth;
    rCtx.beginPath();
    rCtx.moveTo(x, 0);
    rCtx.lineTo(x, H);
    rCtx.stroke();
  }

  // Subtle frosty condensation blooms & bar coaster rings
  for (let i = 0; i < 16; i++) {
    const cx = rng() * W;
    const cy = rng() * H;
    const rad = Math.min(W, H) * (0.09 + rng() * 0.16);
    const frost = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    frost.addColorStop(0, 'rgba(205, 234, 255, 0.09)');
    frost.addColorStop(1, 'rgba(205, 234, 255, 0)');
    ctx.fillStyle = frost;
    ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);

    const rFrost = rCtx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    rFrost.addColorStop(0, 'rgba(175, 175, 175, 0.45)');
    rFrost.addColorStop(1, 'rgba(175, 175, 175, 0)');
    rCtx.fillStyle = rFrost;
    rCtx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }

  return {
    floorMap: toTexture(canvas),
    floorRoughnessMap: toTexture(rCanvas, THREE.NoColorSpace),
  };
}

function createJellyStudioFloorTexture(aspect: number): THREE.CanvasTexture {
  const { W, H } = getFloorCanvasDims(aspect);
  const [canvas, ctx] = makeCanvas(W, H);

  const grad = ctx.createRadialGradient(W * 0.44, H * 0.36, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
  grad.addColorStop(0, '#f7f3ff');
  grad.addColorStop(0.55, '#ece4fb');
  grad.addColorStop(1, '#dfd4f5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const rng = seededRand(6127);
  for (let i = 0; i < 800; i++) {
    const x = rng() * W;
    const y = rng() * H;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(168, 146, 220, 0.06)';
    ctx.fillRect(x, y, 2, 2);
  }

  return toTexture(canvas);
}

function createTitaniumFloorTextures(aspect: number): FloorTextureSet {
  const { W, H } = getFloorCanvasDims(aspect);
  const [canvas, ctx] = makeCanvas(W, H);
  const [rCanvas, rCtx] = makeCanvas(W, H);

  const grad = ctx.createRadialGradient(W * 0.45, H * 0.38, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
  grad.addColorStop(0, '#2a303a');
  grad.addColorStop(0.6, '#1c2028');
  grad.addColorStop(1, '#12151b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  rCtx.fillStyle = '#5c5c5c';
  rCtx.fillRect(0, 0, W, H);

  // Precision machined circular lathe swirl + fine horizontal brushed lines
  const rng = seededRand(7741);
  const cx = W * 0.5;
  const cy = H * 0.5;
  const maxR = Math.hypot(W, H) * 0.65;
  for (let r = 8; r < maxR; r += 3.5) {
    ctx.strokeStyle = rng() > 0.5 ? 'rgba(218, 232, 248, 0.025)' : 'rgba(0, 0, 0, 0.11)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    rCtx.strokeStyle = rng() > 0.5 ? 'rgba(72, 72, 72, 0.35)' : 'rgba(116, 116, 116, 0.35)';
    rCtx.beginPath();
    rCtx.arc(cx, cy, r, 0, Math.PI * 2);
    rCtx.stroke();
  }

  // Subtle CNC datum hairlines inside playable arena
  const padX = W * 0.145;
  const padY = H * 0.14;
  ctx.strokeStyle = 'rgba(200, 218, 240, 0.09)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(padX, padY, W - padX * 2, H - padY * 2);

  return {
    floorMap: toTexture(canvas),
    floorRoughnessMap: toTexture(rCanvas, THREE.NoColorSpace),
  };
}

function createPorcelainFloorTexture(aspect: number): THREE.CanvasTexture {
  const { W, H } = getFloorCanvasDims(aspect);
  const [canvas, ctx] = makeCanvas(W, H);

  const grad = ctx.createRadialGradient(W * 0.45, H * 0.4, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
  grad.addColorStop(0, '#f1eade');
  grad.addColorStop(0.65, '#e5dccb');
  grad.addColorStop(1, '#d6cab6');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle Xuan paper mulled pulp fibers
  const rng = seededRand(8391);
  for (let i = 0; i < 420; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const len = 8 + rng() * 24;
    const a = rng() * Math.PI * 2;
    ctx.strokeStyle = rng() > 0.4 ? 'rgba(255, 253, 248, 0.35)' : 'rgba(130, 112, 88, 0.08)';
    ctx.lineWidth = 0.8 + rng() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }

  // Delicate celadon ink tea-ring motif
  const cx = W * 0.5;
  const cy = H * 0.5;
  const rad = Math.min(W, H) * 0.24;
  ctx.strokeStyle = 'rgba(66, 108, 96, 0.11)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(32, 68, 128, 0.07)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, rad * 1.12, 0.2, Math.PI * 1.85);
  ctx.stroke();

  return toTexture(canvas);
}

function createBrassCapTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const W = 256;
  const H = 256;
  const [canvas, ctx] = makeCanvas(W, H);
  const [bCanvas, bCtx] = makeCanvas(W, H);
  const [rCanvas, rCtx] = makeCanvas(W, H);

  for (let y = 0; y < H; y++) {
    const v = y / H;
    // Helical-looking horizontal Edison cap ribs (6 ridges)
    const ridge = Math.sin(v * Math.PI * 12) * 0.5 + 0.5;
    const brassR = Math.round(145 + ridge * 85);
    const brassG = Math.round(102 + ridge * 68);
    const brassB = Math.round(32 + ridge * 28);
    ctx.fillStyle = `rgb(${brassR}, ${brassG}, ${brassB})`;
    ctx.fillRect(0, y, W, 1);

    const bVal = Math.round(70 + ridge * 175);
    bCtx.fillStyle = `rgb(${bVal}, ${bVal}, ${bVal})`;
    bCtx.fillRect(0, y, W, 1);

    const rVal = Math.round(140 - ridge * 68);
    rCtx.fillStyle = `rgb(${rVal}, ${rVal}, ${rVal})`;
    rCtx.fillRect(0, y, W, 1);
  }

  return {
    map: toTexture(canvas, THREE.SRGBColorSpace, 4),
    bumpMap: toTexture(bCanvas, THREE.NoColorSpace, 4),
    roughnessMap: toTexture(rCanvas, THREE.NoColorSpace, 4),
  };
}

function createCasinoDiceTextures(): {
  maps: THREE.CanvasTexture[];
  bumpMaps: THREE.CanvasTexture[];
} {
  // BoxGeometry group indices: 0:+X(3), 1:-X(4), 2:+Y(5), 3:-Y(2), 4:+Z(1), 5:-Z(6)
  const pipCounts = [3, 4, 5, 2, 1, 6];
  const layouts: Record<number, Array<[number, number]>> = {
    1: [[0.5, 0.5]],
    2: [
      [0.27, 0.27],
      [0.73, 0.73],
    ],
    3: [
      [0.26, 0.26],
      [0.5, 0.5],
      [0.74, 0.74],
    ],
    4: [
      [0.27, 0.27],
      [0.73, 0.27],
      [0.27, 0.73],
      [0.73, 0.73],
    ],
    5: [
      [0.26, 0.26],
      [0.74, 0.26],
      [0.5, 0.5],
      [0.26, 0.74],
      [0.74, 0.74],
    ],
    6: [
      [0.27, 0.24],
      [0.73, 0.24],
      [0.27, 0.5],
      [0.73, 0.5],
      [0.27, 0.76],
      [0.73, 0.76],
    ],
  };

  const maps: THREE.CanvasTexture[] = [];
  const bumpMaps: THREE.CanvasTexture[] = [];
  const S = 256;

  for (const pips of pipCounts) {
    const [canvas, ctx] = makeCanvas(S, S);
    const [bCanvas, bCtx] = makeCanvas(S, S);

    // Rich ruby-cherry translucent casino acrylic face
    const bg = ctx.createRadialGradient(S * 0.48, S * 0.46, S * 0.04, S * 0.5, S * 0.5, S * 0.72);
    bg.addColorStop(0, '#c81228');
    bg.addColorStop(0.65, '#a40a1d');
    bg.addColorStop(1, '#780513');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    bCtx.fillStyle = '#ffffff';
    bCtx.fillRect(0, 0, S, S);

    const pipR = pips === 1 ? S * 0.115 : S * 0.082;
    for (const [nx, ny] of layouts[pips]) {
      const px = nx * S;
      const py = ny * S;

      // Subtle dark ruby countersunk shadow rim
      ctx.fillStyle = 'rgba(42, 0, 6, 0.45)';
      ctx.beginPath();
      ctx.arc(px, py + 1.5, pipR * 1.12, 0, Math.PI * 2);
      ctx.fill();

      // Warm cream-ivory filled casino pip
      const pipGrad = ctx.createRadialGradient(px - pipR * 0.2, py - pipR * 0.2, 0, px, py, pipR);
      pipGrad.addColorStop(0, '#fffdf7');
      pipGrad.addColorStop(0.78, '#f5eedf');
      pipGrad.addColorStop(1, '#dfd3be');
      ctx.fillStyle = pipGrad;
      ctx.beginPath();
      ctx.arc(px, py, pipR, 0, Math.PI * 2);
      ctx.fill();

      // Recessed spherical bump divot
      const bGrad = bCtx.createRadialGradient(px, py, 0, px, py, pipR * 1.08);
      bGrad.addColorStop(0, '#222222');
      bGrad.addColorStop(0.7, '#646464');
      bGrad.addColorStop(1, '#ffffff');
      bCtx.fillStyle = bGrad;
      bCtx.beginPath();
      bCtx.arc(px, py, pipR * 1.08, 0, Math.PI * 2);
      bCtx.fill();
    }

    maps.push(toTexture(canvas, THREE.SRGBColorSpace, 8));
    bumpMaps.push(toTexture(bCanvas, THREE.NoColorSpace, 4));
  }

  return { maps, bumpMaps };
}

function drawMarbleCracks(ctx: CanvasRenderingContext2D, bCtx: CanvasRenderingContext2D | null, W: number, H: number): void {
  const rng = seededRand(3344);
  const centers = [
    [W * 0.32, H * 0.42],
    [W * 0.68, H * 0.56],
    [W * 0.5, H * 0.28],
  ];
  for (const [cx, cy] of centers) {
    const rays = 9;
    for (let r = 0; r < rays; r++) {
      const baseA = (r / rays) * Math.PI * 2 + (rng() - 0.5) * 0.3;
      let px = cx;
      let py = cy;
      let a = baseA;
      const steps = 4 + Math.floor(rng() * 3);

      const drawSeg = (target: CanvasRenderingContext2D, stroke: string, width: number) => {
        target.strokeStyle = stroke;
        target.lineWidth = width;
        target.lineCap = 'round';
        target.beginPath();
        target.moveTo(px, py);
      };

      const pts: Array<[number, number]> = [[px, py]];
      for (let s = 0; s < steps; s++) {
        const stepLen = 15 + rng() * 22;
        a += (rng() - 0.5) * 0.65;
        px += Math.cos(a) * stepLen;
        py += Math.sin(a) * stepLen;
        pts.push([px, py]);
      }

      drawSeg(ctx, 'rgba(18, 36, 62, 0.72)', 3.6);
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();

      drawSeg(ctx, 'rgba(255, 255, 255, 0.96)', 1.7);
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();

      if (bCtx) {
        drawSeg(bCtx, '#242424', 2.8);
        pts.forEach(([x, y], i) => (i === 0 ? bCtx.moveTo(x, y) : bCtx.lineTo(x, y)));
        bCtx.stroke();
      }
    }
  }
}

function createMarbleCatEyeTextures(): {
  maps: THREE.CanvasTexture[];
  crackedMaps: THREE.CanvasTexture[];
  crackedBumpMap: THREE.CanvasTexture;
} {
  const W = 512;
  const H = 256;
  const palettes: Array<{
    pole: string;
    mid: string;
    ribbonA: string;
    ribbonB: string;
    seed: number;
  }> = [
    { pole: '#3a7cd4', mid: '#bfe2fc', ribbonA: '#0848b8', ribbonB: '#3ee0ff', seed: 101 },
    { pole: '#25965d', mid: '#bcecd3', ribbonA: '#066e38', ribbonB: '#6af568', seed: 202 },
    { pole: '#d97626', mid: '#fbe0b6', ribbonA: '#ba3404', ribbonB: '#ffcc3d', seed: 303 },
    { pole: '#833dc4', mid: '#e2c5f9', ribbonA: '#550d9c', ribbonB: '#eb6cff', seed: 404 },
  ];

  const maps: THREE.CanvasTexture[] = [];
  const crackedMaps: THREE.CanvasTexture[] = [];

  const [bCanvas, bCtx] = makeCanvas(W, H);
  bCtx.fillStyle = '#ffffff';
  bCtx.fillRect(0, 0, W, H);

  for (let idx = 0; idx < palettes.length; idx++) {
    const p = palettes[idx];
    const [canvas, ctx] = makeCanvas(W, H);

    // Translucent jewel-tinted glass depth gradient (richer refractive edge -> luminous core)
    const vGrad = ctx.createLinearGradient(0, 0, 0, H);
    vGrad.addColorStop(0, p.pole);
    vGrad.addColorStop(0.28, p.mid);
    vGrad.addColorStop(0.5, '#f2f9ff');
    vGrad.addColorStop(0.72, p.mid);
    vGrad.addColorStop(1, p.pole);
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, W, H);

    // Soft glass internal depth blooms
    const rngBloom = seededRand(p.seed + 17);
    for (let g = 0; g < 6; g++) {
      const gx = (g / 6) * W + 40;
      const gy = H * (0.35 + rngBloom() * 0.3);
      const rad = 52 + rngBloom() * 34;
      const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
      rg.addColorStop(0, g % 2 === 0 ? p.mid : p.pole);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = rg;
      ctx.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
      ctx.restore();
    }

    // Three twisted translucent cat's-eye ribbons spiraling across equator
    for (let ribbon = 0; ribbon < 3; ribbon++) {
      const phase = (ribbon / 3) * Math.PI * 2;
      ctx.save();
      ctx.globalAlpha = 0.86;
      ctx.strokeStyle = ribbon % 2 === 0 ? p.ribbonA : p.ribbonB;
      ctx.lineWidth = 24 + ribbon * 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const u = (x / W) * Math.PI * 2;
        const y = H * 0.5 + Math.sin(u * 2 + phase) * (H * 0.24);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // White glass filament highlight beside ribbon
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const u = (x / W) * Math.PI * 2;
        const y = H * 0.5 + Math.sin(u * 2 + phase) * (H * 0.24) - 8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Tiny trapped internal glass air bubbles
    const rng = seededRand(p.seed);
    for (let b = 0; b < 26; b++) {
      const bx = rng() * W;
      const by = H * 0.18 + rng() * H * 0.64;
      const br = 1.6 + rng() * 3.4;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.74)';
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }

    maps.push(toTexture(canvas));

    // Cracked variant
    const [cCanvas, cCtx] = makeCanvas(W, H);
    cCtx.drawImage(canvas, 0, 0);
    drawMarbleCracks(cCtx, idx === 0 ? bCtx : null, W, H);
    crackedMaps.push(toTexture(cCanvas));
  }

  return {
    maps,
    crackedMaps,
    crackedBumpMap: toTexture(bCanvas, THREE.NoColorSpace, 4),
  };
}

function createIceTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const S = 256;
  const [canvas, ctx] = makeCanvas(S, S);
  const [bCanvas, bCtx] = makeCanvas(S, S);
  const [rCanvas, rCtx] = makeCanvas(S, S);

  // Clear glacial azure-tinted ice interior with faint frosty corners
  const grad = ctx.createRadialGradient(S * 0.5, S * 0.5, S * 0.08, S * 0.5, S * 0.5, S * 0.72);
  grad.addColorStop(0, '#9bd8fa');
  grad.addColorStop(0.65, '#bae7ff');
  grad.addColorStop(1, '#dcf3ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  bCtx.fillStyle = '#909090';
  bCtx.fillRect(0, 0, S, S);
  rCtx.fillStyle = '#2c2c2c';
  rCtx.fillRect(0, 0, S, S);

  const rng = seededRand(9021);
  // Subtle melt ripples + internal frozen crystal needles
  for (let i = 0; i < 60; i++) {
    const cx = rng() * S;
    const cy = rng() * S;
    const rad = 14 + rng() * 34;

    const cG = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    cG.addColorStop(0, rng() > 0.45 ? 'rgba(235, 250, 255, 0.25)' : 'rgba(120, 195, 238, 0.22)');
    cG.addColorStop(1, 'rgba(186, 231, 255, 0)');
    ctx.fillStyle = cG;
    ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);

    const bG = bCtx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    const val = rng() > 0.5 ? 'rgba(220,220,220,0.35)' : 'rgba(60,60,60,0.35)';
    bG.addColorStop(0, val);
    bG.addColorStop(1, 'rgba(144,144,144,0)');
    bCtx.fillStyle = bG;
    bCtx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);

    const rG = rCtx.createRadialGradient(cx, cy, 0, cx, cy, rad * 0.8);
    rG.addColorStop(0, rng() > 0.35 ? 'rgba(115,115,115,0.28)' : 'rgba(24,24,24,0.25)');
    rG.addColorStop(1, 'rgba(44,44,44,0)');
    rCtx.fillStyle = rG;
    rCtx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }

  for (let i = 0; i < 45; i++) {
    const x1 = rng() * S;
    const y1 = rng() * S;
    const a = rng() * Math.PI * 2;
    const len = 14 + rng() * 38;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + Math.cos(a) * len, y1 + Math.sin(a) * len);
    ctx.stroke();

    bCtx.strokeStyle = 'rgba(235,235,235,0.45)';
    bCtx.lineWidth = 1.1;
    bCtx.beginPath();
    bCtx.moveTo(x1, y1);
    bCtx.lineTo(x1 + Math.cos(a) * len, y1 + Math.sin(a) * len);
    bCtx.stroke();

    rCtx.strokeStyle = 'rgba(165,165,165,0.48)';
    rCtx.lineWidth = 1.4;
    rCtx.beginPath();
    rCtx.moveTo(x1, y1);
    rCtx.lineTo(x1 + Math.cos(a) * len, y1 + Math.sin(a) * len);
    rCtx.stroke();
  }

  return {
    map: toTexture(canvas),
    bumpMap: toTexture(bCanvas, THREE.NoColorSpace, 4),
    roughnessMap: toTexture(rCanvas, THREE.NoColorSpace, 4),
  };
}

function createPorcelainTextures(): {
  maps: THREE.CanvasTexture[];
  crackedMaps: THREE.CanvasTexture[];
  roughnessMap: THREE.CanvasTexture;
  crackedBumpMap: THREE.CanvasTexture;
} {
  const W = 512;
  const H = 256;

  const [rCanvas, rCtx] = makeCanvas(W, H);
  rCtx.fillStyle = '#2c2c2c';
  rCtx.fillRect(0, 0, W, H);

  const [bCanvas, bCtx] = makeCanvas(W, H);
  bCtx.fillStyle = '#ffffff';
  bCtx.fillRect(0, 0, W, H);

  const maps: THREE.CanvasTexture[] = [];
  const crackedMaps: THREE.CanvasTexture[] = [];

  // Variant 0: Qinghua cobalt blue-and-white floral scrollwork
  {
    const [canvas, ctx] = makeCanvas(W, H);
    ctx.fillStyle = '#f5f3ed';
    ctx.fillRect(0, 0, W, H);

    // Shoulder & foot cobalt rings
    ctx.strokeStyle = '#1b479e';
    ctx.lineWidth = 4;
    for (const yBand of [H * 0.16, H * 0.21, H * 0.79, H * 0.84]) {
      ctx.beginPath();
      ctx.moveTo(0, yBand);
      ctx.lineTo(W, yBand);
      ctx.stroke();
    }

    // Cloud collar ruyi scallops along neck
    ctx.fillStyle = 'rgba(27, 71, 158, 0.85)';
    for (let x = 0; x < W; x += W / 8) {
      ctx.beginPath();
      ctx.arc(x + W / 16, H * 0.21, W / 18, 0, Math.PI);
      ctx.fill();
    }

    // Winding peony-vine scroll & cobalt blossoms around equator
    ctx.strokeStyle = '#2352ad';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 6) {
      const y = H * 0.5 + Math.sin((x / W) * Math.PI * 6) * (H * 0.14);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    for (let k = 0; k < 4; k++) {
      const fx = ((k + 0.5) / 4) * W;
      const fy = H * 0.5 + (k % 2 === 0 ? -12 : 12);
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2;
        ctx.fillStyle = p % 2 === 0 ? '#1b479e' : '#396ed0';
        ctx.beginPath();
        ctx.ellipse(fx + Math.cos(a) * 18, fy + Math.sin(a) * 14, 12, 8, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#0f2c6b';
      ctx.beginPath();
      ctx.arc(fx, fy, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    maps.push(toTexture(canvas));

    const [cCanvas, cCtx] = makeCanvas(W, H);
    cCtx.drawImage(canvas, 0, 0);
    drawPorcelainStructuralCracks(cCtx, bCtx, W, H);
    crackedMaps.push(toTexture(cCanvas));
  }

  // Variant 1: Ru-Ware Sky Celadon with golden-wire craze
  {
    const [canvas, ctx] = makeCanvas(W, H);
    ctx.fillStyle = '#9cbcb4';
    ctx.fillRect(0, 0, W, H);

    const rng = seededRand(6602);
    // Subtle kiln glaze depth mottling
    for (let i = 0; i < 48; i++) {
      const x = rng() * W;
      const y = rng() * H;
      const r = 18 + rng() * 34;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rng() > 0.5 ? 'rgba(176, 206, 198, 0.28)' : 'rgba(116, 148, 140, 0.25)');
      g.addColorStop(1, 'rgba(156, 188, 180, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Golden-wire iron-thread craze network (金丝铁线)
    for (let i = 0; i < 36; i++) {
      let px = rng() * W;
      let py = rng() * H;
      let a = rng() * Math.PI * 2;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(72, 62, 50, 0.35)' : 'rgba(196, 158, 92, 0.32)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let s = 0; s < 5; s++) {
        a += (rng() - 0.5) * 0.9;
        px += Math.cos(a) * (16 + rng() * 20);
        py += Math.sin(a) * (16 + rng() * 20);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    maps.push(toTexture(canvas));

    const [cCanvas, cCtx] = makeCanvas(W, H);
    cCtx.drawImage(canvas, 0, 0);
    drawPorcelainStructuralCracks(cCtx, null, W, H);
    crackedMaps.push(toTexture(cCanvas));
  }

  // Variant 2: Underglaze Copper-Red plum blossom (釉里红梅)
  {
    const [canvas, ctx] = makeCanvas(W, H);
    ctx.fillStyle = '#f3efe5';
    ctx.fillRect(0, 0, W, H);

    // Ink plum branches
    ctx.strokeStyle = 'rgba(54, 42, 38, 0.78)';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(W * 0.08, H * 0.72);
    ctx.bezierCurveTo(W * 0.28, H * 0.56, W * 0.44, H * 0.42, W * 0.66, H * 0.48);
    ctx.bezierCurveTo(W * 0.78, H * 0.52, W * 0.88, H * 0.36, W * 0.94, H * 0.32);
    ctx.stroke();

    const blossoms: Array<[number, number, number]> = [
      [W * 0.26, H * 0.54, 15],
      [W * 0.42, H * 0.42, 18],
      [W * 0.58, H * 0.5, 14],
      [W * 0.76, H * 0.44, 17],
      [W * 0.88, H * 0.34, 13],
    ];
    for (const [bx, by, br] of blossoms) {
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.fillStyle = p % 2 === 0 ? '#ad2635' : '#c74351';
        ctx.beginPath();
        ctx.arc(bx + Math.cos(a) * br * 0.72, by + Math.sin(a) * br * 0.72, br * 0.52, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#6c101b';
      ctx.beginPath();
      ctx.arc(bx, by, br * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    maps.push(toTexture(canvas));

    const [cCanvas, cCtx] = makeCanvas(W, H);
    cCtx.drawImage(canvas, 0, 0);
    drawPorcelainStructuralCracks(cCtx, null, W, H);
    crackedMaps.push(toTexture(cCanvas));
  }

  return {
    maps,
    crackedMaps,
    roughnessMap: toTexture(rCanvas, THREE.NoColorSpace, 4),
    crackedBumpMap: toTexture(bCanvas, THREE.NoColorSpace, 4),
  };
}

function drawPorcelainStructuralCracks(
  ctx: CanvasRenderingContext2D,
  bCtx: CanvasRenderingContext2D | null,
  W: number,
  H: number,
): void {
  const rng = seededRand(7129);
  for (let c = 0; c < 3; c++) {
    const cx = W * (0.22 + c * 0.28);
    const cy = H * (0.4 + (c % 2) * 0.16);
    for (let r = 0; r < 6; r++) {
      let px = cx;
      let py = cy;
      let a = (r / 6) * Math.PI * 2 + rng() * 0.35;
      const pts: Array<[number, number]> = [[px, py]];
      for (let s = 0; s < 5; s++) {
        a += (rng() - 0.5) * 0.7;
        px += Math.cos(a) * (15 + rng() * 20);
        py += Math.sin(a) * (15 + rng() * 20);
        pts.push([px, py]);
      }

      ctx.strokeStyle = 'rgba(232, 224, 210, 0.85)';
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();

      ctx.strokeStyle = '#251e1a';
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();

      if (bCtx) {
        bCtx.strokeStyle = '#181818';
        bCtx.lineWidth = 2.8;
        bCtx.beginPath();
        pts.forEach(([x, y], i) => (i === 0 ? bCtx.moveTo(x, y) : bCtx.lineTo(x, y)));
        bCtx.stroke();
      }
    }
  }
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
      case 'bulbs': {
        const cap = createBrassCapTextures();
        items = {
          itemMap: cap.map,
          itemBumpMap: cap.bumpMap,
          itemRoughnessMap: cap.roughnessMap,
        };
        break;
      }
      case 'balloons':
      case 'jelly':
      case 'bearings': {
        items = {};
        break;
      }
      case 'dice': {
        const d = createCasinoDiceTextures();
        items = { itemMaps: d.maps, itemBumpMaps: d.bumpMaps };
        break;
      }
      case 'marbles': {
        const m = createMarbleCatEyeTextures();
        items = {
          itemMaps: m.maps,
          crackedMaps: m.crackedMaps,
          crackedBumpMap: m.crackedBumpMap,
        };
        break;
      }
      case 'ice': {
        const ic = createIceTextures();
        items = {
          itemMap: ic.map,
          itemBumpMap: ic.bumpMap,
          itemRoughnessMap: ic.roughnessMap,
        };
        break;
      }
      case 'porcelain': {
        const p = createPorcelainTextures();
        items = {
          itemMaps: p.maps,
          crackedMaps: p.crackedMaps,
          itemRoughnessMap: p.roughnessMap,
          crackedBumpMap: p.crackedBumpMap,
        };
        break;
      }
    }
    this.itemCache.set(id, items);
    return items;
  }

  private getFloor(id: ThemeId, aspect: number): FloorTextureSet {
    const isAspectInvariant =
      id === 'diamonds' ||
      id === 'gold' ||
      id === 'jelly' ||
      id === 'porcelain' ||
      id === 'balloons';
    const bucket = isAspectInvariant
      ? 'fixed'
      : (Math.round(Math.max(0.4, Math.min(2.6, aspect)) * 20) / 20).toFixed(2);
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
      case 'bulbs':
        floor = createBulbsBenchFloorTextures(Number(bucket));
        break;
      case 'balloons':
        floor = { floorMap: createBalloonSkyFloorTexture(9 / 19.5) };
        break;
      case 'dice':
        floor = createCasinoBaizeFloorTextures(Number(bucket));
        break;
      case 'marbles':
        floor = createTerrazzoFloorTextures(Number(bucket));
        break;
      case 'ice':
        floor = createIceSteelFloorTextures(Number(bucket));
        break;
      case 'jelly':
        floor = { floorMap: createJellyStudioFloorTexture(9 / 19.5) };
        break;
      case 'bearings':
        floor = createTitaniumFloorTextures(Number(bucket));
        break;
      case 'porcelain':
        floor = { floorMap: createPorcelainFloorTexture(9 / 19.5) };
        break;
    }

    if (this.floorCache.size >= 14) {
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
      it.crackedBumpMap?.dispose();
      it.itemMaps?.forEach((t) => t.dispose());
      it.itemBumpMaps?.forEach((t) => t.dispose());
      it.itemRoughnessMaps?.forEach((t) => t.dispose());
      it.crackedMaps?.forEach((t) => t.dispose());
    }
    this.itemCache.clear();
  }
}
