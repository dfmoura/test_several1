import type { ComponentType } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { BrandBar } from './BrandBar';
import {
  IconAi,
  IconBuilding,
  IconDashboard,
  IconOrcamento,
  IconPartners,
  IconProduct,
  IconSettings,
  IconUsers,
} from './NavIcons';

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
  permission: string | null;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { to: '/', label: 'Painel', icon: IconDashboard, end: true, permission: null },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { to: '/empresas', label: 'Empresas', icon: IconBuilding, permission: null },
      { to: '/parceiros', label: 'Parceiros', icon: IconPartners, permission: 'parceiro.ler' },
      { to: '/produtos', label: 'Produtos', icon: IconProduct, permission: 'produto.ler' },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { to: '/orcamentos', label: 'Orçamentos', icon: IconOrcamento, permission: 'orcamento.ler' },
    ],
  },
  {
    label: 'Administração',
    items: [
      { to: '/usuarios', label: 'Usuários', icon: IconUsers, permission: 'usuarios.gerir' },
      { to: '/parametros', label: 'Parâmetros', icon: IconSettings, permission: 'parametros.gerir' },
      {
        to: '/ia-provedores',
        label: 'Provedores de IA',
        icon: IconAi,
        permission: 'ia.provedores.gerir',
      },
    ],
  },
];

export function AppShell() {
  const { user, roles, empresas, empresaId, setEmpresa, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
  })).filter((group) => group.items.length > 0);

  const currentEmpresa = empresas.find((e) => e.id === empresaId);

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="logo-plate logo-plate--sidebar">
            <img src="/branding/cliente/logo-rlp.png" alt="RLP Etiquetas" />
          </div>
          <div className="sidebar-product">
            <span className="sidebar-product-name">ERP RLP</span>
            <span className="sidebar-product-meta">Cadastros · Comercial</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Menu principal">
          {visibleGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end ?? false}
                  >
                    <span className="nav-icon">
                      <Icon />
                    </span>
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <BrandBar />
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="header-context">
            <span className="header-title">ERP RLP</span>
            {currentEmpresa && (
              <>
                <span className="header-divider" aria-hidden />
                <span className="header-empresa">
                  <span className="header-empresa-code">{currentEmpresa.codigo}</span>
                  <span className="header-empresa-name">
                    {currentEmpresa.nome_fantasia ?? currentEmpresa.razao_social}
                  </span>
                </span>
              </>
            )}
          </div>

          <div className="header-controls">
            {empresas.length > 1 && (
              <select
                className="empresa-select"
                value={empresaId ?? ''}
                onChange={(e) => setEmpresa(Number(e.target.value))}
                aria-label="Empresa ativa"
              >
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.codigo} — {emp.nome_fantasia ?? emp.razao_social}
                  </option>
                ))}
              </select>
            )}

            <div className="user-menu">
              <div>
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{roles.join(', ')}</div>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
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
