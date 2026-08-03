import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { homologacaoApi, plataformaApi, getErrorMessage } from '../lib/api';
import { ETAPAS } from '../lib/stages';
import type { ApiRow } from '../types';

const FILA_LABELS: Record<string, string> = {
  orcamentos_enviados: 'Orçamentos enviados',
  pedidos_aguarda_credito: 'Pedidos aguardando crédito',
  ops_abertas: 'OPs abertas',
  nfe_pendentes: 'NF-e pendentes',
  titulos_abertos: 'Títulos abertos',
  entregas_abertas: 'Entregas abertas',
};

const FILA_LINKS: Record<string, string> = {
  orcamentos_enviados: '/orcamentos',
  pedidos_aguarda_credito: '/pedidos',
  ops_abertas: '/producao',
  nfe_pendentes: '/nfe',
  titulos_abertos: '/financeiro',
  entregas_abertas: '/entrega',
};

const MODULOS = [
  { label: 'Empresas', to: '/empresas' },
  { label: 'Parceiros', to: '/parceiros' },
  { label: 'Produtos', to: '/produtos' },
  { label: 'Orçamentos', to: '/orcamentos' },
  { label: 'Pedidos', to: '/pedidos' },
  { label: 'Produção', to: '/producao' },
  { label: 'Estoque', to: '/estoque' },
  { label: 'Fiscal', to: '/fiscal' },
  { label: 'Financeiro', to: '/financeiro' },
  { label: 'Naturezas', to: '/naturezas' },
  { label: 'Entrega', to: '/entrega' },
  { label: 'Devoluções', to: '/devolucoes' },
  { label: 'Patrimônio', to: '/patrimonio' },
  { label: 'Homologação', to: '/homologacao' },
  { label: 'Jornada', to: '/jornada' },
];

export function DashboardPage() {
  const etapa = ETAPAS[0];
  const [resumo, setResumo] = useState<ApiRow | null>(null);
  const [plataforma, setPlataforma] = useState<ApiRow | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([homologacaoApi.resumo(), plataformaApi.status()])
      .then(([r, p]) => {
        setResumo(r as ApiRow);
        setPlataforma(p as ApiRow);
      })
      .catch((e) => setErro(getErrorMessage(e)));
  }, []);

  const filas = (resumo?.filas as Record<string, number>) ?? {};
  const contagens = (resumo?.contagens as Record<string, number>) ?? {};

  return (
    <>
      <PageHeader
        ordem={etapa.ordem}
        codigo={etapa.codigo}
        titulo={etapa.titulo}
        modo={etapa.modo}
        regra={etapa.regra}
      />

      {erro ? <p className="error">{erro}</p> : null}

      <div className="grid-2">
        <section className="panel">
          <h2 className="panel-title">Plataforma</h2>
          {plataforma ? (
            <ul className="queue-list">
              <li className="queue-item">
                <span>Ambiente</span>
                <strong>{String(plataforma.ambiente ?? '—')}</strong>
              </li>
              <li className="queue-item">
                <span>Versão</span>
                <strong>{String(plataforma.versao ?? '—')}</strong>
              </li>
              <li className="queue-item">
                <span>Banco</span>
                <strong>{String(plataforma.banco ?? '—')}</strong>
              </li>
              <li className="queue-item">
                <span>Simular integrações</span>
                <strong>{plataforma.simular ? 'Sim' : 'Não'}</strong>
              </li>
            </ul>
          ) : (
            <p className="muted">Carregando status…</p>
          )}
          {Array.isArray(plataforma?.integracoes) ? (
            <table className="data" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Integração</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(plataforma.integracoes as ApiRow[]).map((i) => (
                  <tr key={String(i.nome)}>
                    <td>{String(i.nome)}</td>
                    <td>{String(i.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>

        <section className="panel">
          <h2 className="panel-title">Contagens gerais</h2>
          <ul className="queue-list">
            {Object.entries(contagens).map(([key, count]) => (
              <li key={key} className="queue-item">
                <span className="muted">{key.replace(/_/g, ' ')}</span>
                <span className="queue-count">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2 className="panel-title">Filas operacionais</h2>
        <ul className="queue-list">
          {Object.keys(FILA_LABELS).map((key) => (
            <li key={key} className="queue-item">
              <Link to={FILA_LINKS[key] ?? '/'}>{FILA_LABELS[key]}</Link>
              <span className="queue-count">{filas[key] ?? 0}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel-title">Módulos</h2>
        <div className="btn-row">
          {MODULOS.map((m) => (
            <Link key={m.to} to={m.to} className="btn">
              {m.label}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
