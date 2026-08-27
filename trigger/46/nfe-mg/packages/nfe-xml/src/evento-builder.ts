import { escapeXml, formatDhEmiBr, NS_NFE, digits } from './xml-utils.js';

export interface EventoBuildParams {
  chaveAcesso: string;
  cnpj: string;
  tipo: '110111' | '110110';
  sequencial: number;
  tpAmb: '1' | '2';
  motivo: string;
}

export function eventoInfId(chave: string, tipo: string, seq: number): string {
  return `ID${tipo}${digits(chave, 44)}${String(seq).padStart(2, '0')}`;
}

export class EventoBuilder {
  build(params: EventoBuildParams): string {
    const infId = eventoInfId(params.chaveAcesso, params.tipo, params.sequencial);
    const dhEvento = formatDhEmiBr();
    const det =
      params.tipo === '110111'
        ? `<detEvento versao="1.00">
          <descEvento>Cancelamento</descEvento>
          <nProt>000000000000000</nProt>
          <xJust>${escapeXml(params.motivo)}</xJust>
        </detEvento>`
        : `<detEvento versao="1.00">
          <descEvento>Carta de Correcao</descEvento>
          <xCorrecao>${escapeXml(params.motivo)}</xCorrecao>
          <xCondUso>A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao esteja relacionado com: I - as variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; III - a data de emissao ou de saida.</xCondUso>
        </detEvento>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<evento xmlns="${NS_NFE}" versao="1.00">
  <infEvento Id="${infId}">
    <cOrgao>31</cOrgao>
    <tpAmb>${params.tpAmb}</tpAmb>
    <CNPJ>${digits(params.cnpj, 14)}</CNPJ>
    <chNFe>${digits(params.chaveAcesso, 44)}</chNFe>
    <dhEvento>${dhEvento}</dhEvento>
    <tpEvento>${params.tipo}</tpEvento>
    <nSeqEvento>${params.sequencial}</nSeqEvento>
    <verEvento>1.00</verEvento>
    ${det}
  </infEvento>
</evento>`;
  }
}

export interface InutBuildParams {
  cnpj: string;
  ie: string;
  ano: number;
  serie: number;
  nNFIni: number;
  nNFFin: number;
  tpAmb: '1' | '2';
  motivo: string;
}

export function inutInfId(params: InutBuildParams): string {
  const ano = String(params.ano).slice(-2);
  return `ID31${digits(params.cnpj, 14)}${ano}55${String(params.serie).padStart(3, '0')}${String(params.nNFIni).padStart(9, '0')}${String(params.nNFFin).padStart(9, '0')}`;
}

export class InutilizacaoBuilder {
  build(params: InutBuildParams): string {
    const infId = inutInfId(params);
    return `<?xml version="1.0" encoding="UTF-8"?>
<inutNFe xmlns="${NS_NFE}" versao="4.00">
  <infInut Id="${infId}">
    <tpAmb>${params.tpAmb}</tpAmb>
    <xServ>INUTILIZAR</xServ>
    <cUF>31</cUF>
    <ano>${String(params.ano).slice(-2)}</ano>
    <CNPJ>${digits(params.cnpj, 14)}</CNPJ>
    <mod>55</mod>
    <serie>${params.serie}</serie>
    <nNFIni>${params.nNFIni}</nNFIni>
    <nNFFin>${params.nNFFin}</nNFFin>
    <xJust>${escapeXml(params.motivo)}</xJust>
  </infInut>
</inutNFe>`;
  }
}
