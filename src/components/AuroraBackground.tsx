"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, Preload } from "@react-three/drei";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.0;
      a *= 0.5;
    }
    return v;
  }
  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.04;
    vec2 p = vec2(uv.x * 2.0, uv.y * 1.4) + vec2(t, t * 0.3);
    float n = fbm(p + fbm(p + t) * 0.6);
    float band = smoothstep(0.25, 0.95, n * (0.4 + uv.y * 0.6));
    vec3 c1 = vec3(0.08, 0.65, 0.60);
    vec3 c2 = vec3(0.10, 0.75, 0.55);
    vec3 c3 = vec3(0.15, 0.45, 0.85);
    vec3 col = c1 * band + c2 * band * 0.5 + c3 * (1.0 - band) * 0.25;
    col *= 0.55;
    gl_FragColor = vec4(col, band * 0.45);
  }
`;

function AuroraPlane() {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((state) => {
    if (ref.current) ref.current.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh>
      <planeGeometry args={[24, 24]} />
      <shaderMaterial
        ref={ref}
        args={[
          {
            uniforms,
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          },
        ]}
      />
    </mesh>
  );
}

export default function AuroraBackground() {
  const [mode, setMode] = useState<"canvas" | "static">("static");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (gl) setMode("canvas");
  }, []);

  if (mode === "static") {
    return (
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(45,212,191,0.20),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(34,211,238,0.14),transparent_60%),#06101a]"
      />
    );
  }

  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <AuroraPlane />
        <AdaptiveDpr pixelated />
        <Preload all />
      </Canvas>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#06101a_0%,transparent_25%,transparent_75%,#06101a_100%)]" />
    </div>
  );
}
