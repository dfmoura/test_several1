import { gzipSync, gunzipSync } from 'node:zlib';
import type { EmitirNfseInput, TotTrib } from '@nfse/domain';
import { defaultOpSimpNac, isOptanteSimplesNacional } from '@nfse/domain';
import {
  dpsInfId,
  escapeXml,
  formatDhEmiBr,
  padNumeroDps,
  NS,
} from './xml-utils.js';
import {
  buildPrestadorContatoXml,
  buildTomadorContatoXml,
  buildTomadorEnderecoXml,
} from './address-xml.js';

/** Código BACEN — Brasil (prestação no território nacional). */
export const PAIS_BRASIL_BACEN = '105';

export interface DpsBuildParams {
  idDps: string;
  numeroDps: string;
  serie: string;
  cnpjPrestador: string;
  razaoSocial: string;
  codigoMunicipio: string;
  /** Prestador — somente manual (.env); tomador — somente manual (payload). */
  inscricaoMunicipal?: string;
  prestadorEmail?: string;
  prestadorTelefone?: string;
  input: EmitirNfseInput;
  chaveSubstituida?: string;
  tpAmb?: '1' | '2';
  /** Cadastro Receita — fallback para opSimpNac quando omitido no payload. */
  optanteSimples?: boolean;
}

function fmtMoney(value: number): string {
  return value.toFixed(2);
}

function fmtPercent(value: number): string {
  return value.toFixed(2);
}

function buildVServPrestXml(vServ: number, vReceb?: number): string {
  const vRecebXml =
    vReceb !== undefined ? `\n        <vReceb>${fmtMoney(vReceb)}</vReceb>` : '';
  return `      <vServPrest>
        <vServ>${fmtMoney(vServ)}</vServ>${vRecebXml}
      </vServPrest>`;
}

function buildDescontosXml(descontoIncondicionado?: number, descontoCondicionado?: number): string {
  if (descontoIncondicionado === undefined && descontoCondicionado === undefined) {
    return '';
  }
  const parts: string[] = [];
  if (descontoIncondicionado !== undefined) {
    parts.push(`        <vDescIncond>${fmtMoney(descontoIncondicionado)}</vDescIncond>`);
  }
  if (descontoCondicionado !== undefined) {
    parts.push(`        <vDescCond>${fmtMoney(descontoCondicionado)}</vDescCond>`);
  }
  return `\n      <vDescCondIncond>\n${parts.join('\n')}\n      </vDescCondIncond>`;
}

function buildTotTribXml(totTrib: TotTrib): string {
  switch (totTrib.modo) {
    case 'valores':
      return `        <totTrib>
          <vTotTribFed>${fmtMoney(totTrib.valorFederal!)}</vTotTribFed>
          <vTotTribEst>${fmtMoney(totTrib.valorEstadual!)}</vTotTribEst>
          <vTotTribMun>${fmtMoney(totTrib.valorMunicipal!)}</vTotTribMun>
        </totTrib>`;
    case 'percentuais':
      return `        <totTrib>
          <pTotTrib>
            <pTotTribFed>${fmtPercent(totTrib.percentualFederal!)}</pTotTribFed>
            <pTotTribEst>${fmtPercent(totTrib.percentualEstadual!)}</pTotTribEst>
            <pTotTribMun>${fmtPercent(totTrib.percentualMunicipal!)}</pTotTribMun>
          </pTotTrib>
        </totTrib>`;
    case 'aliquota_sn':
    default:
      return `        <totTrib>
          <pTotTribSN>${fmtPercent(totTrib.aliquotaSimplesNacional ?? 6)}</pTotTribSN>
        </totTrib>`;
  }
}

function buildRegTribXml(
  opSimpNac: string,
  regApTribSN: string | undefined,
  regEspTrib: string,
): string {
  const regApTribSnXml =
    isOptanteSimplesNacional(opSimpNac) && regApTribSN
      ? `\n        <regApTribSN>${escapeXml(regApTribSN)}</regApTribSN>`
      : '';
  return `      <regTrib>
        <opSimpNac>${escapeXml(opSimpNac)}</opSimpNac>${regApTribSnXml}
        <regEspTrib>${escapeXml(regEspTrib)}</regEspTrib>
      </regTrib>`;
}

export class DpsBuilder {
  build(params: DpsBuildParams): string {
    const {
      input,
      idDps,
      numeroDps,
      serie,
      cnpjPrestador,
      razaoSocial,
      codigoMunicipio,
      inscricaoMunicipal,
      chaveSubstituida,
      tpAmb = '2',
      prestadorEmail,
      prestadorTelefone,
      optanteSimples,
    } = params;

    const tomadorDoc = input.tomador.cpfCnpj.replace(/\D/g, '');
    const dataCompetencia = input.dataCompetencia ?? new Date().toISOString().slice(0, 10);
    const discriminacao = input.discriminacao?.trim() ?? '';
    const infId = dpsInfId(idDps);
    const nDpsFmt = padNumeroDps(numeroDps);
    const vServ = input.valores.valorServico;
    const descontoIncond = input.valores.descontoIncondicionado ?? 0;
    const vBC = Math.max(
      0,
      vServ - (input.valores.valorDeducoes ?? 0) - descontoIncond,
    );
    const regEspTrib = input.regimeEspecialTributacao ?? '0';
    const tpRetISSQN = input.servico.retencaoIssqn ?? '1';
    const opSimpNac = input.opSimpNac ?? defaultOpSimpNac(optanteSimples);
    const regApTribSN =
      input.regApTribSN ?? (isOptanteSimplesNacional(opSimpNac) ? '1' : undefined);
    const totTrib = input.totTrib ?? { modo: 'aliquota_sn' as const, aliquotaSimplesNacional: 6 };

    const substituicaoXml = chaveSubstituida
      ? `    <subst>
      <chSubstda>${chaveSubstituida}</chSubstda>
      <cMotivo>01</cMotivo>
      <xMotivo>Substituicao de NFS-e</xMotivo>
    </subst>`
      : '';

    const imXml = inscricaoMunicipal ? `      <IM>${escapeXml(inscricaoMunicipal)}</IM>\n` : '';
    const tomadorImXml = input.tomador.inscricaoMunicipal
      ? `      <IM>${escapeXml(input.tomador.inscricaoMunicipal)}</IM>\n`
      : '';
    const tomadorContatoXml = buildTomadorContatoXml(input.tomador.email, input.tomador.telefone);
    const xInfCompXml = discriminacao
      ? `    <xInfComp>${escapeXml(discriminacao)}</xInfComp>\n`
      : '';

    const docTag = input.tomador.tipo === 'PF' ? 'CPF' : 'CNPJ';
    const prestContatoXml = buildPrestadorContatoXml(prestadorEmail, prestadorTelefone);
    const tomadorEnderecoXml = input.tomador.endereco
      ? `${buildTomadorEnderecoXml(input.tomador.endereco)}\n`
      : '';

    const codigoPais = input.servico.codigoPaisPrestacao ?? PAIS_BRASIL_BACEN;
    const codigoPaisResultado = input.servico.codigoPaisResultado ?? PAIS_BRASIL_BACEN;
    const cTribMunXml = input.servico.codigoTributacaoMunicipal
      ? `\n        <cTribMun>${escapeXml(input.servico.codigoTributacaoMunicipal)}</cTribMun>`
      : '';
    const cNbsXml = input.servico.codigoNbs
      ? `\n        <cNBS>${escapeXml(input.servico.codigoNbs.replace(/\D/g, ''))}</cNBS>`
      : '';

    const tribISSQN = input.servico.tributacaoIssqn ?? '1';
    const tribMunExtras: string[] = [];
    if (input.servico.tipoImunidade !== undefined && tribISSQN === '2') {
      tribMunExtras.push(`          <tpImunidade>${escapeXml(input.servico.tipoImunidade)}</tpImunidade>`);
    }
    if (input.servico.beneficioMunicipal) {
      tribMunExtras.push(`          <nBM>${escapeXml(input.servico.beneficioMunicipal)}</nBM>`);
    }
    if (input.servico.suspensaoExigibilidade) {
      const procXml = input.servico.numeroProcessoSuspensao
        ? `\n            <nProcesso>${escapeXml(input.servico.numeroProcessoSuspensao)}</nProcesso>`
        : '';
      tribMunExtras.push(
        `          <exigSusp>\n            <tpSusp>${escapeXml(input.servico.suspensaoExigibilidade)}</tpSusp>${procXml}\n          </exigSusp>`,
      );
    }
    const tribMunExtrasXml = tribMunExtras.length ? `\n${tribMunExtras.join('\n')}` : '';

    const tribMunValores: string[] = [];
    if (input.servico.aliquotaIss !== undefined && tribISSQN === '1') {
      const pAliq = input.servico.aliquotaIss;
      const vISS = Math.round(vBC * (pAliq / 100) * 100) / 100;
      tribMunValores.push(`          <pAliq>${pAliq.toFixed(2)}</pAliq>`);
      tribMunValores.push(`          <vBC>${vBC.toFixed(2)}</vBC>`);
      tribMunValores.push(`          <vISSQN>${vISS.toFixed(2)}</vISSQN>`);
    }
    const tribMunValoresXml = tribMunValores.length ? `\n${tribMunValores.join('\n')}` : '';

    const tribFedXml = this.buildTribFedXml(input);
    const vServPrestXml = buildVServPrestXml(vServ, input.valores.valorRecebidoIntermediario);
    const descontosXml = buildDescontosXml(
      input.valores.descontoIncondicionado,
      input.valores.descontoCondicionado,
    );
    const totTribXml = buildTotTribXml(totTrib);
    const regTribXml = buildRegTribXml(opSimpNac, regApTribSN, regEspTrib);

    return `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="${NS}" versao="1.00">
  <infDPS Id="${infId}">
    <tpAmb>${tpAmb}</tpAmb>
    <dhEmi>${formatDhEmiBr()}</dhEmi>
    <verAplic>NFSE-NACIONAL-1.0.0</verAplic>
    <serie>${escapeXml(serie)}</serie>
    <nDPS>${nDpsFmt}</nDPS>
    <dCompet>${dataCompetencia}</dCompet>
    <tpEmit>1</tpEmit>
    <cLocEmi>${codigoMunicipio}</cLocEmi>
${substituicaoXml}
    <prest>
      <CNPJ>${cnpjPrestador}</CNPJ>
${imXml}${prestContatoXml}      <xNome>${escapeXml(razaoSocial)}</xNome>
${regTribXml}
    </prest>
    <toma>
      <${docTag}>${tomadorDoc}</${docTag}>
${tomadorImXml}      <xNome>${escapeXml(input.tomador.nome ?? input.tomador.razaoSocial ?? 'Tomador')}</xNome>
${tomadorContatoXml}${tomadorEnderecoXml}    </toma>
    <serv>
      <locPrest>
        <cLocPrestacao>${input.servico.codigoMunicipioIncidencia}</cLocPrestacao>
        <cPaisPrestacao>${escapeXml(codigoPais)}</cPaisPrestacao>
        <cPaisConsum>${escapeXml(codigoPaisResultado)}</cPaisConsum>
      </locPrest>
      <cServ>
        <cTribNac>${escapeXml(input.servico.codigoServico)}</cTribNac>
        <xDescServ>${escapeXml(input.servico.descricao)}</xDescServ>${cTribMunXml}${cNbsXml}
      </cServ>
    </serv>
    <valores>
${vServPrestXml}${descontosXml}
      <trib>
        <tribMun>
          <tribISSQN>${tribISSQN}</tribISSQN>
          <tpRetISSQN>${tpRetISSQN}</tpRetISSQN>${tribMunExtrasXml}${tribMunValoresXml}
        </tribMun>
${tribFedXml}${totTribXml}
      </trib>
    </valores>
${xInfCompXml}  </infDPS>
</DPS>`;
  }

  private buildTribFedXml(input: EmitirNfseInput): string {
    const v = input.valores;
    const tpRet = input.servico.tpRetPisCofins;

    const tribFedScalars: string[] = [];
    if (v.valorIr !== undefined) tribFedScalars.push(`          <vRetIRRF>${v.valorIr.toFixed(2)}</vRetIRRF>`);
    if (v.valorInss !== undefined) tribFedScalars.push(`          <vRetCP>${v.valorInss.toFixed(2)}</vRetCP>`);
    if (v.valorCsll !== undefined) tribFedScalars.push(`          <vRetCSLL>${v.valorCsll.toFixed(2)}</vRetCSLL>`);

    const pisCofinsParts = ['          <CST>00</CST>'];
    if (tpRet !== undefined) pisCofinsParts.push(`          <tpRetPisCofins>${escapeXml(tpRet)}</tpRetPisCofins>`);
    if (v.valorPis !== undefined) pisCofinsParts.push(`          <vPis>${v.valorPis.toFixed(2)}</vPis>`);
    if (v.valorCofins !== undefined) pisCofinsParts.push(`          <vCofins>${v.valorCofins.toFixed(2)}</vCofins>`);

    const inner = [
      ...tribFedScalars,
      `        <piscofins>\n${pisCofinsParts.join('\n')}\n        </piscofins>`,
    ].join('\n');

    return `        <tribFed>\n${inner}\n        </tribFed>\n`;
  }
}

export class EventoBuilder {
  buildCancelamento(params: {
    chaveAcesso: string;
    codigoMotivo: string;
    motivo: string;
    cnpj: string;
    sequencial: number;
    tpAmb?: '1' | '2';
  }): string {
    const id = `PRE${params.chaveAcesso}${String(params.sequencial).padStart(3, '0')}`;
    const tpAmb = params.tpAmb ?? '2';
    return `<?xml version="1.0" encoding="UTF-8"?>
<PedRegEvento xmlns="${NS}" versao="1.00">
  <infPedReg Id="${id}">
    <tpAmb>${tpAmb}</tpAmb>
    <verAplic>NFSE-NACIONAL-1.0.0</verAplic>
    <dhEvento>${formatDhEmiBr()}</dhEvento>
    <CNPJAutor>${params.cnpj}</CNPJAutor>
    <chNFSe>${params.chaveAcesso}</chNFSe>
    <e101101>
      <xDesc>Cancelamento de NFS-e</xDesc>
      <cMotivo>${escapeXml(params.codigoMotivo)}</cMotivo>
      <xMotivo>${escapeXml(params.motivo)}</xMotivo>
    </e101101>
  </infPedReg>
</PedRegEvento>`;
  }
}

export function gzipBase64(xml: string): string {
  return gzipSync(Buffer.from(xml, 'utf-8')).toString('base64');
}

export function gunzipBase64(encoded: string): string {
  return gunzipSync(Buffer.from(encoded, 'base64')).toString('utf-8');
}
