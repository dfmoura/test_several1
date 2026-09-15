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
 * WMS leve — amarra volume(s) (VOL) ↔ local (END).
 * Fluxo: montar fila de 1+ volumes → confirmar local → Guardar (N POSTs).
 * Duas ordens só mudam o foco no chão; o vínculo é sempre posterior e em lote.
 */
export function EstoqueGuardarPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('estoque.escrever');
  const volRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  const [ordem, setOrdem] = useState<OrdemLeitura>('volume_primeiro');
  const [volumeQr, setVolumeQr] = useState('');
  const [enderecoQr, setEnderecoQr] = useState('');
  const [fila, setFila] = useState<VolumeInfo[]>([]);
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

  useEffect(() => {
    volRef.current?.focus();
  }, []);

  const limparTudo = (opts?: { manterVao?: boolean; manterFila?: boolean }) => {
    setVolumeQr('');
    setError(null);
    if (!opts?.manterFila) {
      setFila([]);
    }
    if (!opts?.manterVao) {
      setEndereco(null);
      setEnderecoQr('');
    }
  };

  const trocarOrdem = (nova: OrdemLeitura) => {
    if (nova === ordem) return;
    setOrdem(nova);
    setMsg(null);
    setError(null);
    setVolumeQr('');
    // Mantém fila e local — só muda a ordem de leitura no chão.
    focusPrimeiro(nova);
  };

  const adicionarVolume = async (payload: string) => {
    const p = payload.trim();
    if (!p) return;
    if (p.toUpperCase().startsWith('END:')) {
      setError('Esse QR é de local (END:…). Use o campo do local.');
      volRef.current?.select();
      return;
    }
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const res = await api.get<{ data: VolumeInfo }>(
        `/estoque/volumes/por-qr?payload=${encodeURIComponent(p)}`,
      );
      const vol = res.data;
      if (fila.some((v) => v.lote_id === vol.lote_id)) {
        setError(`Volume ${vol.codigo} já está na fila.`);
        setVolumeQr('');
        setTimeout(() => volRef.current?.focus(), 50);
        return;
      }
      const item = { ...vol, qr_payload: vol.qr_payload || p };
      setFila((prev) => [...prev, item]);
      setMsg(
        `Volume ${vol.codigo} na fila (${fila.length + 1}). Continue lendo ou vincule ao local.`,
      );
      setVolumeQr('');
      setTimeout(() => volRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Volume não reconhecido.');
      volRef.current?.select();
    } finally {
      setBusy(false);
    }
  };

  const removerDaFila = (loteId: number) => {
    setFila((prev) => prev.filter((v) => v.lote_id !== loteId));
    setError(null);
    setMsg(null);
    setTimeout(() => volRef.current?.focus(), 50);
  };

  const resolverLocal = async (payload: string) => {
    const p = payload.trim();
    if (!p) return;
    if (p.toUpperCase().startsWith('VOL:')) {
      setError('Esse QR é de volume (VOL:…). Use o campo do volume para incluir na fila.');
      endRef.current?.select();
      return;
    }
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const res = await api.get<{ data: EnderecoInfo }>(
        `/estoque/enderecos/por-qr?payload=${encodeURIComponent(p)}`,
      );
      setEndereco(res.data);
      setEnderecoQr(p);
      const n = fila.length;
      setMsg(
        n > 0
          ? `Local ${res.data.codigo} confirmado. Pronto para guardar ${n} volume${n === 1 ? '' : 's'}.`
          : `Local ${res.data.codigo} confirmado. Inclua 1 ou mais volumes na fila.`,
      );
      setTimeout(() => volRef.current?.focus(), 50);
    } catch (err) {
      setEndereco(null);
      setError(err instanceof ApiError ? err.message : 'Local não reconhecido.');
      endRef.current?.select();
    } finally {
      setBusy(false);
    }
  };

  const guardarFila = async () => {
    if (!canWrite) {
      setError('Sem permissão estoque.escrever.');
      return;
    }
    if (fila.length === 0) {
      setError('Inclua ao menos 1 volume na fila.');
      volRef.current?.focus();
      return;
    }
    const endPayload = (endereco?.qr_payload || enderecoQr).trim();
    if (!endereco || !endPayload) {
      setError('Confirme o local (QR END:…) antes de vincular.');
      endRef.current?.focus();
      return;
    }

    setBusy(true);
    setError(null);
    setMsg(null);

    const ok: string[] = [];
    const falhas: { codigo: string; motivo: string }[] = [];
    const restantes: VolumeInfo[] = [];

    for (const vol of fila) {
      const vQr = (vol.qr_payload || '').trim();
      if (!vQr) {
        falhas.push({ codigo: vol.codigo, motivo: 'QR ausente' });
        restantes.push(vol);
        continue;
      }
      try {
        await api.post<{ data: VolumeInfo }>('/estoque/guardar', {
          volume_qr: vQr,
          endereco_qr: endPayload,
        });
        ok.push(vol.codigo);
      } catch (err) {
        falhas.push({
          codigo: vol.codigo,
          motivo: err instanceof ApiError ? err.message : 'Falha ao guardar',
        });
        restantes.push(vol);
      }
    }

    setFila(restantes);
    setBusy(false);

    const localCodigo = endereco.codigo;
    if (falhas.length === 0) {
      setMsg(
        ok.length === 1
          ? `Volume ${ok[0]} guardado em ${localCodigo}. Inclua mais volumes ou troque o local.`
          : `${ok.length} volumes guardados em ${localCodigo}. Inclua mais volumes ou troque o local.`,
      );
      setTimeout(() => volRef.current?.focus(), 50);
      return;
    }

    if (ok.length > 0) {
      setMsg(`${ok.length} volume(s) em ${localCodigo}. ${falhas.length} pendente(s) na fila.`);
    }
    setError(
      falhas.map((f) => `${f.codigo}: ${f.motivo}`).join(' · '),
    );
    setTimeout(() => volRef.current?.focus(), 50);
  };

  const onVolKey = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      void adicionarVolume(volumeQr);
    }
  };

  const onEndKey = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      void resolverLocal(enderecoQr);
    }
  };

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    // Enter no formulário: se há QR de volume digitado, inclui; senão tenta guardar a fila.
    if (volumeQr.trim()) {
      void adicionarVolume(volumeQr);
      return;
    }
    if (!endereco && enderecoQr.trim()) {
      void resolverLocal(enderecoQr);
      return;
    }
    void guardarFila();
  };

  const nFila = fila.length;
  const podeGuardar = nFila > 0 && Boolean(endereco) && canWrite && !busy;

  const descricao =
    ordem === 'vao_primeiro'
      ? '1) Local · 2) Inclua 1+ volumes na fila · 3) Guardar — vínculo só no confirmar'
      : '1) Inclua 1+ volumes na fila · 2) Local · 3) Guardar — vínculo só no confirmar';

  const labelVol = ordem === 'vao_primeiro' ? '2. Incluir volume (VOL:…)' : '1. Incluir volume (VOL:…)';
  const labelEnd = ordem === 'vao_primeiro' ? '1. Local (END:…)' : '2. Local (END:…)';

  const submitLabel = busy
    ? 'Processando…'
    : volumeQr.trim()
      ? 'Incluir na fila'
      : podeGuardar
        ? nFila === 1
          ? `Guardar 1 volume em ${endereco!.codigo}`
          : `Guardar ${nFila} volumes em ${endereco!.codigo}`
        : nFila === 0
          ? 'Inclua volumes na fila'
          : !endereco
            ? 'Confirme o local'
            : 'Guardar';

  const submitDisabled =
    busy ||
    !canWrite ||
    (!volumeQr.trim() && !podeGuardar);

  const campoVolume = (
    <div className="form-group" key="vol">
      <label htmlFor="volume_qr">{labelVol}</label>
      <input
        id="volume_qr"
        ref={volRef}
        value={volumeQr}
        onChange={(e) => setVolumeQr(e.target.value)}
        onKeyDown={onVolKey}
        placeholder="Leia o QR — Enter inclui na fila (não vincula ainda)"
        autoComplete="off"
        disabled={busy || !canWrite}
      />
    </div>
  );

  const campoVao = (
    <div className="form-group" key="end">
      <label htmlFor="endereco_qr">{labelEnd}</label>
      <input
        id="endereco_qr"
        ref={endRef}
        value={enderecoQr}
        onChange={(e) => setEnderecoQr(e.target.value)}
        onKeyDown={onEndKey}
        placeholder={
          endereco
            ? 'Local ativo — leia outro END para trocar'
            : 'Leia o QR do local (vínculo só ao Guardar)'
        }
        autoComplete="off"
        disabled={busy || !canWrite}
      />
    </div>
  );

  const previewVao = endereco ? (
    <div className="alert alert-info" style={{ margin: 0 }} key="end-prev">
      <strong>Local {endereco.codigo}</strong>
      <div className="muted">
        Prat. {endereco.prateleira} · Col. {endereco.coluna} · Local {endereco.vao}
        {nFila > 0 ? ` · ${nFila} volume${nFila === 1 ? '' : 's'} na fila` : ' · aguardando volumes'}
      </div>
    </div>
  ) : null;

  const listaFila =
    nFila > 0 ? (
      <div key="fila" style={{ display: 'grid', gap: '0.5rem' }}>
        <div className="muted" style={{ fontSize: '0.9rem' }}>
          Fila — {nFila} volume{nFila === 1 ? '' : 's'} (ainda sem vínculo
          {endereco ? `; destino ${endereco.codigo}` : ''})
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Volume</th>
                <th>Produto</th>
                <th>Qtde</th>
                <th>Hoje</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fila.map((v, idx) => (
                <tr key={v.lote_id}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>{v.codigo}</strong>
                    {(v.nf_numero || v.data_entrada) && (
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        NF {v.nf_numero ?? '—'}
                        {v.data_entrada ? ` · ${formatDate(v.data_entrada)}` : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    {v.produto ? (
                      <>
                        <strong>{v.produto.codigo}</strong>
                        <div className="muted" style={{ fontSize: '0.85rem' }}>
                          {v.produto.descricao_fiscal}
                        </div>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {formatQty(v.qtde)} {v.unidade}
                  </td>
                  <td className="muted">{v.endereco?.codigo ?? 'sem local'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={() => removerDaFila(v.lote_id)}
                      aria-label={`Remover volume ${v.codigo} da fila`}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ) : (
      <p className="muted" key="fila-vazia" style={{ margin: 0 }}>
        Nenhum volume na fila. Leia 1 ou mais QRs de volume (Enter) antes de vincular ao local.
      </p>
    );

  const campos =
    ordem === 'vao_primeiro'
      ? [campoVao, previewVao, campoVolume, listaFila]
      : [campoVolume, listaFila, campoVao, previewVao];

  return (
    <div className="page">
      <PageHeader
        title="Guardar no local"
        description={descricao}
        actions={
          <>
            <Link className="btn btn-secondary" to="/estoque">
              Estoque
            </Link>
            <Link className="btn btn-secondary" to="/estoque/enderecos/etiquetas">
              Etiquetas dos locais
            </Link>
            <Link className="btn btn-secondary" to="/estoque/lotes/etiquetas">
              Reimprimir volumes
            </Link>
          </>
        }
      />

      <EstoqueModuleNav />

      <div className="tabs" role="tablist" aria-label="Ordem de leitura" style={{ maxWidth: '42rem' }}>
        <button
          type="button"
          role="tab"
          className={`tab${ordem === 'volume_primeiro' ? ' active' : ''}`}
          aria-selected={ordem === 'volume_primeiro'}
          onClick={() => trocarOrdem('volume_primeiro')}
        >
          Volume → local
        </button>
        <button
          type="button"
          role="tab"
          className={`tab${ordem === 'vao_primeiro' ? ' active' : ''}`}
          aria-selected={ordem === 'vao_primeiro'}
          onClick={() => trocarOrdem('vao_primeiro')}
        >
          Local → volume
        </button>
      </div>
      <p className="catalogo-tab-hint" style={{ maxWidth: '42rem', marginTop: '-0.5rem' }}>
        {ordem === 'vao_primeiro'
          ? 'Na estante: confirme o local, monte a fila de volumes e só então Guardar.'
          : 'Com volumes em mãos: monte a fila, confirme o local e só então Guardar.'}{' '}
        O vínculo não acontece na leitura — só no botão Guardar.
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

      <form onSubmit={onSubmit} className="card" style={{ maxWidth: '42rem', marginBottom: '1rem' }}>
        <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
          {campos}

          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={submitDisabled}>
              {submitLabel}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || !podeGuardar}
              onClick={() => {
                void guardarFila();
              }}
              title={
                !endereco
                  ? 'Confirme o local antes'
                  : nFila === 0
                    ? 'Inclua volumes na fila'
                    : undefined
              }
            >
              Vincular fila ao local
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => {
                limparTudo();
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

      <p className="muted" style={{ maxWidth: '42rem' }}>
        Leitor USB / paste + Enter. Cada volume entra na fila sem amarrar; o local é só o destino. Guardar
        envia um vínculo por volume (mesma API). Falha parcial deixa os pendentes na fila.
      </p>
    </div>
  );
}
