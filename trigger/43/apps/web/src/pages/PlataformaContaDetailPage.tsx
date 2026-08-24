import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { ApiError, api, type PlataformaContaDetalhe } from '../lib/api';
import { formatCnpj, formatCurrency, formatDateTime } from '../lib/format';

const PRESETS = [15, 30, 60, 90];

export function PlataformaContaDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<PlataformaContaDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bonifErro, setBonifErro] = useState<string | null>(null);
  const [bonifOk, setBonifOk] = useState<string | null>(null);
  const [dias, setDias] = useState('30');
  const [motivo, setMotivo] = useState('');

  const load = useCallback(() => {
    const n = Number(id);
    if (!n) return;
    setErro(null);
    void api
      .plataformaConta(n)
      .then((res) => setData(res.data))
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : 'Falha ao abrir a conta.'));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const bonificar = async (e: FormEvent) => {
    e.preventDefault();
    const n = Number(id);
    if (!n) return;
    setBonifErro(null);
    setBonifOk(null);
    setBusy(true);
    try {
      const res = await api.plataformaBonificarConta(n, {
        dias: Number(dias),
        motivo: motivo.trim() || undefined,
      });
      setData((prev) => (prev ? { ...prev, ...res.data } : prev));
      setBonifOk(
        res.data.cortesia?.vigente
          ? `Cortesia até ${res.data.cortesia.ate_formatada}.`
          : 'Cortesia atualizada.',
      );
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        const first = Object.values(err.details ?? {})[0]?.[0];
        setBonifErro(first ?? err.message);
      } else {
        setBonifErro('Não foi possível bonificar a conta.');
      }
    } finally {
      setBusy(false);
    }
  };

  const encerrar = async () => {
    const n = Number(id);
    if (!n) return;
    if (
      !window.confirm(
        'Encerrar a cortesia hoje? O cliente precisará pagar a mensalidade para enviar propostas. Empresas e orçamentos não são apagados.',
      )
    ) {
      return;
    }
    setBonifErro(null);
    setBonifOk(null);
    setBusy(true);
    try {
      const res = await api.plataformaBonificarConta(n, { encerrar: true });
      setData((prev) => (prev ? { ...prev, ...res.data } : prev));
      setBonifOk('Cortesia encerrada. Histórico preservado.');
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        const first = Object.values(err.details ?? {})[0]?.[0];
        setBonifErro(first ?? err.message);
      } else {
        setBonifErro(err instanceof Error ? err.message : 'Falha ao encerrar.');
      }
    } finally {
      setBusy(false);
    }
  };

  const revogar = async () => {
    const n = Number(id);
    if (!n) return;
    if (!window.confirm('Revogar o período cortesia desta conta?')) return;
    setBonifErro(null);
    setBonifOk(null);
    setBusy(true);
    try {
      const res = await api.plataformaBonificarConta(n, { revogar: true });
      setData((prev) => (prev ? { ...prev, ...res.data } : prev));
      setBonifOk('Cortesia revogada.');
      load();
    } catch (err) {
      setBonifErro(err instanceof Error ? err.message : 'Falha ao revogar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={data?.master ? `${data.master.codigo} · ${data.master.name}` : 'Conta'}
        description="Operação TRIGGER: mensalidade da conta e bonificação (período cortesia). Usuários da conta continuam no FLEXORC do master."
        actions={
          <Link to="/plataforma/contas" className="btn btn-secondary">
            Voltar
          </Link>
        }
      />

      {erro ? (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      ) : null}

      {!data && !erro ? <p className="loading">Carregando…</p> : null}

      {data ? (
        <>
          <section className="ops-detail-grid">
            <div className="card">
              <div className="card-body">
                <h2>Mensalidade</h2>
                <p>
                  <StatusPill status={data.saude_label} />
                </p>
                <p>
                  {data.fatura.produto} → {data.fatura.fornecedor} ·{' '}
                  {formatCurrency(data.fatura.valor)} · {data.fatura.ciclo}
                </p>
                <p className="form-hint">
                  Provedor {data.billing_provider ?? '—'}
                  {data.billing_metodo_em
                    ? ` · autenticado em ${formatDateTime(data.billing_metodo_em)}`
                    : ' · ainda sem autenticação de pagamento'}
                </p>
                {data.cortesia?.vigente ? (
                  <p className="ops-cortesia-badge" role="status">
                    Cortesia até <strong>{data.cortesia.ate_formatada}</strong>
                    {data.cortesia.dias_restantes !== null
                      ? ` · ${data.cortesia.dias_restantes} dia(s)`
                      : ''}
                    {data.cortesia.motivo ? ` · ${data.cortesia.motivo}` : ''}
                  </p>
                ) : data.cortesia ? (
                  <p className="ops-cortesia-badge ops-cortesia-badge--encerrada" role="status">
                    Cortesia encerrada em <strong>{data.cortesia.ate_formatada}</strong>
                  </p>
                ) : null}
                <p className="form-hint">{data.master?.email}</p>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h2>Bonificar (cortesia)</h2>
                <p className="form-hint" style={{ marginTop: 0 }}>
                  Libera o produto sem registrar pagamento no provedor de mensalidade. O cliente vê
                  “Período cortesia” em Mensalidade. MRR não conta esta conta.
                </p>
                {bonifErro ? (
                  <div className="alert alert-error" role="alert">
                    {bonifErro}
                  </div>
                ) : null}
                {bonifOk ? (
                  <div className="alert alert-success" role="status">
                    {bonifOk}
                  </div>
                ) : null}
                <form onSubmit={(e) => void bonificar(e)}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="bonif-dias">Dias a conceder</label>
                      <input
                        id="bonif-dias"
                        type="number"
                        min={1}
                        max={3660}
                        required
                        value={dias}
                        onChange={(e) => setDias(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="bonif-motivo">Motivo (opcional)</label>
                      <input
                        id="bonif-motivo"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        maxLength={255}
                        placeholder="Piloto, cortesia comercial…"
                      />
                    </div>
                  </div>
                  <div className="ops-filters" style={{ marginTop: '0.65rem' }}>
                    {PRESETS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`btn btn-sm ${dias === String(d) ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setDias(String(d))}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                  <div className="form-actions" style={{ marginTop: '0.85rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                      {busy ? 'Salvando…' : 'Conceder / estender'}
                    </button>
                    {data.cortesia?.vigente ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => void encerrar()}
                      >
                        Encerrar cortesia
                      </button>
                    ) : null}
                    {data.cortesia ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={busy}
                        onClick={() => void revogar()}
                      >
                        Revogar registro
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>
          </section>

          <h2 className="ops-section-title">Empresas</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Razão social</th>
                  <th>CNPJ</th>
                  <th>Situação</th>
                  <th>Origem</th>
                </tr>
              </thead>
              <tbody>
                {data.empresas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      Nenhuma empresa cadastrada nesta conta.
                    </td>
                  </tr>
                ) : (
                  data.empresas.map((e) => (
                    <tr key={e.id}>
                      <td>{e.codigo}</td>
                      <td>{e.nome_fantasia ?? e.razao_social}</td>
                      <td>{formatCnpj(e.cnpj)}</td>
                      <td>
                        <StatusPill status={e.situacao} />
                      </td>
                      <td>{e.self_service ? 'Self-service' : 'Legado / seed'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h2 className="ops-section-title">Usuários</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Perfis</th>
                  <th>Ativo</th>
                  <th>Último acesso</th>
                </tr>
              </thead>
              <tbody>
                {data.usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>{u.codigo}</td>
                    <td>
                      <div>{u.name}</div>
                      <div className="table-muted">{u.email}</div>
                    </td>
                    <td>{u.roles.join(', ')}</td>
                    <td>{u.ativo ? 'Sim' : 'Não'}</td>
                    <td>{formatDateTime(u.ultimo_login_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}
