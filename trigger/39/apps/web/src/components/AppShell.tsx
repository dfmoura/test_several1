import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrandBar } from './BrandBar';
import { TriggerByline } from './TriggerAttribution';
import {
  IconAi,
  IconAsset,
  IconBuilding,
  IconCatalog,
  IconCompras,
  IconDashboard,
  IconDepartamento,
  IconEstoque,
  IconFaca,
  IconFinanceiro,
  IconGuide,
  IconHub,
  IconNatureza,
  IconOrcamento,
  IconPartners,
  IconProduct,
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
      { to: '/patrimonio', label: 'Patrimônio', icon: IconAsset, permission: 'patrimonio.ler' },
      {
        to: '/departamentos',
        label: 'Departamentos',
        icon: IconDepartamento,
        permission: 'departamento.ler',
      },
      {
        to: '/naturezas-gerenciais',
        label: 'Naturezas gerenciais',
        icon: IconNatureza,
        permission: 'natureza_gerencial.ler',
      },
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
        to: '/pedidos',
        label: 'Pedidos',
        icon: IconOrcamento,
        permission: 'producao.ler',
        isActivePath: (pathname) =>
          pathname === '/pedidos' || pathname.startsWith('/pedidos/'),
      },
      {
        to: '/mapa-facas',
        label: 'Mapa de facas',
        icon: IconFaca,
        permission: 'orcamento.ler',
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
    label: 'Produção',
    items: [
      {
        to: '/ordens-producao',
        label: 'Ordens de produção',
        icon: IconAsset,
        permission: 'producao.ler',
        isActivePath: (pathname) =>
          pathname === '/ordens-producao' || pathname.startsWith('/ordens-producao/'),
      },
    ],
  },
  {
    label: 'Compras',
    items: [
      {
        to: '/compras/ordens',
        label: 'Ordens de compra',
        icon: IconCompras,
        permission: 'compras.ler',
        isActivePath: (pathname) =>
          pathname === '/compras/ordens' || pathname.startsWith('/compras/ordens/'),
      },
      {
        to: '/compras/reposicao',
        label: 'A repor',
        icon: IconCompras,
        permission: 'compras.ler',
      },
      {
        to: '/estoque',
        label: 'Estoque',
        icon: IconEstoque,
        permission: 'estoque.ler',
        isActivePath: (pathname) =>
          pathname === '/estoque' || pathname.startsWith('/estoque/'),
      },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      {
        to: '/financeiro/contas-a-pagar',
        label: 'Contas a pagar',
        icon: IconFinanceiro,
        permission: 'financeiro.ler',
      },
      {
        to: '/financeiro/contas-a-receber',
        label: 'Contas a receber',
        icon: IconFinanceiro,
        permission: 'financeiro.ler',
      },
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
  const [empresaFlash, setEmpresaFlash] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
  })).filter((group) => group.items.length > 0);

  const currentEmpresa = empresas.find((e) => e.id === empresaId);
  const podeTrocarEmpresa = empresas.length > 1;
  const empresaNome = currentEmpresa
    ? (currentEmpresa.nome_fantasia ?? currentEmpresa.razao_social)
    : null;
  const labelEmpresa = (emp: { codigo: string; nome_fantasia: string | null; razao_social: string }) =>
    `${emp.codigo} · ${emp.nome_fantasia ?? emp.razao_social}`;

  useEffect(() => {
    if (!empresaFlash) return;
    const t = window.setTimeout(() => setEmpresaFlash(null), 3200);
    return () => window.clearTimeout(t);
  }, [empresaFlash]);

  const handleEmpresaChange = (nextId: number) => {
    if (!nextId || nextId === empresaId) return;
    const next = empresas.find((e) => e.id === nextId);
    setEmpresa(nextId);
    setEmpresaFlash(
      next
        ? `Agora você está em ${next.codigo} · ${next.nome_fantasia ?? next.razao_social}`
        : 'Empresa ativa alterada',
    );
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-licensed-label">{BRAND.licensee.licensedLabel}</div>
          <div className="logo-plate logo-plate--sidebar">
            <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} />
          </div>
          <div className="sidebar-product">
            <span className="sidebar-product-meta">{BRAND.licensee.productLabel}</span>
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
            <div className="header-product">
              <span className="header-product-label">{BRAND.licensee.productLabel}</span>
              <span className="header-title">{BRAND.licensee.productName}</span>
            </div>
          </div>

          <div className="header-controls">
            {empresas.length > 0 && (
              <div
                className={
                  podeTrocarEmpresa
                    ? 'empresa-switcher empresa-switcher--multi'
                    : 'empresa-switcher'
                }
              >
                <div className="empresa-switcher-head">
                  <label
                    className="empresa-switcher-label"
                    htmlFor={podeTrocarEmpresa ? 'empresa-ativa-select' : undefined}
                    id="empresa-ativa-label"
                  >
                    Empresa ativa
                  </label>
                  {podeTrocarEmpresa && (
                    <span
                      className="empresa-switcher-count"
                      title={`${empresas.length} empresas liberadas nesta conta — use o seletor para trocar`}
                    >
                      {empresas.length} liberadas
                    </span>
                  )}
                </div>

                <div className="empresa-switcher-body">
                  <div
                    className="empresa-active"
                    aria-hidden={podeTrocarEmpresa || undefined}
                    role={podeTrocarEmpresa ? undefined : 'status'}
                    aria-labelledby={podeTrocarEmpresa ? undefined : 'empresa-ativa-label'}
                    aria-live={podeTrocarEmpresa ? undefined : 'polite'}
                  >
                    {currentEmpresa ? (
                      <>
                        <span className="empresa-code">{currentEmpresa.codigo}</span>
                        <span className="empresa-name" title={empresaNome ?? undefined}>
                          {empresaNome}
                        </span>
                      </>
                    ) : (
                      <span className="empresa-name">—</span>
                    )}
                    {podeTrocarEmpresa && (
                      <span className="empresa-switcher-chevron" aria-hidden>
                        ▾
                      </span>
                    )}
                  </div>

                  {podeTrocarEmpresa && (
                    <select
                      id="empresa-ativa-select"
                      className="empresa-select-ghost"
                      value={empresaId ?? ''}
                      onChange={(e) => handleEmpresaChange(Number(e.target.value))}
                      aria-describedby="empresa-ativa-ajuda"
                    >
                      {empresas.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {labelEmpresa(emp)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {podeTrocarEmpresa && (
                  <span id="empresa-ativa-ajuda" className="sr-only">
                    Trocar a empresa altera o contexto de todos os dados na tela.
                  </span>
                )}
              </div>
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

        {empresaFlash && (
          <div className="empresa-flash" role="status">
            {empresaFlash}
          </div>
        )}

        <main className="app-content">
          {/* Remonta a tela ao trocar EMP — listagens e formulários usam o novo contexto. */}
          <Outlet key={empresaId ?? 'sem-empresa'} />
        </main>
      </div>
    </div>
  );
}
