import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { VolumePickTable } from '../components/VolumePickTable';
import { ApiError, api, type EstoqueSeparacaoDetalhe, type OpRetiradaVolume } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { EstoqueQrVolumeInfo } from '../lib/estoqueQrFila';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { formatDateTime, formatDecimalBr } from '../lib/format';
import {
  marcasDePreviewVolumes,
  ordenarMarcasPorLocal,
  type VolumePickMarca,
} from '../lib/producaoPick';
import { parseQtdeDigitada } from '../lib/producaoUi';

function qtdeLegivel(raw: string | null | undefined): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw ?? '';
  return String(n);
}

export function EstoqueSeparacaoChaoPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const podeEscrever = hasPermission('estoque.escrever') || hasPermission('producao.escrever');
  const volRef = useRef<HTMLInputElement>(null);
  const [detalhe, setDetalhe] = useState<EstoqueSeparacaoDetalhe | null>(null);
  const [marcas, setMarcas] = useState<VolumePickMarca[]>([]);
  const [qr, setQr] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ data: EstoqueSeparacaoDetalhe }>(`/estoque/separacoes/${id}`);
      setDetalhe(res.data);
      setMarcas(
        marcasDePreviewVolumes(res.data.retirada.volumes ?? [], res.data.retirada.candidatos ?? []),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao abrir a separação.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fichaHref = useMemo(() => {
    if (!id) return '/estoque/separacoes';
    const ativos = marcas.filter((m) => m.marcado && parseQtdeDigitada(m.qtde) > 0);
    if (ativos.length === 0) return `/estoque/separacoes/${id}/ficha`;
    const q = ativos.map((m) => `${m.lote_id}:${parseQtdeDigitada(m.qtde)}`).join(',');
    return `/estoque/separacoes/${id}/ficha?m=${encodeURIComponent(q)}`;
  }, [id, marcas]);

  const volDo = (loteId: number): OpRetiradaVolume | undefined =>
    [...(detalhe?.retirada.volumes ?? []), ...(detalhe?.retirada.candidatos ?? [])].find(
      (v) => v.lote_id === loteId,
    );
  const marcasNaCaminhada = ordenarMarcasPorLocal(marcas, (loteId) => volDo(loteId)?.endereco?.codigo);
  const separada = detalhe?.separacao?.volumes ?? [];
  const localPrimeiro = detalhe?.pode_confirmar
    ? (volDo(marcas.find((m) => m.marcado)?.lote_id ?? 0)?.endereco?.codigo ?? null)
    : (separada.find((v) => v.endereco)?.endereco ?? null);

  const marcarVolume = (loteId: number, qtde?: string, lido = false) => {
    const vol = volDo(loteId);
    const fallback = qtdeLegivel(vol?.qtde_volume ?? vol?.qtde_retirar ?? '0');
    setMarcas((atual) => {
      const existe = atual.find((x) => x.lote_id === loteId);
      if (existe) {
        return atual.map((x) =>
          x.lote_id === loteId
            ? {
                ...x,
                marcado: true,
                lido: x.lido || lido,
                qtde: qtde && parseQtdeDigitada(qtde) > 0 ? qtdeLegivel(qtde) : x.qtde || fallback,
              }
            : x,
        );
      }
      return [
        ...atual,
        {
          lote_id: loteId,
          qtde: qtde && parseQtdeDigitada(qtde) > 0 ? qtdeLegivel(qtde) : fallback,
          marcado: true,
          lido,
        },
      ];
    });
  };

  const lerVolume = async (payload: string) => {
    const p = payload.trim();
    if (!p || !id) return;
    if (p.toUpperCase().startsWith('END:')) {
      setErr('Esse QR é de local (END:…). A ficha já mostra o local de cada volume.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.get<{ data: EstoqueQrVolumeInfo }>(
        `/estoque/separacoes/${id}/volume?payload=${encodeURIComponent(p)}`,
      );
      const vol = res.data;
      marcarVolume(vol.lote_id, vol.qtde, true);
      setMsg(`Volume ${vol.codigo} marcado.`);
      setQr('');
      setTimeout(() => volRef.current?.focus(), 50);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Volume não reconhecido neste produto.');
      volRef.current?.select();
    } finally {
      setBusy(false);
    }
  };

  const confirmar = async () => {
    if (!id || !detalhe?.pode_confirmar) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const volumes = marcas
        .filter((m) => m.marcado && parseQtdeDigitada(m.qtde) > 0)
        .map((m) => ({ lote_id: m.lote_id, qtde: String(parseQtdeDigitada(m.qtde)) }));
      const res = await api.post<{ data: EstoqueSeparacaoDetalhe }>(
        `/estoque/separacoes/${id}/confirmar`,
        detalhe.produto?.controla_lote ? { volumes } : {},
      );
      setDetalhe(res.data);
      setMsg('Separação confirmada. O saldo deste produto sai na NF-e.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível confirmar.');
    } finally {
      setBusy(false);
    }
  };

  const nome = detalhe?.produto
    ? `${detalhe.produto.codigo} · ${detalhe.produto.descricao}`
    : detalhe?.descricao;

  return (
    <div className="page">
      <div className="pick-toolbar">
        <Link className="btn btn-secondary btn-sm" to="/estoque/separacoes">
          Fila
        </Link>
        {detalhe?.pedido_id ? (
          <Link className="btn btn-secondary btn-sm" to={`/pedidos/${detalhe.pedido_id}`}>
            Pedido
          </Link>
        ) : null}
        {detalhe ? (
          <a
            className="btn btn-secondary btn-sm"
            href={fichaHref}
            onClick={(e) => onAbrirFichaClick(e, fichaHref)}
          >
            Ficha para o estoque
          </a>
        ) : null}
        {detalhe ? <span className="pick-toolbar__ref">{detalhe.pedido_codigo}</span> : null}
      </div>

      {err ? <div className="alert alert-danger">{err}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {loading ? <p className="muted">Carregando…</p> : null}

      {detalhe && !loading ? (
        <>
          <section className="pick" aria-label="Separação de revenda">
            <header className="pick__job">
              <p className="pick__job-qtde">
                {formatDecimalBr(detalhe.qtde_pedida, 4, { stripTrailingZeros: true })} {detalhe.unidade}
              </p>
              <h2 className="pick__job-nome">{nome}</h2>
              <p className="pick__job-meta">
                {detalhe.parceiro?.razao_social ?? '—'}
                {detalhe.pedido_codigo ? ` · ${detalhe.pedido_codigo}` : ''}
              </p>
            </header>
            <div className="pick__next">
              <p className="pick__next-kicker">Destino: revenda</p>
              <p className="pick__bin">{localPrimeiro || 'Sem local'}</p>
              <p className="pick__hint">
                Saldo agora: {formatDecimalBr(detalhe.saldo, 4, { stripTrailingZeros: true })} {detalhe.unidade}. Confirmar
                registra o que vai sair da prateleira e deixa o item pronto para faturar. A baixa do
                saldo acontece na NF-e.
              </p>
            </div>
          </section>

          {detalhe.pode_confirmar && detalhe.produto?.controla_lote ? (
            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="card-body">
                <h3 style={{ marginTop: 0 }}>Volumes nesta empresa</h3>
                <p className="muted" style={{ marginTop: 0 }}>
                  Leia o QR (VOL:…) ou marque na lista. A ordem segue o local. O que já vem marcado é a
                  sugestão para a quantidade do pedido.
                </p>
                <div className="form-group" style={{ maxWidth: 420, marginBottom: '1rem' }}>
                  <label htmlFor="sep-vol-qr">Ler volume (VOL:…)</label>
                  <input
                    id="sep-vol-qr"
                    ref={volRef}
                    className="input"
                    value={qr}
                    disabled={busy || !podeEscrever}
                    onChange={(e) => setQr(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void lerVolume(qr);
                      }
                    }}
                    placeholder="Cole ou leia o QR do volume"
                    autoComplete="off"
                  />
                </div>
                <VolumePickTable
                  marcas={marcasNaCaminhada}
                  volDo={volDo}
                  busy={busy}
                  modo="snapshot"
                  onToggle={(loteId, marcado) =>
                    setMarcas((atual) =>
                      atual.map((x) => (x.lote_id === loteId ? { ...x, marcado } : x)),
                    )
                  }
                  onQtde={(loteId, qtde) =>
                    setMarcas((atual) =>
                      atual.map((x) => (x.lote_id === loteId ? { ...x, qtde } : x)),
                    )
                  }
                />
              </div>
            </div>
          ) : null}

          {detalhe.pode_confirmar && !detalhe.produto?.controla_lote ? (
            <p className="muted">Este produto não controla volume. Separe a quantidade pedida no saldo.</p>
          ) : null}

          {!detalhe.pode_confirmar && separada.length > 0 ? (
            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="card-body">
                <h3 style={{ marginTop: 0 }}>
                  Separado
                  {detalhe.separacao?.em ? ` em ${formatDateTime(detalhe.separacao.em)}` : ''}
                </h3>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Local</th>
                        <th>Volume</th>
                        <th>Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {separada.map((v) => (
                        <tr key={v.lote_id}>
                          <td>{v.endereco ?? '—'}</td>
                          <td>{v.codigo ?? '—'}</td>
                          <td>
                            {formatDecimalBr(v.qtde, 4, { stripTrailingZeros: true })} {v.unidade ?? detalhe.unidade}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {detalhe.pode_confirmar ? (
            <div style={{ marginTop: '1rem' }}>
              {podeEscrever ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={
                    busy ||
                    (Boolean(detalhe.produto?.controla_lote) &&
                      marcas.length > 0 &&
                      !marcas.some((m) => m.marcado && parseQtdeDigitada(m.qtde) > 0))
                  }
                  onClick={() => void confirmar()}
                >
                  Confirmar: separado para revenda
                </button>
              ) : (
                <p className="muted">Quem confirma a separação é quem escreve no estoque.</p>
              )}
            </div>
          ) : (
            <p className="muted">Esta linha já foi separada.</p>
          )}
        </>
      ) : null}
    </div>
  );
}
