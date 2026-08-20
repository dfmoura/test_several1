import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, type EntregaPreview, type Parceiro } from '../lib/api';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { formatCurrency } from '../lib/format';
import {
  entStatusLabel,
  formatDestinoLinha,
  modoEntregaLabel,
  tipoSaidaLabel,
} from '../lib/expedicaoUi';
import { StatusPill } from './StatusPill';

type Props = {
  pedidoId: number;
  pedidoCodigo: string;
  pedidoStatus: string;
  onChanged?: () => void;
};

export function ExpedicaoPedidoPanel({ pedidoId, pedidoCodigo, pedidoStatus, onChanged }: Props) {
  const { hasPermission } = useAuth();
  const [preview, setPreview] = useState<EntregaPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [tipoSaida, setTipoSaida] = useState('FROTA');
  const [volumes, setVolumes] = useState('1');
  const [rastreio, setRastreio] = useState('');
  const [transportadoraId, setTransportadoraId] = useState('');
  const [transportadoras, setTransportadoras] = useState<Parceiro[]>([]);
  const [provaNome, setProvaNome] = useState('');
  const [provaDoc, setProvaDoc] = useState('');
  const [provaObs, setProvaObs] = useState('');
  const [provaTipo, setProvaTipo] = useState('CANHOTO');

  const canWrite = hasPermission('expedicao.escrever');
  const visivel = ['FATURADO', 'EM_ENTREGA', 'ENTREGUE', 'ENCERRADO'].includes(pedidoStatus);

  const load = async () => {
    if (!visivel) {
      setPreview(null);
      return;
    }
    try {
      const res = await api.get<{ data: EntregaPreview }>(`/pedidos/${pedidoId}/entrega-preview`);
      setPreview(res.data);
      if (res.data.tipo_saida_sugerido) {
        setTipoSaida(res.data.tipo_saida_sugerido === 'BALCAO' ? 'FROTA' : res.data.tipo_saida_sugerido);
      }
      if (res.data.entrega?.rastreio) {
        setRastreio(res.data.entrega.rastreio);
      }
    } catch {
      setPreview(null);
    }
  };

  useEffect(() => {
    void load();
  }, [pedidoId, pedidoStatus]);

  useEffect(() => {
    if (!canWrite || preview?.modo !== 'ENTREGAR') return;
    void api
      .get<{ data: Parceiro[] }>('/parceiros?papel=transportadora')
      .then((res) => setTransportadoras(res.data))
      .catch(() => setTransportadoras([]));
  }, [canWrite, preview?.modo]);

  if (!visivel || !preview) {
    return null;
  }

  const expedir = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const payload: Record<string, unknown> = {
        volumes: Number(volumes) || 1,
      };
      if (preview.modo === 'ENTREGAR') {
        payload.tipo_saida = tipoSaida;
        if (tipoSaida === 'TRANSPORTADORA') {
          payload.transportadora_id = Number(transportadoraId);
          payload.rastreio = rastreio.trim();
        }
      }
      const res = await api.post<{ data: { codigo: string } }>(`/pedidos/${pedidoId}/expedir`, payload);
      setMsg(
        preview.modo === 'RETIRAR'
          ? `${res.data.codigo} pronto para retirada no balcão.`
          : `${res.data.codigo} despachado.`,
      );
      onChanged?.();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível expedir.');
    } finally {
      setBusy(false);
    }
  };

  const confirmar = async (e: FormEvent) => {
    e.preventDefault();
    const ent = preview.entrega;
    if (!ent) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const body =
        preview.modo === 'RETIRAR'
          ? {
              prova_tipo: 'ASSINATURA_BALCAO',
              prova_nome: provaNome.trim(),
              prova_documento: provaDoc.trim() || undefined,
            }
          : {
              prova_tipo: provaTipo,
              prova_obs: provaObs.trim(),
            };
      await api.post(`/entregas/${ent.id}/confirmar`, body);
      setMsg('Entrega confirmada. A cobrança segue a condição já negociada.');
      onChanged?.();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível confirmar.');
    } finally {
      setBusy(false);
    }
  };

  const ent = preview.entrega;

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <div className="form-section">
          <h3>Expedição e entrega</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            {preview.modo === 'RETIRAR'
              ? 'O cliente retira no balcão. Conferir volumes, registrar quem levou, depois seguir o recebimento se ainda houver saldo.'
              : 'Saída por transporte. Despachar, confirmar a entrega, depois seguir o recebimento conforme a condição.'}{' '}
            Confirmar entrega não baixa título.
          </p>
        </div>

        {msg && <div className="alert alert-success">{msg}</div>}
        {err && <div className="alert alert-error">{err}</div>}

        <div className="detail-meta">
          <div>
            <span>Modo</span>
            <strong>{modoEntregaLabel(preview.modo)}</strong>
          </div>
          <div>
            <span>Destino</span>
            <strong>
              {preview.destino?.label ?? '—'}
              <div className="muted" style={{ fontSize: '0.85em', fontWeight: 400 }}>
                {formatDestinoLinha(preview.destino)}
              </div>
            </strong>
          </div>
          {preview.faturamento ? (
            <div>
              <span>Faturamento</span>
              <strong>
                <Link to={`/financeiro/faturamentos/${preview.faturamento.id}`}>
                  {preview.faturamento.codigo}
                </Link>
              </strong>
            </div>
          ) : null}
          {ent ? (
            <div>
              <span>Romaneio</span>
              <strong>
                <Link to={`/expedicao/${ent.id}`}>{ent.codigo}</Link>
                {' · '}
                <StatusPill status={entStatusLabel(ent.status)} />
              </strong>
            </div>
          ) : null}
        </div>

        {preview.avisos?.map((a) => (
          <p key={a} className="form-hint">
            {a}
          </p>
        ))}
        {preview.bloqueios?.map((b) => (
          <p key={b} className="form-error">
            {b}
          </p>
        ))}

        {canWrite && preview.apto ? (
          <form onSubmit={(e) => void expedir(e)} style={{ marginTop: '1rem' }}>
            <div className="btn-row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ minWidth: 100 }}>
                <label>Volumes</label>
                <input
                  value={volumes}
                  onChange={(e) => setVolumes(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              {preview.modo === 'ENTREGAR' ? (
                <>
                  <div className="form-group" style={{ minWidth: 180 }}>
                    <label>Como sai</label>
                    <select value={tipoSaida} onChange={(e) => setTipoSaida(e.target.value)}>
                      <option value="FROTA">Frota própria</option>
                      <option value="TRANSPORTADORA">Transportadora</option>
                      <option value="OUTRO">Outro</option>
                    </select>
                  </div>
                  {tipoSaida === 'TRANSPORTADORA' ? (
                    <>
                      <div className="form-group" style={{ minWidth: 220 }}>
                        <label>Transportadora</label>
                        <select
                          value={transportadoraId}
                          onChange={(e) => setTransportadoraId(e.target.value)}
                          required
                        >
                          <option value="">Selecione…</option>
                          {transportadoras.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.razao_social}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ minWidth: 180 }}>
                        <label>Rastreio</label>
                        <input
                          value={rastreio}
                          onChange={(e) => setRastreio(e.target.value)}
                          placeholder="Código"
                          required
                        />
                      </div>
                    </>
                  ) : null}
                </>
              ) : null}
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {preview.modo === 'RETIRAR' ? 'Preparar para retirada' : 'Despachar'}
              </button>
            </div>
          </form>
        ) : null}

        {canWrite && preview.pode_confirmar && ent ? (
          <form onSubmit={(e) => void confirmar(e)} style={{ marginTop: '1rem' }}>
            {preview.modo === 'RETIRAR' ? (
              <div className="btn-row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ minWidth: 220 }}>
                  <label>Quem retirou</label>
                  <input
                    value={provaNome}
                    onChange={(e) => setProvaNome(e.target.value)}
                    placeholder="Nome"
                    required
                  />
                </div>
                <div className="form-group" style={{ minWidth: 160 }}>
                  <label>Documento</label>
                  <input
                    value={provaDoc}
                    onChange={(e) => setProvaDoc(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  Confirmar retirada
                </button>
              </div>
            ) : (
              <div className="btn-row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ minWidth: 160 }}>
                  <label>Prova</label>
                  <select value={provaTipo} onChange={(e) => setProvaTipo(e.target.value)}>
                    <option value="CANHOTO">Canhoto</option>
                    <option value="RASTREIO">Rastreio</option>
                    <option value="OUTRO">Outra</option>
                  </select>
                </div>
                <div className="form-group" style={{ minWidth: 240 }}>
                  <label>Registro</label>
                  <input
                    value={provaObs}
                    onChange={(e) => setProvaObs(e.target.value)}
                    placeholder="Protocolo ou observação"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  Confirmar entrega
                </button>
              </div>
            )}
            <p className="form-hint">
              Romaneio {ent.codigo}
              {ent.tipo_saida ? ` · ${tipoSaidaLabel(ent.tipo_saida)}` : ''}.{' '}
              <Link to={`/expedicao/${ent.id}`}>Abrir ficha da entrega</Link>
              {' · '}
              <a
                href={`/expedicao/${ent.id}/ficha`}
                onClick={(ev) => onAbrirFichaClick(ev, `/expedicao/${ent.id}/ficha`)}
              >
                Imprimir
              </a>
            </p>
          </form>
        ) : null}

        {ent?.status === 'ENTREGUE' && (preview.titulos_abertos?.length ?? 0) > 0 ? (
          <p className="form-hint" style={{ marginTop: '1rem' }}>
            Saldo a receber {preview.faturamento?.valor_a_cobrar ? formatCurrency(preview.faturamento.valor_a_cobrar) : ''}
            {preview.faturamento?.condicao_pagamento ? ` · ${preview.faturamento.condicao_pagamento}` : ''}.{' '}
            {hasPermission('financeiro.ler') ? (
              <Link to={`/financeiro/contas-a-receber?q=${pedidoCodigo}`}>Contas a receber</Link>
            ) : (
              'Financeiro dá baixa no título.'
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}
