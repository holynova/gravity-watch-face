import { ShardKind, ThemeId } from '../themes/types';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private lastPlayMs = 0;
  private lastBreakMs = 0;
  private theme: ThemeId = 'diamonds';

  isEnabled(): boolean {
    return this.enabled;
  }

  setTheme(id: ThemeId): void {
    this.theme = id;
  }

  async toggle(): Promise<boolean> {
    this.enabled = !this.enabled;
    if (this.enabled) {
      await this.ensureContext();
    }
    return this.enabled;
  }

  setEnabled(next: boolean): void {
    this.enabled = next;
    if (next) {
      void this.ensureContext();
    }
  }

  private async ensureContext(): Promise<void> {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        this.ctx = new Ctor();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // Autoplay restriction until user gesture
      }
    }
  }

  private emitTone(
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    dur: number,
    vol: number,
  ): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  playImpact(speed: number): void {
    const now = performance.now();
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    if (now - this.lastPlayMs < 70) return;
    this.lastPlayMs = now;

    const vol = Math.min(0.18, Math.max(0.015, (speed - 1.6) * 0.014));

    switch (this.theme) {
      case 'diamonds': {
        const f = 2400 + Math.random() * 1400;
        this.emitTone('triangle', f, f * 0.72, 0.06, vol * 0.65);
        break;
      }
      case 'gold': {
        const f = 1120 + Math.random() * 340;
        this.emitTone('sine', f, f * 0.94, 0.15, vol * 0.8);
        break;
      }
      case 'basketball':
        this.emitTone('sine', 165 + Math.random() * 45, 68, 0.095, vol * 1.1);
        break;
      case 'soccer':
        this.emitTone('sine', 140 + Math.random() * 40, 55, 0.085, vol * 0.95);
        break;
      case 'bulbs': {
        const f = 1850 + Math.random() * 520;
        this.emitTone('sine', f, f * 0.88, 0.075, vol * 0.65);
        break;
      }
      case 'balloons': {
        const f = 240 + Math.random() * 90;
        this.emitTone('sine', f, f * 0.55, 0.065, vol * 0.55);
        break;
      }
      case 'dice': {
        const f = 820 + Math.random() * 280;
        this.emitTone('triangle', f, f * 0.42, 0.036, vol * 0.85);
        break;
      }
      case 'marbles': {
        const f = 3100 + Math.random() * 950;
        this.emitTone('sine', f, f * 0.86, 0.048, vol * 0.7);
        break;
      }
      case 'ice': {
        const f = 2150 + Math.random() * 750;
        this.emitTone('triangle', f, f * 0.78, 0.075, vol * 0.72);
        break;
      }
      case 'jelly': {
        const f = 260 + Math.random() * 90;
        this.emitTone('sine', f, f * 1.65, 0.085, vol * 0.75);
        break;
      }
      case 'bearings': {
        const f = 540 + Math.random() * 190;
        this.emitTone('triangle', f, f * 0.92, 0.14, vol * 0.9);
        this.emitTone('sine', f * 2.4, f * 2.1, 0.11, vol * 0.38);
        break;
      }
      case 'porcelain': {
        const f = 1980 + Math.random() * 620;
        this.emitTone('sine', f, f * 0.96, 0.12, vol * 0.72);
        break;
      }
      default:
        // Tennis felt thump
        this.emitTone('sine', 220 + Math.random() * 60, 95, 0.065, vol * 0.75);
        break;
    }
  }

  playCrack(): void {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const f = 3400 + Math.random() * 900;
    this.emitTone('triangle', f, 1200, 0.045, 0.09);
  }

  playBreak(kind: ShardKind): void {
    const now = performance.now();
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    if (now - this.lastBreakMs < 60) return;
    this.lastBreakMs = now;

    const t = this.ctx.currentTime;
    const bufLen = Math.round(this.ctx.sampleRate * (kind === 'confetti' ? 0.06 : 0.16));
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp((-i / bufLen) * 5.2);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = kind === 'confetti' ? 'bandpass' : 'highpass';
    filter.frequency.value = kind === 'confetti' ? 680 : kind === 'ice' ? 2200 : 2800;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(kind === 'confetti' ? 0.18 : 0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + (kind === 'confetti' ? 0.065 : 0.16));

    noise.connect(filter).connect(gain).connect(this.ctx.destination);
    noise.start(t);

    if (kind !== 'confetti') {
      const base = kind === 'ice' ? 2400 : kind === 'ceramic' ? 3100 : 3800;
      this.emitTone('triangle', base, base * 0.65, 0.07, 0.08);
      this.emitTone('sine', base * 1.4, base * 0.9, 0.08, 0.06);
    } else {
      this.emitTone('sine', 340, 88, 0.055, 0.14);
    }
  }

  dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
