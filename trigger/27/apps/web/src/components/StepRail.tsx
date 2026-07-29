"use client";

import Link from "next/link";

export type StepRailState = "done" | "current" | "pending" | "blocked";

export type StepRailItem = {
  id: string;
  label: string;
  detail?: string;
  state: StepRailState;
  at?: string | null;
  href?: string;
};

function fmtWhen(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StepRail({
  steps,
  ariaLabel = "Etapas",
  columns,
  className = "",
}: {
  steps: StepRailItem[];
  ariaLabel?: string;
  /** Override CSS columns (default = steps.length). */
  columns?: number;
  className?: string;
}) {
  const cols = columns ?? steps.length;
  return (
    <nav
      className={`fluxo-rail ${className}`.trim()}
      aria-label={ariaLabel}
      style={{ ["--fluxo-cols" as string]: String(cols) }}
    >
      {steps.map((et, i) => {
        const body = (
          <div className="fluxo-node">
            <span className="fluxo-dot" />
            <div className="fluxo-copy">
              <strong>{et.label}</strong>
              {et.detail != null && et.detail !== "" && <span>{et.detail}</span>}
              {et.at && <small>{fmtWhen(et.at)}</small>}
            </div>
          </div>
        );
        return (
          <div key={et.id} className={`fluxo-step fluxo-${et.state}`}>
            {i > 0 && <div className="fluxo-connector" aria-hidden />}
            {et.href ? (
              <Link href={et.href} className="fluxo-link">
                {body}
              </Link>
            ) : (
              body
            )}
          </div>
        );
      })}
    </nav>
  );
}
