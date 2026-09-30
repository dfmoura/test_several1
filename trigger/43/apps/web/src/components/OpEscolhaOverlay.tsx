import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { OpFiltroVolumes } from './OpFiltroVolumes';
import { ApiError, api, type OrdemProducao, type OrdemProducaoMaterial } from '../lib/api';
import type { EstoqueQrVolumeInfo } from '../lib/estoqueQrFila';
import {
  formatLotePick,
  formatMetrosLineares,
  formatNecessidadeOp,
  formatPickPrincipal,
  formatQtdePick,
  formatVolumeDimensao,
  formatVolumesComArea,
  areaM2Volume,
  larguraMmParaMetro,
  modoRetirada,
  modoRetiradaLabel,
  qtdeLinhaPick,
  qtdeVolumeTotal,
  somaAreaM2Volumes,
  volumePassaFiltro,
  localOverlayEscolha,
  volumeSugerido,
  volumesParaEscolha,
} from '../lib/producaoPick';
import {
  hrefFichaEstoque,
  opComponenteLabel,
  opKitEstado,
  opKitNome,
  parseQtdeDigitada,
} from '../lib/producaoUi';

type Props = {
  op: OrdemProducao;
  material: OrdemProducaoMaterial;
  porta: 'op' | 'chao';
  canWrite: boolean;
  onClose: () => void;
  onOp: (data: OrdemProducao) => void;
};

function qtdeCanon(n: number): string {
  return n.toFixed(4);
}

/**
 * Um material por vez: bobina = volume inteiro no carrinho de sessão; o resto = unidades.
 * QR só lê (VOL:); Confirmar = SAIDA_PRODUCAO no writer existente. Sem CART- / segundo ledger.
 */
export function OpEscolhaOverlay({ op, material, porta, canWrite, onClose, onOp }: Props) {
  const modo = modoRetirada(material);
  const estado = opKitEstado(material);
  const noEstoque = porta === 'chao';
  const podeBaixar = noEstoque && canWrite && estado === 'falta_pegar';
  const vols = useMemo(() => volumesParaEscolha(material), [material]);
  const larguraFallback = larguraMmParaMetro(material, op);
  const alvo = parseQtdeDigitada(material.qtde_planejada ?? material.retirada?.qtde ?? '0');
  /** Área que a ordem pede (m²) — unidade do writer; comparável com o carrinho. */
  const precisaM2 = modo === 'volume' ? qtdeLinhaPick(material) : null;
  const fefoIds = useMemo(
    () =>
      (material.retirada?.volumes ?? [])
        .map((v) => v.lote_id)
        .filter((id): id is number => typeof id === 'number' && id > 0)
        .sort((a, b) => a - b),
    [material],
  );

  const [marcados, setMarcados] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const v of vols) {
      if (v.lote_id) init[v.lote_id] = volumeSugerido(v);
    }
    return init;
  });
  const [filtro, setFiltro] = useState('');
  const [qr, setQr] = useState('');
  const [qtdeUn, setQtdeUn] = useState(material.qtde_planejada ?? String(alvo || ''));
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const qrRef = useRef<HTMLInputElement>(null);
  const volsVisiveis = useMemo(
    () => vols.filter((v) => volumePassaFiltro(v, filtro)),
    [vols, filtro],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (qr.trim()) {
        setQr('');
        return;
      }
      if (filtro.trim()) {
        setFiltro('');
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [filtro, qr, onClose]);

  useEffect(() => {
    if (!podeBaixar || modo !== 'volume') return;
    const t = window.setTimeout(() => qrRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [podeBaixar, modo, material.id]);

  const escolhidos = vols.filter((v) => v.lote_id && marcados[v.lote_id]);
  const localCabe = localOverlayEscolha(material, escolhidos);
  const somaVol = escolhidos.reduce((acc, v) => acc + qtdeVolumeTotal(v), 0);
  const areaCarrinho = somaAreaM2Volumes(escolhidos);
  const faltaM2 =
    precisaM2 != null && areaCarrinho != null
      ? Math.max(0, precisaM2 - areaCarrinho)
      : null;
  const cobreNecessidade =
    precisaM2 != null && areaCarrinho != null ? areaCarrinho + 1e-6 >= precisaM2 : null;
  const override =
    modo === 'volume' &&
    (() => {
      const ids = escolhidos
        .map((v) => v.lote_id)
        .filter((id): id is number => typeof id === 'number')
        .sort((a, b) => a - b);
      return ids.length !== fefoIds.length || ids.some((id, i) => id !== fefoIds[i]);
    })();

  const marcarVolume = (loteId: number, on: boolean) => {
    setMarcados((prev) => ({ ...prev, [loteId]: on }));
    setErr(null);
  };

  const lerVolume = async (payload: string) => {
    const p = payload.trim();
    if (!p || !podeBaixar || modo !== 'volume') return;
    if (p.toUpperCase().startsWith('END:')) {
      setErr('Esse QR é de local (END:…). O local de cada bobina já aparece na tabela.');
      setMsg(null);
      qrRef.current?.select();
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.get<{ data: EstoqueQrVolumeInfo }>(
        `/estoque/retiradas/${op.id}/volume?payload=${encodeURIComponent(p)}`,
      );
      const vol = res.data;
      const produtoId = material.produto?.id;
      if (!produtoId || vol.produto?.id !== produtoId) {
        setErr(
          `Volume ${vol.codigo} não é deste material (${opKitNome(material)}).`,
        );
        qrRef.current?.select();
        return;
      }
      const naLista = vols.find((v) => v.lote_id === vol.lote_id);
      if (!naLista?.lote_id) {
        setErr(`Volume ${vol.codigo} não está na lista disponível desta linha.`);
        qrRef.current?.select();
        return;
      }
      if (marcados[naLista.lote_id]) {
        setMsg(`Volume ${vol.codigo} já está no carrinho.`);
        setQr('');
        window.setTimeout(() => qrRef.current?.focus(), 40);
        return;
      }
      marcarVolume(naLista.lote_id, true);
      const area = areaM2Volume(naLista);
      const metros = formatMetrosLineares(naLista, larguraFallback);
      const detalhe =
        area != null && metros
          ? `${formatQtdePick(area, 'm²')} · rolo ${metros}`
          : area != null
            ? formatQtdePick(area, 'm²')
            : metros;
      setMsg(
        detalhe
          ? `Volume ${vol.codigo} no carrinho · bobina inteira (${detalhe}).`
          : `Volume ${vol.codigo} no carrinho · bobina inteira.`,
      );
      setQr('');
      window.setTimeout(() => qrRef.current?.focus(), 40);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Volume não reconhecido.');
      qrRef.current?.select();
    } finally {
      setBusy(false);
    }
  };

  const onQrKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    void lerVolume(qr);
  };

  const confirmar = async () => {
    if (!podeBaixar) return;
    if (modo === 'volume') {
      if (escolhidos.length === 0) {
        setErr('Marque ou escaneie as bobinas que vai levar.');
        return;
      }
      if (override && motivo.trim().length < 3) {
        setErr('Informe o motivo (mínimo 3 caracteres) para outro volume.');
        return;
      }
    } else if (parseQtdeDigitada(qtdeUn) <= 0) {
      setErr('Informe as unidades.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const linha =
        modo === 'volume'
          ? {
              material_id: material.id,
              qtde: qtdeCanon(somaVol),
              volumes: escolhidos.map((v) => ({
                lote_id: v.lote_id as number,
                qtde: qtdeCanon(qtdeVolumeTotal(v)),
              })),
              volumes_motivo: override ? motivo.trim() : undefined,
            }
          : { material_id: material.id, qtde: qtdeCanon(parseQtdeDigitada(qtdeUn)) };
      const res = await api.post<{ data: OrdemProducao }>(`/estoque/retiradas/${op.id}/confirmar`, {
        linhas: [linha],
      });
      onOp(res.data);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao confirmar.');
    } finally {
      setBusy(false);
    }
  };

  const tipo = opComponenteLabel(material.componente);

  return (
    <div className="op-escolha" role="dialog" aria-modal="true" aria-labelledby="op-escolha-title">
      <button type="button" className="op-escolha__backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="op-escolha__panel">
        <header className="op-escolha__head">
          <div className="op-escolha__head-main">
            <p className="op-escolha__tipo">{tipo}</p>
            <h2 id="op-escolha-title">{opKitNome(material)}</h2>
            {localCabe ? (
              <p className="op-escolha__bin">
                <span className="op-escolha__bin-rotulo">{localCabe.rotulo}</span>
                <span>{localCabe.locais.join(' · ')}</span>
              </p>
            ) : null}
            <p className="muted op-escolha__hint">
              {noEstoque
                ? 'Escaneie ou marque na tabela. Bobina sai inteira. Compare pela área (m²): metros do rolo não são os metros de pista da etiqueta quando a bobina é mais larga. Confirmar = saiu da prateleira.'
                : 'Cesta desta ordem — quem tira da prateleira confirma no estoque.'}{' '}
              {modoRetiradaLabel(modo)}.
            </p>
          </div>
          <div className="op-escolha__head-side">
            <div className="op-escolha__precisa">
              <span>A ordem pede</span>
              <strong>{formatNecessidadeOp(material, op)}</strong>
            </div>
            {estado === 'ja_saiu' ? (
              <div className="op-escolha__precisa op-escolha__precisa--saiu">
                <span>Saiu da prateleira</span>
                <strong>{formatPickPrincipal(material, op)}</strong>
              </div>
            ) : null}
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Fechar
            </button>
          </div>
        </header>

        {modo === 'volume' && estado === 'falta_pegar' ? (
          <div
            className={`op-escolha__progresso${cobreNecessidade ? ' is-ok' : ''}`}
            aria-live="polite"
          >
            <div className="op-escolha__progresso-item">
              <span>No carrinho (área)</span>
              <strong>
                {escolhidos.length === 0
                  ? '—'
                  : formatVolumesComArea(escolhidos.length, areaCarrinho)}
              </strong>
            </div>
            <div className="op-escolha__progresso-item">
              <span>{cobreNecessidade ? 'Situação' : 'Falta (área)'}</span>
              <strong>
                {escolhidos.length === 0
                  ? 'Vazio'
                  : cobreNecessidade
                    ? 'Área coberta'
                    : faltaM2 != null
                      ? formatQtdePick(faltaM2, 'm²')
                      : 'Conferir físico'}
              </strong>
            </div>
          </div>
        ) : null}

        {err ? <div className="alert alert-danger">{err}</div> : null}
        {msg ? <div className="alert alert-success">{msg}</div> : null}

        <div className="op-escolha__body">
          {estado === 'sem_estoque' ? (
            <p className="muted">Sem saldo deste material. Compre antes de buscar.</p>
          ) : estado === 'ja_saiu' ? (
            <p className="muted">Este item já saiu do estoque.</p>
          ) : modo === 'volume' ? (
            <>
              {podeBaixar ? (
                <div className="form-group op-escolha__qr">
                  <label htmlFor="op-escolha-qr">Ler volume (VOL:…)</label>
                  <input
                    id="op-escolha-qr"
                    ref={qrRef}
                    value={qr}
                    disabled={busy}
                    onChange={(e) => setQr(e.target.value)}
                    onKeyDown={onQrKey}
                    placeholder="Pistola ou digite — Enter inclui no carrinho (ainda não grava)"
                    autoComplete="off"
                  />
                  <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                    Cada leitura = bobina inteira. Confirmar no rodapé dá a saída.
                  </p>
                </div>
              ) : null}

              <OpFiltroVolumes
                id="op-escolha-filtro"
                value={filtro}
                onChange={setFiltro}
                total={vols.length}
                visiveis={volsVisiveis.length}
                autoFocus={false}
              />

              <div className="table-wrap op-escolha__table-wrap">
                <table className="data-table op-escolha__table">
                  <thead>
                    <tr>
                      {podeBaixar ? <th className="op-escolha__col-check">Levar</th> : null}
                      <th>Volume</th>
                      <th>Área</th>
                      <th>Rolo</th>
                      <th>Local</th>
                      <th>FEFO</th>
                      <th>NF</th>
                      <th>Validade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vols.length === 0 ? (
                      <tr>
                        <td colSpan={podeBaixar ? 8 : 7} className="muted">
                          Nenhum volume disponível.
                        </td>
                      </tr>
                    ) : volsVisiveis.length === 0 ? (
                      <tr>
                        <td colSpan={podeBaixar ? 8 : 7} className="muted">
                          Nenhum volume com esse filtro.
                        </td>
                      </tr>
                    ) : (
                      volsVisiveis.map((v) => {
                        const id = v.lote_id as number;
                        const on = Boolean(marcados[id]);
                        const metros = formatMetrosLineares(v, larguraFallback);
                        const area = areaM2Volume(v);
                        const dim = formatVolumeDimensao(v);
                        const sugerido = volumeSugerido(v);
                        return (
                          <tr
                            key={id}
                            className={[
                              on ? 'is-on' : '',
                              sugerido ? 'is-fefo' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {podeBaixar ? (
                              <td className="op-escolha__col-check">
                                <input
                                  type="checkbox"
                                  checked={on}
                                  disabled={busy}
                                  aria-label={`Levar ${formatLotePick(v)}`}
                                  onChange={() => marcarVolume(id, !on)}
                                />
                              </td>
                            ) : null}
                            <td>
                              <strong>{formatLotePick(v)}</strong>
                              {v.sku ? <div className="muted">{v.sku}</div> : null}
                            </td>
                            <td>{area != null ? formatQtdePick(area, 'm²') : '—'}</td>
                            <td>
                              {dim ?? '—'}
                              {metros && dim ? (
                                <div className="muted" style={{ fontSize: '0.85em' }}>
                                  {metros} de rolo
                                </div>
                              ) : null}
                            </td>
                            <td>{v.endereco?.codigo ?? '—'}</td>
                            <td>{sugerido ? 'Sugerido' : '—'}</td>
                            <td>{v.nf_numero ?? '—'}</td>
                            <td>
                              {v.data_validade ?? '—'}
                              {v.status_label ? (
                                <div className="muted">{v.status_label}</div>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="op-escolha__un">
              {podeBaixar ? (
                <>
                  <label htmlFor="op-escolha-un">Quantas unidades vai levar</label>
                  <input
                    id="op-escolha-un"
                    className="op-escolha__un-input"
                    inputMode="decimal"
                    value={qtdeUn}
                    disabled={busy}
                    onChange={(e) => setQtdeUn(e.target.value)}
                  />
                  <p className="muted">Informe o que vai levar agora.</p>
                </>
              ) : (
                <p className="muted">Quem tira da prateleira informa as unidades no estoque.</p>
              )}
            </div>
          )}

          {override && podeBaixar ? (
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label htmlFor="op-escolha-motivo">Motivo do outro volume</label>
              <input
                id="op-escolha-motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                disabled={busy}
                placeholder="Ex.: rasgo no rolo sugerido"
              />
            </div>
          ) : null}
        </div>

        <footer className="op-escolha__foot">
          {modo === 'volume' && escolhidos.length > 0 && podeBaixar ? (
            <p className="op-escolha__soma">
              Levar {formatVolumesComArea(escolhidos.length, areaCarrinho)}
              {cobreNecessidade === true ? (
                <span className="muted"> · área coberta</span>
              ) : cobreNecessidade === false ? (
                <span className="muted"> · ainda abaixo da área pedida</span>
              ) : null}
            </p>
          ) : (
            <span />
          )}
          <div className="op-escolha__foot-actions">
            {podeBaixar ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || (modo === 'volume' && escolhidos.length === 0)}
                onClick={() => void confirmar()}
              >
                Confirmar: saiu do estoque
              </button>
            ) : porta === 'op' && estado === 'falta_pegar' ? (
              <Link className="btn btn-primary" to={hrefFichaEstoque(op.id, { materialId: material.id })}>
                Estoque busca isto
              </Link>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Ok
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
