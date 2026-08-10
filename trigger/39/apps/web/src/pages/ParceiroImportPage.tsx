import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { ApiError, api } from '../lib/api';
import { formatCnpjCpf } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

type Mode = 'csv' | 'xml';
type Step = 'upload' | 'preview' | 'result';

type CsvPreviewRow = {
  line: number;
  status: 'ok' | 'erro';
  errors: string[];
  data: Record<string, unknown>;
  preview: {
    razao_social?: string | null;
    nome_fantasia?: string | null;
    cnpj_cpf?: string | null;
    codigo?: string | null;
    tipo_pessoa?: string | null;
    municipio?: string | null;
    uf?: string | null;
    papeis?: string[];
    enrichment?: {
      status?: string;
      filled?: string[];
      message?: string | null;
    };
  };
};

type CsvPreviewReport = {
  total: number;
  ok: number;
  erro: number;
  rows: CsvPreviewRow[];
};

type CsvCommitRow = {
  line: number;
  status: 'criado' | 'erro';
  errors: string[];
  id?: number;
  codigo?: string;
  razao_social?: string | null;
  cnpj_cpf?: string | null;
};

type CsvCommitResult = {
  total: number;
  criados: number;
  falhas: number;
  rows: CsvCommitRow[];
};

type XmlPreviewRow = {
  line: number;
  file_name?: string;
  status: 'ok' | 'info' | 'erro';
  acao?: 'criar' | 'adicionar_papel' | 'nenhuma' | null;
  errors: string[];
  warnings?: string[];
  data: Record<string, unknown>;
  parceiro_id?: number;
  preview: {
    file_name?: string | null;
    chave_nfe?: string | null;
    razao_social?: string | null;
    nome_fantasia?: string | null;
    cnpj_cpf?: string | null;
    municipio?: string | null;
    uf?: string | null;
    ie?: string | null;
    regime?: string | null;
    tipo_fornecimento?: string | null;
    cfop_entrada_padrao?: string | null;
    cnpj_status?: string | null;
    parceiro_id?: number | null;
    parceiro_codigo?: string | null;
    field_sources?: Record<string, string>;
    enrichment?: {
      status?: string;
      filled?: string[];
      message?: string | null;
    };
    dest_aviso?: string | null;
    transportadora?: { cnpj?: string | null; nome?: string | null } | null;
    papeis?: string[];
  };
};

type XmlPreviewReport = {
  total: number;
  ok: number;
  info: number;
  erro: number;
  rows: XmlPreviewRow[];
};

type XmlCommitRow = {
  line: number;
  status: 'criado' | 'atualizado' | 'ignorado' | 'erro';
  errors: string[];
  id?: number;
  codigo?: string;
  razao_social?: string | null;
  cnpj_cpf?: string | null;
};

type XmlCommitResult = {
  total: number;
  criados: number;
  atualizados: number;
  ignorados: number;
  falhas: number;
  rows: XmlCommitRow[];
};

export function ParceiroImportPage() {
  const [mode, setMode] = useState<Mode>('csv');
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewReport | null>(null);
  const [xmlPreview, setXmlPreview] = useState<XmlPreviewReport | null>(null);
  const [csvResult, setCsvResult] = useState<CsvCommitResult | null>(null);
  const [xmlResult, setXmlResult] = useState<XmlCommitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const csvOkRows = useMemo(
    () => csvPreview?.rows.filter((row) => row.status === 'ok') ?? [],
    [csvPreview],
  );

  const xmlOkRows = useMemo(
    () =>
      xmlPreview?.rows.filter(
        (row) => row.status === 'ok' && (row.acao === 'criar' || row.acao === 'adicionar_papel'),
      ) ?? [],
    [xmlPreview],
  );

  const switchMode = (next: Mode) => {
    if (next === mode && step === 'upload') return;
    setMode(next);
    setStep('upload');
    setFile(null);
    setFiles([]);
    setCsvPreview(null);
    setXmlPreview(null);
    setCsvResult(null);
    setXmlResult(null);
    setError(null);
  };

  const downloadTemplate = async () => {
    setError(null);
    try {
      await api.download('/parceiros/import/template', 'parceiros_modelo.csv');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao baixar o modelo.');
    }
  };

  const runCsvPreview = async () => {
    if (!file) {
      setError('Selecione um arquivo CSV.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.postForm<{ data: CsvPreviewReport }>(
        '/parceiros/import/preview',
        formData,
      );
      setCsvPreview(res.data);
      setCsvResult(null);
      setStep('preview');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha na simulação da importação.');
    } finally {
      setBusy(false);
    }
  };

  const runCsvCommit = async () => {
    if (csvOkRows.length === 0) {
      setError('Não há linhas válidas para importar.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ data: CsvCommitResult }>('/parceiros/import/commit', {
        rows: csvOkRows.map((row) => ({
          line: row.line,
          data: row.data,
        })),
      });
      setCsvResult(res.data);
      setStep('result');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao confirmar a importação.');
    } finally {
      setBusy(false);
    }
  };

  const runXmlPreview = async () => {
    if (files.length === 0) {
      setError('Selecione ao menos um arquivo XML (ou ZIP).');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files[]', f));
      const res = await api.postForm<{ data: XmlPreviewReport }>(
        '/parceiros/import/xml/preview',
        formData,
      );
      setXmlPreview(res.data);
      setXmlResult(null);
      setStep('preview');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha na simulação do XML.');
    } finally {
      setBusy(false);
    }
  };

  const runXmlCommit = async () => {
    if (xmlOkRows.length === 0) {
      setError('Não há linhas válidas para confirmar.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ data: XmlCommitResult }>('/parceiros/import/xml/commit', {
        rows: xmlOkRows.map((row) => ({
          line: row.line,
          acao: row.acao,
          parceiro_id: row.parceiro_id ?? row.preview.parceiro_id ?? undefined,
          data: row.data,
        })),
      });
      setXmlResult(res.data);
      setStep('result');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao confirmar a importação XML.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setFiles([]);
    setCsvPreview(null);
    setXmlPreview(null);
    setCsvResult(null);
    setXmlResult(null);
    setError(null);
  };

  return (
    <>
      <PageHeader
        title="Importar parceiros"
        description="CSV em lote ou fornecedor a partir do XML da NF-e de entrada — simulação sem gravar, depois confirmação"
        actions={
          <Link to="/parceiros" className="btn btn-secondary">
            Voltar à lista
          </Link>
        }
      />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${mode === 'csv' ? 'btn-primary' : 'btn-secondary'}`}
            disabled={busy}
            onClick={() => switchMode('csv')}
          >
            CSV
          </button>
          <button
            type="button"
            className={`btn ${mode === 'xml' ? 'btn-primary' : 'btn-secondary'}`}
            disabled={busy}
            onClick={() => switchMode('xml')}
          >
            XML NF-e (Fornecedor)
          </button>
        </div>
      </div>

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

      {mode === 'csv' && step === 'upload' && (
        <div className="card">
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            <p style={{ margin: 0 }}>
              Envie um CSV UTF-8 (separador <code>;</code> ou <code>,</code>). Na simulação o sistema
              valida cada linha sem gravar e, para CNPJ (14 dígitos), atualiza automaticamente
              razão social, fantasia, endereço, telefone, e-mail e regime sugerido via API —
              esses campos não precisam estar no modelo. Conflitos de CNPJ/CPF ou código
              existentes geram erro na linha (insert-only).
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={() => void downloadTemplate()}>
                Baixar modelo CSV
              </button>
              <a
                className="btn btn-secondary"
                href="/docs/guia-importacao-parceiros.pdf"
                download="guia-importacao-parceiros.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Baixar guia PDF
              </a>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.85 }}>
              O guia lista as colunas do modelo (papéis, fiscal manual, contato, banco). Para PF,
              informe <code>razao_social</code> no CSV — não há consulta automática de CPF.
            </p>

            <div className="form-group">
              <label htmlFor="parceiro-csv">Arquivo CSV</label>
              <input
                id="parceiro-csv"
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
                onClick={() => void runCsvPreview()}
              >
                {busy ? 'Simulando…' : 'Simular importação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'xml' && step === 'upload' && (
        <div className="card">
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            <p style={{ margin: 0 }}>
              Envie um ou mais XML de NF-e de entrada (modelo 55) ou um ZIP com XMLs. O sistema
              extrai o <strong>emitente</strong>, consulta o cartão CNPJ (BrasilAPI) e prepara o
              cadastro de parceiro com papel <strong>Fornecedor</strong>. Nada é gravado até a
              confirmação. Não é entrada fiscal — só cadastro.
            </p>
            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.85 }}>
              Se o CNPJ já existir com papel fornecedor, a linha fica informativa. Se existir sem o
              papel, a confirmação apenas adiciona o papel (sem sobrescrever endereço). Máximo 20
              XMLs por lote.
            </p>
            <div>
              <a
                className="btn btn-secondary"
                href="/docs/guia-importacao-parceiros.pdf"
                download="guia-importacao-parceiros.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Baixar guia PDF
              </a>
            </div>

            <div className="form-group">
              <label htmlFor="parceiro-xml">Arquivos XML / ZIP</label>
              <input
                id="parceiro-xml"
                type="file"
                accept=".xml,.zip,application/xml,text/xml,application/zip"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              {files.length > 0 && (
                <small style={{ display: 'block', marginTop: '0.35rem', opacity: 0.8 }}>
                  {files.length} arquivo{files.length === 1 ? '' : 's'}:{' '}
                  {files.map((f) => f.name).join(', ')}
                </small>
              )}
            </div>

            <div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={files.length === 0 || busy}
                onClick={() => void runXmlPreview()}
              >
                {busy ? 'Simulando…' : 'Simular a partir do XML'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'csv' && step === 'preview' && csvPreview && (
        <div className="card">
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <Stat label="Total" value={csvPreview.total} />
              <Stat label="Válidas" value={csvPreview.ok} />
              <Stat label="Com erro" value={csvPreview.erro} />
            </div>

            <CsvPreviewTable rows={csvPreview.rows} />

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={reset}>
                Escolher outro arquivo
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || csvOkRows.length === 0}
                onClick={() => void runCsvCommit()}
              >
                {busy
                  ? 'Importando…'
                  : `Confirmar importação (${csvOkRows.length} linha${csvOkRows.length === 1 ? '' : 's'})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'xml' && step === 'preview' && xmlPreview && (
        <div className="card">
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <Stat label="Total" value={xmlPreview.total} />
              <Stat label="Avançam" value={xmlPreview.ok} />
              <Stat label="Já cadastrado" value={xmlPreview.info} />
              <Stat label="Com erro" value={xmlPreview.erro} />
            </div>

            <XmlPreviewTable rows={xmlPreview.rows} />

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={reset}>
                Escolher outros arquivos
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || xmlOkRows.length === 0}
                onClick={() => void runXmlCommit()}
              >
                {busy
                  ? 'Confirmando…'
                  : `Confirmar (${xmlOkRows.length} ${xmlOkRows.length === 1 ? 'fornecedor' : 'fornecedores'})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'csv' && step === 'result' && csvResult && (
        <div className="card">
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <Stat label="Enviadas" value={csvResult.total} />
              <Stat label="Criadas" value={csvResult.criados} />
              <Stat label="Falhas" value={csvResult.falhas} />
            </div>

            <CsvResultTable rows={csvResult.rows} />

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={reset}>
                Nova importação
              </button>
              <Link to="/parceiros" className="btn btn-primary">
                Ir para parceiros
              </Link>
            </div>
          </div>
        </div>
      )}

      {mode === 'xml' && step === 'result' && xmlResult && (
        <div className="card">
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <Stat label="Enviadas" value={xmlResult.total} />
              <Stat label="Criados" value={xmlResult.criados} />
              <Stat label="Papel adicionado" value={xmlResult.atualizados} />
              <Stat label="Ignorados" value={xmlResult.ignorados} />
              <Stat label="Falhas" value={xmlResult.falhas} />
            </div>

            <XmlResultTable rows={xmlResult.rows} />

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={reset}>
                Nova importação
              </button>
              <Link to="/parceiros" className="btn btn-primary">
                Ir para parceiros
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const CSV_PREVIEW_SORT = {
  line: (row: CsvPreviewRow) => Number(row.line),
  status: (row: CsvPreviewRow) => row.status,
  razao: (row: CsvPreviewRow) => row.preview.razao_social,
  cnpj: (row: CsvPreviewRow) => row.preview.cnpj_cpf,
  cidade: (row: CsvPreviewRow) =>
    [row.preview.municipio, row.preview.uf].filter(Boolean).join('/'),
  enrichment: (row: CsvPreviewRow) => enrichmentLabel(row.preview.enrichment),
  papeis: (row: CsvPreviewRow) => row.preview.papeis?.join(', '),
  mensagens: (row: CsvPreviewRow) =>
    [
      ...(row.preview.enrichment?.message ? [row.preview.enrichment.message] : []),
      ...row.errors,
    ].join(' '),
};

function CsvPreviewTable({ rows }: { rows: CsvPreviewRow[] }) {
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(rows, CSV_PREVIEW_SORT);

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <SortableTh column="line" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Linha
            </SortableTh>
            <SortableTh column="status" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Status
            </SortableTh>
            <SortableTh column="razao" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Razão social
            </SortableTh>
            <SortableTh column="cnpj" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              CNPJ/CPF
            </SortableTh>
            <SortableTh column="cidade" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Cidade/UF
            </SortableTh>
            <SortableTh column="enrichment" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              API CNPJ
            </SortableTh>
            <SortableTh column="papeis" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Papéis
            </SortableTh>
            <SortableTh column="mensagens" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Mensagens
            </SortableTh>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.line}>
              <td>{row.line}</td>
              <td>{row.status === 'ok' ? 'OK' : 'Erro'}</td>
              <td>{row.preview.razao_social ?? '—'}</td>
              <td>{formatCnpjCpf(row.preview.cnpj_cpf) || '—'}</td>
              <td>
                {[row.preview.municipio, row.preview.uf].filter(Boolean).join('/') || '—'}
              </td>
              <td>{enrichmentLabel(row.preview.enrichment)}</td>
              <td>{row.preview.papeis?.join(', ') || '—'}</td>
              <td>
                {[
                  ...(row.preview.enrichment?.message ? [row.preview.enrichment.message] : []),
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

const XML_PREVIEW_SORT = {
  line: (row: XmlPreviewRow) => Number(row.line),
  arquivo: (row: XmlPreviewRow) => row.file_name ?? row.preview.file_name,
  status: (row: XmlPreviewRow) => row.status,
  acao: (row: XmlPreviewRow) => row.acao,
  emitente: (row: XmlPreviewRow) =>
    row.preview.razao_social ?? row.preview.parceiro_codigo ?? String(row.preview.parceiro_id ?? ''),
  cnpj: (row: XmlPreviewRow) => row.preview.cnpj_cpf,
  cidade: (row: XmlPreviewRow) =>
    [row.preview.municipio, row.preview.uf].filter(Boolean).join('/'),
  origem: (row: XmlPreviewRow) => sourcesSummary(row.preview.field_sources),
  avisos: (row: XmlPreviewRow) =>
    [
      ...(row.warnings ?? []),
      ...(row.preview.enrichment?.message ? [row.preview.enrichment.message] : []),
      ...row.errors,
    ].join(' '),
};

function XmlPreviewTable({ rows }: { rows: XmlPreviewRow[] }) {
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(rows, XML_PREVIEW_SORT);

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <SortableTh column="line" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              #
            </SortableTh>
            <SortableTh column="arquivo" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Arquivo
            </SortableTh>
            <SortableTh column="status" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Status
            </SortableTh>
            <SortableTh column="acao" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Ação
            </SortableTh>
            <SortableTh column="emitente" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Emitente
            </SortableTh>
            <SortableTh column="cnpj" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              CNPJ
            </SortableTh>
            <SortableTh column="cidade" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Cidade/UF
            </SortableTh>
            <SortableTh column="origem" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Origem dados
            </SortableTh>
            <SortableTh column="avisos" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Avisos / erros
            </SortableTh>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.line}>
              <td>{row.line}</td>
              <td>{row.file_name ?? row.preview.file_name ?? '—'}</td>
              <td>{xmlStatusLabel(row)}</td>
              <td>{xmlAcaoLabel(row.acao)}</td>
              <td>
                {row.preview.parceiro_id ? (
                  <Link to={`/parceiros/${row.preview.parceiro_id}`}>
                    {row.preview.razao_social ?? row.preview.parceiro_codigo ?? row.preview.parceiro_id}
                  </Link>
                ) : (
                  row.preview.razao_social ?? '—'
                )}
                {row.preview.chave_nfe && (
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: 2 }}>
                    NF {row.preview.chave_nfe.slice(0, 10)}…
                  </div>
                )}
              </td>
              <td>{formatCnpjCpf(row.preview.cnpj_cpf) || '—'}</td>
              <td>
                {[row.preview.municipio, row.preview.uf].filter(Boolean).join('/') || '—'}
              </td>
              <td style={{ fontSize: '0.85rem' }}>
                {sourcesSummary(row.preview.field_sources)}
                <div style={{ opacity: 0.75, marginTop: 2 }}>
                  {enrichmentLabel(row.preview.enrichment)}
                </div>
              </td>
              <td>
                {[
                  ...(row.warnings ?? []),
                  ...(row.preview.enrichment?.message ? [row.preview.enrichment.message] : []),
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

const CSV_RESULT_SORT = {
  line: (row: CsvCommitRow) => Number(row.line),
  status: (row: CsvCommitRow) => row.status,
  codigo: (row: CsvCommitRow) => row.codigo ?? (row.id != null ? String(row.id) : null),
  razao: (row: CsvCommitRow) => row.razao_social,
  cnpj: (row: CsvCommitRow) => row.cnpj_cpf,
  mensagens: (row: CsvCommitRow) => row.errors.join(' '),
};

function CsvResultTable({ rows }: { rows: CsvCommitRow[] }) {
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(rows, CSV_RESULT_SORT);

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <SortableTh column="line" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Linha
            </SortableTh>
            <SortableTh column="status" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Status
            </SortableTh>
            <SortableTh column="codigo" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Código
            </SortableTh>
            <SortableTh column="razao" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Razão social
            </SortableTh>
            <SortableTh column="cnpj" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              CNPJ/CPF
            </SortableTh>
            <SortableTh column="mensagens" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
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
                  <Link to={`/parceiros/${row.id}`}>{row.codigo ?? row.id}</Link>
                ) : (
                  '—'
                )}
              </td>
              <td>{row.razao_social ?? '—'}</td>
              <td>{formatCnpjCpf(row.cnpj_cpf) || '—'}</td>
              <td>{row.errors.length ? row.errors.join(' ') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const XML_RESULT_SORT = {
  line: (row: XmlCommitRow) => Number(row.line),
  status: (row: XmlCommitRow) => row.status,
  codigo: (row: XmlCommitRow) => row.codigo ?? (row.id != null ? String(row.id) : null),
  razao: (row: XmlCommitRow) => row.razao_social,
  cnpj: (row: XmlCommitRow) => row.cnpj_cpf,
  mensagens: (row: XmlCommitRow) => row.errors.join(' '),
};

function XmlResultTable({ rows }: { rows: XmlCommitRow[] }) {
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(rows, XML_RESULT_SORT);

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <SortableTh column="line" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              #
            </SortableTh>
            <SortableTh column="status" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Status
            </SortableTh>
            <SortableTh column="codigo" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Código
            </SortableTh>
            <SortableTh column="razao" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Razão social
            </SortableTh>
            <SortableTh column="cnpj" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              CNPJ
            </SortableTh>
            <SortableTh column="mensagens" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Mensagens
            </SortableTh>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={`${row.line}-${row.status}-${row.id ?? 'x'}`}>
              <td>{row.line}</td>
              <td>{xmlCommitStatusLabel(row.status)}</td>
              <td>
                {row.id ? (
                  <Link to={`/parceiros/${row.id}`}>{row.codigo ?? row.id}</Link>
                ) : (
                  '—'
                )}
              </td>
              <td>{row.razao_social ?? '—'}</td>
              <td>{formatCnpjCpf(row.cnpj_cpf) || '—'}</td>
              <td>{row.errors.length ? row.errors.join(' ') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function enrichmentLabel(
  enrichment?: { status?: string; message?: string | null } | undefined,
): string {
  switch (enrichment?.status) {
    case 'atualizado':
      return 'BrasilAPI';
    case 'ok_sem_lacunas':
      return 'OK';
    case 'parcial':
      return 'Parcial (XML)';
    case 'erro':
      return 'Falhou';
    case 'ignorado':
      return '—';
    default:
      return '—';
  }
}

function sourcesSummary(sources?: Record<string, string>): string {
  if (!sources || Object.keys(sources).length === 0) return '—';
  const counts: Record<string, number> = {};
  Object.values(sources).forEach((src) => {
    counts[src] = (counts[src] ?? 0) + 1;
  });
  return Object.entries(counts)
    .map(([src, n]) => `${src}:${n}`)
    .join(' · ');
}

function xmlStatusLabel(row: XmlPreviewRow): string {
  if (row.status === 'ok') return 'OK';
  if (row.status === 'info') return 'Info';
  return 'Erro';
}

function xmlAcaoLabel(acao?: XmlPreviewRow['acao']): string {
  switch (acao) {
    case 'criar':
      return 'Criar fornecedor';
    case 'adicionar_papel':
      return 'Add papel fornecedor';
    case 'nenhuma':
      return 'Já é fornecedor';
    default:
      return '—';
  }
}

function xmlCommitStatusLabel(status: XmlCommitRow['status']): string {
  switch (status) {
    case 'criado':
      return 'Criado';
    case 'atualizado':
      return 'Papel adicionado';
    case 'ignorado':
      return 'Ignorado';
    default:
      return 'Erro';
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
