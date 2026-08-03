import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Shell() {
  const { usuario, empresa, empresas, logout, trocarEmpresa, loading } = useAuth();

  if (loading) {
    return (
      <div className="center-screen">
        <p className="muted">Carregando sessão…</p>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">RLP</span>
          <span className="brand-sub">ERP · Fase 1</span>
        </div>
        <nav>
          <NavLink to="/" end>
            Início
          </NavLink>
          <NavLink to="/parceiros">Parceiros</NavLink>
          <NavLink to="/produtos">Produtos</NavLink>
          <NavLink to="/unidades-facas">Unidades & Facas</NavLink>
          <NavLink to="/orcamentos">Orçamentos</NavLink>
          <NavLink to="/pedidos">Pedidos</NavLink>
          <NavLink to="/estoque">Estoque</NavLink>
          <NavLink to="/producao">Produção</NavLink>
          <NavLink to="/documentos-fiscais">NF Focus</NavLink>
          <NavLink to="/titulos">Títulos</NavLink>
          <NavLink to="/export-contador">Export contador</NavLink>
          <NavLink to="/compras">Compras</NavLink>
          <NavLink to="/parametros">Parâmetros</NavLink>
          <NavLink to="/auditoria">Auditoria</NavLink>
        </nav>
        <div className="sidebar-foot">
          <label className="field-label" htmlFor="empresa">
            Empresa
          </label>
          <select
            id="empresa"
            value={empresa?.codigo ?? ''}
            onChange={(e) => void trocarEmpresa(e.target.value)}
          >
            {empresas.map((e) => (
              <option key={e.id} value={e.codigo}>
                {e.codigo}
                {!e.vendaAtiva ? ' (venda off)' : ''}
              </option>
            ))}
          </select>
          <div className="user-chip">
            <strong>{usuario?.nome}</strong>
            <span>{usuario?.perfis.join(', ')}</span>
          </div>
          <button type="button" className="btn ghost" onClick={() => void logout()}>
            Sair
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
