import type { ComponentType } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { TriggerAttribution } from './TriggerAttribution';
import { IconDashboard, IconSettings, IconUsers } from './NavIcons';
import { useAuth } from '../lib/auth';
import { BRAND } from '../lib/brand';

const NAV: { to: string; label: string; icon: ComponentType<{ className?: string }>; end?: boolean }[] = [
  { to: '/plataforma', label: 'Painel', icon: IconDashboard, end: true },
  { to: '/plataforma/contas', label: 'Contas', icon: IconUsers },
  { to: '/plataforma/configuracao/mensalidade', label: 'Mensalidade', icon: IconSettings },
  { to: '/plataforma/integracoes/inter', label: 'Inter PIX', icon: IconSettings },
  { to: '/plataforma/auditoria', label: 'Auditoria', icon: IconSettings },
];

export function PlatformShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-layout ops-layout">
      <aside className="app-sidebar ops-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-licensed-label">Operação TRIGGER</div>
          <div className="logo-plate logo-plate--sidebar logo-plate--mark">
            <img src={BRAND.vendor.assets.mark} alt="" aria-hidden className="ops-mark" />
          </div>
          <div className="sidebar-product">
            <span className="sidebar-product-meta">Console</span>
            <span className="sidebar-product-name">{BRAND.product.name}</span>
            <span className="sidebar-product-byline">contas e mensalidade</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Console da plataforma">
          <div className="nav-group">
            <div className="nav-group-label">Instalação</div>
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end ?? false}
                  className={({ isActive }) => (isActive ? 'active' : undefined)}
                >
                  <span className="nav-icon">
                    <Icon />
                  </span>
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-footer">
          <TriggerAttribution variant="interactive" className="brand-bar" />
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="header-context">
            <div className="header-product">
              <img src={BRAND.vendor.assets.mark} alt="" className="header-product-mark" />
              <div className="header-product-text">
                <span className="header-product-label">TRIGGER</span>
                <span className="header-title">Operação {BRAND.product.name}</span>
              </div>
            </div>
          </div>
          <div className="header-controls">
            <div className="user-menu">
              <div>
                <div className="user-name">{user?.name}</div>
                <div className="user-role">
                  {user?.codigo ? <span className="user-conta">{user.codigo}</span> : null}
                  {' · '}
                  operador
                </div>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void handleLogout()}>
                Sair
              </button>
            </div>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
