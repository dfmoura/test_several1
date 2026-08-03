import { useEffect, useState, type FormEvent } from 'react';
import { api, type ApiError, type Produto, type Unidade } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export function ProdutosPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Produto[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({
    familia: 'MP' as 'MP' | 'EMB' | 'REV' | 'PA' | 'SVC',
    descricao: '',
    ncm: '',
    unidadeEstoqueCodigo: 'KG',
    unidadeComercialCodigo: 'M',
    mascaraLargura: '',
  });

  async function load() {
    if (!token) return;
    try {
      const [produtos, uns] = await Promise.all([
        api.produtos(token),
        api.unidades(token),
      ]);
      setItems(produtos);
      setUnidades(uns);
      setErro(null);
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
    try {
      await api.criarProduto(token, {
        familia: form.familia,
        descricao: form.descricao,
        ncm: form.ncm || null,
        unidadeEstoqueCodigo: form.unidadeEstoqueCodigo,
        unidadeComercialCodigo: form.unidadeComercialCodigo,
        mascaraJson: form.mascaraLargura
          ? { larguraMm: Number(form.mascaraLargura) }
          : null,
        controlaEstoque: form.familia !== 'SVC',
      });
      setForm((f) => ({ ...f, descricao: '', ncm: '', mascaraLargura: '' }));
      await load();
    } catch (err) {
      setErro((err as ApiError).message);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Produtos</h1>
        <p className="muted">UC-CAD-003 · famílias MP / EMB / REV / PA / SVC</p>
      </header>

      <form className="panel-form" onSubmit={onCreate}>
        <h2>Novo SKU</h2>
        <div className="form-grid">
          <label>
            Família
            <select
              value={form.familia}
              onChange={(e) =>
                setForm({ ...form, familia: e.target.value as typeof form.familia })
              }
            >
              {['MP', 'EMB', 'REV', 'PA', 'SVC'].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label>
            Descrição
            <input
              required
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </label>
          <label>
            NCM
            <input
              value={form.ncm}
              maxLength={8}
              onChange={(e) => setForm({ ...form, ncm: e.target.value })}
            />
          </label>
          <label>
            Unidade estoque
            <select
              value={form.unidadeEstoqueCodigo}
              onChange={(e) => setForm({ ...form, unidadeEstoqueCodigo: e.target.value })}
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.codigo}>
                  {u.codigo} — {u.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Unidade comercial
            <select
              value={form.unidadeComercialCodigo}
              onChange={(e) => setForm({ ...form, unidadeComercialCodigo: e.target.value })}
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.codigo}>
                  {u.codigo} — {u.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Máscara largura mm (bobina)
            <input
              value={form.mascaraLargura}
              onChange={(e) => setForm({ ...form, mascaraLargura: e.target.value })}
            />
          </label>
        </div>
        <button className="btn primary" type="submit">
          Salvar
        </button>
      </form>

      {erro ? <p className="error">{erro}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Família</th>
              <th>Descrição</th>
              <th>NCM</th>
              <th>Unid.</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td className="mono">{p.codigo}</td>
                <td>{p.familia}</td>
                <td>{p.descricao}</td>
                <td className="mono">{p.ncm ?? '—'}</td>
                <td className="mono">
                  {p.unidadeEstoque.codigo}/{p.unidadeComercial.codigo}
                </td>
                <td>{p.situacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
