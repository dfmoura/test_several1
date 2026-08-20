import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandBar } from './BrandBar';
import { ProductLogo } from './ProductLogo';
import { TriggerByline } from './TriggerAttribution';
import {
  IconBuilding,
  IconCatalog,
  IconDashboard,
  IconDepartamentos,
  IconFaca,
  IconFinanceiro,
  IconOrcamento,
  IconPartners,
  IconPatrimonio,
  IconSettings,
  IconUsers,
} from './NavIcons';
import { useAuth } from '../lib/auth';
import { api, type AtivacaoData } from '../lib/api';
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
      { to: '/departamentos', label: 'Departamentos', icon: IconDepartamentos, permission: 'departamento.ler' },
      { to: '/parceiros', label: 'Parceiros', icon: IconPartners, permission: 'parceiro.ler' },
      { to: '/patrimonio', label: 'Patrimônio', icon: IconPatrimonio, permission: 'patrimonio.ler' },
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
      },
      {
        to: '/mapa-facas',
        label: 'Mapa de facas',
        icon: IconFaca,
        permission: 'orcamento.ler',
      },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      {
        to: '/financeiro/contas-a-receber',
        label: 'Sinal e a receber',
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
    ],
  },
];

export function AppShell() {
  const { user, roles, empresas, empresaId, setEmpresa, logout, hasPermission, maxEmpresas, produtoFlexorc } =
    useAuth();
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
  }))
    .filter((group) => produtoFlexorc.financeiro || group.label !== 'Financeiro')
    .filter((group) => group.items.length > 0);

  const currentEmpresa = empresas.find((e) => e.id === empresaId);
  const podeTrocarEmpresa = empresas.length > 1;
  const podeAbrirEmpresa = hasPermission('empresas.gerir') && empresas.length < maxEmpresas;
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
          <div className="sidebar-licensed-label">{BRAND.product.tagline}</div>
          <div className="logo-plate logo-plate--sidebar logo-plate--mark">
            <ProductLogo decorative />
          </div>
          <div className="sidebar-product">
            <span className="sidebar-product-meta">{BRAND.product.label}</span>
            <span className="sidebar-product-name">{BRAND.product.name}</span>
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
              <ProductLogo decorative className="header-product-mark" />
              <div className="header-product-text">
                <span className="header-product-label">{BRAND.product.label}</span>
                <span className="header-title">{BRAND.product.name}</span>
              </div>
            </div>
          </div>

          <div className="header-controls">
            {(empresas.length > 0 || hasPermission('empresas.gerir')) && (
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
                  {empresas.length > 0 && (
                    <span
                      className="empresa-switcher-count"
                      title={`${empresas.length} de ${maxEmpresas} empresas nesta conta`}
                    >
                      {empresas.length}/{maxEmpresas}
                    </span>
                  )}
                  {podeAbrirEmpresa ? (
                    <Link to="/empresas/nova" className="empresa-switcher-add">
                      {empresas.length === 0 ? 'Cadastrar' : 'Nova'}
                    </Link>
                  ) : null}
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
                <div className="user-role">
                  {user?.codigo ? <span className="user-conta">{user.codigo}</span> : null}
                  {roles.length > 0 ? ` · ${roles.join(', ')}` : null}
                </div>
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
          <MensalidadePendenteBanner empresaId={empresaId} />
          {/* Remonta a tela ao trocar EMP — listagens e formulários usam o novo contexto. */}
          <Outlet key={empresaId ?? 'sem-empresa'} />
        </main>
      </div>
    </div>
  );
}

function MensalidadePendenteBanner({ empresaId }: { empresaId: number | null }) {
  const [pendente, setPendente] = useState(false);
  const [valor, setValor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<{ data: AtivacaoData }>('/ativacao')
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        const due = d.origem === 'self_service' && Boolean(d.pagamento_pendente);
        setPendente(due);
        setValor(d.conta?.valor_formatado ?? null);
      })
      .catch(() => {
        if (!cancelled) setPendente(false);
      });
    return () => {
      cancelled = true;
    };
  }, [empresaId]);

  if (!pendente) {
    return null;
  }

  return (
    <div className="billing-banner" role="status">
      <div>
        <strong>Mensalidade FLEXORC em aberto</strong>
        <span>
          {valor ? `${valor} · ` : ''}Você paga a TRIGGER no ASAAS. Sem isto o envio da
          proposta fica bloqueado.
        </span>
      </div>
      <Link to="/cadastro/pagamento" className="btn btn-primary btn-sm">
        Pagar agora
      </Link>
    </div>
  );
}
