/** Espelha App\Support\VolumeCodigoSequencia — Código / nLote do volume no ajuste. */

const MAX = 60;

export function codigoVolumeCanonico(prefixo: string, sku: string, n: number): string {
  const seq = Math.max(1, Math.trunc(n));
  return limitarCodigoVolume(`${prefixo}-${sku}-`, String(seq));
}

/** Devolve o código se estiver livre; senão o próximo da mesma sequência. */
export function reservarCodigoVolume(desejado: string, ocupados: string[]): string {
  const base = desejado.trim();
  if (base === '') {
    throw new Error('Código desejado vazio.');
  }
  const limitado = cortar(base);
  if (!ocupado(limitado, ocupados)) return limitado;
  return proximoCodigoVolume(limitado, ocupados);
}

/** Próximo código depois de `base`, pulando os ocupados. */
export function proximoCodigoVolume(base: string, ocupados: string[]): string {
  const src = base.trim();
  if (src === '') {
    throw new Error('Código base vazio.');
  }

  const match = /^(.*?)(\d+)$/u.exec(src);
  if (match) {
    const prefixo = match[1];
    const largura = match[2].length;
    let n = Number(match[2]) + 1;
    if (!Number.isFinite(n) || n < 1) n = 1;
    for (let i = 0; i < 10000; i++) {
      const cauda = String(Math.trunc(n)).padStart(largura, '0');
      const candidato = limitarCodigoVolume(prefixo, cauda);
      if (!ocupado(candidato, ocupados)) return candidato;
      n += 1;
    }
  } else {
    for (let n = 2; n < 10000; n++) {
      const candidato = limitarCodigoVolume(src, `-${n}`);
      if (!ocupado(candidato, ocupados)) return candidato;
    }
  }

  throw new Error('Não foi possível gerar código sequencial de volume.');
}

function ocupado(codigo: string, ocupados: string[]): boolean {
  const alvo = codigo.toUpperCase();
  return ocupados.some((item) => item.trim().toUpperCase() === alvo);
}

function cortar(codigo: string): string {
  return Array.from(codigo).slice(0, MAX).join('');
}

/** Encurta o prefixo e conserva a cauda (o número da sequência). */
function limitarCodigoVolume(prefixo: string, cauda: string): string {
  const caudaChars = Array.from(cauda);
  if (caudaChars.length >= MAX) return caudaChars.slice(0, MAX).join('');
  const room = MAX - caudaChars.length;
  return Array.from(prefixo).slice(0, room).join('') + cauda;
}
