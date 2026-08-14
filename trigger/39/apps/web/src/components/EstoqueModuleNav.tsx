import { NavLink, useLocation } from 'react-router-dom';

const ITEMS = [
  {
    to: '/estoque',
    label: 'Saldos',
    match: (pathname: string) => pathname === '/estoque' || pathname.startsWith('/estoque/extrato'),
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

/** Navegação do módulo — Saldos · Inventários · Ajustes (norma Compras → Estoque). */
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
