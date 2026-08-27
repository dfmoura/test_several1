type PdfDoc = {
  save(): PdfDoc;
  restore(): PdfDoc;
  fillColor(color: string): PdfDoc;
  rect(x: number, y: number, w: number, h: number): PdfDoc;
  fill(): PdfDoc;
};

/** Code128 patterns (107 symbols) — bars=1 spaces=0, 11 modules each */
const CODE128 = [
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

function encodeCode128C(digits: string): number[] {
  if (!/^\d+$/.test(digits) || digits.length % 2 !== 0) {
    throw new Error('Code128C exige quantidade par de dígitos');
  }
  const codes: number[] = [START_C];
  for (let i = 0; i < digits.length; i += 2) {
    codes.push(Number(digits.slice(i, i + 2)));
  }
  let checksum = START_C;
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i]! * i;
  }
  codes.push(checksum % 103);
  codes.push(STOP);
  return codes;
}

export function drawCode128(
  doc: PdfDoc,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
): void {
  const codes = encodeCode128C(text);
  let modules = 0;
  for (const code of codes) {
    modules += CODE128[code]!.length;
  }
  modules += 13; // stop extra bar

  const moduleW = width / modules;
  let cx = x;
  doc.save();
  doc.fillColor('#000000');

  for (const code of codes) {
    const pattern = CODE128[code]!;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === '1') {
        doc.rect(cx, y, moduleW, height).fill();
      }
      cx += moduleW;
    }
  }
  // stop pattern trailing bar (part of STOP symbol in table)
  doc.restore();
}
