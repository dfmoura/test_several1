import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  AREAS,
  AREA_BY_ID,
  FLOWS,
  SCENARIOS,
  STEPS,
  STEP_BY_ID,
  type Step,
} from './data/process';
import { DetailPanel } from './components/DetailPanel';
import { GatewayNode, LaneNode, StepNode, StoreNode, TerminalNode } from './components/nodes';

const LAYOUT_KEY = 'flexoflow-layout-v1';
const FOLLOW_KEY = 'flexoflow-follow-v1';
const STEP_INTERVAL_MS = 900;

const nodeTypes = {
  step: StepNode,
  gateway: GatewayNode,
  store: StoreNode,
  terminal: TerminalNode,
  lane: LaneNode,
};

type SavedLayout = Record<string, { x: number; y: number }>;

function loadLayout(): SavedLayout {
  try {
    return JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function buildNodes(layout: SavedLayout): Node[] {
  const lanes: Node[] = AREAS.map((area) => ({
    id: `lane-${area.id}`,
    type: 'lane',
    position: { x: -150, y: area.y },
    data: { area },
    draggable: false,
    selectable: false,
    zIndex: -10,
  }));
  const steps: Node[] = STEPS.map((step) => ({
    id: step.id,
    type: step.kind,
    position: layout[step.id] ?? { x: step.x, y: step.y },
    data: { step },
    connectable: false,
  }));
  return [...lanes, ...steps];
}

const FLOW_BY_ID = Object.fromEntries(FLOWS.map((f) => [f.id, f]));

function buildEdges(): Edge[] {
  return FLOWS.map((flow) => ({
    id: flow.id,
    source: flow.source,
    target: flow.target,
    sourceHandle: flow.sourceHandle,
    targetHandle: flow.targetHandle,
    label: flow.label,
    type: 'smoothstep',
    style: {
      stroke: '#94a3b8',
      strokeWidth: 1.8,
      strokeDasharray: flow.dashed ? '7 5' : undefined,
    },
    labelStyle: { fill: '#475569', fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.9 },
    labelBgPadding: [6, 3] as [number, number],
    labelBgBorderRadius: 6,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#94a3b8' },
  }));
}

interface SimState {
  scenarioId: string;
  stepIndex: number;
  running: boolean;
}

function FlowMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState(useMemo(() => buildNodes(loadLayout()), []));
  const [edges, setEdges] = useEdgesState(useMemo(buildEdges, []));
  const [selected, setSelected] = useState<Step | null>(null);
  const [sim, setSim] = useState<SimState | null>(null);
  const [follow, setFollow] = useState(() => localStorage.getItem(FOLLOW_KEY) !== 'off');
  const { setCenter, fitView, getNode, getZoom } = useReactFlow();

  const scenario = useMemo(
    () => (sim ? SCENARIOS.find((s) => s.id === sim.scenarioId) ?? null : null),
    [sim],
  );

  // Avança a simulação passo a passo
  useEffect(() => {
    if (!sim || !scenario || !sim.running) return;
    if (sim.stepIndex >= scenario.sequence.length - 1) {
      setSim((s) => (s ? { ...s, running: false } : s));
      return;
    }
    const timer = setTimeout(
      () => setSim((s) => (s ? { ...s, stepIndex: s.stepIndex + 1 } : s)),
      STEP_INTERVAL_MS,
    );
    return () => clearTimeout(timer);
  }, [sim, scenario]);

  // Setas ← / → navegam manualmente pelas etapas (pausam o avanço automático);
  // o foco automático da câmera continua controlado pela flag "Acompanhar fluxo"
  useEffect(() => {
    if (!scenario) return;
    const lastIndex = scenario.sequence.length - 1;
    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.key !== 'ArrowRight' && evt.key !== 'ArrowLeft') return;
      const target = evt.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      evt.preventDefault();
      const delta = evt.key === 'ArrowRight' ? 1 : -1;
      setSim((s) => {
        if (!s) return s;
        const next = Math.min(Math.max(s.stepIndex + delta, 0), lastIndex);
        if (next === s.stepIndex && !s.running) return s;
        return { ...s, stepIndex: next, running: false };
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scenario]);

  // Aplica destaque de simulação nos nós e nas arestas
  useEffect(() => {
    const visited = new Set(scenario && sim ? scenario.sequence.slice(0, sim.stepIndex + 1) : []);
    const current = scenario && sim ? scenario.sequence[sim.stepIndex] : null;
    const excluded = new Set(scenario?.excludeEdges ?? []);
    const active = sim !== null;

    setNodes((ns) =>
      ns.map((n) => {
        if (n.type === 'lane') return n;
        const cls = !active
          ? ''
          : n.id === current
            ? 'ff-current'
            : visited.has(n.id)
              ? 'ff-visited'
              : 'ff-dimmed';
        return n.className === cls ? n : { ...n, className: cls };
      }),
    );

    setEdges((es) =>
      es.map((e) => {
        const lit =
          active && !excluded.has(e.id) && visited.has(e.source) && visited.has(e.target);
        const color = lit ? AREA_BY_ID[STEP_BY_ID[e.source].area].color : '#94a3b8';
        return {
          ...e,
          animated: lit,
          className: active && !lit ? 'ff-edge-dimmed' : '',
          style: {
            stroke: color,
            strokeWidth: lit ? 2.6 : 1.8,
            strokeDasharray: FLOW_BY_ID[e.id]?.dashed ? '7 5' : undefined,
          },
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
        };
      }),
    );
  }, [sim, scenario, setNodes, setEdges]);

  // Câmera acompanha a etapa atual da simulação
  useEffect(() => {
    if (!sim || !scenario || !follow) return;
    const node = getNode(scenario.sequence[sim.stepIndex]);
    if (!node) return;
    const width = node.measured?.width ?? 225;
    const height = node.measured?.height ?? 70;
    setCenter(node.position.x + width / 2, node.position.y + height / 2, {
      zoom: Math.max(getZoom(), 0.85),
      duration: 600,
    });
  }, [sim, scenario, follow, getNode, getZoom, setCenter]);

  // Ao concluir o cenário, volta suavemente para a visão geral
  useEffect(() => {
    if (!sim || !scenario || sim.running || !follow) return;
    if (sim.stepIndex !== scenario.sequence.length - 1) return;
    const timer = setTimeout(() => fitView({ padding: 0.08, duration: 900 }), 1400);
    return () => clearTimeout(timer);
  }, [sim, scenario, follow, fitView]);

  const startScenario = (id: string) => {
    setSelected(null);
    setSim({ scenarioId: id, stepIndex: 0, running: true });
  };

  const clearSim = () => {
    setSim(null);
    fitView({ padding: 0.08, duration: 700 });
  };

  const resetLayout = () => {
    localStorage.removeItem(LAYOUT_KEY);
    setNodes(buildNodes({}));
    setSim(null);
  };

  const persistLayout = useCallback(() => {
    setNodes((ns) => {
      const layout: SavedLayout = {};
      for (const n of ns) {
        if (n.type !== 'lane') layout[n.id] = { x: n.position.x, y: n.position.y };
      }
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
      return ns;
    });
  }, [setNodes]);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    const step = STEP_BY_ID[node.id];
    if (step) setSelected(step);
  }, []);

  const currentStep =
    sim && scenario ? STEP_BY_ID[scenario.sequence[sim.stepIndex]] : null;

  return (
    <div className="ff-app">
      <header className="ff-header">
        <div className="ff-brand">
          <span className="ff-logo">▣</span>
          <div>
            <h1>FlexoFlow</h1>
            <p>Mapa do fluxo de processo — empresa flexográfica</p>
          </div>
        </div>
        <div className="ff-actions">
          <span className="ff-actions-label">Simular cenário:</span>
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className={`ff-btn ${sim?.scenarioId === s.id ? 'ff-btn-active' : ''}`}
              onClick={() => startScenario(s.id)}
              title={s.description}
            >
              ▶ {s.label}
            </button>
          ))}
          {sim && (
            <button className="ff-btn ff-btn-ghost" onClick={clearSim}>
              Limpar
            </button>
          )}
          <button
            className={`ff-btn ff-toggle ${follow ? 'ff-toggle-on' : ''}`}
            onClick={() =>
              setFollow((f) => {
                const next = !f;
                localStorage.setItem(FOLLOW_KEY, next ? 'on' : 'off');
                return next;
              })
            }
            title="Foco automático na etapa atual — no play e ao navegar com as setas ← → do teclado"
          >
            <span className="ff-toggle-dot" />
            Acompanhar fluxo
          </button>
          <button
            className="ff-btn ff-btn-ghost"
            onClick={resetLayout}
            title="Volta os cartões para a posição original"
          >
            Restaurar layout
          </button>
        </div>
      </header>

      <div className="ff-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          onNodeDragStop={persistLayout}
          onPaneClick={() => setSelected(null)}
          nodesConnectable={false}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.15}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="#cbd5e1" />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) =>
              n.type === 'lane' ? 'transparent' : AREA_BY_ID[STEP_BY_ID[n.id].area].color
            }
          />
          <Panel position="top-left">
            <div className="ff-legend">
              <div className="ff-legend-row">
                <svg width="34" height="10">
                  <line x1="0" y1="5" x2="26" y2="5" stroke="#64748b" strokeWidth="2" />
                  <polygon points="26,1 34,5 26,9" fill="#64748b" />
                </svg>
                <span>Sequência do processo</span>
              </div>
              <div className="ff-legend-row">
                <svg width="34" height="10">
                  <line
                    x1="0"
                    y1="5"
                    x2="26"
                    y2="5"
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                  />
                  <polygon points="26,1 34,5 26,9" fill="#64748b" />
                </svg>
                <span>Movimentação / controle de estoque</span>
              </div>
              <div className="ff-legend-areas">
                {AREAS.map((a) => (
                  <span key={a.id} className="ff-legend-area">
                    <span className="ff-legend-chip" style={{ background: a.color }} />
                    {a.label}
                  </span>
                ))}
              </div>
            </div>
          </Panel>
          <Panel position="bottom-center">
            {currentStep && scenario && sim ? (
              <div className="ff-simbar">
                <strong>{scenario.label}</strong>
                <span className="ff-simbar-step">
                  {sim.stepIndex + 1}/{scenario.sequence.length} · {currentStep.icon}{' '}
                  {currentStep.title}
                </span>
                {sim.stepIndex < scenario.sequence.length - 1 && (
                  <button
                    className="ff-simbar-btn"
                    onClick={() => setSim((s) => (s ? { ...s, running: !s.running } : s))}
                    title={sim.running ? 'Pausar' : 'Continuar'}
                  >
                    {sim.running ? '⏸ Pausar' : '▶ Continuar'}
                  </button>
                )}
                {!sim.running &&
                  (sim.stepIndex === scenario.sequence.length - 1 ? (
                    <span className="ff-simbar-done">concluído</span>
                  ) : (
                    <span className="ff-simbar-paused">pausado</span>
                  ))}
                <span className="ff-simbar-keys">
                  <kbd>←</kbd>
                  <kbd>→</kbd> navegar
                </span>
              </div>
            ) : (
              <div className="ff-hint">
                Clique em uma etapa para ver os detalhes · arraste os cartões para reorganizar o
                fluxo
              </div>
            )}
          </Panel>
        </ReactFlow>
        {selected && <DetailPanel step={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowMap />
    </ReactFlowProvider>
  );
}
