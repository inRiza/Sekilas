"use client";

import { Grid, Html, Line, OrbitControls, Splat } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Component, Suspense, use, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";

import { walkInput, type NavMode } from "./walk-input";

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
const ZONES: { id: string; label: string; at: V3; cam: V3; target: V3; hot?: boolean }[] = [
  { id: "jalan", label: "Jalan depan", at: [-6.5, 0.2, 2.6], cam: [-8.4, 2.5, 6.2], target: [-5.8, 0.4, 1.8] },
  { id: "tangga", label: "Dasar tangga", at: [-1, 0.2, 1.3], cam: [-2.8, 2.6, 4.6], target: [-0.8, 0.5, 0.4], hot: true },
  { id: "menu", label: "Area menu", at: [3.6, 2.3, 0.2], cam: [2.2, 4.0, 3.2], target: [3.6, 2.2, -1.2] },
  { id: "kasir", label: "Kasir", at: [6.4, 2.3, -0.4], cam: [4.2, 4.0, 2.8], target: [6.0, 2.2, -1.4] },
];

function normalizeWaypointKey(raw?: string | null): "jalan" | "tangga" | "menu" | "kasir" | null {
  if (!raw) return null;
  const k = raw.toLowerCase();
  if (k.includes("jalan") || k === "wp_1" || k === "1") return "jalan";
  if (k.includes("tangga") || k.includes("pintu") || k === "wp_2" || k === "2") return "tangga";
  if (k.includes("menu")) return "menu";
  if (k.includes("kasir") || k.includes("pesan") || k.includes("dalam") || k === "wp_3" || k === "3") return "kasir";
  return null;
}

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

function DemoTwin({
  activeWaypoint,
  onSelectWaypoint,
}: {
  activeWaypoint?: string | null;
  onSelectWaypoint?: (id: string) => void;
}) {
  const geometry = useDemoCloud();
  const normalizedActive = normalizeWaypointKey(activeWaypoint);
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
      {ZONES.map((z) => {
        const isSelected = normalizedActive === z.id;
        return (
          <Html key={z.label} position={z.at} center zIndexRange={[10, 0]}>
            <button
              type="button"
              onClick={() => onSelectWaypoint?.(z.id)}
              className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] transition shadow-xs ${
                isSelected
                  ? "border-primary-40 bg-primary-40 text-white font-semibold scale-105"
                  : z.hot
                    ? "border-friction/30 bg-white text-friction hover:bg-friction-10"
                    : "border-line bg-white/90 text-muted hover:text-ink"
              }`}
            >
              {z.label}
            </button>
          </Html>
        );
      })}
    </group>
  );
}

/* ---------- File hasil ns-export ---------- */

/**
 * Awan titik COLMAP renggang punya titik nyasar jauh dari objek; tanpa dibuang,
 * bingkai kamera otomatis jadi terlalu jauh. Simpan titik dalam 95% jarak terdekat
 * dari median (dengan kelonggaran 1,5x).
 */
function dropOutliers(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = source.getAttribute("position");
  const n = pos.count;
  if (source.index || n < 100) return source;

  const median = (axis: number) => {
    const values = Array.from({ length: n }, (_, i) => pos.getComponent(i, axis)).sort((a, b) => a - b);
    return values[Math.floor(n / 2)];
  };
  const center = new THREE.Vector3(median(0), median(1), median(2));
  const p = new THREE.Vector3();
  const dist = Array.from({ length: n }, (_, i) => p.fromBufferAttribute(pos, i).distanceTo(center));
  const limit = [...dist].sort((a, b) => a - b)[Math.floor(n * 0.95)] * 1.5;

  const keep = dist.flatMap((d, i) => (d <= limit ? [i] : []));
  const filtered = new THREE.BufferGeometry();
  for (const name of Object.keys(source.attributes)) {
    const attr = source.getAttribute(name);
    const out = new Float32Array(keep.length * attr.itemSize);
    keep.forEach((src, dst) => {
      for (let k = 0; k < attr.itemSize; k++) out[dst * attr.itemSize + k] = attr.getComponent(src, k);
    });
    filtered.setAttribute(name, new THREE.BufferAttribute(out, attr.itemSize, attr.normalized));
  }
  return filtered;
}

/** Ketinggian "lantai": persentil 2% proyeksi titik ke arah atas (abaikan titik nyasar). */
function floorAlong(up: THREE.Vector3, count: number, at: (i: number, out: THREE.Vector3) => THREE.Vector3) {
  const step = Math.max(1, Math.floor(count / 20000));
  const p = new THREE.Vector3();
  const heights: number[] = [];
  for (let i = 0; i < count; i += step) heights.push(at(i, p).dot(up));
  heights.sort((a, b) => a - b);
  return heights[Math.floor(heights.length * 0.02)] ?? 0;
}

/* ---------- Splat (.splat antimatter15: 32 byte per splat, posisi 3xfloat32 di depan) ---------- */

type Bounds = { center: [number, number, number]; radius: number; sample: Float32Array };
const splatBoundsCache = new Map<string, Promise<Bounds>>();

function splatBounds(url: string): Promise<Bounds> {
  let promise = splatBoundsCache.get(url);
  if (!promise) {
    promise = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`gagal memuat ${url}`);
        return r.arrayBuffer();
      })
      .then((buf) => {
        const f = new Float32Array(buf, 0, Math.floor(buf.byteLength / 4));
        const n = Math.floor(buf.byteLength / 32);
        const step = Math.max(1, Math.floor(n / 20000));
        const xs: number[] = [];
        const ys: number[] = [];
        const zs: number[] = [];
        for (let i = 0; i < n; i += step) {
          xs.push(f[i * 8]);
          ys.push(f[i * 8 + 1]);
          zs.push(f[i * 8 + 2]);
        }
        const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
        const center: [number, number, number] = [med(xs), med(ys), med(zs)];
        const dist = xs
          .map((x, i) => Math.hypot(x - center[0], ys[i] - center[1], zs[i] - center[2]))
          .sort((a, b) => a - b);
        const sample = new Float32Array(xs.length * 3);
        xs.forEach((x, i) => sample.set([x - center[0], ys[i] - center[1], zs[i] - center[2]], i * 3));
        return { center, radius: Math.max(dist[Math.floor(dist.length * 0.9)] ?? 1, 1e-3), sample };
      });
    splatBoundsCache.set(url, promise);
  }
  return promise;
}

/* ---------- Orientasi: putar model agar tegak ---------- */

// Hasil pipeline lokal punya metadata /samples/<nama>.json berisi "up" (arah atas
// dunia dari orientasi kamera HP). COLMAP tidak tahu gravitasi, jadi tanpa ini model
// tampil miring/terbalik.
type Orientation = { quaternion: THREE.Quaternion; up: THREE.Vector3 };
const orientationCache = new Map<string, Promise<Orientation>>();
const NO_ROTATION: Orientation = { quaternion: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0) };

function orientationFor(url: string): Promise<Orientation> {
  let promise = orientationCache.get(url);
  if (!promise) {
    const meta = url.startsWith("/samples/") ? url.replace(/\.(ply|splat)(\?.*)?$/, ".json") : null;
    promise = (meta ? fetch(meta).then((r) => (r.ok ? r.json() : null)) : Promise.resolve(null))
      .then((data: { up?: number[] } | null) => {
        if (!data?.up || data.up.length !== 3) return NO_ROTATION;
        const up = new THREE.Vector3(data.up[0], data.up[1], data.up[2]).normalize();
        return { quaternion: new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(0, 1, 0)), up };
      })
      .catch(() => NO_ROTATION);
    orientationCache.set(url, promise);
  }
  return promise;
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

/* ---------- Penempatan model: lantai, tegak, berpusat ---------- */

/**
 * Model ditampilkan dengan satu transformasi: titik mentah COLMAP p menjadi
 * T(0, lift, 0) * R(up -> +Y) * (p - center). Jalur kamera memakai matriks yang sama
 * sehingga jatuh tepat di model.
 */
type Placement = { matrix: THREE.Matrix4; quaternion: THREE.Quaternion; radius: number; targetY: number };

function makePlacement(center: THREE.Vector3, quaternion: THREE.Quaternion, lift: number, radius: number): Placement {
  const matrix = new THREE.Matrix4()
    .makeTranslation(0, lift, 0)
    .multiply(new THREE.Matrix4().makeRotationFromQuaternion(quaternion))
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));
  return { matrix, quaternion, radius, targetY: lift };
}

function Placed({ placement, children }: { placement: Placement; children: ReactNode }) {
  return (
    <group matrixAutoUpdate={false} matrix={placement.matrix}>
      {children}
    </group>
  );
}

function PlyModel({ url, onPlacement }: { url: string; onPlacement: (p: Placement) => void }) {
  const { quaternion, up } = use(orientationFor(url));
  const raw = useLoader(PLYLoader, url);
  const geometry = useMemo(() => dropOutliers(raw), [raw]);
  const hasColor = Boolean(geometry.getAttribute("color"));
  const isMesh = Boolean(geometry.index);

  const placement = useMemo(() => {
    if (isMesh && !geometry.getAttribute("normal")) geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
    const pos = geometry.getAttribute("position");
    const floor = floorAlong(up, pos.count, (i, out) => out.fromBufferAttribute(pos, i).sub(center));
    return makePlacement(center, quaternion, -floor, geometry.boundingSphere?.radius ?? 1);
  }, [geometry, isMesh, quaternion, up]);

  useEffect(() => onPlacement(placement), [placement, onPlacement]);

  // Skala koordinat COLMAP/nerfstudio tidak tentu: ukuran titik mengikuti besar model.
  const pointSize = placement.radius * 0.006;
  return (
    <Placed placement={placement}>
      {isMesh ? (
        <mesh geometry={geometry}>
          <meshStandardMaterial vertexColors={hasColor} color={hasColor ? undefined : "#b8bec7"} />
        </mesh>
      ) : (
        <points geometry={geometry}>
          <pointsMaterial size={pointSize} vertexColors={hasColor} color={hasColor ? undefined : "#7d8693"} sizeAttenuation />
        </points>
      )}
    </Placed>
  );
}

function SplatModel({ url, onPlacement }: { url: string; onPlacement: (p: Placement) => void }) {
  const { center, radius, sample } = use(splatBounds(url));
  const { quaternion, up } = use(orientationFor(url));
  const placement = useMemo(() => {
    const floor = floorAlong(up, sample.length / 3, (i, out) => out.fromArray(sample, i * 3));
    return makePlacement(new THREE.Vector3(...center), quaternion, -floor, radius);
  }, [center, quaternion, radius, sample, up]);

  useEffect(() => onPlacement(placement), [placement, onPlacement]);

  return (
    <Placed placement={placement}>
      {/* drei <Splat> merender posisi file sebagai (x, -y, -z) (konvensi .splat
          antimatter15). Putar balik 180° di sumbu X agar sama dengan sistem
          koordinat COLMAP/.ply. */}
      <group rotation={[Math.PI, 0, 0]}>
        <Splat src={url} />
      </group>
    </Placed>
  );
}

/* ---------- Jalur kamera rekaman (samples/<nama>.path.json) ---------- */

type RawPathPoint = { timestamp_s: number; position: { x: number; y: number; z: number }; forward?: number[] };
type PathPoint = { t: number; position: THREE.Vector3; forward: THREE.Vector3 };
const pathCache = new Map<string, Promise<RawPathPoint[]>>();

function pathFor(url: string): Promise<RawPathPoint[]> {
  let promise = pathCache.get(url);
  if (!promise) {
    const file = url.startsWith("/samples/") ? url.replace(/\.(ply|splat)(\?.*)?$/, ".path.json") : null;
    promise = (file ? fetch(file).then((r) => (r.ok ? r.json() : [])) : Promise.resolve([])).catch(() => []);
    pathCache.set(url, promise);
  }
  return promise;
}

/** Jalur dalam koordinat dunia (sudah ditempatkan seperti model). */
function placePath(raw: RawPathPoint[], placement: Placement): PathPoint[] {
  return raw
    .filter((p) => Array.isArray(p.forward) && p.forward.length === 3)
    .map((p) => ({
      t: p.timestamp_s,
      position: new THREE.Vector3(p.position.x, p.position.y, p.position.z).applyMatrix4(placement.matrix),
      forward: new THREE.Vector3(...(p.forward as [number, number, number]))
        .applyQuaternion(placement.quaternion)
        .normalize(),
    }));
}

/* ---------- Navigasi ---------- */


function FrameOrbit({ placement }: { placement: Placement }) {
  const getState = useThree((s) => s.get);
  useEffect(() => {
    const { camera } = getState();
    const controls = getState().controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    const { radius, targetY } = placement;
    camera.position.set(radius * 0.9, targetY + radius * 0.8, radius * 1.6);
    camera.near = radius / 100;
    camera.far = radius * 50;
    camera.updateProjectionMatrix();
    controls?.target.set(0, targetY, 0);
    controls?.update();
  }, [placement, getState]);
  return null;
}

/**
 * Animasi fly-to / orbit mulus saat pengguna mengklik kartu Waypoint (Trotoar, Akses Tangga, Kasir).
 */
function WaypointFlyTo({
  activeWaypoint,
  placement,
  path,
  isDemo,
}: {
  activeWaypoint?: string | null;
  placement?: Placement | null;
  path?: PathPoint[];
  isDemo?: boolean;
}) {
  const getState = useThree((s) => s.get);
  const animRef = useRef<{
    startCam: THREE.Vector3;
    endCam: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    progress: number;
    active: boolean;
  } | null>(null);

  useEffect(() => {
    const key = normalizeWaypointKey(activeWaypoint);
    if (!key) return;

    const { camera } = getState();
    const controls = getState().controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    const currentTarget = controls?.target ? controls.target.clone() : new THREE.Vector3(0, 1, 0);

    let destCam: THREE.Vector3 | null = null;
    let destTarget: THREE.Vector3 | null = null;

    if (isDemo) {
      const zone = ZONES.find((z) => z.id === key) ?? ZONES[0]!;
      destCam = new THREE.Vector3(...zone.cam);
      destTarget = new THREE.Vector3(...zone.target);
    } else if (path && path.length >= 2 && placement) {
      const ratio = key === "jalan" ? 0.08 : key === "tangga" ? 0.48 : key === "menu" ? 0.72 : 0.92;
      const idx = Math.min(path.length - 1, Math.max(0, Math.floor(ratio * (path.length - 1))));
      const pt = path[idx]!;
      const r = placement.radius;
      destTarget = pt.position.clone().addScaledVector(pt.forward, r * 0.22);
      destCam = pt.position
        .clone()
        .addScaledVector(pt.forward, -r * 0.35)
        .add(new THREE.Vector3(r * 0.2, r * 0.22, r * 0.2));
    } else if (placement) {
      const { radius: r, targetY } = placement;
      if (key === "jalan") {
        destTarget = new THREE.Vector3(-r * 0.45, targetY, r * 0.35);
        destCam = new THREE.Vector3(-r * 0.95, targetY + r * 0.55, r * 1.25);
      } else if (key === "tangga") {
        destTarget = new THREE.Vector3(0, targetY + r * 0.05, 0);
        destCam = new THREE.Vector3(r * 0.45, targetY + r * 0.5, r * 0.95);
      } else {
        destTarget = new THREE.Vector3(r * 0.4, targetY + r * 0.15, -r * 0.25);
        destCam = new THREE.Vector3(r * 0.85, targetY + r * 0.6, r * 0.65);
      }
    }

    if (destCam && destTarget) {
      animRef.current = {
        startCam: camera.position.clone(),
        endCam: destCam,
        startTarget: currentTarget,
        endTarget: destTarget,
        progress: 0,
        active: true,
      };
    }
  }, [activeWaypoint, getState, isDemo, path, placement]);

  useFrame(({ camera }, dt) => {
    const anim = animRef.current;
    if (!anim || !anim.active) return;

    anim.progress = Math.min(1, anim.progress + Math.min(dt, 0.05) * 1.8);
    // Ease out cubic
    const t = 1 - Math.pow(1 - anim.progress, 3);

    camera.position.lerpVectors(anim.startCam, anim.endCam, t);
    const controls = getState().controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    if (controls?.target) {
      controls.target.lerpVectors(anim.startTarget, anim.endTarget, t);
      controls.update();
    } else {
      const lookPos = new THREE.Vector3().lerpVectors(anim.startTarget, anim.endTarget, t);
      camera.lookAt(lookPos);
    }

    if (anim.progress >= 1) {
      anim.active = false;
    }
  });

  return null;
}

function lookAlong(camera: THREE.Camera, forward: THREE.Vector3) {
  camera.up.set(0, 1, 0);
  camera.lookAt(camera.position.clone().add(forward));
}

function WalkControls({ radius, start }: { radius: number; start?: PathPoint }) {
  const getState = useThree((s) => s.get);
  const keys = useRef(new Set<string>());
  const angles = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    const { camera, gl } = getState();
    if (start) {
      camera.position.copy(start.position);
      lookAlong(camera, start.forward);
    }
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    angles.current = { yaw: e.y, pitch: e.x };
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.near = radius / 1000;
      camera.far = radius * 50;
      camera.updateProjectionMatrix();
    }

    const typing = (t: EventTarget | null) => t instanceof HTMLElement && /input|textarea|select/i.test(t.tagName);
    const down = (ev: KeyboardEvent) => {
      if (typing(ev.target)) return;
      keys.current.add(ev.code);
      if (ev.code.startsWith("Arrow")) ev.preventDefault();
    };
    const up = (ev: KeyboardEvent) => keys.current.delete(ev.code);
    let drag: { x: number; y: number } | null = null;
    const pdown = (ev: PointerEvent) => {
      drag = { x: ev.clientX, y: ev.clientY };
      gl.domElement.setPointerCapture(ev.pointerId);
    };
    const pmove = (ev: PointerEvent) => {
      if (!drag) return;
      angles.current.yaw -= (ev.clientX - drag.x) * 0.004;
      angles.current.pitch = THREE.MathUtils.clamp(angles.current.pitch - (ev.clientY - drag.y) * 0.004, -1.4, 1.4);
      drag = { x: ev.clientX, y: ev.clientY };
    };
    const pup = () => (drag = null);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    gl.domElement.addEventListener("pointerdown", pdown);
    gl.domElement.addEventListener("pointermove", pmove);
    gl.domElement.addEventListener("pointerup", pup);
    const pressed = keys.current;
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      gl.domElement.removeEventListener("pointerdown", pdown);
      gl.domElement.removeEventListener("pointermove", pmove);
      gl.domElement.removeEventListener("pointerup", pup);
      pressed.clear();
    };
  }, [getState, radius, start]);

  useFrame(({ camera }, dt) => {
    const k = keys.current;
    const { yaw, pitch } = angles.current;
    camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
    const fwd = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) + walkInput.forward;
    const right = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0) + walkInput.right;
    const lift = (k.has("KeyE") ? 1 : 0) - (k.has("KeyQ") ? 1 : 0) + walkInput.up;
    if (!fwd && !right && !lift) return;
    const speed = radius * 0.25 * (k.has("ShiftLeft") || k.has("ShiftRight") ? 3 : 1) * Math.min(dt, 0.1);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const side = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
    camera.position
      .addScaledVector(dir, fwd * speed)
      .addScaledVector(side, right * speed)
      .addScaledVector(new THREE.Vector3(0, 1, 0), lift * speed);
  });
  return null;
}

function TourControls({
  path,
  radius,
  playing,
  onProgress,
}: {
  path: PathPoint[];
  radius: number;
  playing: boolean;
  onProgress?: (u: number) => void;
}) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(path.map((p) => p.position)), [path]);
  const duration = Math.max(1, path[path.length - 1].t - path[0].t);
  const elapsed = useRef(0);
  const smoothFwd = useRef(path[0].forward.clone());
  const lastReport = useRef(0);
  const getState = useThree((s) => s.get);

  useEffect(() => {
    const { camera } = getState();
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.near = radius / 1000;
      camera.far = radius * 50;
      camera.updateProjectionMatrix();
    }
  }, [getState, radius]);

  useFrame(({ camera }, dt) => {
    if (playing) elapsed.current = (elapsed.current + Math.min(dt, 0.1)) % duration;
    const u = elapsed.current / duration;
    camera.position.copy(curve.getPoint(u));
    // Arah pandang = arah HP saat merekam, dihaluskan agar tidak bergetar.
    const f = u * (path.length - 1);
    const i = Math.floor(f);
    const target = path[i].forward.clone().lerp(path[Math.min(i + 1, path.length - 1)].forward, f - i).normalize();
    smoothFwd.current.lerp(target, Math.min(1, dt * 4)).normalize();
    lookAlong(camera, smoothFwd.current);
    const now = performance.now();
    if (onProgress && now - lastReport.current > 200) {
      lastReport.current = now;
      onProgress(u);
    }
  });
  return null;
}

/* ---------- Panggung model + navigasi ---------- */

function ModelStage({
  source,
  mode,
  tourPlaying,
  activeWaypoint,
  onSelectWaypoint,
  onTourProgress,
  onPathAvailable,
}: {
  source: Exclude<TwinSource, { kind: "demo" }>;
  mode: NavMode;
  tourPlaying: boolean;
  activeWaypoint?: string | null;
  onSelectWaypoint?: (id: string) => void;
  onTourProgress?: (u: number) => void;
  onPathAvailable?: (available: boolean) => void;
}) {
  const [placement, setPlacement] = useState<Placement | null>(null);
  const rawPath = use(pathFor(source.url));
  const path = useMemo(() => (placement ? placePath(rawPath, placement) : []), [rawPath, placement]);
  const hasPath = path.length >= 2;
  const normalizedActive = normalizeWaypointKey(activeWaypoint);

  useEffect(() => onPathAvailable?.(hasPath), [hasPath, onPathAvailable]);

  const modelPinNodes = useMemo(() => {
    if (!placement) return [];
    if (hasPath) {
      const pJalan = path[Math.floor((path.length - 1) * 0.08)]!;
      const pTangga = path[Math.floor((path.length - 1) * 0.48)]!;
      const pKasir = path[Math.floor((path.length - 1) * 0.92)]!;
      return [
        { id: "jalan", label: "Trotoar Depan", pos: pJalan.position, hot: false },
        { id: "tangga", label: "Titik Friksi", pos: pTangga.position, hot: true },
        { id: "kasir", label: "Titik Kasir", pos: pKasir.position, hot: false },
      ];
    }
    const r = placement.radius;
    const y = placement.targetY + r * 0.12;
    return [
      { id: "jalan", label: "Trotoar Depan", pos: new THREE.Vector3(-r * 0.45, y, r * 0.35), hot: false },
      { id: "tangga", label: "Titik Friksi", pos: new THREE.Vector3(0, y, 0), hot: true },
      { id: "kasir", label: "Titik Kasir", pos: new THREE.Vector3(r * 0.4, y, -r * 0.25), hot: false },
    ];
  }, [placement, hasPath, path]);

  return (
    <>
      {source.kind === "ply" ? (
        <PlyModel url={source.url} onPlacement={setPlacement} />
      ) : (
        <SplatModel url={source.url} onPlacement={setPlacement} />
      )}
      {placement && mode === "putar" && hasPath && (
        <Line points={path.map((p) => p.position)} color="#3466e5" lineWidth={2} transparent opacity={0.6} />
      )}
      {placement &&
        mode === "putar" &&
        modelPinNodes.map((pin) => {
          const isSelected = normalizedActive === pin.id;
          return (
            <Html key={pin.id} position={[pin.pos.x, pin.pos.y, pin.pos.z]} center zIndexRange={[10, 0]}>
              <button
                type="button"
                onClick={() => onSelectWaypoint?.(pin.id)}
                className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] transition shadow-xs ${
                  isSelected
                    ? "border-primary-40 bg-primary-40 text-white font-semibold scale-105"
                    : pin.hot
                      ? "border-friction/30 bg-white text-friction hover:bg-friction-10"
                      : "border-line bg-white/90 text-muted hover:text-ink"
                }`}
              >
                {pin.label}
              </button>
            </Html>
          );
        })}
      {placement && mode === "putar" && (
        <>
          <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.05} />
          <FrameOrbit placement={placement} />
          <WaypointFlyTo activeWaypoint={activeWaypoint} placement={placement} path={path} />
        </>
      )}
      {placement && mode === "jalan" && <WalkControls radius={placement.radius} start={hasPath ? path[0] : undefined} />}
      {placement && mode === "tur" && hasPath && (
        <TourControls path={path} radius={placement.radius} playing={tourPlaying} onProgress={onTourProgress} />
      )}
    </>
  );
}

/* ---------- Canvas ---------- */

export default function TwinScene({
  source,
  onLoadError,
  mode = "putar",
  tourPlaying = true,
  activeWaypoint,
  onSelectWaypoint,
  onTourProgress,
  onPathAvailable,
}: {
  source: TwinSource;
  onLoadError: () => void;
  mode?: NavMode;
  tourPlaying?: boolean;
  activeWaypoint?: string | null;
  onSelectWaypoint?: (id: string) => void;
  onTourProgress?: (u: number) => void;
  onPathAvailable?: (available: boolean) => void;
}) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0.5, 11, 20.5], fov: 50 }} gl={{ antialias: true }}>
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
          {source.kind === "demo" ? (
            <>
              <DemoTwin activeWaypoint={activeWaypoint} onSelectWaypoint={onSelectWaypoint} />
              {mode === "jalan" ? (
                <WalkControls radius={10} />
              ) : (
                <>
                  <OrbitControls makeDefault target={[0, 1, 0]} enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.05} />
                  <WaypointFlyTo activeWaypoint={activeWaypoint} isDemo />
                </>
              )}
            </>
          ) : (
            <ModelStage
              source={source}
              mode={mode}
              tourPlaying={tourPlaying}
              activeWaypoint={activeWaypoint}
              onSelectWaypoint={onSelectWaypoint}
              onTourProgress={onTourProgress}
              onPathAvailable={onPathAvailable}
            />
          )}
        </Suspense>
      </LoadBoundary>
    </Canvas>
  );
}
