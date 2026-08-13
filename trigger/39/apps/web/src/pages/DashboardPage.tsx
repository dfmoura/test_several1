import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import {
  IconAi,
  IconAsset,
  IconBuilding,
  IconDepartamento,
  IconFaca,
  IconHub,
  IconNatureza,
  IconOrcamento,
  IconPartners,
  IconProduct,
  IconSettings,
  IconUsers,
} from '../components/NavIcons';
import { useAuth } from '../lib/auth';
import { BRAND } from '../lib/brand';

type DashLink = {
  to: string;
  title: string;
  blurb: string;
  icon: ComponentType<{ className?: string }>;
  visible: boolean;
};

type DashArea = {
  id: string;
  label: string;
  links: DashLink[];
};

export function DashboardPage() {
  const { hasPermission, hasAnyPermission, user, empresas, empresaId, roles } = useAuth();
  const currentEmpresa = empresas.find((e) => e.id === empresaId);
  const empresaNome = currentEmpresa
    ? (currentEmpresa.nome_fantasia ?? currentEmpresa.razao_social)
    : null;
  const firstName = user?.name?.split(' ')[0] ?? 'usuário';

  /**
   * Prioridades por área — não é sitemap (isso é o menu lateral).
   * Escala com M01–M11: novos módulos entram no grupo certo, sem lista infinita.
   */
  const areas: DashArea[] = [
    {
      id: 'comercial',
      label: 'Comercial',
      links: [
        {
          to: '/orcamentos',
          title: 'Orçamentos',
          blurb: 'Rascunhos e cálculo',
          icon: IconOrcamento,
          visible: hasPermission('orcamento.ler'),
        },
        {
          to: '/mapa-facas',
          title: 'Mapa de facas',
          blurb: 'Catálogo com desenho',
          icon: IconFaca,
          visible: hasPermission('orcamento.ler'),
        },
      ],
    },
    {
      id: 'cadastros',
      label: 'Cadastros',
      links: [
        {
          to: '/parceiros',
          title: 'Parceiros',
          blurb: 'Clientes e fornecedores',
          icon: IconPartners,
          visible: hasPermission('parceiro.ler'),
        },
        {
          to: '/produtos',
          title: 'Produtos',
          blurb: 'MP, acabados e serviços',
          icon: IconProduct,
          visible: hasPermission('produto.ler'),
        },
        {
          to: '/patrimonio',
          title: 'Patrimônio',
          blurb: 'Máquinas e bens (BEM)',
          icon: IconAsset,
          visible: hasPermission('patrimonio.ler'),
        },
        {
          to: '/departamentos',
          title: 'Departamentos',
          blurb: 'Áreas organizacionais (DEP)',
          icon: IconDepartamento,
          visible: hasPermission('departamento.ler'),
        },
        {
          to: '/naturezas-gerenciais',
          title: 'Naturezas gerenciais',
          blurb: 'Receita, custo e despesa (NAT)',
          icon: IconNatureza,
          visible: hasPermission('natureza_gerencial.ler'),
        },
        {
          to: '/empresas',
          title: 'Empresas',
          blurb: 'Multi-CNPJ e filiais',
          icon: IconBuilding,
          visible: true,
        },
      ],
    },
    {
      id: 'administracao',
      label: 'Administração',
      links: [
        {
          to: '/usuarios',
          title: 'Usuários',
          blurb: 'Contas e perfis',
          icon: IconUsers,
          visible: hasPermission('usuarios.gerir'),
        },
        {
          to: '/parametros',
          title: 'Parâmetros',
          blurb: 'Regras da empresa',
          icon: IconSettings,
          visible: hasPermission('parametros.gerir'),
        },
        {
          to: '/ia-provedores',
          title: 'Provedores de IA',
          blurb: 'Tokens e endpoints',
          icon: IconAi,
          visible: hasPermission('ia.provedores.gerir'),
        },
        {
          to: '/fiscal-hubs',
          title: 'Hubs fiscais',
          blurb: 'Focus e integrações',
          icon: IconHub,
          visible: hasPermission('fiscal.hubs.gerir'),
        },
      ],
    },
  ]
    .map((area) => ({
      ...area,
      links: area.links.filter((link) => link.visible),
    }))
    .filter((area) => area.links.length > 0);

  return (
    <>
      <PageHeader
        title={`Olá, ${firstName}`}
        description={`${BRAND.licensee.productName} · licenciado para ${BRAND.licensee.shortName}. Tudo abaixo vale só para a empresa ativa (EMP) — não é a marca nem outro sistema.`}
      />

      <section className="dash-context" aria-label="Contexto da sessão">
        <div className="dash-context-item">
          <span className="dash-context-label">{BRAND.licensee.productLabel}</span>
          <strong>{BRAND.licensee.productName}</strong>
          <span className="dash-context-note">Obra TRIGGER · byline no menu</span>
        </div>
        <div className="dash-context-item">
          <span className="dash-context-label">Licenciado</span>
          <strong>{BRAND.licensee.shortName}</strong>
          <span className="dash-context-note">Contrato · logo no menu</span>
        </div>
        <div className="dash-context-item">
          <span className="dash-context-label">Empresa ativa</span>
          {currentEmpresa ? (
            <div className="empresa-active empresa-active--dash">
              <span className="empresa-code">{currentEmpresa.codigo}</span>
              <span className="empresa-name">{empresaNome}</span>
            </div>
          ) : (
            <strong>Nenhuma selecionada</strong>
          )}
          {empresas.length > 1 ? (
            <span className="dash-context-note">
              Troque no topo · {empresas.length} liberadas nesta conta
            </span>
          ) : (
            <span className="dash-context-note">Uma EMP nesta conta — sem seletor</span>
          )}
        </div>
        <div className="dash-context-item">
          <span className="dash-context-label">Perfil</span>
          <strong>{roles.length ? roles.join(', ') : '—'}</strong>
          <span className="dash-context-note">
            {currentEmpresa
              ? [
                  currentEmpresa.venda_ativa === false ? 'Venda off' : 'Venda on',
                  currentEmpresa.estoque_ativo === false ? 'Estoque off' : 'Estoque on',
                ].join(' · ')
              : 'Ações permitidas'}
          </span>
        </div>
      </section>

      <section className="dash-priorities" aria-label="Prioridades por área">
        <div className="dash-section-head">
          <h2>Prioridades</h2>
          <p>Entrada por área de trabalho. O menu lateral cobre o catálogo completo.</p>
        </div>

        <div className="dash-area-stack">
          {areas.map((area) => (
            <div key={area.id} className="dash-area">
              <h3 className="dash-area-label">{area.label}</h3>
              <div className="dash-tile-grid">
                {area.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link key={link.to} to={link.to} className="dash-tile">
                      <span className="dash-tile-icon">
                        <Icon />
                      </span>
                      <span className="dash-tile-text">
                        <span className="dash-tile-title">{link.title}</span>
                        <span className="dash-tile-blurb">{link.blurb}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {!hasAnyPermission(
        'parceiro.ler',
        'produto.ler',
        'patrimonio.ler',
        'departamento.ler',
        'orcamento.ler',
        'usuarios.gerir',
        'parametros.gerir',
      ) && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-body">
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Seu perfil possui acesso limitado. Entre em contato com o administrador para
              solicitar permissões adicionais.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
