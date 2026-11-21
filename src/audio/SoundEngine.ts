import { ThemeId } from '../themes/types';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private lastPlayMs = 0;
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
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

  playImpact(speed: number): void {
    const now = performance.now();

    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    if (now - this.lastPlayMs < 72) return;
    this.lastPlayMs = now;

    const vol = Math.min(0.18, Math.max(0.015, (speed - 1.8) * 0.014));
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (this.theme === 'diamonds') {
      osc.type = 'triangle';
      const base = 2400 + Math.random() * 1400;
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 0.72, t + 0.055);
      gain.gain.setValueAtTime(vol * 0.65, t);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.06);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.065);
    } else if (this.theme === 'gold') {
      osc.type = 'sine';
      const base = 1120 + Math.random() * 340;
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 0.94, t + 0.14);
      gain.gain.setValueAtTime(vol * 0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.15);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    } else if (this.theme === 'basketball') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(165 + Math.random() * 45, t);
      osc.frequency.exponentialRampToValueAtTime(68, t + 0.09);
      gain.gain.setValueAtTime(vol * 1.1, t);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.095);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } else if (this.theme === 'soccer') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140 + Math.random() * 40, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.08);
      gain.gain.setValueAtTime(vol * 0.95, t);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.085);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } else {
      // Tennis felt thump
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220 + Math.random() * 60, t);
      osc.frequency.exponentialRampToValueAtTime(95, t + 0.06);
      gain.gain.setValueAtTime(vol * 0.75, t);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.065);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    }
  }

  dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
