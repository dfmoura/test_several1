import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconDuplicate } from '../components/NavIcons';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, fiscalConsulta, type Produto, type ProdutoGrupo } from '../lib/api';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { familiaLabel, formatUnitPrice } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

const FAMILIAS = ['MP', 'EMB', 'REV', 'PA', 'SVC', 'FAC'] as const;

const SORT = {
  codigo: (p: Produto) => p.codigo,
  familia: (p: Produto) => p.familia,
  grupo: (p: Produto) => p.grupo ?? p.grupo_catalogo?.codigo,
  descricao: (p: Produto) => p.descricao_comercial ?? p.descricao_fiscal,
  ncm: (p: Produto) => p.ncm,
  unidade: (p: Produto) => p.unidade_comercial,
  preco: (p: Produto) => (p.preco_tabela != null ? Number(p.preco_tabela) : null),
  situacao: (p: Produto) => p.situacao,
};

export function ProdutosPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const canWrite = hasPermission('produto.escrever');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<ProdutoGrupo[]>([]);
  const [q, setQ] = useState('');
  const [familia, setFamilia] = useState('');
  const [grupo, setGrupo] = useState('');
  const [loading, setLoading] = useState(true);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(produtos, SORT);

  const fichaGerencialPath = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (familia) params.set('familia', familia);
    if (grupo) params.set('grupo', grupo);
    const qs = params.toString();
    return `/produtos/ficha-gerencial${qs ? `?${qs}` : ''}`;
  }, [q, familia, grupo]);

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
        description="SKU operacional para compra, estoque e OP."
        actions={
          <div className="btn-row">
            {canWrite ? (
              <>
                <Link to="/produtos/do-xml" className="btn btn-primary">
                  Do XML
                </Link>
                <Link to="/produtos/novo" className="btn btn-secondary">
                  Novo produto
                </Link>
              </>
            ) : null}
            <a
              href={fichaGerencialPath}
              className="btn btn-secondary"
              onClick={(e) => onAbrirFichaClick(e, fichaGerencialPath)}
              title="Abre a ficha gerencial A4 paisagem com o recorte atual dos filtros — Imprimir ou Salvar como PDF."
            >
              Ficha gerencial
            </a>
            <Link to="/como-cadastra#produto-passos" className="btn btn-secondary">
              Como cadastra
            </Link>
          </div>
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
        {!loading && produtos.length > 0 ? (
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <span className="form-hint">{produtos.length} produto(s) nesta EMP</span>
          </div>
        ) : null}
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : produtos.length === 0 ? (
            <div className="empty-state">Nenhum produto encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="codigo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Código
                  </SortableTh>
                  <SortableTh column="familia" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Família
                  </SortableTh>
                  <SortableTh column="grupo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Grupo
                  </SortableTh>
                  <SortableTh column="descricao" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Descrição
                  </SortableTh>
                  <SortableTh column="ncm" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    NCM
                  </SortableTh>
                  <SortableTh column="unidade" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Unidade
                  </SortableTh>
                  <SortableTh column="preco" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Preço
                  </SortableTh>
                  <SortableTh column="situacao" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Situação
                  </SortableTh>
                  {canWrite ? <th className="acoes" aria-label="Ações" /> : null}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
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
                    {canWrite ? (
                      <td
                        className="acoes"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <div className="table-actions">
                          <Link
                            to={`/produtos/novo?from=${p.id}`}
                            className="btn-icon"
                            title="Novo a partir deste — mesmo perfil, nomes distintos"
                            aria-label={`Novo produto a partir de ${p.codigo}`}
                          >
                            <IconDuplicate />
                          </Link>
                        </div>
                      </td>
                    ) : null}
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
