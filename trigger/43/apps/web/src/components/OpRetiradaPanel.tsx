import { useMemo, useState } from 'react';
import { StatusPill } from './StatusPill';
import type { OpRetiradaPreview, OpRetiradaVolume } from '../lib/api';
import { formatDate, formatDecimalBr } from '../lib/format';
import { parseQtdeDigitada } from '../lib/producaoUi';
import { validadeStatusLabel } from '../lib/produtoLotePolitica';

export type OpRetiradaLinhaDraft = {
  key: string;
  label: string;
  unidade: string;
  qtde: string;
  preview: OpRetiradaPreview;
  materialId?: number;
  produtoId?: number;
  complementar?: boolean;
};

export type OpRetiradaConfirmacao = {
  key: string;
  materialId?: number;
  produtoId?: number;
  qtde: string;
  complementar?: boolean;
  volumes?: Array<{ lote_id: number; qtde: string }>;
  volumes_motivo?: string;
};

type PickRow = {
  lote_id: number;
  codigo: string;
  qtde_volume: string;
  qtde: string;
  unidade: string | null;
  data_validade: string | null;
  status: string | null;
  status_label: string | null;
  largura_mm: string | null;
  comprimento_m: string | null;
  endereco: string | null;
  ordem_politica: number | null;
  sugerido: boolean;
};

function volumeToPick(v: OpRetiradaVolume, qtde: string): PickRow | null {
  if (!v.lote_id) return null;
  return {
    lote_id: v.lote_id,
    codigo: v.codigo ?? String(v.lote_id),
    qtde_volume: v.qtde_volume ?? '0',
    qtde,
    unidade: v.unidade,
    data_validade: v.data_validade,
    status: v.status,
    status_label: v.status_label,
    largura_mm: v.largura_mm,
    comprimento_m: v.comprimento_m,
    endereco: v.endereco?.codigo ?? null,
    ordem_politica: v.ordem_politica,
    sugerido: v.sugerido,
  };
}

function picksIniciais(preview: OpRetiradaPreview): PickRow[] {
  return preview.volumes
    .map((v) => volumeToPick(v, v.qtde_retirar))
    .filter((v): v is PickRow => v !== null);
}

function dimLabel(v: { largura_mm: string | null; comprimento_m: string | null }): string {
  if (!v.largura_mm && !v.comprimento_m) return '—';
  const l = v.largura_mm ? `${formatDecimalBr(Number(v.largura_mm), 0)} mm` : '—';
  const c = v.comprimento_m ? `${formatDecimalBr(Number(v.comprimento_m), 1)} m` : '—';
  return `${l} × ${c}`;
}

function somaPicks(picks: PickRow[]): number {
  return picks.reduce((acc, p) => acc + parseQtdeDigitada(p.qtde), 0);
}

function mesmaAlocacao(preview: OpRetiradaPreview, picks: PickRow[]): boolean {
  const a = preview.volumes
    .filter((v) => v.lote_id && parseQtdeDigitada(v.qtde_retirar) > 0)
    .map((v) => `${v.lote_id}:${Number(v.qtde_retirar).toFixed(4)}`)
    .sort();
  const b = picks
    .filter((p) => parseQtdeDigitada(p.qtde) > 0)
    .map((p) => `${p.lote_id}:${parseQtdeDigitada(p.qtde).toFixed(4)}`)
    .sort();
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

type Props = {
  titulo: string;
  linhas: OpRetiradaLinhaDraft[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: (linhas: OpRetiradaConfirmacao[]) => void;
};

export function OpRetiradaPanel({ titulo, linhas, busy, onCancel, onConfirm }: Props) {
  const [picksPorLinha, setPicksPorLinha] = useState<Record<string, PickRow[]>>(() => {
    const init: Record<string, PickRow[]> = {};
    for (const linha of linhas) {
      init[linha.key] = picksIniciais(linha.preview);
    }
    return init;
  });
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [localErr, setLocalErr] = useState<string | null>(null);

  const resumo = useMemo(() => {
    return linhas.map((linha) => {
      const picks = picksPorLinha[linha.key] ?? [];
      const alvo = parseQtdeDigitada(linha.qtde);
      const soma = somaPicks(picks);
      const override =
        linha.preview.controla_lote && !mesmaAlocacao(linha.preview, picks);
      return { linha, picks, alvo, soma, override, ok: Math.abs(soma - alvo) < 1e-6 };
    });
  }, [linhas, picksPorLinha]);

  const setQtde = (key: string, loteId: number, qtde: string) => {
    setPicksPorLinha((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).map((p) => (p.lote_id === loteId ? { ...p, qtde } : p)),
    }));
  };

  const remover = (key: string, loteId: number) => {
    setPicksPorLinha((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((p) => p.lote_id !== loteId),
    }));
  };

  const incluirCandidato = (key: string, v: OpRetiradaVolume) => {
    if (!v.lote_id) return;
    setPicksPorLinha((prev) => {
      const atual = prev[key] ?? [];
      if (atual.some((p) => p.lote_id === v.lote_id)) return prev;
      const pick = volumeToPick(v, '');
      return pick ? { ...prev, [key]: [...atual, pick] } : prev;
    });
  };

  const confirmar = () => {
    for (const r of resumo) {
      if (r.linha.preview.controla_lote) {
        if (!r.ok) {
          setLocalErr(
            `A soma dos volumes de ${r.linha.label} deve ser ${formatDecimalBr(r.alvo, 4)} ${r.linha.unidade}.`,
          );
          return;
        }
        if (r.override && (motivos[r.linha.key] ?? '').trim().length < 3) {
          setLocalErr(
            `Informe o motivo (mínimo 3 caracteres) para trocar o volume sugerido em ${r.linha.label}.`,
          );
          return;
        }
      }
    }
    setLocalErr(null);
    onConfirm(
      resumo.map((r) => {
        const volumes = r.linha.preview.controla_lote
          ? r.picks
              .filter((p) => parseQtdeDigitada(p.qtde) > 0)
              .map((p) => ({ lote_id: p.lote_id, qtde: String(parseQtdeDigitada(p.qtde)) }))
          : undefined;
        return {
          key: r.linha.key,
          materialId: r.linha.materialId,
          produtoId: r.linha.produtoId,
          qtde: r.linha.qtde,
          complementar: r.linha.complementar,
          volumes,
          volumes_motivo: r.override ? motivos[r.linha.key]?.trim() : undefined,
        };
      }),
    );
  };

  return (
    <div className="op-retirada" role="region" aria-labelledby="op-retirada-title">
      <div className="op-retirada__head">
        <div>
          <h4 id="op-retirada-title">{titulo}</h4>
          <p className="muted">
            O sistema sugere FEFO (validade) e depois FIFO (entrada). Confira o local e a
            quantidade de cada volume antes de baixar o estoque.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
      </div>

      {resumo.map((r) => (
        <section key={r.linha.key} className="op-retirada__sku">
          <header>
            <strong>{r.linha.label}</strong>
            <span className="muted">
              Retirar {formatDecimalBr(r.alvo, 4)} {r.linha.unidade}
              {r.linha.preview.controla_lote
                ? ` · marcado ${formatDecimalBr(r.soma, 4)} ${r.linha.unidade}`
                : ' · sem controle de lote'}
            </span>
          </header>

          {r.linha.preview.controla_lote ? (
            <>
              {!r.linha.preview.suficiente ? (
                <p className="muted" style={{ color: 'var(--danger, #b42318)' }}>
                  Volumes insuficientes para a quantidade (falta{' '}
                  {formatDecimalBr(Number(r.linha.preview.qtde_faltante), 4)} {r.linha.unidade}
                  ). Abasteça o estoque.
                </p>
              ) : null}
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Volume</th>
                      <th>Local</th>
                      <th>L×C</th>
                      <th>Validade</th>
                      <th>No volume</th>
                      <th>Retirar</th>
                      <th className="acoes" />
                    </tr>
                  </thead>
                  <tbody>
                    {r.picks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="muted">
                          Nenhum volume na retirada. Inclua um volume abaixo ou cancele.
                        </td>
                      </tr>
                    ) : (
                      r.picks.map((p) => (
                        <tr
                          key={p.lote_id}
                          className={p.status === 'VENCIDO' ? 'is-vencido' : undefined}
                        >
                          <td>
                            <strong>{p.codigo}</strong>
                            {p.sugerido && p.ordem_politica ? (
                              <div className="muted" style={{ fontSize: '0.85em' }}>
                                {p.ordem_politica}º da política FEFO
                              </div>
                            ) : null}
                          </td>
                          <td>{p.endereco ?? 'Sem local'}</td>
                          <td>{dimLabel(p)}</td>
                          <td>
                            {p.status ? (
                              <StatusPill status={p.status_label || validadeStatusLabel(p.status)} />
                            ) : (
                              '—'
                            )}
                            {p.data_validade ? (
                              <div className="muted" style={{ fontSize: '0.85em' }}>
                                {formatDate(p.data_validade)}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            {formatDecimalBr(Number(p.qtde_volume), 4)} {p.unidade}
                          </td>
                          <td>
                            <input
                              className="op-retirada__qtde"
                              inputMode="decimal"
                              value={p.qtde}
                              disabled={busy}
                              onChange={(e) => setQtde(r.linha.key, p.lote_id, e.target.value)}
                              aria-label={`Quantidade do volume ${p.codigo}`}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={busy}
                              onClick={() => remover(r.linha.key, p.lote_id)}
                            >
                              Tirar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {r.linha.preview.candidatos.length > 0 ? (
                <details className="op-retirada__outros">
                  <summary>Outros volumes neste SKU</summary>
                  <ul>
                    {r.linha.preview.candidatos.map((c) => (
                      <li key={c.lote_id ?? c.codigo}>
                        <span>
                          <strong>{c.codigo}</strong>
                          {c.endereco ? ` · ${c.endereco.codigo}` : ' · sem local'}
                          {c.status_label ? ` · ${c.status_label}` : ''}
                          {' · '}
                          {formatDecimalBr(Number(c.qtde_volume ?? 0), 4)} {c.unidade}
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={busy || !c.lote_id}
                          onClick={() => incluirCandidato(r.linha.key, c)}
                        >
                          Incluir
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              {r.override ? (
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Motivo da troca de volume</label>
                  <input
                    value={motivos[r.linha.key] ?? ''}
                    onChange={(e) =>
                      setMotivos((prev) => ({ ...prev, [r.linha.key]: e.target.value }))
                    }
                    placeholder="Ex.: rolo já na máquina, largura, rasgo"
                    disabled={busy}
                    aria-label={`Motivo da troca em ${r.linha.label}`}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Este SKU baixa por quantidade (sem volume). A confirmação registra{' '}
              {formatDecimalBr(r.alvo, 4)} {r.linha.unidade}.
            </p>
          )}
        </section>
      ))}

      {localErr ? (
        <p className="muted" style={{ color: 'var(--danger, #b42318)', margin: '0.5rem 0 0' }}>
          {localErr}
        </p>
      ) : null}

      <div className="op-retirada__acoes">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || resumo.some((r) => r.linha.preview.controla_lote && !r.linha.preview.suficiente)}
          onClick={confirmar}
        >
          Confirmar retirada e baixar estoque
        </button>
      </div>
    </div>
  );
}

export function OpVolumesBaixados({
  volumes,
  unidade,
}: {
  volumes: OpRetiradaVolume[];
  unidade: string;
}) {
  if (volumes.length === 0) return null;
  return (
    <ul className="op-retirada__baixados">
      {volumes.map((v, i) => (
        <li key={`${v.lote_id ?? 'q'}-${v.movimento_id ?? i}`}>
          {v.codigo ? <strong>{v.codigo}</strong> : <strong>Quantidade</strong>}
          {v.endereco ? ` · ${v.endereco.codigo}` : ''}
          {v.status_label ? ` · ${v.status_label}` : ''}
          {' · '}
          {formatDecimalBr(Number(v.qtde_retirar), 4)} {v.unidade || unidade}
          {v.movimento_codigo ? ` · ${v.movimento_codigo}` : ''}
        </li>
      ))}
    </ul>
  );
}
