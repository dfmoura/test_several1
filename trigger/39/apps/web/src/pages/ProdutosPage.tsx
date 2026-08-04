import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, fiscalConsulta, type Produto, type ProdutoGrupo } from '../lib/api';
import { useAuth } from '../lib/auth';
import { familiaLabel, formatUnitPrice } from '../lib/format';

const FAMILIAS = ['MP', 'EMB', 'REV', 'PA', 'SVC', 'FAC'] as const;

export function ProdutosPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<ProdutoGrupo[]>([]);
  const [q, setQ] = useState('');
  const [familia, setFamilia] = useState('');
  const [grupo, setGrupo] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (search?: string, fam?: string, grp?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (fam) params.set('familia', fam);
      if (grp) params.set('grupo', grp);
      const qs = params.toString();
      const res = await api.get<{ data: Produto[] }>(`/produtos${qs ? `?${qs}` : ''}`);
      setProdutos(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fiscalConsulta.produtoGrupos(familia || undefined);
        setGrupos(res.data);
        if (grupo && !res.data.some((g) => g.codigo === grupo)) {
          setGrupo('');
        }
      } catch {
        setGrupos([]);
      }
    })();
  }, [familia]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(q, familia, grupo);
  };

  return (
    <>
      <PageHeader
        title="Produtos"
        description="Família fiscal + grupo canônico (MP-PAP, PA-ETQ, REV-RIB…)"
        actions={
          hasPermission('produto.escrever') ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link to="/produtos/importar" className="btn btn-secondary">
                Importar CSV
              </Link>
              <Link to="/produtos/novo" className="btn btn-primary">
                Novo produto
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
                placeholder="Código, grupo ou descrição"
              />
            </div>
            <div className="form-group" style={{ minWidth: 180 }}>
              <label>Família</label>
              <select value={familia} onChange={(e) => setFamilia(e.target.value)}>
                <option value="">Todas</option>
                {FAMILIAS.map((f) => (
                  <option key={f} value={f}>
                    {f} — {familiaLabel(f)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ minWidth: 220 }}>
              <label>Grupo</label>
              <select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
                <option value="">Todos</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.codigo}>
                    {g.codigo} — {g.nome}
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
          ) : produtos.length === 0 ? (
            <div className="empty-state">Nenhum produto encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Família</th>
                  <th>Grupo</th>
                  <th>Descrição</th>
                  <th>NCM</th>
                  <th>Unidade</th>
                  <th>Preço</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((p) => (
                  <tr
                    key={p.id}
                    className="clickable"
                    onClick={() => navigate(`/produtos/${p.id}`)}
                  >
                    <td>{p.codigo}</td>
                    <td>{p.familia}</td>
                    <td title={p.grupo_catalogo?.nome ?? undefined}>
                      {p.grupo ?? p.grupo_catalogo?.codigo ?? '—'}
                    </td>
                    <td>{p.descricao_comercial ?? p.descricao_fiscal}</td>
                    <td>{p.ncm ?? '—'}</td>
                    <td>{p.unidade_comercial ?? '—'}</td>
                    <td>{formatUnitPrice(p.preco_tabela)}</td>
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
