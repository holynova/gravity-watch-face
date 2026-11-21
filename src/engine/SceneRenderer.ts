import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { EnvironmentBank } from '../themes/environments';
import { createBrilliantDiamondGeometry, createGoldIngotGeometry } from '../themes/geometries';
import { TextureBank } from '../themes/textures';
import { ThemeSpec } from '../themes/types';
import { BodyMeta, BoundsSize, PhysicsWorld } from './PhysicsWorld';

interface SparkleSlot {
  sprite: THREE.Sprite;
  bodyIndex: number;
  phase: number;
  speed: number;
  baseScale: number;
}

interface ShadowSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  meta: BodyMeta;
}

function orientWallGeometryUVs(
  geo: THREE.PlaneGeometry,
  rot: [number, number, number],
  wallSpanZ: number,
): void {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const euler = new THREE.Euler(rot[0], rot[1], rot[2]);
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyEuler(euler);
    const vz = THREE.MathUtils.clamp((v.z + wallSpanZ * 0.5) / wallSpanZ, 0, 1);
    uv.setXY(i, 0.5, vz);
  }
  uv.needsUpdate = true;
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
  private readonly baseKeyPos = new THREE.Vector3(-5.2, 6.8, 7.6);
  private readonly baseFillPos = new THREE.Vector3(4.5, -3.5, 4.8);
  private readonly tmpVec = new THREE.Vector3();
  private readonly tmpEuler = new THREE.Euler();
  private readonly tmpQuat = new THREE.Quaternion();

  private readonly boxGroup = new THREE.Group();
  private readonly contactShadowGroup = new THREE.Group();
  private readonly itemsGroup = new THREE.Group();
  private readonly sparklesGroup = new THREE.Group();

  private floorMesh: THREE.Mesh | null = null;
  private wallMeshes: THREE.Mesh[] = [];
  private itemMeshes: THREE.Mesh[] = [];
  private shadowSlots: ShadowSlot[] = [];
  private sharedShadowGeo: THREE.PlaneGeometry | null = null;
  private sharedItemGeo: THREE.BufferGeometry | null = null;
  private sharedItemMat: THREE.Material | null = null;
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
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030406);

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
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.radius = 4.2;
    this.keyLight.shadow.bias = -0.00035;
    this.keyLight.shadow.normalBias = 0.014;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(
      initialTheme.fillLightColor,
      initialTheme.fillLightIntensity,
    );
    this.fillLight.position.copy(this.baseFillPos);
    this.scene.add(this.fillLight);

    this.scene.add(this.boxGroup);
    this.scene.add(this.contactShadowGroup);
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

    const frontDist = this.cameraBaseZ - depth * 0.5;
    const frontH = 2 * halfFovTan * frontDist;
    const frontW = frontH * aspect;

    this.bounds = {
      halfW: frontW * 0.5 - 0.035,
      halfH: frontH * 0.5 - 0.035,
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
    for (const w of this.wallMeshes) {
      w.geometry.dispose();
      (w.material as THREE.Material).dispose();
      this.boxGroup.remove(w);
    }
    this.wallMeshes = [];
  }

  private rebuildBox(): void {
    this.clearBox();

    const aspect = this.width / Math.max(1, this.height);
    const texSet = this.texBank.get(this.currentTheme.id, aspect);
    const fullW = (this.bounds.halfW + 0.035) * 2;
    const fullH = (this.bounds.halfH + 0.035) * 2;
    const depth = this.bounds.depth;
    const hz = depth * 0.5;

    const floorGeo = new THREE.PlaneGeometry(fullW + 0.08, fullH + 0.08);
    const isVault = this.currentTheme.overlayLayout === 'vault';
    const floorMat = isVault
      ? new THREE.MeshStandardMaterial({
          color: this.currentTheme.id === 'gold' ? 0x040403 : 0x040507,
          roughness: 0.98,
          metalness: 0.0,
          envMapIntensity: 0.02,
        })
      : new THREE.MeshStandardMaterial({
          map: texSet.floorMap,
          roughnessMap: texSet.floorRoughnessMap ?? null,
          roughness: this.currentTheme.id === 'basketball' ? 0.58 : 0.92,
          metalness: 0.02,
          envMapIntensity: 0.22,
        });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.set(0, 0, -hz);
    this.floorMesh.receiveShadow = true;
    this.boxGroup.add(this.floorMesh);

    // 4 recessed cavity walls with depth-mapped AO darkening into floor seam
    const wallSpanZ = depth + 1.4;
    const wallCenterZ = 0.7;
    const wallAoTex = this.texBank.getWallAo(this.currentTheme.wallColor);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallAoTex,
      roughness: 0.94,
      metalness: 0.02,
      envMapIntensity: 0.1,
      side: THREE.FrontSide,
    });

    const wallSpecs: Array<{
      w: number;
      h: number;
      pos: [number, number, number];
      rot: [number, number, number];
    }> = [
      { w: wallSpanZ, h: fullH + 0.1, pos: [-fullW * 0.5, 0, wallCenterZ], rot: [0, Math.PI / 2, 0] },
      { w: wallSpanZ, h: fullH + 0.1, pos: [fullW * 0.5, 0, wallCenterZ], rot: [0, -Math.PI / 2, 0] },
      { w: fullW + 0.1, h: wallSpanZ, pos: [0, -fullH * 0.5, wallCenterZ], rot: [-Math.PI / 2, 0, 0] },
      { w: fullW + 0.1, h: wallSpanZ, pos: [0, fullH * 0.5, wallCenterZ], rot: [Math.PI / 2, 0, 0] },
    ];

    for (const spec of wallSpecs) {
      const geo = new THREE.PlaneGeometry(spec.w, spec.h);
      orientWallGeometryUVs(geo, spec.rot, wallSpanZ);
      const mesh = new THREE.Mesh(geo, wallMat.clone());
      mesh.position.set(...spec.pos);
      mesh.rotation.set(...spec.rot);
      mesh.receiveShadow = true;
      this.boxGroup.add(mesh);
      this.wallMeshes.push(mesh);
    }
    wallMat.dispose();
  }

  private clearItems(): void {
    for (const mesh of this.itemMeshes) {
      this.itemsGroup.remove(mesh);
    }
    this.itemMeshes = [];
    this.sharedItemGeo?.dispose();
    this.sharedItemGeo = null;
    this.sharedItemMat?.dispose();
    this.sharedItemMat = null;

    for (const slot of this.shadowSlots) {
      this.contactShadowGroup.remove(slot.mesh);
      slot.mat.dispose();
    }
    this.shadowSlots = [];
    this.sharedShadowGeo?.dispose();
    this.sharedShadowGeo = null;

    for (const slot of this.sparkleSlots) {
      this.sparklesGroup.remove(slot.sprite);
      (slot.sprite.material as THREE.Material).dispose();
    }
    this.sparkleSlots = [];
  }

  applyTheme(theme: ThemeSpec, bodyMeta: BodyMeta[]): void {
    this.currentTheme = theme;
    this.recomputeBounds();

    this.scene.background = new THREE.Color(theme.floorBaseColor).multiplyScalar(0.32);
    this.scene.environment = this.envBank.get(theme.envPreset);

    this.hemiLight.color.setHex(theme.hemiSkyColor);
    this.hemiLight.groundColor.setHex(theme.hemiGroundColor);
    this.hemiLight.intensity = theme.hemiIntensity;

    this.keyLight.color.setHex(theme.keyLightColor);
    this.keyLight.intensity = theme.keyLightIntensity;

    this.fillLight.color.setHex(theme.fillLightColor);
    this.fillLight.intensity = theme.fillLightIntensity;

    this.renderer.toneMappingExposure = theme.exposure;
    this.bloomPass.strength = theme.bloomStrength;
    this.bloomPass.radius = theme.bloomRadius;
    this.bloomPass.threshold = theme.bloomThreshold;

    this.rebuildBox();
    this.clearItems();

    const aspect = this.width / Math.max(1, this.height);
    const texSet = this.texBank.get(theme.id, aspect);
    const contactTex = this.texBank.getContactShadow();
    const fullW = (this.bounds.halfW + 0.035) * 2;
    const fullH = (this.bounds.halfH + 0.035) * 2;
    const baseSize = Math.min(fullW, fullH) * theme.sizeFactor;

    if (theme.shapeKind === 'sphere') {
      this.sharedItemGeo = new THREE.SphereGeometry(baseSize, 32, 24);
      if (theme.id === 'tennis') {
        this.sharedItemMat = new THREE.MeshPhysicalMaterial({
          map: texSet.itemMap,
          bumpMap: texSet.itemBumpMap,
          bumpScale: 0.018,
          roughness: 0.88,
          metalness: 0.0,
          sheen: 0.62,
          sheenRoughness: 0.78,
          sheenColor: new THREE.Color(0xeef88d),
          envMapIntensity: 0.72,
        });
      } else if (theme.id === 'basketball') {
        this.sharedItemMat = new THREE.MeshStandardMaterial({
          map: texSet.itemMap,
          bumpMap: texSet.itemBumpMap,
          bumpScale: 0.024,
          roughness: 0.68,
          metalness: 0.04,
          envMapIntensity: 0.78,
        });
      } else {
        this.sharedItemMat = new THREE.MeshStandardMaterial({
          map: texSet.itemMap,
          bumpMap: texSet.itemBumpMap,
          bumpScale: 0.016,
          roughness: 0.52,
          metalness: 0.04,
          envMapIntensity: 0.82,
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

    this.sharedShadowGeo = new THREE.PlaneGeometry(1, 1);

    for (const meta of bodyMeta) {
      const mesh = new THREE.Mesh(this.sharedItemGeo, this.sharedItemMat);
      mesh.scale.setScalar(meta.scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.itemsGroup.add(mesh);
      this.itemMeshes.push(mesh);

      const sMat = new THREE.MeshBasicMaterial({
        map: contactTex,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      });
      const sMesh = new THREE.Mesh(this.sharedShadowGeo, sMat);
      sMesh.position.z = -this.bounds.depth * 0.5 + 0.008;
      this.contactShadowGroup.add(sMesh);
      this.shadowSlots.push({ mesh: sMesh, mat: sMat, meta });
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

    const rotX = this.smoothTilt.y * 0.42;
    const rotY = -this.smoothTilt.x * 0.42;
    this.scene.environmentRotation.set(rotX, rotY, 0);

    this.tmpEuler.set(rotX, rotY, 0);
    this.keyLight.position.copy(this.baseKeyPos).applyEuler(this.tmpEuler);
    this.fillLight.position.copy(this.baseFillPos).applyEuler(this.tmpEuler);

    // Update grounded dynamic contact shadows on floor
    const keyDir = this.tmpVec.copy(this.keyLight.position).normalize();
    const hz = this.bounds.depth * 0.5;
    const isVault = this.currentTheme.overlayLayout === 'vault';
    const baseOpacity = isVault ? 0.42 : 0.62;

    for (let i = 0; i < Math.min(n, this.shadowSlots.length); i++) {
      const b = bodies[i];
      const slot = this.shadowSlots[i];
      const meta = slot.meta;

      const h = Math.max(0, b.position.z + hz - meta.halfExtents[2]);
      const hNorm = h / Math.max(0.45, this.bounds.depth);
      const offX = -keyDir.x * (0.03 + h * 0.24);
      const offY = -keyDir.y * (0.03 + h * 0.24);

      slot.mesh.position.set(b.position.x + offX, b.position.y + offY, -hz + 0.008);

      if (meta.kind === 'ingot') {
        this.tmpQuat.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
        const axisZ = new THREE.Vector3(0, 0, 1).applyQuaternion(this.tmpQuat);
        const angle = Math.atan2(axisZ.y, axisZ.x) - Math.PI * 0.5;
        const stretch = 1 + hNorm * 0.65;
        slot.mesh.rotation.set(0, 0, angle);
        slot.mesh.scale.set(meta.halfExtents[0] * 2.55 * stretch, meta.halfExtents[2] * 2.35 * stretch, 1);
      } else {
        const size = meta.halfExtents[0] * 2.55 * (1 + hNorm * 0.72);
        slot.mesh.rotation.set(0, 0, 0);
        slot.mesh.scale.set(size, size, 1);
      }

      slot.mat.opacity = baseOpacity * Math.exp(-hNorm * 1.85);
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
