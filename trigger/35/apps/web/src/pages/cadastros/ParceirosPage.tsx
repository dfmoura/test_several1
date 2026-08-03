import { useEffect, useState, type FormEvent } from 'react';
import { api, type ApiError, type Parceiro } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export function ParceirosPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Parceiro[]>([]);
  const [q, setQ] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpjCpf: '',
    papelCliente: true,
    papelFornecedor: false,
    ehProspect: false,
    uf: 'MG',
    municipio: 'Uberlandia',
    cep: '38400000',
    logradouro: '',
    numero: 'S/N',
    bairro: 'Centro',
  });

  async function load(search = q) {
    if (!token) return;
    try {
      const data = await api.parceiros(token, { q: search || undefined });
      setItems(data);
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
    setOkMsg(null);
    try {
      const created = await api.criarParceiro(token, {
        razaoSocial: form.razaoSocial,
        nomeFantasia: form.nomeFantasia || null,
        cnpjCpf: form.cnpjCpf || null,
        papelCliente: form.papelCliente,
        papelFornecedor: form.papelFornecedor,
        ehProspect: form.ehProspect,
        indIEDest: form.ehProspect ? null : 'NAO_CONTRIBUINTE',
        endereco: form.logradouro
          ? {
              logradouro: form.logradouro,
              numero: form.numero,
              bairro: form.bairro,
              municipio: form.municipio,
              uf: form.uf,
              cep: form.cep,
            }
          : null,
      });
      setOkMsg(`Criado ${created.codigo}`);
      setForm((f) => ({ ...f, razaoSocial: '', nomeFantasia: '', cnpjCpf: '', logradouro: '' }));
      await load();
    } catch (err) {
      setErro((err as ApiError).message);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Parceiros</h1>
        <p className="muted">UC-CAD-001 · cadastro único com papéis</p>
      </header>

      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); void load(); }}>
        <input
          placeholder="Buscar código, nome ou CNPJ"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn" type="submit">
          Buscar
        </button>
      </form>

      <form className="panel-form" onSubmit={onCreate}>
        <h2>Novo parceiro</h2>
        <div className="form-grid">
          <label>
            Razão / Nome
            <input
              required
              value={form.razaoSocial}
              onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })}
            />
          </label>
          <label>
            Fantasia
            <input
              value={form.nomeFantasia}
              onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })}
            />
          </label>
          <label>
            CNPJ/CPF
            <input
              value={form.cnpjCpf}
              onChange={(e) => setForm({ ...form, cnpjCpf: e.target.value })}
            />
          </label>
          <label>
            Logradouro (fiscal)
            <input
              value={form.logradouro}
              onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
            />
          </label>
        </div>
        <div className="checks">
          <label>
            <input
              type="checkbox"
              checked={form.papelCliente}
              onChange={(e) => setForm({ ...form, papelCliente: e.target.checked })}
            />{' '}
            Cliente
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.papelFornecedor}
              onChange={(e) => setForm({ ...form, papelFornecedor: e.target.checked })}
            />{' '}
            Fornecedor
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.ehProspect}
              onChange={(e) => setForm({ ...form, ehProspect: e.target.checked })}
            />{' '}
            Prospect (orça sem PED)
          </label>
        </div>
        <button className="btn primary" type="submit">
          Salvar
        </button>
      </form>

      {erro ? <p className="error">{erro}</p> : null}
      {okMsg ? <p className="ok">{okMsg}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Documento</th>
              <th>Papéis</th>
              <th>Fiscal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td className="mono">{p.codigo}</td>
                <td>
                  {p.razaoSocial}
                  {p.ehProspect ? ' · prospect' : ''}
                </td>
                <td className="mono">{p.cnpjCpf ?? '—'}</td>
                <td>
                  {[
                    p.papeis.cliente && 'CLI',
                    p.papeis.fornecedor && 'FOR',
                    p.papeis.transportadora && 'TRP',
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </td>
                <td>{p.cadastroFiscalCompleto ? 'completo' : 'incompleto'}</td>
                <td>{p.situacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
