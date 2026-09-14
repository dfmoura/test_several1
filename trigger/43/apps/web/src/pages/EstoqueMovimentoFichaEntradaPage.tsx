import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { api, ApiError } from '../lib/api';
import { formatCurrency, formatDate, formatDateTime, formatQty } from '../lib/format';

type FichaVolume = {
  movimento_item_id: number;
  lote_id: number;
  qr_payload: string;
  codigo: string;
  produto: { id: number; codigo: string; descricao_fiscal: string } | null;
  qtde: string;
  unidade: string;
  largura_mm: string | null;
  comprimento_m: string | null;
  data_fabricacao?: string | null;
  data_validade?: string | null;
  nf_numero: string | null;
  data_entrada: string | null;
  endereco: { id: number; codigo: string } | null;
  x_ped: string | null;
  n_item_ped: string | null;
  n_fci: string | null;
};

type FichaLinhaSemVolume = {
  movimento_item_id: number;
  produto: { id: number; codigo: string; descricao_fiscal: string } | null;
  qtde: string;
  unidade: string;
};

type FichaEntrada = {
  movimento: {
    id: number;
    codigo: string;
    tipo: string;
    nf_chave: string | null;
    nf_numero: string | null;
    nf_data: string | null;
    nf_valor: string | null;
    conferido_em: string | null;
  };
  ordem_compra: { id: number; codigo: string; status: string } | null;
  fornecedor: {
    id: number;
    codigo: string;
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  nfe: {
    id: number;
    chave: string;
    numero: string | null;
    serie: string | null;
    data_emissao: string | null;
    emit_nome: string | null;
  } | null;
  itens_fiscais: Array<{
    n_item: number;
    produto_id: number | null;
    c_prod: string;
    x_prod: string | null;
    x_ped: string | null;
    n_item_ped: string | null;
    n_fci: string | null;
    ncm: string | null;
    cfop: string | null;
    q_com: string | null;
    u_com: string | null;
  }>;
  volumes: FichaVolume[];
  volumes_count: number;
  linhas_sem_volume?: FichaLinhaSemVolume[];
};

/**
 * Relatório de entrada física pós-receber — ADR_CADASTRO_INSUMO_VOLUME F3+.
 * Impressão no browser com QR por volume (mesmo payload da etiqueta unitária).
 */
export function EstoqueMovimentoFichaEntradaPage() {
  const { movimentoId } = useParams();
  const [data, setData] = useState<FichaEntrada | null>(null);
  const [qrMap, setQrMap] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!movimentoId) return;
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const res = await api.get<{ data: FichaEntrada }>(
          `/estoque/movimentos/${movimentoId}/ficha-entrada`,
        );
        if (cancelled) return;
        setData(res.data);
        const next: Record<number, string> = {};
        await Promise.all(
          res.data.volumes.map(async (v) => {
            next[v.lote_id] = await QRCode.toDataURL(v.qr_payload, { width: 148, margin: 1 });
          }),
        );
        if (!cancelled) setQrMap(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Falha ao carregar ficha de entrada.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [movimentoId]);

  if (error && !data) {
    return (
      <div className="page">
        <PageHeader title="Ficha de entrada física" />
        <div className="card">
          <div className="card-body" style={{ color: 'var(--danger)' }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <PageHeader title="Ficha de entrada física" />
        <p>Carregando…</p>
      </div>
    );
  }

  const ocLink = data.ordem_compra ? `/compras/ordens/${data.ordem_compra.id}` : '/estoque';
  const semVolume = data.linhas_sem_volume ?? [];

  return (
    <div className="page">
      <PageHeader
        title="Ficha de entrada física"
        description={`${data.movimento.codigo} · ${data.volumes_count} volume(s) com QR${
          semVolume.length ? ` · ${semVolume.length} linha(s) sem lote` : ''
        }`}
        actions={
          <>
            <Link className="btn btn-secondary" to={ocLink}>
              {data.ordem_compra ? `OC ${data.ordem_compra.codigo}` : 'Voltar'}
            </Link>
            <Link
              className="btn btn-primary"
              to={`/estoque/lotes/etiquetas?movimento_id=${data.movimento.id}`}
            >
              Etiquetas 50×40
            </Link>
            <Link className="btn btn-secondary" to="/estoque/guardar">
              Guardar no local
            </Link>
            <Link className="btn btn-secondary" to="/estoque">
              Estoque
            </Link>
            <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
              Imprimir ficha A4
            </button>
          </>
        }
      />

      <div className="card ficha-entrada-cabecalho" style={{ marginBottom: '1rem' }}>
        <div className="card-body" style={{ display: 'grid', gap: '0.35rem' }}>
          <div>
            <strong>MOV</strong> {data.movimento.codigo}
            {data.ordem_compra ? (
              <>
                {' · '}
                <strong>OC</strong> {data.ordem_compra.codigo}
              </>
            ) : null}
          </div>
          <div>
            <strong>Fornecedor</strong>{' '}
            {data.fornecedor?.razao_social ?? data.nfe?.emit_nome ?? '—'}
          </div>
          <div>
            <strong>NF</strong> {data.movimento.nf_numero ?? data.nfe?.numero ?? '—'}
            {data.nfe?.serie ? ` série ${data.nfe.serie}` : ''}
            {' · '}
            <strong>Emissão</strong>{' '}
            {data.movimento.nf_data
              ? formatDate(data.movimento.nf_data)
              : data.nfe?.data_emissao
                ? formatDate(data.nfe.data_emissao)
                : '—'}
            {data.movimento.nf_valor ? ` · ${formatCurrency(data.movimento.nf_valor)}` : ''}
          </div>
          {data.movimento.nf_chave || data.nfe?.chave ? (
            <div style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>
              <strong>Chave</strong> {data.movimento.nf_chave ?? data.nfe?.chave}
            </div>
          ) : null}
          {data.movimento.conferido_em ? (
            <div>
              <strong>Conferido</strong> {formatDateTime(data.movimento.conferido_em)}
            </div>
          ) : null}
        </div>
      </div>

      {data.itens_fiscais.length > 0 ? (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Itens fiscais (espelho)</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>cProd</th>
                    <th>Descrição</th>
                    <th>Pedido (xPed)</th>
                    <th>Item ped.</th>
                    <th>FCI</th>
                    <th>NCM</th>
                    <th>CFOP</th>
                    <th className="num">Qtde</th>
                  </tr>
                </thead>
                <tbody>
                  {data.itens_fiscais.map((fi) => (
                    <tr key={fi.n_item}>
                      <td>{fi.n_item}</td>
                      <td>{fi.c_prod}</td>
                      <td>{fi.x_prod ?? '—'}</td>
                      <td>{fi.x_ped ?? '—'}</td>
                      <td>{fi.n_item_ped ?? '—'}</td>
                      <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>
                        {fi.n_fci ?? '—'}
                      </td>
                      <td>{fi.ncm ?? '—'}</td>
                      <td>{fi.cfop ?? '—'}</td>
                      <td className="num">
                        {fi.q_com ? `${formatQty(fi.q_com)} ${fi.u_com ?? ''}`.trim() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {data.volumes.length === 0 && semVolume.length === 0 ? (
        <div className="card">
          <div className="card-body">
            Esta entrada não gerou volumes (lotes) nem linhas físicas. Confira o recebimento.
          </div>
        </div>
      ) : null}

      {data.volumes.length > 0 ? (
        <div className="ficha-entrada-volumes">
          {data.volumes.map((v) => {
            const dim =
              v.largura_mm && v.comprimento_m
                ? `${v.largura_mm} mm × ${v.comprimento_m} m`
                : v.largura_mm
                  ? `${v.largura_mm} mm`
                  : '—';
            return (
              <div key={v.lote_id} className="card ficha-entrada-volume">
                <div
                  className="card-body"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '148px 1fr',
                    gap: '1rem',
                    alignItems: 'start',
                  }}
                >
                  {qrMap[v.lote_id] ? (
                    <img src={qrMap[v.lote_id]} alt={`QR ${v.codigo}`} width={148} height={148} />
                  ) : (
                    <div style={{ width: 148, height: 148, background: '#f0f0f0' }} />
                  )}
                  <div style={{ display: 'grid', gap: '0.25rem' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{v.produto?.codigo}</div>
                    <div>{v.produto?.descricao_fiscal}</div>
                    <div>
                      <strong>Lote</strong> {v.codigo}
                      {' · '}
                      <strong>Qtde</strong> {formatQty(v.qtde)} {v.unidade}
                    </div>
                    <div>
                      <strong>Dimensão</strong> {dim}
                      {' · '}
                      <strong>Local</strong> {v.endereco?.codigo ?? '— a vincular'}
                    </div>
                    {(v.data_fabricacao || v.data_validade) && (
                      <div>
                        {v.data_fabricacao ? (
                          <>
                            <strong>Fab.</strong> {formatDate(v.data_fabricacao)}
                          </>
                        ) : null}
                        {v.data_fabricacao && v.data_validade ? ' · ' : null}
                        {v.data_validade ? (
                          <>
                            <strong>Val.</strong> {formatDate(v.data_validade)}
                          </>
                        ) : null}
                      </div>
                    )}
                    <div>
                      <strong>NF</strong> {v.nf_numero ?? '—'}
                      {' · '}
                      <strong>Entrada</strong>{' '}
                      {v.data_entrada ? formatDate(v.data_entrada) : '—'}
                    </div>
                    {(v.x_ped || v.n_fci) && (
                      <div>
                        {v.x_ped ? (
                          <>
                            <strong>Pedido (xPed)</strong> {v.x_ped}
                            {v.n_item_ped ? ` · item ${v.n_item_ped}` : ''}
                          </>
                        ) : null}
                        {v.x_ped && v.n_fci ? ' · ' : null}
                        {v.n_fci ? (
                          <>
                            <strong>FCI</strong>{' '}
                            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' }}>
                              {v.n_fci}
                            </span>
                          </>
                        ) : null}
                      </div>
                    )}
                    <div className="no-print" style={{ marginTop: '0.35rem' }}>
                      <Link to={`/estoque/lotes/${v.lote_id}/etiqueta`}>Etiqueta unitária</Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {semVolume.length > 0 ? (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Linhas sem volume (SKU sem lote)</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Conferência física por quantidade — sem QR de volume.
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Descrição</th>
                    <th className="num">Qtde</th>
                  </tr>
                </thead>
                <tbody>
                  {semVolume.map((linha) => (
                    <tr key={linha.movimento_item_id}>
                      <td>{linha.produto?.codigo ?? '—'}</td>
                      <td>{linha.produto?.descricao_fiscal ?? '—'}</td>
                      <td className="num">
                        {formatQty(linha.qtde)} {linha.unidade}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      <p className="muted ficha-entrada-rodape" style={{ marginTop: '1.25rem', fontSize: '0.8rem' }}>
        QR = volume interno (VOL). Use para conferir e guardar no local. Relatório operacional — não é
        DANFE. Imprima ou “Salvar como PDF” pelo navegador.
      </p>

      <style>{`
        .ficha-entrada-volumes {
          display: grid;
          gap: 1rem;
        }
        @media print {
          .no-print, .page-header, nav, .app-sidebar, .ficha-entrada-rodape { display: none !important; }
          .ficha-entrada-volume { box-shadow: none; border: 1px solid #000; break-inside: avoid; page-break-inside: avoid; }
          .ficha-entrada-cabecalho { box-shadow: none; border: 1px solid #000; }
        }
      `}</style>
    </div>
  );
}
