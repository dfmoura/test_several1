import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  OpFiltroVolumes,
  VOLUME_FILTRO_VAZIO,
  filtrarVolumesEscolha,
  volumeFiltroAtivo,
  type VolumeFiltroEstado,
} from './OpFiltroVolumes';
import { VolumePickTable } from './VolumePickTable';
import type { OpRetiradaVolume, OrdemProducao, OrdemProducaoMaterial } from '../lib/api';
import {
  balancoMetragem,
  larguraMmDoMaterial,
  ordenarMarcasPorLocal,
  qtdeVolumeTotal,
  textoBalancoSaida,
  type VolumePickMarca,
  type VolumePickModo,
} from '../lib/producaoPick';
import { parseQtdeDigitada } from '../lib/producaoUi';

type Props = {
  titulo: string;
  pedidoQtde: string;
  unidade: string;
  volumes: OpRetiradaVolume[];
  marcas: VolumePickMarca[];
  busy?: boolean;
  /** QR opcional — resolve no pai (porta REV / OP). */
  onLerQr?: (payload: string) => Promise<void>;
  /** Texto do cabeçalho. Sem onConfirm, a confirmação permanece na tela de trás. */
  hint?: string;
  modo?: VolumePickModo;
  mostrarProduto?: boolean;
  /**
   * Bobina (papel/acabamento): balanço Precisa · Escolhido · Falta e colunas
   * Dimensão / Área / Rolo. Sem isto = overlay REV / unidade (inalterado).
   */
  metragem?: { material: OrdemProducaoMaterial; op: OrdemProducao } | null;
  /** CTA do rodapé (ex.: reposição após perda). Sem isto = «Usar estes volumes» só fecha. */
  confirmLabel?: string;
  onConfirm?: () => void;
  onChangeMarcas: (next: VolumePickMarca[]) => void;
  onClose: () => void;
};

/**
 * Overlay canônico de escolha de N volumes (tabela + filtros).
 * Não grava saldo — o pai confirma (snapshot REV ou MOV na OP/estoque).
 */
export function SeparacaoVolumesOverlay({
  titulo,
  pedidoQtde,
  unidade,
  volumes,
  marcas,
  busy = false,
  onLerQr,
  hint = 'Marque um ou mais volumes. A confirmação fica na tela anterior.',
  modo = 'snapshot',
  mostrarProduto = false,
  metragem = null,
  confirmLabel,
  onConfirm,
  onChangeMarcas,
  onClose,
}: Props) {
  const [filtro, setFiltro] = useState<VolumeFiltroEstado>(VOLUME_FILTRO_VAZIO);
  const [qr, setQr] = useState('');
  const [errLocal, setErrLocal] = useState<string | null>(null);
  const qrRef = useRef<HTMLInputElement>(null);
  const comMetragem = Boolean(metragem);
  const larguraFallback = metragem ? larguraMmDoMaterial(metragem.material) : 0;

  const volDo = (loteId: number) => volumes.find((v) => v.lote_id === loteId);

  const marcasVisiveis = useMemo(() => {
    const idsVisiveis = new Set(
      filtrarVolumesEscolha(volumes, filtro)
        .map((v) => v.lote_id)
        .filter((id): id is number => typeof id === 'number' && id > 0),
    );
    const base = marcas.filter((m) => idsVisiveis.has(m.lote_id));
    // Inclui candidatos filtrados ainda sem marca (para poder marcar)
    const faltando = filtrarVolumesEscolha(volumes, filtro)
      .filter((v) => v.lote_id && !marcas.some((m) => m.lote_id === v.lote_id))
      .map((v) => ({
        lote_id: v.lote_id as number,
        qtde: String(Number(v.qtde_volume ?? v.qtde_retirar) || ''),
        marcado: false,
      }));
    return ordenarMarcasPorLocal(
      [...base, ...faltando],
      (id) => volumes.find((v) => v.lote_id === id)?.endereco?.codigo,
    );
  }, [volumes, marcas, filtro]);

  const nMarcados = marcas.filter((m) => m.marcado && parseQtdeDigitada(m.qtde) > 0).length;

  const balanco = useMemo(() => {
    if (!metragem) return null;
    const linhas = marcas
      .filter((m) => m.marcado)
      .map((m) => {
        const vol = volumes.find((v) => v.lote_id === m.lote_id);
        const total = vol ? qtdeVolumeTotal(vol) : 0;
        const digitada = parseQtdeDigitada(m.qtde);
        return {
          vol,
          qtde: total > 0 ? total : digitada,
        };
      })
      .filter((l) => (typeof l.qtde === 'number' ? l.qtde > 0 : parseQtdeDigitada(l.qtde) > 0));
    return balancoMetragem(metragem.material, metragem.op, linhas);
  }, [metragem, marcas, volumes]);

  const textoBalanco = balanco ? textoBalancoSaida(balanco, false) : null;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (qr.trim()) {
        setQr('');
        return;
      }
      if (volumeFiltroAtivo(filtro)) {
        setFiltro(VOLUME_FILTRO_VAZIO);
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
    if (!onLerQr) return;
    const t = window.setTimeout(() => qrRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [onLerQr]);

  const upsertMarca = (loteId: number, patch: Partial<VolumePickMarca>) => {
    const vol = volDo(loteId);
    const fallback = String(Number(vol?.qtde_volume ?? vol?.qtde_retirar) || '');
    const existe = marcas.find((m) => m.lote_id === loteId);
    if (existe) {
      onChangeMarcas(marcas.map((m) => (m.lote_id === loteId ? { ...m, ...patch } : m)));
      return;
    }
    onChangeMarcas([
      ...marcas,
      {
        lote_id: loteId,
        qtde: patch.qtde ?? fallback,
        marcado: patch.marcado ?? false,
        lido: patch.lido,
      },
    ]);
  };

  const onQrKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !onLerQr) return;
    e.preventDefault();
    const p = qr.trim();
    if (!p) return;
    if (p.toUpperCase().startsWith('END:')) {
      setErrLocal('Esse QR é de local (END:…). Use o filtro Local.');
      return;
    }
    setErrLocal(null);
    void onLerQr(p)
      .then(() => {
        setQr('');
        setErrLocal(null);
      })
      .catch((e: unknown) => {
        setErrLocal(e instanceof Error ? e.message : 'Volume não reconhecido.');
      });
  };

  return (
    <div className="op-escolha" role="dialog" aria-modal="true" aria-labelledby="sep-vol-title">
      <button type="button" className="op-escolha__backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="op-escolha__panel">
        <header className="op-escolha__head">
          <div className="op-escolha__head-main">
            <p className="op-escolha__tipo">Volumes</p>
            <h2 id="sep-vol-title">{titulo}</h2>
            <p className="muted op-escolha__hint">{hint}</p>
          </div>
          <div className="op-escolha__head-side">
            <div className="op-escolha__precisa">
              <span>{comMetragem ? 'A ordem pede' : 'Pedido'}</span>
              <strong>
                {textoBalanco ? textoBalanco.precisa : `${pedidoQtde} ${unidade}`}
              </strong>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Fechar
            </button>
          </div>
        </header>

        {textoBalanco ? (
          <div
            className={`op-escolha__progresso op-escolha__progresso--metragem${
              textoBalanco.tom === 'coberto' ? ' is-ok' : ''
            }`}
            aria-live="polite"
            title="Precisa é a metragem da ordem. Escolhido é a bobina inteira: metro do rolo e área do volume."
          >
            <div className="op-escolha__progresso-item">
              <span>Precisa</span>
              <strong>{textoBalanco.precisa}</strong>
            </div>
            <div className="op-escolha__progresso-item">
              <span>{textoBalanco.marcadoRotulo}</span>
              <strong>{nMarcados === 0 ? '—' : textoBalanco.marcado}</strong>
            </div>
            <div
              className={`op-escolha__progresso-item op-escolha__progresso-item--${textoBalanco.tom}`}
            >
              <span>{nMarcados === 0 ? 'Situação' : textoBalanco.coberturaRotulo}</span>
              <strong>{nMarcados === 0 ? 'Vazio' : textoBalanco.cobertura}</strong>
            </div>
          </div>
        ) : null}

        {errLocal ? <div className="alert alert-danger">{errLocal}</div> : null}

        <div className="op-escolha__body">
          {onLerQr ? (
            <div className="form-group op-escolha__qr">
              <label htmlFor="sep-overlay-qr">Ler volume (VOL:…)</label>
              <input
                id="sep-overlay-qr"
                ref={qrRef}
                value={qr}
                disabled={busy}
                onChange={(e) => setQr(e.target.value)}
                onKeyDown={onQrKey}
                placeholder="Pistola ou digite — Enter marca"
                autoComplete="off"
              />
            </div>
          ) : null}

          <OpFiltroVolumes
            idPrefix="sep-overlay"
            value={filtro}
            onChange={setFiltro}
            total={volumes.length}
            visiveis={filtrarVolumesEscolha(volumes, filtro).length}
            autoFocus={!onLerQr}
          />

          <VolumePickTable
            marcas={marcasVisiveis}
            volDo={volDo}
            busy={busy}
            modo={modo}
            mostrarProduto={mostrarProduto}
            mostrarMetragem={comMetragem}
            larguraMmFallback={larguraFallback}
            onToggle={(loteId, marcado) => {
              if (comMetragem && marcado) {
                const vol = volDo(loteId);
                const total = vol ? qtdeVolumeTotal(vol) : 0;
                upsertMarca(loteId, {
                  marcado: true,
                  ...(total > 0 ? { qtde: String(total) } : {}),
                });
                return;
              }
              upsertMarca(loteId, { marcado });
            }}
            onQtde={(loteId, qtde) => {
              const max = parseQtdeDigitada(volDo(loteId)?.qtde_volume);
              const n = parseQtdeDigitada(qtde);
              const limitada = max > 0 && n > max ? String(max) : qtde;
              upsertMarca(loteId, { qtde: limitada, marcado: true });
            }}
          />
        </div>

        <footer className="op-escolha__foot">
          <p className="op-escolha__soma">
            {nMarcados === 0
              ? 'Nenhum volume marcado'
              : textoBalanco
                ? `${nMarcados} volume${nMarcados === 1 ? '' : 's'} · ${textoBalanco.marcado}${
                    textoBalanco.tom === 'coberto'
                      ? ' · coberto'
                      : textoBalanco.tom === 'falta'
                        ? ` · falta ${textoBalanco.cobertura}`
                        : textoBalanco.tom === 'passa'
                          ? ` · passa ${textoBalanco.cobertura}`
                          : ''
                  }`
                : `${nMarcados} volume${nMarcados === 1 ? '' : 's'} marcado${nMarcados === 1 ? '' : 's'}`}
          </p>
          <div className="op-escolha__foot-actions">
            {onConfirm ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onConfirm}
                disabled={busy || nMarcados === 0}
              >
                {confirmLabel ?? 'Confirmar substituto'}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={onClose} disabled={busy}>
                {confirmLabel ?? 'Usar estes volumes'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
