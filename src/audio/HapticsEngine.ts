import { MaterialTag, ShardKind, ThemeId } from '../themes/types';

export interface CollisionHapticEvent {
  speed: number;
  kind: 'wall' | 'body';
  mass: number;
  materialTag?: MaterialTag;
}

export interface MotionMetrics {
  avgSpeed: number;
  maxSpeed: number;
  movingCount: number;
}

export interface HapticStats {
  enabled: boolean;
  hasVibrate: boolean;
  collisions: number;
  rollingTicks: number;
  nudges: number;
  shakes: number;
  shatters: number;
  uiTaps: number;
}

interface MaterialHapticProfile {
  heavyThreshold: number;
  wallHeavy: number | number[];
  wallLightBase: number;
  wallLightGain: number;
  bodyBase: number;
  bodyGain: number;
  bodyMax: number;
  rollIntervalMax: number;
  rollIntervalMin: number;
  rollPulse: number;
  rollDisabled?: boolean;
  nudge: number;
  themeSwitch: number[];
  recoilGain: number;
}

const HAPTIC_PROFILES: Record<ThemeId, MaterialHapticProfile> = {
  tennis: {
    heavyThreshold: 6.2,
    wallHeavy: [8, 18, 5],
    wallLightBase: 4,
    wallLightGain: 2.0,
    bodyBase: 2.5,
    bodyGain: 0.52,
    bodyMax: 7,
    rollIntervalMax: 135,
    rollIntervalMin: 68,
    rollPulse: 3,
    nudge: 5,
    themeSwitch: [7, 18, 5],
    recoilGain: 0.9,
  },
  diamonds: {
    heavyThreshold: 5.5,
    wallHeavy: [4, 12, 4],
    wallLightBase: 3,
    wallLightGain: 1.5,
    bodyBase: 2.2,
    bodyGain: 0.42,
    bodyMax: 6,
    rollIntervalMax: 120,
    rollIntervalMin: 65,
    rollPulse: 3,
    nudge: 4,
    themeSwitch: [5, 16, 4],
    recoilGain: 0.85,
  },
  basketball: {
    heavyThreshold: 6.0,
    wallHeavy: [11, 24, 6],
    wallLightBase: 5,
    wallLightGain: 2.2,
    bodyBase: 3,
    bodyGain: 0.6,
    bodyMax: 8,
    rollIntervalMax: 130,
    rollIntervalMin: 64,
    rollPulse: 4,
    nudge: 6,
    themeSwitch: [11, 24, 7],
    recoilGain: 1.05,
  },
  gold: {
    heavyThreshold: 5.2,
    wallHeavy: [14, 18, 9],
    wallLightBase: 6,
    wallLightGain: 2.4,
    bodyBase: 4,
    bodyGain: 0.7,
    bodyMax: 10,
    rollIntervalMax: 145,
    rollIntervalMin: 72,
    rollPulse: 5,
    nudge: 7,
    themeSwitch: [14, 22, 10],
    recoilGain: 1.25,
  },
  soccer: {
    heavyThreshold: 6.2,
    wallHeavy: [10, 20, 6],
    wallLightBase: 4.5,
    wallLightGain: 2.1,
    bodyBase: 2.8,
    bodyGain: 0.55,
    bodyMax: 7,
    rollIntervalMax: 135,
    rollIntervalMin: 66,
    rollPulse: 3.5,
    nudge: 5,
    themeSwitch: [9, 20, 6],
    recoilGain: 0.95,
  },
  bulbs: {
    heavyThreshold: 5.8,
    wallHeavy: [6, 12, 4],
    wallLightBase: 3,
    wallLightGain: 1.6,
    bodyBase: 2.5,
    bodyGain: 0.48,
    bodyMax: 6,
    rollIntervalMax: 140,
    rollIntervalMin: 75,
    rollPulse: 3,
    nudge: 4,
    themeSwitch: [5, 10, 4],
    recoilGain: 0.8,
  },
  balloons: {
    heavyThreshold: 8.5,
    wallHeavy: [4, 22, 3],
    wallLightBase: 2,
    wallLightGain: 0.7,
    bodyBase: 2,
    bodyGain: 0.25,
    bodyMax: 4,
    rollIntervalMax: 220,
    rollIntervalMin: 160,
    rollPulse: 2,
    rollDisabled: true,
    nudge: 3,
    themeSwitch: [3, 18, 3],
    recoilGain: 0.45,
  },
  dice: {
    heavyThreshold: 5.4,
    wallHeavy: [7, 11, 5, 9, 4],
    wallLightBase: 4,
    wallLightGain: 1.8,
    bodyBase: 3.5,
    bodyGain: 0.65,
    bodyMax: 8,
    rollIntervalMax: 96,
    rollIntervalMin: 48,
    rollPulse: 5,
    nudge: 6,
    themeSwitch: [6, 12, 6, 12, 5],
    recoilGain: 1.0,
  },
  marbles: {
    heavyThreshold: 5.6,
    wallHeavy: [5, 10, 4],
    wallLightBase: 3,
    wallLightGain: 1.4,
    bodyBase: 2.5,
    bodyGain: 0.55,
    bodyMax: 6,
    rollIntervalMax: 108,
    rollIntervalMin: 56,
    rollPulse: 3,
    nudge: 4,
    themeSwitch: [4, 10, 4],
    recoilGain: 0.9,
  },
  ice: {
    heavyThreshold: 5.8,
    wallHeavy: [8, 12, 5],
    wallLightBase: 3.5,
    wallLightGain: 1.6,
    bodyBase: 3,
    bodyGain: 0.5,
    bodyMax: 7,
    rollIntervalMax: 155,
    rollIntervalMin: 82,
    rollPulse: 3,
    nudge: 4,
    themeSwitch: [7, 14, 4],
    recoilGain: 0.85,
  },
  jelly: {
    heavyThreshold: 5.5,
    wallHeavy: [6, 18, 10, 16, 4],
    wallLightBase: 4,
    wallLightGain: 1.5,
    bodyBase: 3,
    bodyGain: 0.45,
    bodyMax: 7,
    rollIntervalMax: 130,
    rollIntervalMin: 68,
    rollPulse: 4,
    nudge: 5,
    themeSwitch: [5, 16, 8, 14, 4],
    recoilGain: 0.75,
  },
  bearings: {
    heavyThreshold: 4.8,
    wallHeavy: [18, 16, 12],
    wallLightBase: 7,
    wallLightGain: 2.8,
    bodyBase: 5,
    bodyGain: 0.9,
    bodyMax: 12,
    rollIntervalMax: 105,
    rollIntervalMin: 46,
    rollPulse: 6,
    nudge: 9,
    themeSwitch: [16, 16, 12],
    recoilGain: 1.45,
  },
  porcelain: {
    heavyThreshold: 5.6,
    wallHeavy: [7, 14, 5],
    wallLightBase: 3.5,
    wallLightGain: 1.7,
    bodyBase: 3,
    bodyGain: 0.55,
    bodyMax: 7,
    rollIntervalMax: 128,
    rollIntervalMin: 62,
    rollPulse: 3.5,
    nudge: 5,
    themeSwitch: [6, 14, 5],
    recoilGain: 0.95,
  },
  bouncy: {
    heavyThreshold: 5.5,
    wallHeavy: [9, 14, 7],
    wallLightBase: 4.5,
    wallLightGain: 2.0,
    bodyBase: 3.5,
    bodyGain: 0.65,
    bodyMax: 9,
    rollIntervalMax: 115,
    rollIntervalMin: 50,
    rollPulse: 4.5,
    nudge: 6.5,
    themeSwitch: [8, 16, 8],
    recoilGain: 1.15,
  },
  paper: {
    heavyThreshold: 8.5,
    wallHeavy: [3, 10, 2],
    wallLightBase: 2,
    wallLightGain: 0.8,
    bodyBase: 2,
    bodyGain: 0.25,
    bodyMax: 4,
    rollIntervalMax: 170,
    rollIntervalMin: 100,
    rollPulse: 2,
    rollDisabled: true,
    nudge: 3,
    themeSwitch: [4, 10, 3],
    recoilGain: 0.3,
  },
  wood: {
    heavyThreshold: 5.8,
    wallHeavy: [8, 16, 5],
    wallLightBase: 4,
    wallLightGain: 1.8,
    bodyBase: 3,
    bodyGain: 0.55,
    bodyMax: 7,
    rollIntervalMax: 130,
    rollIntervalMin: 64,
    rollPulse: 3.5,
    nudge: 5.5,
    themeSwitch: [7, 16, 6],
    recoilGain: 0.92,
  },
  stone: {
    heavyThreshold: 4.9,
    wallHeavy: [18, 22, 11],
    wallLightBase: 7,
    wallLightGain: 2.7,
    bodyBase: 4.5,
    bodyGain: 0.85,
    bodyMax: 11,
    rollIntervalMax: 145,
    rollIntervalMin: 72,
    rollPulse: 5.5,
    nudge: 8.5,
    themeSwitch: [15, 22, 10],
    recoilGain: 1.4,
  },
  trio: {
    heavyThreshold: 5.6,
    wallHeavy: [11, 18, 7],
    wallLightBase: 4.5,
    wallLightGain: 1.9,
    bodyBase: 3.2,
    bodyGain: 0.6,
    bodyMax: 9,
    rollIntervalMax: 132,
    rollIntervalMin: 64,
    rollPulse: 4,
    nudge: 6,
    themeSwitch: [9, 18, 7],
    recoilGain: 1.05,
  },
};

export class HapticsEngine {
  private enabled = true;
  private readonly hasVibrate: boolean;
  private iosSwitchLabel: HTMLLabelElement | null = null;
  private iosSwitchInput: HTMLInputElement | null = null;

  private lastWallMs = 0;
  private lastBodyMs = 0;
  private lastRollMs = 0;
  private lastNudgeMs = 0;
  private lastShatterMs = 0;
  private lastTapticMs = 0;

  private recoil = { x: 0, y: 0, z: 0 };
  private stats = {
    collisions: 0,
    rollingTicks: 0,
    nudges: 0,
    shakes: 0,
    shatters: 0,
    uiTaps: 0,
  };

  constructor() {
    this.hasVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    this.initIosTapticSwitch();
  }

  private initIosTapticSwitch(): void {
    if (typeof document === 'undefined') return;
    const isAppleTouch =
      /iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isAppleTouch) return;

    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.appendChild(input);
    document.body.appendChild(label);
    this.iosSwitchLabel = label;
    this.iosSwitchInput = input;
  }

  private triggerIosTaptic(): void {
    if (!this.iosSwitchLabel || !this.iosSwitchInput) return;
    const now = performance.now();
    if (now - this.lastTapticMs < 55) return;
    this.lastTapticMs = now;
    try {
      this.iosSwitchLabel.click();
    } catch {
      // Ignore unsupported environments
    }
  }

  private vibrate(pattern: number | number[], allowIosTaptic = false): void {
    if (!this.enabled) return;
    if (this.hasVibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore blocked or unsupported calls
      }
    } else if (allowIosTaptic) {
      this.triggerIosTaptic();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(next: boolean): void {
    this.enabled = next;
    if (!next && this.hasVibrate) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    }
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled);
    if (this.enabled) {
      this.playUiTap();
    }
    return this.enabled;
  }

  playCollision(evt: CollisionHapticEvent, theme: ThemeId): void {
    const now = performance.now();
    const { speed, kind, mass, materialTag } = evt;
    const prof = HAPTIC_PROFILES[materialTag ?? theme];

    if (kind === 'wall') {
      if (speed < 1.35 || now - this.lastWallMs < 62) return;
      this.lastWallMs = now;
      this.stats.collisions += 1;

      const recoilAmt = Math.min(0.026, speed * 0.0022 * prof.recoilGain);
      this.recoil.z = Math.min(0.03, this.recoil.z + recoilAmt);
      this.recoil.x += (Math.random() - 0.5) * recoilAmt * 0.7;
      this.recoil.y += (Math.random() - 0.5) * recoilAmt * 0.7;

      if (!this.enabled) return;
      if (speed > prof.heavyThreshold) {
        this.vibrate(prof.wallHeavy);
      } else {
        const massBoost = Math.min(1.45, 0.8 + mass * 0.14);
        const dur = Math.max(3, Math.min(24, Math.round((prof.wallLightBase + speed * prof.wallLightGain) * massBoost)));
        this.vibrate(dur);
      }
      return;
    }

    // Body-to-body granular micro-collisions
    if (speed < 1.25 || now - this.lastBodyMs < 36 || now - this.lastWallMs < 75) return;
    this.lastBodyMs = now;
    this.stats.collisions += 1;

    if (!this.enabled) return;
    const dur = Math.max(2, Math.min(prof.bodyMax, Math.round(prof.bodyBase + speed * prof.bodyGain)));
    this.vibrate(dur);
  }

  updateRolling(metrics: MotionMetrics, theme: ThemeId, nowMs: number): void {
    if (!this.enabled) return;
    const prof = HAPTIC_PROFILES[theme];
    if (prof.rollDisabled) return;
    if (metrics.avgSpeed < 0.85 || metrics.movingCount === 0) return;
    if (nowMs - this.lastWallMs < 60 || nowMs - this.lastBodyMs < 48) return;

    const speedFactor = Math.max(0, Math.min(1, (metrics.avgSpeed - 0.85) / 7.5));
    const interval = prof.rollIntervalMax - speedFactor * (prof.rollIntervalMax - prof.rollIntervalMin);
    if (nowMs - this.lastRollMs < interval) return;

    this.lastRollMs = nowMs;
    this.stats.rollingTicks += 1;
    this.vibrate(Math.max(2, Math.round(prof.rollPulse + speedFactor * 2)));
  }

  playCrack(theme: ThemeId): void {
    this.stats.shatters += 1;
    this.recoil.z = Math.min(0.025, this.recoil.z + 0.008);
    if (!this.enabled) return;
    const pattern = theme === 'marbles' ? [5, 10, 4] : [6, 12, 5];
    this.vibrate(pattern);
  }

  playShatter(kind: ShardKind): void {
    const now = performance.now();
    if (now - this.lastShatterMs < 65) return;
    this.lastShatterMs = now;
    this.stats.shatters += 1;

    const popRecoil = kind === 'confetti' ? 0.012 : 0.022;
    this.recoil.z = Math.min(0.032, this.recoil.z + popRecoil);
    this.recoil.x += (Math.random() - 0.5) * popRecoil;
    this.recoil.y += (Math.random() - 0.5) * popRecoil;

    if (!this.enabled) return;
    if (kind === 'confetti') {
      this.vibrate([16, 14, 5], true);
    } else if (kind === 'ice') {
      this.vibrate([10, 14, 14, 6]);
    } else if (kind === 'ceramic') {
      this.vibrate([14, 12, 16, 10, 5]);
    } else {
      this.vibrate([12, 16, 20, 14, 7]);
    }
  }

  playTouchNudge(theme: ThemeId, fromGesture = true): void {
    const now = performance.now();
    if (now - this.lastNudgeMs < 65) return;
    this.lastNudgeMs = now;
    this.stats.nudges += 1;

    const prof = HAPTIC_PROFILES[theme];
    this.recoil.z = Math.min(0.016, this.recoil.z + 0.005 * prof.recoilGain);
    this.vibrate(prof.nudge, fromGesture);
  }

  playShake(strength = 1.0, fromGesture = true): void {
    this.stats.shakes += 1;
    const mag = Math.min(0.025, 0.012 * strength);
    this.recoil.z = Math.min(0.028, this.recoil.z + mag);
    this.recoil.x += (Math.random() - 0.5) * mag;
    this.recoil.y += (Math.random() - 0.5) * mag;

    this.vibrate([14, 24, 18, 28, 10], fromGesture);
  }

  playThemeSwitch(theme: ThemeId): void {
    this.stats.uiTaps += 1;
    this.vibrate(HAPTIC_PROFILES[theme].themeSwitch, true);
  }

  playUiTap(): void {
    this.stats.uiTaps += 1;
    this.vibrate(6, true);
  }

  getRecoilOffset(dt: number): { x: number; y: number; z: number } {
    const decay = Math.exp(-16 * dt);
    this.recoil.x *= decay;
    this.recoil.y *= decay;
    this.recoil.z *= decay;
    return { ...this.recoil };
  }

  getStats(): HapticStats {
    return {
      enabled: this.enabled,
      hasVibrate: this.hasVibrate,
      ...this.stats,
    };
  }

  dispose(): void {
    if (this.iosSwitchLabel) {
      this.iosSwitchLabel.remove();
      this.iosSwitchLabel = null;
      this.iosSwitchInput = null;
    }
  }
}
