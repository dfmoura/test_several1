import { useCallback, useEffect, useMemo, useState } from 'react';
import { facasApi, getErrorMessage } from '../lib/api';
import {
  FacaShapeIcon,
  facaAspectFromRecord,
  formatoKind,
  formatoLabel,
} from './FacaShapeIcon';

export type FacaRecord = Record<string, unknown> & {
  id?: number;
  medida?: string;
  formato?: string;
  faca?: string;
  puxada?: number | null;
  z?: number | null;
  repeticao?: number | null;
  maquina_catalogo?: string;
  maquina_origem?: string;
  largura_faca?: number | null;
  completa?: boolean;
  cliente_nota?: string | null;
  fornecedor?: string | null;
  tamanho_tipo?: string;
  label?: string;
};

type Props = {
  value: FacaRecord | null;
  onChange: (faca: FacaRecord | null) => void;
  maquinasCatalogo?: string[];
};

function fmtNum(v: unknown, d = 2): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString('pt-BR', { maximumFractionDigits: d });
}

function maquinaLabel(codigo: string): string {
  const nomes: Record<string, string> = {
    BETA: 'BETA (Betaflex)',
    '160': '160 (Reflexo 160)',
    '250': '250 (Reflexo 250)',
    ETIRAMA: 'ETIRAMA',
    BATIDA: 'BATIDA',
    MODULAR: 'MODULAR (Modular SPX)',
  };
  return nomes[codigo] || codigo;
}

export function FacaPicker({ value, onChange, maquinasCatalogo = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [maquina, setMaquina] = useState('');
  const [formato, setFormato] = useState('');
  const [soCompletas, setSoCompletas] = useState(true);
  const [items, setItems] = useState<FacaRecord[]>([]);
  const [formatos, setFormatos] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const maquinas = useMemo(() => {
    if (maquinasCatalogo.length) return maquinasCatalogo;
    return ['BETA', '160', '250', 'ETIRAMA', 'BATIDA', 'MODULAR'];
  }, [maquinasCatalogo]);

  const load = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await facasApi.list({
        q: q || undefined,
        maquina: maquina || undefined,
        formato: formato || undefined,
        so_completas: soCompletas,
      });
      setItems(res.items as FacaRecord[]);
      setTotal(res.total);
      if (res.formatos?.length) setFormatos(res.formatos);
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [q, maquina, formato, soCompletas]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      load();
    }, q ? 220 : 0);
    return () => window.clearTimeout(t);
  }, [open, load, q]);

  useEffect(() => {
    // pré-carregar formatos (e lista inicial leve) uma vez
    facasApi
      .list({ so_completas: true })
      .then((res) => {
        if (res.formatos?.length) setFormatos(res.formatos);
      })
      .catch(() => undefined);
  }, []);

  function escolher(f: FacaRecord) {
    onChange(f);
    setOpen(false);
  }

  const incompleta = value != null && value.completa === false;
  const aspect = value ? facaAspectFromRecord(value) : undefined;

  return (
    <div className="faca-picker">
      <div className="faca-summary">
        <div className="faca-summary-main">
          <div className="faca-summary-top">
            <span className="faca-kicker">Faca do mapa oficial</span>
            <button type="button" className="btn sm faca-btn" onClick={() => setOpen(true)}>
              {value ? 'Trocar faca' : 'Buscar no mapa'}
            </button>
          </div>

          {value ? (
            <div className="faca-summary-body">
              <div className="faca-summary-visual" title={formatoLabel(value.formato || value.faca)}>
                <FacaShapeIcon
                  formato={String(value.formato || value.faca || '')}
                  aspect={aspect}
                  size={52}
                />
                <span className="faca-shape-caption">{formatoKind(String(value.formato || value.faca || ''))}</span>
              </div>
              <div className="faca-summary-text">
                <div className="faca-summary-title">
                  {String(value.tamanho_tipo) === 'diametro' ? (
                    <span className="badge-diam">{String(value.medida)}</span>
                  ) : (
                    String(value.medida || '—')
                  )}
                </div>
                <div className="faca-summary-meta">
                  {[
                    formatoLabel(value.formato || value.faca),
                    value.maquina_catalogo ? maquinaLabel(String(value.maquina_catalogo)) : null,
                    value.cliente_nota,
                    String(value.tamanho_tipo) === 'diametro' ? 'diâmetro (Ø)' : null,
                    value.completa === false ? 'puxada/Z manuais' : 'dados completos',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                <div className="faca-chips">
                  <div className="faca-chip">
                    <span>Z</span>
                    {fmtNum(value.z, 0)}
                  </div>
                  <div className="faca-chip">
                    <span>REP</span>
                    {fmtNum(value.repeticao, 4)}
                  </div>
                  <div className={`faca-chip${value.puxada == null ? ' warn' : ''}`}>
                    <span>Puxada</span>
                    {value.puxada != null ? `${fmtNum(value.puxada)} cm` : 'manual'}
                  </div>
                  <div className="faca-chip">
                    <span>Máq.</span>
                    {String(value.maquina_catalogo || '—')}
                  </div>
                  {value.largura_faca != null ? (
                    <div className="faca-chip">
                      <span>Larg. faca</span>
                      {fmtNum(value.largura_faca)} cm
                    </div>
                  ) : null}
                </div>
                {incompleta ? (
                  <p className="faca-warn">
                    Registro incompleto no mapa — preencha puxada (e Z se preciso) manualmente.
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="faca-summary-empty">
              <div className="faca-shape-strip" aria-hidden>
                {['RETA', 'REDONDA', 'OVAL', 'DESENHADA', 'ESPECIAL', 'LACRE'].map((f) => (
                  <div key={f} className="faca-shape-strip-item">
                    <FacaShapeIcon formato={f} size={28} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <p className="muted" style={{ margin: '0.65rem 0 0' }}>
                Abra o mapa para escolher medida, formato e máquina. Ícones mostram o desenho da faca.
              </p>
            </div>
          )}
        </div>
      </div>

      {open ? (
        <div className="faca-modal" role="dialog" aria-modal="true" aria-labelledby="faca-modal-title">
          <div className="faca-modal-backdrop" onClick={() => setOpen(false)} />
          <div className="faca-modal-panel">
            <header className="faca-modal-head">
              <div>
                <h2 id="faca-modal-title">Mapa de facas</h2>
                <p className="faca-modal-sub">
                  Fonte oficial · medida, formato, Z, REP e puxada vêm juntos. Clique na linha para
                  selecionar.
                </p>
              </div>
              <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>
                Fechar
              </button>
            </header>

            <div className="faca-filters">
              <label className="faca-busca-wrap">
                Buscar
                <input
                  type="search"
                  value={q}
                  autoFocus
                  placeholder="Medida, Ø, cliente, fornecedor…"
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
              <label>
                Máquina
                <select value={maquina} onChange={(e) => setMaquina(e.target.value)}>
                  <option value="">Todas</option>
                  {maquinas.map((m) => (
                    <option key={m} value={m}>
                      {maquinaLabel(m)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Formato
                <select value={formato} onChange={(e) => setFormato(e.target.value)}>
                  <option value="">Todos</option>
                  {formatos.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="faca-check">
                <input
                  type="checkbox"
                  checked={soCompletas}
                  onChange={(e) => setSoCompletas(e.target.checked)}
                />
                Só completas
              </label>
            </div>

            {formato ? (
              <div className="faca-formato-preview">
                <FacaShapeIcon formato={formato} size={40} />
                <div>
                  <strong>{formato}</strong>
                  <span className="muted"> · formato filtrado no mapa</span>
                </div>
              </div>
            ) : null}

            <p className="hint auto-note">
              {loading ? 'Carregando…' : `${total} faca(s)`}
              {erro ? ` · ${erro}` : ''}
            </p>

            <div className="faca-table-wrap">
              <table className="faca-table">
                <thead>
                  <tr>
                    <th>Formato</th>
                    <th>Medida</th>
                    <th>Máquina</th>
                    <th>Z</th>
                    <th>REP</th>
                    <th>Puxada</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {!items.length && !loading ? (
                    <tr>
                      <td colSpan={7} className="faca-empty">
                        Nenhuma faca neste filtro.
                      </td>
                    </tr>
                  ) : (
                    items.map((f) => {
                      const selected = value?.id != null && value.id === f.id;
                      const aspectRow = facaAspectFromRecord(f);
                      const fmt = String(f.formato || f.faca || '');
                      return (
                        <tr
                          key={String(f.id ?? f.label)}
                          className={`faca-row${selected ? ' selected' : ''}${
                            f.completa === false ? ' incompleta' : ''
                          }`}
                          onClick={() => escolher(f)}
                          title={String(f.label || '')}
                        >
                          <td>
                            <div className="faca-row-formato">
                              <FacaShapeIcon formato={fmt} aspect={aspectRow} size={32} />
                              <span>{formatoLabel(fmt)}</span>
                            </div>
                          </td>
                          <td className="medida">
                            {String(f.tamanho_tipo) === 'diametro' ? (
                              <span className="badge-diam">{String(f.medida)}</span>
                            ) : (
                              String(f.medida || '—')
                            )}
                          </td>
                          <td>{String(f.maquina_catalogo || '')}</td>
                          <td className="num">{f.z != null ? fmtNum(f.z, 0) : '—'}</td>
                          <td className="num">{f.repeticao != null ? fmtNum(f.repeticao, 4) : '—'}</td>
                          <td className="num">
                            {f.puxada != null ? (
                              fmtNum(f.puxada)
                            ) : (
                              <em className="warn-txt">manual</em>
                            )}
                          </td>
                          <td className="nota">{String(f.cliente_nota || f.fornecedor || '')}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
