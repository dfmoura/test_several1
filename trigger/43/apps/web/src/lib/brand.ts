/**
 * Identidade canônica FLEXORC (SaaS TRIGGER).
 * Norma: docs/IDENTIDADE_TRIGGER.md · docs/ADR_FATIA_COMERCIAL_SAAS.md
 *
 * Camadas (não misturar):
 *   TRIGGER (fornecedor, atribuição discreta, favicon)
 *     → FLEXORC (produto = herói da UI — logo própria)
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
    name: 'FLEXORC',
    label: 'Produto',
    tagline: 'Orçamento comercial',
    logo: '/branding/flexorc/logo-flexorc.svg',
    mark: '/branding/flexorc/logo-flexorc-mark.svg',
    logoAlt: 'FLEXORC',
    byline: 'por Trigger Data Intelligence',
  },
  /**
   * Nesta instalação não há white-label de licenciado: o herói da UI é o produto.
   * Campos mantidos para fichas/proposta e para a fórmula `{produto} · TRIGGER`.
   */
  licensee: {
    shortName: 'FLEXORC',
    productName: 'FLEXORC',
    productLabel: 'Produto',
    logo: '/branding/flexorc/logo-flexorc-mark.svg',
    logoAlt: 'FLEXORC',
    licensedLabel: 'Orçamento comercial',
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
