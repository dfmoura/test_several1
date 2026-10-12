import { useEffect, useState } from 'react';
import { api, type CaixaRoloOpcao } from '../lib/api';

/**
 * Leitura: quais caixas cadastradas acomodam a face do rolo.
 * A escolha grava só a medida. Quantidade e preço continuam os do tubete.
 */
export function CaixaRoloLeitura({
  larguraCm,
  medidaEmUso,
  medidaEscolhida = '',
  onEscolher,
  disabled = false,
}: {
  larguraCm?: number | string | null;
  medidaEmUso: string;
  medidaEscolhida?: string;
  onEscolher?: (medida: string) => void;
  disabled?: boolean;
}) {
  const largura = Number(larguraCm);
  const [linhas, setLinhas] = useState<CaixaRoloOpcao[] | null>(null);
  const [mm, setMm] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(largura) || largura <= 0) {
      setLinhas(null);
      setMm(null);
      return;
    }
    let cancel = false;
    void api
      .get<{ data: { largura_mm: string | null; caixas: CaixaRoloOpcao[] } }>(
        `/orcamentos/caixas-rolo?largura_cm=${encodeURIComponent(String(largura))}`,
      )
      .then((res) => {
        if (cancel) return;
        setMm(res.data.largura_mm);
        setLinhas(res.data.caixas ?? []);
      })
      .catch(() => {
        if (!cancel) setLinhas(null);
      });
    return () => {
      cancel = true;
    };
  }, [largura]);

  if (!Number.isFinite(largura) || largura <= 0 || linhas == null) return null;

  const cabem = linhas.filter((c) => c.cabe);
  const escolha = medidaEscolhida.trim();
  const emUso = medidaEmUso.trim();
  const fora =
    escolha !== '' && !cabem.some((c) => c.medida === escolha)
      ? linhas.find((c) => c.medida === escolha)
      : undefined;
  const face = mm ? `${mm} mm` : `${largura} cm`;

  return (
    <div className="form-group" style={{ marginTop: '0.85rem', maxWidth: 520 }}>
      <label htmlFor="caixa-rolo">Caixas que acomodam este rolo</label>
      <p className="form-hint" style={{ marginTop: 0 }}>
        A face do rolo tem {face} (largura da etiqueta). A quantidade e o preço continuam os do
        tubete. A caixa escolhida é a que a ordem separa.
        {emUso ? ` Em uso: ${emUso}.` : ''}
      </p>
      {linhas.length === 0 ? (
        <p className="form-hint">
          Nenhuma caixa do cadastro tem os três lados. O padrão do tubete permanece.
        </p>
      ) : onEscolher ? (
        <select
          id="caixa-rolo"
          value={escolha}
          disabled={disabled}
          onChange={(e) => onEscolher(e.target.value)}
        >
          <option value="">Padrão do tubete{escolha === '' && emUso ? ` · ${emUso}` : ''}</option>
          {cabem.map((c) => (
            <option key={c.codigo} value={c.medida}>
              {c.codigo} · {c.medida}
            </option>
          ))}
          {fora ? (
            <option value={fora.medida}>
              {fora.codigo} · {fora.medida} · não acomoda a face
            </option>
          ) : null}
        </select>
      ) : cabem.length > 0 ? (
        <p className="form-hint" style={{ marginBottom: 0 }}>
          {cabem.map((c) => `${c.codigo} · ${c.medida}`).join(' · ')}
        </p>
      ) : (
        <p className="form-hint" style={{ marginBottom: 0 }}>
          Nenhuma caixa cadastrada acomoda esta largura. O padrão do tubete permanece.
        </p>
      )}
      {escolha !== '' && fora ? (
        <p className="form-hint">A caixa escolhida é mais curta que a face do rolo.</p>
      ) : null}
    </div>
  );
}
