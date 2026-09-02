/**
 * Relógio compartilhado do último toque autenticado na API.
 * Módulo mínimo para evitar ciclo api ↔ sessaoPresenca.
 */

let lastServerTouchAt = Date.now();
const listeners = new Set<() => void>();

export function markSessaoServerTouch(): void {
  lastServerTouchAt = Date.now();
  listeners.forEach((fn) => fn());
}

export function getLastServerTouchAt(): number {
  return lastServerTouchAt;
}

export function subscribeSessaoServerTouch(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
