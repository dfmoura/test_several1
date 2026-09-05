import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { api, ApiError } from '../lib/api';
import { formatDate, formatQty } from '../lib/format';

type EtiquetaData = {
  lote_id: number;
  qr_payload: string;
  codigo: string;
  produto: { id: number; codigo: string; descricao_fiscal: string } | null;
  qtde: string;
  unidade: string;
  largura_mm: string | null;
  comprimento_m: string | null;
  nf_numero: string | null;
  data_entrada: string | null;
  endereco: { id: number; codigo: string } | null;
};

/**
 * Etiqueta interna do volume (bobina) — ADR_CADASTRO_INSUMO_VOLUME F3.
 */
export function EstoqueLoteEtiquetaPage() {
  const { loteId } = useParams();
  const [data, setData] = useState<EtiquetaData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enderecoId, setEnderecoId] = useState('');
  const [enderecos, setEnderecos] = useState<Array<{ id: number; codigo: string }>>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    if (!loteId) return;
    setError(null);
    try {
      const [etiq, ends] = await Promise.all([
        api.get<{ data: EtiquetaData }>(`/estoque/lotes/${loteId}/etiqueta`),
        api.get<{ data: Array<{ id: number; codigo: string }> }>('/estoque/enderecos'),
      ]);
      setData(etiq.data);
      setEnderecos(ends.data);
      if (etiq.data.endereco) setEnderecoId(String(etiq.data.endereco.id));
      const url = await QRCode.toDataURL(etiq.data.qr_payload, { width: 196, margin: 1 });
      setQrDataUrl(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar etiqueta.');
    }
  };

  useEffect(() => {
    void load();
  }, [loteId]);

  const vincular = async () => {
    if (!loteId || !enderecoId) return;
    setMsg(null);
    setError(null);
    try {
      const res = await api.post<{ data: EtiquetaData }>(`/estoque/lotes/${loteId}/endereco`, {
        endereco_id: Number(enderecoId),
      });
      setData(res.data);
      setMsg(`Volume vinculado a ${res.data.endereco?.codigo ?? 'endereço'}.`);
      const url = await QRCode.toDataURL(res.data.qr_payload, { width: 196, margin: 1 });
      setQrDataUrl(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao vincular endereço.');
    }
  };

  if (error && !data) {
    return (
      <div className="page">
        <PageHeader title="Etiqueta do volume" />
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
        <PageHeader title="Etiqueta do volume" />
        <p>Carregando…</p>
      </div>
    );
  }

  const dim =
    data.largura_mm && data.comprimento_m
      ? `${data.largura_mm} mm × ${data.comprimento_m} m`
      : data.largura_mm
        ? `${data.largura_mm} mm`
        : '—';

  return (
    <div className="page">
      <PageHeader
        title="Etiqueta do volume"
        actions={
          <>
            <Link className="btn btn-secondary" to="/estoque">
              Estoque
            </Link>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              Imprimir
            </button>
          </>
        }
      />

      {msg && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">{msg}</div>
        </div>
      )}
      {error && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--danger)' }}>
          <div className="card-body" style={{ color: 'var(--danger)' }}>
            {error}
          </div>
        </div>
      )}

      <div className="card etiqueta-volume" style={{ maxWidth: '28rem' }}>
        <div className="card-body" style={{ display: 'grid', gap: '0.75rem', justifyItems: 'center' }}>
          {qrDataUrl && <img src={qrDataUrl} alt={`QR ${data.codigo}`} width={196} height={196} />}
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{data.produto?.codigo}</div>
            <div style={{ fontSize: '0.95rem' }}>{data.produto?.descricao_fiscal}</div>
            <div style={{ marginTop: '0.5rem' }}>
              <strong>Lote</strong> {data.codigo}
            </div>
            <div>
              <strong>Qtde</strong> {formatQty(data.qtde)} {data.unidade}
            </div>
            <div>
              <strong>Dimensão</strong> {dim}
            </div>
            <div>
              <strong>NF</strong> {data.nf_numero ?? '—'} · <strong>Entrada</strong>{' '}
              {data.data_entrada ? formatDate(data.data_entrada) : '—'}
            </div>
            <div>
              <strong>Vão</strong> {data.endereco?.codigo ?? '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="card no-print" style={{ marginTop: '1rem', maxWidth: '28rem' }}>
        <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
          <label>
            Vincular localização (vão)
            <select value={enderecoId} onChange={(e) => setEnderecoId(e.target.value)}>
              <option value="">— selecione —</option>
              {enderecos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo}
                </option>
              ))}
            </select>
          </label>
          {enderecos.length === 0 && (
            <p className="form-hint" style={{ margin: 0 }}>
              Nenhum vão cadastrado. Rode <code>php artisan erp:seed-estoque-enderecos</code> (gabarito
              6×4×4).
            </p>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!enderecoId}
            onClick={() => void vincular()}
          >
            Guardar no vão
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print, .page-header, nav, .app-sidebar { display: none !important; }
          .etiqueta-volume { box-shadow: none; border: 1px solid #000; }
        }
      `}</style>
    </div>
  );
}
