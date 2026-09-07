import { NavLink, useLocation } from 'react-router-dom';

const ITEMS = [
  {
    to: '/estoque',
    label: 'Saldos',
    match: (pathname: string) => pathname === '/estoque' || pathname.startsWith('/estoque/extrato'),
  },
  {
    to: '/estoque/guardar',
    label: 'Guardar',
    match: (pathname: string) => pathname.startsWith('/estoque/guardar'),
  },
  {
    to: '/estoque/inventarios',
    label: 'Inventários',
    match: (pathname: string) => pathname.startsWith('/estoque/inventarios'),
  },
  {
    to: '/estoque/ajustes',
    label: 'Ajustes',
    match: (pathname: string) => pathname.startsWith('/estoque/ajustes'),
  },
] as const;

/** Navegação do módulo — Saldos · Guardar · Inventários · Ajustes. */
export function EstoqueModuleNav() {
  const { pathname } = useLocation();

  return (
    <nav className="tabs estoque-module-nav" aria-label="Áreas de estoque">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={`tab${item.match(pathname) ? ' active' : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
