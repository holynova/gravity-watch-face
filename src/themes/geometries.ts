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
