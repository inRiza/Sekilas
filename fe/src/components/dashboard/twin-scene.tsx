"use client";

import { Bounds, Grid, Html, Line, OrbitControls, Splat } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { Component, Suspense, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";

export type TwinSource =
  | { kind: "demo" }
  | { kind: "ply"; url: string; name: string }
  | { kind: "splat"; url: string; name: string };

/* ---------- Scene contoh: koridor jalan -> tangga -> lantai 2 -> kasir ---------- */

type V3 = [number, number, number];

const PATH: V3[] = [
  [-7, 0.05, 2.2],
  [-3.5, 0.05, 1.4],
  [-1, 0.08, 0.4],
  [1.2, 2.05, -0.4],
  [4, 2.05, -0.9],
  [6.2, 2.05, -1.2],
];
const FRICTION: V3 = [-1, 0.1, 0.4];
const ZONES: { label: string; at: V3; hot?: boolean }[] = [
  { label: "Jalan depan", at: [-6.5, 0.2, 2.6] },
  { label: "Dasar tangga", at: [-1, 0.2, 1.3], hot: true },
  { label: "Area menu", at: [3.6, 2.3, 0.2] },
  { label: "Kasir", at: [6.4, 2.3, -0.4] },
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function useDemoCloud() {
  return useMemo(() => {
    const rand = mulberry32(42);
    const pos: number[] = [];
    const col: number[] = [];
    const base = new THREE.Color();
    const red = new THREE.Color("#c2453a");
    const friction = new THREE.Vector3(...FRICTION);
    const p = new THREE.Vector3();

    const add = (x: number, y: number, z: number, shade: number) => {
      p.set(x, y, z);
      base.setScalar(shade);
      const heat = Math.max(0, 1 - p.distanceTo(friction) / 1.8);
      base.lerp(red, heat * 0.85);
      pos.push(x, y, z);
      col.push(base.r, base.g, base.b);
    };
    const jitter = () => (rand() - 0.5) * 0.04;

    // Jalan dan trotoar
    for (let i = 0; i < 9000; i++) {
      const x = -8 + rand() * 16;
      const z = -0.5 + rand() * 4;
      add(x, jitter(), z, z > 1.6 ? 0.62 + rand() * 0.08 : 0.74 + rand() * 0.08);
    }
    // Fasad bangunan (lantai 1 tetangga + dinding tangga)
    for (let i = 0; i < 7000; i++) {
      const x = -8 + rand() * 16;
      const y = rand() * 4.4;
      const neighbor = x < -2.2 && y < 2;
      add(x, y, -0.5 + jitter(), neighbor ? 0.55 + rand() * 0.15 : 0.8 + rand() * 0.08);
    }
    // Tangga ke lantai 2
    const steps = 10;
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < 260; i++) {
        const x = -1 + (s / steps) * 2.2 + rand() * (2.2 / steps);
        const z = -0.5 + rand() * 1.4;
        add(x, (s + 1) * (2 / steps) + jitter(), z, 0.5 + rand() * 0.1);
      }
    }
    // Lantai 2: area menu dan kasir
    for (let i = 0; i < 5000; i++) {
      const x = 1.2 + rand() * 6.3;
      const z = -2.6 + rand() * 2.1;
      add(x, 2 + jitter(), z, 0.84 + rand() * 0.06);
    }
    // Meja kasir dan papan menu
    for (let i = 0; i < 1600; i++) {
      add(5.6 + rand() * 1.4, 2 + rand() * 1, -1.9 + jitter(), 0.45 + rand() * 0.1);
      add(3 + rand() * 1.4, 2.6 + rand() * 0.9, -2.6 + jitter(), 0.3 + rand() * 0.1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return geometry;
  }, []);
}

function DemoTwin() {
  const geometry = useDemoCloud();
  return (
    <group>
      <points geometry={geometry}>
        <pointsMaterial size={0.05} vertexColors sizeAttenuation />
      </points>
      <Line points={PATH.slice(0, 3)} color="#3466e5" lineWidth={3} />
      <Line points={PATH.slice(2)} color="#a3abb6" lineWidth={1.5} dashed dashSize={0.25} gapSize={0.18} />
      <mesh position={FRICTION} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.5, 48]} />
        <meshBasicMaterial color="#c2453a" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      {ZONES.map((z) => (
        <Html key={z.label} position={z.at} center zIndexRange={[10, 0]}>
          <span
            className={`pointer-events-none whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10px] ${
              z.hot ? "border-friction/30 bg-white text-friction" : "border-line bg-white/90 text-muted"
            }`}
          >
            {z.label}
          </span>
        </Html>
      ))}
    </group>
  );
}

/* ---------- File hasil ns-export ---------- */

function PlyModel({ url }: { url: string }) {
  const geometry = useLoader(PLYLoader, url);
  const hasColor = Boolean(geometry.getAttribute("color"));
  const isMesh = Boolean(geometry.index);

  // Skala koordinat COLMAP/nerfstudio tidak tentu: ukuran titik mengikuti besar model.
  const pointSize = useMemo(() => {
    geometry.center();
    if (isMesh && !geometry.getAttribute("normal")) geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return (geometry.boundingSphere?.radius ?? 1) * 0.006;
  }, [geometry, isMesh]);

  return isMesh ? (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors={hasColor} color={hasColor ? undefined : "#b8bec7"} />
    </mesh>
  ) : (
    <points geometry={geometry}>
      <pointsMaterial size={pointSize} vertexColors={hasColor} color={hasColor ? undefined : "#7d8693"} sizeAttenuation />
    </points>
  );
}

class LoadBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* ---------- Canvas ---------- */

export default function TwinScene({ source, onLoadError }: { source: TwinSource; onLoadError: () => void }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0.5, 11, 20.5], fov: 38 }} gl={{ antialias: true }}>
      <color attach="background" args={["#fafbfc"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 10, 5]} intensity={0.6} />
      <Grid
        position={[0, -0.01, 0]}
        args={[40, 40]}
        cellSize={0.5}
        sectionSize={2.5}
        cellColor="#eceef1"
        sectionColor="#dfe3e8"
        fadeDistance={34}
        infiniteGrid
      />
      <LoadBoundary key={source.kind === "demo" ? "demo" : source.url} onError={onLoadError}>
        <Suspense fallback={null}>
          {source.kind === "demo" && <DemoTwin />}
          {source.kind === "ply" && (
            <Bounds fit clip observe margin={1.2}>
              <PlyModel url={source.url} />
            </Bounds>
          )}
          {source.kind === "splat" && <Splat src={source.url} position={[0, 1, 0]} scale={2} />}
        </Suspense>
      </LoadBoundary>
      <OrbitControls makeDefault target={[0, 1, 0]} enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  );
}
