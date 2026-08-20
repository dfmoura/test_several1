import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ProductLogo } from './ProductLogo';
import { TriggerAttribution, TriggerByline } from './TriggerAttribution';
import { BRAND } from '../lib/brand';

export const ALTA_STEPS = [
  { n: 1, label: 'Conta', to: '/cadastro/conta' },
  { n: 2, label: 'Mensalidade', to: '/cadastro/pagamento' },
] as const;

type Props = {
  step: 1 | 2;
  title: string;
  subtitle: string;
  children: ReactNode;
  maxWidth?: number;
};

export function OnboardingShell({ step, title, subtitle, children, maxWidth = 520 }: Props) {
  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-client-area">
          <div className="licensed-label">Alta da conta</div>
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

          <ol className="wizard-steps" aria-label="Histórias da alta">
            {ALTA_STEPS.map((s) => {
              const estado = step === s.n ? 'atual' : step > s.n ? 'feito' : undefined;
              const clicavel = s.n < step;
              return (
                <li key={s.n} className={estado}>
                  {clicavel ? (
                    <Link to={s.to} className="wizard-step-link">
                      <span>{s.n}</span>
                      {s.label}
                    </Link>
                  ) : (
                    <>
                      <span>{s.n}</span>
                      {s.label}
                    </>
                  )}
                </li>
              );
            })}
          </ol>

          {children}
        </div>
      </div>
    </div>
  );
}
