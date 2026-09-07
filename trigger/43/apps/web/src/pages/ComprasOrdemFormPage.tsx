import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CondicaoPagamentoInput } from '../components/CondicaoPagamentoInput';
import { PageHeader } from '../components/PageHeader';
import { ParceiroCombobox } from '../components/ParceiroCombobox';
import { ApiError, api, type OrdemCompra, type Parceiro, type Produto } from '../lib/api';
import { useAuth } from '../lib/auth';

type ItemRow = {
  produto_id: string;
  qtde_pedida: string;
  valor_unitario: string;
};

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
  const [itens, setItens] = useState<ItemRow[]>([
    { produto_id: '', qtde_pedida: '', valor_unitario: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

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
        setItens(
          (oc.itens ?? []).map((i) => ({
            produto_id: String(i.produto_id),
            qtde_pedida: i.qtde_pedida,
            valor_unitario: i.valor_unitario,
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
        itens: itens
          .filter((i) => i.produto_id && i.qtde_pedida && i.valor_unitario)
          .map((i) => ({
            produto_id: Number(i.produto_id),
            qtde_pedida: i.qtde_pedida,
            valor_unitario: i.valor_unitario,
          })),
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
        description={
          isEdit
            ? 'Ajuste fornecedor, itens e condições enquanto a OC estiver em rascunho.'
            : 'Salve em rascunho. Depois confira a ficha e envie ao fornecedor.'
        }
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
        <form onSubmit={(e) => void submit(e)}>
          <div className="card" style={{ marginBottom: '1rem' }}>
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
                    hint="PAR classificado como fornecedor · busca no cadastro (não lista tudo de uma vez)."
                  />
                  <div className="form-group">
                    <label>Condição de pagamento</label>
                    <CondicaoPagamentoInput
                      value={condicao}
                      placeholder="Sugerida pelo fornecedor"
                      onChange={setCondicao}
                    />
                    <span className="form-hint">
                      Prefill do PAR ao escolher o fornecedor · editável nesta OC (snapshot).
                    </span>
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

          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div className="form-section">
                <h3>Itens</h3>
                {itens.map((row, idx) => (
                  <div className="form-grid" key={idx} style={{ marginBottom: '0.75rem' }}>
                    <div className="form-group span-2">
                      <label>Produto</label>
                      <select
                        required
                        value={row.produto_id}
                        onChange={(e) => {
                          const next = [...itens];
                          next[idx] = { ...row, produto_id: e.target.value };
                          setItens(next);
                        }}
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
                      <label>Qtde (un. comercial)</label>
                      <input
                        required
                        inputMode="decimal"
                        value={row.qtde_pedida}
                        onChange={(e) => {
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
                    {itens.length > 1 && (
                      <div className="form-group">
                        <label>&nbsp;</label>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setItens(itens.filter((_, i) => i !== idx))}
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      setItens([
                        ...itens,
                        { produto_id: '', qtde_pedida: '', valor_unitario: '' },
                      ])
                    }
                  >
                    + Item
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div className="form-section">
                <h3>Observação</h3>
                <div className="form-group">
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    rows={3}
                    placeholder="Instruções ao fornecedor, referência interna…"
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
