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

type EnderecoInfo = {
  id: number;
  codigo: string;
  prateleira: number;
  coluna: number;
  vao: number;
  qr_payload: string;
};

/** Ordem de leitura no chão — WMS leve (ADR F4). */
type OrdemLeitura = 'volume_primeiro' | 'vao_primeiro';

/**
 * WMS leve — amarra volume (VOL) ↔ vão (END).
 * Duas ordens: volume→vão (padrão) ou vão→volume (vão fixo para vários volumes).
 * Leitores USB (wedge) digitam o payload e enviam Enter.
 */
export function EstoqueGuardarPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('estoque.escrever');
  const volRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  const [ordem, setOrdem] = useState<OrdemLeitura>('volume_primeiro');
  const [volumeQr, setVolumeQr] = useState('');
  const [enderecoQr, setEnderecoQr] = useState('');
  const [volume, setVolume] = useState<VolumeInfo | null>(null);
  const [endereco, setEndereco] = useState<EnderecoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const focusPrimeiro = (o: OrdemLeitura = ordem) => {
    setTimeout(() => {
      if (o === 'vao_primeiro') {
        endRef.current?.focus();
      } else {
        volRef.current?.focus();
      }
    }, 50);
  };

  const focusSegundo = (o: OrdemLeitura = ordem) => {
    setTimeout(() => {
      if (o === 'vao_primeiro') {
        volRef.current?.focus();
      } else {
        endRef.current?.focus();
      }
    }, 50);
  };

  useEffect(() => {
    volRef.current?.focus();
  }, []);

  const limparLeitura = (opts?: { manterVao?: boolean }) => {
    setVolume(null);
    setVolumeQr('');
    setError(null);
    if (!opts?.manterVao) {
      setEndereco(null);
      setEnderecoQr('');
    }
  };

  const trocarOrdem = (nova: OrdemLeitura) => {
    if (nova === ordem) return;
    setOrdem(nova);
    limparLeitura();
    setMsg(null);
    focusPrimeiro(nova);
  };

  const resolveVolume = async (payload: string) => {
    const p = payload.trim();
    if (!p) return;
    if (p.toUpperCase().startsWith('END:')) {
      setError('Esse QR é de vão (END:…). Use o campo do vão ou mude a ordem de leitura.');
      volRef.current?.select();
      return;
    }
    setError(null);
    setMsg(null);
    setBusy(true);
    let handedOff = false;
    try {
      const res = await api.get<{ data: VolumeInfo }>(
        `/estoque/volumes/por-qr?payload=${encodeURIComponent(p)}`,
      );
      setVolume(res.data);
      setVolumeQr(p);
      // Vão → volume: com vão já confirmado, Enter no volume amarra na hora.
      if (ordem === 'vao_primeiro' && (endereco || enderecoQr.trim())) {
        handedOff = true;
        await guardar(p, enderecoQr.trim() || endereco?.qr_payload);
        return;
      }
      focusSegundo();
    } catch (err) {
      setVolume(null);
      setError(err instanceof ApiError ? err.message : 'Volume não reconhecido.');
      volRef.current?.select();
    } finally {
      if (!handedOff) setBusy(false);
    }
  };

  const resolveEndereco = async (payload: string) => {
    const p = payload.trim();
    if (!p) return;
    if (p.toUpperCase().startsWith('VOL:')) {
      setError('Esse QR é de volume (VOL:…). Use o campo do volume ou mude a ordem de leitura.');
      endRef.current?.select();
      return;
    }
    setError(null);
    setMsg(null);
    setBusy(true);
    let handedOff = false;
    try {
      const res = await api.get<{ data: EnderecoInfo }>(
        `/estoque/enderecos/por-qr?payload=${encodeURIComponent(p)}`,
      );
      setEndereco(res.data);
      setEnderecoQr(p);
      // Volume → vão: se o volume já estava confirmado, Enter no vão amarra na hora.
      if (ordem === 'volume_primeiro' && (volume || volumeQr.trim())) {
        handedOff = true;
        await guardar(volumeQr.trim() || volume?.qr_payload, p);
        return;
      }
      focusSegundo();
    } catch (err) {
      setEndereco(null);
      setError(err instanceof ApiError ? err.message : 'Vão não reconhecido.');
      endRef.current?.select();
    } finally {
      if (!handedOff) setBusy(false);
    }
  };

  const guardar = async (volPayload?: string, endPayload?: string) => {
    if (!canWrite) {
      setError('Sem permissão estoque.escrever.');
      return;
    }
    const v = (volPayload ?? volumeQr).trim();
    const e = (endPayload ?? enderecoQr).trim();
    if (!v || !e) {
      setError(
        ordem === 'vao_primeiro'
          ? 'Leia o QR do vão e depois o QR do volume.'
          : 'Leia o QR do volume e depois o QR do vão.',
      );
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
      const vaoCodigo = res.data.endereco?.codigo ?? endereco?.codigo ?? 'vão';
      if (ordem === 'vao_primeiro') {
        setMsg(
          `Volume ${res.data.codigo} guardado em ${vaoCodigo}. Leia o próximo volume neste vão.`,
        );
        limparLeitura({ manterVao: true });
        setTimeout(() => volRef.current?.focus(), 50);
      } else {
        setMsg(
          `Volume ${res.data.codigo} guardado em ${vaoCodigo}. Pronto para o próximo.`,
        );
        limparLeitura();
        setTimeout(() => volRef.current?.focus(), 50);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao guardar.');
      if (ordem === 'vao_primeiro') {
        volRef.current?.select();
      } else {
        endRef.current?.select();
      }
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
      if (ordem === 'volume_primeiro' && volume) {
        void guardar(undefined, enderecoQr);
        return;
      }
      void resolveEndereco(enderecoQr);
    }
  };

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    if (ordem === 'vao_primeiro') {
      if (!endereco) {
        void resolveEndereco(enderecoQr);
        return;
      }
      if (!volume) {
        void resolveVolume(volumeQr);
        return;
      }
      void guardar();
      return;
    }
    if (!volume) {
      void resolveVolume(volumeQr);
      return;
    }
    void guardar();
  };

  const volumePronto = Boolean(volume);
  const vaoPronto = Boolean(endereco);
  const podeGuardar = volumePronto && vaoPronto;

  const descricao =
    ordem === 'vao_primeiro'
      ? '1) Leia o QR do vão · 2) Coloque o volume · 3) Leia o QR do volume'
      : '1) Leia o QR do volume · 2) Coloque na estante · 3) Leia o QR do vão';

  const labelVol = ordem === 'vao_primeiro' ? '2. QR do volume (VOL:…)' : '1. QR do volume (VOL:…)';
  const labelEnd = ordem === 'vao_primeiro' ? '1. QR do vão (END:…)' : '2. QR do vão (END:…)';

  const placeholderVol =
    ordem === 'vao_primeiro'
      ? endereco
        ? 'Leia o QR do volume'
        : 'Primeiro leia o vão'
      : 'Aponte o leitor ou cole o payload';

  const placeholderEnd =
    ordem === 'volume_primeiro'
      ? volume
        ? 'Leia o QR colado no vão'
        : 'Primeiro leia o volume'
      : 'Aponte o leitor ou cole o payload';

  const volDisabled =
    busy || !canWrite || (ordem === 'vao_primeiro' && !endereco);
  const endDisabled =
    busy || !canWrite || (ordem === 'volume_primeiro' && !volume);

  const submitLabel = busy
    ? 'Processando…'
    : podeGuardar
      ? 'Guardar'
      : ordem === 'vao_primeiro'
        ? endereco
          ? 'Confirmar volume'
          : 'Confirmar vão'
        : volume
          ? 'Guardar'
          : 'Confirmar volume';

  const campoVolume = (
    <div className="form-group" key="vol">
      <label htmlFor="volume_qr">{labelVol}</label>
      <input
        id="volume_qr"
        ref={volRef}
        value={volumeQr}
        onChange={(e) => setVolumeQr(e.target.value)}
        onKeyDown={onVolKey}
        placeholder={placeholderVol}
        autoComplete="off"
        disabled={volDisabled}
      />
    </div>
  );

  const previewVolume = volume ? (
    <div className="alert alert-info" style={{ margin: 0 }} key="vol-prev">
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
  ) : null;

  const campoVao = (
    <div className="form-group" key="end">
      <label htmlFor="endereco_qr">{labelEnd}</label>
      <input
        id="endereco_qr"
        ref={endRef}
        value={enderecoQr}
        onChange={(e) => setEnderecoQr(e.target.value)}
        onKeyDown={onEndKey}
        placeholder={placeholderEnd}
        autoComplete="off"
        disabled={endDisabled}
      />
    </div>
  );

  const previewVao = endereco ? (
    <div className="alert alert-info" style={{ margin: 0 }} key="end-prev">
      <strong>Vão {endereco.codigo}</strong>
      <div className="muted">
        Prat. {endereco.prateleira} · Col. {endereco.coluna} · Vão {endereco.vao}
        {ordem === 'vao_primeiro' ? ' · permanece para o próximo volume' : ''}
      </div>
    </div>
  ) : null;

  const campos =
    ordem === 'vao_primeiro'
      ? [campoVao, previewVao, campoVolume, previewVolume]
      : [campoVolume, previewVolume, campoVao, previewVao];

  return (
    <div className="page">
      <PageHeader
        title="Guardar no vão"
        description={descricao}
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

      <div className="tabs" role="tablist" aria-label="Ordem de leitura" style={{ maxWidth: '36rem' }}>
        <button
          type="button"
          role="tab"
          className={`tab${ordem === 'volume_primeiro' ? ' active' : ''}`}
          aria-selected={ordem === 'volume_primeiro'}
          onClick={() => trocarOrdem('volume_primeiro')}
        >
          Volume → vão
        </button>
        <button
          type="button"
          role="tab"
          className={`tab${ordem === 'vao_primeiro' ? ' active' : ''}`}
          aria-selected={ordem === 'vao_primeiro'}
          onClick={() => trocarOrdem('vao_primeiro')}
        >
          Vão → volume
        </button>
      </div>
      <p className="catalogo-tab-hint" style={{ maxWidth: '36rem', marginTop: '-0.5rem' }}>
        {ordem === 'vao_primeiro'
          ? 'Útil na estante: fixa o vão e lê vários volumes seguidos.'
          : 'Útil com o volume na mão: lê o volume e depois o vão onde guardou.'}
      </p>

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
          {campos}

          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={busy || !canWrite}>
              {submitLabel}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => {
                limparLeitura();
                setMsg(null);
                focusPrimeiro();
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
        barras USB funciona nestes campos (Enter ao final). A API recebe os dois QRs em qualquer ordem;
        a tela só organiza o fluxo no chão.
      </p>
    </div>
  );
}
