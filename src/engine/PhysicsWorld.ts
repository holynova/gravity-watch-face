import * as CANNON from 'cannon-es';
import { CollisionHapticEvent, MotionMetrics } from '../audio/HapticsEngine';
import { ThemeSpec } from '../themes/types';

export interface BodyMeta {
  index: number;
  scale: number;
  kind: ThemeSpec['shapeKind'];
  halfExtents: [number, number, number];
}

export interface BoundsSize {
  halfW: number;
  halfH: number;
  depth: number;
}

export type CollisionCallback = (evt: CollisionHapticEvent) => void;
export type TouchNudgeCallback = () => void;

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
  private pointerActive = false;
  private lastPointerPos = new CANNON.Vec3();
  private bounds: BoundsSize;
  private lastImpactEmitMs = 0;
  private onCollision?: CollisionCallback;
  private onTouchNudge?: TouchNudgeCallback;

  constructor(
    initialBounds: BoundsSize,
    onCollision?: CollisionCallback,
    onTouchNudge?: TouchNudgeCallback,
  ) {
    this.bounds = { ...initialBounds };
    this.onCollision = onCollision;
    this.onTouchNudge = onTouchNudge;

    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -24, -7),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = false;
    (this.world.solver as CANNON.GSSolver).iterations = 10;

    this.defaultMat = new CANNON.Material('item');
    this.contactMat = new CANNON.ContactMaterial(this.defaultMat, this.defaultMat, {
      friction: 0.32,
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

    // Orient inward-facing normals
    // back: +Z (default plane faces +Z)
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

    // Kinematic touch/cursor pusher sphere
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

  spawnForTheme(theme: ThemeSpec): BodyMeta[] {
    for (const b of this.bodies) {
      this.world.removeBody(b);
    }
    this.bodies.length = 0;
    this.meta.length = 0;

    this.contactMat.friction = theme.friction;
    this.contactMat.restitution = theme.restitution;

    const fullW = this.bounds.halfW * 2;
    const fullH = this.bounds.halfH * 2;
    const refSpan = Math.min(fullW, fullH);
    const areaFactor = Math.max(0.85, Math.min(1.55, (fullW * fullH) / Math.max(0.5, refSpan * refSpan) / 1.9));
    const count = Math.round(theme.baseCount * areaFactor);
    const baseSize = refSpan * theme.sizeFactor;

    const usableW = Math.max(0.5, fullW - baseSize * 2.2);
    const usableH = Math.max(0.5, fullH - baseSize * 2.2);
    const cols = Math.max(3, Math.floor(usableW / (baseSize * 1.9)));

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jitterX = (Math.sin(i * 19.3) * 0.5) * baseSize * 0.45;
      const jitterY = (Math.cos(i * 11.7) * 0.5) * baseSize * 0.45;

      const startX = -usableW * 0.45 + ((col + 0.5) / cols) * usableW * 0.9 + jitterX;
      const startY = -usableH * 0.42 + ((row + 0.5) / Math.ceil(count / cols)) * usableH * 0.72 + jitterY;
      const startZ = ((i % 3) - 1) * Math.min(0.32, this.bounds.depth * 0.14);

      const scale =
        theme.shapeKind === 'diamond'
          ? 0.84 + ((i * 7) % 5) * 0.08
          : theme.shapeKind === 'ingot'
            ? 0.94 + (i % 3) * 0.05
            : 0.97 + (i % 3) * 0.025;

      const body = new CANNON.Body({
        mass: theme.mass * scale,
        material: this.defaultMat,
        linearDamping: theme.linearDamping,
        angularDamping: theme.angularDamping,
        position: new CANNON.Vec3(startX, startY, startZ),
      });

      let halfExtents: [number, number, number];
      if (theme.shapeKind === 'sphere') {
        const r = baseSize * scale;
        body.addShape(new CANNON.Sphere(r));
        halfExtents = [r, r, r];
      } else if (theme.shapeKind === 'diamond') {
        const r = baseSize * scale;
        // Compound two rotated boxes for crisp stable stacking & zero tunneling
        const boxA = new CANNON.Box(new CANNON.Vec3(r * 0.64, r * 0.46, r * 0.64));
        const boxB = new CANNON.Box(new CANNON.Vec3(r * 0.64, r * 0.46, r * 0.64));
        const q45 = new CANNON.Quaternion();
        q45.setFromEuler(0, Math.PI / 4, 0);
        body.addShape(boxA);
        body.addShape(boxB, new CANNON.Vec3(), q45);
        halfExtents = [r * 0.85, r * 0.75, r * 0.85];
      } else {
        // Gold ingot: width, thickness, length
        const w = baseSize * 1.18 * scale;
        const t = baseSize * 0.68 * scale;
        const l = baseSize * 2.28 * scale;
        body.addShape(new CANNON.Box(new CANNON.Vec3(w * 0.5, t * 0.5, l * 0.5)));
        halfExtents = [w * 0.5, t * 0.5, l * 0.5];
      }

      body.quaternion.setFromEuler(
        (i * 0.73) % (Math.PI * 2),
        (i * 1.37) % (Math.PI * 2),
        (i * 0.41) % (Math.PI * 2),
      );
      body.angularVelocity.set(
        Math.sin(i * 3.1) * 1.4,
        Math.cos(i * 2.7) * 1.4,
        Math.sin(i * 4.9) * 1.4,
      );

      body.addEventListener('collide', (evt: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
        if (evt.body === this.pointerBody) {
          this.onTouchNudge?.();
          return;
        }
        if (!this.onCollision) return;
        const now = performance.now();
        if (now - this.lastImpactEmitMs < 34) return;
        const impact = Math.abs(evt.contact.getImpactVelocityAlongNormal());
        if (impact > 1.25) {
          this.lastImpactEmitMs = now;
          this.onCollision({
            speed: impact,
            kind: this.wallSet.has(evt.body) ? 'wall' : 'body',
            mass: body.mass,
          });
        }
      });

      this.world.addBody(body);
      this.bodies.push(body);
      this.meta.push({
        index: i,
        scale,
        kind: theme.shapeKind,
        halfExtents,
      });
    }

    // Clamp cleanly within current box walls
    this.resizeBounds(this.bounds);
    return this.meta;
  }

  setGravity(gx: number, gy: number, gz: number): void {
    this.world.gravity.set(gx, gy, gz);
  }

  applyShakeImpulse(strength = 1.0): void {
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      const rx = (Math.random() - 0.5) * 13 * strength;
      const ry = (Math.random() - 0.35) * 14 * strength;
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

  step(dtSeconds: number): void {
    const dt = Math.min(0.05, Math.max(0.001, dtSeconds));
    this.world.step(1 / 60, dt, 4);
  }
}
