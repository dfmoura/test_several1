import type { OpPartidaPreview } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { formatQtdePick } from '../lib/producaoPick';
import { parseQtdeDigitada } from '../lib/producaoUi';

type Props = {
  preview?: OpPartidaPreview;
  /** Vários planos (ex.: 2 bobinas medida exata) → um quadro só. */
  previews?: OpPartidaPreview[];
  /** Título curto acima da tabela. */
  titulo?: string;
  className?: string;
};

function mm(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  return `${formatDecimalBr(v, 1, { stripTrailingZeros: true })} mm`;
}

function metros(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  return `${formatDecimalBr(v, 1, { stripTrailingZeros: true })} m`;
}

function area(v: string | null | undefined): string {
  const n = parseQtdeDigitada(v);
  return n > 0 ? formatQtdePick(n, 'm²') : '—';
}

type Linha = { key: string; destino: string; L: string; C: string; m2: string; volta: boolean };

/**
 * Quadro canônico da partida/Passa: 1 consome (só se C_u>0) + N que voltam.
 * Não inventa bobina de estoque para a faixa de produção (ADR: SAIDA do pai inteiro).
 * Com N planos de medida exata: uma linha de consumo total + uma linha por bobina física.
 */
export function PartidaDivisaoQuadro({
  preview,
  previews,
  titulo = 'Divisão da bobina',
  className,
}: Props) {
  const lista =
    previews && previews.length > 0 ? previews : preview ? [preview] : [];
  if (lista.length === 0) return null;

  const linhas: Linha[] = [];
  let somaCu = 0;
  let somaCons = 0;
  let L_n: string | null = null;
  let L_p: string | null = null;
  let C_pMax = 0;

  for (const p of lista) {
    const cu = parseQtdeDigitada(p.C_u);
    const cons = parseQtdeDigitada(p.area_consumida);
    if (cu > 1e-6) somaCu += cu;
    if (cons > 1e-6) somaCons += cons;
    if (!L_n && p.L_n) L_n = p.L_n;
    if (!L_p && p.L_p) L_p = p.L_p;
    const cp = parseQtdeDigitada(p.C_p);
    if (cp > C_pMax) C_pMax = cp;
  }

  // Produção só quando há consumo real — C_u "0.00" não abre linha fantasma.
  if (somaCu > 1e-6 && L_n) {
    linhas.push({
      key: 'producao',
      destino: 'Produção (consome)',
      L: mm(L_n),
      C: metros(String(somaCu)),
      m2: somaCons > 1e-6 ? formatQtdePick(somaCons, 'm²') : '—',
      volta: false,
    });
  }

  let idxVolta = 0;
  for (const p of lista) {
    if (p.refile && parseQtdeDigitada(p.refile.qtde) > 0) {
      idxVolta += 1;
      linhas.push({
        key: `refile-${idxVolta}-${p.L_p}-${p.C_p}`,
        destino: lista.length > 1 ? `Volta · refile (${idxVolta})` : 'Volta · refile',
        L: mm(p.refile.largura_mm),
        C: metros(p.refile.comprimento_m),
        m2: area(p.refile.area_m2 ?? p.refile.qtde),
        volta: true,
      });
    }
    if (p.sobra && parseQtdeDigitada(p.sobra.qtde) > 0) {
      idxVolta += 1;
      const cu = parseQtdeDigitada(p.C_u);
      const inteira = cu <= 1e-6;
      const rotulo =
        lista.length > 1
          ? inteira
            ? `Volta · bobina inteira (${idxVolta})`
            : `Volta · sobra (${idxVolta})`
          : inteira
            ? 'Volta · bobina inteira'
            : 'Volta · sobra (Passa)';
      linhas.push({
        key: `sobra-${idxVolta}-${p.sobra.largura_mm}-${p.sobra.comprimento_m}`,
        destino: rotulo,
        L: mm(p.sobra.largura_mm),
        C: metros(p.sobra.comprimento_m),
        m2: area(p.sobra.area_m2 ?? p.sobra.qtde),
        volta: true,
      });
    }
  }

  if (linhas.length === 0) return null;

  const pai =
    L_p && C_pMax > 0
      ? lista.length > 1
        ? `${lista.length} bobinas · ${mm(L_p)}`
        : `${mm(L_p)} × ${metros(String(C_pMax))}`
      : null;

  return (
    <div className={className ?? 'orc-faixas-bloco'} style={{ marginTop: '0.4rem' }}>
      <p className="form-hint" style={{ marginTop: 0, marginBottom: '0.3rem' }}>
        <strong>{titulo}</strong>
        {pai ? ` — ${pai}` : ''}
        . A produção consome a faixa do papel; cada linha de volta é uma bobina física (mesmo SKU).
      </p>
      <div className="table-wrap op-insumo-linha">
        <table className="data-table" style={{ fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th>Destino</th>
              <th>Largura</th>
              <th>Metro linear</th>
              <th className="num">m²</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.key}>
                <td>
                  <span
                    title={
                      l.volta
                        ? 'Retorna ao estoque após confirmar'
                        : 'Não gera volume de estoque'
                    }
                  >
                    {l.destino}
                  </span>
                </td>
                <td>{l.L}</td>
                <td>{l.C}</td>
                <td className="num">{l.m2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
