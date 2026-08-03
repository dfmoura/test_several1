import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { DocStatusChip } from '../components/StatusChip';
import {
  comprasApi,
  formatDate,
  formatMoney,
  formatQty,
  getErrorMessage,
  parceirosApi,
  produtosApi,
} from '../lib/api';
import type { ApiRow } from '../types';

export function ComprasPage() {
  const [necessidades, setNecessidades] = useState<ApiRow[]>([]);
  const [ordens, setOrdens] = useState<ApiRow[]>([]);
  const [produtos, setProdutos] = useState<ApiRow[]>([]);
  const [fornecedores, setFornecedores] = useState<ApiRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [necForm, setNecForm] = useState({
    produto_id: '',
    quantidade: '100',
    urgencia: false,
    observacao: '',
  });
  const [ocForm, setOcForm] = useState({
    parceiro_id: '',
    necessidade_id: '',
    produto_id: '',
    quantidade: '100',
    preco_unitario: '0',
    urgencia: false,
    previsao_entrega: '',
    condicao_pagamento: '',
    observacao: '',
  });

  const insumos = useMemo(
    () => produtos.filter((p) => p.controla_estoque !== false),
    [produtos],
  );

  async function carregar() {
    try {
      const [n, o, p, parc] = await Promise.all([
        comprasApi.necessidades(),
        comprasApi.ordens(),
        produtosApi.list(),
        parceirosApi.list(),
      ]);
      setNecessidades(n as ApiRow[]);
      setOrdens(o as ApiRow[]);
      setProdutos(p as ApiRow[]);
      setFornecedores(
        (parc as ApiRow[]).filter((x) => {
          const tipos = (x.tipos as string[]) || [];
          return tipos.includes('FORNECEDOR') || tipos.includes('AMBOS');
        }),
      );
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function gerarReposicao() {
    setPending(true);
    setErro(null);
    try {
      const r = await comprasApi.gerarReposicao();
      if (!r.criadas) setErro('Nenhuma reposição necessária (saldo ≥ ponto de pedido).');
      await carregar();
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function criarNec(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setErro(null);
    try {
      await comprasApi.criarNecessidade({
        urgencia: necForm.urgencia,
        observacao: necForm.observacao || null,
        itens: [
          {
            produto_id: parseInt(necForm.produto_id, 10),
            quantidade: parseFloat(necForm.quantidade),
          },
        ],
      });
      setNecForm({ ...necForm, observacao: '' });
      await carregar();
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function criarOc(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setErro(null);
    try {
      const prod = produtos.find((p) => String(p.id) === ocForm.produto_id);
      await comprasApi.criarOrdem({
        parceiro_id: parseInt(ocForm.parceiro_id, 10),
        necessidade_id: ocForm.necessidade_id ? parseInt(ocForm.necessidade_id, 10) : null,
        urgencia: ocForm.urgencia,
        previsao_entrega: ocForm.previsao_entrega || null,
        condicao_pagamento: ocForm.condicao_pagamento || null,
        observacao: ocForm.observacao || null,
        itens: [
          {
            produto_id: parseInt(ocForm.produto_id, 10),
            descricao: prod ? String(prod.descricao) : undefined,
            quantidade: parseFloat(ocForm.quantidade),
            unidade: prod ? String(prod.unidade) : 'M2',
            preco_unitario: parseFloat(ocForm.preco_unitario) || 0,
          },
        ],
      });
      await carregar();
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  function preencherOcDaNec(n: ApiRow) {
    const item = ((n.itens as ApiRow[]) || [])[0];
    if (!item) return;
    setOcForm({
      ...ocForm,
      necessidade_id: String(n.id),
      produto_id: String(item.produto_id),
      quantidade: String(item.quantidade),
      urgencia: Boolean(n.urgencia),
      observacao: `Origem ${String(n.codigo)}`,
    });
  }

  return (
    <>
      <PageHeader
        ordem={5}
        codigo="M07"
        titulo="Compras"
        modo="OPERACIONAL"
        regra="Necessidade → OC formal → NF-e × OC → MOV. Sem compra só no zap."
        actions={
          <>
            <Link to="/estoque" className="btn">
              Estoque
            </Link>
            <Link to="/nfe" className="btn">
              NF-e entrada
            </Link>
          </>
        }
      />

      {erro ? <p className="error">{erro}</p> : null}

      <section className="panel">
        <div className="btn-row" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 className="panel-title" style={{ margin: 0 }}>
            Necessidades (NEC-)
          </h2>
          <button type="button" className="btn primary" disabled={pending} onClick={gerarReposicao}>
            Gerar reposição (ponto de pedido)
          </button>
        </div>
        <form onSubmit={criarNec} className="form-grid">
          <label>
            Produto
            <select
              required
              value={necForm.produto_id}
              onChange={(e) => setNecForm({ ...necForm, produto_id: e.target.value })}
            >
              <option value="">Selecionar…</option>
              {insumos.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {String(p.codigo)} — {String(p.descricao)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantidade
            <input
              type="number"
              step="0.0001"
              required
              value={necForm.quantidade}
              onChange={(e) => setNecForm({ ...necForm, quantidade: e.target.value })}
            />
          </label>
          <label>
            Urgência
            <select
              value={necForm.urgencia ? '1' : '0'}
              onChange={(e) => setNecForm({ ...necForm, urgencia: e.target.value === '1' })}
            >
              <option value="0">Normal</option>
              <option value="1">Urgente</option>
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Observação
            <input
              value={necForm.observacao}
              onChange={(e) => setNecForm({ ...necForm, observacao: e.target.value })}
            />
          </label>
          <div>
            <button type="submit" className="btn" disabled={pending}>
              Criar necessidade
            </button>
          </div>
        </form>

        <table className="data" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Status</th>
              <th>Origem</th>
              <th>Urg.</th>
              <th>Itens</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {necessidades.map((n) => (
              <tr key={String(n.id)}>
                <td>{String(n.codigo)}</td>
                <td>
                  <DocStatusChip status={String(n.status)} />
                </td>
                <td>{String(n.origem)}</td>
                <td>{n.urgencia ? 'Sim' : 'Não'}</td>
                <td>
                  {((n.itens as ApiRow[]) || [])
                    .map((i) => `${formatQty(i.quantidade as string | number)}× ${String(i.descricao)}`)
                    .join('; ')}
                </td>
                <td>
                  {n.status === 'ABERTA' || n.status === 'EM_COMPRA' ? (
                    <button type="button" className="btn sm" onClick={() => preencherOcDaNec(n)}>
                      Gerar OC
                    </button>
                  ) : null}
                  {n.status === 'ABERTA' ? (
                    <button
                      type="button"
                      className="btn ghost sm"
                      disabled={pending}
                      onClick={async () => {
                        setPending(true);
                        try {
                          await comprasApi.cancelarNecessidade(n.id as number);
                          await carregar();
                        } catch (e) {
                          setErro(getErrorMessage(e));
                        } finally {
                          setPending(false);
                        }
                      }}
                    >
                      Cancelar
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2 className="panel-title">Ordens de compra (OC-)</h2>
        <form onSubmit={criarOc} className="form-grid">
          <label>
            Fornecedor
            <select
              required
              value={ocForm.parceiro_id}
              onChange={(e) => setOcForm({ ...ocForm, parceiro_id: e.target.value })}
            >
              <option value="">Selecionar…</option>
              {fornecedores.map((f) => (
                <option key={String(f.id)} value={String(f.id)}>
                  {String(f.razao_social)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Necessidade (opc.)
            <select
              value={ocForm.necessidade_id}
              onChange={(e) => setOcForm({ ...ocForm, necessidade_id: e.target.value })}
            >
              <option value="">—</option>
              {necessidades
                .filter((n) => n.status === 'ABERTA' || n.status === 'EM_COMPRA')
                .map((n) => (
                  <option key={String(n.id)} value={String(n.id)}>
                    {String(n.codigo)}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Produto
            <select
              required
              value={ocForm.produto_id}
              onChange={(e) => setOcForm({ ...ocForm, produto_id: e.target.value })}
            >
              <option value="">Selecionar…</option>
              {insumos.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {String(p.codigo)} — {String(p.descricao)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantidade
            <input
              type="number"
              step="0.0001"
              required
              value={ocForm.quantidade}
              onChange={(e) => setOcForm({ ...ocForm, quantidade: e.target.value })}
            />
          </label>
          <label>
            Preço unit.
            <input
              type="number"
              step="0.0001"
              value={ocForm.preco_unitario}
              onChange={(e) => setOcForm({ ...ocForm, preco_unitario: e.target.value })}
            />
          </label>
          <label>
            Previsão entrega
            <input
              type="date"
              value={ocForm.previsao_entrega}
              onChange={(e) => setOcForm({ ...ocForm, previsao_entrega: e.target.value })}
            />
          </label>
          <label>
            Urgência
            <select
              value={ocForm.urgencia ? '1' : '0'}
              onChange={(e) => setOcForm({ ...ocForm, urgencia: e.target.value === '1' })}
            >
              <option value="0">Normal</option>
              <option value="1">Urgente</option>
            </select>
          </label>
          <label>
            Condição pgto
            <input
              value={ocForm.condicao_pagamento}
              onChange={(e) => setOcForm({ ...ocForm, condicao_pagamento: e.target.value })}
            />
          </label>
          <div>
            <button type="submit" className="btn primary" disabled={pending}>
              Emitir OC
            </button>
          </div>
        </form>

        <table className="data" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Fornecedor</th>
              <th>Status</th>
              <th>Urg.</th>
              <th>Valor</th>
              <th>Prev.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ordens.map((o) => (
              <tr key={String(o.id)}>
                <td>{String(o.codigo)}</td>
                <td>{String(o.parceiro_nome ?? o.parceiro_id)}</td>
                <td>
                  <DocStatusChip status={String(o.status)} />
                </td>
                <td>{o.urgencia ? 'Sim' : 'Não'}</td>
                <td>{formatMoney(o.valor_total as string | number)}</td>
                <td>{o.previsao_entrega ? formatDate(String(o.previsao_entrega)) : '—'}</td>
                <td>
                  {o.status === 'RASCUNHO' ? (
                    <button
                      type="button"
                      className="btn sm"
                      disabled={pending}
                      onClick={async () => {
                        setPending(true);
                        try {
                          await comprasApi.statusOrdem(o.id as number, 'ENVIADA');
                          await carregar();
                        } catch (e) {
                          setErro(getErrorMessage(e));
                        } finally {
                          setPending(false);
                        }
                      }}
                    >
                      Marcar enviada
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
