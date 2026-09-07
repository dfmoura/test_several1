import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { api, ApiError } from '../lib/api';
import { formatDate, formatQty } from '../lib/format';
import { useAuth } from '../lib/auth';

type VolumeInfo = {
  lote_id: number;
  codigo: string;
  qr_payload: string;
  produto: { id: number; codigo: string; descricao_fiscal: string } | null;
  qtde: string;
  unidade: string;
  endereco: { id: number; codigo: string } | null;
  nf_numero: string | null;
  data_entrada: string | null;
};

/**
 * WMS leve — ler QR do volume, colocar na estante, ler QR do vão.
 * Leitores USB (wedge) digitam o payload e enviam Enter.
 */
export function EstoqueGuardarPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('estoque.escrever');
  const volRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  const [volumeQr, setVolumeQr] = useState('');
  const [enderecoQr, setEnderecoQr] = useState('');
  const [volume, setVolume] = useState<VolumeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    volRef.current?.focus();
  }, []);

  const resolveVolume = async (payload: string) => {
    const p = payload.trim();
    if (!p) return;
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const res = await api.get<{ data: VolumeInfo }>(
        `/estoque/volumes/por-qr?payload=${encodeURIComponent(p)}`,
      );
      setVolume(res.data);
      setVolumeQr(p);
      setTimeout(() => endRef.current?.focus(), 50);
    } catch (err) {
      setVolume(null);
      setError(err instanceof ApiError ? err.message : 'Volume não reconhecido.');
      volRef.current?.select();
    } finally {
      setBusy(false);
    }
  };

  const guardar = async (endPayload?: string) => {
    if (!canWrite) {
      setError('Sem permissão estoque.escrever.');
      return;
    }
    const v = volumeQr.trim();
    const e = (endPayload ?? enderecoQr).trim();
    if (!v || !e) {
      setError('Leia o QR do volume e depois o QR do vão.');
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: VolumeInfo }>('/estoque/guardar', {
        volume_qr: v,
        endereco_qr: e,
      });
      setVolume(res.data);
      setMsg(
        `Volume ${res.data.codigo} guardado em ${res.data.endereco?.codigo ?? 'vão'}. Pronto para o próximo.`,
      );
      setVolumeQr('');
      setEnderecoQr('');
      setVolume(null);
      setTimeout(() => volRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao guardar.');
      endRef.current?.select();
    } finally {
      setBusy(false);
    }
  };

  const onVolKey = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      void resolveVolume(volumeQr);
    }
  };

  const onEndKey = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      void guardar(enderecoQr);
    }
  };

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!volume) {
      void resolveVolume(volumeQr);
      return;
    }
    void guardar();
  };

  return (
    <div className="page">
      <PageHeader
        title="Guardar no vão"
        description="1) Leia o QR do volume · 2) Coloque na estante · 3) Leia o QR do vão"
        actions={
          <>
            <Link className="btn btn-secondary" to="/estoque">
              Estoque
            </Link>
            <Link className="btn btn-secondary" to="/estoque/enderecos/etiquetas">
              Etiquetas dos vãos
            </Link>
            <Link className="btn btn-secondary" to="/estoque/lotes/etiquetas">
              Reimprimir volumes
            </Link>
          </>
        }
      />

      <EstoqueModuleNav />

      {msg && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          {msg}
        </div>
      )}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="card" style={{ maxWidth: '36rem', marginBottom: '1rem' }}>
        <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="volume_qr">1. QR do volume (VOL:…)</label>
            <input
              id="volume_qr"
              ref={volRef}
              value={volumeQr}
              onChange={(e) => setVolumeQr(e.target.value)}
              onKeyDown={onVolKey}
              placeholder="Aponte o leitor ou cole o payload"
              autoComplete="off"
              disabled={busy || !canWrite}
            />
          </div>

          {volume && (
            <div className="alert alert-info" style={{ margin: 0 }}>
              <strong>{volume.produto?.codigo}</strong> · {volume.produto?.descricao_fiscal}
              <div>
                Lote {volume.codigo} · {formatQty(volume.qtde)} {volume.unidade}
                {volume.endereco ? ` · hoje em ${volume.endereco.codigo}` : ' · sem vão'}
              </div>
              {volume.nf_numero || volume.data_entrada ? (
                <div className="muted">
                  NF {volume.nf_numero ?? '—'} · entrada{' '}
                  {volume.data_entrada ? formatDate(volume.data_entrada) : '—'}
                </div>
              ) : null}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="endereco_qr">2. QR do vão (END:…)</label>
            <input
              id="endereco_qr"
              ref={endRef}
              value={enderecoQr}
              onChange={(e) => setEnderecoQr(e.target.value)}
              onKeyDown={onEndKey}
              placeholder={volume ? 'Leia o QR colado no vão' : 'Primeiro leia o volume'}
              autoComplete="off"
              disabled={busy || !canWrite || !volume}
            />
          </div>

          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={busy || !canWrite}>
              {busy ? 'Processando…' : volume ? 'Guardar' : 'Confirmar volume'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => {
                setVolume(null);
                setVolumeQr('');
                setEnderecoQr('');
                setError(null);
                setMsg(null);
                volRef.current?.focus();
              }}
            >
              Limpar
            </button>
          </div>

          {!canWrite && (
            <p className="muted" style={{ margin: 0 }}>
              Somente leitura — precisa de estoque.escrever para vincular.
            </p>
          )}
        </div>
      </form>

      <p className="muted" style={{ maxWidth: '36rem' }}>
        Imprima as etiquetas dos volumes (entrada ou reimpressão) e as dos vãos. O leitor de código de
        barras USB funciona nestes campos (Enter ao final).
      </p>
    </div>
  );
}
