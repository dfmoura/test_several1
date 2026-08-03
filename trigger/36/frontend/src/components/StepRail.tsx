import { NavLink, useLocation } from 'react-router-dom';
import { ETAPAS } from '../lib/stages';

export function StepRail() {
  const { pathname } = useLocation();

  return (
    <nav className="step-rail" aria-label="Jornada operacional">
      <div className="step-rail-inner">
        {ETAPAS.map((etapa) => {
          const active =
            pathname === etapa.href ||
            (etapa.href !== '/' && pathname.startsWith(etapa.href)) ||
            (etapa.codigo === 'CAD' && pathname.startsWith('/produtos')) ||
            (etapa.codigo === 'EST' && pathname.startsWith('/nfe'));
          return (
            <NavLink
              key={etapa.codigo}
              to={etapa.href === '/parceiros' && etapa.codigo === 'CAD' ? '/parceiros' : etapa.href}
              className={`step-item${active ? ' active' : ''}`}
            >
              <span className="step-num">{etapa.ordem}</span>
              {etapa.titulo}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
