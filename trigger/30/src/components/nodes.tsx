import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { AREA_BY_ID, LANE_WIDTH, type Area, type Step } from '../data/process';

export type StepNodeData = { step: Step };
export type LaneNodeData = { area: Area };

const HANDLES: Array<{
  id: string;
  type: 'source' | 'target';
  position: Position;
  style?: React.CSSProperties;
}> = [
  { id: 'ts', type: 'source', position: Position.Top },
  { id: 'rs', type: 'source', position: Position.Right },
  { id: 'bs', type: 'source', position: Position.Bottom },
  { id: 'ls', type: 'source', position: Position.Left },
  { id: 'tt', type: 'target', position: Position.Top },
  { id: 'rt', type: 'target', position: Position.Right },
  { id: 'bt', type: 'target', position: Position.Bottom },
  { id: 'lt', type: 'target', position: Position.Left },
  // Pontos deslocados para setas paralelas de ida e volta (ex.: atividade ↔ estoque)
  { id: 'rsu', type: 'source', position: Position.Right, style: { top: '30%' } },
  { id: 'rtd', type: 'target', position: Position.Right, style: { top: '70%' } },
  { id: 'lsd', type: 'source', position: Position.Left, style: { top: '70%' } },
  { id: 'ltu', type: 'target', position: Position.Left, style: { top: '30%' } },
];

function Handles() {
  return (
    <>
      {HANDLES.map((h) => (
        <Handle
          key={h.id}
          id={h.id}
          type={h.type}
          position={h.position}
          style={h.style}
          className="ff-handle"
        />
      ))}
    </>
  );
}

export function StepNode({ data }: NodeProps<Node<StepNodeData>>) {
  const { step } = data;
  const area = AREA_BY_ID[step.area];
  return (
    <div className="ff-step" style={{ borderLeftColor: area.color }}>
      <Handles />
      {step.start && <span className="ff-start-badge">início</span>}
      <div className="ff-step-head">
        <span className="ff-step-icon">{step.icon}</span>
        <span className="ff-step-title">{step.title}</span>
      </div>
      <div className="ff-step-area" style={{ color: area.color }}>
        {area.label}
      </div>
    </div>
  );
}

export function GatewayNode({ data }: NodeProps<Node<StepNodeData>>) {
  const { step } = data;
  return (
    <div className="ff-gateway">
      <Handles />
      <div className="ff-gateway-shape" />
      <div className="ff-gateway-label">{step.title}</div>
    </div>
  );
}

export function StoreNode({ data }: NodeProps<Node<StepNodeData>>) {
  const { step } = data;
  const area = AREA_BY_ID[step.area];
  return (
    <div className="ff-store" style={{ borderColor: area.color }}>
      <Handles />
      <div className="ff-store-lid" style={{ background: area.color }} />
      <div className="ff-step-head">
        <span className="ff-step-icon">{step.icon}</span>
        <span className="ff-step-title">{step.title}</span>
      </div>
      <div className="ff-step-area" style={{ color: area.color }}>
        entra · sai · retorna
      </div>
    </div>
  );
}

export function TerminalNode({ data }: NodeProps<Node<StepNodeData>>) {
  const { step } = data;
  return (
    <div className="ff-terminal">
      <Handles />
      <span className="ff-step-icon">{step.icon}</span>
      <span>{step.title}</span>
    </div>
  );
}

export function LaneNode({ data }: NodeProps<Node<LaneNodeData>>) {
  const { area } = data;
  return (
    <div
      className="ff-lane"
      style={{ width: LANE_WIDTH, height: area.height, borderColor: `${area.color}33` }}
    >
      <div className="ff-lane-label" style={{ background: area.color }}>
        {area.label}
      </div>
    </div>
  );
}
