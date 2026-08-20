import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type Entrega } from '../lib/api';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { formatDate } from '../lib/format';
import {
  entStatusLabel,
  formatDestinoLinha,
  modoEntregaLabel,
  provaTipoLabel,
  tipoSaidaLabel,
} from '../lib/expedicaoUi';
import { pedStatusLabel } from '../lib/producaoUi';

export function EntregaDetailPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const [ent, setEnt] = useState<Entrega | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [provaTipo, setProvaTipo] = useState('');
  const [provaNome, setProvaNome] = useState('');
  const [provaDoc, setProvaDoc] = useState('');
  const [provaObs, setProvaObs] = useState('');
  const [motivo, setMotivo] = useState('');
  const [acaoExtra, setAcaoExtra] = useState<'recusar' | 'cancelar' | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ data: Entrega }>(`/entregas/${id}`);
      setEnt(res.data);
      if (res.data.modo === 'RETIRAR') {
        setProvaTipo('ASSINATURA_BALCAO');
      } else if (!provaTipo) {
        setProvaTipo(res.data.rastreio ? 'RASTREIO' : 'CANHOTO');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao carregar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const vigente = ent && (ent.status === 'AGUARDA_RETIRADA' || ent.status === 'EM_TRANSITO');
  const canWrite = hasPermission('expedicao.escrever');

  const confirmar = async (e: FormEvent) => {
    e.preventDefault();
    if (!ent) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: Entrega }>(`/entregas/${ent.id}/confirmar`, {
        prova_tipo: provaTipo,
        prova_nome: provaNome.trim() || undefined,
        prova_documento: provaDoc.trim() || undefined,
        prova_obs: provaObs.trim() || undefined,
      });
      setEnt(res.data);
      const titulos = res.data.titulos_abertos ?? [];
      setMsg(
        titulos.length > 0
          ? `${res.data.codigo} confirmado. Há cobrança em aberto — baixe no Contas a receber conforme a condição.`
          : `${res.data.codigo} confirmado.`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível confirmar.');
    } finally {
      setBusy(false);
    }
  };

  const executarExtra = async () => {
    if (!ent || !acaoExtra) return;
    setBusy(true);
    setErr(null);
    try {
      const path = acaoExtra === 'recusar' ? 'recusar' : 'cancelar';
      const res = await api.post<{ data: Entrega }>(`/entregas/${ent.id}/${path}`, {
        motivo: motivo.trim(),
      });
      setEnt(res.data);
      setAcaoExtra(null);
      setMotivo('');
      setMsg(
        acaoExtra === 'recusar'
          ? 'Entrega recusada. O pedido voltou à fila de expedição.'
          : 'Romaneio cancelado. O pedido voltou à fila de expedição.',
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={ent?.codigo ?? 'Entrega'}
        description={
          ent
            ? `${ent.parceiro?.razao_social ?? '—'} · ${modoEntregaLabel(ent.modo)}`
            : loading
              ? 'Carregando…'
              : 'Romaneio não encontrado.'
        }
        actions={
          <div className="btn-row">
            <Link to="/expedicao" className="btn btn-secondary">
              Voltar
            </Link>
            {ent?.pedido?.id ? (
              <Link to={`/pedidos/${ent.pedido.id}`} className="btn btn-secondary">
                {ent.pedido.codigo}
              </Link>
            ) : null}
            {ent ? (
              <a
                href={`/expedicao/${ent.id}/ficha`}
                className="btn btn-secondary"
                onClick={(e) => onAbrirFichaClick(e, `/expedicao/${ent.id}/ficha`)}
              >
                Imprimir romaneio
              </a>
            ) : null}
          </div>
        }
      />

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      {loading || !ent ? (
        loading ? (
          <div className="loading">Carregando…</div>
        ) : (
          <div className="empty-state">Romaneio não encontrado.</div>
        )
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div className="detail-meta">
                <div>
                  <span>Status</span>
                  <strong>
                    <StatusPill status={entStatusLabel(ent.status)} />
                  </strong>
                </div>
                <div>
                  <span>Pedido</span>
                  <strong>
                    {ent.pedido?.id ? (
                      <Link to={`/pedidos/${ent.pedido.id}`}>{ent.pedido.codigo}</Link>
                    ) : (
                      (ent.pedido?.codigo ?? '—')
                    )}
                    {ent.pedido?.status ? ` · ${pedStatusLabel(ent.pedido.status)}` : ''}
                  </strong>
                </div>
                <div>
                  <span>Saída</span>
                  <strong>
                    {modoEntregaLabel(ent.modo)} · {tipoSaidaLabel(ent.tipo_saida)}
                  </strong>
                </div>
                <div>
                  <span>Volumes</span>
                  <strong>
                    {ent.volumes}
                    {ent.unidade ? ` · ${ent.qtde} ${ent.unidade}` : ''}
                  </strong>
                </div>
                {ent.transportadora ? (
                  <div>
                    <span>Transportadora</span>
                    <strong>{ent.transportadora.razao_social}</strong>
                  </div>
                ) : null}
                {ent.rastreio ? (
                  <div>
                    <span>Rastreio</span>
                    <strong>{ent.rastreio}</strong>
                  </div>
                ) : null}
                <div>
                  <span>Destino</span>
                  <strong>{formatDestinoLinha(ent.destino)}</strong>
                </div>
                {ent.faturamento ? (
                  <div>
                    <span>Faturamento</span>
                    <strong>
                      <Link to={`/financeiro/faturamentos/${ent.faturamento.id}`}>
                        {ent.faturamento.codigo}
                      </Link>
                    </strong>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {vigente && canWrite ? (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <div className="form-section">
                  <h3>
                    {ent.modo === 'RETIRAR' ? 'Confirmar retirada no balcão' : 'Confirmar entrega'}
                  </h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    {ent.modo === 'RETIRAR'
                      ? 'Registre quem retirou. A cobrança segue a condição já faturada — não é baixa automática.'
                      : 'Registre a prova (canhoto, rastreio ou observação). Financeiro continua no Contas a receber.'}
                  </p>
                </div>
                <form onSubmit={(e) => void confirmar(e)}>
                  {ent.modo === 'RETIRAR' ? (
                    <>
                      <div className="form-group" style={{ maxWidth: 420 }}>
                        <label>Quem retirou</label>
                        <input
                          value={provaNome}
                          onChange={(e) => setProvaNome(e.target.value)}
                          placeholder="Nome completo"
                          required
                        />
                      </div>
                      <div className="form-group" style={{ maxWidth: 280 }}>
                        <label>Documento (opcional)</label>
                        <input
                          value={provaDoc}
                          onChange={(e) => setProvaDoc(e.target.value)}
                          placeholder="RG ou CPF"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-group" style={{ maxWidth: 280 }}>
                        <label>Tipo de prova</label>
                        <select value={provaTipo} onChange={(e) => setProvaTipo(e.target.value)}>
                          <option value="CANHOTO">Canhoto</option>
                          <option value="RASTREIO">Rastreio / protocolo</option>
                          <option value="OUTRO">Outra</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ maxWidth: 480 }}>
                        <label>Registro</label>
                        <input
                          value={provaObs}
                          onChange={(e) => setProvaObs(e.target.value)}
                          placeholder="Protocolo, nome no canhoto ou observação"
                          required
                        />
                      </div>
                    </>
                  )}
                  <div className="btn-row" style={{ marginTop: '0.75rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                      {ent.modo === 'RETIRAR' ? 'Confirmar retirada' : 'Confirmar entrega'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {ent.status === 'ENTREGUE' ? (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <div className="form-section">
                  <h3>Confirmação</h3>
                </div>
                <p>
                  {provaTipoLabel(ent.prova_tipo ?? '')}
                  {ent.prova_nome ? ` · ${ent.prova_nome}` : ''}
                  {ent.prova_obs ? ` · ${ent.prova_obs}` : ''}
                  {ent.confirmado_em ? ` · ${formatDate(ent.confirmado_em)}` : ''}
                </p>
                {ent.titulos_abertos && ent.titulos_abertos.length > 0 ? (
                  <p className="form-hint">
                    Cobrança em aberto conforme negociado.{' '}
                    {hasPermission('financeiro.ler') ? (
                      <Link to={`/financeiro/contas-a-receber?q=${ent.pedido?.codigo ?? ''}`}>
                        Ir para Contas a receber
                      </Link>
                    ) : (
                      'O financeiro baixa no Contas a receber.'
                    )}
                  </p>
                ) : (
                  <p className="form-hint">Não há título em aberto neste pedido.</p>
                )}
              </div>
            </div>
          ) : null}

          {vigente && canWrite ? (
            <div className="card">
              <div className="card-body">
                {!acaoExtra ? (
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={() => setAcaoExtra('recusar')}
                    >
                      Recusar / avaria
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={() => setAcaoExtra('cancelar')}
                    >
                      Cancelar romaneio
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="form-hint">
                      {acaoExtra === 'recusar'
                        ? 'Não marca como entregue. O pedido volta à fila para nova saída.'
                        : 'Desfaz o despacho. O pedido volta à fila. O documento ENT permanece no histórico.'}
                    </p>
                    <div className="form-group" style={{ maxWidth: 480 }}>
                      <label>Motivo</label>
                      <input
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Mínimo 3 caracteres"
                        autoFocus
                      />
                    </div>
                    <div className="btn-row" style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={busy || motivo.trim().length < 3}
                        onClick={() => void executarExtra()}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => {
                          setAcaoExtra(null);
                          setMotivo('');
                        }}
                      >
                        Desistir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
