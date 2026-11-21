import './styles/main.css';
import { SoundEngine } from './audio/SoundEngine';
import { PhysicsWorld } from './engine/PhysicsWorld';
import { SceneRenderer } from './engine/SceneRenderer';
import { MotionController, MotionSnapshot } from './sensors/MotionController';
import { isThemeId, THEME_LIST, THEMES_BY_ID, ThemeId } from './themes/types';
import { WatchOverlay } from './ui/WatchOverlay';

function resolveInitialTheme(): ThemeId {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('theme');
  if (isThemeId(q)) return q;
  return 'diamonds';
}

const appShell = document.getElementById('appShell') as HTMLElement;
const screenStage = document.getElementById('screenStage') as HTMLElement;
const canvas = document.getElementById('physicsCanvas') as HTMLCanvasElement;
const sensorCta = document.getElementById('sensorCta') as HTMLButtonElement;
const mobileDock = document.getElementById('mobileDock') as HTMLElement;
const mobileSwatches = document.getElementById('mobileSwatches') as HTMLElement;
const mobileAudioBtn = document.getElementById('mobileAudioBtn') as HTMLButtonElement;

const desktopThemes = document.getElementById('desktopThemes') as HTMLElement;
const themeSubtitle = document.getElementById('themeSubtitle') as HTMLElement;
const modeBadge = document.getElementById('modeBadge') as HTMLElement;
const gyroPad = document.getElementById('gyroPad') as HTMLElement;
const gyroPuck = document.getElementById('gyroPuck') as HTMLElement;
const resetTiltBtn = document.getElementById('resetTiltBtn') as HTMLButtonElement;
const shakeBtn = document.getElementById('shakeBtn') as HTMLButtonElement;
const demoBtn = document.getElementById('demoBtn') as HTMLButtonElement;
const audioBtn = document.getElementById('audioBtn') as HTMLButtonElement;
const fullBleedBtn = document.getElementById('fullBleedBtn') as HTMLButtonElement;
const exitFullBleedBtn = document.getElementById('exitFullBleedBtn') as HTMLButtonElement;
const telemetryText = document.getElementById('telemetryText') as HTMLElement;

let activeThemeId: ThemeId = resolveInitialTheme();

const sound = new SoundEngine();
const renderer = new SceneRenderer(canvas, THEMES_BY_ID[activeThemeId]);
const physics = new PhysicsWorld(renderer.getBounds(), (speed) => sound.playImpact(speed));
const overlay = new WatchOverlay(screenStage);

let dimTimer: number | null = null;
function wakeMobileDock(): void {
  mobileDock.classList.remove('is-dimmed');
  if (dimTimer !== null) window.clearTimeout(dimTimer);
  dimTimer = window.setTimeout(() => {
    mobileDock.classList.add('is-dimmed');
  }, 3600);
}

const desktopButtons = new Map<ThemeId, HTMLButtonElement>();
const mobileButtons = new Map<ThemeId, HTMLButtonElement>();

for (const spec of THEME_LIST) {
  const dBtn = document.createElement('button');
  dBtn.type = 'button';
  dBtn.className = 'theme-btn';
  dBtn.dataset.theme = spec.id;
  dBtn.setAttribute('role', 'tab');
  dBtn.innerHTML = `<span class="theme-swatch-dot" style="background: linear-gradient(135deg, ${spec.swatchColor}, ${spec.swatchAccent})"></span><span>${spec.labelZh}</span>`;
  dBtn.addEventListener('click', () => selectTheme(spec.id));
  desktopThemes.appendChild(dBtn);
  desktopButtons.set(spec.id, dBtn);

  const mBtn = document.createElement('button');
  mBtn.type = 'button';
  mBtn.className = 'mobile-swatch';
  mBtn.dataset.theme = spec.id;
  mBtn.setAttribute('aria-label', spec.labelZh);
  mBtn.style.background = `linear-gradient(135deg, ${spec.swatchColor}, ${spec.swatchAccent})`;
  mBtn.addEventListener('click', () => {
    wakeMobileDock();
    selectTheme(spec.id);
  });
  mobileSwatches.appendChild(mBtn);
  mobileButtons.set(spec.id, mBtn);
}

function selectTheme(id: ThemeId): void {
  activeThemeId = id;
  const spec = THEMES_BY_ID[id];
  const meta = physics.spawnForTheme(spec);
  renderer.applyTheme(spec, meta);
  overlay.setLayout(spec.overlayLayout);
  sound.setTheme(id);
  themeSubtitle.textContent = spec.labelEn;

  for (const [k, btn] of desktopButtons) {
    const active = k === id;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  }
  for (const [k, btn] of mobileButtons) {
    const active = k === id;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  }
}

function syncAudioUi(): void {
  const on = sound.isEnabled();
  audioBtn.setAttribute('aria-pressed', String(on));
  audioBtn.textContent = on ? '音效已开' : '碰撞音效';
  mobileAudioBtn.dataset.muted = String(!on);
}

function updateUiFromMotion(snap: MotionSnapshot): void {
  const modeLabel =
    snap.mode === 'sensor' ? '传感器实时' : snap.mode === 'demo' ? '自动演示' : '倾角模拟';
  modeBadge.dataset.mode = snap.mode;
  modeBadge.textContent = modeLabel;
  demoBtn.setAttribute('aria-pressed', String(snap.mode === 'demo'));

  // Position 360° gyro puck inside circle (screen +Y is upward, CSS top is downward)
  const padRadius = gyroPad.clientWidth * 0.5 - 16;
  const px = snap.tilt.x * Math.max(20, padRadius);
  const py = -snap.tilt.y * Math.max(20, padRadius);
  gyroPuck.style.transform = `translate(calc(-50% + ${px.toFixed(1)}px), calc(-50% + ${py.toFixed(1)}px))`;

  telemetryText.textContent = `${snap.gravity.x.toFixed(1)}, ${snap.gravity.y.toFixed(1)}, ${snap.gravity.z.toFixed(1)}`;
  sensorCta.hidden = !(snap.needsPermission && !snap.sensorActive);
}

const motion = new MotionController({
  onShake: (strength) => physics.applyShakeImpulse(strength),
  onUpdate: (snap) => updateUiFromMotion(snap),
});

sensorCta.addEventListener('click', async () => {
  const granted = await motion.requestPermission();
  if (granted) {
    sensorCta.hidden = true;
    physics.applyShakeImpulse(0.65);
  }
});

// 360° Gyro Pad drag interaction
let padDragging = false;
function updatePadFromPointer(clientX: number, clientY: number): void {
  const rect = gyroPad.getBoundingClientRect();
  const cx = rect.left + rect.width * 0.5;
  const cy = rect.top + rect.height * 0.5;
  const maxR = Math.max(10, rect.width * 0.5 - 14);
  const tx = (clientX - cx) / maxR;
  const ty = -(clientY - cy) / maxR;
  motion.setSimulatedTilt(tx, ty);
}

gyroPad.addEventListener('pointerdown', (e) => {
  padDragging = true;
  gyroPad.setPointerCapture(e.pointerId);
  updatePadFromPointer(e.clientX, e.clientY);
});

gyroPad.addEventListener('pointermove', (e) => {
  if (!padDragging) return;
  updatePadFromPointer(e.clientX, e.clientY);
});

const stopPadDrag = () => {
  padDragging = false;
};
gyroPad.addEventListener('pointerup', stopPadDrag);
gyroPad.addEventListener('pointercancel', stopPadDrag);

resetTiltBtn.addEventListener('click', () => {
  motion.setSimulatedTilt(0, -0.92);
});

shakeBtn.addEventListener('click', () => {
  physics.applyShakeImpulse(1.15);
});

demoBtn.addEventListener('click', () => {
  motion.toggleDemo();
});

const toggleAudio = async () => {
  await sound.toggle();
  syncAudioUi();
  wakeMobileDock();
};
audioBtn.addEventListener('click', () => void toggleAudio());
mobileAudioBtn.addEventListener('click', () => void toggleAudio());

function setFullBleed(full: boolean): void {
  appShell.classList.toggle('is-fullbleed', full);
  fullBleedBtn.setAttribute('aria-pressed', String(full));
  exitFullBleedBtn.hidden = !full;
  requestAnimationFrame(() => syncResize());
}

fullBleedBtn.addEventListener('click', () => {
  setFullBleed(!appShell.classList.contains('is-fullbleed'));
});
exitFullBleedBtn.addEventListener('click', () => setFullBleed(false));

// Touch/Pointer physics stirring + horizontal top-zone theme swipe + double-tap bounce
let canvasDragging = false;
let swipeStart: { x: number; y: number; inTopZone: boolean } | null = null;
let lastTapMs = 0;

canvas.addEventListener('pointerdown', (e) => {
  wakeMobileDock();
  const rect = canvas.getBoundingClientRect();
  const relY = (e.clientY - rect.top) / Math.max(1, rect.height);
  swipeStart = { x: e.clientX, y: e.clientY, inTopZone: relY < 0.28 };

  const now = performance.now();
  if (now - lastTapMs < 280) {
    physics.applyShakeImpulse(0.85);
    lastTapMs = 0;
  } else {
    lastTapMs = now;
  }

  canvasDragging = true;
  canvas.setPointerCapture(e.pointerId);
  const wPos = renderer.screenToWorldZ0(e.clientX, e.clientY, rect);
  physics.setPointerPusher(true, wPos.x, wPos.y, 0);
});

canvas.addEventListener('pointermove', (e) => {
  if (!canvasDragging) return;
  const rect = canvas.getBoundingClientRect();
  const wPos = renderer.screenToWorldZ0(e.clientX, e.clientY, rect);
  physics.setPointerPusher(true, wPos.x, wPos.y, 0);
});

canvas.addEventListener('pointerup', (e) => {
  if (swipeStart && swipeStart.inTopZone) {
    const dx = e.clientX - swipeStart.x;
    const dy = Math.abs(e.clientY - swipeStart.y);
    if (Math.abs(dx) > 54 && dy < 48) {
      const idx = THEME_LIST.findIndex((t) => t.id === activeThemeId);
      const nextIdx = (idx + (dx < 0 ? 1 : -1) + THEME_LIST.length) % THEME_LIST.length;
      selectTheme(THEME_LIST[nextIdx].id);
    }
  }
  swipeStart = null;
  canvasDragging = false;
  physics.setPointerPusher(false);
});

canvas.addEventListener('pointercancel', () => {
  swipeStart = null;
  canvasDragging = false;
  physics.setPointerPusher(false);
});

// Resize sync via ResizeObserver
function syncResize(): void {
  const rect = screenStage.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;
  const nextBounds = renderer.resize(rect.width, rect.height);
  physics.resizeBounds(nextBounds);
}

const resizeObserver = new ResizeObserver(() => syncResize());
resizeObserver.observe(screenStage);

// Initialize default theme & UI
syncResize();
selectTheme(activeThemeId);
syncAudioUi();
wakeMobileDock();

// Expose clean diagnostic handle for verification
(window as unknown as Record<string, unknown>).__GRAVITY_WATCH__ = {
  selectTheme,
  getTheme: () => activeThemeId,
  setTilt: (x: number, y: number) => motion.setSimulatedTilt(x, y),
  shake: (s = 1.1) => physics.applyShakeImpulse(s),
  getStats: () => ({
    theme: activeThemeId,
    bodyCount: physics.bodies.length,
    bounds: renderer.getBounds(),
    motion: motion.getSnapshot(),
  }),
};

// Main 60Hz loop
let lastFrameMs = performance.now();
function animate(nowMs: number): void {
  const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameMs) / 1000));
  lastFrameMs = nowMs;

  const snap = motion.step(dt);
  screenStage.style.setProperty('--tilt-x', snap.tilt.x.toFixed(3));
  screenStage.style.setProperty('--tilt-y', snap.tilt.y.toFixed(3));
  physics.setGravity(snap.gravity.x, snap.gravity.y, snap.gravity.z);
  physics.step(dt);
  overlay.updateComplications(snap.kineticLevel);
  renderer.render(physics, snap.tilt, nowMs / 1000);

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
