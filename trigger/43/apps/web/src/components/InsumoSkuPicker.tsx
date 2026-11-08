import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../lib/api';
import type { InsumoSkuOpcao, InsumoSlot } from './InsumoSkuCombobox';

type Props = {
  slot: Extract<InsumoSlot, 'papel' | 'acabamento'>;
  label: string;
  value: InsumoSkuOpcao | null;
  onChange: (sku: InsumoSkuOpcao | null) => void;
  disabled?: boolean;
  hint?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

const TITULO: Record<'papel' | 'acabamento', string> = {
  papel: 'Escolher papel',
  acabamento: 'Escolher acabamento',
};

const SUB: Record<'papel' | 'acabamento', string> = {
  papel: 'SKU ativo de papel ou filme (MP-PAP, MP-FLM). Saldo é informativo — o ORC não exige estoque.',
  acabamento:
    'SKU ativo de laminação ou cold (MP-LAM, MP-CLD). Saldo é informativo — o ORC não exige estoque.',
};

const VAZIO: Record<'papel' | 'acabamento', string> = {
  papel: 'Nenhum papel ou filme ativo neste cadastro.',
  acabamento: 'Nenhuma laminação ou cold ativa neste cadastro.',
};

async function buscar(
  slot: 'papel' | 'acabamento',
  q: string,
  incluirId: number | null,
): Promise<InsumoSkuOpcao[]> {
  const qs = new URLSearchParams({ slot });
  if (q.trim()) qs.set('q', q.trim());
  if (incluirId && incluirId > 0) qs.set('incluir_id', String(incluirId));
  const res = await api.get<{ data: InsumoSkuOpcao[] }>(`/orcamentos/insumos?${qs}`);
  return res.data ?? [];
}

function rotulo(opt: InsumoSkuOpcao): string {
  if (opt.codigo) return `${opt.codigo} — ${opt.descricao}`;
  return opt.descricao;
}

function temSaldo(saldo: string): boolean {
  const n = Number(String(saldo).replace(',', '.'));
  return Number.isFinite(n) && n > 0;
}

/**
 * Overlay de escolha de papel/acabamento no ORC — mesmo padrão visual do mapa de facas.
 * Lista o cadastro ativo; saldo aparece como meta, sem filtrar a oferta.
 */
export function InsumoSkuPicker({
  slot,
  label,
  value,
  onChange,
  disabled = false,
  hint,
  allowEmpty = false,
  emptyLabel = 'Sem filme',
}: Props) {
  const titleId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<InsumoSkuOpcao[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<number | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const rows = await buscar(slot, q, value && value.id > 0 ? value.id : null);
        setOptions(rows);
        setHighlight(0);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [slot, value],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 40);
    const onDocKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', onDocKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onDocKey);
    };
  }, [open]);

  const abrir = () => {
    if (disabled) return;
    setQuery('');
    setOpen(true);
    void runSearch('');
  };

  const fechar = () => {
    setOpen(false);
    setQuery('');
  };

  const scheduleSearch = (q: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void runSearch(q);
    }, 280);
  };

  const selectOption = (sku: InsumoSkuOpcao) => {
    onChange(sku);
    fechar();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(options.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) selectOption(opt);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      fechar();
    }
  };

  const modal = open ? (
    <div className="faca-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="faca-modal-backdrop" onClick={fechar} />
      <div className="faca-modal-panel insumo-sku-picker-panel">
        <header className="faca-modal-head">
          <div>
            <h2 id={titleId}>{TITULO[slot]}</h2>
            <p className="faca-modal-sub">{SUB[slot]}</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fechar}>
            Fechar
          </button>
        </header>

        <div className="faca-filters insumo-sku-picker-filters">
          <label className="faca-filter-field faca-busca-wrap">
            <span>Buscar</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Código ou descrição…"
              autoComplete="off"
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                scheduleSearch(next);
              }}
              onKeyDown={onKeyDown}
            />
          </label>
        </div>

        <div className="faca-toolbar">
          <p className="hint auto-note">
            {loading ? 'Carregando…' : `${options.length} material(is)`}
          </p>
          {allowEmpty ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                onChange(null);
                fechar();
              }}
            >
              {emptyLabel}
            </button>
          ) : null}
        </div>

        <div className="faca-table-wrap">
          <table className="faca-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Grupo</th>
                <th className="num">Saldo</th>
                <th>Tarifa</th>
              </tr>
            </thead>
            <tbody>
              {!loading && options.length === 0 ? (
                <tr>
                  <td colSpan={5} className="nota">
                    {VAZIO[slot]}
                  </td>
                </tr>
              ) : null}
              {options.map((opt, idx) => {
                const selected = value != null && value.id === opt.id;
                const ativo = highlight === idx;
                const saldoOk = temSaldo(opt.saldo);
                return (
                  <tr
                    key={opt.id}
                    className={`faca-row${selected ? ' selected' : ''}${ativo ? ' is-active' : ''}`}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => selectOption(opt)}
                  >
                    <td>
                      <strong>{opt.codigo}</strong>
                    </td>
                    <td>{opt.descricao}</td>
                    <td>{opt.grupo || '—'}</td>
                    <td className="num">
                      <span className={saldoOk ? 'insumo-sku-saldo is-ok' : 'insumo-sku-saldo is-zero'}>
                        {opt.saldo} {opt.unidade}
                      </span>
                    </td>
                    <td>{opt.tarifa || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="insumo-sku-picker">
      <label>{label}</label>
      <div className={`insumo-sku-picker-summary${disabled ? ' is-disabled' : ''}`}>
        <button
          type="button"
          className="insumo-sku-picker-trigger"
          disabled={disabled}
          onClick={abrir}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          {value && value.id > 0 ? (
            <span className="insumo-sku-picker-valor">
              <span className="insumo-sku-picker-codigo">{value.codigo}</span>
              <span className="insumo-sku-picker-desc">{value.descricao || rotulo(value)}</span>
            </span>
          ) : (
            <span className="insumo-sku-picker-placeholder">Escolher no cadastro…</span>
          )}
        </button>
        <div className="insumo-sku-picker-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={disabled}
            onClick={abrir}
          >
            {value && value.id > 0 ? 'Trocar' : 'Buscar'}
          </button>
        </div>
      </div>
      {hint || (allowEmpty && value && value.id > 0) ? (
        <p className="field-note">
          {hint ? <span>{hint}</span> : null}
          {allowEmpty && value && value.id > 0 ? (
            <>
              {hint ? ' ' : null}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={disabled}
                onClick={() => onChange(null)}
              >
                {emptyLabel}
              </button>
            </>
          ) : null}
        </p>
      ) : null}
      {modal}
    </div>
  );
}
