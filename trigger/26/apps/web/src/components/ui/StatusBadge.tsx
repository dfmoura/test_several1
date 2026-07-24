"use client";

import { statusLabel, statusTone } from "@/lib/format";

const toneClass: Record<ReturnType<typeof statusTone>, string> = {
  neutral: "badge-neutral",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  info: "badge-info",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone(status);
  return <span className={`badge ${toneClass[tone]}`}>{statusLabel(status)}</span>;
}
