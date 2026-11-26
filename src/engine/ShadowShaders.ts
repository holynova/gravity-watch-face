import * as THREE from 'three';

export const MAX_AO_BODIES = 56;

export interface ShadowUniforms {
  uBodies: { value: THREE.Vector4[] };
  uBodyCount: { value: number };
  uKeyDir: { value: THREE.Vector3 };
  uFloorZ: { value: number };
  uBoxDepth: { value: number };
  uLightRadius: { value: number };
  uFloorAoGain: { value: number };
  uItemAoGain: { value: number };
  uFloorBounceOcc: { value: number };
  uDepthDarkMin: { value: number };
  uShadowMin: { value: number };
  uIsSphereTheme: { value: number };
  uItemRefRadius: { value: number };
  uShadowTint: { value: THREE.Color };
  uBounceColor: { value: THREE.Color };
}

export function createShadowUniforms(): ShadowUniforms {
  const bodies: THREE.Vector4[] = [];
  for (let i = 0; i < MAX_AO_BODIES; i++) {
    bodies.push(new THREE.Vector4(0, 0, 100, 0.1));
  }
  return {
    uBodies: { value: bodies },
    uBodyCount: { value: 0 },
    uKeyDir: { value: new THREE.Vector3(-5.0, 6.0, 6.8).normalize() },
    uFloorZ: { value: -1.0 },
    uBoxDepth: { value: 2.0 },
    uLightRadius: { value: 0.25 },
    uFloorAoGain: { value: 1.42 },
    uItemAoGain: { value: 1.24 },
    uFloorBounceOcc: { value: 0.5 },
    uDepthDarkMin: { value: 0.64 },
    uShadowMin: { value: 0.04 },
    uIsSphereTheme: { value: 1.0 },
    uItemRefRadius: { value: 0.35 },
    uShadowTint: { value: new THREE.Color(0x7a2b18) },
    uBounceColor: { value: new THREE.Color(0xb8462a) },
  };
}

function attachSharedUniforms(shader: THREE.WebGLProgramParametersWithUniforms, uniforms: ShadowUniforms): void {
  shader.uniforms.uBodies = uniforms.uBodies;
  shader.uniforms.uBodyCount = uniforms.uBodyCount;
  shader.uniforms.uKeyDir = uniforms.uKeyDir;
  shader.uniforms.uFloorZ = uniforms.uFloorZ;
  shader.uniforms.uBoxDepth = uniforms.uBoxDepth;
  shader.uniforms.uLightRadius = uniforms.uLightRadius;
  shader.uniforms.uFloorAoGain = uniforms.uFloorAoGain;
  shader.uniforms.uItemAoGain = uniforms.uItemAoGain;
  shader.uniforms.uFloorBounceOcc = uniforms.uFloorBounceOcc;
  shader.uniforms.uDepthDarkMin = uniforms.uDepthDarkMin;
  shader.uniforms.uShadowMin = uniforms.uShadowMin;
  shader.uniforms.uIsSphereTheme = uniforms.uIsSphereTheme;
  shader.uniforms.uItemRefRadius = uniforms.uItemRefRadius;
  shader.uniforms.uShadowTint = uniforms.uShadowTint;
  shader.uniforms.uBounceColor = uniforms.uBounceColor;
}

export function patchFloorShadowShader(
  mat: THREE.MeshStandardMaterial,
  uniforms: ShadowUniforms,
  cacheKey: string,
): void {
  mat.customProgramCacheKey = () => cacheKey;
  mat.onBeforeCompile = (shader) => {
    attachSharedUniforms(shader, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vAoWorldPos;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
vec4 aoFloorWp = modelMatrix * vec4( transformed, 1.0 );
vAoWorldPos = aoFloorWp.xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `#define MAX_AO_BODIES ${MAX_AO_BODIES}
varying vec3 vAoWorldPos;
uniform vec4 uBodies[ MAX_AO_BODIES ];
uniform int uBodyCount;
uniform vec3 uKeyDir;
uniform float uLightRadius;
uniform float uFloorAoGain;
uniform float uShadowMin;
uniform float uIsSphereTheme;
uniform vec3 uShadowTint;

void main() {`,
      )
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
{
  vec3 aoPos = vAoWorldPos;
  vec3 aoLightDir = normalize( uKeyDir );
  float floorAo = 1.0;
  float softSh = 1.0;

  for ( int i = 0; i < MAX_AO_BODIES; i++ ) {
    if ( i >= uBodyCount ) break;
    vec4 b = uBodies[ i ];
    float r = b.w;
    vec3 toB = b.xyz - aoPos;
    float d = length( toB );
    float l = max( d, r * 0.99 );
    float cosT = max( 0.0, toB.z / max( l, 0.0001 ) );
    float hRatio = r / max( l, 0.0001 );
    float occ = clamp( cosT * hRatio * hRatio * uFloorAoGain, 0.0, 0.94 );
    float wrapHalo = clamp( ( 1.0 - smoothstep( r * 0.68, r * 1.9, d ) ) * ( toB.z / max( r, 0.0001 ) ), 0.0, 0.72 );
    floorAo *= ( 1.0 - max( occ, wrapHalo * 0.65 ) * ( 1.0 - uShadowMin * 0.45 ) );

    if ( uIsSphereTheme > 0.5 ) {
      float t = dot( toB, aoLightDir );
      if ( t > 0.0 ) {
        float perp = length( toB - t * aoLightDir );
        float penumbra = max( 0.08 * r, t * uLightRadius );
        float s = smoothstep( r - penumbra, r + penumbra, perp );
        softSh = min( softSh, mix( uShadowMin, 1.0, s ) );
      }
    }
  }

  floorAo = clamp( floorAo, max( 0.05, uShadowMin * 0.8 ), 1.0 );
  vec3 tintMix = mix( vec3( 1.0 ), uShadowTint, ( 1.0 - softSh * floorAo ) * ( 0.62 * ( 1.0 - uShadowMin * 0.55 ) ) );
  float indOcc = floorAo * mix( 0.44 + uShadowMin * 0.38, 1.0, softSh );

  reflectedLight.directDiffuse *= softSh * tintMix;
  reflectedLight.directSpecular *= softSh;
  reflectedLight.indirectDiffuse *= indOcc * tintMix;
  reflectedLight.indirectSpecular *= indOcc;
}`,
      );
  };
}

export function patchItemShadowShader(
  mat: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
  uniforms: ShadowUniforms,
  cacheKey: string,
): void {
  mat.customProgramCacheKey = () => cacheKey;
  mat.onBeforeCompile = (shader) => {
    attachSharedUniforms(shader, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vAoWorldPos;
varying vec3 vAoWorldNormal;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
vec4 aoItemWp = modelMatrix * vec4( transformed, 1.0 );
vAoWorldPos = aoItemWp.xyz;
vAoWorldNormal = normalize( ( modelMatrix * vec4( objectNormal, 0.0 ) ).xyz );`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `#define MAX_AO_BODIES ${MAX_AO_BODIES}
varying vec3 vAoWorldPos;
varying vec3 vAoWorldNormal;
uniform vec4 uBodies[ MAX_AO_BODIES ];
uniform int uBodyCount;
uniform vec3 uKeyDir;
uniform float uFloorZ;
uniform float uBoxDepth;
uniform float uLightRadius;
uniform float uItemAoGain;
uniform float uFloorBounceOcc;
uniform float uDepthDarkMin;
uniform float uIsSphereTheme;
uniform float uItemRefRadius;
uniform vec3 uBounceColor;

void main() {`,
      )
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
{
  vec3 pos = vAoWorldPos;
  vec3 nor = normalize( vAoWorldNormal );
  vec3 lightDir = normalize( uKeyDir );
  float itemAo = 1.0;
  float itemSoftSh = 1.0;

  for ( int i = 0; i < MAX_AO_BODIES; i++ ) {
    if ( i >= uBodyCount ) break;
    vec4 b = uBodies[ i ];
    float r = b.w;
    vec3 toB = b.xyz - pos;
    float d = length( toB );
    if ( d <= r * 0.96 ) continue;

    float l = d;
    float cosT = dot( toB / max( l, 0.0001 ), nor );
    if ( cosT > 0.0 ) {
      float hRatio = min( 1.0, r / max( l, 0.0001 ) );
      float occ = clamp( cosT * hRatio * hRatio * uItemAoGain, 0.0, 0.86 );
      itemAo *= ( 1.0 - occ );
    }

    if ( uIsSphereTheme > 0.5 && d > r * 1.025 ) {
      float t = dot( toB, lightDir );
      if ( t > 0.0 ) {
        float perp = length( toB - t * lightDir );
        float penumbra = max( 0.12 * r, t * uLightRadius * 1.15 );
        float s = smoothstep( r - penumbra, r + penumbra, perp );
        itemSoftSh = min( itemSoftSh, mix( 0.14, 1.0, s ) );
      }
    }
  }

  float distToFloor = max( 0.0, pos.z - uFloorZ );
  float floorFacing = clamp( -nor.z * 0.5 + 0.5, 0.0, 1.0 );
  float nearFloor = exp( -distToFloor / max( 0.15, uItemRefRadius * 1.35 ) );
  float floorOcc = 1.0 - floorFacing * nearFloor * uFloorBounceOcc;

  float depthT = clamp( distToFloor / max( 0.2, uBoxDepth ), 0.0, 1.0 );
  float depthOcc = mix( uDepthDarkMin, 1.0, smoothstep( 0.0, 0.85, depthT ) );

  itemAo = clamp( itemAo * floorOcc * depthOcc, 0.14, 1.0 );
  float specAo = pow( itemAo, 0.7 );

  reflectedLight.directDiffuse *= itemSoftSh;
  reflectedLight.directSpecular *= itemSoftSh;
  reflectedLight.indirectDiffuse *= itemAo;
  reflectedLight.indirectSpecular *= specAo;
  reflectedLight.indirectDiffuse += diffuseColor.rgb * uBounceColor * floorFacing * nearFloor * 0.15 * itemAo;

  #ifdef USE_SHEEN
    sheenSpecularDirect *= itemSoftSh;
    sheenSpecularIndirect *= specAo;
  #endif
  #ifdef USE_CLEARCOAT
    clearcoatSpecularDirect *= itemSoftSh;
    clearcoatSpecularIndirect *= specAo;
  #endif
}`,
      );
  };
}
