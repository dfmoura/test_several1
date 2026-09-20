/**
 * Code 128 subset C → SVG para o bloco “Chave de acesso” do DANFE (MOC NF-e).
 * Sem dependência npm: barras vetoriais, imprimem no HTML/PDF do navegador.
 *
 * Entrada: somente dígitos, comprimento par (chave NF-e = 44).
 * Padrões: tabela Code 128 (mesma de JsBarcode / GS1).
 */

/** 107 símbolos: 0–102 dados, 103–105 start A/B/C, 106 stop (+ barra final). */
const BARS: readonly string[] = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
  '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
  '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
  '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
  '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
  '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
  '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
  '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
  '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
  '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
  '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
  '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
  '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
  '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
  '11010011100', '1100011101011',
];

const START_C = 105;
const STOP = 106;
const MODULO = 103;

export type Code128SvgOpts = {
  /** Altura das barras (px CSS). Default 38 ≈ 10 mm na DANFE A4. */
  height?: number;
  /** Largura do módulo (px). Default 1.15. */
  module?: number;
  className?: string;
};

/**
 * SVG Code 128C da chave (só dígitos, comprimento par).
 * Retorna null se a entrada for inválida.
 */
export function code128CSvg(digits: string, opts: Code128SvgOpts = {}): string | null {
  const d = digits.replace(/\D/g, '');
  if (d.length < 2 || d.length % 2 !== 0 || BARS.length !== 107) {
    return null;
  }

  const codes: number[] = [START_C];
  for (let i = 0; i < d.length; i += 2) {
    codes.push(Number.parseInt(d.slice(i, i + 2), 10));
  }

  let checksum = codes[0]!;
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i]! * i;
  }
  codes.push(checksum % MODULO);
  codes.push(STOP);

  const module = opts.module ?? 1.15;
  const height = opts.height ?? 38;
  const quiet = module * 10;

  let binary = '';
  for (const code of codes) {
    binary += BARS[code] ?? '';
  }

  const bars: string[] = [];
  let x = quiet;
  for (let i = 0; i < binary.length; i++) {
    const w = module;
    if (binary[i] === '1') {
      bars.push(`<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${height}" fill="#000"/>`);
    }
    x += w;
  }
  const width = x + quiet;
  const cls = opts.className ? ` class="${opts.className}"` : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg"${cls} width="100%" height="${height}" ` +
    `viewBox="0 0 ${width.toFixed(2)} ${height}" preserveAspectRatio="none" ` +
    `role="img" aria-label="Código de barras da chave de acesso NF-e">` +
    `<rect width="100%" height="100%" fill="#fff"/>${bars.join('')}</svg>`
  );
}

/** Formata a chave 44 em grupos de 4 (exibição DANFE). */
export function formatarChaveAcessoNfe(chave: string | null | undefined): string {
  const d = (chave ?? '').replace(/\D/g, '');
  if (d.length !== 44) return '';
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/** Portal nacional — texto canônico do DANFE (MOC NF-e). */
export const NFE_PORTAL_CONSULTA_HOST = 'www.nfe.fazenda.gov.br/portal';

export const NFE_PORTAL_CONSULTA_URL = 'https://www.nfe.fazenda.gov.br/portal';

export const NFE_PORTAL_CONSULTA_TEXTO =
  'Consulta de autenticidade no portal nacional da NF-e ' +
  NFE_PORTAL_CONSULTA_HOST +
  ' ou no site da SEFAZ Autorizadora.';
