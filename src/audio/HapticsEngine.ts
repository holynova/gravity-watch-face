import { ThemeId } from '../themes/types';

export interface CollisionHapticEvent {
  speed: number;
  kind: 'wall' | 'body';
  mass: number;
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
  uiTaps: number;
}

export class HapticsEngine {
  private enabled = true;
  private readonly hasVibrate: boolean;
  private iosSwitchLabel: HTMLLabelElement | null = null;
  private iosSwitchInput: HTMLInputElement | null = null;

  private lastWallMs = 0;
  private lastBodyMs = 0;
  private lastRollMs = 0;
  private lastNudgeMs = 0;
  private lastTapticMs = 0;

  private recoil = { x: 0, y: 0, z: 0 };
  private stats = {
    collisions: 0,
    rollingTicks: 0,
    nudges: 0,
    shakes: 0,
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
    const { speed, kind, mass } = evt;

    if (kind === 'wall') {
      if (speed < 1.35 || now - this.lastWallMs < 62) return;
      this.lastWallMs = now;
      this.stats.collisions += 1;

      const recoilAmt = Math.min(0.022, speed * 0.0022);
      this.recoil.z = Math.min(0.026, this.recoil.z + recoilAmt);
      this.recoil.x += (Math.random() - 0.5) * recoilAmt * 0.7;
      this.recoil.y += (Math.random() - 0.5) * recoilAmt * 0.7;

      if (!this.enabled) return;
      if (speed > 6.2) {
        if (theme === 'gold') this.vibrate([14, 18, 9]);
        else if (theme === 'basketball') this.vibrate([11, 24, 6]);
        else if (theme === 'diamonds') this.vibrate([4, 12, 4]);
        else if (theme === 'tennis') this.vibrate([8, 18, 5]);
        else this.vibrate([10, 20, 6]);
      } else {
        const massBoost = Math.min(1.4, 0.8 + mass * 0.14);
        const dur = Math.max(6, Math.min(22, Math.round((4 + speed * 2.2) * massBoost)));
        this.vibrate(dur);
      }
      return;
    }

    // Body-to-body granular micro-collisions
    if (speed < 1.25 || now - this.lastBodyMs < 36 || now - this.lastWallMs < 75) return;
    this.lastBodyMs = now;
    this.stats.collisions += 1;

    if (!this.enabled) return;
    const dur =
      theme === 'diamonds'
        ? Math.max(3, Math.min(6, Math.round(2.5 + speed * 0.45)))
        : theme === 'gold'
          ? Math.max(4, Math.min(8, Math.round(3 + speed * 0.65)))
          : Math.max(3, Math.min(7, Math.round(2.5 + speed * 0.55)));
    this.vibrate(dur);
  }

  updateRolling(metrics: MotionMetrics, theme: ThemeId, nowMs: number): void {
    if (!this.enabled) return;
    if (metrics.avgSpeed < 0.75 || metrics.movingCount === 0) return;
    if (nowMs - this.lastWallMs < 60 || nowMs - this.lastBodyMs < 48) return;

    // Speed-modulated cadence (faster roll -> tighter micro-tick interval)
    const speedFactor = Math.max(0, Math.min(1, (metrics.avgSpeed - 0.75) / 6.5));
    const interval = 135 - speedFactor * 70; // 135ms down to 65ms
    if (nowMs - this.lastRollMs < interval) return;

    this.lastRollMs = nowMs;
    this.stats.rollingTicks += 1;

    const pulse =
      theme === 'diamonds'
        ? 3
        : theme === 'gold'
          ? Math.round(4 + speedFactor * 2)
          : Math.round(3 + speedFactor * 2.5);
    this.vibrate(pulse);
  }

  playTouchNudge(theme: ThemeId, fromGesture = true): void {
    const now = performance.now();
    if (now - this.lastNudgeMs < 65) return;
    this.lastNudgeMs = now;
    this.stats.nudges += 1;
    this.recoil.z = Math.min(0.014, this.recoil.z + 0.005);

    const pulse = theme === 'gold' ? 7 : theme === 'diamonds' ? 4 : 5;
    this.vibrate(pulse, fromGesture);
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
    if (theme === 'diamonds') this.vibrate([5, 16, 4], true);
    else if (theme === 'gold') this.vibrate([14, 22, 10], true);
    else if (theme === 'basketball') this.vibrate([11, 24, 7], true);
    else if (theme === 'tennis') this.vibrate([7, 18, 5], true);
    else this.vibrate([9, 20, 6], true);
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
