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
          className="rf-handle"
        />
      ))}
    </>
  );
}

export function StepNode({ data }: NodeProps<Node<StepNodeData>>) {
  const { step } = data;
  const area = AREA_BY_ID[step.area];
  return (
    <div
      className="rf-card rf-step"
      style={
        {
          '--accent': area.color,
          '--glow': area.glow,
        } as React.CSSProperties
      }
    >
      <Handles />
      <div className="rf-card-shine" />
      <div className="rf-card-depth" />
      {step.start && <span className="rf-start-badge">início</span>}
      {step.details.prefixo && <span className="rf-prefix">{step.details.prefixo}</span>}
      <div className="rf-step-head">
        <span className="rf-step-icon">{step.icon}</span>
        <span className="rf-step-title">{step.title}</span>
      </div>
      <div className="rf-step-area">{area.label}</div>
    </div>
  );
}

export function ModuleNode({ data }: NodeProps<Node<StepNodeData>>) {
  const { step } = data;
  const area = AREA_BY_ID[step.area];
  return (
    <div
      className="rf-card rf-module"
      style={
        {
          '--accent': area.color,
          '--glow': area.glow,
        } as React.CSSProperties
      }
    >
      <Handles />
      <div className="rf-card-shine" />
      <div className="rf-card-depth" />
      {step.start && <span className="rf-start-badge">base</span>}
      <div className="rf-step-head">
        <span className="rf-step-icon">{step.icon}</span>
        <span className="rf-step-title">{step.title}</span>
      </div>
      <div className="rf-step-area">
        {step.details.modulo ?? area.label}
      </div>
    </div>
  );
}

export function GatewayNode({ data }: NodeProps<Node<StepNodeData>>) {
  const { step } = data;
  return (
    <div className="rf-gateway">
      <Handles />
      <div className="rf-gateway-diamond">
        <div className="rf-gateway-face" />
        <div className="rf-gateway-side" />
      </div>
      <div className="rf-gateway-label">{step.title}</div>
    </div>
  );
}

export function StoreNode({ data }: NodeProps<Node<StepNodeData>>) {
  const { step } = data;
  const area = AREA_BY_ID[step.area];
  return (
    <div
      className="rf-card rf-store"
      style={
        {
          '--accent': area.color,
          '--glow': area.glow,
        } as React.CSSProperties
      }
    >
      <Handles />
      <div className="rf-card-shine" />
      <div className="rf-store-lid" />
      <div className="rf-step-head">
        <span className="rf-step-icon">{step.icon}</span>
        <span className="rf-step-title">{step.title}</span>
      </div>
      <div className="rf-step-area">entra · sai · retorna</div>
    </div>
  );
}

export function TerminalNode({ data }: NodeProps<Node<StepNodeData>>) {
  const { step } = data;
  return (
    <div className="rf-terminal">
      <Handles />
      <span className="rf-step-icon">{step.icon}</span>
      <span>{step.title}</span>
    </div>
  );
}

export function LaneNode({ data }: NodeProps<Node<LaneNodeData>>) {
  const { area } = data;
  return (
    <div
      className="rf-lane"
      style={
        {
          width: LANE_WIDTH,
          height: area.height,
          '--accent': area.color,
          '--glow': area.glow,
        } as React.CSSProperties
      }
    >
      <div className="rf-lane-glass" />
      <div className="rf-lane-label">{area.label}</div>
    </div>
  );
}
