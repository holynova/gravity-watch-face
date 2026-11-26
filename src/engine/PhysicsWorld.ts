import * as CANNON from 'cannon-es';
import { CollisionHapticEvent, MotionMetrics } from '../audio/HapticsEngine';
import { FragileSpec, MaterialTag, ShardKind, ThemeId, ThemeSpec } from '../themes/types';

export type BodyRole = 'intact' | 'shard' | 'cap';

export interface BodyMeta {
  id: number;
  index: number;
  variantIndex: number;
  role: BodyRole;
  materialTag?: MaterialTag;
  shardKind?: ShardKind;
  scale: number;
  kind: ThemeSpec['shapeKind'];
  halfExtents: [number, number, number];
  cracked: boolean;
  createdAtMs: number;
  ttlMs?: number;
  squash: number;
}

export interface BoundsSize {
  halfW: number;
  halfH: number;
  depth: number;
}

export type CollisionCallback = (evt: CollisionHapticEvent) => void;
export type TouchNudgeCallback = () => void;

export interface PhysicsLifecycleCallbacks {
  onBodyAdded?: (meta: BodyMeta) => void;
  onBodyRemoved?: (id: number) => void;
  onBodyCracked?: (meta: BodyMeta) => void;
  onCrack?: (theme: ThemeId) => void;
  onBreak?: (kind: ShardKind) => void;
}

interface PendingImpact {
  bodyId: number;
  impact: number;
}

const MAX_ACTIVE_SHARDS = 28;

export class PhysicsWorld {
  readonly world: CANNON.World;
  readonly bodies: CANNON.Body[] = [];
  readonly meta: BodyMeta[] = [];

  private readonly defaultMat: CANNON.Material;
  private contactMat: CANNON.ContactMaterial;
  private readonly walls: {
    back: CANNON.Body;
    front: CANNON.Body;
    left: CANNON.Body;
    right: CANNON.Body;
    bottom: CANNON.Body;
    top: CANNON.Body;
  };

  private readonly pointerBody: CANNON.Body;
  private readonly wallSet = new Set<CANNON.Body>();
  private readonly bodyById = new Map<number, CANNON.Body>();
  private readonly metaById = new Map<number, BodyMeta>();
  private readonly pendingImpacts: PendingImpact[] = [];

  private pointerActive = false;
  private lastPointerPos = new CANNON.Vec3();
  private bounds: BoundsSize;
  private lastImpactEmitMs = 0;
  private nextBodyId = 1;
  private activeTheme: ThemeSpec | null = null;
  private targetIntactCount = 18;
  private refBaseSize = 0.35;
  private lastReplenishMs = 0;
  private spawnGraceUntilMs = 0;

  private onCollision?: CollisionCallback;
  private onTouchNudge?: TouchNudgeCallback;
  private lifecycle: PhysicsLifecycleCallbacks;

  constructor(
    initialBounds: BoundsSize,
    onCollision?: CollisionCallback,
    onTouchNudge?: TouchNudgeCallback,
    lifecycle: PhysicsLifecycleCallbacks = {},
  ) {
    this.bounds = { ...initialBounds };
    this.onCollision = onCollision;
    this.onTouchNudge = onTouchNudge;
    this.lifecycle = lifecycle;

    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -42, -6.5),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = false;
    (this.world.solver as CANNON.GSSolver).iterations = 10;

    this.defaultMat = new CANNON.Material('item');
    this.contactMat = new CANNON.ContactMaterial(this.defaultMat, this.defaultMat, {
      friction: 0.2,
      restitution: 0.42,
      contactEquationStiffness: 1e7,
      contactEquationRelaxation: 3,
    });
    this.world.addContactMaterial(this.contactMat);
    this.world.defaultContactMaterial = this.contactMat;

    const makeWall = () =>
      new CANNON.Body({
        mass: 0,
        material: this.defaultMat,
        shape: new CANNON.Plane(),
      });

    this.walls = {
      back: makeWall(),
      front: makeWall(),
      left: makeWall(),
      right: makeWall(),
      bottom: makeWall(),
      top: makeWall(),
    };

    this.walls.front.quaternion.setFromEuler(0, Math.PI, 0);
    this.walls.left.quaternion.setFromEuler(0, Math.PI / 2, 0);
    this.walls.right.quaternion.setFromEuler(0, -Math.PI / 2, 0);
    this.walls.bottom.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.walls.top.quaternion.setFromEuler(Math.PI / 2, 0, 0);

    Object.values(this.walls).forEach((w) => {
      this.wallSet.add(w);
      this.world.addBody(w);
    });
    this.applyWallPositions();

    this.pointerBody = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
      mass: 0,
      material: this.defaultMat,
      shape: new CANNON.Sphere(0.45),
      collisionResponse: false,
      position: new CANNON.Vec3(0, 0, 100),
    });
    this.world.addBody(this.pointerBody);
  }

  private applyWallPositions(): void {
    const { halfW, halfH, depth } = this.bounds;
    const hz = depth * 0.5;
    this.walls.back.position.set(0, 0, -hz);
    this.walls.front.position.set(0, 0, hz);
    this.walls.left.position.set(-halfW, 0, 0);
    this.walls.right.position.set(halfW, 0, 0);
    this.walls.bottom.position.set(0, -halfH, 0);
    this.walls.top.position.set(0, halfH, 0);
  }

  resizeBounds(next: BoundsSize): void {
    this.bounds = { ...next };
    this.applyWallPositions();

    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      const m = this.meta[i];
      const padX = m.halfExtents[0];
      const padY = m.halfExtents[1];
      const padZ = m.halfExtents[2];
      const maxX = Math.max(0.05, this.bounds.halfW - padX);
      const maxY = Math.max(0.05, this.bounds.halfH - padY);
      const maxZ = Math.max(0.05, this.bounds.depth * 0.5 - padZ);
      b.position.x = Math.max(-maxX, Math.min(maxX, b.position.x));
      b.position.y = Math.max(-maxY, Math.min(maxY, b.position.y));
      b.position.z = Math.max(-maxZ, Math.min(maxZ, b.position.z));
    }
  }

  private registerBody(body: CANNON.Body, meta: BodyMeta): void {
    this.world.addBody(body);
    this.bodies.push(body);
    this.meta.push(meta);
    this.bodyById.set(meta.id, body);
    this.metaById.set(meta.id, meta);

    body.addEventListener('collide', (evt: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
      if (evt.body === this.pointerBody) {
        this.onTouchNudge?.();
        return;
      }

      const impact = Math.abs(evt.contact.getImpactVelocityAlongNormal());
      if (this.activeTheme?.squashStretch && meta.role === 'intact' && impact > 1.0) {
        meta.squash = Math.min(1.0, Math.max(meta.squash, impact / 12.0));
      }

      if (this.activeTheme?.fragile && meta.role === 'intact' && performance.now() >= this.spawnGraceUntilMs) {
        const minTrigger = this.activeTheme.fragile.crackSpeed ?? this.activeTheme.fragile.breakSpeed;
        if (impact >= minTrigger) {
          this.pendingImpacts.push({ bodyId: meta.id, impact });
        }
      }

      if (!this.onCollision) return;
      const now = performance.now();
      if (now - this.lastImpactEmitMs < 34) return;
      if (impact > 1.25) {
        this.lastImpactEmitMs = now;
        this.onCollision({
          speed: impact,
          kind: this.wallSet.has(evt.body) ? 'wall' : 'body',
          mass: body.mass,
          materialTag: meta.materialTag,
        });
      }
    });
  }

  private removeBodyById(id: number): boolean {
    const idx = this.meta.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    const body = this.bodies[idx];
    this.world.removeBody(body);
    this.bodies.splice(idx, 1);
    this.meta.splice(idx, 1);
    this.bodyById.delete(id);
    this.metaById.delete(id);
    this.lifecycle.onBodyRemoved?.(id);
    return true;
  }

  private createIntactItem(
    theme: ThemeSpec,
    index: number,
    baseSize: number,
    posX: number,
    posY: number,
    posZ: number,
  ): BodyMeta {
    let scale = 1;
    let massMul = 1;
    let materialTag: MaterialTag | undefined;
    let bodyMass = theme.mass;
    let linDamp = theme.linearDamping;
    let angDamp = theme.angularDamping;

    if (theme.id === 'paper' || theme.id === 'wood' || theme.id === 'stone') {
      materialTag = theme.id;
    } else if (theme.id === 'trio') {
      const order: MaterialTag[] = ['paper', 'wood', 'stone'];
      materialTag = order[index % 3];
      if (materialTag === 'paper') {
        bodyMass = 0.14;
        linDamp = 0.14;
        angDamp = 0.18;
      } else if (materialTag === 'wood') {
        bodyMass = 0.78;
        linDamp = 0.022;
        angDamp = 0.045;
      } else {
        bodyMass = 3.4;
        linDamp = 0.018;
        angDamp = 0.05;
      }
    }

    if (theme.id === 'bearings') {
      const isLarge = index % 4 === 0;
      scale = isLarge ? 1.26 : 0.68;
      massMul = isLarge ? 2.1 : 0.48;
    } else if (theme.shapeKind === 'diamond') {
      scale = 0.84 + ((index * 7) % 5) * 0.08;
      massMul = scale;
    } else if (theme.shapeKind === 'ingot') {
      scale = 0.94 + (index % 3) * 0.05;
      massMul = scale;
    } else {
      scale = 0.97 + (index % 3) * 0.025;
      massMul = scale;
    }

    const body = new CANNON.Body({
      mass: bodyMass * massMul,
      material: this.defaultMat,
      linearDamping: linDamp,
      angularDamping: angDamp,
      position: new CANNON.Vec3(posX, posY, posZ),
    });

    let halfExtents: [number, number, number];
    const r = baseSize * scale;

    if (theme.shapeKind === 'diamond') {
      const boxA = new CANNON.Box(new CANNON.Vec3(r * 0.64, r * 0.46, r * 0.64));
      const boxB = new CANNON.Box(new CANNON.Vec3(r * 0.64, r * 0.46, r * 0.64));
      const q45 = new CANNON.Quaternion();
      q45.setFromEuler(0, Math.PI / 4, 0);
      body.addShape(boxA);
      body.addShape(boxB, new CANNON.Vec3(), q45);
      halfExtents = [r * 0.85, r * 0.75, r * 0.85];
    } else if (theme.shapeKind === 'ingot') {
      const w = r * 1.18;
      const t = r * 0.68;
      const l = r * 2.28;
      body.addShape(new CANNON.Box(new CANNON.Vec3(w * 0.5, t * 0.5, l * 0.5)));
      halfExtents = [w * 0.5, t * 0.5, l * 0.5];
    } else if (theme.shapeKind === 'dice') {
      const edge = r * 1.66;
      const he = edge * 0.5;
      body.addShape(new CANNON.Box(new CANNON.Vec3(he, he, he)));
      halfExtents = [he, he, he];
    } else if (theme.shapeKind === 'ice') {
      const edge = r * 1.72;
      const hx = edge * 0.5;
      const hy = edge * 0.46;
      const hz = edge * 0.5;
      body.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)));
      halfExtents = [hx, hy, hz];
    } else if (theme.shapeKind === 'bulb') {
      body.addShape(new CANNON.Sphere(r * 0.92), new CANNON.Vec3(0, r * 0.24, 0));
      body.addShape(new CANNON.Sphere(r * 0.46), new CANNON.Vec3(0, -r * 0.82, 0));
      halfExtents = [r * 0.92, r * 1.18, r * 0.92];
    } else if (theme.shapeKind === 'balloon') {
      body.addShape(new CANNON.Sphere(r * 0.95), new CANNON.Vec3(0, r * 0.14, 0));
      body.addShape(new CANNON.Sphere(r * 0.46), new CANNON.Vec3(0, -r * 0.58, 0));
      halfExtents = [r * 0.95, r * 1.12, r * 0.95];
    } else {
      body.addShape(new CANNON.Sphere(r));
      halfExtents = [r, r, r];
    }

    body.quaternion.setFromEuler(
      (index * 0.73) % (Math.PI * 2),
      (index * 1.37) % (Math.PI * 2),
      (index * 0.41) % (Math.PI * 2),
    );
    body.angularVelocity.set(
      Math.sin(index * 3.1) * 1.4,
      Math.cos(index * 2.7) * 1.4,
      Math.sin(index * 4.9) * 1.4,
    );

    const variantCount = theme.variantCount ?? 1;
    const meta: BodyMeta = {
      id: this.nextBodyId++,
      index,
      variantIndex: index % variantCount,
      role: 'intact',
      materialTag,
      scale,
      kind: theme.shapeKind,
      halfExtents,
      cracked: false,
      createdAtMs: performance.now(),
      squash: 0,
    };

    this.registerBody(body, meta);
    return meta;
  }

  spawnForTheme(theme: ThemeSpec): BodyMeta[] {
    for (const b of this.bodies) {
      this.world.removeBody(b);
    }
    this.bodies.length = 0;
    this.meta.length = 0;
    this.bodyById.clear();
    this.metaById.clear();
    this.pendingImpacts.length = 0;

    this.activeTheme = theme;
    this.contactMat.friction = theme.friction;
    this.contactMat.restitution = theme.restitution;

    const fullW = this.bounds.halfW * 2;
    const fullH = this.bounds.halfH * 2;
    const refSpan = Math.min(fullW, fullH);
    const areaFactor = Math.max(0.85, Math.min(1.55, (fullW * fullH) / Math.max(0.5, refSpan * refSpan) / 1.9));
    const count = Math.round(theme.baseCount * areaFactor);
    const baseSize = refSpan * theme.sizeFactor;

    this.targetIntactCount = count;
    this.refBaseSize = baseSize;
    this.lastReplenishMs = performance.now();
    this.spawnGraceUntilMs = this.lastReplenishMs + 1100;

    const usableW = Math.max(0.5, fullW - baseSize * 2.2);
    const usableH = Math.max(0.5, fullH - baseSize * 2.2);
    const cols = Math.max(3, Math.floor(usableW / (baseSize * 1.95)));
    const buoyant = (theme.gravityMultiplier ?? 1) < 0;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jitterX = Math.sin(i * 19.3) * 0.5 * baseSize * 0.45;
      const jitterY = Math.cos(i * 11.7) * 0.5 * baseSize * 0.45;

      const startX = -usableW * 0.45 + ((col + 0.5) / cols) * usableW * 0.9 + jitterX;
      const baseRowY = -usableH * 0.42 + ((row + 0.5) / Math.ceil(count / cols)) * usableH * 0.72;
      const startY = (buoyant ? -baseRowY : baseRowY) + jitterY;
      const startZ = ((i % 3) - 1) * Math.min(0.32, this.bounds.depth * 0.14);

      this.createIntactItem(theme, i, baseSize, startX, startY, startZ);
    }

    this.resizeBounds(this.bounds);
    return this.meta;
  }

  private trimShardsForCapacity(needed: number): void {
    const shards = this.meta.filter((m) => m.role !== 'intact');
    const excess = shards.length + needed - MAX_ACTIVE_SHARDS;
    if (excess <= 0) return;
    shards.sort((a, b) => a.createdAtMs - b.createdAtMs);
    for (let i = 0; i < Math.min(excess, shards.length); i++) {
      this.removeBodyById(shards[i].id);
    }
  }

  private shatterBody(targetId: number, fragile: FragileSpec): void {
    const body = this.bodyById.get(targetId);
    const meta = this.metaById.get(targetId);
    if (!body || !meta || meta.role !== 'intact' || !this.activeTheme) return;

    const theme = this.activeTheme;
    const pos = body.position.clone();
    const vel = body.velocity.clone();
    const q = body.quaternion.clone();
    const variantIndex = meta.variantIndex;
    const scale = meta.scale;
    const r = this.refBaseSize * scale;

    this.removeBodyById(targetId);
    this.trimShardsForCapacity(fragile.shardCount + (fragile.keepCap ? 1 : 0));

    const nowMs = performance.now();

    // Preserve intact E27 brass screw cap rolling freely after bulb glass breaks
    if (fragile.keepCap) {
      const capOffset = new CANNON.Vec3(0, -r * 0.82, 0);
      q.vmult(capOffset, capOffset);
      const capBody = new CANNON.Body({
        mass: theme.mass * 0.45,
        material: this.defaultMat,
        linearDamping: 0.04,
        angularDamping: 0.08,
        position: new CANNON.Vec3(pos.x + capOffset.x, pos.y + capOffset.y, pos.z + capOffset.z),
      });
      capBody.addShape(new CANNON.Sphere(r * 0.44));
      capBody.quaternion.copy(q);
      capBody.velocity.set(
        vel.x * 0.55 + (Math.random() - 0.5) * 4,
        vel.y * 0.55 + (Math.random() - 0.5) * 4,
        vel.z * 0.4 + Math.random() * 2,
      );
      capBody.angularVelocity.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
      );

      const capMeta: BodyMeta = {
        id: this.nextBodyId++,
        index: meta.index,
        variantIndex,
        role: 'cap',
        scale,
        kind: theme.shapeKind,
        halfExtents: [r * 0.44, r * 0.44, r * 0.44],
        cracked: false,
        createdAtMs: nowMs,
        ttlMs: 6500,
        squash: 0,
      };
      this.registerBody(capBody, capMeta);
      this.lifecycle.onBodyAdded?.(capMeta);
    }

    const ttlMs = fragile.shardKind === 'confetti' ? 3200 : 4800;
    for (let s = 0; s < fragile.shardCount; s++) {
      const ang = (s / fragile.shardCount) * Math.PI * 2 + Math.random() * 0.6;
      const radial = r * (0.28 + Math.random() * 0.35);
      const shardR = r * (fragile.shardKind === 'confetti' ? 0.36 : 0.44);
      const shardScale = scale * (0.75 + Math.random() * 0.45);

      const sBody = new CANNON.Body({
        mass: theme.mass * (fragile.shardKind === 'confetti' ? 0.06 : 0.14),
        material: this.defaultMat,
        linearDamping: fragile.shardKind === 'confetti' ? 0.18 : 0.03,
        angularDamping: fragile.shardKind === 'confetti' ? 0.12 : 0.04,
        position: new CANNON.Vec3(
          pos.x + Math.cos(ang) * radial,
          pos.y + Math.sin(ang) * radial,
          pos.z + (Math.random() - 0.5) * r * 0.4,
        ),
      });
      sBody.addShape(new CANNON.Sphere(shardR));
      const burst = fragile.shardKind === 'confetti' ? 6.5 : 5.2;
      sBody.velocity.set(
        vel.x * 0.35 + Math.cos(ang) * (burst + Math.random() * 3.5),
        vel.y * 0.35 + Math.sin(ang) * (burst + Math.random() * 3.5),
        vel.z * 0.25 + (Math.random() * 3.2 - 0.8),
      );
      sBody.angularVelocity.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
      );

      const sMeta: BodyMeta = {
        id: this.nextBodyId++,
        index: meta.index,
        variantIndex: fragile.shardKind === 'confetti' ? s % 5 : variantIndex,
        role: 'shard',
        shardKind: fragile.shardKind,
        scale: shardScale,
        kind: theme.shapeKind,
        halfExtents: [shardR, shardR, shardR],
        cracked: false,
        createdAtMs: nowMs,
        ttlMs,
        squash: 0,
      };
      this.registerBody(sBody, sMeta);
      this.lifecycle.onBodyAdded?.(sMeta);
    }

    this.resizeBounds(this.bounds);
    this.lifecycle.onBreak?.(fragile.shardKind);
  }

  private processPendingEvents(nowMs: number): void {
    const theme = this.activeTheme;
    const fragile = theme?.fragile;

    if (fragile && theme && this.pendingImpacts.length > 0) {
      // Deduplicate strongest impact per body in this frame
      const maxByBody = new Map<number, number>();
      for (const item of this.pendingImpacts) {
        const prev = maxByBody.get(item.bodyId) ?? 0;
        if (item.impact > prev) maxByBody.set(item.bodyId, item.impact);
      }
      this.pendingImpacts.length = 0;

      let breaksThisStep = 0;
      for (const [bodyId, impact] of maxByBody) {
        if (breaksThisStep >= 3) break;
        const m = this.metaById.get(bodyId);
        if (!m || m.role !== 'intact') continue;

        if (fragile.mode === 'crackle') {
          if (impact >= fragile.breakSpeed) {
            this.shatterBody(bodyId, fragile);
            breaksThisStep += 1;
          } else if (!m.cracked && impact >= (fragile.crackSpeed ?? 7.0)) {
            m.cracked = true;
            this.lifecycle.onBodyCracked?.(m);
            this.lifecycle.onCrack?.(theme.id);
          }
        } else if (impact >= fragile.breakSpeed) {
          this.shatterBody(bodyId, fragile);
          breaksThisStep += 1;
        }
      }
    } else {
      this.pendingImpacts.length = 0;
    }

    // Expire old debris shards smoothly
    const expiredIds: number[] = [];
    for (const m of this.meta) {
      if (m.ttlMs !== undefined && nowMs - m.createdAtMs >= m.ttlMs) {
        expiredIds.push(m.id);
      }
    }
    for (const id of expiredIds) {
      this.removeBodyById(id);
    }

    // Gentle auto-replenishment when intact items drop below 55%
    if (theme && theme.fragile) {
      let intactCount = 0;
      for (const m of this.meta) {
        if (m.role === 'intact') intactCount += 1;
      }
      const minIntact = Math.max(4, Math.floor(this.targetIntactCount * 0.55));
      if (intactCount < minIntact && nowMs - this.lastReplenishMs > 900) {
        this.lastReplenishMs = nowMs;
        const buoyant = (theme.gravityMultiplier ?? 1) < 0;
        const rx = (Math.random() - 0.5) * this.bounds.halfW * 1.1;
        const ry = buoyant ? -this.bounds.halfH * 0.65 : this.bounds.halfH * 0.55;
        const rz = this.bounds.depth * 0.16;
        const fresh = this.createIntactItem(theme, this.nextBodyId, this.refBaseSize, rx, ry, rz);
        this.resizeBounds(this.bounds);
        this.lifecycle.onBodyAdded?.(fresh);
      }
    }
  }

  pokeAt(worldX: number, worldY: number): boolean {
    const theme = this.activeTheme;
    if (!theme?.fragile) return false;

    let bestId = -1;
    let bestDist = Infinity;
    for (let i = 0; i < this.bodies.length; i++) {
      const m = this.meta[i];
      if (m.role !== 'intact') continue;
      const b = this.bodies[i];
      const d = Math.hypot(b.position.x - worldX, b.position.y - worldY);
      const hitR = Math.max(m.halfExtents[0], m.halfExtents[1]) * 1.45;
      if (d < hitR && d < bestDist) {
        bestDist = d;
        bestId = m.id;
      }
    }

    if (bestId === -1) return false;

    const hitMeta = this.metaById.get(bestId);
    if (!hitMeta) return false;

    if (theme.fragile.mode === 'crackle' && !hitMeta.cracked) {
      hitMeta.cracked = true;
      this.lifecycle.onBodyCracked?.(hitMeta);
      this.lifecycle.onCrack?.(theme.id);
      return true;
    }

    this.shatterBody(bestId, theme.fragile);
    return true;
  }

  triggerBreakDemo(maxCount = 2): number {
    const fragile = this.activeTheme?.fragile;
    if (!fragile) return 0;
    const candidates = this.meta.filter((m) => m.role === 'intact');
    let count = 0;
    for (let i = 0; i < Math.min(maxCount, candidates.length); i++) {
      this.shatterBody(candidates[i].id, fragile);
      count += 1;
    }
    return count;
  }

  setGravity(gx: number, gy: number, gz: number): void {
    const mult = this.activeTheme?.gravityMultiplier ?? 1;
    const zScale = this.activeTheme?.zGravityScale ?? 1;
    this.world.gravity.set(gx * mult, gy * mult, gz * zScale);
  }

  applyShakeImpulse(strength = 1.0): void {
    const mult = Math.abs(this.activeTheme?.gravityMultiplier ?? 1);
    const scale = 0.65 + mult * 0.35;
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      const rx = (Math.random() - 0.5) * 14 * strength * scale;
      const ry = (Math.random() - 0.35) * 15 * strength * scale;
      const rz = (Math.random() * 5.5 + 2.0) * strength;
      b.velocity.x += rx;
      b.velocity.y += ry;
      b.velocity.z += rz;
      b.angularVelocity.x += (Math.random() - 0.5) * 12 * strength;
      b.angularVelocity.y += (Math.random() - 0.5) * 12 * strength;
      b.angularVelocity.z += (Math.random() - 0.5) * 12 * strength;
    }
  }

  setPointerPusher(active: boolean, x = 0, y = 0, z = 0): void {
    if (!active) {
      this.pointerActive = false;
      this.pointerBody.collisionResponse = false;
      this.pointerBody.velocity.set(0, 0, 0);
      this.pointerBody.position.set(0, 0, 100);
      return;
    }

    const nextPos = new CANNON.Vec3(x, y, z);
    if (!this.pointerActive) {
      this.pointerActive = true;
      this.pointerBody.collisionResponse = true;
      this.pointerBody.position.copy(nextPos);
      this.pointerBody.velocity.set(0, 0, 0);
    } else {
      const vx = Math.max(-22, Math.min(22, (nextPos.x - this.lastPointerPos.x) * 45));
      const vy = Math.max(-22, Math.min(22, (nextPos.y - this.lastPointerPos.y) * 45));
      this.pointerBody.position.copy(nextPos);
      this.pointerBody.velocity.set(vx, vy, 0);
    }
    this.lastPointerPos.copy(nextPos);
  }

  getMotionMetrics(): MotionMetrics {
    let sum = 0;
    let maxSpeed = 0;
    let movingCount = 0;
    for (let i = 0; i < this.bodies.length; i++) {
      const sp = this.bodies[i].velocity.length();
      if (sp > 0.35) {
        sum += sp;
        movingCount += 1;
        if (sp > maxSpeed) maxSpeed = sp;
      }
    }
    return {
      avgSpeed: movingCount > 0 ? sum / movingCount : 0,
      maxSpeed,
      movingCount,
    };
  }

  getRoleCounts(): { intact: number; shards: number; cracked: number } {
    let intact = 0;
    let shards = 0;
    let cracked = 0;
    for (const m of this.meta) {
      if (m.role === 'intact') {
        intact += 1;
        if (m.cracked) cracked += 1;
      } else {
        shards += 1;
      }
    }
    return { intact, shards, cracked };
  }

  step(dtSeconds: number): void {
    const dt = Math.min(0.05, Math.max(0.001, dtSeconds));
    const decay = Math.exp(-10 * dt);
    for (const m of this.meta) {
      if (m.squash > 0.001) m.squash *= decay;
      else m.squash = 0;
    }
    this.world.step(1 / 90, dt, 6);
    this.processPendingEvents(performance.now());
  }
}
