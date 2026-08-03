import { ChangeEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { DocStatusChip } from '../components/StatusChip';
import { comprasApi, formatDate, formatMoney, getErrorMessage, nfeApi, produtosApi } from '../lib/api';
import { ETAPAS } from '../lib/stages';
import type { ApiRow, TipoProduto, UnidadeProduto } from '../types';

interface ItemBind {
  nfe_item_id: number;
  produto_id: number | '';
  criar_produto: boolean;
  descricao: string;
  tipo: TipoProduto;
  unidade: UnidadeProduto;
}

export function NfePage() {
  const etapa = ETAPAS[5];
  const [lista, setLista] = useState<ApiRow[]>([]);
  const [produtos, setProdutos] = useState<ApiRow[]>([]);
  const [ordens, setOrdens] = useState<ApiRow[]>([]);
  const [ordensAll, setOrdensAll] = useState<ApiRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [aceitarId, setAceitarId] = useState<number | null>(null);
  const [itensBind, setItensBind] = useState<ItemBind[]>([]);
  const [ordemCompraId, setOrdemCompraId] = useState<number | ''>('');

  async function carregar() {
    try {
      const [n, p, o] = await Promise.all([nfeApi.list(), produtosApi.list(), comprasApi.ordens()]);
      setLista(n as ApiRow[]);
      setProdutos(p as ApiRow[]);
      setOrdensAll(o as ApiRow[]);
      setOrdens(
        (o as ApiRow[]).filter((x) =>
          ['RASCUNHO', 'ENVIADA', 'PARCIAL'].includes(String(x.status)),
        ),
      );
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setPending(true);
    setErro(null);
    try {
      await nfeApi.upload(files);
      await carregar();
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setPending(false);
      e.target.value = '';
    }
  }

  function abrirAceitar(nfe: ApiRow) {
    const itens = (nfe.itens as ApiRow[]) ?? [];
    setAceitarId(nfe.id as number);
    setOrdemCompraId((nfe.ordem_compra_id as number) ?? '');
    setItensBind(
      itens.map((i) => ({
        nfe_item_id: i.id as number,
        produto_id: (i.produto_id as number) ?? '',
        criar_produto: !i.produto_id,
        descricao: String(i.descricao ?? ''),
        tipo: 'INSUMO',
        unidade: (String(i.unidade ?? 'M2') as UnidadeProduto) || 'M2',
      })),
    );
  }

  async function confirmarAceitar() {
    if (aceitarId == null) return;
    setPending(true);
    setErro(null);
    try {
      await nfeApi.aceitar(
        aceitarId,
        itensBind.map((b) => ({
          nfe_item_id: b.nfe_item_id,
          produto_id: b.criar_produto ? undefined : b.produto_id === '' ? undefined : b.produto_id,
          criar_produto: b.criar_produto,
          descricao: b.criar_produto ? b.descricao : undefined,
          tipo: b.tipo,
          unidade: b.unidade,
        })),
        ordemCompraId === '' ? null : ordemCompraId,
      );
      setAceitarId(null);
      await carregar();
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function rejeitar(id: number) {
    setPending(true);
    try {
      await nfeApi.rejeitar(id);
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
        codigo="NF-E"
        titulo="NF-e entrada"
        modo={etapa.modo}
        regra="XML → de/para → (OC opcional) → MOV + TIT a pagar. Nada entra no olho."
        actions={
          <>
            <Link to="/compras" className="btn">
              Compras
            </Link>
            <label className="btn primary" style={{ cursor: 'pointer' }}>
              Upload XML
              <input type="file" accept=".xml" multiple hidden disabled={pending} onChange={upload} />
            </label>
          </>
        }
      />

      {erro ? <p className="error">{erro}</p> : null}

      <section className="panel">
        <table className="data">
          <thead>
            <tr>
              <th>Número</th>
              <th>Emitente</th>
              <th>Valor</th>
              <th>OC</th>
              <th>Status</th>
              <th>Itens</th>
              <th>Importado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.map((n) => {
              const status = String(n.status);
              const itens = (n.itens as ApiRow[]) ?? [];
              const oc = ordensAll.find((o) => o.id === n.ordem_compra_id);
              return (
                <tr key={String(n.id)}>
                  <td>{String(n.numero)}</td>
                  <td>{String(n.emit_nome ?? n.emitente ?? '—')}</td>
                  <td>{formatMoney(n.valor_total as string | number)}</td>
                  <td>{oc ? String(oc.codigo) : n.ordem_compra_id ? `#${n.ordem_compra_id}` : '—'}</td>
                  <td>
                    <DocStatusChip status={status} />
                  </td>
                  <td>{itens.length}</td>
                  <td>{formatDate(String(n.created_at))}</td>
                  <td>
                    {status === 'PENDENTE' ? (
                      <div className="btn-row">
                        <button type="button" className="btn sm primary" onClick={() => abrirAceitar(n)}>
                          Aceitar
                        </button>
                        <button
                          type="button"
                          className="btn sm"
                          disabled={pending}
                          onClick={() => rejeitar(n.id as number)}
                        >
                          Rejeitar
                        </button>
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {aceitarId != null ? (
        <div className="modal-backdrop" onClick={() => setAceitarId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Mapear itens NF-e</h2>
              <button type="button" className="btn ghost sm" onClick={() => setAceitarId(null)}>
                Fechar
              </button>
            </div>

            <label style={{ display: 'block', marginBottom: '1rem' }}>
              Ordem de compra (amarrar NF × OC)
              <select
                value={ordemCompraId === '' ? '' : String(ordemCompraId)}
                onChange={(e) =>
                  setOrdemCompraId(e.target.value ? parseInt(e.target.value, 10) : '')
                }
              >
                <option value="">Entrada avulsa (sem OC)</option>
                {ordens.map((o) => (
                  <option key={String(o.id)} value={String(o.id)}>
                    {String(o.codigo)} — {String(o.parceiro_nome ?? '')}
                  </option>
                ))}
              </select>
            </label>

            {itensBind.map((b, idx) => (
              <div key={b.nfe_item_id} className="panel" style={{ marginBottom: '0.75rem' }}>
                <p>
                  <strong>Item #{b.nfe_item_id}</strong> — {b.descricao}
                </p>
                <div className="form-grid">
                  <label>
                    Modo
                    <select
                      value={b.criar_produto ? 'criar' : 'existente'}
                      onChange={(e) => {
                        const criar = e.target.value === 'criar';
                        const next = [...itensBind];
                        next[idx] = { ...b, criar_produto: criar, produto_id: criar ? '' : b.produto_id };
                        setItensBind(next);
                      }}
                    >
                      <option value="existente">Produto existente</option>
                      <option value="criar">Criar produto</option>
                    </select>
                  </label>
                  {!b.criar_produto ? (
                    <label>
                      Produto
                      <select
                        value={b.produto_id === '' ? '' : String(b.produto_id)}
                        onChange={(e) => {
                          const next = [...itensBind];
                          next[idx] = {
                            ...b,
                            produto_id: e.target.value ? parseInt(e.target.value, 10) : '',
                          };
                          setItensBind(next);
                        }}
                      >
                        <option value="">Selecionar…</option>
                        {produtos.map((p) => (
                          <option key={String(p.id)} value={String(p.id)}>
                            {String(p.codigo)} — {String(p.descricao)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <>
                      <label>
                        Descrição
                        <input
                          value={b.descricao}
                          onChange={(e) => {
                            const next = [...itensBind];
                            next[idx] = { ...b, descricao: e.target.value };
                            setItensBind(next);
                          }}
                        />
                      </label>
                      <label>
                        Tipo
                        <select
                          value={b.tipo}
                          onChange={(e) => {
                            const next = [...itensBind];
                            next[idx] = { ...b, tipo: e.target.value as TipoProduto };
                            setItensBind(next);
                          }}
                        >
                          {(['INSUMO', 'ACABADO', 'REVENDA', 'EMBALAGEM'] as TipoProduto[]).map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Unidade
                        <select
                          value={b.unidade}
                          onChange={(e) => {
                            const next = [...itensBind];
                            next[idx] = { ...b, unidade: e.target.value as UnidadeProduto };
                            setItensBind(next);
                          }}
                        >
                          {(['M2', 'ML', 'UN', 'KG', 'RL'] as UnidadeProduto[]).map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                </div>
              </div>
            ))}

            <div className="btn-row">
              <button type="button" className="btn primary" disabled={pending} onClick={confirmarAceitar}>
                Confirmar aceite
              </button>
              <button type="button" className="btn" onClick={() => setAceitarId(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
