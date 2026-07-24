"use client";

type Props = {
  message: string;
};

export function ErrorAlert({ message }: Props) {
  if (!message) return null;
  return <div className="alert alert-error">{message}</div>;
}

export function LoadingBlock({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="empty-state" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      <span className="spinner" style={{ width: "1.75rem", height: "1.75rem" }} />
      <span>{label}</span>
    </div>
  );
}
