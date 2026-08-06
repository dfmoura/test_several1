import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type Relatorio } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDateTime } from '../lib/format';

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDENTE: 'Pendente',
    PROCESSANDO: 'Processando',
    CONCLUIDO: 'Concluído',
    ERRO: 'Erro',
    CANCELADO: 'Cancelado',
  };
  return map[status] ?? status;
}

export function RelatorioDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('relatorio.escrever');
  const [item, setItem] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<{ data: Relatorio }>(`/relatorios/${id}`);
      setItem(res.data);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!item) return;
    if (item.status !== 'PENDENTE' && item.status !== 'PROCESSANDO') return;
    const t = window.setInterval(() => {
      void load();
    }, 2000);
    return () => window.clearInterval(t);
  }, [item, load]);

  const onDownload = async () => {
    if (!item) return;
    setBusy(true);
    try {
      await api.download(`/relatorios/${item.id}/download`, `${item.codigo}.pdf`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha no download');
    } finally {
      setBusy(false);
    }
  };

  const onReprocess = async () => {
    if (!item) return;
    setBusy(true);
    try {
      const res = await api.post<{ data: Relatorio }>(`/relatorios/${item.id}/reprocessar`);
      setItem(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao reprocessar');
    } finally {
      setBusy(false);
    }
  };

  const onReplan = async () => {
    if (!item) return;
    setBusy(true);
    try {
      const res = await api.post<{ data: Relatorio }>(`/relatorios/${item.id}/replanejar`);
      setItem(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao replanejar');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!item) return;
    if (!window.confirm(`Excluir o relatório ${item.codigo}?`)) return;
    setBusy(true);
    try {
      await api.delete(`/relatorios/${item.id}`);
      navigate('/relatorios');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao excluir');
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="loading">Carregando…</p>;
  }

  if (!item) {
    return (
      <>
        <p className="form-error">{erro ?? 'Relatório não encontrado.'}</p>
        <Link to="/relatorios">Voltar</Link>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={item.titulo || item.codigo}
        description={`${item.codigo} · ${item.orientacao === 'paisagem' ? 'Paisagem' : 'Retrato'}`}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/relatorios" className="btn btn-secondary">
              Lista
            </Link>
            {item.downloadable ? (
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onDownload()}>
                Baixar PDF
              </button>
            ) : null}
            {canWrite && item.reprocessavel ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => void onReprocess()}
                title="Gera o PDF de novo com o mesmo programa (sem chamar IA)"
              >
                Reprocessar
              </button>
            ) : null}
            {canWrite && item.replanejavel ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => void onReplan()}
                title="Chama a IA de novo a partir do pedido original"
              >
                Replanejar com IA
              </button>
            ) : null}
            {canWrite ? (
              <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void onDelete()}>
                Excluir
              </button>
            ) : null}
          </div>
        }
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusPill status={statusLabel(item.status)} />
            {(item.status === 'PENDENTE' || item.status === 'PROCESSANDO') && (
              <span style={{ color: 'var(--text-muted)' }}>
                Gerando dados e PDF… atualizando automaticamente.
              </span>
            )}
          </div>

          {item.resumo_legivel ? (
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                marginTop: '1.25rem',
                marginBottom: 0,
                fontFamily: 'inherit',
                fontSize: 14,
                lineHeight: 1.5,
                padding: '0.75rem',
                background: 'var(--surface-2, #f4f5f7)',
                borderRadius: 6,
              }}
            >
              {item.resumo_legivel}
            </pre>
          ) : null}

          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr',
              gap: '0.5rem 1rem',
              marginTop: '1.25rem',
            }}
          >
            <dt style={{ color: 'var(--text-muted)' }}>Criado</dt>
            <dd style={{ margin: 0 }}>{formatDateTime(item.created_at)}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>Atualizado</dt>
            <dd style={{ margin: 0 }}>{formatDateTime(item.updated_at)}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>Autor</dt>
            <dd style={{ margin: 0 }}>{item.criado_por?.name ?? '—'}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>Provedor IA</dt>
            <dd style={{ margin: 0 }}>
              {item.provedor_ia
                ? `${item.provedor_ia.nome} (${item.provedor_ia.provedor}${item.provedor_ia.modelo ? ` · ${item.provedor_ia.modelo}` : ''})`
                : '—'}
            </dd>
          </dl>

          {item.arquivo_expirado ? (
            <p className="form-hint" style={{ marginTop: '1rem' }}>
              O arquivo PDF expirou pela política de retenção. Use <strong>Reprocessar</strong> para gerar
              de novo com os dados atuais (mesma especificação).
            </p>
          ) : null}

          {item.erro_mensagem ? (
            <p className="form-error" style={{ marginTop: '1rem' }}>
              {item.erro_mensagem}
            </p>
          ) : null}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Pedido</h2>
          <p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{item.prompt}</p>
        </div>
      </div>

      {item.programa ? (
        <div className="card">
          <div className="card-body">
            <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Programa gerado</h2>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr',
                gap: '0.5rem 1rem',
              }}
            >
              <dt style={{ color: 'var(--text-muted)' }}>Fonte</dt>
              <dd style={{ margin: 0 }}>{item.programa.fonte}</dd>
              <dt style={{ color: 'var(--text-muted)' }}>Colunas</dt>
              <dd style={{ margin: 0 }}>{(item.programa.colunas ?? []).join(', ') || '—'}</dd>
              <dt style={{ color: 'var(--text-muted)' }}>Limite</dt>
              <dd style={{ margin: 0 }}>{item.programa.limite ?? '—'}</dd>
            </dl>
            <pre
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'var(--surface-2, #f4f5f7)',
                borderRadius: 6,
                overflow: 'auto',
                fontSize: 12,
              }}
            >
              {JSON.stringify(item.programa, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </>
  );
}
