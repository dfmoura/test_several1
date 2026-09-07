import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { api, ApiError } from '../lib/api';
import { formatDate, formatQty } from '../lib/format';

type VolumeEtiqueta = {
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
 * Reimpressão de QR dos volumes (bobinas) — fora do MOV de entrada.
 */
export function EstoqueVolumesEtiquetasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const semEndereco = searchParams.get('sem_endereco') === '1';
  const [volumes, setVolumes] = useState<VolumeEtiqueta[]>([]);
  const [qrMap, setQrMap] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (onlySemVao: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const qs = onlySemVao ? '?sem_endereco=1' : '';
      const res = await api.get<{ data: { volumes: VolumeEtiqueta[]; volumes_count: number } }>(
        `/estoque/lotes/etiquetas${qs}`,
      );
      setVolumes(res.data.volumes);
      const next: Record<number, string> = {};
      await Promise.all(
        res.data.volumes.map(async (v) => {
          next[v.lote_id] = await QRCode.toDataURL(v.qr_payload, { width: 148, margin: 1 });
        }),
      );
      setQrMap(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar etiquetas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(semEndereco);
  }, [semEndereco]);

  const titulo = useMemo(
    () => (semEndereco ? 'Volumes sem vão' : 'Reimprimir etiquetas de volume'),
    [semEndereco],
  );

  return (
    <div className="page">
      <PageHeader
        title={titulo}
        description={`${volumes.length} volume(s) com saldo — cole o QR na bobina`}
        actions={
          <>
            <Link className="btn btn-secondary" to="/estoque">
              Estoque
            </Link>
            <Link className="btn btn-secondary" to="/estoque/guardar">
              Guardar no vão
            </Link>
            <button type="button" className="btn btn-primary no-print" onClick={() => window.print()}>
              Imprimir
            </button>
          </>
        }
      />

      <div className="no-print">
        <EstoqueModuleNav />
      </div>

      {error && (
        <div className="alert alert-error no-print" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="card no-print" style={{ marginBottom: '1rem' }}>
        <div className="card-body btn-row" style={{ alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: 0 }}>
            <input
              type="checkbox"
              checked={semEndereco}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams);
                if (e.target.checked) next.set('sem_endereco', '1');
                else next.delete('sem_endereco');
                setSearchParams(next);
              }}
            />
            Só volumes ainda sem vão
          </label>
          <span className="muted">Mesmo QR da etiqueta unitária e da ficha de entrada.</span>
        </div>
      </div>

      {loading ? (
        <p>Carregando…</p>
      ) : volumes.length === 0 ? (
        <div className="card">
          <div className="card-body">
            {semEndereco
              ? 'Nenhum volume sem vão. Todos já estão localizados ou não há saldo.'
              : 'Nenhum volume com saldo para imprimir.'}
          </div>
        </div>
      ) : (
        <div className="vol-etiquetas-grid">
          {volumes.map((v) => {
            const dim =
              v.largura_mm && v.comprimento_m
                ? `${v.largura_mm} mm × ${v.comprimento_m} m`
                : v.largura_mm
                  ? `${v.largura_mm} mm`
                  : '—';
            return (
              <div key={v.lote_id} className="card vol-etiqueta">
                <div
                  className="card-body"
                  style={{ display: 'grid', gridTemplateColumns: '148px 1fr', gap: '0.75rem' }}
                >
                  {qrMap[v.lote_id] ? (
                    <img src={qrMap[v.lote_id]} alt={`QR ${v.codigo}`} width={148} height={148} />
                  ) : (
                    <div style={{ width: 148, height: 148, background: '#eee' }} />
                  )}
                  <div style={{ display: 'grid', gap: '0.2rem', alignContent: 'start' }}>
                    <div style={{ fontWeight: 700 }}>{v.produto?.codigo}</div>
                    <div style={{ fontSize: '0.9rem' }}>{v.produto?.descricao_fiscal}</div>
                    <div>
                      <strong>Lote</strong> {v.codigo}
                    </div>
                    <div>
                      <strong>Qtde</strong> {formatQty(v.qtde)} {v.unidade}
                    </div>
                    <div>
                      <strong>Dim.</strong> {dim}
                    </div>
                    <div>
                      <strong>NF</strong> {v.nf_numero ?? '—'} ·{' '}
                      {v.data_entrada ? formatDate(v.data_entrada) : '—'}
                    </div>
                    <div>
                      <strong>Vão</strong> {v.endereco?.codigo ?? '—'}
                    </div>
                    <div className="no-print">
                      <Link to={`/estoque/lotes/${v.lote_id}/etiqueta`}>Unitária</Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .vol-etiquetas-grid { display: grid; gap: 1rem; }
        @media print {
          .no-print, .page-header, nav, .app-sidebar { display: none !important; }
          .vol-etiqueta { box-shadow: none; border: 1px solid #000; break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
