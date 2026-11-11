/**
 * Ilustrasi skematik Visual Twin: jalur kunjungan dari jalan ke kasir,
 * dengan zona, pin kejadian, dan peta panas titik ragu. Bukan render 3D sungguhan.
 */

const ZONES = [
  { id: "jalan", label: "Jalan depan", x: 70, y: 214 },
  { id: "tangga", label: "Pintu / tangga", x: 196, y: 150 },
  { id: "menu", label: "Area menu", x: 318, y: 96 },
  { id: "kasir", label: "Kasir", x: 430, y: 52 },
];

const PATH = "M40 240 L120 196 L196 150 L262 122 L318 96 L380 70 L440 44";

export function TwinPreview({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-primary-10 ${className}`}>
      <svg
        viewBox="0 0 480 280"
        className="block h-auto w-full"
        role="img"
        aria-label="Ilustrasi Visual Twin: jalur pengunjung dari jalan ke kasir, titik ragu terbesar di tangga"
      >
        <defs>
          <pattern id="iso-grid" width="32" height="18" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)">
            <path d="M32 0H0V18" fill="none" stroke="#c9d8fd" strokeWidth="1" />
          </pattern>
          <radialGradient id="heat-hi">
            <stop offset="0%" stopColor="#e11d48" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="heat-lo">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Lantai isometrik */}
        <polygon points="20,250 250,120 470,30 470,280 20,280" fill="url(#iso-grid)" opacity="0.9" />

        {/* Bangunan: blok sederhana */}
        <g fill="#ffffff" stroke="#c9d8fd">
          <polygon points="250,40 360,0 470,0 470,30 360,70 250,110" opacity="0.85" />
          <polygon points="160,120 250,80 250,112 160,152" opacity="0.7" />
        </g>

        {/* Peta panas */}
        <circle cx="196" cy="150" r="64" fill="url(#heat-hi)" />
        <circle cx="318" cy="96" r="40" fill="url(#heat-lo)" />

        {/* Jalur kunjungan */}
        <path d={PATH} fill="none" stroke="#3466e5" strokeOpacity="0.25" strokeWidth="10" strokeLinecap="round" />
        <path
          className="path-flow"
          d={PATH}
          fill="none"
          stroke="#3466e5"
          strokeWidth="2.5"
          strokeDasharray="8 4"
          strokeLinecap="round"
        />

        {/* Pin kejadian */}
        {ZONES.map((z) => {
          const hot = z.id === "tangga";
          return (
            <g key={z.id}>
              {hot && <circle className="pulse-ring" cx={z.x} cy={z.y} r="10" fill="none" stroke="#e11d48" strokeWidth="2" />}
              <circle cx={z.x} cy={z.y} r="7" fill="#ffffff" stroke={hot ? "#e11d48" : "#3466e5"} strokeWidth="3" />
            </g>
          );
        })}
      </svg>

      {/* Label zona sebagai HTML agar tajam di semua ukuran */}
      <div className="pointer-events-none absolute inset-0">
        {ZONES.map((z) => {
          const hot = z.id === "tangga";
          return (
            <span
              key={z.id}
              className={`absolute -translate-x-1/2 translate-y-3 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold sm:text-[11px] ${
                hot ? "bg-friction text-white" : "bg-white/90 text-gray-60 ring-1 ring-gray-20"
              }`}
              style={{ left: `${(z.x / 480) * 100}%`, top: `${(z.y / 280) * 100}%` }}
            >
              {z.label}
            </span>
          );
        })}
      </div>

      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-primary-50 ring-1 ring-primary-20">
        <span className="size-1.5 rounded-full bg-primary-40" />
        Visual Twin
      </div>
    </div>
  );
}
