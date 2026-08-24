import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { ApiError, api, type InterIntegracaoData } from '../lib/api';

function vaultLabel(ok: boolean): string {
  return ok ? 'Salvo no cofre' : 'Pendente';
}

export function PlataformaInterIntegracaoPage() {
  const [data, setData] = useState<InterIntegracaoData | null>(null);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [operador, setOperador] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [ambiente, setAmbiente] = useState<'SANDBOX' | 'PROD'>('SANDBOX');
  const [ativo, setAtivo] = useState(true);
  const [certPem, setCertPem] = useState('');
  const [keyPem, setKeyPem] = useState('');
  const [certNome, setCertNome] = useState('');
  const [keyNome, setKeyNome] = useState('');

  const load = useCallback(() => {
    setErro('');
    setLoading(true);
    void api
      .plataformaInterIntegracao()
      .then((res) => {
        setData(res.data);
        setOperador(res.data.operador ?? '');
        setAmbiente(res.data.ambiente === 'PROD' ? 'PROD' : 'SANDBOX');
        setAtivo(res.data.ativo);
      })
      .catch((e: unknown) =>
        setErro(e instanceof ApiError ? e.message : 'Falha ao carregar integração Inter.'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const readFile = (
    file: File | null,
    setter: (v: string) => void,
    nameSetter: (v: string) => void,
  ) => {
    if (!file) return;
    nameSetter(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setter(reader.result);
    };
    reader.readAsText(file);
  };

  const salvar = async () => {
    setErro('');
    setOk('');
    setBusy('salvar');
    try {
      const body: Record<string, string | boolean> = {
        operador,
        ambiente,
        ativo,
      };
      if (clientId.trim()) body.client_id = clientId.trim();
      if (clientSecret.trim()) body.client_secret = clientSecret.trim();
      if (webhookSecret.trim()) body.webhook_secret = webhookSecret.trim();
      if (certPem.trim()) body.cert_pem = certPem.trim();
      if (keyPem.trim()) body.key_pem = keyPem.trim();

      const res = await api.plataformaSalvarInterIntegracao(body);
      setData(res.data);
      setAtivo(res.data.ativo);
      setClientId('');
      setClientSecret('');
      setWebhookSecret('');
      setCertPem('');
      setKeyPem('');
      setCertNome('');
      setKeyNome('');
      setOk('Credenciais salvas com segurança (cifradas).');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar.');
    } finally {
      setBusy(null);
    }
  };

  const testar = async () => {
    setErro('');
    setOk('');
    setBusy('testar');
    try {
      const res = await api.plataformaTestarInterIntegracao();
      setOk(res.data.mensagem);
    } catch (e) {
      if (e instanceof ApiError) {
        const first = Object.values(e.details ?? {})[0]?.[0];
        setErro(first ?? e.message);
      } else {
        setErro('Falha no teste OAuth.');
      }
    } finally {
      setBusy(null);
    }
  };

  const providerInter = data?.billing_provider_atual === 'inter';

  return (
    <>
      <PageHeader
        title="Integração Banco Inter"
        description="Mensalidade FLEXORC via PIX (BolePix). Credenciais da conta TRIGGER — não mistura com o sinal do ORC."
        actions={
          <Link to="/plataforma" className="btn btn-secondary">
            Voltar
          </Link>
        }
      />

      {erro ? (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      ) : null}
      {ok ? (
        <div className="alert alert-success" role="status">
          {ok}
        </div>
      ) : null}

      {loading && !data ? <p className="loading">Carregando…</p> : null}

      {data ? (
        <section className="ops-detail-grid" style={{ maxWidth: 880 }}>
          <div className="card">
            <div className="card-body">
              <div className="panel-title">
                <h3>Status do cofre</h3>
                <StatusPill status={data.configurado ? 'OK' : 'Pendente'} />
              </div>
              <p className="form-hint" style={{ marginTop: 0 }}>
                Situação:{' '}
                <StatusPill status={data.ativo ? 'Ativo' : 'Inativo'} />
                {' · '}
                Ambiente cadastrado: <strong>{data.ambiente === 'PROD' ? 'Produção' : 'Sandbox'}</strong>
                {' · '}
                Provedor da instalação: <code>{data.billing_provider_atual}</code>
              </p>

              {!providerInter ? (
                <div className="alert alert-warning" role="status">
                  O provedor ativo não é Inter. Para cobrança PIX na mensalidade, defina{' '}
                  <code>BILLING_PROVIDER=inter</code> no ambiente da instalação e reinicie a API.
                </div>
              ) : null}

              <div className="form-grid" style={{ marginTop: '0.75rem' }}>
                <div className="form-group">
                  <label>Client ID</label>
                  <span className="form-hint">{vaultLabel(data.tem_client_id)}</span>
                </div>
                <div className="form-group">
                  <label>Client Secret</label>
                  <span className="form-hint">{vaultLabel(data.tem_client_secret)}</span>
                </div>
                <div className="form-group">
                  <label>Certificado</label>
                  <span className="form-hint">{vaultLabel(data.tem_certificado)}</span>
                </div>
                <div className="form-group">
                  <label>Chave privada</label>
                  <span className="form-hint">{vaultLabel(data.tem_chave)}</span>
                </div>
                <div className="form-group">
                  <label>Webhook secret</label>
                  <span className="form-hint">{vaultLabel(data.tem_webhook_secret)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="panel-title">
                <h3>Credenciais</h3>
              </div>
              <p className="form-hint" style={{ marginTop: 0, marginBottom: '1rem' }}>
                Segredos já salvos permanecem no cofre. Deixe o campo em branco para manter o valor
                atual. Certificado e chave: envie de novo apenas para substituir.
              </p>

              <div className="form-section">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="inter-operador">Operador (conta corrente)</label>
                    <input
                      id="inter-operador"
                      value={operador}
                      onChange={(e) => setOperador(e.target.value)}
                      placeholder="Número da conta Inter"
                      autoComplete="off"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="inter-ambiente">Ambiente</label>
                    <select
                      id="inter-ambiente"
                      value={ambiente}
                      onChange={(e) => setAmbiente(e.target.value === 'PROD' ? 'PROD' : 'SANDBOX')}
                    >
                      <option value="SANDBOX">Sandbox</option>
                      <option value="PROD">Produção</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="inter-ativo">Situação</label>
                    <label
                      htmlFor="inter-ativo"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                    >
                      <input
                        id="inter-ativo"
                        type="checkbox"
                        checked={ativo}
                        onChange={(e) => setAtivo(e.target.checked)}
                      />
                      Ativo
                    </label>
                  </div>

                  <div className="form-group span-2">
                    <label htmlFor="inter-client-id">
                      Client ID
                      {data.tem_client_id ? ' (deixe em branco para manter)' : ''}
                    </label>
                    <input
                      id="inter-client-id"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder={data.tem_client_id ? '••••••••' : 'Client ID da integração'}
                      autoComplete="off"
                    />
                  </div>

                  <div className="form-group span-2">
                    <label htmlFor="inter-client-secret">
                      Client Secret
                      {data.tem_client_secret ? ' (deixe em branco para manter)' : ''}
                    </label>
                    <input
                      id="inter-client-secret"
                      type="password"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder={data.tem_client_secret ? '••••••••' : 'Client Secret'}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="form-group span-2">
                    <label htmlFor="inter-webhook-secret">
                      Webhook secret (opcional)
                      {data.tem_webhook_secret ? ' — já salvo' : ''}
                    </label>
                    <input
                      id="inter-webhook-secret"
                      type="password"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="Token enviado no header do webhook"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="inter-cert">
                      Certificado (.crt / .pem)
                      {data.tem_certificado ? ' — já salvo' : ''}
                    </label>
                    <input
                      id="inter-cert"
                      type="file"
                      accept=".crt,.pem,.cer,text/plain"
                      onChange={(e) =>
                        readFile(e.target.files?.[0] ?? null, setCertPem, setCertNome)
                      }
                    />
                    {certNome ? <span className="form-hint">Selecionado: {certNome}</span> : null}
                  </div>

                  <div className="form-group">
                    <label htmlFor="inter-key">
                      Chave privada (.key)
                      {data.tem_chave ? ' — já salva' : ''}
                    </label>
                    <input
                      id="inter-key"
                      type="file"
                      accept=".key,.pem,text/plain"
                      onChange={(e) =>
                        readFile(e.target.files?.[0] ?? null, setKeyPem, setKeyNome)
                      }
                    />
                    {keyNome ? <span className="form-hint">Selecionado: {keyNome}</span> : null}
                  </div>
                </div>

                <div className="form-actions" style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy !== null}
                    onClick={() => void salvar()}
                  >
                    {busy === 'salvar' ? 'Salvando…' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy !== null || !data.configurado}
                    onClick={() => void testar()}
                  >
                    {busy === 'testar' ? 'Testando…' : 'Testar conexão'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="panel-title">
                <h3>Webhook</h3>
              </div>
              <p className="form-hint" style={{ marginTop: 0 }}>
                Cole esta URL no Internet Banking Inter (notificações de cobrança BolePix). No
                ensaio local é o mesmo tunnel do ASAAS — não use <code>localhost</code> (o Inter
                só chama HTTPS público).
              </p>
              <div className="form-group">
                <label htmlFor="inter-webhook-url">URL do webhook</label>
                <input
                  id="inter-webhook-url"
                  readOnly
                  value={data.webhook_url}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </div>
              <p className="form-hint" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                Documentação:{' '}
                <a href={data.documentacao} target="_blank" rel="noreferrer">
                  Cobrança BolePix
                </a>
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
