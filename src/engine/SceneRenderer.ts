import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { EnvironmentBank } from '../themes/environments';
import {
  createBalloonParts,
  createBrilliantDiamondGeometry,
  createCasinoDiceGeometry,
  createEdisonBulbParts,
  createGoldIngotGeometry,
  createIceCubeGeometry,
  createShardGeometry,
} from '../themes/geometries';
import { FLOOR_BLEED, TextureBank } from '../themes/textures';
import { ShardKind, ThemeSpec } from '../themes/types';
import { BodyMeta, BoundsSize, PhysicsWorld } from './PhysicsWorld';
import {
  createShadowUniforms,
  MAX_AO_BODIES,
  patchFloorShadowShader,
  patchItemShadowShader,
  ShadowUniforms,
} from './ShadowShaders';

interface SparkleSlot {
  sprite: THREE.Sprite;
  bodyId: number;
  phase: number;
  speed: number;
  baseScale: number;
}

interface RenderedItem {
  meta: BodyMeta;
  object: THREE.Object3D;
  swappableMesh?: THREE.Mesh;
  filamentMat?: THREE.MeshStandardMaterial;
  extraDisposable?: THREE.Material;
}

type ItemMat = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

const BALLOON_COLORS = [0xff477e, 0x1fc4b4, 0xffbe2e, 0x8b5cf6, 0x3b96ff];
const JELLY_COLORS = [0xff3b87, 0x1ee395, 0xff9b1f, 0x3ac9ff, 0xb262ff];
const MARBLE_SHARD_COLORS = [0x3b8eff, 0x26c778, 0xff8f26, 0xb85cff];
const PORCELAIN_SHARD_COLORS = [0xeaf0f8, 0x9abcb4, 0xf2e7dc];

export class SceneRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly envBank: EnvironmentBank;
  private readonly texBank: TextureBank;

  private readonly hemiLight: THREE.HemisphereLight;
  private readonly keyLight: THREE.DirectionalLight;
  private readonly fillLight: THREE.DirectionalLight;
  private readonly baseKeyPos = new THREE.Vector3(-5.0, 6.0, 6.8);
  private readonly baseFillPos = new THREE.Vector3(4.8, -3.2, 4.2);
  private readonly tmpEuler = new THREE.Euler();
  private readonly shadowUniforms: ShadowUniforms = createShadowUniforms();

  private readonly boxGroup = new THREE.Group();
  private readonly itemsGroup = new THREE.Group();
  private readonly sparklesGroup = new THREE.Group();

  private floorMesh: THREE.Mesh | null = null;
  private readonly itemsById = new Map<number, RenderedItem>();
  private readonly themeDisposables: Array<{ dispose: () => void }> = [];
  private sparkleSlots: SparkleSlot[] = [];

  // Active theme builders/materials used both in applyTheme & runtime addBodyMesh/markBodyCracked
  private activeShadowCaster = false;
  private activeGeos: Record<string, THREE.BufferGeometry> = {};
  private intactMats: Array<ItemMat | ItemMat[]> = [];
  private crackedMats: ItemMat[] = [];
  private bulbCapMat: ItemMat | null = null;
  private bulbFilamentBaseMat: THREE.MeshStandardMaterial | null = null;
  private balloonTailMat: THREE.MeshStandardMaterial | null = null;
  private shardMats: ItemMat[] = [];

  private width = 390;
  private height = 844;
  private currentTheme: ThemeSpec;
  private bounds: BoundsSize = { halfW: 1.8, halfH: 3.9, depth: 1.7 };
  private cameraBaseZ = 14;
  private parallax = { x: 0, y: 0 };
  private smoothTilt = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement, initialTheme: ThemeSpec) {
    this.currentTheme = initialTheme;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = initialTheme.exposure;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(initialTheme.floorBaseColor);

    this.camera = new THREE.PerspectiveCamera(34, 390 / 844, 0.5, 45);
    this.camera.position.set(0, 0, this.cameraBaseZ);

    const msaaTarget = new THREE.WebGLRenderTarget(
      Math.round(this.width * dpr),
      Math.round(this.height * dpr),
      { type: THREE.HalfFloatType, samples: 4 },
    );
    this.composer = new EffectComposer(this.renderer, msaaTarget);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(this.width, this.height);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      initialTheme.bloomStrength,
      initialTheme.bloomRadius,
      initialTheme.bloomThreshold,
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    this.envBank = new EnvironmentBank(this.renderer);
    this.texBank = new TextureBank();

    this.hemiLight = new THREE.HemisphereLight(
      initialTheme.hemiSkyColor,
      initialTheme.hemiGroundColor,
      initialTheme.hemiIntensity,
    );
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(
      initialTheme.keyLightColor,
      initialTheme.keyLightIntensity,
    );
    this.keyLight.position.copy(this.baseKeyPos);
    this.keyLight.castShadow = Boolean(
      initialTheme.useHybridShadowMap || initialTheme.shapeKind === 'balloon',
    );
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.radius = 3.5;
    this.keyLight.shadow.bias = -0.0002;
    this.keyLight.shadow.normalBias = 0.008;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(
      initialTheme.fillLightColor,
      initialTheme.fillLightIntensity,
    );
    this.fillLight.position.copy(this.baseFillPos);
    this.scene.add(this.fillLight);

    this.scene.add(this.boxGroup);
    this.scene.add(this.itemsGroup);
    this.scene.add(this.sparklesGroup);

    this.recomputeBounds();
    this.rebuildBox();
  }

  getBounds(): BoundsSize {
    return { ...this.bounds };
  }

  private recomputeBounds(): void {
    const aspect = Math.max(0.25, this.width / Math.max(1, this.height));
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const halfFovTan = Math.tan(fovRad * 0.5);

    const estH = 2 * halfFovTan * this.cameraBaseZ;
    const estW = estH * aspect;
    const refSpan = Math.min(estW, estH);
    const depth = Math.max(1.25, Math.min(2.6, refSpan * this.currentTheme.boxDepthFactor));

    const playDist = this.cameraBaseZ + depth * 0.22;
    const playH = 2 * halfFovTan * playDist;
    const playW = playH * aspect;

    this.bounds = {
      halfW: playW * 0.5 - 0.02,
      halfH: playH * 0.5 - 0.02,
      depth,
    };

    const sx = this.bounds.halfW * 1.45;
    const sy = this.bounds.halfH * 1.45;
    this.keyLight.shadow.camera.left = -sx;
    this.keyLight.shadow.camera.right = sx;
    this.keyLight.shadow.camera.top = sy;
    this.keyLight.shadow.camera.bottom = -sy;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 26;
    this.keyLight.shadow.camera.updateProjectionMatrix();
  }

  resize(width: number, height: number): { bounds: BoundsSize; needsRespawn: boolean } {
    const prevRef = Math.min(this.bounds.halfW, this.bounds.halfH);

    this.width = Math.max(120, Math.round(width));
    this.height = Math.max(120, Math.round(height));

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(this.width, this.height);

    this.recomputeBounds();
    this.rebuildBox();

    const nextRef = Math.min(this.bounds.halfW, this.bounds.halfH);
    const needsRespawn =
      this.itemsById.size > 0 && Math.abs(nextRef - prevRef) / Math.max(0.01, prevRef) > 0.12;

    return { bounds: this.getBounds(), needsRespawn };
  }

  private clearBox(): void {
    if (this.floorMesh) {
      this.floorMesh.geometry.dispose();
      (this.floorMesh.material as THREE.Material).dispose();
      this.boxGroup.remove(this.floorMesh);
      this.floorMesh = null;
    }
  }

  private rebuildBox(): void {
    this.clearBox();

    const aspect = this.width / Math.max(1, this.height);
    const texSet = this.texBank.get(this.currentTheme.id, aspect);
    const depth = this.bounds.depth;
    const hz = depth * 0.5;
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const backDist = this.cameraBaseZ + hz;
    const backH = 2 * Math.tan(fovRad * 0.5) * backDist;
    const backW = backH * aspect;

    const floorGeo = new THREE.PlaneGeometry(backW * FLOOR_BLEED, backH * FLOOR_BLEED);
    const id = this.currentTheme.id;
    const isVault = this.currentTheme.overlayLayout === 'vault';
    const isMetalTray = id === 'ice' || id === 'bearings';

    let floorRoughness = 0.92;
    let floorMetalness = 0.02;
    let floorEnv = 0.08;
    if (id === 'basketball') {
      floorRoughness = 0.58;
      floorEnv = 0.16;
    } else if (isMetalTray) {
      floorRoughness = 0.48;
      floorMetalness = 0.52;
      floorEnv = 0.34;
    } else if (id === 'bulbs') {
      floorRoughness = 0.8;
      floorMetalness = 0.04;
      floorEnv = 0.12;
    } else if (id === 'marbles') {
      floorRoughness = 0.72;
      floorEnv = 0.12;
    } else if (id === 'dice') {
      floorRoughness = 0.94;
      floorMetalness = 0.0;
      floorEnv = 0.06;
    }

    const floorMat = isVault
      ? new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(this.currentTheme.floorBaseColor).multiplyScalar(0.35),
          roughness: 0.96,
          metalness: 0.0,
          specularIntensity: 0.04,
          envMapIntensity: 0.02,
        })
      : new THREE.MeshStandardMaterial({
          map: texSet.floorMap,
          roughnessMap: texSet.floorRoughnessMap ?? null,
          roughness: floorRoughness,
          metalness: floorMetalness,
          envMapIntensity: floorEnv,
        });

    patchFloorShadowShader(floorMat, this.shadowUniforms, isVault ? 'floor-vault' : 'floor-studio');
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.set(0, 0, -hz);
    this.floorMesh.receiveShadow = Boolean(
      this.currentTheme.useHybridShadowMap || this.currentTheme.shapeKind === 'balloon',
    );
    this.boxGroup.add(this.floorMesh);
  }

  private clearItems(): void {
    for (const item of this.itemsById.values()) {
      this.itemsGroup.remove(item.object);
      item.extraDisposable?.dispose();
    }
    this.itemsById.clear();

    for (const d of this.themeDisposables) {
      d.dispose();
    }
    this.themeDisposables.length = 0;

    this.activeGeos = {};
    this.intactMats = [];
    this.crackedMats = [];
    this.bulbCapMat = null;
    this.bulbFilamentBaseMat = null;
    this.balloonTailMat = null;
    this.shardMats = [];

    for (const slot of this.sparkleSlots) {
      this.sparklesGroup.remove(slot.sprite);
      (slot.sprite.material as THREE.Material).dispose();
    }
    this.sparkleSlots = [];
  }

  private track<T extends { dispose: () => void }>(res: T): T {
    this.themeDisposables.push(res);
    return res;
  }

  private buildThemeResources(theme: ThemeSpec, baseSize: number): void {
    const aspect = this.width / Math.max(1, this.height);
    const texSet = this.texBank.get(theme.id, aspect);
    this.activeShadowCaster = Boolean(theme.useHybridShadowMap || theme.shapeKind === 'balloon');

    if (theme.shapeKind === 'sphere' || theme.shapeKind === 'porcelain') {
      this.activeGeos.main = this.track(new THREE.SphereGeometry(baseSize, 32, 24));

      if (theme.id === 'tennis') {
        const mat = this.track(
          new THREE.MeshPhysicalMaterial({
            map: texSet.itemMap,
            bumpMap: texSet.itemBumpMap,
            bumpScale: 0.018,
            roughness: 0.92,
            metalness: 0.0,
            sheen: 0.06,
            sheenRoughness: 0.9,
            sheenColor: new THREE.Color(0xb8cc38),
            envMapIntensity: 0.26,
          }),
        );
        patchItemShadowShader(mat, this.shadowUniforms, 'item-tennis');
        this.intactMats = [mat];
      } else if (theme.id === 'basketball') {
        const mat = this.track(
          new THREE.MeshStandardMaterial({
            map: texSet.itemMap,
            bumpMap: texSet.itemBumpMap,
            bumpScale: 0.024,
            roughness: 0.74,
            metalness: 0.04,
            envMapIntensity: 0.3,
          }),
        );
        patchItemShadowShader(mat, this.shadowUniforms, 'item-basketball');
        this.intactMats = [mat];
      } else if (theme.id === 'soccer') {
        const mat = this.track(
          new THREE.MeshStandardMaterial({
            map: texSet.itemMap,
            bumpMap: texSet.itemBumpMap,
            bumpScale: 0.016,
            roughness: 0.58,
            metalness: 0.04,
            envMapIntensity: 0.28,
          }),
        );
        patchItemShadowShader(mat, this.shadowUniforms, 'item-soccer');
        this.intactMats = [mat];
      } else if (theme.id === 'marbles') {
        const maps = texSet.itemMaps ?? [];
        const cMaps = texSet.crackedMaps ?? [];
        for (let i = 0; i < Math.max(1, maps.length); i++) {
          const mat = this.track(
            new THREE.MeshPhysicalMaterial({
              map: maps[i],
              roughness: 0.025,
              metalness: 0.03,
              clearcoat: 1.0,
              clearcoatRoughness: 0.015,
              reflectivity: 1.0,
              envMapIntensity: 2.1,
            }),
          );
          patchItemShadowShader(mat, this.shadowUniforms, 'item-marbles');
          this.intactMats.push(mat);

          const cMat = this.track(
            new THREE.MeshPhysicalMaterial({
              map: cMaps[i] ?? maps[i],
              bumpMap: texSet.crackedBumpMap,
              bumpScale: 0.02,
              roughness: 0.14,
              metalness: 0.03,
              clearcoat: 0.9,
              clearcoatRoughness: 0.08,
              envMapIntensity: 1.4,
            }),
          );
          patchItemShadowShader(cMat, this.shadowUniforms, 'item-marbles-cracked');
          this.crackedMats.push(cMat);
        }
      } else if (theme.id === 'jelly') {
        for (let i = 0; i < JELLY_COLORS.length; i++) {
          const col = new THREE.Color(JELLY_COLORS[i]);
          const mat = this.track(
            new THREE.MeshPhysicalMaterial({
              color: col,
              emissive: col.clone().multiplyScalar(0.14),
              roughness: 0.08,
              metalness: 0.0,
              clearcoat: 1.0,
              clearcoatRoughness: 0.03,
              transparent: true,
              opacity: 0.86,
              envMapIntensity: 1.38,
            }),
          );
          patchItemShadowShader(mat, this.shadowUniforms, 'item-jelly');
          this.intactMats.push(mat);
        }
      } else if (theme.id === 'bearings') {
        const mat = this.track(
          new THREE.MeshPhysicalMaterial({
            color: 0xecf1f7,
            metalness: 1.0,
            roughness: 0.045,
            clearcoat: 0.35,
            clearcoatRoughness: 0.04,
            envMapIntensity: 1.85,
          }),
        );
        patchItemShadowShader(mat, this.shadowUniforms, 'item-bearings');
        this.intactMats = [mat];
      } else if (theme.id === 'porcelain') {
        const maps = texSet.itemMaps ?? [];
        const cMaps = texSet.crackedMaps ?? [];
        for (let i = 0; i < Math.max(1, maps.length); i++) {
          const mat = this.track(
            new THREE.MeshPhysicalMaterial({
              map: maps[i],
              roughnessMap: texSet.itemRoughnessMap,
              roughness: 0.18,
              metalness: 0.0,
              clearcoat: 1.0,
              clearcoatRoughness: 0.04,
              envMapIntensity: 1.15,
            }),
          );
          patchItemShadowShader(mat, this.shadowUniforms, 'item-porcelain');
          this.intactMats.push(mat);

          const cMat = this.track(
            new THREE.MeshPhysicalMaterial({
              map: cMaps[i] ?? maps[i],
              bumpMap: texSet.crackedBumpMap,
              bumpScale: 0.022,
              roughnessMap: texSet.itemRoughnessMap,
              roughness: 0.24,
              metalness: 0.0,
              clearcoat: 0.85,
              clearcoatRoughness: 0.08,
              envMapIntensity: 1.05,
            }),
          );
          patchItemShadowShader(cMat, this.shadowUniforms, 'item-porcelain-cracked');
          this.crackedMats.push(cMat);
        }
      }
    } else if (theme.shapeKind === 'diamond') {
      this.activeGeos.main = this.track(createBrilliantDiamondGeometry(baseSize));
      const mat = this.track(
        new THREE.MeshPhysicalMaterial({
          color: 0xf4f9ff,
          flatShading: true,
          metalness: 0.86,
          roughness: 0.01,
          clearcoat: 1.0,
          clearcoatRoughness: 0.01,
          reflectivity: 1.0,
          iridescence: 0.92,
          iridescenceIOR: 2.41,
          iridescenceThicknessRange: [150, 620],
          envMapIntensity: 2.35,
        }),
      );
      patchItemShadowShader(mat, this.shadowUniforms, 'item-diamonds');
      this.intactMats = [mat];
    } else if (theme.shapeKind === 'ingot') {
      const w = baseSize * 1.18;
      const t = baseSize * 0.68;
      const l = baseSize * 2.28;
      this.activeGeos.main = this.track(createGoldIngotGeometry(w, t, l));
      const mat = this.track(
        new THREE.MeshPhysicalMaterial({
          map: texSet.itemMap,
          bumpMap: texSet.itemBumpMap,
          bumpScale: 0.026,
          roughnessMap: texSet.itemRoughnessMap,
          color: 0xfad96b,
          metalness: 0.94,
          roughness: 0.2,
          clearcoat: 0.18,
          clearcoatRoughness: 0.14,
          envMapIntensity: 1.45,
        }),
      );
      patchItemShadowShader(mat, this.shadowUniforms, 'item-gold');
      this.intactMats = [mat];
    } else if (theme.shapeKind === 'bulb') {
      const parts = createEdisonBulbParts(baseSize);
      this.activeGeos.glass = this.track(parts.glassGeo);
      this.activeGeos.cap = this.track(parts.capGeo);
      this.activeGeos.filament = this.track(parts.filamentGeo);
      this.activeGeos.capStandalone = this.track(parts.capGeo.clone().translate(0, baseSize * 0.88, 0));

      const glassMat = this.track(
        new THREE.MeshPhysicalMaterial({
          color: 0xffd596,
          transparent: true,
          opacity: 0.16,
          roughness: 0.04,
          metalness: 0.02,
          clearcoat: 1.0,
          clearcoatRoughness: 0.01,
          reflectivity: 1.0,
          envMapIntensity: 2.3,
          depthWrite: false,
        }),
      );
      patchItemShadowShader(glassMat, this.shadowUniforms, 'item-bulbs-glass');
      this.intactMats = [glassMat];

      this.bulbCapMat = this.track(
        new THREE.MeshPhysicalMaterial({
          map: texSet.itemMap,
          bumpMap: texSet.itemBumpMap,
          bumpScale: 0.022,
          roughnessMap: texSet.itemRoughnessMap,
          color: 0xf6cf74,
          metalness: 0.88,
          roughness: 0.34,
          envMapIntensity: 1.35,
        }),
      );
      patchItemShadowShader(this.bulbCapMat, this.shadowUniforms, 'item-bulbs-cap');

      this.bulbFilamentBaseMat = this.track(
        new THREE.MeshStandardMaterial({
          color: 0xffc168,
          emissive: 0xff922b,
          emissiveIntensity: 2.25,
          roughness: 0.25,
          metalness: 0.1,
        }),
      );
    } else if (theme.shapeKind === 'balloon') {
      const parts = createBalloonParts(baseSize);
      this.activeGeos.balloonBody = this.track(parts.bodyGeo);
      this.activeGeos.balloonTail = this.track(parts.tailGeo);

      for (let i = 0; i < BALLOON_COLORS.length; i++) {
        const col = new THREE.Color(BALLOON_COLORS[i]);
        const mat = this.track(
          new THREE.MeshPhysicalMaterial({
            color: col,
            emissive: col.clone().multiplyScalar(0.08),
            roughness: 0.26,
            metalness: 0.0,
            clearcoat: 0.65,
            clearcoatRoughness: 0.16,
            sheen: 0.38,
            sheenColor: new THREE.Color(0xffffff),
            envMapIntensity: 0.88,
          }),
        );
        patchItemShadowShader(mat, this.shadowUniforms, 'item-balloons');
        this.intactMats.push(mat);
      }

      this.balloonTailMat = this.track(
        new THREE.MeshStandardMaterial({
          color: 0xe2c78c,
          roughness: 0.42,
          metalness: 0.25,
        }),
      );
      patchItemShadowShader(this.balloonTailMat, this.shadowUniforms, 'item-balloons-tail');
    } else if (theme.shapeKind === 'dice') {
      this.activeGeos.main = this.track(createCasinoDiceGeometry(baseSize * 1.66));
      const maps = texSet.itemMaps ?? [];
      const bMaps = texSet.itemBumpMaps ?? [];
      const faceMats: ItemMat[] = [];
      for (let i = 0; i < 6; i++) {
        const mat = this.track(
          new THREE.MeshPhysicalMaterial({
            map: maps[i],
            bumpMap: bMaps[i],
            bumpScale: 0.018,
            roughness: 0.12,
            metalness: 0.04,
            clearcoat: 1.0,
            clearcoatRoughness: 0.04,
            envMapIntensity: 1.35,
          }),
        );
        patchItemShadowShader(mat, this.shadowUniforms, 'item-dice');
        faceMats.push(mat);
      }
      this.intactMats = [faceMats];
    } else if (theme.shapeKind === 'ice') {
      this.activeGeos.main = this.track(createIceCubeGeometry(baseSize * 1.72));
      const mat = this.track(
        new THREE.MeshPhysicalMaterial({
          map: texSet.itemMap,
          color: 0xd2f1ff,
          bumpMap: texSet.itemBumpMap,
          bumpScale: 0.014,
          roughnessMap: texSet.itemRoughnessMap,
          roughness: 0.08,
          metalness: 0.04,
          clearcoat: 1.0,
          clearcoatRoughness: 0.02,
          transparent: true,
          opacity: 0.44,
          depthWrite: false,
          envMapIntensity: 2.35,
        }),
      );
      patchItemShadowShader(mat, this.shadowUniforms, 'item-ice');
      this.intactMats = [mat];
    }

    // Build shared shard/confetti geometry & materials when fragile
    if (theme.fragile) {
      const sk: ShardKind = theme.fragile.shardKind;
      this.activeGeos.shard = this.track(createShardGeometry(baseSize, sk));

      if (sk === 'confetti') {
        for (let i = 0; i < BALLOON_COLORS.length; i++) {
          const col = new THREE.Color(BALLOON_COLORS[i]);
          const sMat = this.track(
            new THREE.MeshStandardMaterial({
              color: col,
              emissive: col.clone().multiplyScalar(0.18),
              roughness: 0.45,
              metalness: 0.12,
              side: THREE.DoubleSide,
            }),
          );
          patchItemShadowShader(sMat, this.shadowUniforms, 'item-shard-confetti');
          this.shardMats.push(sMat);
        }
      } else if (sk === 'ice') {
        const sMat = this.track(
          new THREE.MeshPhysicalMaterial({
            color: 0xc8ecff,
            roughness: 0.08,
            metalness: 0.04,
            clearcoat: 1.0,
            transparent: true,
            opacity: 0.48,
            depthWrite: false,
            envMapIntensity: 2.1,
          }),
        );
        patchItemShadowShader(sMat, this.shadowUniforms, 'item-shard-ice');
        this.shardMats = [sMat];
      } else if (sk === 'ceramic') {
        for (const c of PORCELAIN_SHARD_COLORS) {
          const sMat = this.track(
            new THREE.MeshPhysicalMaterial({
              color: c,
              roughness: 0.18,
              clearcoat: 0.95,
              clearcoatRoughness: 0.06,
              envMapIntensity: 1.05,
            }),
          );
          patchItemShadowShader(sMat, this.shadowUniforms, 'item-shard-ceramic');
          this.shardMats.push(sMat);
        }
      } else {
        const colors = theme.id === 'marbles' ? MARBLE_SHARD_COLORS : [0xfff5e2];
        for (const c of colors) {
          const sMat = this.track(
            new THREE.MeshPhysicalMaterial({
              color: c,
              transparent: true,
              opacity: 0.62,
              roughness: 0.06,
              metalness: 0.04,
              clearcoat: 1.0,
              envMapIntensity: 1.75,
            }),
          );
          patchItemShadowShader(sMat, this.shadowUniforms, 'item-shard-glass');
          this.shardMats.push(sMat);
        }
      }
    }
  }

  private buildRenderedItem(meta: BodyMeta): RenderedItem {
    const theme = this.currentTheme;
    const cast = this.activeShadowCaster;

    if (meta.role === 'shard' && this.activeGeos.shard && this.shardMats.length > 0) {
      const mat = this.shardMats[meta.variantIndex % this.shardMats.length];
      const mesh = new THREE.Mesh(this.activeGeos.shard, mat);
      mesh.scale.setScalar(meta.scale);
      mesh.castShadow = cast;
      mesh.receiveShadow = cast;
      return { meta, object: mesh, swappableMesh: mesh };
    }

    if (meta.role === 'cap' && this.activeGeos.capStandalone && this.bulbCapMat) {
      const mesh = new THREE.Mesh(this.activeGeos.capStandalone, this.bulbCapMat);
      mesh.scale.setScalar(meta.scale);
      mesh.castShadow = cast;
      mesh.receiveShadow = cast;
      return { meta, object: mesh };
    }

    if (theme.shapeKind === 'bulb') {
      const group = new THREE.Group();
      const glassMat = this.intactMats[0] as ItemMat;
      const glassMesh = new THREE.Mesh(this.activeGeos.glass, glassMat);
      glassMesh.renderOrder = 2;
      glassMesh.castShadow = cast;
      glassMesh.receiveShadow = false;

      const capMesh = new THREE.Mesh(this.activeGeos.cap, this.bulbCapMat!);
      capMesh.castShadow = cast;
      capMesh.receiveShadow = cast;

      const filMat = this.bulbFilamentBaseMat!.clone();
      const filMesh = new THREE.Mesh(this.activeGeos.filament, filMat);

      group.add(capMesh, filMesh, glassMesh);
      group.scale.setScalar(meta.scale);
      return { meta, object: group, filamentMat: filMat, extraDisposable: filMat };
    }

    if (theme.shapeKind === 'balloon') {
      const group = new THREE.Group();
      const mat = this.intactMats[meta.variantIndex % this.intactMats.length] as ItemMat;
      const bodyMesh = new THREE.Mesh(this.activeGeos.balloonBody, mat);
      bodyMesh.castShadow = cast;
      bodyMesh.receiveShadow = cast;

      const tailMesh = new THREE.Mesh(this.activeGeos.balloonTail, this.balloonTailMat!);
      tailMesh.castShadow = cast;

      group.add(bodyMesh, tailMesh);
      group.scale.setScalar(meta.scale);
      return { meta, object: group, swappableMesh: bodyMesh };
    }

    const mat =
      meta.cracked && this.crackedMats.length > 0
        ? this.crackedMats[meta.variantIndex % this.crackedMats.length]
        : this.intactMats[meta.variantIndex % Math.max(1, this.intactMats.length)];

    const mesh = new THREE.Mesh(this.activeGeos.main, mat as THREE.Material | THREE.Material[]);
    mesh.scale.setScalar(meta.scale);
    mesh.castShadow = cast;
    mesh.receiveShadow = cast;
    return { meta, object: mesh, swappableMesh: mesh };
  }

  applyTheme(theme: ThemeSpec, bodyMeta: BodyMeta[]): void {
    this.currentTheme = theme;
    this.recomputeBounds();

    this.scene.background = new THREE.Color(theme.floorBaseColor);
    this.scene.environment = this.envBank.get(theme.envPreset);

    this.hemiLight.color.setHex(theme.hemiSkyColor);
    this.hemiLight.groundColor.setHex(theme.hemiGroundColor);
    this.hemiLight.intensity = theme.hemiIntensity;

    const enableShadowMap = Boolean(theme.useHybridShadowMap || theme.shapeKind === 'balloon');
    this.keyLight.color.setHex(theme.keyLightColor);
    this.keyLight.intensity = theme.keyLightIntensity;
    this.keyLight.castShadow = enableShadowMap;
    this.keyLight.shadow.intensity =
      theme.id === 'ice'
        ? 0.56
        : theme.id === 'balloons'
          ? 0.52
          : theme.id === 'bulbs'
            ? 0.72
            : 1.0;

    this.fillLight.color.setHex(theme.fillLightColor);
    this.fillLight.intensity = theme.fillLightIntensity;

    this.renderer.toneMappingExposure = theme.exposure;
    this.bloomPass.strength = theme.bloomStrength;
    this.bloomPass.radius = theme.bloomRadius;
    this.bloomPass.threshold = theme.bloomThreshold;

    const aspect = this.width / Math.max(1, this.height);
    const texSet = this.texBank.get(theme.id, aspect);
    const fullW = (this.bounds.halfW + 0.02) * 2;
    const fullH = (this.bounds.halfH + 0.02) * 2;
    const baseSize = Math.min(fullW, fullH) * theme.sizeFactor;

    const useSphereRayShadow = theme.shapeKind === 'sphere' || theme.shapeKind === 'porcelain';
    this.shadowUniforms.uLightRadius.value = theme.lightRadius;
    this.shadowUniforms.uFloorAoGain.value = theme.floorAoGain;
    this.shadowUniforms.uItemAoGain.value = theme.itemAoGain;
    this.shadowUniforms.uDepthDarkMin.value = theme.depthDarkMin;
    this.shadowUniforms.uShadowMin.value = theme.shadowMin ?? 0.04;
    this.shadowUniforms.uIsSphereTheme.value = useSphereRayShadow ? 1.0 : 0.0;
    this.shadowUniforms.uItemRefRadius.value = baseSize;
    this.shadowUniforms.uShadowTint.value.setHex(theme.shadowTint);
    this.shadowUniforms.uBounceColor.value.setHex(theme.bounceColor);
    this.shadowUniforms.uFloorZ.value = -this.bounds.depth * 0.5;
    this.shadowUniforms.uBoxDepth.value = this.bounds.depth;

    this.rebuildBox();
    this.clearItems();
    this.buildThemeResources(theme, baseSize);

    for (const meta of bodyMeta) {
      this.addBodyMesh(meta);
    }

    // Restrained delicate micro-glint sprites on top of HDR bloom for Diamonds
    if (theme.id === 'diamonds' && texSet.sparkleMap && bodyMeta.length > 0) {
      const glintCount = Math.min(8, bodyMeta.length);
      for (let i = 0; i < glintCount; i++) {
        const slotMeta = bodyMeta[Math.floor((i * bodyMeta.length) / glintCount)];
        const sMat = new THREE.SpriteMaterial({
          map: texSet.sparkleMap,
          color: i % 2 === 0 ? 0xffffff : 0xd6efff,
          transparent: true,
          opacity: 0.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(sMat);
        const baseScale = baseSize * (0.68 + (i % 3) * 0.22);
        sprite.scale.set(baseScale, baseScale, 1);
        this.sparklesGroup.add(sprite);
        this.sparkleSlots.push({
          sprite,
          bodyId: slotMeta.id,
          phase: i * 1.37,
          speed: 2.1 + (i % 4) * 0.65,
          baseScale,
        });
      }
    }
  }

  addBodyMesh(meta: BodyMeta): void {
    if (this.itemsById.has(meta.id)) return;
    const item = this.buildRenderedItem(meta);
    this.itemsGroup.add(item.object);
    this.itemsById.set(meta.id, item);
  }

  removeBodyMesh(id: number): void {
    const item = this.itemsById.get(id);
    if (!item) return;
    this.itemsGroup.remove(item.object);
    item.extraDisposable?.dispose();
    this.itemsById.delete(id);
  }

  markBodyCracked(meta: BodyMeta): void {
    const item = this.itemsById.get(meta.id);
    if (!item?.swappableMesh || this.crackedMats.length === 0) return;
    item.swappableMesh.material = this.crackedMats[meta.variantIndex % this.crackedMats.length];
  }

  screenToWorldZ0(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } {
    const ndcX = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);

    const vec = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(this.camera);
    const dir = vec.sub(this.camera.position).normalize();
    const t = -this.camera.position.z / dir.z;
    const hit = this.camera.position.clone().add(dir.multiplyScalar(t));
    return {
      x: Math.max(-this.bounds.halfW, Math.min(this.bounds.halfW, hit.x)),
      y: Math.max(-this.bounds.halfH, Math.min(this.bounds.halfH, hit.y)),
    };
  }

  render(
    physics: PhysicsWorld,
    tilt: { x: number; y: number },
    timeSec: number,
    recoil: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
  ): void {
    const bodies = physics.bodies;
    const metas = physics.meta;
    let aoCount = 0;

    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const m = metas[i];
      const item = this.itemsById.get(m.id);
      if (item) {
        item.object.position.set(b.position.x, b.position.y, b.position.z);
        item.object.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);

        if (m.squash > 0.001) {
          const wobble = m.squash * 0.22 * Math.cos(timeSec * 38 + m.id * 1.9);
          const xz = Math.max(0.76, Math.min(1.26, 1 + wobble));
          const sy = m.scale / (xz * xz);
          item.object.scale.set(m.scale * xz, sy, m.scale * xz);
        } else if (item.object.scale.x !== m.scale || item.object.scale.y !== m.scale) {
          item.object.scale.setScalar(m.scale);
        }

        // Dynamic filament warmth shimmer for Edison bulbs
        if (item.filamentMat) {
          const spd = b.velocity.length();
          const pulse = 1.95 + Math.min(1.1, spd * 0.14) + Math.sin(timeSec * 7.5 + m.id) * 0.18;
          item.filamentMat.emissiveIntensity = pulse;
        }
      }

      if (aoCount < MAX_AO_BODIES) {
        const effR =
          m.kind === 'sphere' || m.kind === 'porcelain'
            ? m.halfExtents[0]
            : (m.halfExtents[0] + m.halfExtents[1] + m.halfExtents[2]) * 0.34;
        this.shadowUniforms.uBodies.value[aoCount].set(b.position.x, b.position.y, b.position.z, effR);
        aoCount += 1;
      }
    }

    // Smooth camera parallax + physically coherent world-fixed light & HDR dome rotation
    const clampedTx = Math.max(-1, Math.min(1, tilt.x));
    const clampedTy = Math.max(-1, Math.min(1, tilt.y));
    this.smoothTilt.x += (clampedTx - this.smoothTilt.x) * 0.22;
    this.smoothTilt.y += (clampedTy - this.smoothTilt.y) * 0.22;

    this.parallax.x = this.smoothTilt.x * 0.25;
    this.parallax.y = this.smoothTilt.y * 0.21;

    this.camera.position.set(
      this.parallax.x + recoil.x,
      this.parallax.y + recoil.y,
      this.cameraBaseZ + recoil.z,
    );
    this.camera.lookAt(0, 0, -this.bounds.depth * 0.25);

    const rotX = this.smoothTilt.y * 0.32;
    const rotY = -this.smoothTilt.x * 0.32;
    this.scene.environmentRotation.set(rotX, rotY, 0);

    this.tmpEuler.set(rotX, rotY, 0);
    this.keyLight.position.copy(this.baseKeyPos).applyEuler(this.tmpEuler);
    this.fillLight.position.copy(this.baseFillPos).applyEuler(this.tmpEuler);

    // Sync analytical raytraced shadow & multi-body crevice AO uniforms
    this.shadowUniforms.uKeyDir.value.copy(this.keyLight.position).normalize();
    this.shadowUniforms.uFloorZ.value = -this.bounds.depth * 0.5;
    this.shadowUniforms.uBoxDepth.value = this.bounds.depth;
    this.shadowUniforms.uBodyCount.value = aoCount;

    // Subtle diamond scintillation sprites
    for (let i = 0; i < this.sparkleSlots.length; i++) {
      const slot = this.sparkleSlots[i];
      const item = this.itemsById.get(slot.bodyId);
      const b = item
        ? bodies.find((_, idx) => metas[idx].id === slot.bodyId)
        : undefined;
      if (!b) continue;

      const angSpeed = b.angularVelocity.length();
      const pulse = Math.pow(
        Math.max(0, Math.sin(timeSec * slot.speed + slot.phase + b.quaternion.x * 4 + tilt.x * 3)),
        8,
      );
      const boost = Math.min(1, 0.22 + angSpeed * 0.25 + Math.hypot(tilt.x, tilt.y) * 0.25);
      const alpha = Math.min(0.68, pulse * boost);
      const mat = slot.sprite.material as THREE.SpriteMaterial;
      mat.opacity = alpha;
      slot.sprite.position.set(
        b.position.x + 0.04,
        b.position.y + 0.04,
        b.position.z + this.bounds.depth * 0.14,
      );
      const sc = slot.baseScale * (0.65 + alpha * 0.9);
      slot.sprite.scale.set(sc, sc, 1);
    }

    this.composer.render();
  }

  dispose(): void {
    this.clearItems();
    this.clearBox();
    this.envBank.dispose();
    this.texBank.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
