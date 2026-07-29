/**
 * Code 128C — barcode da chave de acesso NF-e (44 dígitos).
 * Padrão DANFE / Manual de Orientação do Contribuinte.
 */

/** Padrões de barras (B=barra, S=espaço) para valores 0–106. */
const PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212",
  "221213", "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221",
  "223211", "221132", "221231", "213212", "223112", "312131", "311222", "321122", "321221",
  "312212", "322112", "322211", "212123", "212321", "232121", "111323", "131123", "131321",
  "112313", "132113", "132311", "211313", "231113", "231311", "112133", "112331", "132131",
  "113123", "113321", "133121", "313121", "211331", "231131", "213113", "213311", "213131",
  "311123", "311321", "331121", "312113", "312311", "332111", "314111", "221411", "431111",
  "111224", "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", "111242",
  "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311",
  "113141", "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_C = 105;
const STOP = 106;

/** Converte dígitos (par) em sequência de módulos (larguras). */
export function encodeCode128C(digits: string): number[] {
  const d = digits.replace(/\D/g, "");
  if (!d.length || d.length % 2 !== 0) {
    throw new Error("Code 128C requer quantidade par de dígitos");
  }
  const values: number[] = [START_C];
  for (let i = 0; i < d.length; i += 2) {
    values.push(Number(d.slice(i, i + 2)));
  }
  let checksum = values[0];
  for (let i = 1; i < values.length; i++) {
    checksum += values[i] * i;
  }
  values.push(checksum % 103);
  values.push(STOP);

  const modules: number[] = [];
  for (const v of values) {
    const pat = PATTERNS[v];
    for (const ch of pat) modules.push(Number(ch));
  }
  return modules;
}

/**
 * Desenha Code 128C em PDFKit (barras pretas sobre fundo branco implícito).
 */
export function drawCode128C(
  doc: PDFKit.PDFDocument,
  digits: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const modules = encodeCode128C(digits);
  const total = modules.reduce((a, b) => a + b, 0);
  const unit = width / total;
  let cx = x;
  let bar = true;
  doc.save();
  doc.fillColor("#000000");
  for (const w of modules) {
    const bw = w * unit;
    if (bar) doc.rect(cx, y, bw, height).fill();
    cx += bw;
    bar = !bar;
  }
  doc.restore();
}
