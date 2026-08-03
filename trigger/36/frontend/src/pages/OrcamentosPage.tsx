import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OrcamentoWizard, useNovoOrcForm } from '../components/OrcamentoWizard';
import { PageHeader } from '../components/PageHeader';
import { DocStatusChip } from '../components/StatusChip';
import {
  formatDate,
  formatMoney,
  getErrorMessage,
  metaApi,
  orcamentosApi,
  parceirosApi,
} from '../lib/api';
import { isOrcEditavel } from '../lib/orcamentoForm';
import { ETAPAS } from '../lib/stages';
import type { ApiRow } from '../types';

export function OrcamentosPage() {
  const etapa = ETAPAS[2];
  const navigate = useNavigate();
  const [lista, setLista] = useState<ApiRow[]>([]);
  const [parceiros, setParceiros] = useState<ApiRow[]>([]);
  const [catalog, setCatalog] = useState<ApiRow | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const novoForm = useNovoOrcForm(catalog);
  const initialForm = useMemo(() => novoForm, [wizardOpen, novoForm]);

  async function carregar() {
    try {
      const [o, p, cat] = await Promise.all([
        orcamentosApi.list(),
        parceirosApi.list({ tipo: 'CLIENTE' }),
        metaApi.catalog(),
      ]);
      setLista(o as ApiRow[]);
      setParceiros(p as ApiRow[]);
      setCatalog(cat as ApiRow);
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function enviar(id: number) {
    setPending(true);
    setErro(null);
    try {
      await orcamentosApi.enviar(id);
      await carregar();
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        ordem={etapa.ordem}
        codigo={etapa.codigo}
        titulo={etapa.titulo}
        modo={etapa.modo}
        regra={etapa.regra}
        actions={
          <button type="button" className="btn primary" onClick={() => setWizardOpen(true)}>
            Novo orçamento
          </button>
        }
      />

      {erro && !wizardOpen ? <p className="error">{erro}</p> : null}

      <section className="panel">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Ver.</th>
              <th>Matriz</th>
              <th>Criado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((o) => {
              const faixas = ((o.result_snapshot as ApiRow)?.faixas as ApiRow[]) ?? [];
              const status = String(o.status);
              const editavel = isOrcEditavel(status);
              const detailPath = `/orcamentos/${o.id as number}`;
              return (
                <tr
                  key={String(o.id)}
                  className="row-clickable"
                  tabIndex={0}
                  role="link"
                  onClick={() => navigate(detailPath)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(detailPath);
                    }
                  }}
                >
                  <td>
                    <span className="link-codigo">{String(o.codigo)}</span>
                  </td>
                  <td>{String(o.cliente_nome)}</td>
                  <td>
                    <DocStatusChip status={status} />
                  </td>
                  <td>v{String(o.versao ?? 1)}</td>
                  <td>{o.cobra_matriz ? formatMoney(o.valor_matriz as string | number) : '—'}</td>
                  <td>{formatDate(String(o.created_at))}</td>
                  <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <div className="btn-row">
                      <Link to={detailPath} className="btn sm">
                        Ver
                      </Link>
                      {editavel ? (
                        <button
                          type="button"
                          className="btn sm"
                          disabled={pending}
                          onClick={() => enviar(o.id as number)}
                        >
                          Enviar
                        </button>
                      ) : null}
                      {status === 'ENVIADO' ? (
                        <Link to={detailPath} className="btn sm primary">
                          Aceitar faixa
                        </Link>
                      ) : null}
                      {faixas.length > 0 ? (
                        <span className="muted">{formatMoney(faixas[0]?.valor_total as number)}…</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {lista.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  Nenhum orçamento ainda. Crie o primeiro para ver o detalhe com proposta e breakdown.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      {wizardOpen ? (
        <OrcamentoWizard
          title="Novo orçamento"
          catalog={catalog}
          parceiros={parceiros}
          initialForm={initialForm}
          onClose={() => setWizardOpen(false)}
          onSaved={(created) => {
            setWizardOpen(false);
            navigate(`/orcamentos/${created.id as number}`);
          }}
        />
      ) : null}
    </>
  );
}
