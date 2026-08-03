/**
 * Adaptador Banco Inter — Cobrança Bolepix + Banking Extrato + Saldo.
 * @see https://developers.inter.co/references/cobranca-bolepix
 * @see https://developers.inter.co/references/banking#tag/Extrato
 * @see https://developers.inter.co/references/banking#tag/Saldo
 */

export type InterAmbiente = "SANDBOX" | "PRODUCAO";

export type InterClientConfig = {
  clientId: string;
  clientSecret: string;
  contaCorrente?: string;
  ambiente: InterAmbiente;
  /** Quando true, não chama a API — retorna cobrança/extrato/saldo simulados. */
  simular: boolean;
  baseUrlSandbox?: string;
  baseUrlProd?: string;
};

export const INTER_DEFAULTS = {
  baseUrlSandbox: "https://cdpj.partners.bancointer.com.br",
  baseUrlProd: "https://cdpj.partners.bancointer.com.br",
  docCobranca: "https://developers.inter.co/references/cobranca-bolepix",
  docExtrato: "https://developers.inter.co/references/banking#tag/Extrato",
  docSaldo: "https://developers.inter.co/references/banking#tag/Saldo",
  banco: "077",
  moeda: "9",
} as const;

export type BolepixEmitRequest = {
  seuNumero: string;
  valorNominal: number;
  dataVencimento: string; // YYYY-MM-DD
  numDiasAgenda?: number;
  pagador: {
    cpfCnpj: string;
    nome: string;
    email?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };
  mensagem?: { linha1?: string; linha2?: string };
};

export type BolepixEmitResult = {
  simulado: boolean;
  codigoSolicitacao: string;
  nossoNumero: string;
  linhaDigitavel: string;
  pixCopiaECola: string;
  qrCode?: string;
  status: "EMITIDA" | "A_RECEBER" | "PAGO" | "CANCELADO" | "EXPIRADO";
  payloadEnviado: Record<string, unknown>;
};

export type ExtratoItem = {
  dataEntrada: string;
  tipoOperacao: "C" | "D";
  tipoTransacao: string;
  valor: number;
  titulo: string;
  descricao: string;
  /** Identificador estável para idempotência no ERP. */
  idTransacao?: string;
  detalhes?: Record<string, unknown>;
};

export type ExtratoResult = {
  simulado: boolean;
  dataInicio: string;
  dataFim: string;
  transacoes: ExtratoItem[];
};

/** Espelha o contrato da API Saldo Inter (banking). */
export type SaldoResult = {
  simulado: boolean;
  disponivel: number;
  bloqueadoCheque: number;
  bloqueadoJudicialmente: number;
  bloqueadoAdministrativo: number;
  limite: number;
  consultadoEm: string;
};

/** Opções para enriquecer o extrato simulado a partir do ERP. */
export type ExtratoSimuladoSeed = {
  creditos?: Array<{
    valor: number;
    titulo: string;
    descricao: string;
    dataEntrada?: string;
    tipoTransacao?: string;
    idTransacao?: string;
  }>;
  debitos?: Array<{
    valor: number;
    titulo: string;
    descricao: string;
    dataEntrada?: string;
    tipoTransacao?: string;
    idTransacao?: string;
  }>;
  /** Saldo disponível base para o snapshot simulado. */
  saldoBase?: number;
};

function onlyDigits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

/** Módulo 10 (Febraban) para campos da linha digitável. */
function mod10(num: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    let prod = Number(num[i]) * peso;
    if (prod > 9) prod = Math.floor(prod / 10) + (prod % 10);
    soma += prod;
    peso = peso === 2 ? 1 : 2;
  }
  const resto = soma % 10;
  return resto === 0 ? 0 : 10 - resto;
}

/** Fator de vencimento Febraban (base 07/10/1997). */
function fatorVencimento(dataIso: string): string {
  const base = Date.UTC(1997, 9, 7);
  const parts = dataIso.split("-").map(Number);
  const d = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  const dias = Math.max(0, Math.floor((d - base) / 86400000));
  const fator = dias > 9999 ? ((dias - 1000) % 9000) + 1000 : dias;
  return String(fator).padStart(4, "0");
}

/**
 * Linha digitável 47 dígitos (banco 077 Inter) — estrutura Febraban para homologação.
 * Não é registro bancário real; serve para UI/PDF e payloads Inter simulados.
 */
export function buildLinhaDigitavel(opts: {
  seuNumero: string;
  valor: number;
  dataVencimento: string;
}): string {
  const banco = INTER_DEFAULTS.banco;
  const moeda = INTER_DEFAULTS.moeda;
  const nosso = onlyDigits(opts.seuNumero).padStart(10, "0").slice(-10);
  const campoLivre = `109${nosso}000000000000`.slice(0, 25);
  const fator = fatorVencimento(opts.dataVencimento);
  const valor = String(Math.round(opts.valor * 100)).padStart(10, "0");

  const campo1Base = `${banco}${moeda}${campoLivre.slice(0, 5)}`;
  const campo1 = `${campo1Base}${mod10(campo1Base)}`;

  const campo2Base = campoLivre.slice(5, 15);
  const campo2 = `${campo2Base}${mod10(campo2Base)}`;

  const campo3Base = campoLivre.slice(15, 25);
  const campo3 = `${campo3Base}${mod10(campo3Base)}`;

  const barcodeSemDv = `${banco}${moeda}${fator}${valor}${campoLivre}`;
  let peso = 2;
  let soma = 0;
  for (let i = barcodeSemDv.length - 1; i >= 0; i--) {
    soma += Number(barcodeSemDv[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto === 0 || resto === 1 || resto === 10 ? 1 : 11 - resto;

  return `${campo1}${campo2}${campo3}${dv}${fator}${valor}`;
}

/** CRC16-CCITT (poly 0x1021) para EMV Pix. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
      else crc = (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function emv(id: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

/**
 * Pix copia-e-cola EMV com CRC16 real (módulo 63).
 * Homologação — não registra cobrança no DICT.
 */
export function buildPixCopiaECola(opts: {
  txid: string;
  valor: number;
  nomeRecebedor: string;
  cidade: string;
  chavePix?: string;
}): string {
  const nome = opts.nomeRecebedor.slice(0, 25).toUpperCase();
  const cidade = opts.cidade.slice(0, 15).toUpperCase();
  const txid = opts.txid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";
  const chave = opts.chavePix || `simulado-${txid}@reta.local`;
  const valor = opts.valor.toFixed(2);

  const mai = emv("00", "BR.GOV.BCB.PIX") + emv("01", chave);
  const additional = emv("05", txid);

  const semCrc =
    emv("00", "01") +
    emv("26", mai) +
    emv("52", "0000") +
    emv("53", "986") +
    emv("54", valor) +
    emv("58", "BR") +
    emv("59", nome) +
    emv("60", cidade) +
    emv("62", additional) +
    "6304";

  return semCrc + crc16(semCrc);
}

/**
 * Emite cobrança Bolepix (boleto + Pix).
 * Sandbox com simular: gera linha digitável e Pix copia-e-cola locais.
 */
export async function emitirBolepix(
  cfg: InterClientConfig,
  req: BolepixEmitRequest,
): Promise<BolepixEmitResult> {
  const payload = {
    seuNumero: req.seuNumero,
    valorNominal: req.valorNominal,
    dataVencimento: req.dataVencimento,
    numDiasAgenda: req.numDiasAgenda ?? 60,
    pagador: {
      ...req.pagador,
      cpfCnpj: onlyDigits(req.pagador.cpfCnpj),
    },
    mensagem: req.mensagem,
    _meta: {
      hub: "banco-inter",
      doc: "bolepix",
      url: INTER_DEFAULTS.docCobranca,
    },
  };

  if (cfg.simular || !cfg.clientId) {
    const codigoSolicitacao = `SIM-INTER-${req.seuNumero}-${Date.now().toString(36)}`;
    const nossoNumero = onlyDigits(req.seuNumero).padStart(10, "0").slice(-10);
    return {
      simulado: true,
      codigoSolicitacao,
      nossoNumero,
      linhaDigitavel: buildLinhaDigitavel({
        seuNumero: req.seuNumero,
        valor: req.valorNominal,
        dataVencimento: req.dataVencimento,
      }),
      pixCopiaECola: buildPixCopiaECola({
        txid: codigoSolicitacao.slice(0, 25),
        valor: req.valorNominal,
        nomeRecebedor: "RETA ETIQUETAS",
        cidade: "UBERLANDIA",
      }),
      status: "EMITIDA",
      payloadEnviado: payload,
    };
  }

  throw new Error(
    "Emissão real Inter exige certificado mTLS e token OAuth2. Use simular=true em homologação.",
  );
}

/**
 * Consulta saldo da conta corrente (API Banking · Saldo).
 * @see https://developers.inter.co/references/banking#tag/Saldo
 */
export async function consultarSaldo(
  cfg: InterClientConfig,
  opts?: { saldoBase?: number },
): Promise<SaldoResult> {
  if (cfg.simular || !cfg.clientId) {
    const base = opts?.saldoBase ?? 125_430.87;
    return {
      simulado: true,
      disponivel: round2(base),
      bloqueadoCheque: 0,
      bloqueadoJudicialmente: 0,
      bloqueadoAdministrativo: round2(Math.min(500, base * 0.002)),
      limite: 50_000,
      consultadoEm: new Date().toISOString(),
    };
  }

  throw new Error(
    "Consulta real de saldo Inter exige OAuth2 + mTLS. Use simular=true em homologação.",
  );
}

/**
 * Consulta extrato por período (conciliação de recebimentos/pagamentos).
 * @see https://developers.inter.co/references/banking#tag/Extrato
 */
export async function consultarExtrato(
  cfg: InterClientConfig,
  opts: { dataInicio: string; dataFim: string; seed?: ExtratoSimuladoSeed },
): Promise<ExtratoResult> {
  if (cfg.simular || !cfg.clientId) {
    const transacoes: ExtratoItem[] = [];

    for (const c of opts.seed?.creditos ?? []) {
      transacoes.push({
        dataEntrada: c.dataEntrada ?? opts.dataFim,
        tipoOperacao: "C",
        tipoTransacao: c.tipoTransacao ?? "PIX",
        valor: round2(c.valor),
        titulo: c.titulo,
        descricao: c.descricao,
        idTransacao: c.idTransacao,
        detalhes: { _meta: { origem: "erp-seed", url: INTER_DEFAULTS.docExtrato } },
      });
    }
    for (const d of opts.seed?.debitos ?? []) {
      transacoes.push({
        dataEntrada: d.dataEntrada ?? opts.dataFim,
        tipoOperacao: "D",
        tipoTransacao: d.tipoTransacao ?? "PAGAMENTO",
        valor: round2(d.valor),
        titulo: d.titulo,
        descricao: d.descricao,
        idTransacao: d.idTransacao,
        detalhes: { _meta: { origem: "erp-seed", url: INTER_DEFAULTS.docExtrato } },
      });
    }

    if (transacoes.length === 0) {
      transacoes.push({
        dataEntrada: opts.dataFim,
        tipoOperacao: "C",
        tipoTransacao: "PIX",
        valor: 0,
        titulo: "Sem movimentos no período",
        descricao:
          "Extrato simulado vazio — sincronize após liquidações ou consulte a API real no sandbox Inter",
        idTransacao: `sim-vazio-${opts.dataInicio}-${opts.dataFim}`,
        detalhes: { _meta: { url: INTER_DEFAULTS.docExtrato } },
      });
    }

    transacoes.sort((a, b) => a.dataEntrada.localeCompare(b.dataEntrada));

    return {
      simulado: true,
      dataInicio: opts.dataInicio,
      dataFim: opts.dataFim,
      transacoes,
    };
  }

  throw new Error(
    "Consulta real de extrato Inter exige OAuth2 + mTLS. Use simular=true em homologação.",
  );
}

/** Marca cobrança como paga (webhook Inter ou conciliação manual em teste). */
export function interpretarWebhookCobranca(body: unknown): {
  codigoSolicitacao?: string;
  nossoNumero?: string;
  situacao?: string;
  valorPago?: number;
} {
  const b = (body || {}) as Record<string, unknown>;
  return {
    codigoSolicitacao: b.codigoSolicitacao ? String(b.codigoSolicitacao) : undefined,
    nossoNumero: b.nossoNumero ? String(b.nossoNumero) : undefined,
    situacao: b.situacao ? String(b.situacao) : undefined,
    valorPago: b.valorTotalRecebido != null ? Number(b.valorTotalRecebido) : undefined,
  };
}

/** Hash estável para idempotência de lançamentos do extrato. */
export function hashExtratoItem(item: ExtratoItem): string {
  const raw = [
    item.idTransacao || "",
    item.dataEntrada,
    item.tipoOperacao,
    item.tipoTransacao,
    item.valor.toFixed(2),
    item.titulo,
    item.descricao,
  ].join("|");
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  }
  return `ext-${(h >>> 0).toString(16)}-${item.dataEntrada}-${item.tipoOperacao}-${item.valor.toFixed(2)}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
