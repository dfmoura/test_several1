import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconAlertCircle, IconCheck, IconMinus } from './NavIcons';
import { api, ApiError } from '../lib/api';
import { formatCnpj } from '../lib/format';

export type NfsePrestador = {
  status: string;
  parceiro_id: number | null;
  codigo: string | null;
  razao_social: string | null;
  pode_cadastrar: boolean;
};

type PreviewRow = {
  status: string;
  acao?: 'criar' | 'adicionar_papel' | 'nenhuma' | null;
  errors: string[];
  warnings?: string[];
  preview: {
    razao_social?: string | null;
    nome_fantasia?: string | null;
    cnpj_cpf?: string | null;
    municipio?: string | null;
    uf?: string | null;
    ie?: string | null;
    parceiro_codigo?: string | null;
  };
};

function variant(status: string | undefined): 'ok' | 'warn' | 'na' {
  if (status === 'cadastrado') return 'ok';
  if (status === 'nao_cadastrado' || status === 'sem_papel') return 'warn';
  return 'na';
}

export function prestadorLabel(status: string | undefined): string {
  switch (status) {
    case 'cadastrado':
      return 'Fornecedor cadastrado';
    case 'sem_papel':
      return 'Parceiro sem papel fornecedor';
    case 'nao_cadastrado':
      return 'Fornecedor não cadastrado';
    case 'pf':
      return 'Pessoa física — cadastro via XML aplica-se a PJ';
    case 'sem_cnpj':
      return 'Sem CNPJ no documento';
    default:
      return 'Prestador';
  }
}

export function prestadorTitle(prestador: NfsePrestador | undefined, podeParceiro: boolean, temXml: boolean): string {
  if (!prestador) return '';
  if (prestador.status === 'cadastrado') {
    return prestador.codigo ? `Fornecedor ${prestador.codigo}` : 'Fornecedor cadastrado';
  }
  if (prestador.status === 'pf' || prestador.status === 'sem_cnpj') {
    return 'Cadastro via XML aplica-se a prestador PJ com CNPJ.';
  }
  if (!temXml) {
    return 'Esta NFS-e ainda não tem XML para cadastrar o prestador.';
  }
  if (!podeParceiro) {
    return 'Sem permissão para cadastrar parceiro.';
  }
  if (prestador.status === 'sem_papel') {
    return 'Parceiro existe sem classificação fornecedor — clique para adicionar o papel.';
  }
  return 'Clique para simular o cadastro do prestador a partir do XML da NFS-e.';
}

export function NfsePrestadorMark({
  prestador,
  title,
  ariaLabel,
}: {
  prestador: NfsePrestador | undefined;
  title: string;
  ariaLabel: string;
}) {
  const kind = variant(prestador?.status);
  let icon: ReactNode;
  if (kind === 'ok') icon = <IconCheck />;
  else if (kind === 'warn') icon = <IconAlertCircle />;
  else icon = <IconMinus />;

  return (
    <span className={`dfe-cadastro-icon dfe-cadastro-icon--${kind}`} title={title} aria-label={ariaLabel}>
      {icon}
    </span>
  );
}

export function NfsePrestadorCadastroCard({
  notaId,
  numero,
  emitNome,
  onClose,
  onCommitted,
}: {
  notaId: number;
  numero: string | null;
  emitNome: string | null;
  onClose: () => void;
  onCommitted: () => void;
}) {
  const [row, setRow] = useState<PreviewRow | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancel = false;
    const run = async () => {
      setBusy(true);
      setErro(null);
      setRow(null);
      try {
        const res = await api.post<{ data: { row: PreviewRow } }>(
          `/nfse-tomadas/${notaId}/prestador/preview`,
          {},
        );
        if (!cancel) setRow(res.data.row);
      } catch (e) {
        if (!cancel) {
          const msg =
            e instanceof ApiError
              ? (e.details?.prestador?.[0] ?? e.message)
              : 'Não foi possível simular o cadastro do prestador.';
          setErro(msg);
        }
      } finally {
        if (!cancel) setBusy(false);
      }
    };
    void run();
    return () => {
      cancel = true;
    };
  }, [notaId]);

  const podeConfirmar = row?.status === 'ok' && (row.acao === 'criar' || row.acao === 'adicionar_papel');

  const confirmar = async () => {
    setBusy(true);
    setErro(null);
    try {
      await api.post(`/nfse-tomadas/${notaId}/prestador/commit`, {});
      onCommitted();
    } catch (e) {
      setErro(
        e instanceof ApiError
          ? (e.details?.prestador?.[0] ?? e.message)
          : 'Não foi possível gravar o prestador.',
      );
      setBusy(false);
    }
  };

  const titulo =
    row?.acao === 'adicionar_papel' ? 'Adicionar papel fornecedor' : 'Cadastrar prestador a partir do XML';

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <strong>{titulo}</strong>
        <div className="muted" style={{ marginBottom: '0.75rem' }}>
          {row?.preview.razao_social ?? emitNome ?? 'Prestador'} · NFS-e {numero ?? '—'}
        </div>
        {erro ? <p className="form-error">{erro}</p> : null}
        {busy && !row ? (
          <div className="muted">Simulando cadastro a partir do XML…</div>
        ) : row ? (
          <>
            <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
              <div>
                <strong>{row.preview.razao_social ?? '—'}</strong>
                {row.preview.nome_fantasia &&
                row.preview.nome_fantasia.trim().toLocaleLowerCase('pt-BR') !==
                  (row.preview.razao_social ?? '').trim().toLocaleLowerCase('pt-BR') ? (
                  <span className="muted"> · {row.preview.nome_fantasia}</span>
                ) : null}
              </div>
              <div className="muted" style={{ fontSize: '0.9rem' }}>
                {formatCnpj(row.preview.cnpj_cpf ?? null)}
                {row.preview.municipio ? ` · ${row.preview.municipio}` : ''}
                {row.preview.uf ? `/${row.preview.uf}` : ''}
                {row.preview.ie ? ` · IE ${row.preview.ie}` : ''}
              </div>
              {row.preview.parceiro_codigo ? (
                <div className="muted" style={{ fontSize: '0.9rem' }}>
                  Parceiro existente: {row.preview.parceiro_codigo}
                </div>
              ) : null}
            </div>
            {(row.warnings?.length ?? 0) > 0 ? (
              <ul className="muted" style={{ margin: '0 0 0.75rem', paddingLeft: '1.1rem', fontSize: '0.9rem' }}>
                {row.warnings!.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            {row.errors.length > 0 ? (
              <ul style={{ margin: '0 0 0.75rem', paddingLeft: '1.1rem', color: 'var(--danger, #b42318)' }}>
                {row.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            ) : null}
            {row.status === 'info' && row.acao === 'nenhuma' ? (
              <div className="muted" style={{ marginBottom: '0.75rem' }}>
                Já cadastrado
                {row.preview.parceiro_codigo ? ` (${row.preview.parceiro_codigo})` : ''}.
              </div>
            ) : null}
          </>
        ) : null}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
          {podeConfirmar ? (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void confirmar()}>
              {busy ? 'Gravando…' : row?.acao === 'adicionar_papel' ? 'Confirmar papel fornecedor' : 'Confirmar cadastro'}
            </button>
          ) : null}
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export function NfsePrestadorAcao({
  prestador,
  podeParceiro,
  temXml,
  onCadastrar,
}: {
  prestador: NfsePrestador | undefined;
  podeParceiro: boolean;
  temXml: boolean;
  onCadastrar: () => void;
}) {
  if (!prestador) return null;
  if (prestador.status === 'cadastrado' && prestador.parceiro_id) {
    return (
      <p className="muted">
        Cadastro encontrado:{' '}
        <Link to={`/parceiros/${prestador.parceiro_id}`}>
          {prestador.codigo} · {prestador.razao_social}
        </Link>
      </p>
    );
  }
  if (prestador.status === 'pf') {
    return (
      <p className="muted">
        Prestador pessoa física. O cadastro a partir do XML vale para CNPJ. Inclua o parceiro em Parceiros, com o papel
        de fornecedor, e volte para escolhê-lo.
      </p>
    );
  }
  if (prestador.status === 'sem_cnpj') {
    return <p className="muted">Esta NFS-e não traz CNPJ do prestador para gerar o cadastro.</p>;
  }
  if (!temXml) {
    return <p className="muted">O XML ainda não está na caixa, então o prestador não pode ser cadastrado daqui.</p>;
  }
  if (!podeParceiro || !prestador.pode_cadastrar) {
    return (
      <p className="muted">
        {prestador.status === 'sem_papel'
          ? 'Este CNPJ já é parceiro, sem o papel de fornecedor. Sem permissão para completar o cadastro.'
          : 'Prestador ainda não cadastrado. Sem permissão para gerar o cadastro.'}
      </p>
    );
  }

  return (
    <p className="muted" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <span>
        {prestador.status === 'sem_papel'
          ? 'Este CNPJ já é parceiro, sem o papel de fornecedor.'
          : 'Prestador ainda não cadastrado.'}
      </span>
      <button type="button" className="btn btn-secondary" onClick={onCadastrar}>
        {prestador.status === 'sem_papel' ? 'Adicionar papel fornecedor' : 'Cadastrar prestador'}
      </button>
    </p>
  );
}
