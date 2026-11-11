import type { OpPartidaPreview } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { formatQtdePick } from '../lib/producaoPick';
import { parseQtdeDigitada } from '../lib/producaoUi';

type Props = {
  preview: OpPartidaPreview;
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

type Linha = { destino: string; L: string; C: string; m2: string; volta: boolean };

/**
 * Quadro canônico da partida/Passa: 1 consome + até 2 que voltam.
 * Não inventa bobina de estoque para a faixa de produção (ADR: SAIDA do pai inteiro).
 */
export function PartidaDivisaoQuadro({
  preview,
  titulo = 'Divisão da bobina',
  className,
}: Props) {
  const linhas: Linha[] = [];
  const L_n = preview.L_n;
  const C_u = preview.C_u;
  if (L_n && C_u) {
    linhas.push({
      destino: 'Produção (consome)',
      L: mm(L_n),
      C: metros(C_u),
      m2: area(preview.area_consumida),
      volta: false,
    });
  }
  if (preview.refile && parseQtdeDigitada(preview.refile.qtde) > 0) {
    linhas.push({
      destino: 'Volta · refile',
      L: mm(preview.refile.largura_mm),
      C: metros(preview.refile.comprimento_m),
      m2: area(preview.refile.area_m2 ?? preview.refile.qtde),
      volta: true,
    });
  }
  if (preview.sobra && parseQtdeDigitada(preview.sobra.qtde) > 0) {
    linhas.push({
      destino: 'Volta · sobra (Passa)',
      L: mm(preview.sobra.largura_mm),
      C: metros(preview.sobra.comprimento_m),
      m2: area(preview.sobra.area_m2 ?? preview.sobra.qtde),
      volta: true,
    });
  }
  if (linhas.length === 0) return null;

  const pai =
    preview.L_p && preview.C_p
      ? `${mm(preview.L_p)} × ${metros(preview.C_p)}`
      : null;

  return (
    <div className={className ?? 'orc-faixas-bloco'} style={{ marginTop: '0.4rem' }}>
      <p className="form-hint" style={{ marginTop: 0, marginBottom: '0.3rem' }}>
        <strong>{titulo}</strong>
        {pai ? ` — bobina ${pai}` : ''}
        . A produção consome a faixa do papel; o que sobra volta ao estoque como bobina(s) nova(s)
        (mesmo SKU).
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
              <tr key={l.destino}>
                <td>
                  <span title={l.volta ? 'Retorna ao estoque após confirmar' : 'Não gera volume de estoque'}>
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
