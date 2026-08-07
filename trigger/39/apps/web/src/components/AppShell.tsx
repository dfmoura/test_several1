import type { ComponentType } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrandBar } from './BrandBar';
import { TriggerByline } from './TriggerAttribution';
import {
  IconAi,
  IconBuilding,
  IconCatalog,
  IconDashboard,
  IconGuide,
  IconHub,
  IconOrcamento,
  IconPartners,
  IconProduct,
  IconReport,
  IconSettings,
  IconUsers,
} from './NavIcons';
import { useAuth } from '../lib/auth';
import { BRAND } from '../lib/brand';

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
  permission: string | null;
  /** Custom active match (overrides default NavLink matching). */
  isActivePath?: (pathname: string) => boolean;
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
      {
        to: '/orcamentos',
        label: 'Orçamentos',
        icon: IconOrcamento,
        permission: 'orcamento.ler',
        isActivePath: (pathname) =>
          pathname === '/orcamentos' ||
          (pathname.startsWith('/orcamentos/') && !pathname.startsWith('/orcamentos/como-calcula')),
      },
      {
        to: '/orcamentos/como-calcula',
        label: 'Como calcula',
        icon: IconGuide,
        permission: 'orcamento.ler',
      },
    ],
  },
  {
    label: 'Relatórios',
    items: [
      { to: '/relatorios', label: 'Relatórios IA', icon: IconReport, permission: 'relatorio.ler' },
    ],
  },
  {
    label: 'Administração',
    items: [
      { to: '/usuarios', label: 'Usuários', icon: IconUsers, permission: 'usuarios.gerir' },
      { to: '/parametros', label: 'Parâmetros', icon: IconSettings, permission: 'parametros.gerir' },
      {
        to: '/orcamento-catalogo',
        label: 'Catálogo ORC',
        icon: IconCatalog,
        permission: 'orcamento.catalogo.gerir',
      },
      {
        to: '/ia-provedores',
        label: 'Provedores de IA',
        icon: IconAi,
        permission: 'ia.provedores.gerir',
      },
      {
        to: '/fiscal-hubs',
        label: 'Hubs fiscais',
        icon: IconHub,
        permission: 'fiscal.hubs.gerir',
      },
    ],
  },
];

export function AppShell() {
  const { user, roles, empresas, empresaId, setEmpresa, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
            <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} />
          </div>
          <div className="sidebar-product">
            <span className="sidebar-product-name">{BRAND.licensee.productName}</span>
            <TriggerByline className="sidebar-product-byline" />
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
                    className={({ isActive }) => {
                      const active = item.isActivePath
                        ? item.isActivePath(location.pathname)
                        : isActive;
                      return active ? 'active' : undefined;
                    }}
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
            <span className="header-title">{BRAND.licensee.productName}</span>
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
