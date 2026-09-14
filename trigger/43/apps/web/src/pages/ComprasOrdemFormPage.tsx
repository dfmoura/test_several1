import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CondicaoPagamentoInput } from '../components/CondicaoPagamentoInput';
import { OcPedidoComposicaoPanel } from '../components/OcPedidoComposicaoPanel';
import { PageHeader } from '../components/PageHeader';
import { ParceiroCombobox } from '../components/ParceiroCombobox';
import {
  ApiError,
  api,
  type OcImpostoEstimativa,
  type OrdemCompra,
  type Parceiro,
  type Produto,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { clampDecimalScale, DECIMAL_SCALE, formatCurrency } from '../lib/format';
import {
  ocFaixaCompleta,
  qtdeComercialFromFaixas,
  type OcFaixaForm,
} from '../lib/ocComposicaoVolumes';

type ItemRow = {
  produto_id: string;
  qtde_pedida: string;
  valor_unitario: string;
  aliq_ipi: string;
  aliq_icms: string;
  composicao: OcFaixaForm[];
};

function emptyItem(): ItemRow {
  return {
    produto_id: '',
    qtde_pedida: '',
    valor_unitario: '',
    aliq_ipi: '',
    aliq_icms: '',
    composicao: [],
  };
}

function aliqFromSugestao(raw: string | null | undefined): string {
  if (raw == null || raw === '') return '';
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(n);
}

async function aplicarEstimativaItens(
  fornecedorId: number,
  rows: ItemRow[],
): Promise<ItemRow[]> {
  const produtoIds = [
    ...new Set(
      rows
        .map((r) => Number(r.produto_id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  if (produtoIds.length === 0) return rows;

  const res = await api.post<{ data: OcImpostoEstimativa }>(
    '/ordens-compra/estimar-impostos',
    { fornecedor_id: fornecedorId, produto_ids: produtoIds },
  );
  const byId = new Map(res.data.itens.map((i) => [i.produto_id, i]));
  return rows.map((row) => {
    const sug = byId.get(Number(row.produto_id));
    if (!sug) return row;
    return {
      ...row,
      aliq_ipi: aliqFromSugestao(sug.aliq_ipi),
      aliq_icms: aliqFromSugestao(sug.aliq_icms),
    };
  });
}

function parseNum(raw: string): number {
  const n = Number(String(raw).replace(',', '.').trim());
  return Number.isFinite(n) ? n : 0;
}

function money2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function qtdeEfetiva(row: ItemRow, produto?: Produto | null): string {
  if (row.composicao.length === 0) return row.qtde_pedida;
  return (
    qtdeComercialFromFaixas(row.composicao, {
      unidade_comercial: produto?.unidade_comercial,
      unidade_interna: produto?.unidade_interna,
      fator_conversao: produto?.fator_conversao,
    }) || ''
  );
}

function lineMercadoria(row: ItemRow, produto?: Produto | null): number {
  return money2(parseNum(qtdeEfetiva(row, produto)) * parseNum(row.valor_unitario));
}

function lineImposto(base: number, aliq: string): number {
  const a = parseNum(aliq);
  if (a <= 0) return 0;
  return money2(base * (a / 100));
}

export function ComprasOrdemFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('compras.escrever');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedor, setFornecedor] = useState<Parceiro | null>(null);
  const [urgente, setUrgente] = useState(false);
  const [condicao, setCondicao] = useState('');
  const [previsao, setPrevisao] = useState('');
  const [observacao, setObservacao] = useState('');
  const [valorFrete, setValorFrete] = useState('');
  const [itens, setItens] = useState<ItemRow[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const totais = useMemo(() => {
    let mercadoria = 0;
    let ipi = 0;
    let icms = 0;
    for (const row of itens) {
      const produto = produtos.find((p) => String(p.id) === row.produto_id) ?? null;
      if (!row.produto_id || !qtdeEfetiva(row, produto) || !row.valor_unitario) continue;
      const base = lineMercadoria(row, produto);
      mercadoria = money2(mercadoria + base);
      ipi = money2(ipi + lineImposto(base, row.aliq_ipi));
      icms = money2(icms + lineImposto(base, row.aliq_icms));
    }
    const frete = money2(Math.max(0, parseNum(valorFrete)));
    return {
      mercadoria,
      ipi,
      icms,
      frete,
      previsto: money2(mercadoria + ipi + frete),
    };
  }, [itens, valorFrete, produtos]);

  const produtoOf = (row: ItemRow) =>
    produtos.find((p) => String(p.id) === row.produto_id) ?? null;

  useEffect(() => {
    void (async () => {
      const prd = await api.get<{ data: Produto[] }>('/produtos');
      setProdutos(prd.data);
    })();
  }, []);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ data: OrdemCompra }>(`/ordens-compra/${id}`);
        const oc = res.data;
        if (!oc.editavel) {
          setError('Esta OC já foi enviada e não pode ser editada.');
          navigate(`/compras/ordens/${id}`, { replace: true });
          return;
        }
        setFornecedor(
          oc.fornecedor
            ? ({
                id: oc.fornecedor.id,
                codigo: oc.fornecedor.codigo,
                razao_social: oc.fornecedor.razao_social,
                nome_fantasia: oc.fornecedor.nome_fantasia,
                email: oc.fornecedor.email ?? null,
                telefone: oc.fornecedor.telefone ?? null,
                cnpj_cpf: oc.fornecedor.cnpj_cpf ?? null,
                papel_fornecedor: true,
              } as Parceiro)
            : null,
        );
        setUrgente(oc.urgente);
        setCondicao(oc.condicao_pagamento ?? '');
        setPrevisao(oc.previsao_entrega ?? '');
        setObservacao(oc.observacao ?? '');
        setValorFrete(
          oc.valor_frete && Number(oc.valor_frete) > 0 ? String(oc.valor_frete) : '',
        );
        setItens(
          (oc.itens ?? []).map((i) => ({
            produto_id: String(i.produto_id),
            qtde_pedida: i.qtde_pedida,
            valor_unitario: i.valor_unitario,
            aliq_ipi: i.aliq_ipi != null && Number(i.aliq_ipi) > 0 ? String(i.aliq_ipi) : '',
            aliq_icms: i.aliq_icms != null && Number(i.aliq_icms) > 0 ? String(i.aliq_icms) : '',
            composicao: (i.composicao ?? []).map((c) => ({
              largura_mm: clampDecimalScale(c.largura_mm, DECIMAL_SCALE.dim),
              quantidade: clampDecimalScale(c.quantidade, DECIMAL_SCALE.qty),
              comprimento_m: clampDecimalScale(c.comprimento_m, DECIMAL_SCALE.dim),
            })),
          })),
        );
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Falha ao carregar OC.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const aplicarDefaultsFornecedor = (p: Parceiro | null) => {
    setFornecedor(p);
    if (!isEdit || !condicao.trim()) {
      setCondicao(p?.condicao_pagamento?.trim() ?? '');
    }
    if (!p) return;
    void (async () => {
      try {
        const next = await aplicarEstimativaItens(p.id, itens);
        setItens(next);
      } catch {
        /* estimativa é best-effort; servidor ainda preenche no save */
      }
    })();
  };

  const onProdutoChange = (idx: number, produtoId: string) => {
    const next = [...itens];
    const row = { ...itens[idx], produto_id: produtoId, aliq_ipi: '', aliq_icms: '' };
    const produto = produtos.find((p) => String(p.id) === produtoId) ?? null;
    next[idx] =
      row.composicao.length > 0
        ? { ...row, qtde_pedida: qtdeEfetiva(row, produto) }
        : row;
    setItens(next);
    if (!fornecedor || !produtoId) return;
    void (async () => {
      try {
        const filled = await aplicarEstimativaItens(fornecedor.id, next);
        setItens(filled);
      } catch {
        /* best-effort */
      }
    })();
  };

  const patchFaixa = (itemIdx: number, composicao: OcFaixaForm[]) => {
    const next = [...itens];
    const row = { ...next[itemIdx], composicao };
    next[itemIdx] = {
      ...row,
      qtde_pedida: qtdeEfetiva(row, produtoOf(row)),
    };
    setItens(next);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    if (!fornecedor) {
      setError('Selecione o fornecedor.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        fornecedor_id: fornecedor.id,
        origem: 'DIRETA',
        urgente,
        condicao_pagamento: condicao || null,
        previsao_entrega: previsao || null,
        observacao: observacao || null,
        valor_frete: valorFrete.trim() !== '' ? valorFrete : null,
        itens: itens
          .filter((i) => {
            if (!i.produto_id || !i.valor_unitario) return false;
            if (i.composicao.length > 0) return i.composicao.every(ocFaixaCompleta);
            return Boolean(i.qtde_pedida);
          })
          .map((i) => {
            const base = {
              produto_id: Number(i.produto_id),
              valor_unitario: i.valor_unitario,
              aliq_ipi: i.aliq_ipi.trim() !== '' ? i.aliq_ipi : null,
              aliq_icms: i.aliq_icms.trim() !== '' ? i.aliq_icms : null,
            };
            if (i.composicao.length > 0) {
              return {
                ...base,
                composicao: i.composicao.map((f) => ({
                  largura_mm: clampDecimalScale(f.largura_mm, DECIMAL_SCALE.dim),
                  quantidade: clampDecimalScale(f.quantidade, DECIMAL_SCALE.qty),
                  comprimento_m: clampDecimalScale(f.comprimento_m, DECIMAL_SCALE.dim),
                })),
              };
            }
            return {
              ...base,
              qtde_pedida: i.qtde_pedida,
            };
          }),
      };
      const res = isEdit
        ? await api.put<{ data: { id: number } }>(`/ordens-compra/${id}`, payload)
        : await api.post<{ data: { id: number } }>('/ordens-compra', payload);
      navigate(`/compras/ordens/${res.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar OC.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={isEdit ? 'Editar ordem de compra' : 'Nova ordem de compra'}
        description={isEdit ? 'Rascunho editável.' : 'Salve em rascunho e envie na ficha.'}
        actions={
          <Link
            to={isEdit ? `/compras/ordens/${id}` : '/compras/ordens'}
            className="btn btn-secondary"
          >
            Voltar
          </Link>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}

      {!canWrite ? (
        <div className="empty-state">Sem permissão para {isEdit ? 'editar' : 'criar'} OC.</div>
      ) : loading ? (
        <div className="loading">Carregando…</div>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="oc-form-page">
          <div className="card oc-form-page__card">
            <div className="card-body">
              <div className="form-section">
                <h3>Fornecedor e condições</h3>
                <div className="form-grid">
                  <ParceiroCombobox
                    className="span-2"
                    label="Fornecedor"
                    papel="fornecedor"
                    value={fornecedor}
                    onChange={aplicarDefaultsFornecedor}
                    required
                    placeholder="Buscar fornecedor por nome, código ou CNPJ…"
                  />
                  <div className="form-group">
                    <label>Condição de pagamento</label>
                    <CondicaoPagamentoInput
                      value={condicao}
                      placeholder="Sugerida pelo fornecedor"
                      onChange={setCondicao}
                    />
                  </div>
                  <div className="form-group">
                    <label>Previsão de entrega</label>
                    <input
                      type="date"
                      value={previsao}
                      onChange={(e) => setPrevisao(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Frete (R$)</label>
                    <input
                      inputMode="decimal"
                      value={valorFrete}
                      onChange={(e) => setValorFrete(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={urgente}
                        onChange={(e) => setUrgente(e.target.checked)}
                        style={{ marginRight: '0.4rem' }}
                      />
                      Urgente
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card oc-form-page__card">
            <div className="card-body">
              <div className="form-section">
                <h3>Itens</h3>
                {itens.map((row, idx) => {
                  const produto = produtoOf(row);
                  const qtde = qtdeEfetiva(row, produto);
                  const base = lineMercadoria(row, produto);
                  const ipi = lineImposto(base, row.aliq_ipi);
                  const icms = lineImposto(base, row.aliq_icms);
                  const temComposicao = row.composicao.length > 0;
                  const unCom = (produto?.unidade_comercial || 'un.').toUpperCase();
                  return (
                    <div key={idx} className="oc-form-page__item">
                      <div className="form-grid">
                        <div className="form-group span-2">
                          <label>Produto</label>
                          <select
                            required
                            value={row.produto_id}
                            onChange={(e) => onProdutoChange(idx, e.target.value)}
                          >
                            <option value="">Selecione…</option>
                            {produtos.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.codigo} — {p.descricao_comercial || p.descricao_fiscal}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>
                            Qtde ({unCom})
                            {temComposicao ? ' · faixas' : ''}
                          </label>
                          <input
                            required={!temComposicao}
                            inputMode="decimal"
                            value={temComposicao ? qtde : row.qtde_pedida}
                            readOnly={temComposicao}
                            title={temComposicao ? 'Derivada das faixas' : undefined}
                            onChange={(e) => {
                              if (temComposicao) return;
                              const next = [...itens];
                              next[idx] = { ...row, qtde_pedida: e.target.value };
                              setItens(next);
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <label>Valor unitário</label>
                          <input
                            required
                            inputMode="decimal"
                            value={row.valor_unitario}
                            onChange={(e) => {
                              const next = [...itens];
                              next[idx] = { ...row, valor_unitario: e.target.value };
                              setItens(next);
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <label>
                            Alíq. IPI %
                            {ipi > 0
                              ? ` · ${formatCurrency(ipi.toFixed(DECIMAL_SCALE.money))}`
                              : ''}
                          </label>
                          <input
                            inputMode="decimal"
                            value={row.aliq_ipi}
                            onChange={(e) => {
                              const next = [...itens];
                              next[idx] = { ...row, aliq_ipi: e.target.value };
                              setItens(next);
                            }}
                            placeholder="auto"
                            title="Histórico NF ou vazio"
                          />
                        </div>
                        <div className="form-group">
                          <label>
                            Alíq. ICMS %
                            {icms > 0
                              ? ` · ${formatCurrency(icms.toFixed(DECIMAL_SCALE.money))}`
                              : ''}
                          </label>
                          <input
                            inputMode="decimal"
                            value={row.aliq_icms}
                            onChange={(e) => {
                              const next = [...itens];
                              next[idx] = { ...row, aliq_icms: e.target.value };
                              setItens(next);
                            }}
                            placeholder="auto"
                            title="Destaque · não soma no total"
                          />
                        </div>
                        {itens.length > 1 && (
                          <div className="form-group">
                            <label>&nbsp;</label>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setItens(itens.filter((_, i) => i !== idx))}
                            >
                              Remover item
                            </button>
                          </div>
                        )}
                      </div>

                      <OcPedidoComposicaoPanel
                        composicao={row.composicao}
                        compact
                        onChange={(composicao) => patchFaixa(idx, composicao)}
                      />
                    </div>
                  );
                })}
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setItens([...itens, emptyItem()])}
                  >
                    + Item
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card oc-form-page__card">
            <div className="card-body">
              <div className="form-section">
                <h3>Totais previstos</h3>
                <div className="form-grid oc-form-page__totais">
                  <div className="form-group">
                    <label>Mercadoria</label>
                    <div>{formatCurrency(totais.mercadoria.toFixed(DECIMAL_SCALE.money))}</div>
                  </div>
                  <div className="form-group">
                    <label>IPI</label>
                    <div>{formatCurrency(totais.ipi.toFixed(DECIMAL_SCALE.money))}</div>
                  </div>
                  <div className="form-group">
                    <label>ICMS (destaque)</label>
                    <div>{formatCurrency(totais.icms.toFixed(DECIMAL_SCALE.money))}</div>
                  </div>
                  <div className="form-group">
                    <label>Frete</label>
                    <div>{formatCurrency(totais.frete.toFixed(DECIMAL_SCALE.money))}</div>
                  </div>
                  <div className="form-group">
                    <label>Total previsto</label>
                    <div>
                      <strong>{formatCurrency(totais.previsto.toFixed(DECIMAL_SCALE.money))}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card oc-form-page__card">
            <div className="card-body">
              <div className="form-section">
                <h3>Observação</h3>
                <div className="form-group">
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    rows={2}
                    placeholder="Instruções ao fornecedor…"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Salvar rascunho'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
