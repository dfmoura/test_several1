import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { formatDate, formatMoney, formatQty, getErrorMessage, estoqueApi, produtosApi } from '../lib/api';
import { ETAPAS } from '../lib/stages';
import type { ApiRow } from '../types';

const TIPOS_MOV = ['ENTRADA_MANUAL', 'SAIDA_MANUAL', 'AJUSTE', 'RESERVA', 'LIBERA_RESERVA'] as const;

export function EstoquePage() {
  const etapa = ETAPAS[5];
  const [saldos, setSaldos] = useState<ApiRow[]>([]);
  const [movimentos, setMovimentos] = useState<ApiRow[]>([]);
  const [produtos, setProdutos] = useState<ApiRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [movForm, setMovForm] = useState({
    produto_id: '',
    tipo: 'ENTRADA_MANUAL' as (typeof TIPOS_MOV)[number],
    quantidade: '1',
    unidade_entrada: 'M2',
    custo_unitario: '0',
    documento_ref: '',
    observacao: '',
  });

  async function carregar() {
    try {
      const [s, m, p] = await Promise.all([
        estoqueApi.saldos(),
        estoqueApi.movimentos(),
        produtosApi.list(),
      ]);
      setSaldos(s as ApiRow[]);
      setMovimentos(m as ApiRow[]);
      setProdutos(p as ApiRow[]);
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criarMovimento(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setErro(null);
    try {
      await estoqueApi.criarMovimento({
        produto_id: parseInt(movForm.produto_id, 10),
        tipo: movForm.tipo,
        quantidade: parseFloat(movForm.quantidade),
        unidade_entrada: movForm.unidade_entrada,
        custo_unitario: parseFloat(movForm.custo_unitario) || 0,
        documento_ref: movForm.documento_ref || null,
        observacao: movForm.observacao || null,
      });
      setMovForm({ ...movForm, quantidade: '1', observacao: '', documento_ref: '' });
      await carregar();
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const alertas = saldos.filter((s) => s.abaixo_ponto_pedido || s.abaixo_minimo);

  return (
    <>
      <PageHeader
        ordem={etapa.ordem}
        codigo={etapa.codigo}
        titulo={etapa.titulo}
        modo={etapa.modo}
        regra="Saldos dual; disponível/reservado; empenho OP → BAIXA_MP → ENTRADA_SOBRA/PA; NF-e × OC alimenta MOV."
        actions={
          <>
            <Link to="/producao" className="btn">
              Produção
            </Link>
            <Link to="/compras" className="btn">
              Compras
            </Link>
            <Link to="/nfe" className="btn">
              NF-e entrada
            </Link>
          </>
        }
      />

      {erro ? <p className="error">{erro}</p> : null}

      {alertas.length > 0 ? (
        <section className="panel">
          <h2 className="panel-title">Alertas de reposição ({alertas.length})</h2>
          <table className="data">
            <thead>
              <tr>
                <th>Código</th>
                <th>Disponível</th>
                <th>Limiar</th>
                <th>Sugestão</th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((s) => (
                <tr key={String(s.id)} className="fail">
                  <td>
                    {String(s.codigo)} — {String(s.descricao)}
                  </td>
                  <td>
                    {formatQty(s.saldo_disponivel as string | number)} {String(s.unidade)}
                  </td>
                  <td>{formatQty(s.limiar_reposicao as string | number)}</td>
                  <td>{formatQty(s.sugestao_compra as string | number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: '0.75rem' }}>
            Gere necessidades em <Link to="/compras">Compras</Link> a partir do ponto de pedido.
          </p>
        </section>
      ) : null}

      <section className="panel">
        <h2 className="panel-title">Saldos</h2>
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Físico</th>
              <th>Reservado</th>
              <th>Disponível</th>
              <th>M²</th>
              <th>ML</th>
              <th>Custo médio</th>
              <th>Reposição</th>
            </tr>
          </thead>
          <tbody>
            {saldos.map((s) => (
              <tr
                key={String(s.id)}
                className={s.abaixo_ponto_pedido || s.abaixo_minimo ? 'fail' : undefined}
              >
                <td>{String(s.codigo)}</td>
                <td>{String(s.descricao)}</td>
                <td>
                  {formatQty(s.saldo_qtd as string | number)} {String(s.unidade)}
                </td>
                <td>{formatQty(s.saldo_reservado as string | number)}</td>
                <td>{formatQty(s.saldo_disponivel as string | number)}</td>
                <td>{formatQty(s.qtd_m2 as number)}</td>
                <td>{formatQty(s.qtd_ml as number)}</td>
                <td>{formatMoney(s.custo_medio as string | number)}</td>
                <td>
                  {s.abaixo_ponto_pedido ? 'Ponto pedido' : s.abaixo_minimo ? 'Mínimo' : 'OK'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2 className="panel-title">Movimento / reserva</h2>
        <form onSubmit={criarMovimento} className="form-grid">
          <label>
            Produto
            <select
              required
              value={movForm.produto_id}
              onChange={(e) => setMovForm({ ...movForm, produto_id: e.target.value })}
            >
              <option value="">Selecionar…</option>
              {produtos.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {String(p.codigo)} — {String(p.descricao)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select
              value={movForm.tipo}
              onChange={(e) =>
                setMovForm({ ...movForm, tipo: e.target.value as (typeof TIPOS_MOV)[number] })
              }
            >
              {TIPOS_MOV.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
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
              value={movForm.quantidade}
              onChange={(e) => setMovForm({ ...movForm, quantidade: e.target.value })}
            />
          </label>
          <label>
            Unidade entrada
            <select
              value={movForm.unidade_entrada}
              onChange={(e) => setMovForm({ ...movForm, unidade_entrada: e.target.value })}
            >
              {['M2', 'ML', 'UN', 'KG', 'RL'].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <label>
            Custo unitário
            <input
              type="number"
              step="0.0001"
              value={movForm.custo_unitario}
              onChange={(e) => setMovForm({ ...movForm, custo_unitario: e.target.value })}
            />
          </label>
          <label>
            Doc. ref. (OP/PED)
            <input
              value={movForm.documento_ref}
              onChange={(e) => setMovForm({ ...movForm, documento_ref: e.target.value })}
              placeholder="OP-2026-00001"
            />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Observação {movForm.tipo === 'AJUSTE' ? '(obrigatória)' : ''}
            <input
              required={movForm.tipo === 'AJUSTE'}
              value={movForm.observacao}
              onChange={(e) => setMovForm({ ...movForm, observacao: e.target.value })}
            />
          </label>
          <div>
            <button type="submit" className="btn primary" disabled={pending}>
              Registrar
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="panel-title">Movimentos recentes</h2>
        <table className="data">
          <thead>
            <tr>
              <th>ID</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Qtd.</th>
              <th>Doc.</th>
              <th>OP</th>
              <th>PED</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {movimentos.map((m) => {
              const prod = produtos.find((p) => p.id === m.produto_id);
              return (
                <tr key={String(m.id)}>
                  <td>{String(m.id)}</td>
                  <td>{prod ? String(prod.codigo) : String(m.produto_id)}</td>
                  <td>{String(m.tipo)}</td>
                  <td>{formatQty(m.quantidade as string | number)}</td>
                  <td>{String(m.documento_ref ?? '—')}</td>
                  <td>{m.op_id != null ? String(m.op_id) : '—'}</td>
                  <td>{m.pedido_id != null ? String(m.pedido_id) : '—'}</td>
                  <td>{formatDate(String(m.created_at))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
