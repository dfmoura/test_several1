import type { ReactNode } from 'react';
import { ProductLogo } from './ProductLogo';
import { TriggerAttribution, TriggerByline } from './TriggerAttribution';
import { BRAND } from '../lib/brand';

type Props = {
  step?: 1 | 2;
  title: string;
  subtitle: string;
  children: ReactNode;
  maxWidth?: number;
};

/** Shell da mensalidade pós-provisionamento (conta nasce via admin/CLI, não no login). */
export function OnboardingShell({ title, subtitle, children, maxWidth = 520 }: Props) {
  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-client-area">
          <div className="licensed-label">Mensalidade da conta</div>
          <div className="logo-plate logo-plate--hero">
            <ProductLogo decorative className="login-hero-mark" />
            <span className="login-hero-wordmark">{BRAND.product.name}</span>
          </div>
        </div>
        <TriggerAttribution variant="interactive" className="login-trigger-footer" />
      </div>
      <div className="login-form-panel">
        <div className="login-form-card" style={{ maxWidth }}>
          <p className="login-product-eyebrow">{BRAND.product.label}</p>
          <h1>{title}</h1>
          <TriggerByline className="login-product-byline" />
          <p className="subtitle">{subtitle}</p>

          {children}
        </div>
      </div>
    </div>
  );
}
