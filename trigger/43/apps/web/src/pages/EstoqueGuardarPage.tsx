import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { EstoqueQrFilaPanel } from '../components/EstoqueQrFilaPanel';
import { useEstoqueQrFila } from '../hooks/useEstoqueQrFila';
import { api, ApiError, type EstoqueLote } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { EstoqueQrVolumeInfo } from '../lib/estoqueQrFila';

async function contarVolumesSemLocal(): Promise<number | null> {
  try {
    const res = await api.get<{ data: EstoqueLote[] }>('/estoque/lotes?com_qtde=1');
    return res.data.filter((l) => l.endereco_id == null && Number(l.qtde) > 0).length;
  } catch {
    return null;
  }
}

/**
 * WMS leve — amarra volume(s) (VOL) ↔ local (END).
 * Fluxo: montar fila de 1+ volumes → confirmar local → Guardar (N POSTs).
 * Duas ordens só mudam o foco no chão; o vínculo é sempre posterior e em lote.
 */
export function EstoqueGuardarPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('estoque.escrever');
  const qr = useEstoqueQrFila({ canWrite });
  const [pendentesSemLocal, setPendentesSemLocal] = useState<number | null>(null);

  useEffect(() => {
    void contarVolumesSemLocal().then(setPendentesSemLocal);
  }, []);

  const guardarFila = async () => {
    if (!canWrite) {
      qr.setError('Sem permissão estoque.escrever.');
      return;
    }
    if (qr.fila.length === 0) {
      qr.setError('Inclua ao menos 1 volume na fila.');
      qr.volRef.current?.focus();
      return;
    }
    const endPayload = (qr.endereco?.qr_payload || qr.enderecoQr).trim();
    if (!qr.endereco || !endPayload) {
      qr.setError('Confirme o local (QR END:…) antes de vincular.');
      qr.endRef.current?.focus();
      return;
    }

    qr.setBusy(true);
    qr.setError(null);
    qr.setMsg(null);

    const ok: string[] = [];
    const falhas: { codigo: string; motivo: string }[] = [];
    const restantes: EstoqueQrVolumeInfo[] = [];

    for (const vol of qr.fila) {
      const vQr = (vol.qr_payload || '').trim();
      if (!vQr) {
        falhas.push({ codigo: vol.codigo, motivo: 'QR ausente' });
        restantes.push(vol);
        continue;
      }
      try {
        await api.post<{ data: EstoqueQrVolumeInfo }>('/estoque/guardar', {
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

    qr.setFila(restantes);
    qr.setBusy(false);

    if (ok.length > 0) {
      void contarVolumesSemLocal().then(setPendentesSemLocal);
    }

    const localCodigo = qr.endereco.codigo;
    if (falhas.length === 0) {
      qr.setMsg(
        ok.length === 1
          ? `Volume ${ok[0]} guardado em ${localCodigo}. Inclua mais volumes ou troque o local.`
          : `${ok.length} volumes guardados em ${localCodigo}. Inclua mais volumes ou troque o local.`,
      );
      setTimeout(() => qr.volRef.current?.focus(), 50);
      return;
    }

    if (ok.length > 0) {
      qr.setMsg(`${ok.length} volume(s) em ${localCodigo}. ${falhas.length} pendente(s) na fila.`);
    }
    qr.setError(falhas.map((f) => `${f.codigo}: ${f.motivo}`).join(' · '));
    setTimeout(() => qr.volRef.current?.focus(), 50);
  };

  const nFila = qr.fila.length;
  const confirmLabel =
    qr.endereco && nFila > 0
      ? nFila === 1
        ? `Guardar 1 volume em ${qr.endereco.codigo}`
        : `Guardar ${nFila} volumes em ${qr.endereco.codigo}`
      : 'Guardar';

  const descricao =
    qr.ordem === 'vao_primeiro'
      ? '1) Local · 2) Inclua 1+ volumes na fila · 3) Guardar — vínculo só no confirmar'
      : '1) Inclua 1+ volumes na fila · 2) Local · 3) Guardar — vínculo só no confirmar';

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
            <Link
              className="btn btn-secondary"
              to={
                pendentesSemLocal && pendentesSemLocal > 0
                  ? '/estoque/lotes/etiquetas?sem_endereco=1'
                  : '/estoque/lotes/etiquetas'
              }
            >
              Reimprimir volumes
            </Link>
          </>
        }
      />

      <EstoqueModuleNav />

      {pendentesSemLocal != null && pendentesSemLocal > 0 && (
        <div className="alert alert-warning alert--compact" style={{ marginBottom: '0.75rem' }}>
          {pendentesSemLocal} volume(s) com saldo ainda sem local — leia o QR da bobina e o QR do
          local, depois confirme. Sem etiqueta?{' '}
          <Link to="/estoque/lotes/etiquetas?sem_endereco=1">Imprimir volumes sem local</Link>.
        </div>
      )}

      {pendentesSemLocal === 0 && (
        <div className="alert alert-success alert--compact" style={{ marginBottom: '0.75rem' }}>
          Nenhum volume com saldo sem local. Pode guardar para mudar de prateleira.
        </div>
      )}

      <EstoqueQrFilaPanel
        qr={qr}
        idPrefix="guardar"
        confirmLabel={confirmLabel}
        confirmSecondaryLabel="Vincular fila ao local"
        onConfirm={guardarFila}
        avisarLocalErrado={false}
        hint="Leitor USB / paste + Enter. Cada volume entra na fila sem amarrar; o local é só o destino. Guardar envia um vínculo por volume (mesma API). Falha parcial deixa os pendentes na fila."
      />
    </div>
  );
}
