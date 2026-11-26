import * as THREE from 'three';

type Vec3Tuple = [number, number, number];

function pushOutwardTri(
  positions: number[],
  uvs: number[],
  a: Vec3Tuple,
  b: Vec3Tuple,
  c: Vec3Tuple,
  uvA: [number, number] = [0, 0],
  uvB: [number, number] = [1, 0],
  uvC: [number, number] = [0.5, 1],
): void {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const abz = b[2] - a[2];
  const acx = c[0] - a[0];
  const acy = c[1] - a[1];
  const acz = c[2] - a[2];

  const nx = aby * acz - abz * acy;
  const ny = abz * acx - abx * acz;
  const nz = abx * acy - aby * acx;

  const cx = (a[0] + b[0] + c[0]) / 3;
  const cy = (a[1] + b[1] + c[1]) / 3;
  const cz = (a[2] + b[2] + c[2]) / 3;

  const dot = nx * cx + ny * cy + nz * cz;
  if (dot >= 0) {
    positions.push(...a, ...b, ...c);
    uvs.push(...uvA, ...uvB, ...uvC);
  } else {
    positions.push(...a, ...c, ...b);
    uvs.push(...uvA, ...uvC, ...uvB);
  }
}

/**
 * Builds a crisp, faceted 16-sided brilliant-cut diamond geometry
 * with flat table, star & bezel crown facets, thin girdle, and pointed pavilion culet.
 */
export function createBrilliantDiamondGeometry(radius: number): THREE.BufferGeometry {
  const segments = 16;
  const step = (Math.PI * 2) / segments;

  const tableCenter: Vec3Tuple = [0, 0.42 * radius, 0];
  const culet: Vec3Tuple = [0, -0.82 * radius, 0];

  const tableRing: Vec3Tuple[] = [];
  const crownMidRing: Vec3Tuple[] = [];
  const girdleTopRing: Vec3Tuple[] = [];
  const girdleBotRing: Vec3Tuple[] = [];
  const pavilionMidRing: Vec3Tuple[] = [];

  for (let i = 0; i < segments; i++) {
    const a = i * step;
    const aMid = (i + 0.5) * step;

    tableRing.push([0.56 * radius * Math.cos(a), 0.42 * radius, 0.56 * radius * Math.sin(a)]);
    crownMidRing.push([0.8 * radius * Math.cos(aMid), 0.25 * radius, 0.8 * radius * Math.sin(aMid)]);
    girdleTopRing.push([1.0 * radius * Math.cos(a), 0.055 * radius, 1.0 * radius * Math.sin(a)]);
    girdleBotRing.push([1.0 * radius * Math.cos(a), -0.025 * radius, 1.0 * radius * Math.sin(a)]);
    pavilionMidRing.push([0.54 * radius * Math.cos(aMid), -0.38 * radius, 0.54 * radius * Math.sin(aMid)]);
  }

  const positions: number[] = [];
  const uvs: number[] = [];

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const prev = (i - 1 + segments) % segments;

    // Flat octagonal/16-sided table
    pushOutwardTri(positions, uvs, tableCenter, tableRing[i], tableRing[next]);

    // Crown star & kite bezel facets
    pushOutwardTri(positions, uvs, tableRing[i], tableRing[next], crownMidRing[i]);
    pushOutwardTri(positions, uvs, crownMidRing[prev], tableRing[i], girdleTopRing[i]);
    pushOutwardTri(positions, uvs, tableRing[i], crownMidRing[i], girdleTopRing[i]);
    pushOutwardTri(positions, uvs, crownMidRing[i], girdleTopRing[i], girdleTopRing[next]);

    // Thin faceted girdle
    pushOutwardTri(positions, uvs, girdleTopRing[i], girdleTopRing[next], girdleBotRing[next]);
    pushOutwardTri(positions, uvs, girdleTopRing[i], girdleBotRing[next], girdleBotRing[i]);

    // Pavilion upper & lower main facets
    pushOutwardTri(positions, uvs, girdleBotRing[i], girdleBotRing[next], pavilionMidRing[i]);
    pushOutwardTri(positions, uvs, pavilionMidRing[prev], girdleBotRing[i], culet);
    pushOutwardTri(positions, uvs, girdleBotRing[i], pavilionMidRing[i], culet);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Builds a chamfered trapezoidal 24K gold ingot aligned with Cannon Box(W/2, T/2, L/2).
 * Top plateau UVs cover [0.16..0.84, 0.08..0.92] where the bullion hallmark resides;
 * sides and bottom map onto the clean brushed-metal band at u in [0.01..0.11].
 */
export function createGoldIngotGeometry(
  width: number,
  thickness: number,
  length: number,
): THREE.BufferGeometry {
  const hw = width * 0.5;
  const ht = thickness * 0.5;
  const hl = length * 0.5;

  const shoulderY = ht * 0.72;
  const topY = ht;
  const botY = -ht;

  const sW = hw * 0.85;
  const sL = hl * 0.9;
  const tW = hw * 0.76;
  const tL = hl * 0.84;

  // 4 corners in XZ: (-X,-Z)=0, (+X,-Z)=1, (+X,+Z)=2, (-X,+Z)=3
  const bot: Vec3Tuple[] = [
    [-hw, botY, -hl],
    [hw, botY, -hl],
    [hw, botY, hl],
    [-hw, botY, hl],
  ];
  const shoulder: Vec3Tuple[] = [
    [-sW, shoulderY, -sL],
    [sW, shoulderY, -sL],
    [sW, shoulderY, sL],
    [-sW, shoulderY, sL],
  ];
  const top: Vec3Tuple[] = [
    [-tW, topY, -tL],
    [tW, topY, -tL],
    [tW, topY, tL],
    [-tW, topY, tL],
  ];

  const positions: number[] = [];
  const uvs: number[] = [];

  const pushQuad = (
    p0: Vec3Tuple,
    p1: Vec3Tuple,
    p2: Vec3Tuple,
    p3: Vec3Tuple,
    uv0: [number, number],
    uv1: [number, number],
    uv2: [number, number],
    uv3: [number, number],
  ) => {
    pushOutwardTri(positions, uvs, p0, p1, p2, uv0, uv1, uv2);
    pushOutwardTri(positions, uvs, p0, p2, p3, uv0, uv2, uv3);
  };

  // Top plateau mapped directly to the hallmark zone of the gold texture
  pushQuad(
    top[0],
    top[1],
    top[2],
    top[3],
    [0.16, 0.92],
    [0.84, 0.92],
    [0.84, 0.08],
    [0.16, 0.08],
  );

  // Bottom face mapped to clean brushed strip
  pushQuad(
    bot[0],
    bot[3],
    bot[2],
    bot[1],
    [0.01, 0.95],
    [0.01, 0.05],
    [0.11, 0.05],
    [0.11, 0.95],
  );

  // Tapered side walls + top 45-deg chamfered rim
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    pushQuad(
      bot[i],
      bot[next],
      shoulder[next],
      shoulder[i],
      [0.01, 0.05],
      [0.11, 0.05],
      [0.11, 0.95],
      [0.01, 0.95],
    );
    pushQuad(
      shoulder[i],
      shoulder[next],
      top[next],
      top[i],
      [0.01, 0.05],
      [0.11, 0.05],
      [0.11, 0.95],
      [0.01, 0.95],
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Builds pear glass bulb, ridged E27 brass screw cap, and hairpin tungsten filament
 * centered near origin so physics center-of-mass sits inside the bulb belly.
 */
export function createEdisonBulbParts(radius: number): {
  glassGeo: THREE.BufferGeometry;
  capGeo: THREE.BufferGeometry;
  filamentGeo: THREE.BufferGeometry;
} {
  // Glass pear envelope from neck (-0.62r) up to spherical dome (+1.18r)
  const glassProfile: THREE.Vector2[] = [];
  const neckSteps = 10;
  for (let i = 0; i <= neckSteps; i++) {
    const t = i / neckSteps;
    const y = -0.62 * radius + t * 0.92 * radius;
    const r = radius * (0.48 + 0.45 * Math.sin(t * Math.PI * 0.5));
    glassProfile.push(new THREE.Vector2(r, y));
  }
  const domeSteps = 16;
  const domeCy = 0.3 * radius;
  const domeRx = 0.93 * radius;
  const domeRy = 0.88 * radius;
  for (let i = 1; i <= domeSteps; i++) {
    const angle = (i / domeSteps) * (Math.PI * 0.5);
    const r = Math.max(0, domeRx * Math.cos(angle));
    const y = domeCy + domeRy * Math.sin(angle);
    glassProfile.push(new THREE.Vector2(r, y));
  }
  const glassGeo = new THREE.LatheGeometry(glassProfile, 28);
  glassGeo.computeVertexNormals();
  glassGeo.computeBoundingSphere();

  // E27 ridged brass screw cap (-0.60r down to -1.24r)
  const capProfile: THREE.Vector2[] = [new THREE.Vector2(radius * 0.49, -0.58 * radius)];
  const threadSteps = 18;
  for (let i = 0; i <= threadSteps; i++) {
    const t = i / threadSteps;
    const y = -0.58 * radius - t * 0.5 * radius;
    const ridge = Math.sin(t * Math.PI * 6) * 0.038 * radius;
    const taper = 0.47 - t * 0.05;
    capProfile.push(new THREE.Vector2(radius * taper + ridge, y));
  }
  capProfile.push(new THREE.Vector2(radius * 0.3, -1.14 * radius));
  capProfile.push(new THREE.Vector2(radius * 0.14, -1.24 * radius));
  capProfile.push(new THREE.Vector2(0, -1.25 * radius));

  const capGeo = new THREE.LatheGeometry(capProfile, 24);
  capGeo.computeVertexNormals();
  capGeo.computeBoundingSphere();

  // Inner warm tungsten zig-zag hairpin filament
  const pts: THREE.Vector3[] = [
    new THREE.Vector3(-radius * 0.14, -0.45 * radius, 0),
    new THREE.Vector3(-radius * 0.22, 0.12 * radius, 0),
    new THREE.Vector3(-radius * 0.14, 0.36 * radius, radius * 0.08),
    new THREE.Vector3(-radius * 0.05, 0.46 * radius, -radius * 0.06),
    new THREE.Vector3(radius * 0.05, 0.36 * radius, radius * 0.08),
    new THREE.Vector3(radius * 0.14, 0.46 * radius, -radius * 0.06),
    new THREE.Vector3(radius * 0.22, 0.12 * radius, 0),
    new THREE.Vector3(radius * 0.14, -0.45 * radius, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(pts);
  const filamentGeo = new THREE.TubeGeometry(curve, 32, Math.max(0.01, radius * 0.042), 8, false);
  filamentGeo.computeBoundingSphere();

  return { glassGeo, capGeo, filamentGeo };
}

/**
 * Builds a soft teardrop latex helium balloon body + tied knot and curly ribbon tail.
 */
export function createBalloonParts(radius: number): {
  bodyGeo: THREE.BufferGeometry;
  tailGeo: THREE.BufferGeometry;
} {
  const profile: THREE.Vector2[] = [];
  // Rubber tie lip + pinched knot (-1.14r to -0.98r)
  profile.push(new THREE.Vector2(radius * 0.12, -1.14 * radius));
  profile.push(new THREE.Vector2(radius * 0.05, -1.06 * radius));
  profile.push(new THREE.Vector2(radius * 0.08, -0.98 * radius));

  // Smooth parametric teardrop dome without sharp top/bottom pinch
  const bodySteps = 24;
  for (let i = 0; i <= bodySteps; i++) {
    const u = i / bodySteps;
    const theta = u * Math.PI;
    const y = -0.98 * radius + (1 - Math.cos(theta)) * 1.06 * radius;
    const pear = 0.68 + 0.38 * Math.sin(u * Math.PI * 0.72);
    const r = i === 0 ? radius * 0.08 : i === bodySteps ? 0 : Math.max(0, radius * Math.sin(theta) * pear);
    profile.push(new THREE.Vector2(r, y));
  }
  const bodyGeo = new THREE.LatheGeometry(profile, 32);
  bodyGeo.computeVertexNormals();
  bodyGeo.computeBoundingSphere();

  const ribbonPts = [
    new THREE.Vector3(0, -1.1 * radius, 0),
    new THREE.Vector3(radius * 0.09, -1.36 * radius, radius * 0.05),
    new THREE.Vector3(-radius * 0.11, -1.66 * radius, -radius * 0.04),
    new THREE.Vector3(radius * 0.08, -1.96 * radius, radius * 0.04),
    new THREE.Vector3(-radius * 0.04, -2.24 * radius, -radius * 0.02),
  ];
  const ribbonCurve = new THREE.CatmullRomCurve3(ribbonPts);
  const tailGeo = new THREE.TubeGeometry(ribbonCurve, 20, Math.max(0.008, radius * 0.032), 6, false);
  tailGeo.computeBoundingSphere();

  return { bodyGeo, tailGeo };
}

/**
 * Builds a C1-smooth chamfered casino die preserving 6 face material groups (+X,-X,+Y,-Y,+Z,-Z)
 * with continuous Minkowski bevels across edges and corners.
 */
export function createCasinoDiceGeometry(edge: number): THREE.BufferGeometry {
  const segs = 6;
  const geo = new THREE.BoxGeometry(edge, edge, edge, segs, segs, segs);
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const half = edge * 0.5;
  const bevel = edge * 0.17;
  const inner = Math.max(0.001, half - bevel);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const cx = Math.max(-inner, Math.min(inner, x));
    const cy = Math.max(-inner, Math.min(inner, y));
    const cz = Math.max(-inner, Math.min(inner, z));

    const dx = x - cx;
    const dy = y - cy;
    const dz = z - cz;
    const len = Math.hypot(dx, dy, dz) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const nz = dz / len;

    pos.setXYZ(i, cx + nx * bevel, cy + ny * bevel, cz + nz * bevel);
    norm.setXYZ(i, nx, ny, nz);
  }

  pos.needsUpdate = true;
  norm.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Builds a rounded, organically undulating crystal cocktail ice cube.
 */
export function createIceCubeGeometry(edge: number): THREE.BufferGeometry {
  const segs = 6;
  const geo = new THREE.BoxGeometry(edge, edge * 0.92, edge, segs, segs, segs);
  const pos = geo.attributes.position;
  const hx = edge * 0.5;
  const hy = edge * 0.46;
  const hz = edge * 0.5;
  const bevel = edge * 0.2;
  const ix = hx - bevel;
  const iy = hy - bevel;
  const iz = hz - bevel;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const cx = Math.max(-ix, Math.min(ix, x));
    const cy = Math.max(-iy, Math.min(iy, y));
    const cz = Math.max(-iz, Math.min(iz, z));

    const dx = x - cx;
    const dy = y - cy;
    const dz = z - cz;
    const len = Math.hypot(dx, dy, dz) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const nz = dz / len;

    const melt = Math.sin((x + y) * 14) * Math.cos((y - z) * 12) * edge * 0.025;
    const r = bevel + melt;
    pos.setXYZ(i, cx + nx * r, cy + ny * r, cz + nz * r);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Builds faceted 3D shard geometry for broken glass/ice/ceramic or curled confetti ribbons.
 */
export function createShardGeometry(
  radius: number,
  kind: 'glass' | 'ice' | 'ceramic' | 'confetti',
): THREE.BufferGeometry {
  if (kind === 'confetti') {
    const geo = new THREE.PlaneGeometry(radius * 0.52, radius * 0.28, 3, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin((x / Math.max(0.001, radius)) * 8) * radius * 0.08);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }

  if (kind === 'ice') {
    const geo = new THREE.OctahedronGeometry(radius * 0.52, 0);
    geo.scale(1.18, 0.72, 0.94);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }

  // Thin crisp 3D triangular shell wedge for glass and porcelain ceramic shards
  const w = radius * 0.62;
  const h = radius * 0.52;
  const t = radius * (kind === 'ceramic' ? 0.14 : 0.09);

  const f0: Vec3Tuple = [-w * 0.55, -h * 0.38, t * 0.5];
  const f1: Vec3Tuple = [w * 0.58, -h * 0.22, t * 0.4];
  const f2: Vec3Tuple = [-w * 0.06, h * 0.58, t * 0.55];
  const b0: Vec3Tuple = [f0[0] * 0.9, f0[1] * 0.9, -t * 0.5];
  const b1: Vec3Tuple = [f1[0] * 0.9, f1[1] * 0.9, -t * 0.5];
  const b2: Vec3Tuple = [f2[0] * 0.9, f2[1] * 0.9, -t * 0.5];

  const positions: number[] = [];
  const uvs: number[] = [];
  pushOutwardTri(positions, uvs, f0, f1, f2, [0, 0], [1, 0.2], [0.4, 1]);
  pushOutwardTri(positions, uvs, b0, b2, b1, [0, 0], [0.4, 1], [1, 0.2]);
  pushOutwardTri(positions, uvs, f0, b0, b1, [0, 0], [0, 0.1], [1, 0.1]);
  pushOutwardTri(positions, uvs, f0, b1, f1, [0, 0], [1, 0.1], [1, 0.2]);
  pushOutwardTri(positions, uvs, f1, b1, b2, [1, 0.2], [1, 0.1], [0.4, 1]);
  pushOutwardTri(positions, uvs, f1, b2, f2, [1, 0.2], [0.4, 1], [0.4, 0.9]);
  pushOutwardTri(positions, uvs, f2, b2, b0, [0.4, 1], [0.4, 0.9], [0, 0]);
  pushOutwardTri(positions, uvs, f2, b0, f0, [0.4, 1], [0, 0.1], [0, 0]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
