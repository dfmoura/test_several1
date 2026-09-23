import { hrefEtiquetasEmbalagem, hrefFichaCobranca, hrefFichaNfe } from '../lib/cobrancaUi';
import { hrefRomaneio } from '../lib/expedicaoUi';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { formatCurrency } from '../lib/format';

type TituloKit = {
  id: number;
  codigo: string;
  saldo: string;
};

type NfeKit = {
  faturamento_id: number;
  documento_id: number;
  codigo?: string;
};

type EmbalagemKit = {
  id: number;
  codigo?: string;
};

type Props = {
  entregaId?: number | null;
  faturamentoId?: number | null;
  nfe?: NfeKit | null;
  titulos?: TituloKit[] | null;
  embalagem?: EmbalagemKit | null;
};

/**
 * Três papéis do despacho: romaneio, DANFE/prévia, cobrança + etiquetas BOB/CX.
 * Só abre fichas existentes. Não baixa título.
 */
export function DocumentosSaidaKit({
  entregaId,
  faturamentoId,
  nfe,
  titulos,
  embalagem,
}: Props) {
  const fatId = faturamentoId ?? nfe?.faturamento_id ?? null;
  const cobrancas = fatId ? (titulos ?? []) : [];
  const temAlgo = Boolean(entregaId || (fatId && nfe) || cobrancas.length || embalagem);
  if (!temAlgo) {
    return null;
  }

  return (
    <div className="form-section" style={{ marginTop: '1rem' }}>
      <h3>Documentos da saída</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Embalagem no volume, nota e cobrança no envelope. Confirmar a entrega não quita o título.
      </p>
      <div className="btn-row" style={{ flexWrap: 'wrap' }}>
        {entregaId ? (
          <a
            href={hrefRomaneio(entregaId)}
            className="btn btn-secondary"
            onClick={(e) => onAbrirFichaClick(e, hrefRomaneio(entregaId))}
          >
            Imprimir romaneio
          </a>
        ) : null}
        {fatId && nfe ? (
          <a
            href={hrefFichaNfe(fatId, nfe.documento_id)}
            className="btn btn-secondary"
            onClick={(e) => onAbrirFichaClick(e, hrefFichaNfe(fatId, nfe.documento_id))}
          >
            Imprimir nota
          </a>
        ) : null}
        {embalagem ? (
          <a
            href={hrefEtiquetasEmbalagem(embalagem.id)}
            className="btn btn-secondary"
            onClick={(e) => onAbrirFichaClick(e, hrefEtiquetasEmbalagem(embalagem.id))}
          >
            Etiquetas da embalagem
          </a>
        ) : null}
        {cobrancas.map((t) => (
          <a
            key={t.id}
            href={hrefFichaCobranca(fatId as number, t.id)}
            className="btn btn-secondary"
            onClick={(e) => onAbrirFichaClick(e, hrefFichaCobranca(fatId as number, t.id))}
          >
            Imprimir cobrança {t.codigo}
            {Number.parseFloat(t.saldo) > 0 ? ` · ${formatCurrency(t.saldo)}` : ''}
          </a>
        ))}
      </div>
      {!embalagem ? (
        <p className="form-hint">Confirme a embalagem na OP para imprimir BOB/CX neste kit.</p>
      ) : null}
      {fatId && !nfe ? (
        <p className="form-hint">Nota ainda sem documento neste faturamento.</p>
      ) : null}
    </div>
  );
}
