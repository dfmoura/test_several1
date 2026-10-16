import type { EstoqueEndereco } from '../lib/api';

type Props = {
  endereco: Pick<EstoqueEndereco, 'codigo' | 'nome'>;
  qrDataUrl: string | null;
};

/**
 * Face física 50×40 mm do local — Elgin L42 Pro Full (mesmo canal do volume).
 * Código L00000001 + QR END:… para Guardar.
 */
export function VaoEtiquetaSheet({ endereco, qrDataUrl }: Props) {
  const nome = endereco.nome?.trim() ?? '';

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
          {nome !== '' && <div className="vao-etiqueta-row">{nome}</div>}
          <div className="vao-etiqueta-row vao-etiqueta-row--muted">Local</div>
        </div>
      </div>
    </article>
  );
}
