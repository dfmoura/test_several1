import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { EstoqueQrFilaPanel } from '../components/EstoqueQrFilaPanel';
import { useEstoqueQrFila } from '../hooks/useEstoqueQrFila';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { EstoqueQrVolumeInfo } from '../lib/estoqueQrFila';

/**
 * WMS leve — amarra volume(s) (VOL) ↔ local (END).
 * Fluxo: montar fila de 1+ volumes → confirmar local → Guardar (N POSTs).
 * Duas ordens só mudam o foco no chão; o vínculo é sempre posterior e em lote.
 */
export function EstoqueGuardarPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('estoque.escrever');
  const qr = useEstoqueQrFila({ canWrite });

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
            <Link className="btn btn-secondary" to="/estoque/lotes/etiquetas">
              Reimprimir volumes
            </Link>
          </>
        }
      />

      <EstoqueModuleNav />

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
