import { useEffect, useState, type FormEvent } from 'react';
import {
  api,
  type ApiError,
  type MovimentoEstoque,
  type Produto,
  type SaldoEstoque,
  type Inventario,
} from '../../lib/api';
import { useAuth } from '../../lib/auth';

export function EstoquePage() {
  const { token, usuario } = useAuth();
  const [saldos, setSaldos] = useState<SaldoEstoque[]>([]);
  const [movs, setMovs] = useState<MovimentoEstoque[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const podeMov = usuario?.permissoes.includes('est.movimento.escrever');
  const podeAprovarInv = usuario?.permissoes.includes('est.inventario.aprovar');
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [form, setForm] = useState({
    produtoId: '',
    tipo: 'ENTRADA' as 'ENTRADA' | 'SAIDA',
    quantidade: '',
    custoUnitario: '0',
    motivoTexto: '',
    entradaInicial: false,
  });

  async function load() {
    if (!token) return;
    try {
      const [s, m, p, inv] = await Promise.all([
        api.saldos(token),
        api.movimentos(token),
        api.produtos(token),
        api.inventarios(token).catch(() => [] as Inventario[]),
      ]);
      setSaldos(s);
      setMovs(m);
      setProdutos(p.filter((x) => x.familia !== 'SVC'));
      setInventarios(inv);
      setErro(null);
    } catch (e) {
      setErro((e as ApiError).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onAjuste(e: FormEvent) {
    e.preventDefault();
    if (!token || !form.produtoId) return;
    try {
      const mov = await api.ajusteEstoque(token, {
        produtoId: form.produtoId,
        tipo: form.tipo,
        quantidade: form.quantidade,
        custoUnitario: form.tipo === 'ENTRADA' ? form.custoUnitario : null,
        motivoTexto: form.motivoTexto || null,
        entradaInicial: form.entradaInicial && form.tipo === 'ENTRADA',
      });
      setOkMsg(`${mov.codigo} · saldo após ${mov.saldoApos}`);
      setForm((f) => ({ ...f, quantidade: '', motivoTexto: '' }));
      await load();
    } catch (err) {
      setErro((err as ApiError).message);
      setOkMsg(null);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Estoque</h1>
        <p className="muted">
          M04 dia-1 · MOV imutável · saída bloqueada sem saldo · ajuste / inventário simples
        </p>
      </header>

      {erro ? <p className="error">{erro}</p> : null}
      {okMsg ? <p className="callout">{okMsg}</p> : null}

      {podeMov ? (
        <form className="panel-form" onSubmit={onAjuste}>
          <h2>Lançamento manual</h2>
          <div className="form-grid">
            <label>
              Produto
              <select
                required
                value={form.produtoId}
                onChange={(e) => setForm({ ...form, produtoId: e.target.value })}
              >
                <option value="">Selecione…</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} — {p.descricao}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tipo
              <select
                value={form.tipo}
                onChange={(e) =>
                  setForm({ ...form, tipo: e.target.value as 'ENTRADA' | 'SAIDA' })
                }
              >
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
              </select>
            </label>
            <label>
              Quantidade
              <input
                required
                className="mono"
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                placeholder="0.0000"
              />
            </label>
            {form.tipo === 'ENTRADA' ? (
              <label>
                Custo unitário
                <input
                  className="mono"
                  value={form.custoUnitario}
                  onChange={(e) => setForm({ ...form, custoUnitario: e.target.value })}
                />
              </label>
            ) : null}
            <label>
              Motivo
              <input
                value={form.motivoTexto}
                onChange={(e) => setForm({ ...form, motivoTexto: e.target.value })}
                placeholder="Inventário / correção"
              />
            </label>
            {form.tipo === 'ENTRADA' ? (
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.entradaInicial}
                  onChange={(e) =>
                    setForm({ ...form, entradaInicial: e.target.checked })
                  }
                />
                Marcar como entrada inicial
              </label>
            ) : null}
          </div>
          <button type="submit" className="btn">
            Registrar MOV
          </button>
        </form>
      ) : null}

      {podeMov ? (
        <div className="panel-form" style={{ marginBottom: '1rem' }}>
          <h2>Inventário formal (INV-)</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={async () => {
                if (!token) return;
                try {
                  const inv = await api.abrirInventario(token);
                  setOkMsg(`Inventário ${inv.codigo} aberto (${inv.itens.length} itens)`);
                  await load();
                } catch (err) {
                  setErro((err as ApiError).message);
                }
              }}
            >
              Abrir inventário
            </button>
          </div>
          {inventarios.slice(0, 3).map((inv) => (
            <div key={inv.id} className="muted" style={{ marginTop: 8 }}>
              {inv.codigo} · {inv.status}
              {inv.status === 'AGUARDA_APROVACAO' && podeAprovarInv ? (
                <button
                  type="button"
                  className="btn ghost"
                  style={{ marginLeft: 8 }}
                  onClick={async () => {
                    if (!token) return;
                    try {
                      await api.aprovarInventario(token, inv.id);
                      setOkMsg(`${inv.codigo} aprovado`);
                      await load();
                    } catch (err) {
                      setErro((err as ApiError).message);
                    }
                  }}
                >
                  Aprovar
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <h2>Saldos</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Família</th>
              <th>Qtde</th>
              <th>Un</th>
              <th>Custo médio</th>
            </tr>
          </thead>
          <tbody>
            {saldos.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Nenhum saldo materializado
                </td>
              </tr>
            ) : (
              saldos.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="mono">{s.produto.codigo}</span>
                    <div className="muted">{s.produto.descricao}</div>
                  </td>
                  <td>{s.produto.familia}</td>
                  <td className="mono">{s.quantidade}</td>
                  <td className="mono">{s.produto.unidadeEstoque.codigo}</td>
                  <td className="mono">{s.custoMedio}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2>Últimos movimentos</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Motivo</th>
              <th>SKU</th>
              <th>Qtde</th>
              <th>Saldo após</th>
            </tr>
          </thead>
          <tbody>
            {movs.map((m) => (
              <tr key={m.id}>
                <td className="mono">{m.codigo}</td>
                <td>{m.tipo}</td>
                <td>{m.motivo}</td>
                <td className="mono">{m.produto.codigo}</td>
                <td className="mono">{m.quantidade}</td>
                <td className="mono">{m.saldoApos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
