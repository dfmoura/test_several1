import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type Parceiro } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCnpjCpf, papelLabel } from '../lib/format';

const PAPEIS = [
  'cliente',
  'fornecedor',
  'colaborador',
  'transportadora',
  'banco',
  'entidade',
  'vendedor',
  'contador',
] as const;

function getPapeis(p: Parceiro): string[] {
  return PAPEIS.filter((key) => p[`papel_${key}` as keyof Parceiro] === true).map(papelLabel);
}

export function ParceirosPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [q, setQ] = useState('');
  const [papel, setPapel] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (search?: string, papelFilter?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (papelFilter) params.set('papel', papelFilter);
      const qs = params.toString();
      const res = await api.get<{ data: Parceiro[] }>(`/parceiros${qs ? `?${qs}` : ''}`);
      setParceiros(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(q, papel);
  };

  return (
    <>
      <PageHeader
        title="Parceiros"
        description="Clientes, fornecedores, colaboradores e demais papéis"
        actions={
          hasPermission('parceiro.escrever') ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link to="/parceiros/importar" className="btn btn-secondary">
                Importar CSV
              </Link>
              <Link to="/parceiros/novo" className="btn btn-primary">
                Novo parceiro
              </Link>
            </div>
          ) : undefined
        }
      />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nome, código ou CNPJ/CPF"
              />
            </div>
            <div className="form-group" style={{ minWidth: 160 }}>
              <label>Papel</label>
              <select value={papel} onChange={(e) => setPapel(e.target.value)}>
                <option value="">Todos</option>
                {PAPEIS.map((p) => (
                  <option key={p} value={p}>
                    {papelLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button type="submit" className="btn btn-secondary">
                Filtrar
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : parceiros.length === 0 ? (
            <div className="empty-state">Nenhum parceiro encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Razão social</th>
                  <th>CNPJ/CPF</th>
                  <th>Papéis</th>
                  <th>Fiscal</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {parceiros.map((p) => (
                  <tr
                    key={p.id}
                    className="clickable"
                    onClick={() => navigate(`/parceiros/${p.id}`)}
                  >
                    <td>{p.codigo}</td>
                    <td>{p.nome_fantasia ?? p.razao_social}</td>
                    <td>{formatCnpjCpf(p.cnpj_cpf) || '—'}</td>
                    <td>{getPapeis(p).join(', ') || '—'}</td>
                    <td>
                      {p.apto_emissao_nfe
                        ? 'Apto NF-e'
                        : p.cadastro_fiscal_completo
                          ? 'Completo'
                          : p.is_prospect
                            ? 'Prospect'
                            : 'Incompleto'}
                    </td>
                    <td>
                      <StatusPill status={p.situacao} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
