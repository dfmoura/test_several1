/**
 * Impressão canônica térmica — ADR_CADASTRO_INSUMO_VOLUME F3 (volume) e F4 (vão).
 *
 * Hardware: Elgin L42 Pro Full · mídia 50 × 40 mm.
 * Canal: browser `window.print()` (sem DomPDF / ZPL no monólito).
 * No driver Windows: papel/etiqueta 50×40 mm, escala 100%, sem “ajustar à página”.
 *
 * Volume (F3): identidade da bobina (QR VOL + HRI legível, SKU, lote, dim, NF) — sem vão impresso.
 * Local (F4): localização da estante (QR END + código Pxx-Cxx-Lxx) — mesma mídia/driver.
 */

export const VOLUME_ETIQUETA_PRINTER = {
  model: 'Elgin L42 Pro Full',
  widthMm: 50,
  heightMm: 40,
  /** QR em px altos o suficiente para 203 dpi na mídia (≈22 mm no layout). */
  qrRenderPx: 240,
  qrQuietModules: 1,
  bodyClass: 'etiqueta-volume-print-mode',
  styleId: 'etiqueta-volume-elgin-50x40-page',
} as const;

export const VOLUME_ETIQUETA_PRINT_HINT =
  `${VOLUME_ETIQUETA_PRINTER.model} · ${VOLUME_ETIQUETA_PRINTER.widthMm}×${VOLUME_ETIQUETA_PRINTER.heightMm} mm · escala 100% · sem ajustar à página`;

export type VolumeEtiquetaFace = {
  lote_id: number;
  codigo: string;
  produto: { id: number; codigo: string; descricao_fiscal: string } | null;
  qtde: string;
  unidade: string;
  largura_mm: string | null;
  comprimento_m: string | null;
  nf_numero: string | null;
  data_entrada: string | null;
  endereco: { id: number; codigo: string } | null;
};

/** Exibição: remove zeros à direita sem alterar a precisão persistida. */
function trimDimNum(v: string): string {
  if (!/^-?\d+(\.\d+)?$/.test(v)) return v;
  return v.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

export function formatVolumeDimensao(
  larguraMm: string | null,
  comprimentoM: string | null,
): string {
  if (larguraMm && comprimentoM) {
    return `${trimDimNum(larguraMm)} mm × ${trimDimNum(comprimentoM)} m`;
  }
  if (larguraMm) return `${trimDimNum(larguraMm)} mm`;
  return '—';
}

/**
 * Ativa modo de impressão térmica: body class + `@page` 50×40 mm no documento
 * (named pages sozinhas não são confiáveis em todos os browsers para mm custom).
 * Retorna cleanup para o useEffect da página.
 */
export function enableVolumeEtiquetaPrintMode(): () => void {
  const { bodyClass, styleId, widthMm, heightMm } = VOLUME_ETIQUETA_PRINTER;
  document.body.classList.add(bodyClass);

  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    style.textContent = `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`;
    document.head.appendChild(style);
  }

  return () => {
    document.body.classList.remove(bodyClass);
    document.getElementById(styleId)?.remove();
  };
}
