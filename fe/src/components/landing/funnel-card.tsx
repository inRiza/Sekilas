import { Reveal } from "./reveal";

type Step = { label: string; value: number; range: string; friction?: boolean };

// Contoh dari layar Laporan di Figma. Ilustrasi, bukan data nyata.
const STEPS: Step[] = [
  { label: "Melihat dari jalan", value: 100, range: "500 agen" },
  { label: "Tertarik & berhenti", value: 72, range: "68–76%" },
  { label: "Naik tangga / masuk", value: 24, range: "20–28%", friction: true },
  { label: "Memesan", value: 19, range: "16–22%" },
  { label: "Kembali lagi", value: 12, range: "9–15%" },
];

export function FunnelCard({ className = "" }: { className?: string }) {
  return (
    <Reveal className={`rounded-[10px] border border-line bg-white ${className}`}>
      <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
        <p className="text-sm font-medium text-ink">Corong pengunjung</p>
        <p className="font-mono text-[11px] text-subtle">n = 500 · normal</p>
      </div>
      <ul className="space-y-4 px-5 py-5">
        {STEPS.map((step) => (
          <li key={step.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className={step.friction ? "font-medium text-friction" : "text-ink-soft"}>
                {step.label}
                {step.friction && (
                  <span className="ml-2 inline-block rounded-sm bg-friction-10 px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.06em]">
                    gesekan terbesar
                  </span>
                )}
              </span>
              <span className="shrink-0 whitespace-nowrap font-mono text-[12px]">
                <span className={step.friction ? "text-friction" : "text-ink"}>{step.value}%</span>{" "}
                <span className="text-subtle">[{step.range}]</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-hairline">
              <div
                className={`funnel-fill h-full rounded-full ${step.friction ? "bg-friction" : "bg-primary-40"}`}
                style={{ width: `${step.value}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
