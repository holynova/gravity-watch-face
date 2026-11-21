import * as THREE from 'three';
import { EnvPreset } from './types';

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function norm3(x: number, y: number, z: number): [number, number, number] {
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

function gaussSpot(
  dx: number,
  dy: number,
  dz: number,
  lx: number,
  ly: number,
  lz: number,
  sigma: number,
): number {
  const dot = Math.max(-1, Math.min(1, dx * lx + dy * ly + dz * lz));
  const angle = Math.acos(dot);
  return Math.exp(-(angle * angle) / (2 * sigma * sigma));
}

type RgbEval = (dx: number, dy: number, dz: number, r: [number, number, number]) => void;

function buildEquirectangularHdr(evalPixel: RgbEval, width = 512, height = 256): THREE.DataTexture {
  const data = new Uint16Array(width * height * 4);
  const rgb: [number, number, number] = [0, 0, 0];
  const toHalf = THREE.DataUtils.toHalfFloat;
  const oneHalf = toHalf(1);

  for (let py = 0; py < height; py++) {
    const v = (py + 0.5) / height;
    const el = (v - 0.5) * Math.PI;
    const cosEl = Math.cos(el);
    const dy = Math.sin(el);

    for (let px = 0; px < width; px++) {
      const u = (px + 0.5) / width;
      const az = (u - 0.5) * Math.PI * 2;
      const dx = cosEl * Math.cos(az);
      const dz = cosEl * Math.sin(az);

      evalPixel(dx, dy, dz, rgb);

      const idx = (py * width + px) * 4;
      data[idx] = toHalf(Math.min(60, Math.max(0, rgb[0])));
      data[idx + 1] = toHalf(Math.min(60, Math.max(0, rgb[1])));
      data[idx + 2] = toHalf(Math.min(60, Math.max(0, rgb[2])));
      data[idx + 3] = oneHalf;
    }
  }

  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function makeSportEvaluator(): RgbEval {
  const keyDir = norm3(-0.55, 0.62, 0.56);
  const fillDir = norm3(0.65, -0.25, 0.72);
  const skyDir = norm3(0.05, 0.92, 0.38);

  return (dx, dy, dz, out) => {
    const skyMix = smoothstep(-0.85, 0.85, dy);
    let r = 0.08 + (0.38 - 0.08) * skyMix;
    let g = 0.075 + (0.44 - 0.075) * skyMix;
    let b = 0.065 + (0.52 - 0.065) * skyMix;

    // Broad Gaussian daylight window key diffuser
    const wKey = gaussSpot(dx, dy, dz, keyDir[0], keyDir[1], keyDir[2], 0.36);
    r += wKey * 3.6;
    g += wKey * 3.52;
    b += wKey * 3.38;

    // Gentle low-right studio bounce fill
    const wFill = gaussSpot(dx, dy, dz, fillDir[0], fillDir[1], fillDir[2], 0.55);
    r += wFill * 0.55;
    g += wFill * 0.53;
    b += wFill * 0.5;

    // Soft overhead skylight fill
    const wSky = gaussSpot(dx, dy, dz, skyDir[0], skyDir[1], skyDir[2], 0.52);
    r += wSky * 0.78;
    g += wSky * 0.84;
    b += wSky * 0.92;

    out[0] = r;
    out[1] = g;
    out[2] = b;
  };
}

interface SparkSpot {
  dir: [number, number, number];
  dirR: [number, number, number];
  dirB: [number, number, number];
  sigma: number;
  peak: number;
  prismatic: boolean;
}

function makeDiamondEvaluator(): RgbEval {
  const stripA = norm3(-0.42, 0.65, 0.62);
  const stripB = norm3(0.68, 0.24, 0.69);
  const stripC = norm3(0.18, -0.64, 0.74);

  const spots: SparkSpot[] = [];
  for (let i = 0; i < 36; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / 36);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.sin(phi) * Math.sin(theta);
    const z = Math.cos(phi);

    // Slight angular dispersion offset for prismatic rainbow fire on selected sparkles
    const disp = 0.026;
    const tx = -Math.sin(theta);
    const ty = Math.cos(theta);

    spots.push({
      dir: norm3(x, y, z),
      dirR: norm3(x + tx * disp, y + ty * disp, z),
      dirB: norm3(x - tx * disp, y - ty * disp, z),
      sigma: 0.045 + (i % 4) * 0.014,
      peak: i % 3 === 0 ? 15.5 : 8.5,
      prismatic: i % 2 === 0,
    });
  }

  return (dx, dy, dz, out) => {
    // Deep velvet base + soft silver architectural ambient band
    let r = 0.015;
    let g = 0.018;
    let b = 0.025;

    const silverBand = Math.exp(-Math.pow((dy - 0.12) / 0.24, 2)) * Math.max(0, dz * 0.5 + 0.5);
    const archBand = Math.exp(-Math.pow((dx + dy * 0.6) / 0.35, 2)) * smoothstep(-0.3, 0.8, dz);
    const archGain = silverBand * 0.42 + archBand * 0.32;
    r += archGain * 0.86;
    g += archGain * 0.94;
    b += archGain * 1.08;

    // Feathered jeweler studio strip lights
    const sA = Math.pow(gaussSpot(dx, dy, dz, stripA[0], stripA[1], stripA[2], 0.24), 1.4);
    const sB = Math.pow(gaussSpot(dx, dy, dz, stripB[0], stripB[1], stripB[2], 0.22), 1.4);
    const sC = Math.pow(gaussSpot(dx, dy, dz, stripC[0], stripC[1], stripC[2], 0.28), 1.3);

    r += sA * 8.6 + sB * 6.8 + sC * 3.9;
    g += sA * 8.9 + sB * 7.4 + sC * 3.7;
    b += sA * 9.6 + sB * 8.2 + sC * 3.4;

    // Pinpoint jewel scintillation + dispersion fire
    for (let i = 0; i < spots.length; i++) {
      const sp = spots[i];
      if (sp.prismatic) {
        const wR = gaussSpot(dx, dy, dz, sp.dirR[0], sp.dirR[1], sp.dirR[2], sp.sigma);
        const wG = gaussSpot(dx, dy, dz, sp.dir[0], sp.dir[1], sp.dir[2], sp.sigma);
        const wB = gaussSpot(dx, dy, dz, sp.dirB[0], sp.dirB[1], sp.dirB[2], sp.sigma);
        r += wR * sp.peak;
        g += wG * sp.peak;
        b += wB * sp.peak * 1.08;
      } else {
        const w = gaussSpot(dx, dy, dz, sp.dir[0], sp.dir[1], sp.dir[2], sp.sigma);
        r += w * sp.peak * 0.95;
        g += w * sp.peak;
        b += w * sp.peak * 1.05;
      }
    }

    out[0] = r;
    out[1] = g;
    out[2] = b;
  };
}

function makeGoldEvaluator(): RgbEval {
  const ribA = norm3(-0.48, 0.58, 0.65);
  const ribB = norm3(0.68, 0.16, 0.71);
  const ribC = norm3(0.15, -0.66, 0.73);
  const ribD = norm3(0.0, 0.14, 0.99);

  return (dx, dy, dz, out) => {
    // Continuous warm bronze-to-champagne studio dome gradient (zero flat panel edges)
    const domeT = smoothstep(-1.0, 1.0, dy);
    let r = 0.08 + (0.44 - 0.08) * domeT;
    let g = 0.055 + (0.33 - 0.055) * domeT;
    let b = 0.018 + (0.12 - 0.018) * domeT;

    // Subtle warm horizon wrap
    const wrap = Math.exp(-Math.pow(dy / 0.42, 2));
    r += wrap * 0.28;
    g += wrap * 0.21;
    b += wrap * 0.07;

    // Diagonally feathered cream-gold studio light ribbons
    const wA = gaussSpot(dx, dy, dz, ribA[0], ribA[1], ribA[2], 0.34);
    const wB = gaussSpot(dx, dy, dz, ribB[0], ribB[1], ribB[2], 0.38);
    const wC = gaussSpot(dx, dy, dz, ribC[0], ribC[1], ribC[2], 0.44);
    const wD = gaussSpot(dx, dy, dz, ribD[0], ribD[1], ribD[2], 0.28);

    // Diagonal streak modulation for organic bullion highlights
    const diag = 0.65 + 0.35 * Math.sin((dx * 1.8 - dy * 1.4) * Math.PI);

    r += (wA * 4.4 + wB * 3.6 + wC * 2.6 + wD * 4.8) * diag;
    g += (wA * 4.0 + wB * 3.15 + wC * 2.15 + wD * 4.4) * diag;
    b += (wA * 2.9 + wB * 2.0 + wC * 1.15 + wD * 3.35) * diag;

    out[0] = r;
    out[1] = g;
    out[2] = b;
  };
}

export class EnvironmentBank {
  private readonly cache = new Map<EnvPreset, THREE.Texture>();
  private readonly pmrem: THREE.PMREMGenerator;

  constructor(renderer: THREE.WebGLRenderer) {
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
  }

  get(preset: EnvPreset): THREE.Texture {
    const hit = this.cache.get(preset);
    if (hit) return hit;

    const evaluator =
      preset === 'diamond'
        ? makeDiamondEvaluator()
        : preset === 'gold'
          ? makeGoldEvaluator()
          : makeSportEvaluator();

    const equirectTex = buildEquirectangularHdr(evaluator, 512, 256);
    const target = this.pmrem.fromEquirectangular(equirectTex);
    equirectTex.dispose();

    this.cache.set(preset, target.texture);
    return target.texture;
  }

  dispose(): void {
    for (const tex of this.cache.values()) {
      tex.dispose();
    }
    this.cache.clear();
    this.pmrem.dispose();
  }
}
