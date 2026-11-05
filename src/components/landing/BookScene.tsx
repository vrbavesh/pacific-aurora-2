"use client";

import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, RoundedBox, SoftShadows } from "@react-three/drei";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import { bookCamera, bookSpreads, bookTimeline } from "./book-timeline";
import BookSpread from "./BookSpread";

type SceneProps = { progress: MotionValue<number>; renderedProgress: MotionValue<number>; running: boolean; onReady: () => void; onFailure: () => void };
const PAPER_WIDTH = 2.12;
const PAPER_DEPTH = 2.95;

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function makeTexture(cover = false, relief = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 768; canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = relief ? "#888888" : cover ? "#f4f4f0" : "#fcfcf9";
  ctx.fillRect(0, 0, 768, 1024);
  let seed = 1979;
  const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let index = 0; index < 110000; index++) {
    ctx.fillStyle = relief ? index % 2 ? "#eeeeee" : "#242424" : index % 2 ? "#ffffff55" : "#85877e12";
    ctx.fillRect(noise() * 768, noise() * 1024, relief ? 1.2 : .8, cover ? 2.3 : 1.2);
  }
  if (relief && cover) {
    ctx.globalAlpha = .2;
    for (let line = 0; line < 768; line += 3) { ctx.fillStyle = line % 2 ? "#eeeeee" : "#222222"; ctx.fillRect(line, 0, 1, 1024); }
    ctx.globalAlpha = 1;
  } else if (cover) {
    ctx.strokeStyle = "#c6c8c0"; ctx.lineWidth = 1.5;
    ctx.strokeRect(38, 38, 692, 948); ctx.strokeRect(47, 47, 674, 930);
    ctx.textAlign = "center"; ctx.fillStyle = "#74776f";
    ctx.font = "27px Georgia"; ctx.fillText("PACIFIC AURORA", 384, 152);
    ctx.font = "72px Georgia"; ctx.fillText("A WORLD", 384, 412); ctx.fillText("WITHIN", 384, 497);
    ctx.font = "italic 23px Georgia"; ctx.fillText("Every story begins somewhere.", 384, 856);
    ctx.beginPath(); ctx.arc(384, 661, 62, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(384, 661, 24, 62, -.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(384, 661, 62, 19, .2, 0, Math.PI * 2); ctx.stroke();
  } else if (!relief) {
    ctx.fillStyle = "#a8aea2"; ctx.textAlign = "center";
    ctx.font = "16px Georgia"; ctx.fillText("Pacific Aurora", 384, 977);
  }
  const texture = new THREE.CanvasTexture(canvas);
  if (!relief) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function paperSurface(thickness = .005) {
  const geometry = new THREE.BoxGeometry(PAPER_WIDTH, thickness, PAPER_DEPTH, 40, 1, 2);
  const positions = geometry.attributes.position;
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const u = (positions.getX(vertex) + PAPER_WIDTH / 2) / PAPER_WIDTH;
    positions.setY(vertex, positions.getY(vertex) + .065 * Math.exp(-u * 10) + .024 * Math.sin(u * Math.PI));
  }
  geometry.computeVertexNormals();
  return geometry;
}

function PaperStack({ position, left = false, texture, bump }: { position: [number, number, number]; left?: boolean; texture: THREE.Texture; bump: THREE.Texture }) {
  const sheets = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => paperSurface(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    const sheet = new THREE.Object3D();
    for (let index = 0; index < 48; index++) {
      sheet.position.set(Math.sin(index * 1.7) * .0035, -.141 + index * .006, Math.sin(index * .8) * .002);
      sheet.scale.set(1 - Math.sin(index) * .0015, 1, 1 - Math.cos(index) * .001);
      sheet.updateMatrix(); sheets.current?.setMatrixAt(index, sheet.matrix);
    }
    if (sheets.current) sheets.current.instanceMatrix.needsUpdate = true;
  }, []);
  return <group position={position} rotation-y={left ? Math.PI : 0}><instancedMesh ref={sheets} geometry={geometry} args={[undefined, undefined, 48]} castShadow receiveShadow><meshStandardMaterial color="#eeeee8" roughness={.98} /></instancedMesh><mesh geometry={geometry} position={[0, .144, 0]} castShadow receiveShadow><meshStandardMaterial map={texture} bumpMap={bump} bumpScale={.004} roughness={.96} /></mesh></group>;
}

function PageContent({ progress, side }: { progress: MotionValue<number>; side: "left" | "right" }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // Html has a separate React root; switch its semantic pages on the actual frame.
    const show = () => {
      const frame = bookTimeline(progress.get());
      Array.from(root.current?.children ?? []).forEach((element, index) => {
        const page = element as HTMLElement;
        page.style.opacity = String(frame.contentOpacity[index]);
        page.hidden = index !== frame.spread;
      });
    };
    show();
    return progress.on("change", show);
  }, [progress]);
  const frame = bookTimeline(progress.get());
  return <div ref={root} style={{ transform: "scale(2)" }}>{bookSpreads.map((_, index) => <div key={index} data-book-page={index} style={{ opacity: frame.contentOpacity[index] }} hidden={index !== frame.spread}><BookSpread index={index} side={side} /></div>)}</div>;
}

function Page({ index, progress, texture, reverse }: { index: number; progress: React.RefObject<number>; texture: THREE.Texture; reverse: THREE.Texture }) {
  const mesh = useRef<THREE.Group>(null);
  const lastTurn = useRef(-1);
  const geometry = useMemo(() => {
    const result = new THREE.PlaneGeometry(PAPER_WIDTH, PAPER_DEPTH, 28, 14);
    result.rotateX(-Math.PI / 2);
    result.translate(PAPER_WIDTH / 2, 0, 0);
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (!mesh.current) return;
    const frame = bookTimeline(progress.current);
    const turn = frame.pages[index];
    mesh.current.visible = turn > .001 && turn < .999;
    if (lastTurn.current === turn) return;
    lastTurn.current = turn;
    const angle = turn * Math.PI;
    const bend = Math.sin(turn * Math.PI);
    const positions = geometry.attributes.position;
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const u = vertex % 29 / 28;
      const v = Math.floor(vertex / 29) / 14;
      const x = u * PAPER_WIDTH;
      const localAngle = angle + bend * (v - .5) * u * .35 - bend * u * .3;
      const curl = bend * Math.sin(u * Math.PI) * .8;
      positions.setXYZ(vertex, x * Math.cos(localAngle) - curl * Math.sin(localAngle), x * Math.sin(localAngle) + curl * Math.cos(localAngle) + Math.sin(u * Math.PI) * .045, (v - .5) * PAPER_DEPTH + bend * u * .13);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    mesh.current.position.y = .34 + (6 - index) * .009 + turn * .025;
  });
  return <group ref={mesh}>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial map={texture} side={THREE.FrontSide} roughness={.88} color={index % 2 ? "#ffffff" : "#f3f4ec"} /></mesh>
    <mesh geometry={geometry} receiveShadow><meshStandardMaterial map={reverse} side={THREE.BackSide} roughness={.88} color="#fcfcf7" /></mesh>
  </group>;
}

function Tower({ position, height, radius = .18 }: { position: [number, number, number]; height: number; radius?: number }) {
  const arch = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-.035, 0); shape.lineTo(.035, 0); shape.lineTo(.035, .105);
    shape.absarc(0, .105, .035, 0, Math.PI, false); shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  useEffect(() => () => arch.dispose(), [arch]);
  return <group position={position}>
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[radius * .85, radius, height, 32]} /><meshStandardMaterial color="#edeae0" roughness={.9} /></mesh>
    <mesh position={[0, .035, 0]} castShadow><cylinderGeometry args={[radius * 1.02, radius * 1.14, .07, 32]} /><meshStandardMaterial color="#d5d3c8" roughness={.9} /></mesh>
    <mesh position={[0, height * .94, 0]} castShadow><cylinderGeometry args={[radius * 1.16, radius * 1.05, .065, 32]} /><meshStandardMaterial color="#faf9f2" roughness={.8} /></mesh>
    <mesh position={[0, height * .87, 0]}><cylinderGeometry args={[radius * 1.015, radius * .98, .028, 32]} /><meshStandardMaterial color="#d5d3c8" roughness={.9} /></mesh>
    <mesh position={[0, height + radius * 1.15, 0]} castShadow><coneGeometry args={[radius * 1.25, radius * 2.45, 32]} /><meshStandardMaterial color="#315e66" roughness={.48} metalness={.18} /></mesh>
    <mesh position={[0, height + radius * 2.5, 0]}><sphereGeometry args={[.025, 8, 8]} /><meshStandardMaterial color="#bfaa6e" metalness={.7} roughness={.3} /></mesh>
    {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, index) => <group key={index} rotation-y={angle}>
      <mesh geometry={arch} position={[0, height * .63, radius * .92]}><meshStandardMaterial color="#314f54" roughness={1} /></mesh>
      {height > .8 && <mesh geometry={arch} position={[0, height * .32, radius * .96]}><meshStandardMaterial color="#536569" roughness={1} /></mesh>}
    </group>)}
  </group>;
}

function Trees() {
  const foliage = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const matrix = new THREE.Object3D();
    for (let index = 0; index < 46; index++) {
      const angle = index * 2.39996;
      const radius = .8 + (index % 7) * .10;
      const x = Math.cos(angle) * radius * 1.1;
      const z = Math.sin(angle) * radius * .65;
      const scale = .7 + index % 5 * .13;
      for (let tier = 0; tier < 3; tier++) {
        matrix.position.set(x, .35 + (.12 + tier * .105) * scale, z);
        matrix.rotation.y = angle + tier * .3;
        matrix.scale.set(scale * (1 - tier * .23), scale * .72, scale * (1 - tier * .23)); matrix.updateMatrix();
        foliage.current?.setMatrixAt(index * 3 + tier, matrix.matrix);
      }
      matrix.scale.set(scale, scale, scale);
      matrix.position.y = .33; matrix.updateMatrix();
      trunks.current?.setMatrixAt(index, matrix.matrix);
    }
    if (foliage.current) foliage.current.instanceMatrix.needsUpdate = true;
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
  }, []);
  return <>
    <instancedMesh ref={foliage} args={[undefined, undefined, 138]} castShadow receiveShadow><coneGeometry args={[.09, .3, 9]} /><meshStandardMaterial color="#4b6d51" roughness={1} /></instancedMesh>
    <instancedMesh ref={trunks} args={[undefined, undefined, 46]}><cylinderGeometry args={[.012, .018, .14, 5]} /><meshStandardMaterial color="#8a795c" /></instancedMesh>
  </>;
}

function Bridge() {
  const geometry = useMemo(() => {
    const bridge = new THREE.Shape();
    bridge.moveTo(-1.1, 0); bridge.lineTo(1.1, 0); bridge.lineTo(1.1, .38); bridge.lineTo(-1.1, .38); bridge.closePath();
    // The arch openings join the boundary, not invalid holes outside the shape.
    bridge.curves = [];
    bridge.moveTo(-1.1, 0);
    for (let index = 0; index < 6; index++) {
      const x = -.92 + index * .36;
      bridge.lineTo(x - .12, 0); bridge.lineTo(x - .12, .16);
      bridge.absarc(x, .16, .12, Math.PI, 0, true); bridge.lineTo(x + .12, 0);
    }
    bridge.lineTo(1.1, 0); bridge.lineTo(1.1, .38); bridge.lineTo(-1.1, .38); bridge.closePath();
    const result = new THREE.ExtrudeGeometry(bridge, { depth: .15, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 1, steps: 1 });
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group position={[.05, .35, .52]} rotation-y={-.16}>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color="#e2dfd2" roughness={.9} /></mesh>
    <mesh position={[0, .405, .075]} castShadow><boxGeometry args={[2.24, .055, .19]} /><meshStandardMaterial color="#f6f4eb" /></mesh>
    {[-.015, .165].map(z => <mesh key={z} position={[0, .46, z]} castShadow><boxGeometry args={[2.24, .08, .025]} /><meshStandardMaterial color="#eeede3" roughness={.9} /></mesh>)}
  </group>;
}

function PaperWorld({ progress }: { progress: React.RefObject<number> }) {
  const world = useRef<THREE.Group>(null);
  const buildings = useRef<THREE.Group>(null);
  const coast = useMemo(() => {
    const shape = new THREE.Shape();
    for (let index = 0; index <= 80; index++) {
      const angle = index / 80 * Math.PI * 2;
      const radius = 1 + Math.sin(angle * 3) * .11 + Math.cos(angle * 5) * .07;
      const x = Math.cos(angle) * radius * 1.3;
      const y = Math.sin(angle) * radius * .85;
      if (index === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: .15, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 3, steps: 1 });
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, []);
  const water = useMemo(() => {
    const geometry = new THREE.RingGeometry(.001, 1, 160, 28);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const x = positions.getX(vertex), z = positions.getZ(vertex);
      const angle = Math.atan2(z, x), radius = 1 + Math.sin(angle * 3) * .11 + Math.cos(angle * 5) * .07;
      positions.setXYZ(vertex, x * radius * 1.57, Math.sin(x * 66 + Math.cos(z * 18)) * .006 + Math.sin(z * 75) * .003, z * radius * 1.02);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  useEffect(() => () => { coast.dispose(); water.dispose(); }, [coast, water]);
  useFrame(() => {
    const amount = bookTimeline(progress.current).world;
    if (!world.current || !buildings.current) return;
    world.current.visible = amount > .001;
    world.current.scale.set(1.1, Math.max(.001, amount), 1.1);
    buildings.current.rotation.y = (1 - amount) * -.3;
    buildings.current.children.forEach((building, index) => {
      if (index < 9) building.scale.y = Math.max(.001, Math.min(1, amount * 1.5 - index * .045));
    });
  });
  return <group ref={world} position={[0, .43, 0]}>
    <mesh geometry={coast} position={[0, -.05, 0]} scale={[1.17, .2, 1.2]} receiveShadow><meshStandardMaterial color="#4e9eaa" roughness={.65} /></mesh>
    <mesh geometry={water} position={[0, -.015, 0]} receiveShadow><meshPhysicalMaterial color="#68b2be" metalness={.2} roughness={.24} clearcoat={.8} /></mesh>
    <mesh geometry={coast} position={[-.12, .03, -.13]} castShadow receiveShadow><meshStandardMaterial color="#e4e0d3" roughness={1} /></mesh>
    <mesh geometry={coast} position={[-.12, .21, -.13]} scale={[.94, .12, .94]} receiveShadow><meshStandardMaterial color="#81977a" roughness={1} /></mesh>
    {Array.from({ length: 36 }, (_, index) => {
      const angle = index * 2.399;
      return <mesh key={index} position={[Math.cos(angle) * (1.12 + index % 3 * .03), .065, Math.sin(angle) * .72]} scale={[.13 + index % 3 * .025, .11 + index % 4 * .026, .14]} rotation={[index * .2, index * .7, .3]} castShadow receiveShadow><dodecahedronGeometry args={[1, 1]} /><meshStandardMaterial color={index % 2 ? "#d1cec0" : "#e0ddd1"} roughness={1} /></mesh>;
    })}
    <group ref={buildings}>
      <Tower position={[0, .27, -.28]} height={1.36} radius={.25} />
      <Tower position={[-.48, .27, -.15]} height={.94} radius={.18} />
      <Tower position={[.48, .27, -.36]} height={1.08} radius={.19} />
      <Tower position={[-.83, .25, -.42]} height={.72} radius={.14} />
      <Tower position={[.89, .25, -.15]} height={.7} radius={.15} />
      <Tower position={[-.42, .27, -.66]} height={.74} radius={.13} />
      <Tower position={[.36, .27, .15]} height={.61} radius={.14} />
      <Tower position={[-1.08, .18, .48]} height={.42} radius={.11} />
      <Tower position={[1.1, .18, .37]} height={.48} radius={.11} />
      <mesh position={[0, .54, -.32]} castShadow receiveShadow><boxGeometry args={[1.13, .5, .46]} /><meshStandardMaterial color="#eeeae0" roughness={.9} /></mesh>
      <mesh position={[0, .88, -.32]} rotation-y={Math.PI / 4} scale={[1.65, 1, .7]} castShadow><coneGeometry args={[.44, .3, 4]} /><meshStandardMaterial color="#41666b" roughness={.65} /></mesh>
      {[-.28, 0, .28].map(x => <mesh key={x} position={[x, .57, -.078]}><boxGeometry args={[.07, .17, .015]} /><meshStandardMaterial color="#536569" /></mesh>)}
      <Bridge />
    </group>
    <Trees />
  </group>;
}

function Book({ progress, renderedProgress, running, onReady, pagePortal }: Omit<SceneProps, "onFailure"> & { pagePortal: React.RefObject<HTMLDivElement> }) {
  const root = useRef<THREE.Group>(null);
  const cover = useRef<THREE.Group>(null);
  const leftPages = useRef<THREE.Group>(null);
  const smoothProgress = useRef(renderedProgress.get());
  const { camera, size, invalidate } = useThree();
  const paperFactor = Math.min(2.5, Math.max(1.6, size.width / size.height * 5.3));
  const textures = useMemo(() => {
    const page = makeTexture();
    const reverse = page.clone();
    reverse.repeat.x = -1; reverse.offset.x = 1; reverse.needsUpdate = true;
    const left = page.clone();
    left.center.set(.5, .5); left.rotation = Math.PI; left.needsUpdate = true;
    return { cover: makeTexture(true), page, reverse, left, cloth: makeTexture(true, true), fiber: makeTexture(false, true) };
  }, []);
  const coverGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2.2, 3.08);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, []);
  useEffect(() => {
    onReady();
    return () => { Object.values(textures).forEach(texture => texture.dispose()); coverGeometry.dispose(); };
  }, [textures, coverGeometry, onReady]);
  useEffect(() => progress.on("change", invalidate), [progress, invalidate]);
  useEffect(() => { if (running) invalidate(); }, [running, invalidate]);
  useFrame((state, delta) => {
    if (!root.current || !cover.current || !leftPages.current) return;
    if (renderedProgress.get() !== smoothProgress.current) smoothProgress.current = renderedProgress.get();
    if (running) smoothProgress.current = THREE.MathUtils.damp(smoothProgress.current, progress.get(), 10, Math.min(delta, .05));
    renderedProgress.set(smoothProgress.current);
    const pose = bookTimeline(smoothProgress.current);
    const mobile = size.width < 1000;
    const closedScale = Math.min(1.6, 1.25 + Math.max(0, size.width / size.height - 1.45) * .5);
    const scale = mobile ? .82 + pose.reading * .18 - pose.lift * .05 * (1 - pose.open) : closedScale + (1.16 - closedScale) * pose.reading + (1.12 - closedScale) * pose.settle;
    const closedX = mobile ? -.9 : -.2;
    const liftedX = mobile ? -1.1 * .77 : -1.1 * closedScale;
    root.current.position.set((closedX + (liftedX - closedX) * pose.lift) * (1 - pose.open), pose.height + (scale - 1) * .12 * (1 - pose.lift), mobile ? 0 : -.6 * (1 - pose.open));
    root.current.rotation.set(pose.pitch + pose.reading * .02, pose.yaw + pose.reading * .08, -.1 + pose.open * .1 - pose.reading * .018);
    root.current.scale.setScalar(scale);
    cover.current.rotation.z = pose.coverAngle;
    cover.current.position.y = .35 * (1 - pose.open) + .015 * pose.open;
    leftPages.current.rotation.z = pose.openingPagesAngle;
    leftPages.current.position.y = .31 * (1 - pose.open);
    leftPages.current.visible = pose.open > .01;
    const framing = bookCamera(pose.progress, mobile);
    camera.position.set(...framing.position);
    camera.lookAt(...framing.target);
    state.gl.domElement.dataset.bookPose = pose.progress.toFixed(3);
    state.gl.domElement.dataset.bookSpread = String(pose.spread);
    state.gl.domElement.dataset.bookTurns = pose.pages.map(value => value.toFixed(6)).join(",");
    state.gl.domElement.dataset.bookPageAngle = leftPages.current.rotation.z.toFixed(3);
    state.gl.domElement.dataset.bookCoverAngle = cover.current.rotation.z.toFixed(3);
    state.gl.domElement.dataset.bookCamera = framing.position.map(value => value.toFixed(3)).join(",");
    if (running && Math.abs(progress.get() - smoothProgress.current) > .0001) invalidate();
  }, -1);
  return <>
    <group ref={root}>
      <RoundedBox position={[1.1, -.055, 0]} args={[2.28, .13, 3.18]} radius={.025} smoothness={3} castShadow receiveShadow><meshStandardMaterial color="#eeeeea" roughness={.85} /></RoundedBox>
      <mesh position={[0, .16, 0]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[.19, .19, 3.14, 40]} /><meshStandardMaterial color="#e5e5dd" roughness={.95} bumpMap={textures.cloth} bumpScale={.006} /></mesh>
      <PaperStack position={[1.06, .155, 0]} texture={textures.page} bump={textures.fiber} />
      <group ref={leftPages}>
        <PaperStack position={[-1.06, .155, 0]} left texture={textures.left} bump={textures.fiber} />
      </group>
      <group ref={cover} position={[0, .35, 0]}>
        <RoundedBox position={[1.1, .015, 0]} args={[2.28, .09, 3.18]} radius={.02} smoothness={3} castShadow receiveShadow><meshStandardMaterial color="#edede6" roughness={.9} bumpMap={textures.cloth} bumpScale={.006} /></RoundedBox>
        <mesh geometry={coverGeometry} position={[1.1, .062, 0]}><meshStandardMaterial map={textures.cover} roughness={.92} bumpMap={textures.cloth} bumpScale={.006} /></mesh>
        <mesh geometry={coverGeometry} position={[1.1, -.032, 0]} rotation-z={Math.PI}><meshStandardMaterial color="#edf0e6" roughness={.9} side={THREE.DoubleSide} /></mesh>
      </group>
      {Array.from({ length: 7 }, (_, index) => <Page key={index} index={index} progress={smoothProgress} texture={textures.page} reverse={textures.reverse} />)}
      <PaperWorld progress={smoothProgress} />
      <Html portal={pagePortal} transform scale={.5} position={[-1.06, .38, 0]} rotation={[-Math.PI / 2, 0, 0]} distanceFactor={paperFactor} zIndexRange={[15, 5]}><PageContent progress={renderedProgress} side="left" /></Html>
      <Html portal={pagePortal} transform scale={.5} position={[1.06, .38, 0]} rotation={[-Math.PI / 2, 0, 0]} distanceFactor={paperFactor} zIndexRange={[15, 5]}><PageContent progress={renderedProgress} side="right" /></Html>
    </group>
    <RoundedBox position={[0, -.42, 0]} args={[8.5, .26, 6.2]} radius={.045} smoothness={3} receiveShadow castShadow><meshStandardMaterial color="#f4f4f0" roughness={.9} /></RoundedBox>
    <mesh rotation-x={-Math.PI / 2} position={[0, -.57, 0]} receiveShadow><planeGeometry args={[200, 200]} /><shadowMaterial transparent opacity={.13} /></mesh>
  </>;
}

export default function BookScene({ progress, renderedProgress, running, onReady, onFailure }: SceneProps) {
  const [supported, setSupported] = useState(false);
  const pagePortal = useRef<HTMLDivElement>(null!);
  useEffect(() => {
    try {
      const probe = document.createElement("canvas").getContext("webgl2");
      if (probe) { probe.getExtension("WEBGL_lose_context")?.loseContext(); setSupported(true); }
      else onFailure();
    } catch { onFailure(); }
  }, [onFailure]);
  if (!supported) return null;
  return <SceneBoundary onFailure={onFailure}><Canvas frameloop="demand" shadows={{ type: THREE.PCFSoftShadowMap }} camera={{ position: [4.8, 6.8, 8], fov: 33 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }} onCreated={({ gl }) => gl.domElement.setAttribute("aria-hidden", "true")}>
    <SoftShadows size={12} samples={24} focus={.3} />
    <ambientLight intensity={.4} color="#ffffff" />
    <hemisphereLight args={["#ffffff", "#b9b9b3", .6]} />
    <directionalLight position={[-3, 6, 4]} intensity={2.8} color="#ffffff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-normalBias={.006} />
    <directionalLight position={[5, 3, -5]} intensity={.8} color="#f5f7f8" />
    <Book progress={progress} renderedProgress={renderedProgress} running={running} onReady={onReady} pagePortal={pagePortal} />
  </Canvas><div ref={pagePortal} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} /></SceneBoundary>;
}
