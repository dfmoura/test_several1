import fs from "node:fs";
import { buildLinhaDigitavel, buildPixCopiaECola } from "@reta/banco-inter";
import {
  FISCAL_DEFAULTS,
  buildFocusNfePayload,
  buildFocusNfseNacionalPayload,
  montarChaveNfe,
  montarChaveNfse,
  stripFocusMeta,
} from "../src/lib/fiscal-emissao";
import { dpsNumeroFromPedido } from "../src/lib/fiscal/textos";
import { buildNfeSaidaXml, buildNfseXml } from "../src/lib/fiscal-xml";
import { buildBolepixPdf, buildDanfePdf, buildDanfsePdf } from "../src/lib/pdf-docs";

function assertKeys(label: string, obj: Record<string, unknown>, keys: string[]) {
  const missing = keys.filter((k) => obj[k] === undefined || obj[k] === null || obj[k] === "");
  if (missing.length) {
    throw new Error(`${label} missing Focus keys: ${missing.join(", ")}`);
  }
}

async function main() {
  const empresa = {
    cnpj: "01423183000110",
    razaoSocial: "RLP ETIQUETAS AUTO ADESIVOS LTDA",
    nomeFantasia: "RETA ETIQUETAS",
    inscricaoEstadual: "7023251210034",
    inscricaoMunicipal: "123456",
    email: "teste@reta.com",
    telefone: "3432383955",
    cep: "38400328",
    logradouro: "AVENIDA MARCOS DE FREITAS COSTA",
    numero: "385",
    bairro: "Daniel Fonseca",
    cidade: "Uberlandia",
    uf: "MG",
    codigoMunicipioIbge: "3170206",
    ambienteFiscal: "HOMOLOGACAO" as const,
  };
  const tomador = {
    documento: "09417268000106",
    nome: "BANCA DO DINEI",
    email: "cli@test.com",
    cep: "38400000",
    logradouro: "RUA A",
    numero: "10",
    bairro: "CENTRO",
    cidade: "Uberlandia",
    uf: "MG",
    codigoMunicipioIbge: "3170206",
  };
  const agora = new Date("2026-07-28T15:00:00-03:00");
  const { chave, cNF, cDV } = montarChaveNfe({
    cnpj: empresa.cnpj,
    serie: 1,
    numero: 1,
    dhEmi: agora,
  });
  const nfeXml = buildNfeSaidaXml({
    empresa,
    destinatario: tomador,
    numero: "1",
    serie: "1",
    chave,
    cNF,
    cDV,
    naturezaOperacao: FISCAL_DEFAULTS.naturezaProducao,
    valor: 331.19,
    itens: [
      {
        codigo: "PA-ETQ-001",
        descricao: "ETIQUETAS BOPP",
        ncm: "39191090",
        cfop: "5101",
        unidade: "UN",
        quantidade: 10000,
        valorUnitario: 0.033119,
        valorTotal: 331.19,
        infAdProd: "10 ROLOS, 10.000 ETIQUETAS",
        xPed: "1",
        nItemPed: 1,
      },
    ],
    vencimento: new Date("2026-08-25"),
    autorizadoEm: agora,
    pedidoNumero: 1,
    simulado: true,
  });
  const chaveNfse = montarChaveNfse({
    codigoMunicipio: "3170206",
    cnpj: empresa.cnpj,
    numero: 1,
    dhEmi: agora,
  });
  const nfseXml = buildNfseXml({
    empresa,
    tomador,
    numero: "1",
    serie: "70000",
    valor: 312.81,
    discriminacao:
      "10 ROLOS, 10.000 ETIQUETAS, TAMANHO 5,0X2,5, PAPEL BOPP BRILHO, UMA COR, COLD STAMP + COLA",
    chave: chaveNfse,
    dpsNumero: dpsNumeroFromPedido(1),
    autorizadoEm: agora,
  });
  const checks = {
    nfe_xPed: nfeXml.includes("<xPed>1</xPed>"),
    nfe_tPag15: nfeXml.includes("<tPag>15</tPag>"),
    nfe_credito: nfeXml.includes("CREDITO DE ICMS"),
    nfe_natOp: nfeXml.includes("VENDA DE MERCADORIA"),
    nfse_IM: nfseXml.includes("<IM>123456</IM>"),
    nfse_cTrib: nfseXml.includes("<cTribNac>130501</cTribNac>"),
    nfse_nDPS: nfseXml.includes("<nDPS>200001</nDPS>"),
    nfse_serie: nfseXml.includes("<serie>70000</serie>"),
  };
  console.log("XML checks", checks);
  if (Object.values(checks).some((v) => !v)) {
    throw new Error("XML checks failed");
  }

  const focusNfeRaw = buildFocusNfePayload({
    ref: "smoke:nfe:1",
    naturezaOperacao: FISCAL_DEFAULTS.naturezaProducao,
    dataEmissao: agora,
    cnpjEmitente: empresa.cnpj,
    destinatario: {
      documento: tomador.documento,
      nome: tomador.nome,
      email: tomador.email,
      logradouro: tomador.logradouro,
      numero: tomador.numero,
      bairro: tomador.bairro,
      cidade: tomador.cidade,
      uf: tomador.uf,
      cep: tomador.cep,
      codigoMunicipio: tomador.codigoMunicipioIbge,
    },
    itens: [
      {
        descricao: "ETIQUETAS BOPP",
        quantidade: 10000,
        unidade: "UN",
        valorUnitario: 0.033119,
        valorTotal: 331.19,
        ncm: "39191090",
        cfop: "5101",
        codigo: "PA-ETQ-001",
        csosn: "102",
      },
    ],
    valorTotal: 331.19,
    serie: 1,
    numero: 1,
  });
  const focusNfe = stripFocusMeta(focusNfeRaw);
  assertKeys("NF-e Focus", focusNfe, [
    "natureza_operacao",
    "data_emissao",
    "cnpj_emitente",
    "nome_destinatario",
    "cnpj_destinatario",
    "codigo_municipio_destinatario",
    "indicador_inscricao_estadual_destinatario",
    "items",
    "valor_produtos",
    "valor_total",
    "modalidade_frete",
  ]);
  if (focusNfe._meta) throw new Error("NF-e HTTP payload must not contain _meta");
  const nfeItem = (focusNfe.items as Record<string, unknown>[])[0];
  assertKeys("NF-e item Focus", nfeItem, [
    "numero_item",
    "codigo_produto",
    "descricao",
    "codigo_ncm",
    "cfop",
    "icms_situacao_tributaria",
    "pis_situacao_tributaria",
    "cofins_situacao_tributaria",
  ]);

  const focusNfseRaw = buildFocusNfseNacionalPayload({
    ref: "smoke:nfse:1",
    dataEmissao: agora,
    serieDps: FISCAL_DEFAULTS.serieDps,
    numeroDps: Number(dpsNumeroFromPedido(1)),
    codigoMunicipio: empresa.codigoMunicipioIbge,
    cnpjPrestador: empresa.cnpj,
    inscricaoMunicipal: empresa.inscricaoMunicipal,
    cnpjTomador: tomador.documento,
    nomeTomador: tomador.nome,
    emailTomador: tomador.email,
    logradouroTomador: tomador.logradouro,
    numeroTomador: tomador.numero,
    bairroTomador: tomador.bairro,
    cepTomador: tomador.cep,
    codigoMunicipioTomador: tomador.codigoMunicipioIbge,
    descricaoServico: "10 ROLOS, 10.000 ETIQUETAS",
    valorServico: 312.81,
    codigoTributacaoNacional: FISCAL_DEFAULTS.cTribNac,
    codigoNbs: FISCAL_DEFAULTS.cNbs,
  });
  const focusNfse = stripFocusMeta(focusNfseRaw);
  assertKeys("NFS-e Nacional Focus", focusNfse, [
    "data_emissao",
    "serie_dps",
    "numero_dps",
    "codigo_municipio_emissora",
    "cnpj_prestador",
    "inscricao_municipal_prestador",
    "codigo_opcao_simples_nacional",
    "regime_apuracao_tributos_sn",
    "cnpj_tomador",
    "codigo_municipio_prestacao",
    "codigo_tributacao_nacional_iss",
    "codigo_nbs",
    "descricao_servico",
    "valor_servico",
    "tributacao_iss",
    "percentual_total_tributos_simples_nacional",
  ]);
  if (focusNfse._meta) throw new Error("NFS-e HTTP payload must not contain _meta");
  console.log("Focus payload checks OK");

  const out = "/tmp/fiscal-smoke";
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(`${out}/nfe.xml`, nfeXml);
  fs.writeFileSync(`${out}/nfse.xml`, nfseXml);

  const danfe = await buildDanfePdf({
    empresa,
    destinatarioNome: tomador.nome,
    destinatarioDoc: tomador.documento,
    destinatarioEndereco: "RUA A, 10",
    destinatarioBairro: "CENTRO",
    destinatarioCidade: "Uberlandia",
    destinatarioUf: "MG",
    destinatarioCep: "38400000",
    destinatarioIe: "0010636380009",
    numero: "6112",
    serie: "1",
    chave,
    valor: 331.19,
    naturezaOperacao: FISCAL_DEFAULTS.naturezaProducao,
    protocolo: "131267600544069",
    autorizadoEm: agora,
    pedidoNumero: 1,
    vencimento: new Date(agora.getTime() + 28 * 86400000),
    duplicatas: [
      {
        nDup: "001",
        dVenc: new Date(agora.getTime() + 28 * 86400000),
        vDup: 165.6,
      },
      {
        nDup: "002",
        dVenc: new Date(agora.getTime() + 56 * 86400000),
        vDup: 165.59,
      },
    ],
    transporte: { modalidadeFrete: 9 },
    simulado: true,
    itens: [
      {
        codigo: "PA-ETQ-001",
        descricao: "ETIQUETAS BOPP",
        ncm: "39191090",
        cfop: "5101",
        unidade: "UN",
        quantidade: 10000,
        valorUnitario: 0.0331,
        valorTotal: 331.19,
        csosn: "102",
        origem: 0,
        infAdProd: "10 ROLOS",
      },
    ],
  });
  const danfse = await buildDanfsePdf({
    empresa,
    tomadorNome: tomador.nome,
    tomadorDoc: tomador.documento,
    tomadorEndereco: "RUA A, 10",
    tomadorCidadeUf: "Uberlandia - MG",
    tomadorCep: "38400000",
    numero: "1",
    serie: "70000",
    chave: chaveNfse,
    valor: 312.81,
    discriminacao: "10 ROLOS, 10.000 ETIQUETAS",
    simulado: true,
    autorizadoEm: agora,
    dpsNumero: "200001",
  });
  const linha = buildLinhaDigitavel({
    seuNumero: "1",
    valor: 644,
    dataVencimento: "2026-08-25",
  });
  const pix = buildPixCopiaECola({
    txid: "SIM1",
    valor: 644,
    nomeRecebedor: "RETA",
    cidade: "UBERLANDIA",
  });
  const bol = await buildBolepixPdf({
    empresa,
    pagadorNome: tomador.nome,
    pagadorDoc: tomador.documento,
    valor: 644,
    vencimento: new Date("2026-08-25"),
    nossoNumero: "0000000001",
    linhaDigitavel: linha,
    pixCopiaECola: pix,
    seuNumero: "1",
    simulado: true,
    mensagem: "Pedido 1",
  });
  fs.writeFileSync(`${out}/danfe.pdf`, danfe);
  fs.writeFileSync(`${out}/danfse.pdf`, danfse);
  fs.writeFileSync(`${out}/bolepix.pdf`, bol);
  console.log("PDFs", { danfe: danfe.length, danfse: danfse.length, bolepix: bol.length });
  console.log("ok", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
