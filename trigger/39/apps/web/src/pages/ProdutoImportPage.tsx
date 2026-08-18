import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { ApiError, api } from '../lib/api';
import { useTableSort } from '../lib/useTableSort';

type Step = 'upload' | 'preview' | 'result';

type ImportPreviewRow = {
  line: number;
  status: 'ok' | 'erro';
  errors: string[];
  data: Record<string, unknown>;
  preview: {
    codigo?: string | null;
    familia?: string | null;
    grupo?: string | null;
    descricao_fiscal?: string | null;
    ncm?: string | null;
    unidade_comercial?: string | null;
    unidade_interna?: string | null;
    warnings?: string[];
    enrichment?: {
      status?: string;
      filled?: string[];
      message?: string | null;
      grupo_nome?: string | null;
      exige_dimensao_sku?: boolean;
      ncm_confirmado?: boolean | null;
    };
  };
};

type ImportPreviewReport = {
  total: number;
  ok: number;
  erro: number;
  rows: ImportPreviewRow[];
};

type ImportCommitRow = {
  line: number;
  status: 'criado' | 'erro';
  errors: string[];
  id?: number;
  codigo?: string;
  descricao_fiscal?: string | null;
  familia?: string | null;
  grupo?: string | null;
};

type ImportCommitResult = {
  total: number;
  criados: number;
  falhas: number;
  rows: ImportCommitRow[];
};

export function ProdutoImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewReport | null>(null);
  const [result, setResult] = useState<ImportCommitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const okRows = useMemo(
    () => preview?.rows.filter((row) => row.status === 'ok') ?? [],
    [preview],
  );

  const downloadTemplate = async () => {
    setError(null);
    try {
      await api.download('/produtos/import/template', 'produtos_modelo.csv');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao baixar o modelo.');
    }
  };

  const runPreview = async () => {
    if (!file) {
      setError('Selecione um arquivo CSV.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.postForm<{ data: ImportPreviewReport }>(
        '/produtos/import/preview',
        formData,
      );
      setPreview(res.data);
      setResult(null);
      setStep('preview');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha na simulação da importação.');
    } finally {
      setBusy(false);
    }
  };

  const runCommit = async () => {
    if (okRows.length === 0) {
      setError('Não há linhas válidas para importar.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ data: ImportCommitResult }>('/produtos/import/commit', {
        rows: okRows.map((row) => ({
          line: row.line,
          data: row.data,
        })),
      });
      setResult(res.data);
      setStep('result');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao confirmar a importação.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <>
      <PageHeader
        title="Importar produtos"
        description="Carga cadenciada via CSV: simulação sem gravar, defaults do grupo, commit insert-only"
        actions={
          <Link to="/produtos" className="btn btn-secondary">
            Voltar à lista
          </Link>
        }
      />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <StepBadge n={1} label="Arquivo" active={step === 'upload'} done={step !== 'upload'} />
          <StepBadge n={2} label="Simulação" active={step === 'preview'} done={step === 'result'} />
          <StepBadge n={3} label="Resultado" active={step === 'result'} done={false} />
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--danger, #b42318)' }}>
          <div className="card-body" style={{ color: 'var(--danger, #b42318)' }}>
            {error}
          </div>
        </div>
      )}

      {step === 'upload' && (
        <div className="card">
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            <p style={{ margin: 0 }}>
              Envie um CSV UTF-8 (separador <code>;</code> ou <code>,</code>). Na simulação o sistema
              valida cada linha sem gravar e preenche NCM, unidades, CFOP e tipo SPED a partir do
              grupo canônico (MP-PAP, PA-ETQ…) quando vazios. Grupos com bobina exigem{' '}
              <code>largura_mm</code> e <code>comprimento_m</code>. Código já existente gera erro na
              linha (insert-only — não atualiza). Estoque/saldo não entra nesta carga.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={() => void downloadTemplate()}>
                Baixar modelo CSV
              </button>
              <a
                className="btn btn-secondary"
                href="/docs/guia-importacao-produtos.pdf"
                download="guia-importacao-produtos.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Baixar guia PDF
              </a>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.85 }}>
              O guia detalha cada coluna, famílias, grupos e atributos dimensionais. Mínimo por
              linha: <code>familia</code>, <code>grupo</code> e <code>descricao_fiscal</code>.
              Override fiscal no CSV exige permissão <code>produto.fiscal</code>.
            </p>

            <div className="form-group">
              <label htmlFor="produto-csv">Arquivo CSV</label>
              <input
                id="produto-csv"
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <small style={{ display: 'block', marginTop: '0.35rem', opacity: 0.8 }}>
                  Selecionado: {file.name}
                </small>
              )}
            </div>

            <div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!file || busy}
                onClick={() => void runPreview()}
              >
                {busy ? 'Simulando…' : 'Simular importação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="card">
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <Stat label="Total" value={preview.total} />
              <Stat label="Válidas" value={preview.ok} />
              <Stat label="Com erro" value={preview.erro} />
            </div>

            <ProdutoPreviewTable rows={preview.rows} />

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={reset}>
                Escolher outro arquivo
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || okRows.length === 0}
                onClick={() => void runCommit()}
              >
                {busy
                  ? 'Importando…'
                  : `Confirmar importação (${okRows.length} linha${okRows.length === 1 ? '' : 's'})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="card">
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <Stat label="Enviadas" value={result.total} />
              <Stat label="Criadas" value={result.criados} />
              <Stat label="Falhas" value={result.falhas} />
            </div>

            <ProdutoResultTable rows={result.rows} />

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={reset}>
                Nova importação
              </button>
              <Link to="/produtos" className="btn btn-primary">
                Ir para produtos
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const PRODUTO_PREVIEW_SORT = {
  line: (row: ImportPreviewRow) => Number(row.line),
  status: (row: ImportPreviewRow) => row.status,
  familia: (row: ImportPreviewRow) => row.preview.familia,
  grupo: (row: ImportPreviewRow) => row.preview.grupo,
  descricao: (row: ImportPreviewRow) => row.preview.descricao_fiscal,
  ncm: (row: ImportPreviewRow) => row.preview.ncm,
  unidades: (row: ImportPreviewRow) =>
    [row.preview.unidade_comercial, row.preview.unidade_interna].filter(Boolean).join(' → '),
  catalogo: (row: ImportPreviewRow) => enrichmentLabel(row.preview.enrichment),
  mensagens: (row: ImportPreviewRow) =>
    [
      ...(row.preview.enrichment?.message ? [row.preview.enrichment.message] : []),
      ...(row.preview.warnings ?? []),
      ...row.errors,
    ].join(' '),
};

function ProdutoPreviewTable({ rows }: { rows: ImportPreviewRow[] }) {
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, PRODUTO_PREVIEW_SORT);

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <SortableTh column="line" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Linha
            </SortableTh>
            <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Status
            </SortableTh>
            <SortableTh column="familia" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Família
            </SortableTh>
            <SortableTh column="grupo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Grupo
            </SortableTh>
            <SortableTh column="descricao" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Descrição fiscal
            </SortableTh>
            <SortableTh column="ncm" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              NCM
            </SortableTh>
            <SortableTh column="unidades" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Unidades
            </SortableTh>
            <SortableTh column="catalogo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Grupo catálogo
            </SortableTh>
            <SortableTh column="mensagens" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Mensagens
            </SortableTh>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.line}>
              <td>{row.line}</td>
              <td>{row.status === 'ok' ? 'OK' : 'Erro'}</td>
              <td>{row.preview.familia ?? '—'}</td>
              <td>{row.preview.grupo ?? '—'}</td>
              <td>{row.preview.descricao_fiscal ?? '—'}</td>
              <td>{row.preview.ncm ?? '—'}</td>
              <td>
                {[row.preview.unidade_comercial, row.preview.unidade_interna]
                  .filter(Boolean)
                  .join(' → ') || '—'}
              </td>
              <td>{enrichmentLabel(row.preview.enrichment)}</td>
              <td>
                {[
                  ...(row.preview.enrichment?.message ? [row.preview.enrichment.message] : []),
                  ...(row.preview.warnings ?? []),
                  ...row.errors,
                ].join(' ') || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PRODUTO_RESULT_SORT = {
  line: (row: ImportCommitRow) => Number(row.line),
  status: (row: ImportCommitRow) => row.status,
  codigo: (row: ImportCommitRow) => row.codigo ?? (row.id != null ? String(row.id) : null),
  familia_grupo: (row: ImportCommitRow) =>
    [row.familia, row.grupo].filter(Boolean).join(' / '),
  descricao: (row: ImportCommitRow) => row.descricao_fiscal,
  mensagens: (row: ImportCommitRow) => row.errors.join(' '),
};

function ProdutoResultTable({ rows }: { rows: ImportCommitRow[] }) {
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, PRODUTO_RESULT_SORT);

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <SortableTh column="line" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Linha
            </SortableTh>
            <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Status
            </SortableTh>
            <SortableTh column="codigo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Código
            </SortableTh>
            <SortableTh column="familia_grupo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Família/Grupo
            </SortableTh>
            <SortableTh column="descricao" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Descrição fiscal
            </SortableTh>
            <SortableTh column="mensagens" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Mensagens
            </SortableTh>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={`${row.line}-${row.status}-${row.id ?? 'x'}`}>
              <td>{row.line}</td>
              <td>{row.status === 'criado' ? 'Criado' : 'Erro'}</td>
              <td>
                {row.id ? (
                  <Link to={`/produtos/${row.id}`}>{row.codigo ?? row.id}</Link>
                ) : (
                  row.codigo ?? '—'
                )}
              </td>
              <td>{[row.familia, row.grupo].filter(Boolean).join(' / ') || '—'}</td>
              <td>{row.descricao_fiscal ?? '—'}</td>
              <td>{row.errors.length ? row.errors.join(' ') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function enrichmentLabel(
  enrichment?: ImportPreviewRow['preview']['enrichment'],
): string {
  switch (enrichment?.status) {
    case 'atualizado':
      return 'Defaults aplicados';
    case 'ok_sem_lacunas':
      return 'OK';
    case 'erro':
      return 'Falhou';
    case 'ignorado':
      return '—';
    default:
      return '—';
  }
}

function StepBadge({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ opacity: active || done ? 1 : 0.55, fontWeight: active ? 600 : 400 }}>
      {n}. {label}
      {done ? ' ✓' : ''}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>{value}</div>
    </div>
  );
}
