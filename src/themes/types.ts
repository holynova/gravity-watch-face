export type ThemeId = 'tennis' | 'diamonds' | 'basketball' | 'gold' | 'soccer';

export type OverlayLayout = 'court' | 'vault';

export type EnvPreset = 'sport' | 'diamond' | 'gold';

export type ShapeKind = 'sphere' | 'diamond' | 'ingot';

export interface ThemeSpec {
  id: ThemeId;
  labelZh: string;
  labelEn: string;
  swatchColor: string;
  swatchAccent: string;
  overlayLayout: OverlayLayout;
  envPreset: EnvPreset;
  shapeKind: ShapeKind;
  wallColor: string;
  floorBaseColor: string;
  restitution: number;
  friction: number;
  mass: number;
  linearDamping: number;
  angularDamping: number;
  boxDepthFactor: number;
  baseCount: number;
  sizeFactor: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  keyLightColor: number;
  keyLightIntensity: number;
  fillLightColor: number;
  fillLightIntensity: number;
  shadowTint: number;
  bounceColor: number;
  lightRadius: number;
  floorAoGain: number;
  itemAoGain: number;
  depthDarkMin: number;
  bloomStrength: number;
  bloomThreshold: number;
  bloomRadius: number;
  exposure: number;
}

export const THEME_LIST: ThemeSpec[] = [
  {
    id: 'tennis',
    labelZh: '网球场',
    labelEn: 'Tennis',
    swatchColor: '#c9ea2c',
    swatchAccent: '#a53f28',
    overlayLayout: 'court',
    envPreset: 'sport',
    shapeKind: 'sphere',
    wallColor: '#0b1e13',
    floorBaseColor: '#163d27',
    restitution: 0.48,
    friction: 0.34,
    mass: 1.0,
    linearDamping: 0.08,
    angularDamping: 0.14,
    boxDepthFactor: 0.56,
    baseCount: 19,
    sizeFactor: 0.086,
    hemiSkyColor: 0xeaf2ff,
    hemiGroundColor: 0x5c2414,
    hemiIntensity: 0.28,
    keyLightColor: 0xfff8eb,
    keyLightIntensity: 2.75,
    fillLightColor: 0xcbe0ff,
    fillLightIntensity: 0.12,
    shadowTint: 0x6b2211,
    bounceColor: 0xa63c22,
    lightRadius: 0.25,
    floorAoGain: 1.42,
    itemAoGain: 1.24,
    depthDarkMin: 0.64,
    bloomStrength: 0.05,
    bloomThreshold: 1.08,
    bloomRadius: 0.35,
    exposure: 1.04,
  },
  {
    id: 'diamonds',
    labelZh: '钻石库',
    labelEn: 'Diamonds',
    swatchColor: '#e8f4ff',
    swatchAccent: '#86c5ff',
    overlayLayout: 'vault',
    envPreset: 'diamond',
    shapeKind: 'diamond',
    wallColor: '#07090e',
    floorBaseColor: '#07090f',
    restitution: 0.24,
    friction: 0.22,
    mass: 1.8,
    linearDamping: 0.1,
    angularDamping: 0.16,
    boxDepthFactor: 0.62,
    baseCount: 25,
    sizeFactor: 0.095,
    hemiSkyColor: 0xc8deff,
    hemiGroundColor: 0x05070b,
    hemiIntensity: 0.1,
    keyLightColor: 0xf7fbff,
    keyLightIntensity: 0.78,
    fillLightColor: 0x9fc6ff,
    fillLightIntensity: 0.16,
    shadowTint: 0x0a101b,
    bounceColor: 0x0e1624,
    lightRadius: 0.28,
    floorAoGain: 1.25,
    itemAoGain: 0.98,
    depthDarkMin: 0.72,
    bloomStrength: 0.18,
    bloomThreshold: 1.15,
    bloomRadius: 0.44,
    exposure: 1.08,
  },
  {
    id: 'basketball',
    labelZh: '篮球场',
    labelEn: 'Basketball',
    swatchColor: '#cf4c1c',
    swatchAccent: '#251d18',
    overlayLayout: 'court',
    envPreset: 'sport',
    shapeKind: 'sphere',
    wallColor: '#120d0a',
    floorBaseColor: '#231914',
    restitution: 0.52,
    friction: 0.36,
    mass: 1.25,
    linearDamping: 0.07,
    angularDamping: 0.12,
    boxDepthFactor: 0.58,
    baseCount: 18,
    sizeFactor: 0.09,
    hemiSkyColor: 0xf0ebe4,
    hemiGroundColor: 0x2c1b11,
    hemiIntensity: 0.28,
    keyLightColor: 0xfff3e2,
    keyLightIntensity: 2.8,
    fillLightColor: 0xd0e2ff,
    fillLightIntensity: 0.12,
    shadowTint: 0x1c1009,
    bounceColor: 0x342014,
    lightRadius: 0.25,
    floorAoGain: 1.38,
    itemAoGain: 1.28,
    depthDarkMin: 0.6,
    bloomStrength: 0.05,
    bloomThreshold: 1.08,
    bloomRadius: 0.35,
    exposure: 1.07,
  },
  {
    id: 'gold',
    labelZh: '黄金库',
    labelEn: 'Gold Bars',
    swatchColor: '#f3c33e',
    swatchAccent: '#8c6111',
    overlayLayout: 'vault',
    envPreset: 'gold',
    shapeKind: 'ingot',
    wallColor: '#0c0904',
    floorBaseColor: '#0c0904',
    restitution: 0.16,
    friction: 0.26,
    mass: 3.4,
    linearDamping: 0.11,
    angularDamping: 0.2,
    boxDepthFactor: 0.6,
    baseCount: 18,
    sizeFactor: 0.108,
    hemiSkyColor: 0xffe9b5,
    hemiGroundColor: 0x100c04,
    hemiIntensity: 0.18,
    keyLightColor: 0xfff4d6,
    keyLightIntensity: 1.42,
    fillLightColor: 0xffd27a,
    fillLightIntensity: 0.26,
    shadowTint: 0x181004,
    bounceColor: 0x2e1f07,
    lightRadius: 0.28,
    floorAoGain: 1.25,
    itemAoGain: 1.12,
    depthDarkMin: 0.62,
    bloomStrength: 0.16,
    bloomThreshold: 1.05,
    bloomRadius: 0.42,
    exposure: 1.04,
  },
  {
    id: 'soccer',
    labelZh: '足球场',
    labelEn: 'Soccer',
    swatchColor: '#f4f6f4',
    swatchAccent: '#2d5c20',
    overlayLayout: 'court',
    envPreset: 'sport',
    shapeKind: 'sphere',
    wallColor: '#0e1f0b',
    floorBaseColor: '#2b591e',
    restitution: 0.46,
    friction: 0.32,
    mass: 1.1,
    linearDamping: 0.08,
    angularDamping: 0.14,
    boxDepthFactor: 0.56,
    baseCount: 20,
    sizeFactor: 0.086,
    hemiSkyColor: 0xedf6ff,
    hemiGroundColor: 0x1a3b12,
    hemiIntensity: 0.3,
    keyLightColor: 0xfffaf0,
    keyLightIntensity: 2.6,
    fillLightColor: 0xcbe2ff,
    fillLightIntensity: 0.12,
    shadowTint: 0x12300c,
    bounceColor: 0x265419,
    lightRadius: 0.25,
    floorAoGain: 1.42,
    itemAoGain: 1.26,
    depthDarkMin: 0.64,
    bloomStrength: 0.05,
    bloomThreshold: 1.08,
    bloomRadius: 0.35,
    exposure: 1.04,
  },
];

export const THEMES_BY_ID: Record<ThemeId, ThemeSpec> = Object.fromEntries(
  THEME_LIST.map((theme) => [theme.id, theme]),
) as Record<ThemeId, ThemeSpec>;

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return Boolean(value && value in THEMES_BY_ID);
}
