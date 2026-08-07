/**
 * Identidade canônica TRIGGER × licenciado.
 * Norma: docs/IDENTIDADE_TRIGGER.md (modelo ecossistema×produto de trigger/12).
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
      logo: '/branding/trigger/logo-trigger.png',
      mark: '/branding/trigger/logo-trigger-mark.png',
      header: '/branding/trigger/logo-trigger-header.png',
    },
  },
  licensee: {
    shortName: 'RLP',
    productName: 'ERP RLP',
    logo: '/branding/cliente/logo-rlp.png',
    logoAlt: 'RLP Etiquetas',
    licensedLabel: 'Licenciado para',
    /** Padrão product byline do trigger/12 — Title Case, sem gritar TRIGGER */
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
