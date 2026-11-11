import { Reveal } from "./reveal";

type Step = {
  label: string;
  value: number;
  range: string;
  friction?: boolean;
  tone?: "primary" | "soft" | "impact";
};

// Contoh dari layar Laporan di Figma. Ilustrasi, bukan data nyata.
const STEPS: Step[] = [
  { label: "Melihat dari jalan", value: 100, range: "500 agen" },
  { label: "Tertarik & berhenti", value: 72, range: "68–76%" },
  { label: "Naik tangga / masuk", value: 24, range: "20–28%", friction: true },
  { label: "Memesan di meja", value: 19, range: "16–22%", tone: "soft" },
  { label: "Kembali lagi", value: 12, range: "9–15%", tone: "impact" },
];

const FILL = {
  primary: "bg-primary-40",
  soft: "bg-primary-40/60",
  impact: "bg-impact",
} as const;

export function FunnelCard({ className = "" }: { className?: string }) {
  return (
    <Reveal
      className={`rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-gray-20 ${className}`}
    >
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <p className="text-sm font-semibold text-gray-70">Corong pengunjung</p>
        <p className="text-xs text-gray-30">Simulasi 500 agen</p>
      </div>

      <ul className="space-y-3.5">
        {STEPS.map((step) =>
          step.friction ? (
            <li key={step.label} className="rounded-xl bg-friction-10 p-3 ring-1 ring-friction/20">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-friction">{step.label}</span>
                <span className="rounded-full bg-friction px-2 py-0.5 text-[10px] font-semibold text-white">
                  Gesekan terbesar
                </span>
              </div>
              <Bar value={step.value} className="bg-friction" track="bg-white" />
              <p className="mt-2 flex justify-between text-xs text-gray-50">
                <span>Konversi masuk</span>
                <span>
                  <b className="font-semibold text-friction">{step.value}%</b>{" "}
                  <span className="text-gray-30">[{step.range}]</span>
                </span>
              </p>
            </li>
          ) : (
            <li key={step.label}>
              <p className="mb-1.5 flex justify-between text-[13px] text-gray-60">
                <span>{step.label}</span>
                <span>
                  <b className="font-semibold text-gray-70">{step.value}%</b>{" "}
                  <span className="text-xs text-gray-30">[{step.range}]</span>
                </span>
              </p>
              <Bar value={step.value} className={FILL[step.tone ?? "primary"]} />
            </li>
          ),
        )}
      </ul>
    </Reveal>
  );
}

function Bar({ value, className, track = "bg-gray-10" }: { value: number; className: string; track?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full ${track}`}>
      <div className={`funnel-fill h-full rounded-full ${className}`} style={{ width: `${value}%` }} />
    </div>
  );
}
