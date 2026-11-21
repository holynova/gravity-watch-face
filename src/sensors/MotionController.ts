export type ControlMode = 'sensor' | 'simulated' | 'demo';

export interface MotionSnapshot {
  mode: ControlMode;
  needsPermission: boolean;
  permissionDenied: boolean;
  sensorActive: boolean;
  gravity: { x: number; y: number; z: number };
  tilt: { x: number; y: number };
  kineticLevel: number;
}

export interface MotionCallbacks {
  onShake?: (strength: number) => void;
  onUpdate?: (snapshot: MotionSnapshot) => void;
}

const GRAVITY_SCALE = 26.5;

export class MotionController {
  private mode: ControlMode = 'simulated';
  private needsPermission = false;
  private permissionDenied = false;
  private sensorActive = false;
  private listenersBound = false;

  // Sign auto-calibration against DeviceOrientation gravity projection
  private accelSign: 1 | -1;
  private signCalibrated = false;
  private lastOriVector: { x: number; y: number } | null = null;

  private rawTilt = { x: 0, y: -0.92 };
  private simTilt = { x: 0, y: -0.92 };
  private smoothG = { x: 0, y: -24.0, z: -7.5 };
  private kineticLevel = 0;

  private lastShakeMs = 0;
  private prevAccel = { x: 0, y: 0, z: 0, ready: false };
  private demoPhase = 0;
  private callbacks: MotionCallbacks;

  private readonly keysDown = new Set<string>();

  constructor(callbacks: MotionCallbacks = {}) {
    this.callbacks = callbacks;

    const dm = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    const isTouchCapable =
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
    this.needsPermission = isTouchCapable && typeof dm?.requestPermission === 'function';

    const ua = navigator.userAgent || '';
    const isAppleMobile = /iPhone|iPad|iPod/i.test(ua);
    this.accelSign = isAppleMobile ? 1 : -1;

    if (!this.needsPermission && 'DeviceMotionEvent' in window) {
      this.bindSensorListeners();
    }

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      this.callbacks.onShake?.(1.1);
      return;
    }
    this.keysDown.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysDown.delete(e.code);
  };

  async requestPermission(): Promise<boolean> {
    if (!this.needsPermission) {
      this.bindSensorListeners();
      return true;
    }

    try {
      const dm = window.DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      const doEvt = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };

      const dmState = dm.requestPermission ? await dm.requestPermission() : 'granted';
      if (doEvt?.requestPermission) {
        try {
          await doEvt.requestPermission();
        } catch {
          // Optional orientation stream; DeviceMotion alone suffices
        }
      }

      if (dmState === 'granted') {
        this.needsPermission = false;
        this.permissionDenied = false;
        this.bindSensorListeners();
        this.emitUpdate();
        return true;
      }

      this.permissionDenied = true;
      this.emitUpdate();
      return false;
    } catch {
      this.permissionDenied = true;
      this.emitUpdate();
      return false;
    }
  }

  private bindSensorListeners(): void {
    if (this.listenersBound) return;
    this.listenersBound = true;
    window.addEventListener('devicemotion', this.onDeviceMotion, { passive: true });
    window.addEventListener('deviceorientation', this.onDeviceOrientation, { passive: true });
  }

  private getScreenAngle(): number {
    const angle = window.screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0;
    return ((angle % 360) + 360) % 360;
  }

  private rotateByScreen(x: number, y: number): [number, number] {
    const angle = this.getScreenAngle();
    if (angle === 90) return [-y, x];
    if (angle === 180) return [-x, -y];
    if (angle === 270) return [y, -x];
    return [x, y];
  }

  private onDeviceOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;
    const rad = Math.PI / 180;
    const beta = e.beta * rad;
    const gamma = e.gamma * rad;

    // Approximate downward gravity projection on screen XY plane
    const gx = Math.sin(gamma);
    const gy = -Math.sin(beta) * Math.cos(gamma);
    const [rx, ry] = this.rotateByScreen(gx, gy);
    this.lastOriVector = { x: rx, y: ry };
  };

  private onDeviceMotion = (e: DeviceMotionEvent) => {
    const ag = e.accelerationIncludingGravity;
    if (!ag || (ag.x === null && ag.y === null && ag.z === null)) return;

    const rawX = ag.x ?? 0;
    const rawY = ag.y ?? 0;
    const rawZ = ag.z ?? 0;

    // Ignore dummy all-zero events sent by desktop Chrome
    if (Math.abs(rawX) < 0.001 && Math.abs(rawY) < 0.001 && Math.abs(rawZ) < 0.001) return;

    if (!this.sensorActive) {
      this.sensorActive = true;
      if (this.mode !== 'demo') {
        this.mode = 'sensor';
      }
    }

    const [sx, sy] = this.rotateByScreen(rawX, rawY);

    // Auto-calibrate iOS vs Android W3C gravity sign once orientation sample is present
    if (!this.signCalibrated && this.lastOriVector) {
      const oriMag = Math.hypot(this.lastOriVector.x, this.lastOriVector.y);
      const accMag = Math.hypot(sx, sy);
      if (oriMag > 0.2 && accMag > 1.8) {
        const dot = sx * this.lastOriVector.x + sy * this.lastOriVector.y;
        this.accelSign = dot >= 0 ? 1 : -1;
        this.signCalibrated = true;
      }
    }

    if (this.mode === 'sensor') {
      const mag = Math.max(0.001, Math.hypot(sx, sy, rawZ));
      const nx = (sx * this.accelSign) / mag;
      const ny = (sy * this.accelSign) / mag;
      const nz = (rawZ * this.accelSign) / mag;

      this.rawTilt.x = Math.max(-1, Math.min(1, nx));
      this.rawTilt.y = Math.max(-1, Math.min(1, ny));

      // Keep subtle floor-hug z bias when phone lies flat so objects settle on court
      const targetZ = Math.min(-4.2, nz * GRAVITY_SCALE * 0.45 - 4.0);
      const alpha = 0.24;
      this.smoothG.x += (nx * GRAVITY_SCALE - this.smoothG.x) * alpha;
      this.smoothG.y += (ny * GRAVITY_SCALE - this.smoothG.y) * alpha;
      this.smoothG.z += (targetZ - this.smoothG.z) * alpha;
    }

    // High-pass shake / wrist-flick detector
    const lin = e.acceleration;
    let jerk = 0;
    if (lin && lin.x !== null && lin.y !== null && lin.z !== null) {
      jerk = Math.hypot(lin.x, lin.y, lin.z);
    } else if (this.prevAccel.ready) {
      jerk = Math.hypot(rawX - this.prevAccel.x, rawY - this.prevAccel.y, rawZ - this.prevAccel.z);
    }
    this.prevAccel = { x: rawX, y: rawY, z: rawZ, ready: true };
    this.kineticLevel = Math.min(1, this.kineticLevel * 0.92 + jerk * 0.025);

    const now = performance.now();
    if (jerk > 13.5 && now - this.lastShakeMs > 460) {
      this.lastShakeMs = now;
      this.callbacks.onShake?.(Math.min(1.6, jerk / 14));
    }
  };

  setSimulatedTilt(tx: number, ty: number): void {
    const len = Math.hypot(tx, ty);
    const clampedX = len > 1 ? tx / len : tx;
    const clampedY = len > 1 ? ty / len : ty;
    this.simTilt.x = clampedX;
    this.simTilt.y = clampedY;
    if (this.mode === 'demo') {
      this.mode = 'simulated';
    }
    this.emitUpdate();
  }

  setMode(next: ControlMode): void {
    if (next === 'sensor' && !this.sensorActive) {
      this.mode = 'simulated';
    } else {
      this.mode = next;
    }
    this.emitUpdate();
  }

  toggleDemo(): boolean {
    if (this.mode === 'demo') {
      this.mode = this.sensorActive ? 'sensor' : 'simulated';
    } else {
      this.mode = 'demo';
    }
    this.emitUpdate();
    return this.mode === 'demo';
  }

  step(dt: number): MotionSnapshot {
    // Keyboard directional tilt overrides simulated pad gently
    let kx = 0;
    let ky = 0;
    if (this.keysDown.has('ArrowLeft') || this.keysDown.has('KeyA')) kx -= 1;
    if (this.keysDown.has('ArrowRight') || this.keysDown.has('KeyD')) kx += 1;
    if (this.keysDown.has('ArrowUp') || this.keysDown.has('KeyW')) ky += 1;
    if (this.keysDown.has('ArrowDown') || this.keysDown.has('KeyS')) ky -= 1;

    if (kx !== 0 || ky !== 0) {
      const kLen = Math.hypot(kx, ky);
      this.simTilt.x = kx / kLen;
      this.simTilt.y = ky / kLen;
      if (this.mode === 'demo') this.mode = 'simulated';
    }

    if (this.mode === 'demo') {
      this.demoPhase += dt * 0.92;
      const tx = Math.sin(this.demoPhase) * 0.88;
      const ty = Math.cos(this.demoPhase * 0.71) * 0.88;
      this.rawTilt.x = tx;
      this.rawTilt.y = ty;

      const tz = -Math.sqrt(Math.max(0.08, 1 - tx * tx * 0.85 - ty * ty * 0.85));
      const alpha = 0.16;
      this.smoothG.x += (tx * GRAVITY_SCALE - this.smoothG.x) * alpha;
      this.smoothG.y += (ty * GRAVITY_SCALE - this.smoothG.y) * alpha;
      this.smoothG.z += ((tz * 10 - 3) - this.smoothG.z) * alpha;
      this.kineticLevel = Math.min(1, this.kineticLevel * 0.95 + Math.hypot(tx, ty) * 0.02);
    } else if (this.mode === 'simulated') {
      const tx = this.simTilt.x;
      const ty = this.simTilt.y;
      this.rawTilt.x = tx;
      this.rawTilt.y = ty;

      const tz = -Math.sqrt(Math.max(0.1, 1 - Math.min(0.95, tx * tx + ty * ty)));
      const alpha = 0.22;
      this.smoothG.x += (tx * GRAVITY_SCALE - this.smoothG.x) * alpha;
      this.smoothG.y += (ty * GRAVITY_SCALE - this.smoothG.y) * alpha;
      this.smoothG.z += ((tz * 11 - 3.5) - this.smoothG.z) * alpha;
      this.kineticLevel *= 0.96;
    }

    const snap = this.getSnapshot();
    this.callbacks.onUpdate?.(snap);
    return snap;
  }

  getSnapshot(): MotionSnapshot {
    return {
      mode: this.mode,
      needsPermission: this.needsPermission,
      permissionDenied: this.permissionDenied,
      sensorActive: this.sensorActive,
      gravity: { ...this.smoothG },
      tilt: { ...this.rawTilt },
      kineticLevel: this.kineticLevel,
    };
  }

  private emitUpdate(): void {
    this.callbacks.onUpdate?.(this.getSnapshot());
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.listenersBound) {
      window.removeEventListener('devicemotion', this.onDeviceMotion);
      window.removeEventListener('deviceorientation', this.onDeviceOrientation);
    }
  }
}
