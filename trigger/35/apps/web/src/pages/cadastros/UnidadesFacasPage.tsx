import { useEffect, useState, type FormEvent } from 'react';
import { api, type ApiError, type Faca, type Unidade } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export function UnidadesFacasPage() {
  const { token } = useAuth();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [facas, setFacas] = useState<Faca[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [uniForm, setUniForm] = useState({ codigo: '', nome: '', casasDecimais: 4 });
  const [facForm, setFacForm] = useState({ descricao: '', modeloRef: '' });

  async function load() {
    if (!token) return;
    try {
      const [u, f] = await Promise.all([api.unidades(token), api.facas(token)]);
      setUnidades(u);
      setFacas(f);
      setErro(null);
    } catch (e) {
      setErro((e as ApiError).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onUnidade(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      await api.criarUnidade(token, uniForm);
      setUniForm({ codigo: '', nome: '', casasDecimais: 4 });
      await load();
    } catch (err) {
      setErro((err as ApiError).message);
    }
  }

  async function onFaca(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      await api.criarFaca(token, {
        descricao: facForm.descricao,
        modeloRef: facForm.modeloRef || null,
      });
      setFacForm({ descricao: '', modeloRef: '' });
      await load();
    } catch (err) {
      setErro((err as ApiError).message);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Unidades & Facas</h1>
        <p className="muted">UC-CAD-004 · UC-CAD-005</p>
      </header>

      {erro ? <p className="error">{erro}</p> : null}

      <div className="split-2">
        <form className="panel-form" onSubmit={onUnidade}>
          <h2>Nova unidade</h2>
          <label>
            Código
            <input
              required
              value={uniForm.codigo}
              onChange={(e) => setUniForm({ ...uniForm, codigo: e.target.value })}
            />
          </label>
          <label>
            Nome
            <input
              required
              value={uniForm.nome}
              onChange={(e) => setUniForm({ ...uniForm, nome: e.target.value })}
            />
          </label>
          <button className="btn primary" type="submit">
            Salvar unidade
          </button>
          <div className="table-wrap compact">
            <table>
              <thead>
                <tr>
                  <th>Cód.</th>
                  <th>Nome</th>
                  <th>Casas</th>
                </tr>
              </thead>
              <tbody>
                {unidades.map((u) => (
                  <tr key={u.id}>
                    <td className="mono">{u.codigo}</td>
                    <td>{u.nome}</td>
                    <td>{u.casasDecimais}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>

        <form className="panel-form" onSubmit={onFaca}>
          <h2>Nova faca (FAC)</h2>
          <label>
            Descrição
            <input
              required
              value={facForm.descricao}
              onChange={(e) => setFacForm({ ...facForm, descricao: e.target.value })}
            />
          </label>
          <label>
            Modelo ref.
            <input
              value={facForm.modeloRef}
              onChange={(e) => setFacForm({ ...facForm, modeloRef: e.target.value })}
            />
          </label>
          <button className="btn primary" type="submit">
            Salvar FAC
          </button>
          <div className="table-wrap compact">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Modelo</th>
                  <th>Cobrado</th>
                </tr>
              </thead>
              <tbody>
                {facas.map((f) => (
                  <tr key={f.id}>
                    <td className="mono">{f.codigo}</td>
                    <td>{f.descricao}</td>
                    <td className="mono">{f.modeloRef ?? '—'}</td>
                    <td>{f.jaCobrado ? 'sim' : 'não'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      </div>
    </section>
  );
}
