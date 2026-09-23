import type { EntregaPreview } from '../lib/api';
import { formatDestinoLinha, modoEntregaLabel } from '../lib/expedicaoUi';

type Item = {
  key: string;
  label: string;
  ok: boolean;
  detalhe: string;
  trava: boolean;
};

function itens(preview: EntregaPreview): Item[] {
  const bloqueios = preview.bloqueios ?? [];
  const fatOk = Boolean(preview.faturamento?.id) && !bloqueios.some((b) => b.includes('faturamento'));
  const pedFat = preview.pedido?.status === 'FATURADO' || Boolean(preview.faturamento?.id);
  const nfBloqueio = bloqueios.find((b) => /nota|NF|hub|autoriz/i.test(b));
  const nfe = preview.nfe;
  const dest = formatDestinoLinha(preview.destino);
  const destOk = Boolean(preview.destino?.label || (dest && dest !== '—'));

  return [
    {
      key: 'fat',
      label: 'Faturamento',
      ok: pedFat && fatOk,
      detalhe: preview.faturamento?.codigo ?? 'Pedido ainda não faturado.',
      trava: !pedFat || !fatOk,
    },
    {
      key: 'nf',
      label: 'Nota',
      ok: !nfBloqueio && Boolean(nfe),
      detalhe: nfBloqueio ?? (nfe ? `${nfe.codigo}${nfe.status ? ` · ${nfe.status}` : ''}` : 'Nota ainda sem documento.'),
      trava: Boolean(nfBloqueio),
    },
    {
      key: 'destino',
      label: modoEntregaLabel(preview.modo),
      ok: destOk,
      detalhe: destOk ? dest : 'Destino não informado no pedido.',
      trava: false,
    },
  ];
}

/**
 * Espelho do preview — não é segunda regra de pronto.
 * Embalagem e cobrança não travam o despacho.
 */
export function ExpedicaoLacunas({ preview }: { preview: EntregaPreview }) {
  if (preview.entrega && (preview.entrega.status === 'AGUARDA_RETIRADA' || preview.entrega.status === 'EM_TRANSITO')) {
    return null;
  }

  const rows = itens(preview);
  const faltas = (preview.bloqueios ?? []).length > 0 || rows.some((r) => r.trava && !r.ok);
  const emb = preview.embalagem;

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <div className="form-section">
          <h3>{faltas ? 'O que falta para expedir' : 'Pronto para expedir'}</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Só o que o romaneio exige. Embalagem e cobrança saem no envelope — não bloqueiam.
          </p>
        </div>
        <ul className="form-hint" style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {rows.map((r) => (
            <li key={r.key} className={r.trava && !r.ok ? 'form-error' : undefined} style={{ marginBottom: '0.35rem' }}>
              <strong>{r.ok ? 'Ok' : r.trava ? 'Falta' : 'Atenção'}</strong>
              {` · ${r.label} — ${r.detalhe}`}
            </li>
          ))}
        </ul>
        {(preview.bloqueios ?? []).map((b) => (
          <p key={b} className="form-error" style={{ marginBottom: 0 }}>
            {b}
          </p>
        ))}
        {!emb ? (
          <p className="form-hint" style={{ marginBottom: 0 }}>
            Embalagem PA ainda sem confirmação na OP — etiquetas BOB/CX ficam para depois.
          </p>
        ) : null}
      </div>
    </div>
  );
}
