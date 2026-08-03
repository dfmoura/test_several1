import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { StepRail } from './StepRail';
import { useAuth } from '../lib/auth';
import { empresasApi, formatCnpj } from '../lib/api';

/** Rota → permissão mínima (matriz ORGANIZACAO_USUARIOS / M11). */
const NAV: { label: string; to: string; perm: string }[] = [
  { label: 'Painel', to: '/', perm: 'relatorios.ler' },
  { label: 'Jornada', to: '/jornada', perm: 'relatorios.ler' },
  { label: 'Empresas', to: '/empresas', perm: 'relatorios.ler' },
  { label: 'Parceiros', to: '/parceiros', perm: 'parceiro.ler' },
  { label: 'Produtos', to: '/produtos', perm: 'produto.ler' },
  { label: 'Orçamentos', to: '/orcamentos', perm: 'orcamento.ler' },
  { label: 'Pedidos', to: '/pedidos', perm: 'pedido.ler' },
  { label: 'Produção', to: '/producao', perm: 'producao.ler' },
  { label: 'Estoque', to: '/estoque', perm: 'estoque.ler' },
  { label: 'Compras', to: '/compras', perm: 'compras.ler' },
  { label: 'NF entrada', to: '/nfe', perm: 'compras.ler' },
  { label: 'Fiscal', to: '/fiscal', perm: 'fiscal.ler' },
  { label: 'Financeiro', to: '/financeiro', perm: 'financeiro.ler' },
  { label: 'Naturezas', to: '/naturezas', perm: 'financeiro.ler' },
  { label: 'Entrega', to: '/entrega', perm: 'entrega.ler' },
  { label: 'Devoluções', to: '/devolucoes', perm: 'fiscal.ler' },
  { label: 'Patrimônio', to: '/patrimonio', perm: 'relatorios.ler' },
  { label: 'Usuários', to: '/usuarios', perm: 'usuarios.gerir' },
  { label: 'Homologação', to: '/homologacao', perm: 'homologacao.gerir' },
];

export function AppShell() {
  const { usuario, logout, can } = useAuth();
  const navigate = useNavigate();
  const items = NAV.filter((item) => can(item.perm));
  const [empresaLabel, setEmpresaLabel] = useState('');

  useEffect(() => {
    empresasApi
      .atual()
      .then((e) => setEmpresaLabel(`${e.codigo} · ${formatCnpj(String(e.cnpj))}`))
      .catch(() => undefined);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">RLP</span>
          <h1>Etiquetas</h1>
          <p>ERP operacional flexo</p>
          {empresaLabel ? (
            <p style={{ color: '#9aa6c0', fontSize: '0.75rem', marginTop: '0.35rem' }}>{empresaLabel}</p>
          ) : null}
        </div>
        <nav className="nav-group">
          <div className="nav-label">Módulos</div>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div>{usuario?.nome ?? usuario?.email ?? '—'}</div>
          <div className="muted" style={{ color: '#9aa6c0' }}>
            {usuario?.role ?? '—'}
          </div>
          <button type="button" className="btn ghost sm" onClick={handleLogout} style={{ marginTop: '0.5rem' }}>
            Sair
          </button>
        </div>
      </aside>
      <div className="main-area">
        <StepRail />
        <main className="content">
          <div className="banner-hml">
            Ambiente de homologação — não é produção. Evidências CA-01…CA-12 antes do go-live.
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
