import type { EstoqueEndereco } from '../lib/api';

type Props = {
  endereco: Pick<EstoqueEndereco, 'codigo' | 'prateleira' | 'coluna' | 'vao'>;
  qrDataUrl: string | null;
};

/**
 * Face física 50×40 mm do vão — Elgin L42 Pro Full (mesmo canal do volume, ADR F4).
 * Código legível + QR END:… para Guardar.
 */
export function VaoEtiquetaSheet({ endereco, qrDataUrl }: Props) {
  return (
    <article className="vao-etiqueta-sheet" aria-label={`Etiqueta local ${endereco.codigo}`}>
      <div className="vao-etiqueta-face">
        <div className="vao-etiqueta-qr">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="" width={240} height={240} />
          ) : (
            <div className="vao-etiqueta-qr-ph" aria-hidden />
          )}
        </div>
        <div className="vao-etiqueta-meta">
          <div className="vao-etiqueta-codigo">{endereco.codigo}</div>
          <div className="vao-etiqueta-row">
            <span className="vao-etiqueta-k">Prat.</span> {String(endereco.prateleira).padStart(2, '0')}
          </div>
          <div className="vao-etiqueta-row">
            <span className="vao-etiqueta-k">Col.</span> {String(endereco.coluna).padStart(2, '0')}
          </div>
          <div className="vao-etiqueta-row">
            <span className="vao-etiqueta-k">Local</span> {String(endereco.vao).padStart(2, '0')}
          </div>
          <div className="vao-etiqueta-row vao-etiqueta-row--muted">Local · estante</div>
        </div>
      </div>
    </article>
  );
}
