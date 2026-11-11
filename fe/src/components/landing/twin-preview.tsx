/**
 * Ilustrasi isometrik Visual Twin: zona jalur kunjungan (jalan -> kasir) sebagai
 * "platform" di atas grid, dengan titik ragu terbesar di tangga.
 * Skematik, bukan render 3D sungguhan.
 */

const W = 960;
const H = 470;
const UNIT = 28;
const CX = Math.cos(Math.PI / 6) * UNIT;
const CY = Math.sin(Math.PI / 6) * UNIT;
const OX = 330;
const OY = 24;
const SLAB = 12;

type Pt = readonly [number, number];

function iso(gx: number, gy: number, gz = 0): Pt {
  return [OX + (gx - gy) * CX, OY + (gx + gy) * CY - gz];
}

const pts = (list: Pt[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

type Zone = {
  id: string;
  label: string;
  gx: number;
  gy: number;
  size: number;
  hot?: boolean;
  chip?: string;
};

const ZONES: Zone[] = [
  { id: "jalan", label: "Jalan depan", gx: 0, gy: 3, size: 4, chip: "500 agen lewat" },
  { id: "tangga", label: "Pintu / tangga", gx: 6, gy: 4, size: 4, hot: true },
  { id: "menu", label: "Area menu", gx: 12, gy: 2, size: 4 },
  { id: "kasir", label: "Kasir", gx: 18, gy: 4, size: 4 },
];

function center(z: Zone, gz = SLAB): Pt {
  return iso(z.gx + z.size / 2, z.gy + z.size / 2, gz);
}

function Slab({ z }: { z: Zone }) {
  const { gx, gy, size: s } = z;
  const top = [iso(gx, gy, SLAB), iso(gx + s, gy, SLAB), iso(gx + s, gy + s, SLAB), iso(gx, gy + s, SLAB)];
  const left = [iso(gx, gy + s, SLAB), iso(gx + s, gy + s, SLAB), iso(gx + s, gy + s, 0), iso(gx, gy + s, 0)];
  const right = [iso(gx + s, gy, SLAB), iso(gx + s, gy + s, SLAB), iso(gx + s, gy + s, 0), iso(gx + s, gy, 0)];
  const inset = 0.45;
  const inner = [
    iso(gx + inset, gy + inset, SLAB),
    iso(gx + s - inset, gy + inset, SLAB),
    iso(gx + s - inset, gy + s - inset, SLAB),
    iso(gx + inset, gy + s - inset, SLAB),
  ];
  return (
    <g strokeLinejoin="round">
      <polygon points={pts(left)} fill="#f3f4f6" stroke="#dcdfe4" />
      <polygon points={pts(right)} fill="#e9ebef" stroke="#dcdfe4" />
      <polygon points={pts(top)} fill="#ffffff" stroke="#dcdfe4" />
      <polygon points={pts(inner)} fill={z.hot ? "#fdf3f2" : "#fbfbfc"} stroke={z.hot ? "#f1c9c5" : "#eceef1"} />
    </g>
  );
}

function Grid({ uid }: { uid: string }) {
  const lines: [Pt, Pt][] = [];
  for (let gx = -6; gx <= 28; gx += 1) lines.push([iso(gx, -6), iso(gx, 16)]);
  for (let gy = -6; gy <= 16; gy += 1) lines.push([iso(-6, gy), iso(28, gy)]);
  return (
    <g stroke="#eceef1" strokeWidth="1" mask={`url(#${uid}-fade)`}>
      {lines.map(([a, b], i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
      ))}
    </g>
  );
}

function pct([x, y]: Pt) {
  return { left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` };
}

export function TwinPreview({ className = "", uid = "twin" }: { className?: string; uid?: string }) {
  const [a, b, c, d] = ZONES.map((z) => center(z));
  const hot = ZONES[1];
  const [hx, hy] = center(hot);

  return (
    <div className={`overflow-hidden ${className}`}>
      {/* Di layar kecil: perbesar dan potong grid kosong kiri-kanan */}
      <div className="relative ml-[-24%] w-[150%] sm:ml-0 sm:w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Ilustrasi Visual Twin: jalur pengunjung dari jalan ke kasir, titik ragu terbesar di tangga"
        >
          <defs>
            <radialGradient id={`${uid}-fade-g`} cx="50%" cy="50%" r="60%">
              <stop offset="55%" stopColor="#fff" />
              <stop offset="100%" stopColor="#000" />
            </radialGradient>
            <mask id={`${uid}-fade`}>
              <rect width={W} height={H} fill={`url(#${uid}-fade-g)`} />
            </mask>
            <radialGradient id={`${uid}-heat`}>
              <stop offset="0%" stopColor="#c2453a" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#c2453a" stopOpacity="0" />
            </radialGradient>
          </defs>

          <Grid uid={uid} />

          {/* Penghubung antar zona: jalur yang dilalui (biru) lalu yang sering ditinggalkan (putus-putus) */}
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#3466e5" strokeWidth="2.5" strokeLinecap="round" />
          <g stroke="#c3cad3" strokeWidth="1.5" strokeDasharray="5 5" className="path-flow">
            <line x1={b[0]} y1={b[1]} x2={c[0]} y2={c[1]} />
            <line x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} />
          </g>

          {ZONES.map((z) => (
            <Slab key={z.id} z={z} />
          ))}

          {/* Peta panas + pin */}
          <ellipse cx={hx} cy={hy} rx="78" ry="45" fill={`url(#${uid}-heat)`} />
          {ZONES.map((z) => {
            const [x, y] = center(z);
            return (
              <g key={z.id}>
                {z.hot && <circle className="pulse-ring" cx={x} cy={y} r="9" fill="none" stroke="#c2453a" strokeWidth="1.5" />}
                <circle cx={x} cy={y} r="5.5" fill="#fff" stroke={z.hot ? "#c2453a" : "#3466e5"} strokeWidth="2.5" />
              </g>
            );
          })}
        </svg>

        {/* Label HTML agar tajam */}
        <div className="pointer-events-none absolute inset-0 font-mono text-[10px] sm:text-[11px]">
          {ZONES.map((z) => {
            const [x, y] = iso(z.gx + z.size, z.gy + z.size, 0);
            return (
              <span
                key={z.id}
                className="absolute -translate-x-1/2 translate-y-2 whitespace-nowrap text-muted"
                style={pct([x - CX * 1.6, y])}
              >
                {z.label}
              </span>
            );
          })}
          <span
            className="absolute hidden -translate-x-1/2 translate-y-[-160%] items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-white px-2 py-0.5 text-ink sm:inline-flex"
            style={pct(center(ZONES[0]))}
          >
            <span className="size-1.5 rounded-full bg-primary-40" />
            {ZONES[0].chip}
          </span>
          <span
            className="absolute inline-flex -translate-x-1/2 translate-y-[-170%] items-center gap-1.5 whitespace-nowrap rounded-full border border-friction/30 bg-white px-2 py-0.5 text-friction"
            style={pct([hx, hy])}
          >
            <span className="size-1.5 rounded-full bg-friction" />
            Naik tangga 24% <span className="text-subtle">[20–28%]</span>
          </span>
        </div>
      </div>
    </div>
  );
}
