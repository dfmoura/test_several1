import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconDownload, IconTag } from '../components/NavIcons';
import { EspelhoFiscalPanel } from '../components/EspelhoFiscalPanel';
import { PageHeader } from '../components/PageHeader';
import { api, type NfeEntradaDetalhe } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCnpjCpf, formatCurrency, formatDate } from '../lib/format';

export function ComprasNfeRecebidaDetailPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const [nfe, setNfe] = useState<NfeEntradaDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const podeEstoque = hasPermission('estoque.ler');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const res = await api.get<{ data: NfeEntradaDetalhe }>(`/nfe-entradas/${id}`);
        if (!cancelled) setNfe(res.data);
      } catch (e) {
        if (!cancelled) {
          setErro(e instanceof Error ? e.message : 'Falha ao carregar a NF-e vinculada.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const baixarXml = async () => {
    if (!nfe?.xml_armazenado) return;
    setDownloading(true);
    setErro(null);
    try {
      const nome =
        nfe.chave && nfe.chave.length === 44
          ? `NFe-${nfe.chave}.xml`
          : `NFe-entrada-${nfe.id}.xml`;
      await api.download(`/nfe-entradas/${nfe.id}/xml`, nome);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível baixar o XML.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="loading">Carregando…</div>;
  }

  if (!nfe) {
    return (
      <>
        <PageHeader title="NF-e vinculada" />
        <p className="form-error">{erro ?? 'Nota não encontrada.'}</p>
        <Link to="/compras/nfe-recebidas" className="btn btn-secondary">
          Voltar
        </Link>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`NF ${nfe.numero ?? nfe.chave}${nfe.serie ? ` · série ${nfe.serie}` : ''}`}
        description="Espelho fiscal da nota vinculada na entrada — matéria-prima do livro, sem escrituração no ERP."
        actions={
          <div className="btn-row">
            <Link to="/compras/nfe-recebidas" className="btn btn-secondary">
              Lista
            </Link>
            {podeEstoque && nfe.movimento?.id ? (
              <Link
                to={`/estoque/lotes/etiquetas?movimento_id=${nfe.movimento.id}`}
                className="btn btn-primary"
                title="Etiquetas 50×40 mm com QR para colar na bobina"
              >
                <IconTag /> Etiquetas dos volumes
              </Link>
            ) : null}
            {podeEstoque && nfe.movimento?.id ? (
              <Link
                to={`/estoque/movimentos/${nfe.movimento.id}/ficha-entrada`}
                className="btn btn-secondary"
              >
                Ficha de entrada
              </Link>
            ) : null}
            {nfe.xml_armazenado ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={downloading}
                onClick={() => void baixarXml()}
              >
                <IconDownload /> {downloading ? 'Baixando…' : 'Baixar XML'}
              </button>
            ) : null}
          </div>
        }
      />

      {erro ? <div className="alert alert-error">{erro}</div> : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <div className="detail-meta">
            <div>
              <span>Emissão</span>
              <strong>{formatDate(nfe.data_emissao)}</strong>
            </div>
            <div>
              <span>Valor (vNF)</span>
              <strong>{formatCurrency(nfe.valor_nf)}</strong>
            </div>
            <div>
              <span>Emitente</span>
              <strong>
                {nfe.emit_nome ?? '—'}
                {nfe.emit_cnpj ? (
                  <span className="muted" style={{ display: 'block', fontWeight: 400 }}>
                    {formatCnpjCpf(nfe.emit_cnpj)}
                  </span>
                ) : null}
              </strong>
            </div>
            <div>
              <span>Destinatário</span>
              <strong>
                {nfe.dest_cnpj ? formatCnpjCpf(nfe.dest_cnpj) : '—'}
                {nfe.dest_uf ? ` · ${nfe.dest_uf}` : ''}
              </strong>
            </div>
            <div>
              <span>Natureza</span>
              <strong>{nfe.nat_op ?? '—'}</strong>
            </div>
            <div>
              <span>Chave</span>
              <strong
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '0.8rem',
                  wordBreak: 'break-all',
                }}
              >
                {nfe.chave}
              </strong>
            </div>
            {nfe.protocolo ? (
              <div>
                <span>Protocolo</span>
                <strong>
                  {nfe.protocolo}
                  {nfe.c_stat ? ` · cStat ${nfe.c_stat}` : ''}
                </strong>
              </div>
            ) : null}
          </div>
          <p className="form-hint" style={{ marginBottom: 0 }}>
            A entrada continua na OC; esta tela só consulta o espelho. XML guardado no receber —
            sem nova ida ao fisco.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <div className="form-section">
            <h3>Elos operacionais</h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.35rem' }}>
              <li>
                Ordem de compra:{' '}
                {nfe.ordem_compra?.id ? (
                  <Link to={`/compras/ordens/${nfe.ordem_compra.id}`}>{nfe.ordem_compra.codigo}</Link>
                ) : (
                  '—'
                )}
              </li>
              <li>
                Movimento de estoque:{' '}
                {nfe.movimento?.id ? (
                  <Link to={`/estoque/movimentos/${nfe.movimento.id}/ficha-entrada`}>
                    {nfe.movimento.codigo ?? `MOV #${nfe.movimento.id}`}
                  </Link>
                ) : (
                  '—'
                )}
                {podeEstoque && nfe.movimento?.id ? (
                  <>
                    {' · '}
                    <Link to={`/estoque/lotes/etiquetas?movimento_id=${nfe.movimento.id}`}>
                      etiquetas 50×40
                    </Link>
                  </>
                ) : null}
              </li>
              <li>
                Fornecedor:{' '}
                {nfe.fornecedor?.id ? (
                  <Link to={`/parceiros/${nfe.fornecedor.id}`}>
                    {nfe.fornecedor.codigo}
                    {nfe.fornecedor.razao_social ? ` · ${nfe.fornecedor.razao_social}` : ''}
                  </Link>
                ) : (
                  (nfe.emit_nome ?? '—')
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {nfe.espelho ? (
        <EspelhoFiscalPanel
          titulo={`Espelho fiscal · NF ${nfe.numero ?? nfe.chave}`}
          espelho={nfe.espelho}
          defaultOpen
        />
      ) : (
        <p className="muted">Espelho detalhado indisponível para esta nota.</p>
      )}
    </>
  );
}
