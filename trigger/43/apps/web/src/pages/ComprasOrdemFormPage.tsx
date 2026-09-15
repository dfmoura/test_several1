import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CondicaoPagamentoInput } from '../components/CondicaoPagamentoInput';
import { OcPedidoComposicaoPanel } from '../components/OcPedidoComposicaoPanel';
import { PageHeader } from '../components/PageHeader';
import { ParceiroCombobox } from '../components/ParceiroCombobox';
import { ProdutoCombobox } from '../components/ProdutoCombobox';
import {
  ApiError,
  api,
  type OcImpostoEstimativa,
  type OrdemCompra,
  type Parceiro,
  type Produto,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { clampDecimalScale, DECIMAL_SCALE, formatCnpjCpf, formatCurrency } from '../lib/format';

const MOD_FRETE_CIF = '0';
const MOD_FRETE_FOB = '1';

function transportadorResumoLinha(p: Parceiro): string {
  const parts: string[] = [];
  if (p.razao_social) parts.push(p.razao_social);
  if (p.cnpj_cpf) parts.push(`CNPJ ${formatCnpjCpf(p.cnpj_cpf)}`);
  if (p.ie) parts.push(`IE ${p.ie}`);
  const end = [p.logradouro, p.numero ? `nº ${p.numero}` : null, p.bairro]
    .filter(Boolean)
    .join(', ');
  if (end) parts.push(end);
  const mun = [p.municipio, p.uf].filter(Boolean).join('/');
  if (mun) parts.push(mun);
  return parts.join(' · ');
}
import {
  ocFaixaCompleta,
  qtdeComercialFromFaixas,
  type OcFaixaForm,
} from '../lib/ocComposicaoVolumes';
import { produtoPermiteDetalheBobinaOc } from '../lib/ocPedidoDetalheUi';

type ItemRow = {
  produto_id: string;
  qtde_pedida: string;
  valor_unitario: string;
  aliq_ipi: string;
  aliq_icms: string;
  composicao: OcFaixaForm[];
};

type ProdutoById = Record<string, Produto>;

function rememberProduto(map: ProdutoById, produto: Produto | null): ProdutoById {
  if (!produto) return map;
  return { ...map, [String(produto.id)]: produto };
}

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
  const [produtosById, setProdutosById] = useState<ProdutoById>({});
  const [fornecedor, setFornecedor] = useState<Parceiro | null>(null);
  const [transportador, setTransportador] = useState<Parceiro | null>(null);
  const [modFrete, setModFrete] = useState<string>(MOD_FRETE_FOB);
  const [urgente, setUrgente] = useState(false);
  const [condicao, setCondicao] = useState('');
  const [previsao, setPrevisao] = useState('');
  const [observacao, setObservacao] = useState('');
  const [itens, setItens] = useState<ItemRow[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const totais = useMemo(() => {
    let mercadoria = 0;
    let ipi = 0;
    let icms = 0;
    for (const row of itens) {
      const produto = produtosById[row.produto_id] ?? null;
      if (!row.produto_id || !qtdeEfetiva(row, produto) || !row.valor_unitario) continue;
      const base = lineMercadoria(row, produto);
      mercadoria = money2(mercadoria + base);
      ipi = money2(ipi + lineImposto(base, row.aliq_ipi));
      icms = money2(icms + lineImposto(base, row.aliq_icms));
    }
    return {
      mercadoria,
      ipi,
      icms,
      previsto: money2(mercadoria + ipi),
    };
  }, [itens, produtosById]);

  const produtoOf = (row: ItemRow) => produtosById[row.produto_id] ?? null;

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
        setTransportador(
          oc.transportador
            ? ({
                id: oc.transportador.id,
                codigo: oc.transportador.codigo,
                razao_social: oc.transportador.razao_social,
                nome_fantasia: oc.transportador.nome_fantasia,
                email: oc.transportador.email ?? null,
                telefone: oc.transportador.telefone ?? null,
                cnpj_cpf: oc.transportador.cnpj_cpf ?? null,
                ie: oc.transportador.ie ?? null,
                logradouro: oc.transportador.logradouro ?? null,
                numero: oc.transportador.numero ?? null,
                complemento: oc.transportador.complemento ?? null,
                bairro: oc.transportador.bairro ?? null,
                municipio: oc.transportador.municipio ?? null,
                uf: oc.transportador.uf ?? null,
                cep: oc.transportador.cep ?? null,
                papel_transportadora: true,
              } as Parceiro)
            : null,
        );
        setModFrete(
          oc.mod_frete === MOD_FRETE_CIF || oc.mod_frete === MOD_FRETE_FOB
            ? oc.mod_frete
            : MOD_FRETE_FOB,
        );
        setUrgente(oc.urgente);
        setCondicao(oc.condicao_pagamento ?? '');
        setPrevisao(oc.previsao_entrega ?? '');
        setObservacao(oc.observacao ?? '');
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

        // Hidrata SKUs completos (grupo / unidades) — payload da OC traz só resumo.
        const ids = [
          ...new Set(
            (oc.itens ?? [])
              .map((i) => i.produto_id)
              .filter((pid) => Number.isFinite(pid) && pid > 0),
          ),
        ];
        if (ids.length > 0) {
          const loaded = await Promise.all(
            ids.map(async (pid) => {
              try {
                const pr = await api.get<{ data: Produto }>(`/produtos/${pid}`);
                return pr.data;
              } catch {
                return null;
              }
            }),
          );
          const next: ProdutoById = {};
          for (const p of loaded) {
            if (p) next[String(p.id)] = p;
          }
          setProdutosById(next);
        }
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

  const onProdutoChange = (idx: number, produto: Produto | null) => {
    const produtoId = produto ? String(produto.id) : '';
    setProdutosById((prev) => rememberProduto(prev, produto));
    const next = [...itens];
    const permiteBobina = produtoPermiteDetalheBobinaOc(produto);
    let row: ItemRow = {
      ...itens[idx],
      produto_id: produtoId,
      aliq_ipi: '',
      aliq_icms: '',
    };
    if (!permiteBobina && row.composicao.length > 0) {
      row = { ...row, composicao: [] };
    }
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
    if (modFrete !== MOD_FRETE_CIF && modFrete !== MOD_FRETE_FOB) {
      setError('Selecione a modalidade de frete (CIF ou FOB).');
      return;
    }
    if (modFrete === MOD_FRETE_FOB && !transportador) {
      setError('FOB exige transportador cadastrado.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        fornecedor_id: fornecedor.id,
        transportador_id: transportador?.id ?? null,
        mod_frete: modFrete,
        origem: 'DIRETA',
        urgente,
        condicao_pagamento: condicao || null,
        previsao_entrega: previsao || null,
        observacao: observacao || null,
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
                <div className="oc-form-page__cabecalho-row">
                  <ParceiroCombobox
                    className="oc-form-page__cabecalho-fornecedor"
                    label="Fornecedor"
                    papel="fornecedor"
                    value={fornecedor}
                    onChange={aplicarDefaultsFornecedor}
                    required
                    showSummary={false}
                    placeholder="Buscar fornecedor…"
                  />
                  <div className="form-group oc-form-page__cabecalho-condicao">
                    <label>Condição de pagamento</label>
                    <CondicaoPagamentoInput
                      value={condicao}
                      placeholder="Sugerida pelo fornecedor"
                      onChange={setCondicao}
                      showHint={false}
                    />
                  </div>
                  <div className="form-group oc-form-page__cabecalho-previsao">
                    <label>Previsão de entrega</label>
                    <input
                      type="date"
                      value={previsao}
                      onChange={(e) => setPrevisao(e.target.value)}
                    />
                  </div>
                  <div className="form-group oc-form-page__cabecalho-frete">
                    <label>Frete</label>
                    <select
                      value={modFrete}
                      onChange={(e) => setModFrete(e.target.value)}
                      required
                    >
                      <option value={MOD_FRETE_CIF}>CIF</option>
                      <option value={MOD_FRETE_FOB}>FOB</option>
                    </select>
                  </div>
                  <div className="form-group oc-form-page__cabecalho-urgente">
                    <label>&nbsp;</label>
                    <label className="oc-form-page__urgente-check">
                      <input
                        type="checkbox"
                        checked={urgente}
                        onChange={(e) => setUrgente(e.target.checked)}
                      />
                      Urgente
                    </label>
                  </div>
                </div>
                <div className="oc-form-page__cabecalho-transportador">
                  <ParceiroCombobox
                    label={
                      modFrete === MOD_FRETE_FOB
                        ? 'Transportador'
                        : 'Transportador (opcional)'
                    }
                    papel="transportadora"
                    value={transportador}
                    onChange={setTransportador}
                    required={modFrete === MOD_FRETE_FOB}
                    showSummary={false}
                    placeholder="Buscar transportadora…"
                    emptyMessage="Nenhuma transportadora encontrada. Cadastre o parceiro com papel transportadora."
                  />
                  {transportador ? (
                    <p className="oc-form-page__transportador-resumo">
                      {transportadorResumoLinha(transportador)}
                    </p>
                  ) : null}
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
                  const permiteDetalhe = produtoPermiteDetalheBobinaOc(
                    produto,
                    temComposicao,
                  );
                  const unCom = (produto?.unidade_comercial || 'un.').toUpperCase();
                  return (
                    <div key={idx} className="oc-form-page__item">
                      <div
                        className={`oc-form-page__item-row${
                          itens.length > 1 ? ' has-remove' : ''
                        }`}
                      >
                        <ProdutoCombobox
                          className="oc-form-page__item-produto"
                          label="Produto"
                          value={produto}
                          onChange={(p) => onProdutoChange(idx, p)}
                          required
                          showSummary={false}
                          placeholder="Buscar produto…"
                        />
                        <div className="form-group oc-form-page__item-qtde">
                          <label title={temComposicao ? 'Derivada das faixas' : undefined}>
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
                        <div className="form-group oc-form-page__item-valor">
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
                        <div className="form-group oc-form-page__item-aliq">
                          <label>Alíq. IPI %</label>
                          <input
                            inputMode="decimal"
                            value={row.aliq_ipi}
                            onChange={(e) => {
                              const next = [...itens];
                              next[idx] = { ...row, aliq_ipi: e.target.value };
                              setItens(next);
                            }}
                            placeholder="auto"
                            title={
                              ipi > 0
                                ? `IPI ${formatCurrency(ipi.toFixed(DECIMAL_SCALE.money))}`
                                : 'Histórico NF ou vazio'
                            }
                          />
                        </div>
                        <div className="form-group oc-form-page__item-aliq">
                          <label>Alíq. ICMS %</label>
                          <input
                            inputMode="decimal"
                            value={row.aliq_icms}
                            onChange={(e) => {
                              const next = [...itens];
                              next[idx] = { ...row, aliq_icms: e.target.value };
                              setItens(next);
                            }}
                            placeholder="auto"
                            title={
                              icms > 0
                                ? `ICMS ${formatCurrency(icms.toFixed(DECIMAL_SCALE.money))} · destaque`
                                : 'Destaque · não soma no total'
                            }
                          />
                        </div>
                        {itens.length > 1 && (
                          <div className="form-group oc-form-page__item-remove">
                            <label>&nbsp;</label>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setItens(itens.filter((_, i) => i !== idx))}
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>

                      {permiteDetalhe ? (
                        <OcPedidoComposicaoPanel
                          composicao={row.composicao}
                          compact
                          comercial={{
                            unidade_comercial: produto?.unidade_comercial,
                            unidade_interna: produto?.unidade_interna,
                            fator_conversao: produto?.fator_conversao,
                          }}
                          onChange={(composicao) => patchFaixa(idx, composicao)}
                        />
                      ) : null}
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
