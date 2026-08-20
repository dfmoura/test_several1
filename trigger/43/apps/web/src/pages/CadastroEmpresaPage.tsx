import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ApiError, api, setEmpresaId } from '../lib/api';
import { useAuth } from '../lib/auth';

type FormState = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  logradouro: string;
  numero: string;
  bairro: string;
  complemento: string;
};

const empty: FormState = {
  cnpj: '',
  razao_social: '',
  nome_fantasia: '',
  municipio: '',
  uf: '',
  cep: '',
  telefone: '',
  logradouro: '',
  numero: '',
  bairro: '',
  complemento: '',
};

export function CadastroEmpresaPage() {
  const { user, empresas, initialized, refresh, hasPermission, maxEmpresas } = useAuth();
  const navigate = useNavigate();
  const podeGerir = hasPermission('empresas.gerir');
  const noLimite = empresas.length >= maxEmpresas;

  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);

  if (!initialized) {
    return <div className="loading">Carregando…</div>;
  }
  if (!user) {
    return <Navigate to="/cadastro/conta" replace />;
  }
  if (!podeGerir) {
    return <Navigate to="/empresas" replace />;
  }

  const set = (k: keyof FormState, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const buscarCnpj = async () => {
    const digits = form.cnpj.replace(/\D/g, '');
    if (digits.length !== 14) {
      setError('Informe um CNPJ com 14 dígitos.');
      return;
    }
    setError('');
    setBuscando(true);
    try {
      const res = await api.publicGet<{ data: Record<string, string | null> }>(
        `/publico/consulta/cnpj/${digits}`,
      );
      const d = res.data;
      setForm((prev) => ({
        ...prev,
        razao_social: d.razao_social || d.nome || prev.razao_social,
        nome_fantasia: d.nome_fantasia || prev.nome_fantasia,
        municipio: d.municipio || d.cidade || prev.municipio,
        uf: (d.uf || prev.uf).toString().slice(0, 2).toUpperCase(),
        cep: d.cep || prev.cep,
        logradouro: d.logradouro || prev.logradouro,
        numero: d.numero || prev.numero,
        bairro: d.bairro || prev.bairro,
        complemento: d.complemento || prev.complemento,
        telefone: d.telefone || prev.telefone,
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível consultar o CNPJ. Preencha manualmente.');
    } finally {
      setBuscando(false);
    }
  };

  const criarEmpresa = async (e: FormEvent) => {
    e.preventDefault();
    if (noLimite) {
      setError(`Esta conta admite no máximo ${maxEmpresas} empresas.`);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.abrirEmpresa(form);
      setEmpresaId(res.empresa.id);
      await refresh();
      navigate('/empresas', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        const first = Object.values(err.details ?? {})[0]?.[0];
        setError(first ?? err.message);
      } else {
        setError('Não foi possível cadastrar a empresa. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title={empresas.length === 0 ? 'Cadastrar empresa' : 'Nova empresa'}
        description={`CNPJ desta operação. Parceiros, preços e orçamentos ficam isolados. Até ${maxEmpresas} empresas nesta conta.`}
      />

      {error && <div className="alert alert-error">{error}</div>}

      {noLimite ? (
        <div className="alert alert-warning" role="status">
          Esta conta já tem {empresas.length} de {maxEmpresas} empresas. Não é possível abrir outra.
        </div>
      ) : null}

      <div className="card">
        <div className="card-body">
          <form onSubmit={(e) => void criarEmpresa(e)}>
            <div className="form-grid">
              <div className="form-group span-full">
                <label htmlFor="cnpj">CNPJ</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="cnpj"
                    value={form.cnpj}
                    onChange={(e) => set('cnpj', e.target.value)}
                    required
                    placeholder="00.000.000/0000-00"
                    disabled={noLimite}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void buscarCnpj()}
                    disabled={buscando || noLimite}
                  >
                    {buscando ? 'Buscando…' : 'Buscar'}
                  </button>
                </div>
              </div>
              <div className="form-group span-full">
                <label htmlFor="razao">Razão social</label>
                <input
                  id="razao"
                  value={form.razao_social}
                  onChange={(e) => set('razao_social', e.target.value)}
                  required
                  disabled={noLimite}
                />
              </div>
              <div className="form-group">
                <label htmlFor="fantasia">Nome fantasia</label>
                <input
                  id="fantasia"
                  value={form.nome_fantasia}
                  onChange={(e) => set('nome_fantasia', e.target.value)}
                  disabled={noLimite}
                />
              </div>
              <div className="form-group">
                <label htmlFor="municipio">Cidade</label>
                <input
                  id="municipio"
                  value={form.municipio}
                  onChange={(e) => set('municipio', e.target.value)}
                  required
                  disabled={noLimite}
                />
              </div>
              <div className="form-group">
                <label htmlFor="uf">UF</label>
                <input
                  id="uf"
                  value={form.uf}
                  onChange={(e) => set('uf', e.target.value.toUpperCase())}
                  required
                  maxLength={2}
                  disabled={noLimite}
                />
              </div>
              <div className="form-group">
                <label htmlFor="cep">CEP</label>
                <input id="cep" value={form.cep} onChange={(e) => set('cep', e.target.value)} disabled={noLimite} />
              </div>
              <div className="form-group span-full">
                <label htmlFor="logradouro">Logradouro</label>
                <input
                  id="logradouro"
                  value={form.logradouro}
                  onChange={(e) => set('logradouro', e.target.value)}
                  disabled={noLimite}
                />
              </div>
              <div className="form-group">
                <label htmlFor="numero">Número</label>
                <input id="numero" value={form.numero} onChange={(e) => set('numero', e.target.value)} disabled={noLimite} />
              </div>
              <div className="form-group">
                <label htmlFor="bairro">Bairro</label>
                <input id="bairro" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} disabled={noLimite} />
              </div>
              <div className="form-group span-full">
                <label htmlFor="complemento">Complemento</label>
                <input
                  id="complemento"
                  value={form.complemento}
                  onChange={(e) => set('complemento', e.target.value)}
                  disabled={noLimite}
                />
                <p className="form-hint" style={{ margin: '0.35rem 0 0' }}>
                  Ao cadastrar, a origem operacional (ponto A da rota) é localizada por este endereço. Confira
                  logradouro e número — o centroide do CEP só entra se a rua não resolver.
                </p>
              </div>
            </div>
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <Link to={empresas.length === 0 ? '/' : '/empresas'} className="btn btn-secondary">
                Cancelar
              </Link>
              <button type="submit" className="btn btn-primary" disabled={loading || noLimite}>
                {loading ? 'Cadastrando empresa…' : 'Cadastrar empresa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
