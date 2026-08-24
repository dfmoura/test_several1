import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { ApiError, api, type BillingCatalogoData } from '../lib/api';
import { formatCurrency } from '../lib/format';

const CICLOS = [
  { value: 'MONTHLY', label: 'Todo mês' },
  { value: 'WEEKLY', label: 'Toda semana' },
  { value: 'BIWEEKLY', label: 'A cada 2 semanas' },
  { value: 'BIMONTHLY', label: 'Bimestral' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'SEMIANNUALLY', label: 'Semestral' },
  { value: 'YEARLY', label: 'Anual' },
] as const;

export function PlataformaMensalidadePage() {
  const [data, setData] = useState<BillingCatalogoData | null>(null);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [valor, setValor] = useState('');
  const [ciclo, setCiclo] = useState('MONTHLY');
  const [descricao, setDescricao] = useState('');
  const [confirmarAumento, setConfirmarAumento] = useState(false);

  const load = useCallback(() => {
    setErro('');
    setLoading(true);
    void api
      .plataformaBillingCatalogo()
      .then((res) => {
        setData(res.data);
        setValor(String(res.data.valor));
        setCiclo(res.data.ciclo);
        setDescricao(res.data.descricao);
        setConfirmarAumento(false);
      })
      .catch((e: unknown) =>
        setErro(e instanceof ApiError ? e.message : 'Falha ao carregar o plano comercial.'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const valorNum = Number.parseFloat(valor.replace(',', '.'));
  const valorAtual = data?.valor ?? 0;
  const aumento = Number.isFinite(valorNum) && valorNum > valorAtual + 0.009;
  const mrrNovo =
    Number.isFinite(valorNum) && data ? Math.round(data.impacto.contas_em_dia * valorNum * 100) / 100 : null;

  const salvar = async () => {
    if (!data) return;
    setErro('');
    setOk('');
    if (!Number.isFinite(valorNum) || valorNum < 0) {
      setErro('Informe um valor válido.');
      return;
    }
    if (aumento && !confirmarAumento) {
      setErro('Confirme o aumento de preço antes de salvar.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.plataformaSalvarBillingCatalogo({
        valor: valorNum,
        ciclo,
        descricao: descricao.trim() || 'Mensalidade da conta FLEXORC',
      });
      setData(res.data);
      setValor(String(res.data.valor));
      setCiclo(res.data.ciclo);
      setDescricao(res.data.descricao);
      setConfirmarAumento(false);

      if (!res.data.alterado) {
        setOk('Nenhuma alteração detectada.');
        return;
      }

      const sync = res.data.sync;
      const partes = ['Plano atualizado.'];
      if (sync) {
        if (sync.pix_invalidados > 0) {
          partes.push(`${sync.pix_invalidados} PIX Inter invalidado(s).`);
        }
        if (sync.asaas_atualizadas > 0) {
          partes.push(`${sync.asaas_atualizadas} assinatura(s) ASAAS sincronizada(s) para o próximo ciclo.`);
        }
        if (sync.asaas_erros?.length) {
          partes.push(`ASAAS: ${sync.asaas_erros.length} conta(s) com aviso — veja a auditoria.`);
        }
      }
      setOk(partes.join(' '));
    } catch (e) {
      if (e instanceof ApiError) {
        const first = Object.values(e.details ?? {})[0]?.[0];
        setErro(first ?? e.message);
      } else {
        setErro('Não foi possível salvar o plano.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Plano comercial"
        description="Valor da mensalidade FLEXORC (conta → TRIGGER). Reflete na hora para clientes e no MRR do painel."
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
        <section className="ops-detail-grid" style={{ maxWidth: 720 }}>
          <div className="card">
            <div className="card-body">
              <div className="panel-title">
                <h3>Vigente agora</h3>
                <StatusPill status={data.fonte === 'banco' ? 'Banco' : 'Env'} />
              </div>
              <p className="form-hint" style={{ marginTop: 0 }}>
                {formatCurrency(data.valor)} · {data.ciclo_label} · provedor{' '}
                <code>{data.billing_provider}</code>
              </p>
              <p className="form-hint">
                MRR estimado: <strong>{formatCurrency(data.impacto.mrr_estimado)}</strong> (
                {data.impacto.contas_em_dia} contas em dia)
              </p>
              {data.vigente_desde ? (
                <p className="form-hint">
                  Preço vigente desde{' '}
                  {new Date(data.vigente_desde).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="panel-title">
                <h3>Editar mensalidade</h3>
              </div>
              <p className="form-hint" style={{ marginTop: 0, marginBottom: '1rem' }}>
                Clientes veem o novo valor em <code>/conta/mensalidade</code> imediatamente. PIX Inter
                abertos são cancelados; ASAAS atualiza no próximo ciclo de cobrança.
              </p>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="billing-valor">Valor (R$)</label>
                  <input
                    id="billing-valor"
                    type="text"
                    inputMode="decimal"
                    className="form-control"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="billing-ciclo">Ciclo</label>
                  <select
                    id="billing-ciclo"
                    className="form-control"
                    value={ciclo}
                    onChange={(e) => setCiclo(e.target.value)}
                  >
                    {CICLOS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group form-group--full">
                  <label htmlFor="billing-descricao">Descrição na fatura</label>
                  <input
                    id="billing-descricao"
                    type="text"
                    className="form-control"
                    maxLength={255}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
              </div>

              {mrrNovo !== null && mrrNovo !== data.impacto.mrr_estimado ? (
                <p className="form-hint" style={{ marginTop: '0.75rem' }}>
                  Novo MRR estimado: <strong>{formatCurrency(mrrNovo)}</strong>
                  {mrrNovo > data.impacto.mrr_estimado ? ' (aumento)' : ' (redução)'}
                </p>
              ) : null}

              {aumento ? (
                <label className="form-check" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={confirmarAumento}
                    onChange={(e) => setConfirmarAumento(e.target.checked)}
                  />
                  <span>
                    Confirmo o aumento de {formatCurrency(valorAtual)} para{' '}
                    {formatCurrency(valorNum)} nas {data.impacto.contas_em_dia} contas em dia.
                  </span>
                </label>
              ) : null}

              <div className="btn-row" style={{ marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void salvar()}>
                  {busy ? 'Salvando…' : 'Salvar plano'}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
