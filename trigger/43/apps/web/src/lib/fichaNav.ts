import type { MouseEvent } from 'react';
import type { NavigateFunction } from 'react-router-dom';

/**
 * Ficha cadastral = aba satélite de impressão/PDF.
 * Abre via window.open (não <a target=_blank rel=noopener>) para o browser
 * permitir window.close() e devolver o foco ao cadastro (opener).
 */
export function abrirFicha(path: string): void {
  window.open(path, '_blank');
}

/** Clique primário abre com opener; Ctrl/Cmd/Shift/meio mantêm o comportamento nativo. */
export function onAbrirFichaClick(event: MouseEvent<HTMLAnchorElement>, path: string): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    return;
  }
  event.preventDefault();
  abrirFicha(path);
}

/**
 * Fecha a aba da ficha e foca o cadastro que a abriu.
 * Se o close for bloqueado (URL colada, aba sem opener), navega para o cadastro.
 */
export function voltarDaFicha(navigate: NavigateFunction, cadastroPath: string): void {
  const opener = window.opener as Window | null;
  if (opener && !opener.closed) {
    try {
      opener.focus();
    } catch {
      /* opener inacessível */
    }
  }

  window.close();

  window.setTimeout(() => {
    if (!window.closed) {
      navigate(cadastroPath);
    }
  }, 100);
}
