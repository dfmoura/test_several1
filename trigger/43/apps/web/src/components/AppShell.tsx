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
  IconCalendario,
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
  /** Qualquer uma das permissões (OR). Ignorado se `permission` for null. */
  permissionsAny?: string[];
  /** Exige permissão no `/me` (sem bypass ADMIN) — reservado a gates especiais. */
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
      { to: '/feriados', label: 'Feriados', icon: IconCalendario, permission: 'feriado.ler' },
      {
        to: '/condicoes-pagamento',
        label: 'Condições de pagamento',
        icon: IconFinanceiro,
        permission: 'condicao_pagamento.ler',
        permissionsAny: ['parceiro.ler', 'compras.ler', 'orcamento.ler'],
      },
        {
        to: '/backlog',
        label: 'Backlog',
        icon: IconBacklog,
        permission: 'backlog.ler',
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
        to: '/orcamentos/como-calcula',
        label: 'Como calcula',
        icon: IconCatalog,
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
      if (item.permissionsAny?.length) {
        const check = item.exactPermission ? hasGrantedPermission : hasPermission;
        if (item.permissionsAny.some((p) => check(p))) return true;
      }
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
  const licenca = useLicencaConta(empresaId);

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
            <LicencaStatusChip state={licenca} />
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
          <ContaAcaoBanner state={licenca} />
          {/* Remonta a tela ao trocar EMP — listagens e formulários usam o novo contexto. */}
          <Outlet key={empresaId ?? 'sem-empresa'} />
        </main>
      </div>
    </div>
  );
}

type LicencaUi =
  | { surface: 'none' }
  | {
      surface: 'chip';
      tom: 'ok' | 'aviso';
      titulo: string;
      detalhe: string;
      to: string;
    }
  | {
      surface: 'banner';
      kind: 'pagamento' | 'a1' | 'a1_a_vencer';
      urgente?: boolean;
      titulo: string;
      mensagem: string;
      valor: string | null;
      dias: number | null;
      cta: string;
      to: string;
    };

function diasFrase(dias: number | null, hoje: string, amanha: string, nDias: (n: number) => string): string {
  if (dias === 0) return hoje;
  if (dias === 1) return amanha;
  if (typeof dias === 'number') return nDias(dias);
  return '—';
}

function useLicencaConta(empresaId: number | null): LicencaUi {
  const { billingAviso } = useAuth();
  const [ui, setUi] = useState<LicencaUi>({ surface: 'none' });

  useEffect(() => {
    let cancelled = false;

    const fromAvisoBloqueio = (): LicencaUi | null => {
      if (!billingAviso) return null;
      if (
        billingAviso.tipo === 'cortesia_encerrada' ||
        billingAviso.tipo === 'pendente' ||
        billingAviso.tipo === 'suspensa'
      ) {
        return {
          surface: 'banner',
          kind: 'pagamento',
          urgente: billingAviso.tipo === 'cortesia_encerrada' || billingAviso.tipo === 'suspensa',
          titulo: billingAviso.titulo,
          mensagem: billingAviso.mensagem,
          valor: billingAviso.valor_formatado,
          dias: billingAviso.dias_restantes,
          cta: billingAviso.tipo === 'cortesia_encerrada' ? 'Regularizar' : 'Ver mensalidade',
          to: billingAviso.to || '/conta/mensalidade',
        };
      }
      return null;
    };

    const fromAvisoChip = (): LicencaUi | null => {
      if (!billingAviso) return null;
      if (billingAviso.tipo !== 'cortesia' && billingAviso.tipo !== 'ativa') return null;
      const dias = billingAviso.dias_restantes;
      const aviso =
        billingAviso.tipo === 'cortesia' &&
        typeof dias === 'number' &&
        dias <= 7;
      const detalhe =
        billingAviso.mensagem ||
        (billingAviso.tipo === 'cortesia'
          ? diasFrase(
              dias,
              'cortesia encerra hoje',
              'cortesia encerra amanhã',
              (n) => `cortesia · ${n} dias`,
            )
          : diasFrase(
              dias,
              'renovação hoje',
              'renovação amanhã',
              (n) => `${n} dias até a próxima mensalidade`,
            ));
      return {
        surface: 'chip',
        tom: aviso ? 'aviso' : 'ok',
        titulo: billingAviso.titulo || 'Licença ativa',
        detalhe,
        to: billingAviso.to || '/conta/mensalidade',
      };
    };

    const bloqueio = fromAvisoBloqueio();
    if (bloqueio) {
      setUi(bloqueio);
    } else {
      const chip = fromAvisoChip();
      if (chip) setUi(chip);
    }

    void api
      .get<{ data: AtivacaoData }>('/ativacao')
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        if (d.origem !== 'self_service') {
          if (!billingAviso) setUi({ surface: 'none' });
          return;
        }

        const conta = d.conta;
        const bloqueado =
          Boolean(d.pagamento_pendente) ||
          (conta?.modo === 'cortesia_encerrada' && !conta.pagamento_autenticado) ||
          conta?.modo === 'suspensa';

        if (bloqueado) {
          const encerrada = conta?.modo === 'cortesia_encerrada';
          const suspensa = conta?.modo === 'suspensa';
          setUi({
            surface: 'banner',
            kind: 'pagamento',
            urgente: encerrada || suspensa,
            titulo: suspensa
              ? 'Licença suspensa'
              : encerrada
                ? 'Licença — cortesia encerrada'
                : 'Licença aguardando pagamento',
            mensagem:
              conta?.renovacao_label ??
              (conta?.valor_formatado
                ? `${conta.valor_formatado} · Regularize em Mensalidade para liberar o envio da proposta.`
                : 'Regularize em Mensalidade para liberar o envio da proposta.'),
            valor: conta?.valor_formatado ?? null,
            dias: conta?.dias_ate_proxima ?? null,
            cta: encerrada || suspensa ? 'Regularizar' : 'Ver mensalidade',
            to: '/conta/mensalidade',
          });
          return;
        }

        if (d.certificado_a1_pendente) {
          setUi({
            surface: 'banner',
            kind: 'a1',
            urgente: true,
            titulo: 'Certificado A1 desta empresa',
            mensagem:
              d.certificado_a1_mensagem ??
              'Envie o certificado digital válido (mesmo CNPJ do cadastro) para liberar o envio da proposta.',
            valor: null,
            dias: d.certificado_a1_dias_para_vencer ?? null,
            cta: 'Enviar certificado',
            to: '/empresas?tab=a1',
          });
          return;
        }

        if (
          d.certificado_a1_alerta &&
          (d.certificado_a1_status === 'A_VENCER' || d.certificado_a1_alerta_nivel)
        ) {
          const dias = d.certificado_a1_dias_para_vencer ?? null;
          const urgente = d.certificado_a1_alerta_nivel === 'urgent';
          setUi({
            surface: 'banner',
            kind: 'a1_a_vencer',
            urgente,
            titulo: diasFrase(
              dias,
              'Certificado A1 vence hoje',
              'Certificado A1 vence amanhã',
              (n) => `Certificado A1 vence em ${n} dias`,
            ),
            mensagem:
              d.certificado_a1_mensagem ??
              'Substitua o arquivo na ficha da empresa antes do vencimento para não bloquear o envio da proposta.',
            valor: null,
            dias,
            cta: 'Substituir certificado',
            to: '/empresas?tab=a1',
          });
          return;
        }

        const dias =
          conta?.dias_ate_proxima ?? conta?.cortesia?.dias_restantes ?? null;
        const cortesia = conta?.modo === 'cortesia';
        const alerta =
          Boolean(conta?.alerta_cortesia) ||
          Boolean(conta?.cortesia?.alerta) ||
          (cortesia && typeof dias === 'number' && dias <= 7) ||
          (conta?.modo === 'pago' && typeof dias === 'number' && dias <= 7);

        if (conta && (conta.paga || cortesia || conta.modo === 'pago')) {
          const detalhe = cortesia
            ? diasFrase(
                dias,
                'cortesia encerra hoje',
                'cortesia encerra amanhã',
                (n) => `cortesia · ${n} dias`,
              )
            : diasFrase(
                dias,
                'renovação hoje',
                'renovação amanhã',
                (n) => `${n} dias até a próxima mensalidade`,
              );
          setUi({
            surface: 'chip',
            tom: alerta ? 'aviso' : 'ok',
            titulo: 'Licença ativa',
            detalhe,
            to: '/conta/mensalidade',
          });
          return;
        }

        if (!billingAviso) setUi({ surface: 'none' });
      })
      .catch(() => {
        if (!cancelled && !billingAviso) setUi({ surface: 'none' });
      });

    return () => {
      cancelled = true;
    };
  }, [empresaId, billingAviso]);

  return ui;
}

function LicencaStatusChip({ state }: { state: LicencaUi }) {
  if (state.surface !== 'chip') return null;
  return (
    <Link
      to={state.to}
      className={`licenca-status${state.tom === 'aviso' ? ' licenca-status--aviso' : ''}`}
      title={`${state.titulo} · ${state.detalhe}`}
    >
      <strong>{state.titulo}</strong>
      <span aria-hidden>·</span>
      <span>{state.detalhe}</span>
    </Link>
  );
}

function ContaAcaoBanner({ state }: { state: LicencaUi }) {
  if (state.surface !== 'banner') return null;

  if (state.kind === 'a1' || state.kind === 'a1_a_vencer') {
    return (
      <div
        className={`billing-banner${
          state.urgente ? ' billing-banner--urgente' : ' billing-banner--cortesia'
        }`}
        role="status"
      >
        <div>
          <strong>{state.titulo}</strong>
          <span>{state.mensagem}</span>
        </div>
        <Link to={state.to} className="btn btn-primary btn-sm">
          {state.cta}
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`billing-banner${state.urgente ? ' billing-banner--urgente' : ''}`}
      role="status"
    >
      <div>
        <strong>{state.titulo}</strong>
        <span>{state.mensagem}</span>
      </div>
      <Link to={state.to} className="btn btn-primary btn-sm">
        {state.cta}
      </Link>
    </div>
  );
}
