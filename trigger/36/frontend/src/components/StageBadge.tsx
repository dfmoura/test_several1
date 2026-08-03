interface StageBadgeProps {
  codigo: string;
  ordem?: number;
}

export function StageBadge({ codigo, ordem }: StageBadgeProps) {
  return (
    <span className="stage-badge">
      {ordem !== undefined ? `${ordem} · ` : ''}
      {codigo}
    </span>
  );
}
