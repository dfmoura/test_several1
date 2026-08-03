import { AREA_BY_ID, type Step } from '../data/process';

interface Props {
  step: Step;
  onClose: () => void;
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rf-detail-section">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function DetailPanel({ step, onClose }: Props) {
  const area = AREA_BY_ID[step.area];
  return (
    <aside className="rf-detail">
      <div className="rf-detail-glow" style={{ background: area.glow }} />
      <button className="rf-detail-close" onClick={onClose} aria-label="Fechar">
        ×
      </button>
      <div className="rf-detail-head">
        <span className="rf-detail-icon">{step.icon}</span>
        <div>
          <h3>{step.title}</h3>
          <div className="rf-detail-meta">
            <span className="rf-area-badge" style={{ background: area.color, color: '#0b0a12' }}>
              {area.label}
            </span>
            {step.details.prefixo && (
              <span className="rf-code-badge">{step.details.prefixo}</span>
            )}
            {step.details.modulo && (
              <span className="rf-code-badge">{step.details.modulo}</span>
            )}
          </div>
        </div>
      </div>
      <p className="rf-detail-desc">{step.details.descricao}</p>
      <Section title="Entradas" items={step.details.entradas} />
      <Section title="Saídas" items={step.details.saidas} />
      <Section title="Documentos / fontes" items={step.details.documentos} />
    </aside>
  );
}
