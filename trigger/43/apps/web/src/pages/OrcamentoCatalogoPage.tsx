import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { ApiError, api, type AtivacaoData, type OrcCatalogoResumo } from '../lib/api';
import { useAuth } from '../lib/auth';
import { bemStatusLabel } from '../lib/patrimonio';
import { formatKgFaixa } from '../lib/orcamentoFrete';
import { useTableSort } from '../lib/useTableSort';

type TabId = 'papeis' | 'acabamentos' | 'trocas' | 'maquinas' | 'matriz' | 'frete';

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
  bens_vinculados?: Array<{
    id: number;
    codigo: string;
    descricao: string;
    status: string;
  }>;
};

type ParametroRow = {
  id: number;
  chave: string;
  valor: number;
  rotulo: string;
  unidade: string | null;
  ativo: boolean;
  ordem: number;
};

type FaixaFreteRow = {
  id: number;
  kg_ate: string | null;
  preco_por_km: string | null;
  minimo_rs: string | null;
  ativo: boolean;
  ordem: number;
  acima: boolean;
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
    label: 'Hora-máquina',
    hint: 'Tarifas R$/h · a máquina física cadastra-se no Patrimônio',
  },
  {
    id: 'matriz',
    label: 'Matriz (clichê)',
    hint: 'R$/cm² vigente · só no 1º pedido',
  },
  {
    id: 'frete',
    label: 'Frete',
    hint: 'Faixas de kg com R$/km · peso estimado da caixa',
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
  const { hasPermission } = useAuth();
  const canSeePatrimonio = hasPermission('patrimonio.ler');
  const canWritePatrimonio = hasPermission('patrimonio.escrever');
  const [tab, setTab] = useState<TabId>('papeis');
  const [resumo, setResumo] = useState<OrcCatalogoResumo | null>(null);
  const [papeis, setPapeis] = useState<PapelRow[]>([]);
  const [acabamentos, setAcabamentos] = useState<AcabamentoRow[]>([]);
  const [trocas, setTrocas] = useState<TipoTrocaRow[]>([]);
  const [maquinas, setMaquinas] = useState<MaquinaRow[]>([]);
  const [parametros, setParametros] = useState<ParametroRow[]>([]);
  const [faixasFrete, setFaixasFrete] = useState<FaixaFreteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [ativacao, setAtivacao] = useState<AtivacaoData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [r, p, a, t, m, params, ff, at] = await Promise.all([
        api.get<{ data: OrcCatalogoResumo }>('/orcamento-catalogo/resumo'),
        api.get<{ data: PapelRow[] }>('/orcamento-catalogo/papeis'),
        api.get<{ data: AcabamentoRow[] }>('/orcamento-catalogo/acabamentos'),
        api.get<{ data: TipoTrocaRow[] }>('/orcamento-catalogo/tipos-troca'),
        api.get<{ data: MaquinaRow[] }>('/orcamento-catalogo/maquinas'),
        api.get<{ data: ParametroRow[] }>('/orcamento-catalogo/parametros'),
        api.get<{ data: FaixaFreteRow[] }>('/orcamento-catalogo/faixas-frete'),
        api.get<{ data: AtivacaoData }>('/ativacao').catch(() => null),
      ]);
      setResumo(r.data);
      setPapeis(p.data);
      setAcabamentos(a.data);
      setTrocas(t.data);
      setMaquinas(m.data);
      setParametros(params.data);
      setFaixasFrete(ff.data);
      setAtivacao(at?.data ?? null);
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
      setMessage('Itens ausentes completados com o modelo inicial (valores existentes preservados).');
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
        description="Preços e bases desta empresa. O modelo inicial vale até você conferir; orçamentos já salvos mantêm o que foi usado na época."
        actions={
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving || loading}
              onClick={() => void handleSeed()}
            >
              Completar itens ausentes
            </button>
            {tab !== 'matriz' && tab !== 'maquinas' ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading}
                onClick={() => setShowNew(true)}
              >
                Novo item
              </button>
            ) : null}
            {tab === 'maquinas' && canWritePatrimonio ? (
              <Link to="/patrimonio/novo" className="btn btn-primary">
                Cadastrar máquina no patrimônio
              </Link>
            ) : null}
          </div>
        }
      />

      {message ? <div className="alert alert-success">{message}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      {ativacao?.origem === 'self_service' &&
      ativacao.passos.some((p) => p.id === 'catalogo' && !p.feito) ? (
        <div className="alert alert-warning ativacao-catalogo" role="status">
          <div>
            <strong>Modelo inicial desta empresa.</strong>
            <p>
              Papel, hora-máquina e facas já estão no catálogo para você orçar. Confira os preços —
              eles são desta empresa, não de outra conta.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => {
              setSaving(true);
              setError('');
              void api
                .post<{ data: AtivacaoData }>('/ativacao/catalogo/conferir')
                .then((res) => {
                  setAtivacao(res.data);
                  setMessage('Catálogo conferido. Os próximos orçamentos usam estes preços.');
                })
                .catch((e) => setError(fieldErrors(e)))
                .finally(() => setSaving(false));
            }}
          >
            Estes são os meus preços
          </button>
        </div>
      ) : null}

      {resumo ? (
        <div className="card catalogo-resumo" style={{ marginBottom: '1rem' }}>
          <div className="card-body catalogo-resumo-grid">
            <div>
              <span>Preços</span>
              <strong>
                {resumo.fonte === 'database' ? 'Desta empresa' : 'Modelo inicial'}
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
              <span>Máquinas</span>
              <strong>{resumo.maquinas}</strong>
            </div>
            <div>
              <span>Matriz (R$/cm²)</span>
              <strong>
                {resumo.matriz_cm2 != null
                  ? Number(resumo.matriz_cm2).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })
                  : '—'}
              </strong>
            </div>
            <div>
              <span>Faixas de frete</span>
              <strong>{resumo.faixas_frete ?? 0}</strong>
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
          {showNew && tab !== 'matriz' && tab !== 'maquinas' ? (
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
              canSeePatrimonio={canSeePatrimonio}
              canWritePatrimonio={canWritePatrimonio}
              onSaved={async (msg) => {
                setMessage(msg);
                await load();
              }}
              onError={setError}
            />
          ) : null}
          {tab === 'matriz' ? (
            <MatrizParametrosPanel
              rows={parametros}
              resumo={resumo}
              onSaved={async (msg) => {
                setMessage(msg);
                await load();
              }}
              onError={setError}
            />
          ) : null}
          {tab === 'frete' ? (
            <FreteCatalogoPanel
              faixas={faixasFrete}
              parametros={parametros}
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

const PAPEL_SORT = {
  nome: (row: PapelRow) => row.nome,
  preco_m2: (row: PapelRow) => Number(row.preco_m2),
  status: (row: PapelRow) => (row.ativo ? 'ATIVO' : 'INATIVO'),
};

function MatrizParametrosPanel({
  rows,
  resumo,
  onSaved,
  onError,
}: {
  rows: ParametroRow[];
  resumo: OrcCatalogoResumo | null;
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const matriz = rows.find((r) => r.chave === 'matriz_cm2') ?? null;
  const [valor, setValor] = useState(
    matriz != null ? String(matriz.valor) : resumo?.matriz_cm2 != null ? String(resumo.matriz_cm2) : '0.28',
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (matriz) {
      setValor(String(matriz.valor));
    } else if (resumo?.matriz_cm2 != null) {
      setValor(String(resumo.matriz_cm2));
    }
  }, [matriz, resumo?.matriz_cm2]);

  const dirty = matriz != null && Number(valor.replace(',', '.')) !== Number(matriz.valor);

  const save = async () => {
    if (!matriz) {
      onError('Tarifa de matriz ainda não criada. Use “Completar itens ausentes”.');
      return;
    }
    const n = num(valor);
    if (!Number.isFinite(n) || n < 0) {
      onError('Informe um R$/cm² válido (≥ 0).');
      return;
    }
    setSaving(true);
    onError('');
    try {
      await api.put(`/orcamento-catalogo/parametros/${matriz.chave}`, { valor: n });
      await onSaved(`Matriz atualizada para R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}/cm².`);
    } catch (e) {
      onError(fieldErrors(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-body" style={{ display: 'grid', gap: '1rem', maxWidth: '32rem' }}>
        <p className="catalogo-nota" style={{ margin: 0 }}>
          Fórmula: ((Z × 3,175 ÷ 10) + 4) × (largura × colunas + 4) × cores × R$/cm², depois
          arredonda para cima em R$ 1. Cobrado só no 1º pedido (chave ainda não paga).
        </p>
        {!matriz ? (
          <div className="empty-state">
            Nenhuma tarifa de matriz ainda. Use “Completar itens ausentes”.
          </div>
        ) : (
          <>
            <div className="form-group">
              <label>
                {matriz.rotulo} ({matriz.unidade ?? 'R$/cm²'}) *
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                disabled={saving || !matriz.ativo}
              />
              <span className="field-note">
                {resumo?.matriz_cm2_fonte === 'database'
                  ? 'Tarifa desta empresa'
                  : 'Modelo inicial — edite e salve para gravar nesta empresa'}
                {!matriz.ativo ? ' · inativa (orçamentos usam o modelo padrão)' : ''}
              </span>
            </div>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || !dirty || !matriz.ativo}
                onClick={() => void save()}
              >
                {saving ? 'Salvando…' : 'Salvar tarifa'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => {
                  void (async () => {
                    setSaving(true);
                    onError('');
                    try {
                      await api.put(`/orcamento-catalogo/parametros/${matriz.chave}`, {
                        ativo: !matriz.ativo,
                      });
                      await onSaved(
                        matriz.ativo
                          ? 'Matriz inativada — orçamentos voltam ao modelo padrão até reativar.'
                          : 'Matriz reativada no catálogo.',
                      );
                    } catch (e) {
                      onError(fieldErrors(e));
                    } finally {
                      setSaving(false);
                    }
                  })();
                }}
              >
                {matriz.ativo ? 'Inativar' : 'Reativar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FreteCatalogoPanel({
  faixas,
  parametros,
  onSaved,
  onError,
}: {
  faixas: FaixaFreteRow[];
  parametros: ParametroRow[];
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const peso = parametros.find((r) => r.chave === 'peso_caixa_kg') ?? null;
  const [pesoVal, setPesoVal] = useState(peso != null ? String(peso.valor) : '');
  const [savingPeso, setSavingPeso] = useState(false);

  useEffect(() => {
    setPesoVal(peso != null ? String(peso.valor) : '');
  }, [peso]);

  const savePeso = async () => {
    if (!peso) {
      onError('Peso da caixa ainda não criado. Use “Completar itens ausentes”.');
      return;
    }
    const n = num(pesoVal);
    if (!Number.isFinite(n) || n < 0) {
      onError('Informe o peso estimado da caixa em kg (≥ 0).');
      return;
    }
    setSavingPeso(true);
    onError('');
    try {
      await api.put(`/orcamento-catalogo/parametros/${peso.chave}`, {
        valor: n,
        ativo: n > 0,
      });
      await onSaved(
        n > 0
          ? `Peso da caixa atualizado para ${n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg.`
          : 'Peso da caixa zerado — Entregar não soma frete até cadastrar um peso.',
      );
    } catch (e) {
      onError(fieldErrors(e));
    } finally {
      setSavingPeso(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="card">
        <div className="card-body" style={{ display: 'grid', gap: '0.85rem', maxWidth: '36rem' }}>
          <p className="catalogo-nota" style={{ margin: 0 }}>
            Carga estimada no ORC = caixas da faixa × este peso. Sem campo livre de kg no wizard.
            R$ vazio = sob consulta (não inventa). Seed vem inativo até o comercial preencher.
          </p>
          {!peso ? (
            <div className="empty-state">
              Peso da caixa ainda não criado. Use “Completar itens ausentes”.
            </div>
          ) : (
            <div className="form-grid">
              <div className="form-group">
                <label>
                  {peso.rotulo} ({peso.unidade ?? 'kg'})
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={pesoVal}
                  disabled={savingPeso}
                  onChange={(e) => setPesoVal(e.target.value)}
                />
                <span className="field-note">
                  {peso.ativo && Number(peso.valor) > 0
                    ? 'Vigente nos novos ORCs'
                    : 'Inativo ou vazio — Entregar não soma até gravar um peso maior que zero'}
                </span>
              </div>
              <div className="form-group" style={{ alignSelf: 'end' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={savingPeso || num(pesoVal) === Number(peso.valor)}
                  onClick={() => void savePeso()}
                >
                  {savingPeso ? 'Salvando…' : 'Salvar peso'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <FaixasFreteTable rows={faixas} onSaved={onSaved} onError={onError} />
    </div>
  );
}

const FRETE_SORT = {
  kg_ate: (row: FaixaFreteRow) => (row.acima ? Number.POSITIVE_INFINITY : Number(row.kg_ate) || 0),
  preco: (row: FaixaFreteRow) => (row.preco_por_km != null ? Number(row.preco_por_km) : -1),
  minimo: (row: FaixaFreteRow) => (row.minimo_rs != null ? Number(row.minimo_rs) : -1),
  status: (row: FaixaFreteRow) => (row.ativo ? 'ATIVO' : 'INATIVO'),
};

function FaixasFreteTable({
  rows,
  onSaved,
  onError,
}: {
  rows: FaixaFreteRow[];
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, FRETE_SORT);

  return (
    <div className="card">
      <div className="table-wrap">
        {rows.length === 0 ? (
          <div className="empty-state">
            Nenhuma faixa de frete. Use “Completar itens ausentes” ou “Novo item”.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh column="kg_ate" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Faixa
                </SortableTh>
                <SortableTh column="preco" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  R$/km
                </SortableTh>
                <SortableTh column="minimo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Mínimo R$
                </SortableTh>
                <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Status
                </SortableTh>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <FaixaFreteEditRow key={row.id} row={row} onSaved={onSaved} onError={onError} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FaixaFreteEditRow({
  row,
  onSaved,
  onError,
}: {
  row: FaixaFreteRow;
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [preco, setPreco] = useState(row.preco_por_km ?? '');
  const [minimo, setMinimo] = useState(row.minimo_rs ?? '');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setPreco(row.preco_por_km ?? '');
    setMinimo(row.minimo_rs ?? '');
  }, [row.preco_por_km, row.minimo_rs]);

  const dirty =
    (preco.trim() || '') !== (row.preco_por_km ?? '') ||
    (minimo.trim() || '') !== (row.minimo_rs ?? '');

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    onError('');
    try {
      await api.put(`/orcamento-catalogo/faixas-frete/${row.id}`, patch);
      await onSaved(`Faixa “${formatKgFaixa(row.kg_ate, row.acima)}” atualizada.`);
    } catch (e) {
      onError(fieldErrors(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className={row.ativo ? undefined : 'row-inactive'}>
      <td>
        <strong>{formatKgFaixa(row.kg_ate, row.acima)}</strong>
        {row.acima ? (
          <span className="field-note" style={{ display: 'block' }}>
            Último degrau — kg até vazio
          </span>
        ) : null}
      </td>
      <td>
        <input
          type="text"
          inputMode="decimal"
          className="input-compact"
          value={preco}
          placeholder="—"
          disabled={saving}
          onChange={(e) => setPreco(e.target.value)}
        />
      </td>
      <td>
        <input
          type="text"
          inputMode="decimal"
          className="input-compact"
          value={minimo}
          placeholder="—"
          disabled={saving}
          onChange={(e) => setMinimo(e.target.value)}
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
            disabled={saving || !dirty}
            onClick={() =>
              void save({
                preco_por_km: preco.trim() === '' ? null : preco.trim(),
                minimo_rs: minimo.trim() === '' ? null : minimo.trim(),
              })
            }
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

function PapeisTable({
  rows,
  onSaved,
  onError,
}: {
  rows: PapelRow[];
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, PAPEL_SORT);

  return (
    <div className="card">
      <div className="table-wrap">
        {rows.length === 0 ? (
          <div className="empty-state">Nenhum papel cadastrado. Use “Completar itens ausentes”.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh column="nome" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Nome
                </SortableTh>
                <SortableTh column="preco_m2" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  R$/m²
                </SortableTh>
                <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Status
                </SortableTh>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
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

const ACABAMENTO_SORT = {
  nome: (row: AcabamentoRow) => row.nome,
  preco_m2: (row: AcabamentoRow) => Number(row.preco_m2),
  perda_m2: (row: AcabamentoRow) => Number(row.perda_m2),
  status: (row: AcabamentoRow) => (row.ativo ? 'ATIVO' : 'INATIVO'),
};

function AcabamentosTable({
  rows,
  onSaved,
  onError,
}: {
  rows: AcabamentoRow[];
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, ACABAMENTO_SORT);

  return (
    <div className="card">
      <div className="table-wrap">
        {rows.length === 0 ? (
          <div className="empty-state">Nenhum acabamento cadastrado.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh column="nome" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Nome
                </SortableTh>
                <SortableTh column="preco_m2" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  R$/m²
                </SortableTh>
                <SortableTh column="perda_m2" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Perda m²
                </SortableTh>
                <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Status
                </SortableTh>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
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
            Uso interno de rebobinação — não aparece no orçamento
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

const TROCA_SORT = {
  tipo: (row: TipoTrocaRow) => row.tipo,
  tempo_min: (row: TipoTrocaRow) => Number(row.tempo_min),
  tempo_h: (row: TipoTrocaRow) => Number(row.tempo_h),
  status: (row: TipoTrocaRow) => (row.ativo ? 'ATIVO' : 'INATIVO'),
};

function TrocasTable({
  rows,
  onSaved,
  onError,
}: {
  rows: TipoTrocaRow[];
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, TROCA_SORT);

  return (
    <div className="card">
      <div className="table-wrap">
        {rows.length === 0 ? (
          <div className="empty-state">Nenhum tipo de troca cadastrado.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh column="tipo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Tipo
                </SortableTh>
                <SortableTh column="tempo_min" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Minutos
                </SortableTh>
                <SortableTh column="tempo_h" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Horas
                </SortableTh>
                <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Status
                </SortableTh>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
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

const MAQUINA_SORT_BASE = {
  nome: (row: MaquinaRow) => row.nome,
  patrimonio: (row: MaquinaRow) => (row.bens_vinculados ?? []).length,
  status: (row: MaquinaRow) => (row.ativo ? 'ATIVO' : 'INATIVO'),
};

function MaquinasTable({
  rows,
  canSeePatrimonio,
  canWritePatrimonio,
  onSaved,
  onError,
}: {
  rows: MaquinaRow[];
  canSeePatrimonio: boolean;
  canWritePatrimonio: boolean;
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

  const sortGetters = useMemo(() => {
    const g: Record<string, (row: MaquinaRow) => string | number | null> = { ...MAQUINA_SORT_BASE };
    for (const c of coresCols) {
      g[`tarifa_${c}`] = (row) =>
        row.tarifas[c] != null ? Number(row.tarifas[c]) : null;
    }
    return g;
  }, [coresCols]);

  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, sortGetters);

  return (
    <div className="card">
      <div className="card-body" style={{ paddingBottom: 0 }}>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Cada linha é um <strong>grupo de tarifa</strong> (R$/h), não um ativo. A máquina física
          cadastra-se em{' '}
          {canSeePatrimonio ? <Link to="/patrimonio">Patrimônio</Link> : 'Patrimônio'}. Duas
          impressoras da mesma classe compartilham o grupo.{' '}
          {canWritePatrimonio ? (
            <Link to="/patrimonio/novo">Cadastrar bem</Link>
          ) : (
            'Quem gera o grupo novo é o cadastro do bem.'
          )}
        </p>
      </div>
      <div className="table-wrap table-wrap-scroll">
        {rows.length === 0 ? (
          <div className="empty-state">
            Nenhum grupo de hora-máquina. Cadastre a máquina no patrimônio ou use “Completar itens
            ausentes”.
          </div>
        ) : (
          <table className="data-table data-table-tarifas">
            <thead>
              <tr>
                <SortableTh column="nome" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Grupo
                </SortableTh>
                {coresCols.map((c) => (
                  <SortableTh
                    key={c}
                    column={`tarifa_${c}`}
                    sorts={sorts} sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                    label={`Tarifa ${c} cores`}
                  >
                    <span title={`Cores ${c}`}>{c}c</span>
                  </SortableTh>
                ))}
                <SortableTh column="patrimonio" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Patrimônio
                </SortableTh>
                <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Status
                </SortableTh>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <MaquinaEditRow
                  key={row.id}
                  row={row}
                  coresCols={coresCols}
                  canSeePatrimonio={canSeePatrimonio}
                  canWritePatrimonio={canWritePatrimonio}
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
  canSeePatrimonio,
  canWritePatrimonio,
  onSaved,
  onError,
}: {
  row: MaquinaRow;
  coresCols: string[];
  canSeePatrimonio: boolean;
  canWritePatrimonio: boolean;
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
      await onSaved(`Grupo “${row.nome}” atualizado.`);
    } catch (e) {
      onError(fieldErrors(e));
    } finally {
      setSaving(false);
    }
  };

  const bens = row.bens_vinculados ?? [];

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
        {bens.length === 0 ? (
          canWritePatrimonio ? (
            <Link to="/patrimonio/novo" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              Cadastrar bem
            </Link>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>sem bem</span>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {bens.map((b) =>
              canSeePatrimonio ? (
                <Link
                  key={b.id}
                  to={`/patrimonio/${b.id}`}
                  title={`${b.descricao} · ${bemStatusLabel(b.status)}`}
                  style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                >
                  {b.codigo}
                </Link>
              ) : (
                <span
                  key={b.id}
                  title={`${b.descricao} · ${bemStatusLabel(b.status)}`}
                  style={{ fontSize: '0.85rem' }}
                >
                  {b.codigo}
                </span>
              ),
            )}
          </div>
        )}
      </td>
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
            {saving ? '…' : 'Salvar'}
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
  tab: Exclude<TabId, 'matriz' | 'maquinas'>;
  onCancel: () => void;
  onSaved: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [perda, setPerda] = useState('0');
  const [tempoMin, setTempoMin] = useState('0');
  const [kgAte, setKgAte] = useState('');
  const [precoKm, setPrecoKm] = useState('');
  const [minimoRs, setMinimoRs] = useState('');
  const [saving, setSaving] = useState(false);

  const title =
    tab === 'papeis'
      ? 'Novo papel'
      : tab === 'acabamentos'
        ? 'Novo acabamento'
        : tab === 'trocas'
          ? 'Novo tipo de troca'
          : tab === 'frete'
            ? 'Nova faixa de frete'
            : 'Novo item';

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
      } else if (tab === 'frete') {
        await api.post('/orcamento-catalogo/faixas-frete', {
          kg_ate: kgAte.trim() === '' ? null : kgAte.trim(),
          preco_por_km: precoKm.trim() === '' ? null : precoKm.trim(),
          minimo_rs: minimoRs.trim() === '' ? null : minimoRs.trim(),
          ativo: false,
        });
        await onSaved(
          `Faixa “${kgAte.trim() === '' ? 'Acima' : `até ${kgAte.trim()} kg`}” criada (inativa até preencher R$ e reativar).`,
        );
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
            {tab === 'frete' ? (
              <>
                <div className="form-group">
                  <label>Kg até</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={kgAte}
                    onChange={(e) => setKgAte(e.target.value)}
                    placeholder="vazio = acima"
                  />
                  <span className="field-note">Contínua em relação às faixas existentes.</span>
                </div>
                <div className="form-group">
                  <label>R$/km</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={precoKm}
                    onChange={(e) => setPrecoKm(e.target.value)}
                    placeholder="vazio = sob consulta"
                  />
                </div>
                <div className="form-group">
                  <label>Mínimo R$</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={minimoRs}
                    onChange={(e) => setMinimoRs(e.target.value)}
                    placeholder="—"
                  />
                </div>
              </>
            ) : (
              <div className="form-group span-2">
                <label>{tab === 'trocas' ? 'Tipo *' : 'Nome *'}</label>
                <input
                  value={nome}
                  required
                  minLength={2}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="ex: BOPP BRILHO"
                />
              </div>
            )}
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
