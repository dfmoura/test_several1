import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OpFiltroVolumes } from './OpFiltroVolumes';
import { api, type OrdemProducao, type OrdemProducaoMaterial } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import {
  formatLotePick,
  formatMetrosDeVolumes,
  formatMetrosLineares,
  formatPickPrincipal,
  formatVolumesComMetros,
  larguraMmParaMetro,
  modoRetirada,
  modoRetiradaLabel,
  qtdeVolumeTotal,
  volumePassaFiltro,
  volumeSugerido,
  volumesParaEscolha,
} from '../lib/producaoPick';
import {
  hrefFichaEstoque,
  opComponenteLabel,
  opKitEstado,
  opKitNome,
  opKitOnde,
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
 * Um material por vez: bobina = volume total de cada uma; o resto = unidades.
 * Confirmar = SAIDA_PRODUCAO no writer existente.
 */
export function OpEscolhaOverlay({ op, material, porta, canWrite, onClose, onOp }: Props) {
  const modo = modoRetirada(material);
  const estado = opKitEstado(material);
  const noEstoque = porta === 'chao';
  const podeBaixar = noEstoque && canWrite && estado === 'falta_pegar';
  const vols = useMemo(() => volumesParaEscolha(material), [material]);
  const larguraFallback = larguraMmParaMetro(material, op);
  const alvo = parseQtdeDigitada(material.qtde_planejada ?? material.retirada?.qtde ?? '0');
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
  const [qtdeUn, setQtdeUn] = useState(material.qtde_planejada ?? String(alvo || ''));
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const onde = opKitOnde(material);
  const volsVisiveis = useMemo(
    () => vols.filter((v) => volumePassaFiltro(v, filtro)),
    [vols, filtro],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
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
  }, [filtro, onClose]);

  const escolhidos = vols.filter((v) => v.lote_id && marcados[v.lote_id]);
  const somaVol = escolhidos.reduce((acc, v) => acc + qtdeVolumeTotal(v), 0);
  const override =
    modo === 'volume' &&
    (() => {
      const ids = escolhidos
        .map((v) => v.lote_id)
        .filter((id): id is number => typeof id === 'number')
        .sort((a, b) => a - b);
      return ids.length !== fefoIds.length || ids.some((id, i) => id !== fefoIds[i]);
    })();

  const confirmar = async () => {
    if (!podeBaixar) return;
    if (modo === 'volume') {
      if (escolhidos.length === 0) {
        setErr('Toque nos volumes que vai levar.');
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
          <div>
            <p className="op-escolha__tipo">{tipo}</p>
            <h2 id="op-escolha-title">{opKitNome(material)}</h2>
            <p className="op-escolha__bin">{onde === '—' ? 'Sem local' : onde}</p>
            <p className="muted">
              {noEstoque
                ? 'Retirada física — o que sair daqui sai do estoque.'
                : 'Cesta desta ordem — a baixa é no estoque.'}{' '}
              {modoRetiradaLabel(modo)}
              {modo === 'volume'
                ? ` · ${formatPickPrincipal(material, op)}`
                : alvo > 0
                  ? ` · ${formatDecimalBr(alvo, alvo % 1 === 0 ? 0 : 2)} ${material.unidade}`
                  : ''}
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Fechar
          </button>
        </header>

        {err ? <div className="alert alert-danger">{err}</div> : null}

        {estado === 'sem_estoque' ? (
          <p className="muted">Sem saldo deste material. Compre antes de buscar.</p>
        ) : estado === 'ja_saiu' ? (
          <p className="muted">Este item já saiu do estoque.</p>
        ) : modo === 'volume' ? (
          <>
            <OpFiltroVolumes
              id="op-escolha-filtro"
              value={filtro}
              onChange={setFiltro}
              total={vols.length}
              visiveis={volsVisiveis.length}
            />
            <ul className="op-escolha__vols">
              {vols.length === 0 ? (
                <li className="muted">Nenhum volume disponível.</li>
              ) : volsVisiveis.length === 0 ? (
                <li className="muted">Nenhum volume com esse filtro.</li>
              ) : (
                volsVisiveis.map((v) => {
                  const id = v.lote_id as number;
                  const on = Boolean(marcados[id]);
                  const metros = formatMetrosLineares(v, larguraFallback);
                  return (
                    <li key={id} className={`op-escolha__vol${on ? ' is-on' : ''}`}>
                      <label>
                        {podeBaixar ? (
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={busy}
                            onChange={() => setMarcados((prev) => ({ ...prev, [id]: !on }))}
                          />
                        ) : null}
                        <span>
                          <strong className="op-escolha__vol-qtde">1 volume</strong>
                          {metros ? <span className="muted"> · {metros}</span> : null}
                          <span className="op-escolha__vol-cod">{formatLotePick(v)}</span>
                          {volumeSugerido(v) ? <span className="muted">sugerido</span> : null}
                          {v.nf_numero ? <span className="muted">NF {v.nf_numero}</span> : null}
                          {v.endereco?.codigo ? <span className="muted">{v.endereco.codigo}</span> : null}
                          {v.status_label ? <span className="muted">{v.status_label}</span> : null}
                          {v.data_validade ? <span className="muted">Val. {v.data_validade}</span> : null}
                          {v.sku ? <span className="muted">{v.sku}</span> : null}
                        </span>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
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
                <p className="muted">{material.unidade}</p>
              </>
            ) : (
              <p className="muted">
                {formatDecimalBr(alvo, alvo % 1 === 0 ? 0 : 2)} {material.unidade} nesta cesta.
              </p>
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

        {modo === 'volume' && escolhidos.length > 0 && podeBaixar ? (
          <p className="op-escolha__soma">
            Levar {formatVolumesComMetros(escolhidos.length, formatMetrosDeVolumes(escolhidos, larguraFallback))}
          </p>
        ) : null}

        <footer className="op-escolha__foot">
          {podeBaixar ? (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void confirmar()}>
              Confirmar: saiu do estoque
            </button>
          ) : porta === 'op' && estado === 'falta_pegar' ? (
            <Link className="btn btn-primary" to={hrefFichaEstoque(op.id, { materialId: material.id })}>
              Buscar no estoque
            </Link>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Ok
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
