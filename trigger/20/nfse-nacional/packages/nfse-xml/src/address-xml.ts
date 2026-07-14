import type { Endereco } from '@nfse/domain';
import { escapeXml } from './xml-utils.js';

export function buildTomadorEnderecoXml(end: Endereco): string {
  const cpl = end.complemento
    ? `        <xCpl>${escapeXml(end.complemento)}</xCpl>\n`
    : '';
  const cep = end.cep.replace(/\D/g, '');
  const cMun = end.codigoMunicipio.replace(/\D/g, '').padStart(7, '0').slice(0, 7);

  return `      <end>
        <endNac>
          <cMun>${cMun}</cMun>
          <CEP>${cep}</CEP>
        </endNac>
        <xLgr>${escapeXml(end.logradouro)}</xLgr>
        <nro>${escapeXml(end.numero)}</nro>
${cpl}        <xBairro>${escapeXml(end.bairro)}</xBairro>
      </end>`;
}

export function buildEmitenteEnderNacXml(end: Endereco): string {
  const cpl = end.complemento
    ? `        <xCpl>${escapeXml(end.complemento)}</xCpl>\n`
    : '';
  const cep = end.cep.replace(/\D/g, '');

  return `      <enderNac>
        <xLgr>${escapeXml(end.logradouro)}</xLgr>
        <nro>${escapeXml(end.numero)}</nro>
${cpl}        <xBairro>${escapeXml(end.bairro)}</xBairro>
        <cMun>${end.codigoMunicipio}</cMun>
        <UF>${escapeXml(end.uf)}</UF>
        <CEP>${cep}</CEP>
      </enderNac>`;
}

export function buildTomadorContatoXml(email?: string, telefone?: string): string {
  const parts: string[] = [];
  if (telefone) {
    parts.push(`      <fone>${escapeXml(telefone.replace(/\D/g, ''))}</fone>`);
  }
  if (email) {
    parts.push(`      <email>${escapeXml(email)}</email>`);
  }
  return parts.length > 0 ? `${parts.join('\n')}\n` : '';
}

export function buildPrestadorContatoXml(email?: string, telefone?: string): string {
  const parts: string[] = [];
  if (telefone) {
    parts.push(`      <fone>${escapeXml(telefone.replace(/\D/g, ''))}</fone>`);
  }
  if (email) {
    parts.push(`      <email>${escapeXml(email)}</email>`);
  }
  return parts.length > 0 ? `${parts.join('\n')}\n` : '';
}

export function buildEmitenteContatoXml(email?: string, telefone?: string): string {
  const parts: string[] = [];
  if (telefone) {
    parts.push(`      <fone>${escapeXml(telefone.replace(/\D/g, ''))}</fone>`);
  }
  if (email) {
    parts.push(`      <email>${escapeXml(email)}</email>`);
  }
  return parts.length > 0 ? parts.join('\n') : '';
}
