import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { EnvironmentBank } from '../themes/environments';
import { createBrilliantDiamondGeometry, createGoldIngotGeometry } from '../themes/geometries';
import { FLOOR_BLEED, TextureBank } from '../themes/textures';
import { ThemeSpec } from '../themes/types';
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
  bodyIndex: number;
  phase: number;
  speed: number;
  baseScale: number;
}

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
  private itemMeshes: THREE.Mesh[] = [];
  private itemMeta: BodyMeta[] = [];
  private sharedItemGeo: THREE.BufferGeometry | null = null;
  private sharedItemMat: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial | null = null;
  private sparkleSlots: SparkleSlot[] = [];

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
    this.keyLight.castShadow = initialTheme.overlayLayout === 'vault';
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
      this.itemMeshes.length > 0 && Math.abs(nextRef - prevRef) / Math.max(0.01, prevRef) > 0.12;

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
    const isVault = this.currentTheme.overlayLayout === 'vault';
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
          roughness: this.currentTheme.id === 'basketball' ? 0.58 : 0.92,
          metalness: 0.02,
          envMapIntensity: this.currentTheme.id === 'basketball' ? 0.16 : 0.08,
        });
    patchFloorShadowShader(floorMat, this.shadowUniforms, isVault ? 'floor-vault' : 'floor-court');
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.set(0, 0, -hz);
    this.floorMesh.receiveShadow = isVault;
    this.boxGroup.add(this.floorMesh);
  }

  private clearItems(): void {
    for (const mesh of this.itemMeshes) {
      this.itemsGroup.remove(mesh);
    }
    this.itemMeshes = [];
    this.itemMeta = [];
    this.sharedItemGeo?.dispose();
    this.sharedItemGeo = null;
    this.sharedItemMat?.dispose();
    this.sharedItemMat = null;

    for (const slot of this.sparkleSlots) {
      this.sparklesGroup.remove(slot.sprite);
      (slot.sprite.material as THREE.Material).dispose();
    }
    this.sparkleSlots = [];
  }

  applyTheme(theme: ThemeSpec, bodyMeta: BodyMeta[]): void {
    this.currentTheme = theme;
    this.recomputeBounds();

    this.scene.background = new THREE.Color(theme.floorBaseColor);
    this.scene.environment = this.envBank.get(theme.envPreset);

    this.hemiLight.color.setHex(theme.hemiSkyColor);
    this.hemiLight.groundColor.setHex(theme.hemiGroundColor);
    this.hemiLight.intensity = theme.hemiIntensity;

    const isVault = theme.overlayLayout === 'vault';
    this.keyLight.color.setHex(theme.keyLightColor);
    this.keyLight.intensity = theme.keyLightIntensity;
    this.keyLight.castShadow = isVault;

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

    this.shadowUniforms.uLightRadius.value = theme.lightRadius;
    this.shadowUniforms.uFloorAoGain.value = theme.floorAoGain;
    this.shadowUniforms.uItemAoGain.value = theme.itemAoGain;
    this.shadowUniforms.uDepthDarkMin.value = theme.depthDarkMin;
    this.shadowUniforms.uIsSphereTheme.value = theme.shapeKind === 'sphere' ? 1.0 : 0.0;
    this.shadowUniforms.uItemRefRadius.value = baseSize;
    this.shadowUniforms.uShadowTint.value.setHex(theme.shadowTint);
    this.shadowUniforms.uBounceColor.value.setHex(theme.bounceColor);
    this.shadowUniforms.uFloorZ.value = -this.bounds.depth * 0.5;
    this.shadowUniforms.uBoxDepth.value = this.bounds.depth;

    this.rebuildBox();
    this.clearItems();

    if (theme.shapeKind === 'sphere') {
      this.sharedItemGeo = new THREE.SphereGeometry(baseSize, 32, 24);
      if (theme.id === 'tennis') {
        this.sharedItemMat = new THREE.MeshPhysicalMaterial({
          map: texSet.itemMap,
          bumpMap: texSet.itemBumpMap,
          bumpScale: 0.018,
          roughness: 0.92,
          metalness: 0.0,
          sheen: 0.06,
          sheenRoughness: 0.9,
          sheenColor: new THREE.Color(0xb8cc38),
          envMapIntensity: 0.26,
        });
      } else if (theme.id === 'basketball') {
        this.sharedItemMat = new THREE.MeshStandardMaterial({
          map: texSet.itemMap,
          bumpMap: texSet.itemBumpMap,
          bumpScale: 0.024,
          roughness: 0.74,
          metalness: 0.04,
          envMapIntensity: 0.3,
        });
      } else {
        this.sharedItemMat = new THREE.MeshStandardMaterial({
          map: texSet.itemMap,
          bumpMap: texSet.itemBumpMap,
          bumpScale: 0.016,
          roughness: 0.58,
          metalness: 0.04,
          envMapIntensity: 0.28,
        });
      }
    } else if (theme.shapeKind === 'diamond') {
      this.sharedItemGeo = createBrilliantDiamondGeometry(baseSize);
      this.sharedItemMat = new THREE.MeshPhysicalMaterial({
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
      });
    } else {
      const w = baseSize * 1.18;
      const t = baseSize * 0.68;
      const l = baseSize * 2.28;
      this.sharedItemGeo = createGoldIngotGeometry(w, t, l);
      this.sharedItemMat = new THREE.MeshPhysicalMaterial({
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
      });
    }

    patchItemShadowShader(this.sharedItemMat, this.shadowUniforms, `item-${theme.id}`);
    this.itemMeta = [...bodyMeta];

    for (const meta of bodyMeta) {
      const mesh = new THREE.Mesh(this.sharedItemGeo, this.sharedItemMat);
      mesh.scale.setScalar(meta.scale);
      mesh.castShadow = isVault;
      mesh.receiveShadow = isVault;
      this.itemsGroup.add(mesh);
      this.itemMeshes.push(mesh);
    }

    // Restrained delicate micro-glint sprites on top of HDR bloom for Diamonds
    if (theme.id === 'diamonds' && texSet.sparkleMap && bodyMeta.length > 0) {
      const glintCount = Math.min(8, bodyMeta.length);
      for (let i = 0; i < glintCount; i++) {
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
          bodyIndex: Math.floor((i * bodyMeta.length) / glintCount),
          phase: i * 1.37,
          speed: 2.1 + (i % 4) * 0.65,
          baseScale,
        });
      }
    }
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
    const n = Math.min(bodies.length, this.itemMeshes.length);
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      const m = this.itemMeshes[i];
      m.position.set(b.position.x, b.position.y, b.position.z);
      m.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    }

    // Smooth camera parallax + physically coherent world-fixed light & HDR dome rotation
    const clampedTx = Math.max(-1, Math.min(1, tilt.x));
    const clampedTy = Math.max(-1, Math.min(1, tilt.y));
    this.smoothTilt.x += (clampedTx - this.smoothTilt.x) * 0.14;
    this.smoothTilt.y += (clampedTy - this.smoothTilt.y) * 0.14;

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
    const aoCount = Math.min(n, this.itemMeta.length, MAX_AO_BODIES);
    this.shadowUniforms.uBodyCount.value = aoCount;
    for (let i = 0; i < aoCount; i++) {
      const b = bodies[i];
      const m = this.itemMeta[i];
      const effR =
        m.kind === 'sphere'
          ? m.halfExtents[0]
          : (m.halfExtents[0] + m.halfExtents[1] + m.halfExtents[2]) * 0.34;
      this.shadowUniforms.uBodies.value[i].set(b.position.x, b.position.y, b.position.z, effR);
    }

    // Subtle diamond scintillation sprites
    for (let i = 0; i < this.sparkleSlots.length; i++) {
      const slot = this.sparkleSlots[i];
      const b = bodies[slot.bodyIndex];
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

      const s = slot.baseScale * (0.5 + alpha * 0.85);
      slot.sprite.scale.set(s, s, 1);
      slot.sprite.position.set(
        b.position.x + Math.sin(slot.phase) * 0.06,
        b.position.y + Math.cos(slot.phase) * 0.06,
        b.position.z + 0.22,
      );
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
