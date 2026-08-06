import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import {
  IconAi,
  IconArrow,
  IconBuilding,
  IconHub,
  IconOrcamento,
  IconPartners,
  IconProduct,
  IconReport,
  IconSettings,
  IconUsers,
} from '../components/NavIcons';
import { useAuth } from '../lib/auth';

type ModuleCard = {
  to: string;
  title: string;
  description: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  visible: boolean;
};

export function DashboardPage() {
  const { hasPermission, hasAnyPermission, user, empresas, empresaId, roles } = useAuth();
  const currentEmpresa = empresas.find((e) => e.id === empresaId);
  const firstName = user?.name?.split(' ')[0] ?? 'usuário';

  const modules: ModuleCard[] = [
    {
      to: '/empresas',
      title: 'Empresas',
      description: 'Cadastro multi-CNPJ, filiais e configurações por empresa.',
      hint: 'Plataforma',
      icon: IconBuilding,
      visible: true,
    },
    {
      to: '/parceiros',
      title: 'Parceiros',
      description: 'Clientes, fornecedores, colaboradores e demais papéis comerciais.',
      hint: 'Relacionamento',
      icon: IconPartners,
      visible: hasPermission('parceiro.ler'),
    },
    {
      to: '/produtos',
      title: 'Produtos',
      description: 'Matérias-primas, acabados, revenda, serviços e dados fiscais.',
      hint: 'Catálogo',
      icon: IconProduct,
      visible: hasPermission('produto.ler'),
    },
    {
      to: '/orcamentos',
      title: 'Orçamentos',
      description: 'Rotina comercial em rascunho: calcular, salvar, revisar e excluir.',
      hint: 'Comercial',
      icon: IconOrcamento,
      visible: hasPermission('orcamento.ler'),
    },
    {
      to: '/relatorios',
      title: 'Relatórios IA',
      description: 'Solicite em linguagem natural; a IA gera o programa e o PDF profissional.',
      hint: 'Relatórios',
      icon: IconReport,
      visible: hasPermission('relatorio.ler'),
    },
    {
      to: '/usuarios',
      title: 'Usuários',
      description: 'Contas de acesso, perfis e restrições por empresa.',
      hint: 'Segurança',
      icon: IconUsers,
      visible: hasPermission('usuarios.gerir'),
    },
    {
      to: '/parametros',
      title: 'Parâmetros',
      description: 'Regras operacionais e preferências da empresa ativa.',
      hint: 'Configuração',
      icon: IconSettings,
      visible: hasPermission('parametros.gerir'),
    },
    {
      to: '/ia-provedores',
      title: 'Provedores de IA',
      description: 'Tokens e endpoints de IA para uso controlado no sistema.',
      hint: 'Sistema',
      icon: IconAi,
      visible: hasPermission('ia.provedores.gerir'),
    },
    {
      to: '/fiscal-hubs',
      title: 'Hubs fiscais',
      description: 'Focus NFe e demais hubs: tokens homolog/prod e vínculo da empresa.',
      hint: 'Fiscal',
      icon: IconHub,
      visible: hasPermission('fiscal.hubs.gerir'),
    },
  ].filter((m) => m.visible);

  return (
    <>
      <PageHeader
        title={`Olá, ${firstName}`}
        description="Painel inicial dos cadastros fundamentais do ERP RLP."
      />

      <section className="dash-context" aria-label="Contexto da sessão">
        <div className="dash-context-item">
          <span className="dash-context-label">Empresa ativa</span>
          <strong>
            {currentEmpresa
              ? `${currentEmpresa.codigo} — ${currentEmpresa.nome_fantasia ?? currentEmpresa.razao_social}`
              : 'Nenhuma selecionada'}
          </strong>
        </div>
        <div className="dash-context-item">
          <span className="dash-context-label">Perfil</span>
          <strong>{roles.length ? roles.join(', ') : '—'}</strong>
        </div>
        <div className="dash-context-item">
          <span className="dash-context-label">Escopo atual</span>
          <strong>Cadastros · Comercial</strong>
        </div>
      </section>

      <section className="dash-modules" aria-label="Módulos disponíveis">
        <div className="dash-section-head">
          <h2>Acesso rápido</h2>
          <p>Selecione um módulo para continuar o cadastro ou a consulta.</p>
        </div>

        <div className="dash-module-list">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.to} to={mod.to} className="dash-module-row">
                <span className="dash-module-icon">
                  <Icon />
                </span>
                <span className="dash-module-body">
                  <span className="dash-module-top">
                    <span className="dash-module-title">{mod.title}</span>
                    <span className="dash-module-hint">{mod.hint}</span>
                  </span>
                  <span className="dash-module-desc">{mod.description}</span>
                </span>
                <span className="dash-module-action" aria-hidden>
                  <IconArrow />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {!hasAnyPermission('parceiro.ler', 'produto.ler', 'orcamento.ler', 'relatorio.ler', 'usuarios.gerir', 'parametros.gerir') && (
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
