/**
 * Disposições comerciais fixas da proposta ao cliente (CONSOLIDADO).
 * Validade e tolerância vêm do ORC; sede F.O.B. da EMP (fallback Uberlândia — MG).
 */

export type EmpresaSedeFrete = {
  municipio?: string | null;
  uf?: string | null;
};

/** Sede usada na cláusula F.O.B. quando não há acordo prévio. */
export function sedeFreteFob(empresa: EmpresaSedeFrete | null | undefined): string {
  const municipio = String(empresa?.municipio ?? '').trim();
  const uf = String(empresa?.uf ?? '')
    .trim()
    .toUpperCase();
  if (municipio && uf) return `${municipio} — ${uf}`;
  if (municipio) return municipio;
  return 'Uberlândia — MG';
}

/** Texto complementar da tolerância (já exibida como ±N%). */
export function textoToleranciaQuantidade(): string {
  return (
    'As quantidades poderão variar nesta faixa, para mais ou para menos; ' +
    'a diferença será devidamente faturada ao cliente.'
  );
}

/**
 * Cláusulas gerais — ordem estável para proposta / ficha / impressão.
 * Não duplica validade (já na lista comercial).
 */
export function disposicoesGeraisProposta(
  empresa: EmpresaSedeFrete | null | undefined,
): string[] {
  const sede = sedeFreteFob(empresa);
  return [
    'A empresa não se responsabiliza por erros de conteúdo da arte fornecida ou aprovada pelo cliente.',
    'Não nos responsabilizamos por defeitos ou avarias causados pela transportadora durante a entrega, nem por armazenamento incorreto após o recebimento.',
    `Na ausência de acordo prévio, o frete é F.O.B. para clientes localizados fora de ${sede}.`,
  ];
}
