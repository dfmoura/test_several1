import { useEffect, useState, type FormEvent } from 'react';
import { api, type ApiError, type Orcamento, type Parceiro, type Produto } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export function OrcamentosPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Orcamento[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [linkMsg, setLinkMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    parceiroId: '',
    produtoId: '',
    quantidade: '1',
    precoUnitario: '',
    descontoPct: '0',
  });

  async function load() {
    if (!token) return;
    try {
      const [orcs, pars, prods] = await Promise.all([
        api.orcamentos(token),
        api.parceiros(token, { papel: 'CLIENTE' }),
        api.produtos(token),
      ]);
      setItems(orcs);
      setParceiros(pars.filter((p) => p.papeis.cliente));
      setProdutos(prods);
      setErro(null);
      if (!form.parceiroId && pars.length) {
        const completo = pars.find((p) => p.cadastroFiscalCompleto) ?? pars[0];
        if (completo) setForm((f) => ({ ...f, parceiroId: completo.id }));
      }
      if (!form.produtoId) {
        const pa = prods.find((p) => p.familia === 'PA') ?? prods[0];
        if (pa) setForm((f) => ({ ...f, produtoId: pa.id }));
      }
    } catch (e) {
      setErro((e as ApiError).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLinkMsg(null);
    try {
      await api.criarOrcamento(token, {
        parceiroId: form.parceiroId,
        itens: [
          {
            produtoId: form.produtoId,
            quantidade: form.quantidade,
            precoUnitario: form.precoUnitario || undefined,
            descontoPct: form.descontoPct,
          },
        ],
      });
      await load();
    } catch (err) {
      setErro((err as ApiError).message);
    }
  }

  async function enviar(id: string) {
    if (!token) return;
    setLinkMsg(null);
    try {
      const res = await api.enviarAceite(token, id);
      setLinkMsg(res.linkAceite);
      await load();
    } catch (err) {
      setErro((err as ApiError).message);
    }
  }

  async function converter(id: string) {
    if (!token) return;
    try {
      await api.converterPedido(token, id);
      await load();
    } catch (err) {
      setErro((err as ApiError).message);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Orçamentos</h1>
        <p className="muted">UC-COM-001 · 005 · 006 — aceitar só via link formal</p>
      </header>

      <form className="panel-form" onSubmit={onCreate}>
        <h2>Novo ORC</h2>
        <div className="form-grid">
          <label>
            Cliente
            <select
              required
              value={form.parceiroId}
              onChange={(e) => setForm({ ...form, parceiroId: e.target.value })}
            >
              {parceiros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.razaoSocial}
                  {p.ehProspect ? ' (prospect)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Produto
            <select
              required
              value={form.produtoId}
              onChange={(e) => setForm({ ...form, produtoId: e.target.value })}
            >
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.descricao}
                </option>
              ))}
            </select>
          </label>
          <label>
            Qtde
            <input
              required
              value={form.quantidade}
              onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
            />
          </label>
          <label>
            Preço unit. (opcional se houver tabela)
            <input
              value={form.precoUnitario}
              onChange={(e) => setForm({ ...form, precoUnitario: e.target.value })}
            />
          </label>
        </div>
        <button className="btn primary" type="submit">
          Criar ORC
        </button>
      </form>

      {erro ? <p className="error">{erro}</p> : null}
      {linkMsg ? (
        <div className="callout">
          Link de aceite (envie ao cliente):{' '}
          <a href={linkMsg} target="_blank" rel="noreferrer">
            {linkMsg}
          </a>
        </div>
      ) : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Total</th>
              <th>Imposto est.</th>
              <th>PED</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id}>
                <td className="mono">
                  {o.codigo} v{o.versao}
                </td>
                <td>{o.parceiro.razaoSocial}</td>
                <td>{o.status}</td>
                <td className="mono">R$ {o.valorTotal}</td>
                <td className="mono muted">R$ {o.valorImpostoEstimado}</td>
                <td className="mono">{o.pedidoCodigo ?? '—'}</td>
                <td className="row-actions">
                  {['RASCUNHO', 'EXPIRADO', 'RECUSADO'].includes(o.status) ? (
                    <button type="button" className="btn" onClick={() => void enviar(o.id)}>
                      Enviar aceite
                    </button>
                  ) : null}
                  {o.status === 'APROVADO' && !o.pedidoId ? (
                    <button type="button" className="btn" onClick={() => void converter(o.id)}>
                      Gerar PED
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
