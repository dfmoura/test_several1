import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  ExternalLink,
  Globe,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Settings2,
  Shield,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Loading } from '@/components/Loading';
import { StatusBadge } from '@/components/StatusBadge';
import { api, formatCnpj, formatDate } from '@/lib/api';
import type { AppSettings, HealthReady, UpdateSettingsPayload } from '@/types';

type TabId = 'geral' | 'prestador' | 'integracao' | 'console' | 'infra';

const tabs: { id: TabId; label: string; icon: typeof Settings2 }[] = [
  { id: 'geral', label: 'Visão geral', icon: Settings2 },
  { id: 'prestador', label: 'Prestador', icon: Building2 },
  { id: 'integracao', label: 'Integração', icon: Globe },
  { id: 'console', label: 'Console', icon: KeyRound },
  { id: 'infra', label: 'Infraestrutura', icon: Server },
];

function SourceBadge({ overridden }: { overridden?: boolean }) {
  if (overridden) {
    return (
      <span className="ml-2 inline-flex rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-700">
        Console
      </span>
    );
  }
  return (
    <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
      .env
    </span>
  );
}

function RestartHint({ fields, active }: { fields: string[]; active: string }) {
  if (!fields.includes(active)) return null;
  return (
    <p className="mt-2 text-xs text-amber-700">
      Alteração salva. Reinicie o serviço correspondente para aplicar em runtime.
    </p>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-slate-400">{children}</p>;
}

export function Configuracoes() {
  const [tab, setTab] = useState<TabId>('geral');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [health, setHealth] = useState<HealthReady | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [prestadorForm, setPrestadorForm] = useState({
    razaoSocial: '',
    codigoMunicipio: '',
    inscricaoMunicipal: '',
    dpsSerie: '',
  });

  const [integracaoForm, setIntegracaoForm] = useState({
    syncIntervalSec: '',
    cadastroEnabled: true,
    cadastroCacheTtlSec: '',
  });

  const [obsForm, setObsForm] = useState({ logLevel: 'info' });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([api.settings(), api.healthReady()]);
      setSettings(s);
      setHealth(h);
      setPrestadorForm({
        razaoSocial: s.prestador.razaoSocial,
        codigoMunicipio: s.prestador.codigoMunicipio,
        inscricaoMunicipal: s.prestador.inscricaoMunicipal ?? '',
        dpsSerie: s.prestador.dpsSerie,
      });
      setIntegracaoForm({
        syncIntervalSec: String(s.integracao.syncIntervalSec),
        cadastroEnabled: s.integracao.cadastroEnabled,
        cadastroCacheTtlSec: String(s.integracao.cadastroCacheTtlSec),
      });
      setObsForm({ logLevel: s.observabilidade.logLevel });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showMessage = (type: 'ok' | 'err', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSavePrestador = async () => {
    setSaving(true);
    try {
      const payload: UpdateSettingsPayload = {
        razaoSocial: prestadorForm.razaoSocial,
        codigoMunicipio: prestadorForm.codigoMunicipio,
        inscricaoMunicipal: prestadorForm.inscricaoMunicipal || undefined,
        dpsSerie: prestadorForm.dpsSerie,
      };
      const updated = await api.updateSettings(payload);
      setSettings(updated);
      showMessage('ok', 'Configurações do prestador salvas.');
    } catch (err) {
      showMessage('err', err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIntegracao = async () => {
    setSaving(true);
    try {
      const updated = await api.updateSettings({
        syncIntervalSec: Number(integracaoForm.syncIntervalSec),
        cadastroEnabled: integracaoForm.cadastroEnabled,
        cadastroCacheTtlSec: Number(integracaoForm.cadastroCacheTtlSec),
      });
      setSettings(updated);
      showMessage('ok', 'Configurações de integração salvas.');
    } catch (err) {
      showMessage('err', err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveObs = async () => {
    setSaving(true);
    try {
      const updated = await api.updateSettings({
        logLevel: obsForm.logLevel as UpdateSettingsPayload['logLevel'],
      });
      setSettings(updated);
      showMessage('ok', 'Nível de log salvo.');
    } catch (err) {
      showMessage('err', err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (field: string) => {
    setSaving(true);
    try {
      const updated = await api.resetSetting(field);
      setSettings(updated);
      setPrestadorForm({
        razaoSocial: updated.prestador.razaoSocial,
        codigoMunicipio: updated.prestador.codigoMunicipio,
        inscricaoMunicipal: updated.prestador.inscricaoMunicipal ?? '',
        dpsSerie: updated.prestador.dpsSerie,
      });
      setIntegracaoForm({
        syncIntervalSec: String(updated.integracao.syncIntervalSec),
        cadastroEnabled: updated.integracao.cadastroEnabled,
        cadastroCacheTtlSec: String(updated.integracao.cadastroCacheTtlSec),
      });
      setObsForm({ logLevel: updated.observabilidade.logLevel });
      showMessage('ok', 'Campo restaurado para valor do .env.');
    } catch (err) {
      showMessage('err', err instanceof Error ? err.message : 'Erro ao resetar');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('err', 'Confirmação de senha não confere.');
      return;
    }
    setSaving(true);
    try {
      await api.updateConsolePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await load();
      showMessage('ok', 'Senha do console atualizada.');
    } catch (err) {
      showMessage('err', err instanceof Error ? err.message : 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <Loading />;

  const ports = settings.infra.hostPorts;
  const infraLinks = [
    { label: 'RabbitMQ', url: `http://localhost:${ports.rabbitmqUi}`, desc: 'Filas e mensagens' },
    { label: 'MinIO Console', url: `http://localhost:${ports.minioConsole}`, desc: 'Armazenamento de XMLs' },
    { label: 'Traefik', url: `http://localhost:${ports.traefikDashboard}`, desc: 'Dashboard do proxy' },
    { label: 'Grafana', url: `http://localhost:${ports.grafana}`, desc: 'Observabilidade' },
    { label: 'Prometheus', url: `http://localhost:${ports.prometheus}`, desc: 'Métricas' },
    { label: 'API REST', url: `http://localhost:${ports.api}/health/ready`, desc: 'Health check direto' },
  ];

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Gerencie prestador, integrações e console"
        actions={
          <button type="button" className="btn-secondary" onClick={load} disabled={saving}>
            <RefreshCw size={16} className={saving ? 'animate-spin' : ''} />
            Atualizar
          </button>
        }
      />

      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            message.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'geral' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="card p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Ambiente</h2>
            <dl className="space-y-3 text-sm">
              <div className="dl-row">
                <dt>Ambiente</dt>
                <dd className="sm:text-right">
                  <StatusBadge value={settings.ambiente.value.toUpperCase()} />
                </dd>
              </div>
              <div className="dl-row">
                <dt>Gov.br mock</dt>
                <dd className="sm:text-right">{settings.integracao.govMock ? 'Sim' : 'Não'}</dd>
              </div>
              <div className="dl-row">
                <dt>Certificado A1</dt>
                <dd className="sm:text-right">
                  {settings.prestador.certificadoAtivo ? 'Ativo' : 'Mock / indisponível'}
                </dd>
              </div>
              <div className="dl-row">
                <dt>CNPJ</dt>
                <dd className="font-mono sm:text-right">{formatCnpj(settings.prestador.cnpj)}</dd>
              </div>
              {settings.updatedAt && (
                <div className="dl-row">
                  <dt>Última alteração</dt>
                  <dd className="sm:text-right">{formatDate(settings.updatedAt)}</dd>
                </div>
              )}
            </dl>
            <FieldHint>
              Ambiente, mock gov.br e certificado são definidos via <code className="text-xs">.env</code> e
              requerem reinício dos serviços.
            </FieldHint>
          </div>

          <div className="card p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Saúde do sistema</h2>
            {health ? (
              <dl className="space-y-3 text-sm">
                <div className="dl-row">
                  <dt>Status</dt>
                  <dd className="sm:text-right"><StatusBadge value={health.status} /></dd>
                </div>
                <div className="dl-row">
                  <dt>Banco de dados</dt>
                  <dd className="sm:text-right">{health.database ?? '—'}</dd>
                </div>
                {health.certificado && (
                  <>
                    <div className="dl-row">
                      <dt>Certificado válido até</dt>
                      <dd className="sm:text-right">{formatDate(health.certificado.validade)}</dd>
                    </div>
                    <div className="dl-row">
                      <dt>Dias para expirar</dt>
                      <dd
                        className={`sm:text-right ${health.certificado.diasParaExpirar < 30 ? 'font-medium text-red-600' : ''}`}
                      >
                        {health.certificado.diasParaExpirar}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">Indisponível</p>
            )}
            <div className="mt-4">
              <Link
                to="/auditoria"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
              >
                <Shield size={12} />
                Ver auditoria de alterações
              </Link>
            </div>
          </div>
        </div>
      )}

      {tab === 'prestador' && (
        <div className="card p-4 sm:p-6">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Dados do prestador</h2>
          <p className="mb-6 text-sm text-slate-500">
            CNPJ vem do certificado A1 quando ativo. Município e inscrição municipal são cadastro manual.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="cnpj">
                CNPJ
                <SourceBadge />
              </label>
              <input id="cnpj" className="input bg-slate-50" value={formatCnpj(settings.prestador.cnpj)} disabled />
              <FieldHint>Definido pelo certificado A1 ou NFSE_CNPJ (.env)</FieldHint>
            </div>

            <div>
              <label className="label" htmlFor="razaoSocial">
                Razão social
                <SourceBadge overridden={settings.prestadorOverrides.razaoSocial} />
              </label>
              <input
                id="razaoSocial"
                className="input"
                value={prestadorForm.razaoSocial}
                onChange={(e) => setPrestadorForm((f) => ({ ...f, razaoSocial: e.target.value }))}
                disabled={settings.prestador.certificadoAtivo}
              />
              {settings.prestador.certificadoAtivo && (
                <FieldHint>Com certificado ativo, razão social vem do A1</FieldHint>
              )}
            </div>

            <div>
              <label className="label" htmlFor="codigoMunicipio">
                Município (IBGE)
                <SourceBadge overridden={settings.prestadorOverrides.codigoMunicipio} />
              </label>
              <input
                id="codigoMunicipio"
                className="input font-mono"
                maxLength={7}
                value={prestadorForm.codigoMunicipio}
                onChange={(e) => setPrestadorForm((f) => ({ ...f, codigoMunicipio: e.target.value.replace(/\D/g, '') }))}
              />
              <FieldHint>Código IBGE de 7 dígitos — emissor da NFS-e</FieldHint>
            </div>

            <div>
              <label className="label" htmlFor="inscricaoMunicipal">
                Inscrição municipal
                <SourceBadge overridden={settings.prestadorOverrides.inscricaoMunicipal} />
              </label>
              <input
                id="inscricaoMunicipal"
                className="input"
                value={prestadorForm.inscricaoMunicipal}
                onChange={(e) => setPrestadorForm((f) => ({ ...f, inscricaoMunicipal: e.target.value }))}
              />
              <FieldHint>Cadastro municipal — não vem do cartão CNPJ</FieldHint>
            </div>

            <div>
              <label className="label" htmlFor="dpsSerie">
                Série DPS
                <SourceBadge overridden={settings.prestadorOverrides.dpsSerie} />
              </label>
              <input
                id="dpsSerie"
                className="input font-mono"
                maxLength={5}
                value={prestadorForm.dpsSerie}
                onChange={(e) => setPrestadorForm((f) => ({ ...f, dpsSerie: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={handleSavePrestador} disabled={saving}>
              <Save size={16} />
              Salvar prestador
            </button>
            {(['inscricaoMunicipal', 'codigoMunicipio', 'dpsSerie', 'razaoSocial'] as const).map((field) =>
              settings.prestadorOverrides[field] ? (
                <button
                  key={field}
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleReset(field)}
                  disabled={saving}
                >
                  <RotateCcw size={14} />
                  Restaurar {field}
                </button>
              ) : null,
            )}
          </div>
        </div>
      )}

      {tab === 'integracao' && (
        <div className="space-y-6">
          <div className="card p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Sincronização ADN</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="syncInterval">
                  Intervalo de sync (segundos)
                  <SourceBadge overridden={settings.integracaoOverrides.syncIntervalSec} />
                </label>
                <input
                  id="syncInterval"
                  type="number"
                  min={30}
                  max={86400}
                  className="input"
                  value={integracaoForm.syncIntervalSec}
                  onChange={(e) => setIntegracaoForm((f) => ({ ...f, syncIntervalSec: e.target.value }))}
                />
                <RestartHint fields={settings.restartRequired} active="syncIntervalSec" />
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Cadastro CNPJ</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <input
                  id="cadastroEnabled"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={integracaoForm.cadastroEnabled}
                  onChange={(e) => setIntegracaoForm((f) => ({ ...f, cadastroEnabled: e.target.checked }))}
                />
                <label htmlFor="cadastroEnabled" className="text-sm text-slate-700">
                  Enriquecimento cadastral ativo
                  <SourceBadge overridden={settings.integracaoOverrides.cadastroEnabled} />
                </label>
              </div>
              <div>
                <label className="label" htmlFor="cadastroCache">
                  Cache TTL (segundos)
                  <SourceBadge overridden={settings.integracaoOverrides.cadastroCacheTtlSec} />
                </label>
                <input
                  id="cadastroCache"
                  type="number"
                  min={60}
                  className="input"
                  value={integracaoForm.cadastroCacheTtlSec}
                  onChange={(e) => setIntegracaoForm((f) => ({ ...f, cadastroCacheTtlSec: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Endpoints gov.br</h2>
            <dl className="space-y-3 text-sm">
              <div className="dl-row">
                <dt>SEFIN</dt>
                <dd className="break-all font-mono text-xs sm:text-right">{settings.integracao.govEndpoints.sefin}</dd>
              </div>
              <div className="dl-row">
                <dt>ADN</dt>
                <dd className="break-all font-mono text-xs sm:text-right">{settings.integracao.govEndpoints.adn}</dd>
              </div>
            </dl>
            <FieldHint>Derivados do ambiente ({settings.ambiente.value}) — altere NFSE_AMBIENTE no .env</FieldHint>
          </div>

          <div className="card p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Observabilidade</h2>
            <div className="max-w-xs">
              <label className="label" htmlFor="logLevel">
                Nível de log
                <SourceBadge overridden={settings.observabilidadeOverrides.logLevel} />
              </label>
              <select
                id="logLevel"
                className="input"
                value={obsForm.logLevel}
                onChange={(e) => setObsForm({ logLevel: e.target.value })}
              >
                {['fatal', 'error', 'warn', 'info', 'debug', 'trace'].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <RestartHint fields={settings.restartRequired} active="logLevel" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={handleSaveIntegracao} disabled={saving}>
              <Save size={16} />
              Salvar integração
            </button>
            <button type="button" className="btn-primary" onClick={handleSaveObs} disabled={saving}>
              <Save size={16} />
              Salvar log
            </button>
          </div>
        </div>
      )}

      {tab === 'console' && (
        <div className="card max-w-lg p-4 sm:p-6">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Senha do console</h2>
          <p className="mb-6 text-sm text-slate-500">
            Altere a senha de acesso ao painel administrativo.
            {settings.console.webPasswordOverridden && ' Senha customizada via console (sobrescreve .env).'}
          </p>

          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="currentPassword">Senha atual</label>
              <input
                id="currentPassword"
                type="password"
                className="input"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="newPassword">Nova senha</label>
              <input
                id="newPassword"
                type="password"
                className="input"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="confirmPassword">Confirmar nova senha</label>
              <input
                id="confirmPassword"
                type="password"
                className="input"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn-primary mt-6"
            onClick={handlePasswordChange}
            disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword}
          >
            <KeyRound size={16} />
            Alterar senha
          </button>
        </div>
      )}

      {tab === 'infra' && (
        <div className="space-y-6">
          <div className="card p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Status dos serviços</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ['Banco de dados', settings.infra.databaseConfigured],
                ['Redis', settings.infra.redisConfigured],
                ['RabbitMQ', settings.infra.rabbitmqConfigured],
                ['MinIO', settings.infra.minioConfigured],
                ['Certificado configurado', Boolean(settings.infra.certPath)],
                ['Senha do certificado', settings.infra.certPasswordConfigured],
              ].map(([label, ok]) => (
                <div key={String(label)} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <dt className="text-slate-600">{label}</dt>
                  <dd><StatusBadge value={ok ? 'OK' : 'PENDENTE'} /></dd>
                </div>
              ))}
            </dl>
            {settings.infra.certPath && (
              <FieldHint>Caminho do certificado: {settings.infra.certPath}</FieldHint>
            )}
          </div>

          <div className="card p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Ferramentas</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {infraLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 transition hover:border-brand-300 hover:bg-brand-50/50"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800">{link.label}</div>
                    <div className="text-xs text-slate-500">{link.desc}</div>
                  </div>
                  <ExternalLink size={16} className="shrink-0 text-slate-400" />
                </a>
              ))}
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Variáveis de ambiente</h2>
            <p className="text-sm text-slate-600">
              Configurações sensíveis (certificado, API keys, URLs de banco) são definidas no arquivo{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env</code> e requerem reinício
              do Docker/serviços. Consulte <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env.example</code>{' '}
              para referência completa.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
