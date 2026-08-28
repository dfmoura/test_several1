import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandBar } from './BrandBar';
import { ProductLogo } from './ProductLogo';
import { TriggerByline } from './TriggerAttribution';
import {
  IconBuilding,
  IconAsset,
  IconBacklog,
  IconCatalog,
  IconCompras,
  IconDashboard,
  IconDepartamentos,
  IconEstoque,
  IconFaca,
  IconFinanceiro,
  IconImplantacao,
  IconMensalidade,
  IconNatureza,
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
  /** Exige permissão no `/me` (sem bypass ADMIN) — ex.: backlog lab. */
  exactPermission?: boolean;
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
      {
        to: '/backlog',
        label: 'Backlog',
        icon: IconBacklog,
        permission: 'backlog.ler',
        exactPermission: true,
      },
      { to: '/parceiros', label: 'Parceiros', icon: IconPartners, permission: 'parceiro.ler' },
      { to: '/patrimonio', label: 'Patrimônio', icon: IconPatrimonio, permission: 'patrimonio.ler' },
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
      },
      {
        to: '/mapa-facas',
        label: 'Mapa de facas',
        icon: IconFaca,
        permission: 'orcamento.ler',
      },
      {
        to: '/pedidos',
        label: 'Pedidos',
        icon: IconOrcamento,
        permission: 'producao.ler',
        isActivePath: (pathname) =>
          pathname === '/pedidos' || pathname.startsWith('/pedidos/'),
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
    label: 'Expedição',
    items: [
      {
        to: '/expedicao',
        label: 'Expedição',
        icon: IconEstoque,
        permission: 'expedicao.ler',
        isActivePath: (pathname) =>
          pathname === '/expedicao' || pathname.startsWith('/expedicao/'),
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
      {
        to: '/financeiro/faturamentos',
        label: 'Faturamentos',
        icon: IconFinanceiro,
        permission: 'faturamento.ler',
        isActivePath: (pathname) =>
          pathname === '/financeiro/faturamentos' ||
          pathname.startsWith('/financeiro/faturamentos/'),
      },
    ],
  },
  {
    label: 'Administração',
    items: [
      { to: '/conta/mensalidade', label: 'Mensalidade', icon: IconMensalidade, permission: null },
      {
        to: '/implantacao',
        label: 'Implantação',
        icon: IconImplantacao,
        permission: 'implantacao.ler',
      },
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
  const { user, empresas, empresaId, setEmpresa, logout, hasPermission, hasGrantedPermission, maxEmpresas, produtoFlexorc } =
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
    items: group.items.filter((item) => {
      if (!item.permission) return true;
      return item.exactPermission
        ? hasGrantedPermission(item.permission)
        : hasPermission(item.permission);
    }),
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
                {user?.codigo ? (
                  <div className="user-role">
                    <span className="user-conta">{user.codigo}</span>
                  </div>
                ) : null}
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
  const { billingAviso } = useAuth();
  const [pendente, setPendente] = useState<'pagamento' | 'a1' | 'a1_a_vencer' | 'cortesia' | null>(
    null,
  );
  const [valor, setValor] = useState<string | null>(null);
  const [cortesiaCopy, setCortesiaCopy] = useState<{
    dias: number | null;
    primeira: string | null;
    titulo: string | null;
    mensagem: string | null;
  }>({
    dias: null,
    primeira: null,
    titulo: null,
    mensagem: null,
  });
  const [a1Copy, setA1Copy] = useState<{
    dias: number | null;
    validoAte: string | null;
    mensagem: string | null;
    nivel: 'warning' | 'urgent' | null;
  }>({
    dias: null,
    validoAte: null,
    mensagem: null,
    nivel: null,
  });

  useEffect(() => {
    if (!billingAviso) return;
    if (billingAviso.tipo === 'cortesia') {
      setPendente('cortesia');
      setValor(billingAviso.valor_formatado);
      setCortesiaCopy({
        dias: billingAviso.dias_restantes,
        primeira: null,
        titulo: billingAviso.titulo,
        mensagem: billingAviso.mensagem,
      });
      return;
    }
    if (billingAviso.tipo === 'cortesia_encerrada') {
      setPendente('pagamento');
      setValor(billingAviso.valor_formatado);
      setCortesiaCopy({
        dias: 0,
        primeira: null,
        titulo: billingAviso.titulo,
        mensagem: billingAviso.mensagem,
      });
      return;
    }
    if (billingAviso.tipo === 'pendente' || billingAviso.tipo === 'suspensa') {
      setPendente('pagamento');
      setValor(billingAviso.valor_formatado);
      setCortesiaCopy({
        dias: null,
        primeira: null,
        titulo: billingAviso.titulo,
        mensagem: billingAviso.mensagem,
      });
    }
  }, [billingAviso]);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<{ data: AtivacaoData }>('/ativacao')
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        if (d.origem !== 'self_service') {
          if (!billingAviso) setPendente(null);
          return;
        }
        if (d.conta?.modo === 'cortesia_encerrada' && !d.conta.pagamento_autenticado) {
          setPendente('pagamento');
          setValor(d.conta.valor_formatado ?? null);
          setCortesiaCopy({
            dias: 0,
            primeira: d.conta.primeira_cobranca_formatada ?? null,
            titulo: 'Cortesia encerrada — pague para continuar',
            mensagem: d.conta.renovacao_label ?? null,
          });
          return;
        }
        if (d.pagamento_pendente) {
          setPendente('pagamento');
          setValor(d.conta?.valor_formatado ?? null);
          setCortesiaCopy({
            dias: null,
            primeira: null,
            titulo: null,
            mensagem: null,
          });
          return;
        }
        if (d.conta?.alerta_cortesia && !d.conta.pagamento_autenticado) {
          setPendente('cortesia');
          setValor(d.conta.valor_formatado ?? null);
          setCortesiaCopy({
            dias: d.conta.dias_ate_proxima ?? d.conta.cortesia?.dias_restantes ?? null,
            primeira: d.conta.primeira_cobranca_formatada ?? null,
            titulo: null,
            mensagem: null,
          });
          return;
        }
        if (d.conta?.modo === 'cortesia' && !d.conta.pagamento_autenticado) {
          setPendente('cortesia');
          setValor(d.conta.valor_formatado ?? null);
          setCortesiaCopy({
            dias: d.conta.dias_ate_proxima ?? d.conta.cortesia?.dias_restantes ?? null,
            primeira: d.conta.primeira_cobranca_formatada ?? null,
            titulo: null,
            mensagem: null,
          });
          return;
        }
        if (d.certificado_a1_pendente) {
          setPendente('a1');
          setValor(null);
          setA1Copy({
            dias: d.certificado_a1_dias_para_vencer ?? null,
            validoAte: d.certificado_a1_valido_ate ?? null,
            mensagem: d.certificado_a1_mensagem ?? null,
            nivel: 'urgent',
          });
          return;
        }
        if (
          d.certificado_a1_alerta &&
          (d.certificado_a1_status === 'A_VENCER' || d.certificado_a1_alerta_nivel)
        ) {
          setPendente('a1_a_vencer');
          setValor(null);
          setA1Copy({
            dias: d.certificado_a1_dias_para_vencer ?? null,
            validoAte: d.certificado_a1_valido_ate ?? null,
            mensagem: d.certificado_a1_mensagem ?? null,
            nivel: d.certificado_a1_alerta_nivel === 'urgent' ? 'urgent' : 'warning',
          });
          return;
        }
        if (!billingAviso) setPendente(null);
      })
      .catch(() => {
        if (!cancelled && !billingAviso) setPendente(null);
      });
    return () => {
      cancelled = true;
    };
  }, [empresaId, billingAviso]);

  if (!pendente) {
    return null;
  }

  if (pendente === 'a1') {
    return (
      <div className="billing-banner" role="status">
        <div>
          <strong>Certificado A1 desta empresa</strong>
          <span>
            {a1Copy.mensagem ??
              'Envie o certificado digital válido (mesmo CNPJ do cadastro) para liberar o envio da proposta.'}
          </span>
        </div>
        <Link to="/empresas?tab=a1" className="btn btn-primary btn-sm">
          Enviar certificado
        </Link>
      </div>
    );
  }

  if (pendente === 'a1_a_vencer') {
    const dias = a1Copy.dias;
    const urgente = a1Copy.nivel === 'urgent';
    return (
      <div
        className={`billing-banner${urgente ? ' billing-banner--urgente' : ' billing-banner--cortesia'}`}
        role="status"
      >
        <div>
          <strong>
            {dias === 0
              ? 'Certificado A1 vence hoje'
              : dias === 1
                ? 'Certificado A1 vence amanhã'
                : `Certificado A1 vence em ${dias ?? '—'} dias`}
          </strong>
          <span>
            {a1Copy.mensagem ??
              'Substitua o arquivo na ficha da empresa antes do vencimento para não bloquear o envio da proposta.'}
          </span>
        </div>
        <Link to="/empresas?tab=a1" className="btn btn-primary btn-sm">
          Substituir certificado
        </Link>
      </div>
    );
  }

  if (pendente === 'cortesia') {
    const dias = cortesiaCopy.dias;
    const primeira = cortesiaCopy.primeira;
    return (
      <div className="billing-banner billing-banner--cortesia" role="status">
        <div>
          <strong>{cortesiaCopy.titulo ?? 'Cortesia — autentique a mensalidade'}</strong>
          <span>
            {cortesiaCopy.mensagem ??
              `${
                dias === 0
                  ? 'Encerra hoje.'
                  : dias === 1
                    ? 'Encerra amanhã.'
                    : `Restam ${dias ?? '—'} dias.`
              } ${valor ? `${valor} · ` : ''}1ª cobrança antecipada${
                primeira ? ` em ${primeira}` : ''
              }. Sem isto o envio fica bloqueado ao fim da cortesia.`}
          </span>
        </div>
        <Link to="/conta/mensalidade" className="btn btn-primary btn-sm">
          Autenticar mensalidade
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`billing-banner${cortesiaCopy.titulo?.includes('encerrada') ? ' billing-banner--urgente' : ''}`}
      role="status"
    >
      <div>
        <strong>{cortesiaCopy.titulo ?? `Mensalidade ${BRAND.product.name} em aberto`}</strong>
        <span>
          {cortesiaCopy.mensagem ??
            `${valor ? `${valor} · ` : ''}Regularize a mensalidade antecipada da conta. Sem isto o
          envio da proposta fica bloqueado.`}
        </span>
      </div>
      <Link to="/conta/mensalidade" className="btn btn-primary btn-sm">
        {cortesiaCopy.titulo?.includes('encerrada') ? 'Pagar agora' : 'Ver mensalidade'}
      </Link>
    </div>
  );
}
