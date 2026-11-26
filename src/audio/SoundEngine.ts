import { MaterialTag, ShardKind, ThemeId } from '../themes/types';

interface SamplePool {
  files: string[];
  rateBase: number;
  rateSpan: number;
  lowpass: number;
  gainScale: number;
}

export interface SoundStats {
  enabled: boolean;
  loadedBuffers: number;
  totalRequested: number;
  playedCount: number;
}

const MATERIAL_POOLS: Record<MaterialTag, SamplePool> = {
  paper: {
    files: ['paper-0.mp3', 'paper-1.mp3'],
    rateBase: 1.0,
    rateSpan: 0.16,
    lowpass: 4800,
    gainScale: 0.95,
  },
  wood: {
    files: ['wood-0.mp3', 'wood-1.mp3', 'wood-2.mp3'],
    rateBase: 1.02,
    rateSpan: 0.14,
    lowpass: 3800,
    gainScale: 1.02,
  },
  stone: {
    files: ['stone-0.mp3', 'stone-1.mp3', 'stone-2.mp3'],
    rateBase: 0.96,
    rateSpan: 0.14,
    lowpass: 3200,
    gainScale: 1.08,
  },
};

const THEME_POOLS: Record<ThemeId, SamplePool> = {
  tennis: {
    files: ['soft-0.mp3', 'soft-1.mp3', 'ball-0.mp3'],
    rateBase: 1.15,
    rateSpan: 0.14,
    lowpass: 2400,
    gainScale: 0.88,
  },
  diamonds: {
    files: ['glass-0.mp3', 'glass-1.mp3', 'ceramic-1.mp3'],
    rateBase: 1.38,
    rateSpan: 0.18,
    lowpass: 7400,
    gainScale: 0.72,
  },
  basketball: {
    files: ['ball-0.mp3', 'ball-1.mp3', 'ball-2.mp3'],
    rateBase: 0.88,
    rateSpan: 0.12,
    lowpass: 1850,
    gainScale: 1.1,
  },
  gold: {
    files: ['gold-0.mp3', 'gold-1.mp3', 'metal-1.mp3'],
    rateBase: 0.92,
    rateSpan: 0.12,
    lowpass: 4400,
    gainScale: 0.92,
  },
  soccer: {
    files: ['ball-1.mp3', 'ball-2.mp3', 'soft-1.mp3'],
    rateBase: 1.0,
    rateSpan: 0.14,
    lowpass: 2150,
    gainScale: 1.0,
  },
  bulbs: {
    files: ['glass-0.mp3', 'glass-1.mp3', 'glass-2.mp3'],
    rateBase: 1.08,
    rateSpan: 0.14,
    lowpass: 6200,
    gainScale: 0.8,
  },
  balloons: {
    files: ['soft-0.mp3', 'soft-1.mp3', 'jelly-0.mp3'],
    rateBase: 1.24,
    rateSpan: 0.16,
    lowpass: 1750,
    gainScale: 0.65,
  },
  dice: {
    files: ['dice-0.mp3', 'dice-1.mp3', 'dice-2.mp3'],
    rateBase: 1.06,
    rateSpan: 0.16,
    lowpass: 5400,
    gainScale: 0.94,
  },
  marbles: {
    files: ['glass-0.mp3', 'glass-1.mp3', 'glass-2.mp3'],
    rateBase: 1.32,
    rateSpan: 0.18,
    lowpass: 7800,
    gainScale: 0.86,
  },
  ice: {
    files: ['glass-2.mp3', 'ceramic-1.mp3', 'stone-2.mp3'],
    rateBase: 1.18,
    rateSpan: 0.16,
    lowpass: 5200,
    gainScale: 0.84,
  },
  jelly: {
    files: ['jelly-0.mp3', 'jelly-1.mp3', 'jelly-2.mp3'],
    rateBase: 1.02,
    rateSpan: 0.16,
    lowpass: 3400,
    gainScale: 0.9,
  },
  bearings: {
    files: ['metal-0.mp3', 'metal-1.mp3', 'metal-2.mp3'],
    rateBase: 1.08,
    rateSpan: 0.14,
    lowpass: 5800,
    gainScale: 1.02,
  },
  porcelain: {
    files: ['ceramic-0.mp3', 'ceramic-1.mp3', 'ceramic-2.mp3'],
    rateBase: 1.12,
    rateSpan: 0.14,
    lowpass: 6400,
    gainScale: 0.9,
  },
  bouncy: {
    files: ['bouncy-0.mp3', 'bouncy-1.mp3', 'bouncy-2.mp3'],
    rateBase: 1.04,
    rateSpan: 0.16,
    lowpass: 4800,
    gainScale: 0.92,
  },
  paper: MATERIAL_POOLS.paper,
  wood: MATERIAL_POOLS.wood,
  stone: MATERIAL_POOLS.stone,
  trio: {
    files: [
      'paper-0.mp3',
      'paper-1.mp3',
      'wood-0.mp3',
      'wood-1.mp3',
      'wood-2.mp3',
      'stone-0.mp3',
      'stone-1.mp3',
      'stone-2.mp3',
    ],
    rateBase: 1.0,
    rateSpan: 0.14,
    lowpass: 4200,
    gainScale: 1.0,
  },
};

const BREAK_FILES: Record<ShardKind, string> = {
  glass: 'break-glass.mp3',
  ice: 'break-ice.mp3',
  ceramic: 'break-ceramic.mp3',
  confetti: 'pop-0.mp3',
};

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private lastPlayMs = 0;
  private lastBreakMs = 0;
  private activeVoices = 0;
  private poolCursor = 0;
  private playedCount = 0;
  private theme: ThemeId = 'diamonds';

  private readonly pendingLoads = new Map<string, Promise<AudioBuffer | null>>();
  private readonly buffers = new Map<string, AudioBuffer>();

  isEnabled(): boolean {
    return this.enabled;
  }

  setTheme(id: ThemeId): void {
    this.theme = id;
    if (this.enabled) {
      void this.preloadTheme(id);
    }
  }

  async toggle(): Promise<boolean> {
    this.enabled = !this.enabled;
    if (this.enabled) {
      await this.ensureContext();
      await this.preloadTheme(this.theme);
    }
    return this.enabled;
  }

  setEnabled(next: boolean): void {
    this.enabled = next;
    if (next) {
      void this.ensureContext().then(() => this.preloadTheme(this.theme));
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

  private loadFile(name: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(name);
    if (cached) return Promise.resolve(cached);

    const inflight = this.pendingLoads.get(name);
    if (inflight) return inflight;

    const p = (async () => {
      await this.ensureContext();
      if (!this.ctx) return null;
      try {
        const res = await fetch(`/audio/${name}`);
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        const decoded = await this.ctx.decodeAudioData(arr);
        this.buffers.set(name, decoded);
        return decoded;
      } catch {
        return null;
      }
    })();

    this.pendingLoads.set(name, p);
    return p;
  }

  async preloadTheme(id: ThemeId): Promise<void> {
    const files = new Set<string>(THEME_POOLS[id].files);
    if (id === 'bulbs' || id === 'marbles' || id === 'ice' || id === 'porcelain' || id === 'balloons') {
      files.add('crack.mp3');
      files.add('break-glass.mp3');
      files.add('break-ice.mp3');
      files.add('break-ceramic.mp3');
      files.add('pop-0.mp3');
    }
    await Promise.all([...files].map((f) => this.loadFile(f)));
  }

  private playBuffer(
    name: string,
    gainVal: number,
    playbackRate: number,
    lowpassHz: number,
  ): boolean {
    if (!this.ctx || this.ctx.state !== 'running') return false;
    const buf = this.buffers.get(name);
    if (!buf) {
      void this.loadFile(name);
      return false;
    }
    if (this.activeVoices >= 10) return false;

    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.max(0.55, Math.min(1.85, playbackRate));

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.max(400, Math.min(16000, lowpassHz));

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.01, Math.min(0.85, gainVal)), t);

    src.connect(filter).connect(gain).connect(this.ctx.destination);
    this.activeVoices += 1;
    this.playedCount += 1;
    src.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    };
    src.start(t);
    return true;
  }

  private playSubtleThudFallback(gainVal: number, lowpassHz: number): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const dur = 0.045;
    const bufLen = Math.round(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp((-i / bufLen) * 6.5);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpassHz;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.min(0.18, gainVal * 0.4), t);
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    this.playedCount += 1;
    src.start(t);
  }

  playImpact(speed: number, materialTag?: MaterialTag): void {
    const now = performance.now();
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    if (now - this.lastPlayMs < 48) return;
    this.lastPlayMs = now;

    const pool =
      this.theme === 'trio' && materialTag
        ? MATERIAL_POOLS[materialTag]
        : THEME_POOLS[this.theme];

    const idx = this.poolCursor++ % pool.files.length;
    const sample = pool.files[idx];
    const norm = Math.max(0, Math.min(1, (speed - 1.2) / 16));
    const gain = (0.08 + norm * 0.46) * pool.gainScale;
    const rate = pool.rateBase + (Math.random() - 0.5) * pool.rateSpan + norm * 0.08;
    const lp = pool.lowpass * (0.65 + norm * 0.75);

    if (!this.playBuffer(sample, gain, rate, lp)) {
      this.playSubtleThudFallback(gain, lp);
    }
  }

  playCrack(): void {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const rate = 0.96 + Math.random() * 0.14;
    if (!this.playBuffer('crack.mp3', 0.42, rate, 9500)) {
      this.playSubtleThudFallback(0.28, 3600);
    }
  }

  playBreak(kind: ShardKind): void {
    const now = performance.now();
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    if (now - this.lastBreakMs < 60) return;
    this.lastBreakMs = now;

    const file = BREAK_FILES[kind];
    const rate = 0.95 + Math.random() * 0.12;
    const gain = kind === 'confetti' ? 0.48 : 0.52;
    if (!this.playBuffer(file, gain, rate, 12000)) {
      this.playSubtleThudFallback(0.35, 3200);
    }
  }

  getStats(): SoundStats {
    return {
      enabled: this.enabled,
      loadedBuffers: this.buffers.size,
      totalRequested: this.pendingLoads.size,
      playedCount: this.playedCount,
    };
  }

  dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
