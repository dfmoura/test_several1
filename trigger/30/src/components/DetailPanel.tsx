import { AREA_BY_ID, type Step } from '../data/process';

interface Props {
  step: Step;
  onClose: () => void;
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="ff-detail-section">
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
    <aside className="ff-detail">
      <button className="ff-detail-close" onClick={onClose} aria-label="Fechar">
        ×
      </button>
      <div className="ff-detail-head">
        <span className="ff-detail-icon">{step.icon}</span>
        <div>
          <h3>{step.title}</h3>
          <span className="ff-area-badge" style={{ background: area.color }}>
            {area.label}
          </span>
        </div>
      </div>
      <p className="ff-detail-desc">{step.details.descricao}</p>
      <Section title="Entradas" items={step.details.entradas} />
      <Section title="Saídas" items={step.details.saidas} />
      <Section title="Documentos / registros" items={step.details.documentos} />
    </aside>
  );
}
