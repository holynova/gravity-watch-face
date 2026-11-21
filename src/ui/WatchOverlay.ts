import { OverlayLayout } from '../themes/types';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function computeApproxSunset(now: Date): { time: string; period: string } {
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const seasonalMinutes = Math.round(60 * Math.sin(((dayOfYear - 80) / 365) * Math.PI * 2));
  const totalMin = 18 * 60 + 5 + seasonalMinutes;
  const h24 = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const h12 = h24 > 12 ? h24 - 12 : h24;
  return {
    time: `${h12}:${String(m).padStart(2, '0')}`,
    period: h24 >= 12 ? 'PM' : 'AM',
  };
}

export class WatchOverlay {
  private readonly root: HTMLElement;
  private readonly dateEl: HTMLElement;
  private readonly timeEl: HTMLElement;
  private readonly compSunsetTimeEl: HTMLElement;
  private readonly compSunsetPeriodEl: HTMLElement;
  private readonly compGaugeValueEl: HTMLElement;
  private readonly compGaugeArcEl: SVGCircleElement;
  private readonly activityRings: SVGCircleElement[] = [];

  private batteryLevel = 0.86;
  private timerId: number | null = null;
  private activityEnergy = 0.25;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'watch-overlay';
    this.root.innerHTML = `
      <div class="watch-top-row">
        <div class="watch-comp watch-comp--sunset" aria-hidden="true">
          <svg class="sunset-icon" viewBox="0 0 24 24" fill="none">
            <path d="M12 4.5V7M6.3 6.8L8.1 8.6M17.7 6.8L15.9 8.6M4 14.5H20" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/>
            <path d="M7.5 14.5A4.5 4.5 0 0 1 16.5 14.5" fill="currentColor" fill-opacity="0.88"/>
            <path d="M6.5 18H17.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.7"/>
          </svg>
          <span class="comp-sunset-time">6:05</span>
          <span class="comp-sunset-period">PM</span>
        </div>
        <div class="watch-clock-block">
          <div class="watch-date">SAT 21</div>
          <div class="watch-time">9:41</div>
        </div>
      </div>

      <div class="watch-bottom-row" aria-hidden="true">
        <div class="watch-comp watch-comp--gauge">
          <svg class="comp-svg" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" class="ring-track" stroke-width="5.2" fill="none"/>
            <circle cx="32" cy="32" r="26" class="ring-fill gauge-arc" stroke-width="5.2" stroke-linecap="round" fill="none" transform="rotate(-225 32 32)"/>
          </svg>
          <span class="comp-gauge-val">86</span>
        </div>

        <div class="watch-comp watch-comp--rings">
          <svg class="comp-svg" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="25" class="ring-track" stroke-width="4.4" fill="none"/>
            <circle cx="32" cy="32" r="25" class="ring-fill activity-ring" stroke-width="4.4" stroke-linecap="round" fill="none" transform="rotate(-90 32 32)"/>
            <circle cx="32" cy="32" r="18" class="ring-track" stroke-width="4.4" fill="none"/>
            <circle cx="32" cy="32" r="18" class="ring-fill activity-ring" stroke-width="4.4" stroke-linecap="round" fill="none" transform="rotate(-90 32 32)"/>
            <circle cx="32" cy="32" r="11" class="ring-track" stroke-width="4.4" fill="none"/>
            <circle cx="32" cy="32" r="11" class="ring-fill activity-ring" stroke-width="4.4" stroke-linecap="round" fill="none" transform="rotate(-90 32 32)"/>
          </svg>
        </div>
      </div>
    `;

    container.appendChild(this.root);

    this.dateEl = this.root.querySelector('.watch-date') as HTMLElement;
    this.timeEl = this.root.querySelector('.watch-time') as HTMLElement;
    this.compSunsetTimeEl = this.root.querySelector('.comp-sunset-time') as HTMLElement;
    this.compSunsetPeriodEl = this.root.querySelector('.comp-sunset-period') as HTMLElement;
    this.compGaugeValueEl = this.root.querySelector('.comp-gauge-val') as HTMLElement;
    this.compGaugeArcEl = this.root.querySelector('.gauge-arc') as SVGCircleElement;
    this.activityRings = Array.from(this.root.querySelectorAll('.activity-ring')) as SVGCircleElement[];

    this.initBattery();
    this.updateClock();
    this.updateComplications(0);
    this.timerId = window.setInterval(() => this.updateClock(), 1000);
  }

  private initBattery(): void {
    const nav = navigator as unknown as {
      getBattery?: () => Promise<{
        level: number;
        addEventListener: (evt: string, fn: () => void) => void;
      }>;
    };
    if (typeof nav.getBattery !== 'function') return;
    nav
      .getBattery()
      .then((bat) => {
        this.batteryLevel = bat.level;
        this.updateGauge();
        bat.addEventListener('levelchange', () => {
          this.batteryLevel = bat.level;
          this.updateGauge();
        });
      })
      .catch(() => {
        // Fallback silently to default gauge value
      });
  }

  private updateGauge(): void {
    const pct = Math.max(1, Math.min(100, Math.round(this.batteryLevel * 100)));
    this.compGaugeValueEl.textContent = `${pct}`;
    const r = 26;
    const c = 2 * Math.PI * r;
    const arcSpan = c * 0.75;
    this.compGaugeArcEl.style.strokeDasharray = `${arcSpan * (pct / 100)} ${c}`;
  }

  updateComplications(kineticLevel: number): void {
    this.activityEnergy = Math.min(0.95, Math.max(0.28, this.activityEnergy * 0.985 + kineticLevel * 0.018));
    const radii = [25, 18, 11];
    const progress = [
      Math.min(0.92, 0.56 + this.activityEnergy * 0.32),
      Math.min(0.92, 0.42 + this.activityEnergy * 0.4),
      Math.min(0.92, 0.32 + kineticLevel * 0.48),
    ];

    for (let i = 0; i < this.activityRings.length; i++) {
      const c = 2 * Math.PI * radii[i];
      this.activityRings[i].style.strokeDasharray = `${c * progress[i]} ${c}`;
    }
    this.updateGauge();
  }

  setLayout(layout: OverlayLayout): void {
    this.root.dataset.layout = layout;
  }

  private updateClock(): void {
    const now = new Date();
    const day = DAYS[now.getDay()];
    const dateNum = now.getDate();
    this.dateEl.textContent = `${day} ${dateNum}`;

    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    this.timeEl.textContent = `${hh}:${mm}`;

    const sunset = computeApproxSunset(now);
    this.compSunsetTimeEl.textContent = sunset.time;
    this.compSunsetPeriodEl.textContent = sunset.period;
  }

  dispose(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.root.remove();
  }
}
