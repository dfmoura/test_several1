import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type OpFechoModeloLinha, type OrdemProducao } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDecimalBr } from '../lib/format';
import { opStatusLabel, parseQtdeDigitada } from '../lib/producaoUi';

type LinhaEdit = {
  ordem: number;
  nome: string;
  qtde_planejada: string;
  qtde_boa: string;
  qtde_refugo: string;
};

function linhasIniciais(op: OrdemProducao): LinhaEdit[] {
  const base =
    op.fecho_modelos && op.fecho_modelos.length > 0
      ? op.fecho_modelos
      : ([
          {
            ordem: 1,
            nome: op.pedido_item?.descricao?.trim() || 'Item',
            qtde_planejada: op.qtde_planejada,
          },
        ] satisfies OpFechoModeloLinha[]);

  return base.map((ln) => ({
    ordem: ln.ordem,
    nome: ln.nome,
    qtde_planejada: ln.qtde_planejada,
    qtde_boa: String(Math.floor(parseQtdeDigitada(ln.qtde_planejada)) || ''),
    qtde_refugo: '0',
  }));
}

/**
 * Satélite de fecho — boas/refugo por modelo → POST …/concluir.
 * ADR_PRODUCAO_APONTAMENTO emenda 2026-11-03.
 */
export function OrdemProducaoFecharPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('producao.escrever');

  const [op, setOp] = useState<OrdemProducao | null>(null);
  const [linhas, setLinhas] = useState<LinhaEdit[]>([]);
  const [aceitarFora, setAceitarFora] = useState(false);
  const [motivoFora, setMotivoFora] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await api.get<{ data: OrdemProducao }>(`/ordens-producao/${id}`);
        if (cancelled) return;
        setOp(res.data);
        setLinhas(linhasIniciais(res.data));
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Falha ao carregar a ordem.');
          setOp(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const totais = useMemo(() => {
    let boa = 0;
    let refugo = 0;
    let planejado = 0;
    for (const ln of linhas) {
      boa += parseQtdeDigitada(ln.qtde_boa);
      refugo += parseQtdeDigitada(ln.qtde_refugo || '0');
      planejado += parseQtdeDigitada(ln.qtde_planejada);
    }
    return { boa, refugo, planejado };
  }, [linhas]);

  const tol = op?.pedido?.tolerancia_qtd_pct ?? '20';
  const pedida = parseQtdeDigitada(op?.pedido_item?.qtde_pedida ?? op?.qtde_planejada ?? '0');
  const tolFrac = parseQtdeDigitada(tol) / 100;
  const minTol = Math.max(0, pedida * (1 - tolFrac));
  const maxTol = pedida * (1 + tolFrac);
  const foraTol =
    pedida > 0 && (totais.boa < minTol - 1e-9 || totais.boa > maxTol + 1e-9);

  const aberta = op ? ['ABERTA', 'EM_ANDAMENTO'].includes(op.status) : false;
  const podeFechar =
    op?.pode_fechar ?? (op?.materiais ?? []).some((m) => !m.pendente);

  if (!loading && op && (!aberta || op.status === 'CONCLUIDA')) {
    return <Navigate to={`/ordens-producao/${op.id}`} replace />;
  }

  const setCampo = (idx: number, campo: 'qtde_boa' | 'qtde_refugo', value: string) => {
    setLinhas((prev) =>
      prev.map((ln, i) => (i === idx ? { ...ln, [campo]: value } : ln)),
    );
  };

  const concluir = async () => {
    if (!op) return;
    setBusy(true);
    setErr(null);
    try {
      const materiaisFora = (op.materiais ?? []).filter((m) => !m.pendente);
      const res = await api.post<{ data: OrdemProducao }>(`/ordens-producao/${op.id}/concluir`, {
        modelos: linhas.map((ln) => ({
          ordem: ln.ordem,
          nome: ln.nome,
          qtde_planejada: String(parseQtdeDigitada(ln.qtde_planejada)),
          qtde_boa: String(parseQtdeDigitada(ln.qtde_boa)),
          qtde_refugo: String(parseQtdeDigitada(ln.qtde_refugo || '0')),
        })),
        qtde_boa: String(totais.boa),
        qtde_refugo: String(totais.refugo),
        aceitar_fora_tolerancia: aceitarFora,
        motivo_fora_tolerancia: motivoFora.trim() || null,
        materiais: materiaisFora.map((m) => ({
          material_id: Number(m.id),
          produto_id: m.produto?.id ? Number(m.produto.id) : undefined,
          qtde_retorno: '0',
          qtde_perda: '0',
        })),
      });
      navigate(`/ordens-producao/${res.data.id}`, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao fechar a ordem.');
    } finally {
      setBusy(false);
    }
  };

  const qtdeBoaValida = totais.boa > 0;
  const motivoOk = !foraTol || (aceitarFora && motivoFora.trim().length > 0);

  return (
    <>
      <PageHeader
        title={op ? `Fechar · ${op.codigo}` : 'Fechar a ordem'}
        description={
          op
            ? [
                op.pedido?.codigo,
                op.parceiro?.razao_social,
                op.pedido_item?.descricao,
              ]
                .filter(Boolean)
                .join(' · ') || 'Etiquetas boas e refugo por modelo'
            : loading
              ? 'Carregando…'
              : 'Ordem não encontrada.'
        }
        actions={
          <div className="btn-row">
            {op ? (
              <Link to={`/ordens-producao/${op.id}`} className="btn btn-secondary">
                Voltar à ordem
              </Link>
            ) : (
              <Link to="/ordens-producao" className="btn btn-secondary">
                Ordens
              </Link>
            )}
          </div>
        }
      />

      {err ? (
        <div className="alert alert-error" role="alert">
          {err}
        </div>
      ) : null}

      {loading ? <div className="loading">Carregando…</div> : null}

      {!loading && op ? (
        <div className="card">
          <div className="card-body">
            <div className="detail-meta" style={{ marginBottom: '1rem' }}>
              <div>
                <span>Status</span>
                <StatusPill status={opStatusLabel(op.status)} />
              </div>
              <div>
                <span>Planejado</span>
                <strong>{formatDecimalBr(totais.planejado, 0)}</strong>
              </div>
              <div>
                <span>Boas (total)</span>
                <strong>{formatDecimalBr(totais.boa, 0)}</strong>
              </div>
              <div>
                <span>Refugo (total)</span>
                <strong>{formatDecimalBr(totais.refugo, 0)}</strong>
              </div>
            </div>

            {!podeFechar ? (
              <p className="muted">
                Confirme a saída do material em Estoque · A buscar antes de fechar.
              </p>
            ) : (
              <>
                <p className="muted" style={{ marginTop: 0 }}>
                  Total real depois da rebobinação. Uma linha por modelo — a soma fecha a
                  ordem.
                </p>

                <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Modelo</th>
                        <th className="num">Planejado</th>
                        <th className="num">Boas</th>
                        <th className="num">Refugo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.map((ln, idx) => (
                        <tr key={`${ln.ordem}-${ln.nome}`}>
                          <td>{ln.nome}</td>
                          <td className="num">{formatDecimalBr(Number(ln.qtde_planejada), 0)}</td>
                          <td className="num">
                            <input
                              aria-label={`Boas · ${ln.nome}`}
                              value={ln.qtde_boa}
                              onChange={(e) => setCampo(idx, 'qtde_boa', e.target.value)}
                              disabled={!canWrite || busy}
                              inputMode="decimal"
                              style={{ width: '7rem', textAlign: 'right' }}
                            />
                          </td>
                          <td className="num">
                            <input
                              aria-label={`Refugo · ${ln.nome}`}
                              value={ln.qtde_refugo}
                              onChange={(e) => setCampo(idx, 'qtde_refugo', e.target.value)}
                              disabled={!canWrite || busy}
                              inputMode="decimal"
                              style={{ width: '7rem', textAlign: 'right' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>
                          <strong>Total</strong>
                        </td>
                        <td className="num">
                          <strong>{formatDecimalBr(totais.planejado, 0)}</strong>
                        </td>
                        <td className="num">
                          <strong>{formatDecimalBr(totais.boa, 0)}</strong>
                        </td>
                        <td className="num">
                          <strong>{formatDecimalBr(totais.refugo, 0)}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <label
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                    marginTop: '1rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={aceitarFora}
                    onChange={(e) => setAceitarFora(e.target.checked)}
                    disabled={!canWrite || busy}
                  />
                  Aceitar fora da tolerância ±{tol}%
                  {pedida > 0
                    ? ` (faixa ${formatDecimalBr(minTol, 0)}–${formatDecimalBr(maxTol, 0)})`
                    : ''}
                </label>
                {aceitarFora || foraTol ? (
                  <div className="form-group" style={{ marginTop: '0.5rem', maxWidth: 420 }}>
                    <label htmlFor="op-fecho-motivo-tol">Motivo</label>
                    <input
                      id="op-fecho-motivo-tol"
                      value={motivoFora}
                      onChange={(e) => setMotivoFora(e.target.value)}
                      disabled={!canWrite || busy}
                    />
                  </div>
                ) : null}

                {canWrite ? (
                  <div className="btn-row" style={{ marginTop: '1rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy || !qtdeBoaValida || (foraTol && !motivoOk)}
                      onClick={() => void concluir()}
                    >
                      {busy ? 'Fechando…' : 'Fechar a ordem'}
                    </button>
                    <Link to={`/ordens-producao/${op.id}`} className="btn btn-secondary">
                      Cancelar
                    </Link>
                  </div>
                ) : (
                  <p className="muted" style={{ margin: '1rem 0 0' }}>
                    Quem fecha a ordem precisa de permissão para gravar a produção.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
