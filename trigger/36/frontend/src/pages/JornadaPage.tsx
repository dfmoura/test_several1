import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { jornadaApi, getErrorMessage } from '../lib/api';
import { ETAPAS } from '../lib/stages';
import type { ApiRow } from '../types';

const NODES = [
  { codigo: 'ORC', label: 'Orçamentos', key: 'orcamentos', href: '/orcamentos' },
  { codigo: 'PED', label: 'Pedidos', key: 'pedidos', href: '/pedidos' },
  { codigo: 'OP', label: 'OPs abertas', key: 'ops_abertas', fila: true, href: '/producao' },
  { codigo: 'NF', label: 'NF saída', key: 'nf_saida', href: '/fiscal' },
  { codigo: 'TIT', label: 'Títulos abertos', key: 'titulos_abertos', fila: true, href: '/financeiro' },
  { codigo: 'COB', label: 'Cobranças', key: 'titulos_abertos', fila: true, href: '/financeiro' },
  { codigo: 'ENT', label: 'Entregas abertas', key: 'entregas_abertas', fila: true, href: '/entrega' },
  { codigo: 'BX', label: 'Baixas', key: 'baixas', href: '/financeiro' },
];

export function JornadaPage() {
  const etapa = ETAPAS[2];
  const [dados, setDados] = useState<ApiRow | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    jornadaApi
      .contagens()
      .then((r) => setDados(r as ApiRow))
      .catch((e) => setErro(getErrorMessage(e)));
  }, []);

  function valor(node: (typeof NODES)[number]): string | number {
    if (!dados) return '—';
    if (node.fila) {
      const filas = dados.filas as Record<string, number> | undefined;
      return filas?.[node.key] ?? 0;
    }
    const contagens = dados as Record<string, number>;
    return contagens[node.key] ?? 0;
  }

  return (
    <>
      <PageHeader
        ordem={etapa.ordem}
        codigo="JOR"
        titulo="Jornada operacional"
        modo="HOMOLOGAVEL"
        regra="Fluxo ORC→PED→OP→NF+TIT→COB→ENT→BX com contagens ao vivo do ambiente HML."
      />

      {erro ? <p className="error">{erro}</p> : null}

      <section className="panel">
        <div className="jornada-flow">
          {NODES.map((node, i) => (
            <span key={node.codigo} style={{ display: 'contents' }}>
              <Link to={node.href} className="jornada-node">
                <span className="stage-badge">{node.codigo}</span>
                <span className="jornada-count">{valor(node)}</span>
                <span className="muted" style={{ fontSize: '0.75rem' }}>
                  {node.label}
                </span>
              </Link>
              {i < NODES.length - 1 ? <span className="jornada-arrow">→</span> : null}
            </span>
          ))}
        </div>
      </section>

      {Array.isArray(dados?.etapas) ? (
        <section className="panel">
          <h2 className="panel-title">Etapas — pendências</h2>
          <table className="data">
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th>Pendências</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(dados.etapas as ApiRow[]).map((e) => (
                <tr key={String(e.codigo)}>
                  <td>{String(e.etapa)}</td>
                  <td>{String(e.codigo)}</td>
                  <td>{String(e.pendencias)}</td>
                  <td>{String(e.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}
