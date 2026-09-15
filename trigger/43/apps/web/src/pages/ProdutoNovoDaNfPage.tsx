import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ApiError, api, fiscalConsulta, type ProdutoGrupo } from '../lib/api';
import { useAuth } from '../lib/auth';
import { familiaLabel, formatCnpjCpf } from '../lib/format';

type Sugestao = {
  familia: string;
  grupo: string;
  ncm: string | null;
  unidade_comercial: string;
  unidade_interna: string;
  fator_conversao: string;
  descricao_fiscal: string;
  descricao_comercial: string;
  origem: number | null;
  programa_compra: string | null;
  confianca: string;
  motivo: string;
  cprod_generico: boolean;
  depara_recomendado: boolean;
  warnings: string[];
};

type XmlItem = {
  n_item: number | string | null;
  c_prod: string;
  x_prod: string | null;
  ncm: string | null;
  u_com: string | null;
  origem: number | null;
  qtd_dets: number;
  sugestao: Sugestao;
  status: 'novo' | 'ja_cadastrado';
  produto_existente: { id: number; codigo: string; descricao: string | null } | null;
};

type XmlPreview = {
  chave_nfe: string | null;
  numero: string | null;
  serie: string | null;
  data_emissao: string | null;
  emit: {
    cnpj_cpf?: string | null;
    razao_social?: string | null;
    nome_fantasia?: string | null;
  };
  fornecedor: {
    id: number;
    codigo: string;
    razao_social: string;
    nome_fantasia: string | null;
    cnpj_cpf: string | null;
  } | null;
  itens: XmlItem[];
  total_dets: number;
  total_cprods: number;
};

type RowEdit = {
  selecionado: boolean;
  familia: string;
  grupo: string;
  descricao_fiscal: string;
  unidade_comercial: string;
  unidade_interna: string;
  gravar_depara: boolean;
};

type CommitResult = {
  total: number;
  criados: number;
  ignorados: number;
  falhas: number;
  rows: Array<{
    line: number;
    status: string;
    c_prod?: string | null;
    produto_id?: number;
    produto_codigo?: string;
    errors: string[];
  }>;
};

type Step = 'upload' | 'preview' | 'result';

function buildRowEdit(item: XmlItem): RowEdit {
  const s = item.sugestao;
  return {
    selecionado: item.status === 'novo',
    familia: s.familia,
    grupo: s.grupo,
    descricao_fiscal: s.descricao_fiscal || item.x_prod || '',
    unidade_comercial: s.unidade_comercial || item.u_com || '',
    unidade_interna: s.unidade_interna || s.unidade_comercial || item.u_com || '',
    gravar_depara: s.depara_recomendado && item.status === 'novo',
  };
}

export function ProdutoNovoDaNfPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('produto.escrever');
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<XmlPreview | null>(null);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [grupos, setGrupos] = useState<ProdutoGrupo[]>([]);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fiscalConsulta.produtoGrupos();
        setGrupos(res.data);
      } catch {
        setGrupos([]);
      }
    })();
  }, []);

  const selectedCount = useMemo(
    () => Object.values(edits).filter((e) => e.selecionado).length,
    [edits],
  );

  const updateEdit = (cProd: string, patch: Partial<RowEdit>) => {
    setEdits((prev) => ({
      ...prev,
      [cProd]: { ...prev[cProd], ...patch },
    }));
  };

  const handlePreview = async () => {
    if (!canWrite || !file) {
      setError('Selecione o XML da NF-e.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.postForm<{ data: XmlPreview }>('/produtos/from-nfe-xml/preview', fd);
      const data = res.data;
      setPreview(data);
      const next: Record<string, RowEdit> = {};
      for (const item of data.itens) {
        next[item.c_prod] = buildRowEdit(item);
      }
      setEdits(next);
      setResult(null);
      setStep('preview');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao ler o XML.');
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!canWrite || !preview) return;
    if (selectedCount === 0) {
      setError('Selecione ao menos um item para criar.');
      return;
    }
    if (!preview.fornecedor && Object.values(edits).some((e) => e.selecionado && e.gravar_depara)) {
      setError(
        'Fornecedor do XML não está cadastrado nesta empresa. Cadastre o PAR ou desmarque o de-para.',
      );
      return;
    }

    setBusy(true);
    setError('');
    try {
      const items = preview.itens.map((item) => {
        const edit = edits[item.c_prod];
        if (!edit?.selecionado) {
          return { acao: 'pular' as const, c_prod: item.c_prod };
        }
        const s = item.sugestao;
        return {
          acao: 'criar' as const,
          c_prod: item.c_prod,
          x_prod: item.x_prod,
          ncm: item.ncm ?? s.ncm,
          u_com: item.u_com,
          origem: item.origem ?? s.origem,
          fornecedor_id: preview.fornecedor?.id ?? null,
          fornecedor_cnpj: preview.emit.cnpj_cpf ?? null,
          familia: edit.familia,
          grupo: edit.grupo,
          descricao_fiscal: edit.descricao_fiscal,
          descricao_comercial: s.descricao_comercial || edit.descricao_fiscal,
          unidade_comercial: edit.unidade_comercial,
          unidade_interna: edit.unidade_interna,
          programa_compra: s.programa_compra,
          gravar_depara: edit.gravar_depara,
          forcar_depara: s.cprod_generico && edit.gravar_depara,
        };
      });

      const res = await api.post<{ data: CommitResult }>('/produtos/from-nfe-xml/commit', { items });
      setResult(res.data);
      setStep('result');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao criar produtos.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setEdits({});
    setResult(null);
    setError('');
  };

  return (
    <>
      <PageHeader
        title="Produtos a partir do XML"
        description="Envie o XML da NF-e de compra → confira os itens (cProd únicos) → confirme família/grupo → SKU + de-para. Não lança estoque."
        actions={
          <div className="btn-row">
            <Link to="/como-cadastra#produto-passos" className="btn btn-secondary">
              Como cadastra
            </Link>
            <Link to="/produtos/novo" className="btn btn-secondary">
              Formulário completo
            </Link>
            <Link to="/produtos" className="btn btn-secondary">
              Voltar
            </Link>
          </div>
        }
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      {step === 'upload' ? (
        <div className="card">
          <div className="card-body">
            <h3 className="orc-section-title" style={{ marginTop: 0 }}>
              1. XML da NF-e
            </h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Preferência operacional: o documento real. Itens com o mesmo cProd (várias
              bobinas Exact) viram um único SKU. Entrada de estoque continua na OC.
            </p>
            <div className="form-group">
              <label htmlFor="xml-file">Arquivo .xml</label>
              <input
                id="xml-file"
                type="file"
                accept=".xml,text/xml,application/xml"
                disabled={!canWrite || busy}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canWrite || busy || !file}
                onClick={() => void handlePreview()}
              >
                {busy ? 'Lendo…' : 'Ler XML'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 'preview' && preview ? (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <h3 className="orc-section-title" style={{ marginTop: 0 }}>
                Nota
              </h3>
              <p style={{ margin: 0 }}>
                {preview.numero ? (
                  <>
                    NF {preview.numero}
                    {preview.serie ? ` · série ${preview.serie}` : ''}
                    {preview.data_emissao ? ` · ${preview.data_emissao}` : ''}
                  </>
                ) : (
                  'NF-e'
                )}
                {preview.chave_nfe ? (
                  <span className="muted"> · chave {preview.chave_nfe}</span>
                ) : null}
              </p>
              <p style={{ margin: '0.5rem 0 0' }}>
                Emitente:{' '}
                <strong>{preview.emit.razao_social || preview.emit.nome_fantasia || '—'}</strong>
                {preview.emit.cnpj_cpf ? (
                  <span className="muted"> · {formatCnpjCpf(preview.emit.cnpj_cpf)}</span>
                ) : null}
              </p>
              {preview.fornecedor ? (
                <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                  Fornecedor na empresa: {preview.fornecedor.codigo} —{' '}
                  {preview.fornecedor.razao_social}
                </p>
              ) : (
                <div className="alert alert-warning" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                  Emitente ainda não está como fornecedor nesta empresa. Cadastre o PAR ou
                  desmarque o de-para nos itens.{' '}
                  <Link to="/parceiros/novo">Novo parceiro →</Link>
                </div>
              )}
              <p className="muted" style={{ margin: '0.65rem 0 0' }}>
                {preview.total_dets} linha(s) na nota · {preview.total_cprods} cProd único(s)
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="orc-section-title" style={{ marginTop: 0 }}>
                2. Confirmar itens
              </h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Criar</th>
                      <th>cProd</th>
                      <th>Descrição NF</th>
                      <th>Família</th>
                      <th>Grupo</th>
                      <th>Unid.</th>
                      <th>De-para</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.itens.map((item) => {
                      const edit = edits[item.c_prod];
                      if (!edit) return null;
                      const gruposFam = grupos.filter((g) => g.familia === edit.familia);
                      return (
                        <tr key={item.c_prod}>
                          <td>
                            <input
                              type="checkbox"
                              checked={edit.selecionado}
                              disabled={!canWrite || busy || item.status === 'ja_cadastrado'}
                              onChange={(e) =>
                                updateEdit(item.c_prod, { selecionado: e.target.checked })
                              }
                              aria-label={`Criar ${item.c_prod}`}
                            />
                          </td>
                          <td>
                            <strong>{item.c_prod}</strong>
                            {item.qtd_dets > 1 ? (
                              <div className="muted">{item.qtd_dets} dets na NF</div>
                            ) : null}
                          </td>
                          <td>
                            <input
                              value={edit.descricao_fiscal}
                              disabled={!canWrite || busy || !edit.selecionado}
                              onChange={(e) =>
                                updateEdit(item.c_prod, { descricao_fiscal: e.target.value })
                              }
                            />
                            {item.sugestao.warnings?.length ? (
                              <div className="muted" style={{ marginTop: 4 }}>
                                {item.sugestao.warnings[0]}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            <select
                              value={edit.familia}
                              disabled={!canWrite || busy || !edit.selecionado}
                              onChange={(e) => {
                                const familia = e.target.value;
                                const first = grupos.find((g) => g.familia === familia);
                                updateEdit(item.c_prod, {
                                  familia,
                                  grupo: first?.codigo ?? edit.grupo,
                                });
                              }}
                            >
                              {['MP', 'EMB', 'REV', 'PA', 'SVC', 'FAC'].map((f) => (
                                <option key={f} value={f}>
                                  {f} — {familiaLabel(f)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              value={edit.grupo}
                              disabled={!canWrite || busy || !edit.selecionado}
                              onChange={(e) => updateEdit(item.c_prod, { grupo: e.target.value })}
                            >
                              {gruposFam.map((g) => (
                                <option key={g.codigo} value={g.codigo}>
                                  {g.codigo}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <span className="muted">
                              {edit.unidade_comercial}
                              {edit.unidade_interna !== edit.unidade_comercial
                                ? ` → ${edit.unidade_interna}`
                                : ''}
                            </span>
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={edit.gravar_depara}
                              disabled={
                                !canWrite || busy || !edit.selecionado || !preview.fornecedor
                              }
                              onChange={(e) =>
                                updateEdit(item.c_prod, { gravar_depara: e.target.checked })
                              }
                              aria-label={`De-para ${item.c_prod}`}
                            />
                          </td>
                          <td>
                            {item.status === 'ja_cadastrado' ? (
                              <span className="muted">
                                Já existe
                                {item.produto_existente ? (
                                  <>
                                    {' '}
                                    <Link to={`/produtos/${item.produto_existente.id}`}>
                                      {item.produto_existente.codigo}
                                    </Link>
                                  </>
                                ) : null}
                              </span>
                            ) : (
                              <span className="muted">
                                {item.sugestao.confianca}: {item.sugestao.motivo}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="btn-row" style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={reset}
                >
                  Outro XML
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!canWrite || busy || selectedCount === 0}
                  onClick={() => void handleCommit()}
                >
                  {busy ? 'Gravando…' : `Criar ${selectedCount} selecionado(s)`}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {step === 'result' && result ? (
        <div className="card">
          <div className="card-body">
            <h3 className="orc-section-title" style={{ marginTop: 0 }}>
              Resultado
            </h3>
            <p>
              Criados: <strong>{result.criados}</strong>
              {' · '}
              Ignorados: {result.ignorados}
              {' · '}
              Falhas: {result.falhas}
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>cProd</th>
                    <th>Status</th>
                    <th>SKU</th>
                    <th>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={`${row.line}-${row.c_prod}`}>
                      <td>{row.c_prod ?? '—'}</td>
                      <td>{row.status}</td>
                      <td>
                        {row.produto_id ? (
                          <Link to={`/produtos/${row.produto_id}`}>{row.produto_codigo}</Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="muted">
                        {row.errors?.length ? row.errors.join(' · ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={reset}>
                Outro XML
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/produtos')}
              >
                Ir para produtos
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
