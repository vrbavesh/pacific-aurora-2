"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Preload } from "@react-three/drei";
import { usePathname } from "next/navigation";
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
  uniform vec2 uMouse;
  uniform float uPaletteMorph;

  // Optimized procedural noise functions
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
    float a = 0.52;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.05;
      a *= 0.48;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    
    // Parallax mouse nudge
    vec2 mouseOffset = (uMouse - 0.5) * 0.12;
    vec2 p = uv * 2.2 + mouseOffset;
    
    float t = uTime * 0.025;
    
    // Multi-layered organic aurora ribbons
    float q = fbm(p + vec2(t * 0.4, t * 0.15));
    float r = fbm(p + q * 1.4 + vec2(t * 0.2, t * 0.35));
    
    float ribbon = smoothstep(0.2, 0.88, r * (0.35 + uv.y * 0.75));
    float secondaryRibbon = smoothstep(0.3, 0.95, q * (0.45 + (1.0 - uv.y) * 0.55));

    // Pacific Aurora Tranquil Palette (Cyan, Mint Teal, Oceanic Azure, Soft Indigo)
    vec3 deepNavy = vec3(0.015, 0.045, 0.08);
    vec3 cyan = vec3(0.12, 0.82, 0.76);
    vec3 mint = vec3(0.18, 0.90, 0.65);
    vec3 softAzure = vec3(0.14, 0.48, 0.88);
    vec3 lavenderDusk = vec3(0.28, 0.22, 0.55);

    // Subtle route-based palette morph
    vec3 highlight1 = mix(cyan, mint, uPaletteMorph);
    vec3 highlight2 = mix(softAzure, lavenderDusk, uPaletteMorph * 0.6);

    vec3 col = deepNavy;
    col += highlight1 * (ribbon * 0.65);
    col += highlight2 * (secondaryRibbon * 0.38);

    // Radial gentle vignette & top-bottom feathering
    float vignette = smoothstep(1.4, 0.2, length(uv - 0.5));
    col *= vignette * 0.95;

    float alpha = clamp((ribbon * 0.75 + secondaryRibbon * 0.45) * vignette, 0.0, 0.9);
    gl_FragColor = vec4(col, alpha);
  }
`;

function CelestialParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const count = 90;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.008;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.006) * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color="#7ee7d8"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function SceneController({ pathname }: { pathname: string }) {
  const { camera } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const targetCamPos = useRef(new THREE.Vector3(0, 0, 5));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const mousePos = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
  const paletteTarget = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uPaletteMorph: { value: 0 },
    }),
    []
  );

  // Active Theory: Route-dependent camera navigation & perspective glide
  useEffect(() => {
    if (pathname.includes("/signin")) {
      targetCamPos.current.set(-0.35, -0.15, 4.6);
      paletteTarget.current = 0.2;
    } else if (pathname.includes("/signup")) {
      targetCamPos.current.set(0.35, -0.15, 4.6);
      paletteTarget.current = 0.4;
    } else if (pathname.includes("/forgot-password")) {
      targetCamPos.current.set(0, -0.3, 4.7);
      paletteTarget.current = 0.5;
    } else if (pathname.includes("/onboarding")) {
      targetCamPos.current.set(0, 0.25, 4.5);
      paletteTarget.current = 0.7;
    } else if (pathname.includes("/home") || pathname.includes("/books") || pathname.includes("/worlds")) {
      targetCamPos.current.set(-0.4, 0.1, 4.9);
      paletteTarget.current = 0.3;
    } else {
      // Landing page
      targetCamPos.current.set(0, 0, 5.0);
      paletteTarget.current = 0.0;
    }
  }, [pathname]);

  // Smooth mouse move listener
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePos.current.targetX = e.clientX / window.innerWidth;
      mousePos.current.targetY = 1.0 - e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  useFrame((state) => {
    // Smooth lerp mouse coordinates
    mousePos.current.x = THREE.MathUtils.lerp(
      mousePos.current.x,
      mousePos.current.targetX,
      0.04
    );
    mousePos.current.y = THREE.MathUtils.lerp(
      mousePos.current.y,
      mousePos.current.targetY,
      0.04
    );

    // Active Theory: Smooth camera glide between views
    camera.position.lerp(targetCamPos.current, 0.035);
    camera.position.x += (mousePos.current.x - 0.5) * 0.18;
    camera.position.y += (mousePos.current.y - 0.5) * 0.18;
    camera.lookAt(targetLookAt.current);

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uMouse.value.set(
        mousePos.current.x,
        mousePos.current.y
      );
      materialRef.current.uniforms.uPaletteMorph.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uPaletteMorph.value,
        paletteTarget.current,
        0.03
      );
    }
  });

  return (
    <>
      <mesh position={[0, 0, -0.5]}>
        <planeGeometry args={[26, 26]} />
        <shaderMaterial
          ref={materialRef}
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
      <CelestialParticles />
    </>
  );
}

export default function AuroraBackground() {
  const pathname = usePathname() || "/";
  const [mode, setMode] = useState<"canvas" | "static">("static");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (gl) setMode("canvas");
    } catch {
      setMode("static");
    }
  }, []);

  // Opaque writing surfaces do not need a continuously rendered scene behind them.
  if (pathname.startsWith("/books/") || pathname.startsWith("/worlds/")) return null;

  if (mode === "static") {
    return (
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,rgba(45,212,191,0.18),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(34,211,238,0.12),transparent_60%),#050d14]"
      />
    );
  }

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#040911]"
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 48 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
      >
        <SceneController pathname={pathname} />
        <AdaptiveDpr pixelated />
        <Preload all />
      </Canvas>
      {/* Cinematic subtle vignette overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(4,9,17,0.7)_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(4,9,17,0.4)_0%,transparent_20%,transparent_80%,rgba(4,9,17,0.7)_100%)] pointer-events-none" />
    </div>
  );
}
