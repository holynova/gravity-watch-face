import './styles/main.css';
import { HapticsEngine } from './audio/HapticsEngine';
import { SoundEngine } from './audio/SoundEngine';
import { PhysicsWorld } from './engine/PhysicsWorld';
import { SceneRenderer } from './engine/SceneRenderer';
import { MotionController, MotionSnapshot } from './sensors/MotionController';
import { getThemeIconSvg } from './themes/icons';
import { isThemeId, THEME_LIST, THEMES_BY_ID, ThemeId } from './themes/types';

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
const sceneToast = document.getElementById('sceneToast') as HTMLElement;
const mobileDock = document.getElementById('mobileDock') as HTMLElement;
const mobilePrevBtn = document.getElementById('mobilePrevBtn') as HTMLButtonElement;
const mobileNextBtn = document.getElementById('mobileNextBtn') as HTMLButtonElement;
const mobileSwatches = document.getElementById('mobileSwatches') as HTMLElement;
const mobileAudioBtn = document.getElementById('mobileAudioBtn') as HTMLButtonElement;
const mobileHapticsBtn = document.getElementById('mobileHapticsBtn') as HTMLButtonElement;
const mobileFullscreenBtn = document.getElementById('mobileFullscreenBtn') as HTMLButtonElement;

const desktopThemes = document.getElementById('desktopThemes') as HTMLElement;
const desktopPrevBtn = document.getElementById('desktopPrevBtn') as HTMLButtonElement;
const desktopNextBtn = document.getElementById('desktopNextBtn') as HTMLButtonElement;
const themeCounter = document.getElementById('themeCounter') as HTMLElement;
const themeSubtitle = document.getElementById('themeSubtitle') as HTMLElement;
const modeBadge = document.getElementById('modeBadge') as HTMLElement;
const gyroPad = document.getElementById('gyroPad') as HTMLElement;
const gyroPuck = document.getElementById('gyroPuck') as HTMLElement;
const resetTiltBtn = document.getElementById('resetTiltBtn') as HTMLButtonElement;
const shakeBtn = document.getElementById('shakeBtn') as HTMLButtonElement;
const demoBtn = document.getElementById('demoBtn') as HTMLButtonElement;
const audioBtn = document.getElementById('audioBtn') as HTMLButtonElement;
const hapticsBtn = document.getElementById('hapticsBtn') as HTMLButtonElement;
const fullBleedBtn = document.getElementById('fullBleedBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const exitFullBleedBtn = document.getElementById('exitFullBleedBtn') as HTMLButtonElement;
const telemetryText = document.getElementById('telemetryText') as HTMLElement;

let activeThemeId: ThemeId = resolveInitialTheme();

const sound = new SoundEngine();
const haptics = new HapticsEngine();
const renderer = new SceneRenderer(canvas, THEMES_BY_ID[activeThemeId]);
const physics = new PhysicsWorld(
  renderer.getBounds(),
  (evt) => {
    sound.playImpact(evt.speed, evt.materialTag);
    haptics.playCollision(evt, activeThemeId);
  },
  () => {
    haptics.playTouchNudge(activeThemeId, true);
  },
  {
    onBodyAdded: (meta) => renderer.addBodyMesh(meta),
    onBodyRemoved: (id) => renderer.removeBodyMesh(id),
    onBodyCracked: (meta) => renderer.markBodyCracked(meta),
    onCrack: (themeId) => {
      sound.playCrack();
      haptics.playCrack(themeId);
    },
    onBreak: (kind) => {
      sound.playBreak(kind);
      haptics.playShatter(kind);
    },
  },
);

let dimTimer: number | null = null;
function wakeMobileDock(): void {
  mobileDock.classList.remove('is-dimmed');
  exitFullBleedBtn.classList.remove('is-dimmed');
  if (dimTimer !== null) window.clearTimeout(dimTimer);
  const delay = appShell.classList.contains('is-fullbleed') ? 2600 : 3600;
  dimTimer = window.setTimeout(() => {
    mobileDock.classList.add('is-dimmed');
    if (appShell.classList.contains('is-fullbleed')) {
      exitFullBleedBtn.classList.add('is-dimmed');
    }
  }, delay);
}

let toastTimer: number | null = null;
function showSceneToast(id: ThemeId): void {
  const idx = THEME_LIST.findIndex((t) => t.id === id);
  const spec = THEMES_BY_ID[id];
  sceneToast.innerHTML = `${getThemeIconSvg(id)}<span>${spec.labelZh}</span><span class="scene-toast-count">${idx + 1}/${THEME_LIST.length}</span>`;
  sceneToast.hidden = false;
  sceneToast.classList.add('is-visible');
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    sceneToast.classList.remove('is-visible');
    toastTimer = window.setTimeout(() => {
      sceneToast.hidden = true;
    }, 240);
  }, 1150);
}

const desktopButtons = new Map<ThemeId, HTMLButtonElement>();
const mobileButtons = new Map<ThemeId, HTMLButtonElement>();

for (const spec of THEME_LIST) {
  const iconSvg = getThemeIconSvg(spec.id);

  const dBtn = document.createElement('button');
  dBtn.type = 'button';
  dBtn.className = 'theme-btn';
  dBtn.dataset.theme = spec.id;
  dBtn.setAttribute('role', 'tab');
  dBtn.innerHTML = `<span class="theme-swatch-dot">${iconSvg}</span><span>${spec.labelZh}</span>`;
  dBtn.addEventListener('click', () => selectTheme(spec.id, true));
  desktopThemes.appendChild(dBtn);
  desktopButtons.set(spec.id, dBtn);

  const mBtn = document.createElement('button');
  mBtn.type = 'button';
  mBtn.className = 'mobile-swatch';
  mBtn.dataset.theme = spec.id;
  mBtn.setAttribute('aria-label', spec.labelZh);
  mBtn.title = spec.labelZh;
  mBtn.innerHTML = iconSvg;
  mBtn.addEventListener('click', () => {
    wakeMobileDock();
    selectTheme(spec.id, true);
  });
  mobileSwatches.appendChild(mBtn);
  mobileButtons.set(spec.id, mBtn);
}

function stepTheme(delta: number): void {
  const idx = THEME_LIST.findIndex((t) => t.id === activeThemeId);
  const nextIdx = (idx + delta + THEME_LIST.length) % THEME_LIST.length;
  selectTheme(THEME_LIST[nextIdx].id, true);
}

mobilePrevBtn.addEventListener('click', () => {
  wakeMobileDock();
  stepTheme(-1);
});
mobileNextBtn.addEventListener('click', () => {
  wakeMobileDock();
  stepTheme(1);
});
desktopPrevBtn.addEventListener('click', () => stepTheme(-1));
desktopNextBtn.addEventListener('click', () => stepTheme(1));

resetBtn.addEventListener('click', () => {
  selectTheme(activeThemeId, true);
});

function selectTheme(id: ThemeId, fromGesture = false): void {
  activeThemeId = id;
  const spec = THEMES_BY_ID[id];
  const idx = THEME_LIST.findIndex((t) => t.id === id);
  document.documentElement.style.setProperty('--theme-floor-bg', spec.floorBaseColor);
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) themeColorMeta.setAttribute('content', spec.floorBaseColor);
  const meta = physics.spawnForTheme(spec);
  renderer.applyTheme(spec, meta);
  sound.setTheme(id);
  themeSubtitle.textContent = spec.labelEn;
  themeCounter.textContent = `${idx + 1}/${THEME_LIST.length}`;

  if (fromGesture) {
    haptics.playThemeSwitch(id);
    showSceneToast(id);
  }

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

  if (fromGesture) {
    desktopButtons.get(id)?.scrollIntoView({ block: 'nearest' });
    mobileButtons.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function syncAudioUi(): void {
  const on = sound.isEnabled();
  audioBtn.setAttribute('aria-pressed', String(on));
  audioBtn.textContent = on ? '音效已开' : '碰撞音效';
  mobileAudioBtn.dataset.muted = String(!on);
}

function syncHapticsUi(): void {
  const on = haptics.isEnabled();
  hapticsBtn.setAttribute('aria-pressed', String(on));
  hapticsBtn.textContent = on ? '震动已开' : '震动反馈';
  mobileHapticsBtn.setAttribute('aria-pressed', String(on));
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
  onShake: (strength) => {
    physics.applyShakeImpulse(strength);
    haptics.playShake(strength, false);
  },
  onUpdate: (snap) => updateUiFromMotion(snap),
});

sensorCta.addEventListener('click', async () => {
  haptics.playUiTap();
  const granted = await motion.requestPermission();
  if (granted) {
    sensorCta.hidden = true;
    physics.applyShakeImpulse(0.65);
    haptics.playShake(0.65, true);
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
  haptics.playUiTap();
  motion.setSimulatedTilt(0, -0.92);
});

shakeBtn.addEventListener('click', () => {
  physics.applyShakeImpulse(1.15);
  haptics.playShake(1.15, true);
});

demoBtn.addEventListener('click', () => {
  haptics.playUiTap();
  motion.toggleDemo();
});

const toggleAudio = async () => {
  haptics.playUiTap();
  await sound.toggle();
  syncAudioUi();
  wakeMobileDock();
};
audioBtn.addEventListener('click', () => void toggleAudio());
mobileAudioBtn.addEventListener('click', () => void toggleAudio());

const toggleHaptics = () => {
  haptics.toggle();
  syncHapticsUi();
  wakeMobileDock();
};
hapticsBtn.addEventListener('click', toggleHaptics);
mobileHapticsBtn.addEventListener('click', toggleHaptics);

function getFullscreenElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function applyFullBleedState(full: boolean): void {
  appShell.classList.toggle('is-fullbleed', full);
  fullBleedBtn.setAttribute('aria-pressed', String(full));
  mobileFullscreenBtn.setAttribute('aria-pressed', String(full));
  exitFullBleedBtn.hidden = !full;
  if (full) {
    wakeMobileDock();
  } else {
    exitFullBleedBtn.classList.remove('is-dimmed');
  }
  requestAnimationFrame(() => syncResize());
}

async function enterFullscreen(): Promise<void> {
  haptics.playUiTap();
  applyFullBleedState(true);

  const root = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  try {
    if (root.requestFullscreen) {
      await root.requestFullscreen();
    } else if (root.webkitRequestFullscreen) {
      await root.webkitRequestFullscreen();
    }
  } catch {
    // Fallback smoothly to CSS immersive full-bleed mode (e.g. iOS Safari / automated preview)
  }

  window.scrollTo(0, 1);
}

async function exitFullscreen(): Promise<void> {
  haptics.playUiTap();
  applyFullBleedState(false);

  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
  };
  try {
    if (getFullscreenElement()) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    }
  } catch {
    // Ignore if already exited
  }
}

const toggleFullscreen = () => {
  if (appShell.classList.contains('is-fullbleed') || getFullscreenElement()) {
    void exitFullscreen();
  } else {
    void enterFullscreen();
  }
};

fullBleedBtn.addEventListener('click', toggleFullscreen);
mobileFullscreenBtn.addEventListener('click', toggleFullscreen);
exitFullBleedBtn.addEventListener('click', () => void exitFullscreen());

const handleNativeFullscreenChange = () => {
  const nativeActive = Boolean(getFullscreenElement());
  if (!nativeActive && appShell.classList.contains('is-fullbleed')) {
    // Keep CSS state synced when user exits native fullscreen via Esc or OS gesture
    applyFullBleedState(false);
  } else if (nativeActive) {
    applyFullBleedState(true);
  }
};
document.addEventListener('fullscreenchange', handleNativeFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleNativeFullscreenChange);

// Touch/Pointer physics stirring + horizontal top-zone theme swipe + double-tap bounce
let canvasDragging = false;
let swipeStart: { x: number; y: number; inTopZone: boolean } | null = null;
let lastTapMs = 0;

canvas.addEventListener('pointerdown', (e) => {
  wakeMobileDock();
  const rect = canvas.getBoundingClientRect();
  const relY = (e.clientY - rect.top) / Math.max(1, rect.height);
  swipeStart = { x: e.clientX, y: e.clientY, inTopZone: relY < 0.42 };
  const wPos = renderer.screenToWorldZ0(e.clientX, e.clientY, rect);

  const now = performance.now();
  const isDoubleTap = now - lastTapMs < 280;
  if (isDoubleTap) {
    lastTapMs = 0;
  } else {
    lastTapMs = now;
  }

  if (activeThemeId === 'balloons') {
    if (physics.pokeAt(wPos.x, wPos.y)) return;
  } else if (isDoubleTap) {
    if (!physics.pokeAt(wPos.x, wPos.y)) {
      physics.applyShakeImpulse(0.95);
      haptics.playShake(0.95, true);
    }
  }

  canvasDragging = true;
  canvas.setPointerCapture(e.pointerId);
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
    if (Math.abs(dx) > 56 && dy < 48) {
      const idx = THEME_LIST.findIndex((t) => t.id === activeThemeId);
      const nextIdx = (idx + (dx < 0 ? 1 : -1) + THEME_LIST.length) % THEME_LIST.length;
      selectTheme(THEME_LIST[nextIdx].id, true);
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

// Resize sync across ResizeObserver, visualViewport & screen orientation changes
function syncResize(): void {
  const rect = screenStage.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;
  const { bounds, needsRespawn } = renderer.resize(rect.width, rect.height);
  if (needsRespawn) {
    physics.resizeBounds(bounds);
    const spec = THEMES_BY_ID[activeThemeId];
    const meta = physics.spawnForTheme(spec);
    renderer.applyTheme(spec, meta);
  } else {
    physics.resizeBounds(bounds);
  }
}

const resizeObserver = new ResizeObserver(() => syncResize());
resizeObserver.observe(screenStage);
window.visualViewport?.addEventListener('resize', () => syncResize());
window.addEventListener('orientationchange', () => window.setTimeout(syncResize, 120));

window.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const digit = Number(e.key);
  if (digit >= 1 && digit <= Math.min(9, THEME_LIST.length)) {
    selectTheme(THEME_LIST[digit - 1].id, true);
    wakeMobileDock();
    return;
  }
  if (e.key === '[' || e.key === 'ArrowLeft') {
    const idx = THEME_LIST.findIndex((t) => t.id === activeThemeId);
    const prevIdx = (idx - 1 + THEME_LIST.length) % THEME_LIST.length;
    selectTheme(THEME_LIST[prevIdx].id, true);
    wakeMobileDock();
  } else if (e.key === ']' || e.key === 'ArrowRight') {
    const idx = THEME_LIST.findIndex((t) => t.id === activeThemeId);
    const nextIdx = (idx + 1) % THEME_LIST.length;
    selectTheme(THEME_LIST[nextIdx].id, true);
    wakeMobileDock();
  } else if (e.key === 'r' || e.key === 'R') {
    selectTheme(activeThemeId, true);
    wakeMobileDock();
  }
});

// Initialize default theme & UI
syncResize();
selectTheme(activeThemeId, false);
syncAudioUi();
syncHapticsUi();
wakeMobileDock();

// Expose clean diagnostic handle for verification
(window as unknown as Record<string, unknown>).__GRAVITY_WATCH__ = {
  selectTheme: (id: ThemeId) => selectTheme(id, true),
  stepTheme: (delta: number) => stepTheme(delta),
  getTheme: () => activeThemeId,
  resetScene: () => selectTheme(activeThemeId, true),
  setTilt: (x: number, y: number) => motion.setSimulatedTilt(x, y),
  pokeAt: (x: number, y: number) => physics.pokeAt(x, y),
  triggerBreakDemo: (maxCount = 2) => physics.triggerBreakDemo(maxCount),
  shake: (s = 1.1) => {
    physics.applyShakeImpulse(s);
    haptics.playShake(s, false);
  },
  getStats: () => ({
    theme: activeThemeId,
    themeCount: THEME_LIST.length,
    bodyCount: physics.bodies.length,
    roleCounts: physics.getRoleCounts(),
    masses: physics.bodies.map((b, idx) => ({
      tag: physics.meta[idx]?.materialTag ?? activeThemeId,
      mass: Number(b.mass.toFixed(2)),
    })),
    avgY:
      physics.bodies.length > 0
        ? physics.bodies.reduce((sum, b) => sum + b.position.y, 0) / physics.bodies.length
        : 0,
    bounds: renderer.getBounds(),
    motion: motion.getSnapshot(),
    audio: sound.getStats(),
    haptics: haptics.getStats(),
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
  haptics.updateRolling(physics.getMotionMetrics(), activeThemeId, nowMs);
  renderer.render(physics, snap.tilt, nowMs / 1000, haptics.getRecoilOffset(dt));

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
