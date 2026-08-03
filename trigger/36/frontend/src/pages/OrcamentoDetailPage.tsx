import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OrcamentoResultado } from '../components/OrcamentoResultado';
import { OrcamentoWizard } from '../components/OrcamentoWizard';
import { PageHeader } from '../components/PageHeader';
import { CreditoChip, DocStatusChip } from '../components/StatusChip';
import {
  formatDate,
  formatMoney,
  getErrorMessage,
  metaApi,
  orcamentosApi,
  parceirosApi,
} from '../lib/api';
import { formFromSnapshot, isOrcEditavel } from '../lib/orcamentoForm';
import { ETAPAS } from '../lib/stages';
import type { ApiRow } from '../types';

export function OrcamentoDetailPage() {
  const { id } = useParams();
  const etapa = ETAPAS[2];
  const oid = Number(id);

  const [orc, setOrc] = useState<ApiRow | null>(null);
  const [catalog, setCatalog] = useState<ApiRow | null>(null);
  const [parceiros, setParceiros] = useState<ApiRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [faixaIdx, setFaixaIdx] = useState(0);

  const carregar = useCallback(async () => {
    if (!Number.isFinite(oid)) {
      setErro('ID inválido');
      return;
    }
    try {
      const [o, cat, p] = await Promise.all([
        orcamentosApi.get(oid),
        metaApi.catalog(),
        parceirosApi.list({ tipo: 'CLIENTE' }),
      ]);
      setOrc(o as ApiRow);
      setCatalog(cat as ApiRow);
      setParceiros(p as ApiRow[]);
      const escolhida = (o as ApiRow).faixa_escolhida;
      setFaixaIdx(typeof escolhida === 'number' ? escolhida : 0);
      setErro(null);
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }, [oid]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const editavel = isOrcEditavel(String(orc?.status ?? '')) || Boolean(orc?.editavel);
  const status = String(orc?.status ?? '');
  const input = (orc?.input_snapshot as ApiRow) ?? {};
  const result = (orc?.result_snapshot as ApiRow) ?? null;
  const pedido = orc?.pedido as ApiRow | null | undefined;
  const creditoAlerta = orc?.credito_alerta as
    | {
        situacao?: string;
        saldo_disponivel?: string | number;
        limite?: string | number;
        motivos?: string[];
        caberia_no_limite?: boolean;
      }
    | null
    | undefined;
  const faixas = ((result?.faixas as ApiRow[]) ?? []);

  const editForm = useMemo(
    () => formFromSnapshot(input, catalog),
    // só remonta form ao abrir editor / mudar ORC
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orc?.id, orc?.versao, catalog, editing],
  );

  async function enviar() {
    setPending(true);
    setErro(null);
    try {
      const updated = await orcamentosApi.enviar(oid);
      setOrc(updated as ApiRow);
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function decidir(aprovado: boolean) {
    setPending(true);
    setErro(null);
    try {
      const res = (await orcamentosApi.decidir(oid, {
        aprovado,
        faixa_index: faixaIdx,
      })) as { orcamento: ApiRow; pedido: ApiRow | null };
      setOrc(res.orcamento);
      if (aprovado && res.pedido) {
        // permanece no detalhe com link para o PED
      }
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  if (!orc && !erro) {
    return <p className="muted">Carregando orçamento…</p>;
  }

  return (
    <>
      <PageHeader
        ordem={etapa.ordem}
        codigo={etapa.codigo}
        titulo={orc ? String(orc.codigo) : 'Orçamento'}
        modo={etapa.modo}
        regra={etapa.regra}
        actions={
          <div className="btn-row">
            <Link to="/orcamentos" className="btn sm">
              ← Lista
            </Link>
            {editavel ? (
              <>
                <button type="button" className="btn sm" disabled={pending} onClick={() => setEditing(true)}>
                  Editar
                </button>
                <button type="button" className="btn sm primary" disabled={pending} onClick={enviar}>
                  Enviar proposta
                </button>
              </>
            ) : null}
            {status === 'ENVIADO' ? (
              <>
                <button
                  type="button"
                  className="btn sm primary"
                  disabled={pending || faixas.length === 0}
                  onClick={() => decidir(true)}
                >
                  Aprovar faixa
                </button>
                <button type="button" className="btn sm" disabled={pending} onClick={() => decidir(false)}>
                  Reprovar
                </button>
              </>
            ) : null}
            {pedido ? (
              <Link to="/pedidos" className="btn sm primary">
                Ir ao pedido {String(pedido.codigo)}
              </Link>
            ) : null}
          </div>
        }
      />

      {erro ? <p className="error">{erro}</p> : null}

      {orc ? (
        <>
          <section className="panel orc-detail-head">
            <div className="orc-detail-meta">
              <div>
                <span className="muted">Cliente</span>
                <strong>{String(orc.cliente_nome)}</strong>
              </div>
              <div>
                <span className="muted">Status</span>
                <DocStatusChip status={status} />
              </div>
              <div>
                <span className="muted">Versão</span>
                <strong>v{String(orc.versao ?? 1)}</strong>
              </div>
              <div>
                <span className="muted">Criado</span>
                <strong>{formatDate(String(orc.created_at))}</strong>
              </div>
              <div>
                <span className="muted">Matriz</span>
                <strong>
                  {orc.cobra_matriz ? formatMoney(orc.valor_matriz as string | number) : 'Isenta'}
                </strong>
              </div>
              <div>
                <span className="muted">Edição</span>
                <strong>{editavel ? 'Permitida (pré-envio)' : 'Somente leitura'}</strong>
              </div>
            </div>
            {!editavel ? (
              <p className="muted orc-lock-note">
                Snapshot travado após envio — alterações exigem novo ORC (domínio: aceite formal imutável).
              </p>
            ) : (
              <p className="muted orc-lock-note">
                Pré-envio (RASCUNHO/CALCULADO): pode recalcular e salvar. Enviar congela a proposta.
              </p>
            )}
          </section>

          {creditoAlerta?.situacao ? (
            <section className="panel">
              <h3 className="panel-title">Alerta de crédito (não bloqueia orçamento)</h3>
              <div className="credito-box">
                <div className="btn-row" style={{ marginBottom: '0.4rem' }}>
                  <CreditoChip situacao={String(creditoAlerta.situacao)} />
                  {creditoAlerta.caberia_no_limite === false ? (
                    <span className="chip credito-atencao">Pode estourar limite no PED</span>
                  ) : null}
                </div>
                <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                  Limite {formatMoney(creditoAlerta.limite)} · Disponível{' '}
                  {formatMoney(creditoAlerta.saldo_disponivel)}
                </p>
                {(creditoAlerta.motivos ?? []).length > 0 ? (
                  <ul className="credito-motivos" style={{ marginTop: '0.4rem' }}>
                    {(creditoAlerta.motivos ?? []).map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="panel">
            <h3 className="panel-title">Especificação (input snapshot)</h3>
            <div className="orc-spec-grid">
              <div>
                <span>Medida</span>
                <strong>{String(input.medida ?? '—')}</strong>
              </div>
              <div>
                <span>Puxada / Z</span>
                <strong>
                  {String(input.puxada_cm ?? '—')} cm / {String(input.z ?? '—')}
                </strong>
              </div>
              <div>
                <span>Largura</span>
                <strong>{String(input.largura_cm ?? '—')} cm</strong>
              </div>
              <div>
                <span>Cores</span>
                <strong>{String(input.cores ?? '—')}</strong>
              </div>
              <div>
                <span>Papel</span>
                <strong>{String(input.papel ?? '—')}</strong>
              </div>
              <div>
                <span>Acabamento</span>
                <strong>{String(input.acabamento ?? '—')}</strong>
              </div>
              <div>
                <span>Modelos × colunas</span>
                <strong>
                  {String(input.modelos ?? '—')} × {String(input.colunas ?? '—')}
                </strong>
              </div>
              <div>
                <span>Etiq./rolo · tubete</span>
                <strong>
                  {String(input.etiq_por_rolo ?? '—')} · {String(input.tubete ?? '—')}
                </strong>
              </div>
              <div>
                <span>Máquina (custo)</span>
                <strong>{String(input.maquina ?? '—')}</strong>
              </div>
              <div>
                <span>Máq. roda serviço</span>
                <strong>{String(input.maquina_roda_servico ?? '—')}</strong>
              </div>
              <div>
                <span>Matriz</span>
                <strong>{String(input.matriz ?? '—')}</strong>
              </div>
              <div>
                <span>Imposto</span>
                <strong>{String(input.imposto_pct ?? '—')}%</strong>
              </div>
              <div>
                <span>Prazo / validade</span>
                <strong>
                  {String(orc.prazo_entrega_dias)} d / {String(orc.validade_dias)} d
                </strong>
              </div>
              <div>
                <span>Tolerância</span>
                <strong>±{String(orc.tolerancia_qtd_pct)}%</strong>
              </div>
            </div>
            {orc.observacao ? (
              <p style={{ marginTop: '0.75rem' }}>
                <span className="muted">Obs.: </span>
                {String(orc.observacao)}
              </p>
            ) : null}
          </section>

          {result ? (
            <>
              {status === 'ENVIADO' ? (
                <section className="panel">
                  <h3 className="panel-title">Aceite — escolha da faixa</h3>
                  <p className="muted">
                    Selecione a quantidade aprovada pelo cliente e confirme. Isto gera o PED com snapshot
                    travado.
                  </p>
                </section>
              ) : null}
              <OrcamentoResultado
                calculo={result}
                prazoEntregaDias={Number(orc.prazo_entrega_dias)}
                validadeDias={Number(orc.validade_dias)}
                toleranciaQtdPct={Number(orc.tolerancia_qtd_pct)}
                faixaHighlight={typeof orc.faixa_escolhida === 'number' ? (orc.faixa_escolhida as number) : null}
                selectable={status === 'ENVIADO'}
                selectedFaixa={faixaIdx}
                onSelectFaixa={setFaixaIdx}
              />
            </>
          ) : (
            <p className="muted">Sem resultado calculado. Edite e calcule novamente.</p>
          )}
        </>
      ) : null}

      {editing && orc ? (
        <OrcamentoWizard
          title={`Editar ${String(orc.codigo)}`}
          subtitle="Recalcula e substitui o snapshot · incrementa versão · só pré-envio"
          catalog={catalog}
          parceiros={parceiros}
          initialForm={editForm}
          orcamentoId={oid}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setOrc(updated);
            setEditing(false);
          }}
        />
      ) : null}
    </>
  );
}
