/**
 * Identidade canônica FLEXOERP (SaaS TRIGGER).
 * Norma: docs/IDENTIDADE_TRIGGER.md · docs/ADR_TRANSICAO_FLEXORC_FLEXOERP.md
 *
 * Camadas (não misturar):
 *   TRIGGER (fornecedor, atribuição discreta, favicon)
 *     → FLEXOERP (produto = herói da UI — logo própria)
 *       → EMP (contexto operacional, nunca marca)
 *
 * Não hardcode paths/labels de marca espalhados — consuma este módulo.
 */

export const BRAND = {
  vendor: {
    shortName: 'TRIGGER',
    fullName: 'TRIGGER Data Intelligence',
    legalName: 'TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA',
    url: 'https://www.triggerti.com',
    colors: {
      navy: '#1a3568',
      green: '#7cb518',
    },
    assets: {
      logo: '/branding/trigger/logo-trigger-mark.svg',
      mark: '/branding/trigger/logo-trigger-mark.svg',
      header: '/branding/trigger/logo-trigger-mark.svg',
    },
  },
  product: {
    name: 'FLEXOERP',
    label: 'Produto',
    tagline: 'ERP para gráficas',
    logo: '/branding/flexoerp/logo-flexoerp.svg',
    mark: '/branding/flexoerp/logo-flexoerp-mark.svg',
    logoAlt: 'FLEXOERP',
    byline: 'por Trigger Data Intelligence',
  },
  /**
   * Nesta instalação não há white-label de licenciado: o herói da UI é o produto.
   * Campos mantidos para fichas/proposta e para a fórmula `{produto} · TRIGGER`.
   */
  licensee: {
    shortName: 'FLEXOERP',
    productName: 'FLEXOERP',
    productLabel: 'Produto',
    logo: '/branding/flexoerp/logo-flexoerp-mark.svg',
    logoAlt: 'FLEXOERP',
    licensedLabel: 'ERP para gráficas',
    byline: 'por Trigger Data Intelligence',
  },
  attribution: {
    /** UI (login, sidebar) — rótulo acima do nome legível */
    interactiveLabel: 'Desenvolvido por',
    /** Documentos/impressos — compacto + marca */
    printLabel: 'Powered by',
    /** PDF / texto puro (sem imagem) */
    printText: 'Powered by TRIGGER',
  },
} as const;

export type Brand = typeof BRAND;

/** `<title>` canônico: `{produto} · TRIGGER` (docs/IDENTIDADE_TRIGGER.md). */
export function brandDocumentTitle(page?: string): string {
  const base = `${BRAND.product.name} · ${BRAND.vendor.shortName}`;
  return page ? `${page} · ${base}` : base;
}
