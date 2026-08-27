export interface CfopItem {
  codigo: string;
  descricao: string;
  tipo: 'interna' | 'interestadual' | 'exterior';
}

export const CFOP_CATALOG: CfopItem[] = [
  { codigo: '1101', descricao: 'Compra para industrialização', tipo: 'interna' },
  { codigo: '1102', descricao: 'Compra para comercialização', tipo: 'interna' },
  { codigo: '1116', descricao: 'Compra para industrialização originada de encomenda', tipo: 'interna' },
  { codigo: '1403', descricao: 'Compra para comercialização em operação com mercadoria sujeita a ST', tipo: 'interna' },
  { codigo: '1556', descricao: 'Compra de material para uso ou consumo', tipo: 'interna' },
  { codigo: '2101', descricao: 'Compra para industrialização (interestadual)', tipo: 'interestadual' },
  { codigo: '2102', descricao: 'Compra para comercialização (interestadual)', tipo: 'interestadual' },
  { codigo: '2403', descricao: 'Compra para comercialização com ST (interestadual)', tipo: 'interestadual' },
  { codigo: '5101', descricao: 'Venda de produção do estabelecimento', tipo: 'interna' },
  { codigo: '5102', descricao: 'Venda de mercadoria adquirida ou recebida de terceiros', tipo: 'interna' },
  { codigo: '5103', descricao: 'Venda de produção do estabelecimento efetuada fora do estabelecimento', tipo: 'interna' },
  { codigo: '5104', descricao: 'Venda de mercadoria adquirida, efetuada fora do estabelecimento', tipo: 'interna' },
  { codigo: '5405', descricao: 'Venda de mercadoria adquirida — ST (cobrado anteriormente)', tipo: 'interna' },
  { codigo: '5656', descricao: 'Venda de combustível ou lubrificante', tipo: 'interna' },
  { codigo: '5910', descricao: 'Remessa em bonificação, doação ou brinde', tipo: 'interna' },
  { codigo: '5915', descricao: 'Remessa de mercadoria ou bem para conserto ou reparo', tipo: 'interna' },
  { codigo: '5929', descricao: 'Lançamento efetuado em decorrência de emissão de documento fiscal relativo a operação ou prestação também registrada em equipamento Emissor de Cupom Fiscal', tipo: 'interna' },
  { codigo: '6101', descricao: 'Venda de produção do estabelecimento (interestadual)', tipo: 'interestadual' },
  { codigo: '6102', descricao: 'Venda de mercadoria adquirida (interestadual)', tipo: 'interestadual' },
  { codigo: '6107', descricao: 'Venda de produção do estabelecimento a não contribuinte (interestadual)', tipo: 'interestadual' },
  { codigo: '6108', descricao: 'Venda de mercadoria adquirida a não contribuinte (interestadual)', tipo: 'interestadual' },
  { codigo: '6403', descricao: 'Venda de mercadoria adquirida sujeita a ST (interestadual)', tipo: 'interestadual' },
];

export function buscarCfop(query: string, tipo?: 'entrada' | 'saida'): CfopItem[] {
  const q = query.trim().toLowerCase();
  let list = CFOP_CATALOG;
  if (tipo === 'entrada') list = list.filter((c) => c.codigo.startsWith('1') || c.codigo.startsWith('2') || c.codigo.startsWith('3'));
  if (tipo === 'saida') list = list.filter((c) => c.codigo.startsWith('5') || c.codigo.startsWith('6') || c.codigo.startsWith('7'));
  if (!q) return list.slice(0, 16);
  return list.filter(
    (c) => c.codigo.includes(q) || c.descricao.toLowerCase().includes(q),
  ).slice(0, 20);
}

export function cfopPorCodigo(codigo: string): CfopItem | undefined {
  return CFOP_CATALOG.find((c) => c.codigo === codigo);
}

export const CSOSN_OPTIONS = [
  { codigo: '101', descricao: 'Tributada com permissão de crédito' },
  { codigo: '102', descricao: 'Tributada sem permissão de crédito' },
  { codigo: '103', descricao: 'Isenção do ICMS para faixa de receita bruta' },
  { codigo: '300', descricao: 'Imune' },
  { codigo: '400', descricao: 'Não tributada pelo Simples Nacional' },
  { codigo: '500', descricao: 'ICMS cobrado anteriormente por ST ou antecipação' },
] as const;

export const CST_OPTIONS = [
  { codigo: '00', descricao: 'Tributada integralmente' },
  { codigo: '10', descricao: 'Tributada e com cobrança do ICMS por ST' },
  { codigo: '20', descricao: 'Com redução de base de cálculo' },
  { codigo: '40', descricao: 'Isenta' },
  { codigo: '41', descricao: 'Não tributada' },
  { codigo: '60', descricao: 'ICMS cobrado anteriormente por ST' },
  { codigo: '90', descricao: 'Outras' },
] as const;

export const ORIGEM_MERCADORIA = [
  { codigo: '0', descricao: 'Nacional' },
  { codigo: '1', descricao: 'Estrangeira — importação direta' },
  { codigo: '2', descricao: 'Estrangeira — adquirida no mercado interno' },
  { codigo: '3', descricao: 'Nacional — conteúdo de importação > 40% e ≤ 70%' },
  { codigo: '4', descricao: 'Nacional — produção conforme PPB' },
  { codigo: '5', descricao: 'Nacional — conteúdo de importação ≤ 40%' },
  { codigo: '6', descricao: 'Estrangeira — importação direta, sem similar nacional' },
  { codigo: '7', descricao: 'Estrangeira — mercado interno, sem similar nacional' },
  { codigo: '8', descricao: 'Nacional — conteúdo de importação > 70%' },
] as const;

export const CRT_OPTIONS = [
  { codigo: '1', descricao: 'Simples Nacional' },
  { codigo: '2', descricao: 'Simples Nacional — excesso de sublimite' },
  { codigo: '3', descricao: 'Regime Normal' },
] as const;

export const IND_IE_DEST_OPTIONS = [
  { codigo: '1', descricao: 'Contribuinte ICMS' },
  { codigo: '2', descricao: 'Contribuinte isento de IE' },
  { codigo: '9', descricao: 'Não contribuinte' },
] as const;

export const CST_PIS_COFINS_OPTIONS = [
  { codigo: '01', descricao: 'Operação tributável — alíquota básica' },
  { codigo: '02', descricao: 'Operação tributável — alíquota diferenciada' },
  { codigo: '04', descricao: 'Operação tributável monofásica — alíquota zero' },
  { codigo: '06', descricao: 'Operação tributável a alíquota zero' },
  { codigo: '07', descricao: 'Operação isenta da contribuição' },
  { codigo: '08', descricao: 'Operação sem incidência da contribuição' },
  { codigo: '09', descricao: 'Operação com suspensão da contribuição' },
  { codigo: '49', descricao: 'Outras operações de saída' },
  { codigo: '99', descricao: 'Outras operações' },
] as const;

/** CST IBS/CBS — IT NF-e 2025.002 / LC 214/2025 (código compartilhado). */
export const CST_IBS_CBS_OPTIONS = [
  { codigo: '000', descricao: 'Tributação integral', destaque: true },
  { codigo: '010', descricao: 'Tributação com alíquotas uniformes', destaque: true },
  { codigo: '011', descricao: 'Tributação com alíquotas uniformes reduzidas' },
  { codigo: '200', descricao: 'Alíquota zero' },
  { codigo: '210', descricao: 'Alíquota reduzida (demais hipóteses)' },
  { codigo: '220', descricao: 'Alíquota fixa' },
  { codigo: '221', descricao: 'Alíquota fixa proporcional' },
  { codigo: '222', descricao: 'Redução de base de cálculo' },
  { codigo: '400', descricao: 'Isenção' },
  { codigo: '410', descricao: 'Imunidade e não incidência' },
  { codigo: '510', descricao: 'Diferimento' },
  { codigo: '550', descricao: 'Suspensão' },
  { codigo: '620', descricao: 'Tributação monofásica' },
  { codigo: '800', descricao: 'Transferência de crédito' },
  { codigo: '810', descricao: 'Ajuste de IBS/CBS' },
  { codigo: '820', descricao: 'Tributação em documento específico' },
  { codigo: '830', descricao: 'Exclusão da base de cálculo' },
] as const;

/** cClassTrib IBS/CBS — 6 dígitos; 3 primeiros = CST. Subset operacional. */
export const CCLASS_TRIB_OPTIONS = [
  { codigo: '000001', descricao: 'Situações tributadas integralmente pelo IBS e pela CBS', destaque: true },
  { codigo: '010001', descricao: 'Operações com alíquotas uniformes (padrão transição)', destaque: true },
  { codigo: '010002', descricao: 'Operações com alíquotas uniformes — hipótese específica LC' },
  { codigo: '011001', descricao: 'Alíquotas uniformes reduzidas' },
  { codigo: '200001', descricao: 'Operações com alíquota zero' },
  { codigo: '210001', descricao: 'Redução de alíquota — hipóteses legais' },
  { codigo: '220001', descricao: 'Alíquota fixa — monofasia correlata' },
  { codigo: '400001', descricao: 'Isenção do IBS e da CBS' },
  { codigo: '410001', descricao: 'Imunidade / não incidência' },
  { codigo: '510001', descricao: 'Diferimento' },
  { codigo: '550001', descricao: 'Suspensão' },
  { codigo: '620001', descricao: 'Tributação monofásica' },
  { codigo: '800001', descricao: 'Transferência de crédito' },
  { codigo: '820001', descricao: 'Tributação em documento específico' },
  { codigo: '830001', descricao: 'Exclusão da base de cálculo' },
] as const;

export const CST_IS_OPTIONS = [
  { codigo: '000', descricao: 'Tributação integral do IS' },
  { codigo: '200', descricao: 'Alíquota zero do IS' },
  { codigo: '400', descricao: 'Isenção do IS' },
  { codigo: '410', descricao: 'Imunidade / não incidência do IS' },
] as const;

export const TIPO_ITEM_SPED_OPTIONS = [
  { codigo: '00', descricao: 'Mercadoria para revenda' },
  { codigo: '01', descricao: 'Matéria-prima' },
  { codigo: '02', descricao: 'Embalagem' },
  { codigo: '03', descricao: 'Produto em processo' },
  { codigo: '04', descricao: 'Produto acabado' },
  { codigo: '07', descricao: 'Material de uso e consumo' },
  { codigo: '08', descricao: 'Ativo imobilizado' },
  { codigo: '09', descricao: 'Serviços' },
  { codigo: '99', descricao: 'Outras' },
] as const;

export const FINALIDADE_PARCEIRO_OPTIONS = [
  { codigo: 'REVENDA', descricao: 'Revenda / comercialização' },
  { codigo: 'INDUSTRIALIZACAO', descricao: 'Industrialização / insumo' },
  { codigo: 'USO_CONSUMO', descricao: 'Uso e consumo / ativo' },
] as const;

export const REGIME_PARCEIRO_OPTIONS = [
  { codigo: 'SIMPLES_NACIONAL', descricao: 'Simples Nacional' },
  { codigo: 'MEI', descricao: 'MEI' },
  { codigo: 'PRESUMIDO', descricao: 'Lucro Presumido' },
  { codigo: 'REAL', descricao: 'Lucro Real' },
  { codigo: 'ISENTO', descricao: 'Isento' },
  { codigo: 'OUTRO', descricao: 'Outro' },
] as const;

export const IE_STATUS_OPTIONS = [
  { codigo: 'NAO_VERIFICADA', descricao: 'Não verificada' },
  { codigo: 'OK', descricao: 'OK — habilitada' },
  { codigo: 'BAIXADA', descricao: 'Baixada' },
  { codigo: 'NAO_HABILITADA', descricao: 'Não habilitada' },
  { codigo: 'ISENTA', descricao: 'Isenta' },
] as const;

export const TIPO_FORNECIMENTO_OPTIONS = [
  { codigo: 'MERCADORIA', descricao: 'Mercadoria' },
  { codigo: 'SERVICO', descricao: 'Serviço' },
  { codigo: 'UTILIDADE', descricao: 'Utilidade (energia, água, telecom)' },
  { codigo: 'TRIBUTO', descricao: 'Tributo / taxa' },
] as const;

/** Extrai CST (3 dígitos) a partir de cClassTrib (6). */
export function cstFromCclassTrib(cclassTrib: string): string | undefined {
  const d = cclassTrib.replace(/\D/g, '');
  if (d.length < 3) return undefined;
  return d.slice(0, 3);
}
