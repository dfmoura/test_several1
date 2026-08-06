import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { ApiError, api, type OrcCatalogoResumo } from '../lib/api';

type TabId = 'papeis' | 'acabamentos' | 'trocas' | 'maquinas';

type PapelRow = {
  id: number;
  nome: string;
  preco_m2: number;
  ativo: boolean;
  ordem: number;
};

type AcabamentoRow = {
  id: number;
  nome: string;
  preco_m2: number;
  perda_m2: number;
  ativo: boolean;
  ordem: number;
  eh_rebobinacao?: boolean;
};

type TipoTrocaRow = {
  id: number;
  tipo: string;
  tempo_h: number;
  tempo_min: number;
  ativo: boolean;
  ordem: number;
};

type MaquinaRow = {
  id: number;
  nome: string;
  ativo: boolean;
  ordem: number;
  tarifas: Record<string, number>;
};

const TABS: Array<{ id: TabId; label: string; hint: string }> = [
  { id: 'papeis', label: 'Papel', hint: 'R$/m² usado no custo de material' },
  { id: 'acabamentos', label: 'Acabamento', hint: 'R$/m² + perda m²' },
  {
    id: 'trocas',
    label: 'Tipo troca produto',
    hint: 'Tempo de parada entre modelos',
  },
  {
    id: 'maquinas',
    label: 'Máquina (G10)',
    hint: 'Tabela HORA MÁQUINA — define R$/h',
  },
];

const CORES_PADRAO = ['0', '1', '2', '3', '4', '4V', '5', '6', '7', '8'];

function fieldErrors(err: unknown): string {
  if (err instanceof ApiError && err.details) {
    return Object.entries(err.details)
      .flatMap(([k, msgs]) => msgs.map((m) => `${k}: ${m}`))
      .join(' ');
  }
  return err instanceof Error ? err.message : 'Erro ao salvar.';
}

function num(v: string): number {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

export function OrcamentoCatalogoPage() {
  const [tab, setTab] = useState<TabId>('papeis');
  const [resumo, setResumo] = useState<OrcCatalogoResumo | null>(null);
  const [papeis, setPapeis] = useState<PapelRow[]>([]);
  const [acabamentos, setAcabamentos] = useState<AcabamentoRow[]>([]);
  const [trocas, setTrocas] = useState<TipoTrocaRow[]>([]);
  const [maquinas, setMaquinas] = useState<MaquinaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [r, p, a, t, m] = await Promise.all([
        api.get<{ data: OrcCatalogoResumo }>('/orcamento-catalogo/resumo'),
        api.get<{ data: PapelRow[] }>('/orcamento-catalogo/papeis'),
        api.get<{ data: AcabamentoRow[] }>('/orcamento-catalogo/acabamentos'),
        api.get<{ data: TipoTrocaRow[] }>('/orcamento-catalogo/tipos-troca'),
        api.get<{ data: MaquinaRow[] }>('/orcamento-catalogo/maquinas'),
      ]);
      setResumo(r.data);
      setPapeis(p.data);
      setAcabamentos(a.data);
      setTrocas(t.data);
      setMaquinas(m.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar catálogo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSeed = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.post('/orcamento-catalogo/seed', { force: false });
      setMessage('Itens ausentes importados do catálogo oficial (valores existentes preservados).');
      await load();
    } catch (e) {
      setError(fieldErrors(e));
    } finally {
      setSaving(false);
    }
  };

  const tabMeta = TABS.find((t) => t.id === tab)!;

  return (
    <>
      <PageHeader
        title="Catálogo do orçamento"
        description="Bases de cálculo amarradas ao motor (estudo 32). Alterações valem nos próximos cálculos; ORCs salvos mantêm snapshot."
        actions={
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving || loading}
              onClick={() => void handleSeed()}
            >
              Importar ausentes do oficial
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading}
              onClick={() => setShowNew(true)}
            >
              Novo item
            </button>
          </div>
        }
      />

      {message ? <div className="alert alert-success">{message}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      {resumo ? (
        <div className="card catalogo-resumo" style={{ marginBottom: '1rem' }}>
          <div className="card-body catalogo-resumo-grid">
            <div>
              <span>Fonte ativa</span>
              <strong>
                {resumo.fonte === 'database' ? 'Banco (editável)' : 'JSON (fallback)'}
              </strong>
            </div>
            <div>
              <span>Papéis</span>
              <strong>{resumo.papeis}</strong>
            </div>
            <div>
              <span>Acabamentos</span>
              <strong>{resumo.acabamentos}</strong>
            </div>
            <div>
              <span>Tipos troca</span>
              <strong>{resumo.tipos_troca}</strong>
            </div>
            <div>
              <span>Máquinas G10</span>
              <strong>{resumo.maquinas}</strong>
            </div>
          </div>
          <p className="catalogo-nota">{resumo.nota}</p>
        </div>
      ) : null}

      <div className="tabs tabs-catalogo" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className={`tab${tab === t.id ? ' active' : ''}`}
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setShowNew(false);
              setMessage('');
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="catalogo-tab-hint">{tabMeta.hint}</p>

      {loading ? (
        <p className="loading">Carregando…</p>
      ) : (
        <>
          {showNew ? (
            <NewItemForm
              tab={tab}
              onCancel={() => setShowNew(false)}
              onSaved={async (msg) => {
                setShowNew(false);
                setMessage(msg);
                await load();
              }}
              onError={setError}
            />
          ) : null}

          {tab === 'papeis' ? (
            <PapeisTable
              rows={papeis}
              onSaved={async (msg) => {
                setMessage(msg);
                await load();
              }}
              onError={setError}
            />
          ) : null}
          {tab === 'acabamentos' ? (
            <AcabamentosTable
              rows={acabamentos}
              onSaved={async (msg) => {
                setMessage(msg);
                await load();
              }}
              onError={setError}
            />
          ) : null}
          {tab === 'trocas' ? (
            <TrocasTable
              rows={trocas}
              onSaved={async (msg) => {
                setMessage(msg);
                await load();
              }}
              onError={setError}
            />
          ) : null}
          {tab === 'maquinas' ? (
            <MaquinasTable
              rows={maquinas}
              onSaved={async (msg) => {
                setMessage(msg);
                await load();
              }}
              onError={setError}
            />
          ) : null}
        </>
      )}
    </>
  );
}

function PapeisTable({
  rows,
  onSaved,
  onError,
}: {
  rows: PapelRow[];
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  return (
    <div className="card">
      <div className="table-wrap">
        {rows.length === 0 ? (
          <div className="empty-state">Nenhum papel cadastrado. Use “Importar ausentes do oficial”.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>R$/m²</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <PapelEditRow key={row.id} row={row} onSaved={onSaved} onError={onError} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PapelEditRow({
  row,
  onSaved,
  onError,
}: {
  row: PapelRow;
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [preco, setPreco] = useState(String(row.preco_m2));
  const [saving, setSaving] = useState(false);
  useEffect(() => setPreco(String(row.preco_m2)), [row.preco_m2]);

  const save = async (patch: Partial<{ preco_m2: number; ativo: boolean }>) => {
    setSaving(true);
    onError('');
    try {
      await api.put(`/orcamento-catalogo/papeis/${row.id}`, patch);
      await onSaved(`Papel “${row.nome}” atualizado.`);
    } catch (e) {
      onError(fieldErrors(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className={row.ativo ? undefined : 'row-inactive'}>
      <td>
        <strong>{row.nome}</strong>
      </td>
      <td>
        <input
          type="number"
          step="0.0001"
          min="0"
          className="input-compact"
          value={preco}
          disabled={saving}
          onChange={(e) => setPreco(e.target.value)}
        />
      </td>
      <td>
        <StatusPill status={row.ativo ? 'ATIVO' : 'INATIVO'} />
      </td>
      <td>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={saving || num(preco) === row.preco_m2 || Number.isNaN(num(preco))}
            onClick={() => void save({ preco_m2: num(preco) })}
          >
            Salvar
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={saving}
            onClick={() => void save({ ativo: !row.ativo })}
          >
            {row.ativo ? 'Inativar' : 'Reativar'}
          </button>
        </div>
      </td>
    </tr>
  );
}

function AcabamentosTable({
  rows,
  onSaved,
  onError,
}: {
  rows: AcabamentoRow[];
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  return (
    <div className="card">
      <div className="table-wrap">
        {rows.length === 0 ? (
          <div className="empty-state">Nenhum acabamento cadastrado.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>R$/m²</th>
                <th>Perda m²</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <AcabamentoEditRow key={row.id} row={row} onSaved={onSaved} onError={onError} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AcabamentoEditRow({
  row,
  onSaved,
  onError,
}: {
  row: AcabamentoRow;
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [preco, setPreco] = useState(String(row.preco_m2));
  const [perda, setPerda] = useState(String(row.perda_m2));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setPreco(String(row.preco_m2));
    setPerda(String(row.perda_m2));
  }, [row.preco_m2, row.perda_m2]);

  const dirty = num(preco) !== row.preco_m2 || num(perda) !== row.perda_m2;

  const save = async (patch: Partial<{ preco_m2: number; perda_m2: number; ativo: boolean }>) => {
    setSaving(true);
    onError('');
    try {
      await api.put(`/orcamento-catalogo/acabamentos/${row.id}`, patch);
      await onSaved(`Acabamento “${row.nome}” atualizado.`);
    } catch (e) {
      onError(fieldErrors(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className={row.ativo ? undefined : 'row-inactive'}>
      <td>
        <strong>{row.nome}</strong>
        {row.eh_rebobinacao ? (
          <span className="field-note" style={{ display: 'block' }}>
            Uso interno de rebobinação — oculto no select do ORC
          </span>
        ) : null}
      </td>
      <td>
        <input
          type="number"
          step="0.0001"
          min="0"
          className="input-compact"
          value={preco}
          disabled={saving}
          onChange={(e) => setPreco(e.target.value)}
        />
      </td>
      <td>
        <input
          type="number"
          step="0.0001"
          min="0"
          className="input-compact"
          value={perda}
          disabled={saving}
          onChange={(e) => setPerda(e.target.value)}
        />
      </td>
      <td>
        <StatusPill status={row.ativo ? 'ATIVO' : 'INATIVO'} />
      </td>
      <td>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={saving || !dirty || Number.isNaN(num(preco)) || Number.isNaN(num(perda))}
            onClick={() => void save({ preco_m2: num(preco), perda_m2: num(perda) })}
          >
            Salvar
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={saving}
            onClick={() => void save({ ativo: !row.ativo })}
          >
            {row.ativo ? 'Inativar' : 'Reativar'}
          </button>
        </div>
      </td>
    </tr>
  );
}

function TrocasTable({
  rows,
  onSaved,
  onError,
}: {
  rows: TipoTrocaRow[];
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  return (
    <div className="card">
      <div className="table-wrap">
        {rows.length === 0 ? (
          <div className="empty-state">Nenhum tipo de troca cadastrado.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Minutos</th>
                <th>Horas (motor)</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <TrocaEditRow key={row.id} row={row} onSaved={onSaved} onError={onError} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TrocaEditRow({
  row,
  onSaved,
  onError,
}: {
  row: TipoTrocaRow;
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [min, setMin] = useState(String(row.tempo_min));
  const [saving, setSaving] = useState(false);
  useEffect(() => setMin(String(row.tempo_min)), [row.tempo_min]);

  const save = async (patch: Partial<{ tempo_min: number; ativo: boolean }>) => {
    setSaving(true);
    onError('');
    try {
      await api.put(`/orcamento-catalogo/tipos-troca/${row.id}`, patch);
      await onSaved(`Tipo troca “${row.tipo}” atualizado.`);
    } catch (e) {
      onError(fieldErrors(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className={row.ativo ? undefined : 'row-inactive'}>
      <td>
        <strong>{row.tipo}</strong>
      </td>
      <td>
        <input
          type="number"
          step="0.01"
          min="0"
          className="input-compact"
          value={min}
          disabled={saving}
          onChange={(e) => setMin(e.target.value)}
        />
      </td>
      <td>
        <span className="mono-soft">{row.tempo_h.toFixed(4)} h</span>
      </td>
      <td>
        <StatusPill status={row.ativo ? 'ATIVO' : 'INATIVO'} />
      </td>
      <td>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={saving || num(min) === row.tempo_min || Number.isNaN(num(min))}
            onClick={() => void save({ tempo_min: num(min) })}
          >
            Salvar
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={saving}
            onClick={() => void save({ ativo: !row.ativo })}
          >
            {row.ativo ? 'Inativar' : 'Reativar'}
          </button>
        </div>
      </td>
    </tr>
  );
}

function MaquinasTable({
  rows,
  onSaved,
  onError,
}: {
  rows: MaquinaRow[];
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const coresCols = useMemo(() => {
    const set = new Set<string>(CORES_PADRAO);
    for (const m of rows) {
      Object.keys(m.tarifas).forEach((c) => set.add(c));
    }
    return Array.from(set).sort((a, b) => {
      const ia = CORES_PADRAO.indexOf(a);
      const ib = CORES_PADRAO.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.localeCompare(b, 'pt-BR', { numeric: true });
    });
  }, [rows]);

  return (
    <div className="card">
      <div className="table-wrap table-wrap-scroll">
        {rows.length === 0 ? (
          <div className="empty-state">Nenhuma máquina G10 cadastrada.</div>
        ) : (
          <table className="data-table data-table-tarifas">
            <thead>
              <tr>
                <th>Máquina</th>
                {coresCols.map((c) => (
                  <th key={c} title={`Cores ${c}`}>
                    {c}c
                  </th>
                ))}
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <MaquinaEditRow
                  key={row.id}
                  row={row}
                  coresCols={coresCols}
                  onSaved={onSaved}
                  onError={onError}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MaquinaEditRow({
  row,
  coresCols,
  onSaved,
  onError,
}: {
  row: MaquinaRow;
  coresCols: string[];
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [tarifas, setTarifas] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const c of coresCols) {
      o[c] = row.tarifas[c] != null ? String(row.tarifas[c]) : '';
    }
    return o;
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const o: Record<string, string> = {};
    for (const c of coresCols) {
      o[c] = row.tarifas[c] != null ? String(row.tarifas[c]) : '';
    }
    setTarifas(o);
  }, [row, coresCols]);

  const buildTarifas = (): Record<string, number> | null => {
    const out: Record<string, number> = {};
    for (const [c, v] of Object.entries(tarifas)) {
      if (v.trim() === '') continue;
      const n = num(v);
      if (Number.isNaN(n)) return null;
      out[c] = n;
    }
    return out;
  };

  const dirty = useMemo(() => {
    const built = buildTarifas();
    if (!built) return false;
    const keys = new Set([...Object.keys(built), ...Object.keys(row.tarifas)]);
    for (const k of keys) {
      if ((built[k] ?? null) !== (row.tarifas[k] ?? null)) return true;
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarifas, row.tarifas]);

  const save = async (patch: { tarifas?: Record<string, number>; ativo?: boolean }) => {
    setSaving(true);
    onError('');
    try {
      await api.put(`/orcamento-catalogo/maquinas/${row.id}`, patch);
      await onSaved(`Máquina “${row.nome}” atualizada.`);
    } catch (e) {
      onError(fieldErrors(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className={row.ativo ? undefined : 'row-inactive'}>
      <td>
        <strong>{row.nome}</strong>
      </td>
      {coresCols.map((c) => (
        <td key={c}>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-compact input-tarifa"
            value={tarifas[c] ?? ''}
            disabled={saving}
            placeholder="—"
            onChange={(e) => setTarifas((prev) => ({ ...prev, [c]: e.target.value }))}
          />
        </td>
      ))}
      <td>
        <StatusPill status={row.ativo ? 'ATIVO' : 'INATIVO'} />
      </td>
      <td>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={saving || !dirty || buildTarifas() === null}
            onClick={() => {
              const t = buildTarifas();
              if (t) void save({ tarifas: t });
            }}
          >
            Salvar
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={saving}
            onClick={() => void save({ ativo: !row.ativo })}
          >
            {row.ativo ? 'Inativar' : 'Reativar'}
          </button>
        </div>
      </td>
    </tr>
  );
}

function NewItemForm({
  tab,
  onCancel,
  onSaved,
  onError,
}: {
  tab: TabId;
  onCancel: () => void;
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [perda, setPerda] = useState('0');
  const [tempoMin, setTempoMin] = useState('0');
  const [saving, setSaving] = useState(false);

  const title =
    tab === 'papeis'
      ? 'Novo papel'
      : tab === 'acabamentos'
        ? 'Novo acabamento'
        : tab === 'trocas'
          ? 'Novo tipo de troca'
          : 'Nova máquina (G10)';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onError('');
    try {
      if (tab === 'papeis') {
        await api.post('/orcamento-catalogo/papeis', {
          nome: nome.trim(),
          preco_m2: num(preco),
        });
        await onSaved(`Papel “${nome.trim()}” criado.`);
      } else if (tab === 'acabamentos') {
        await api.post('/orcamento-catalogo/acabamentos', {
          nome: nome.trim(),
          preco_m2: num(preco),
          perda_m2: num(perda),
        });
        await onSaved(`Acabamento “${nome.trim()}” criado.`);
      } else if (tab === 'trocas') {
        await api.post('/orcamento-catalogo/tipos-troca', {
          tipo: nome.trim(),
          tempo_min: num(tempoMin),
        });
        await onSaved(`Tipo troca “${nome.trim()}” criado.`);
      } else {
        await api.post('/orcamento-catalogo/maquinas', {
          nome: nome.trim().toUpperCase(),
          tarifas: {},
        });
        await onSaved(`Máquina “${nome.trim().toUpperCase()}” criada — preencha as tarifas G10.`);
      }
    } catch (err) {
      onError(fieldErrors(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <h2 style={{ fontSize: '1.05rem', marginTop: 0, color: 'var(--navy)' }}>{title}</h2>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="form-grid">
            <div className="form-group span-2">
              <label>{tab === 'trocas' ? 'Tipo *' : 'Nome *'}</label>
              <input
                value={nome}
                required
                minLength={tab === 'maquinas' ? 1 : 2}
                onChange={(e) => setNome(e.target.value)}
                placeholder={tab === 'maquinas' ? 'ex: BETA' : 'ex: BOPP BRILHO'}
              />
            </div>
            {tab === 'papeis' || tab === 'acabamentos' ? (
              <div className="form-group">
                <label>R$/m² *</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  required
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                />
              </div>
            ) : null}
            {tab === 'acabamentos' ? (
              <div className="form-group">
                <label>Perda m²</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={perda}
                  onChange={(e) => setPerda(e.target.value)}
                />
              </div>
            ) : null}
            {tab === 'trocas' ? (
              <div className="form-group">
                <label>Tempo (minutos) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={tempoMin}
                  onChange={(e) => setTempoMin(e.target.value)}
                />
              </div>
            ) : null}
          </div>
          <div className="btn-row" style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando…' : 'Criar'}
            </button>
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
