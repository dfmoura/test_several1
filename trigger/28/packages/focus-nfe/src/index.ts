/**
 * Adaptador Focus NFe — hub fiscal de entrada e saída.
 * @see https://doc.focusnfe.com.br/reference/nfe
 * @see https://doc.focusnfe.com.br/reference/nfse-nacional
 *
 * Em homologação (`simular=true`) monta payloads e não faz POST externo.
 */

export type FocusAmbiente = "HOMOLOGACAO" | "PRODUCAO";

export type FocusClientConfig = {
  token: string;
  ambiente: FocusAmbiente;
  /** Quando true, não chama a API — retorna documento simulado. */
  simular: boolean;
  baseUrlHomolog?: string;
  baseUrlProd?: string;
};

export const FOCUS_DEFAULTS = {
  baseUrlHomolog: "https://homologacao.focusnfe.com.br",
  baseUrlProd: "https://api.focusnfe.com.br",
  cTribNac: "130501",
  cNbs: "121012100",
  xNbs: "Serviços de impressão",
  cfopRevenda: "5102",
  naturezaRevenda: "VENDA DE MERCADORIA ADQUIRIDA OU RECEBIDA DE TERCEIROS",
  csosn: "102",
  serieDps: 70000,
  docNfe: "https://doc.focusnfe.com.br/reference/nfe",
  docNfse: "https://doc.focusnfe.com.br/reference/nfse-nacional",
  docUrl: "https://doc.focusnfe.com.br/reference/introducao",
} as const;

export type FocusEmitResult = {
  simulado: boolean;
  ref: string;
  status: "autorizado" | "processando_autorizacao" | "erro_autorizacao" | "cancelado";
  chave?: string;
  numero?: string;
  mensagem?: string;
  protocolo?: string;
  payloadEnviado: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
};

export type {
  FocusNfeRequest,
  FocusNfeItem,
  FocusNfseNacionalRequest,
  FocusApiResponse,
  FocusStatus,
} from "./types";

function baseUrl(cfg: FocusClientConfig): string {
  if (cfg.ambiente === "PRODUCAO") {
    return cfg.baseUrlProd || FOCUS_DEFAULTS.baseUrlProd;
  }
  return cfg.baseUrlHomolog || FOCUS_DEFAULTS.baseUrlHomolog;
}

function authHeader(token: string): string {
  return `Basic ${Buffer.from(`${token}:`).toString("base64")}`;
}

async function focusFetch(
  cfg: FocusClientConfig,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const url = `${baseUrl(cfg)}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(cfg.token),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, body: data };
}

function mapStatus(raw: string | undefined): FocusEmitResult["status"] {
  if (raw === "autorizado") return "autorizado";
  if (raw === "cancelado") return "cancelado";
  if (raw === "erro_autorizacao" || raw === "erro") return "erro_autorizacao";
  return "processando_autorizacao";
}

/**
 * Emite NF-e via Focus `/v2/nfe?ref=`.
 * @see https://doc.focusnfe.com.br/reference/emitir_nfe.md
 */
export async function emitirNfe(
  cfg: FocusClientConfig,
  ref: string,
  payload: Record<string, unknown>,
): Promise<FocusEmitResult> {
  if (cfg.simular || !cfg.token) {
    return {
      simulado: true,
      ref,
      status: "autorizado",
      chave: String(payload.chave || ""),
      numero: String(payload.numero || ""),
      payloadEnviado: payload,
      responseBody: { status: "autorizado", ref, simulado: true },
    };
  }

  const { ok, body } = await focusFetch(
    cfg,
    "POST",
    `/v2/nfe?ref=${encodeURIComponent(ref)}`,
    payload,
  );
  if (!ok) {
    return {
      simulado: false,
      ref,
      status: "erro_autorizacao",
      mensagem: String(body.mensagem || body.message || "Erro Focus NF-e"),
      payloadEnviado: payload,
      responseBody: body,
    };
  }
  return {
    simulado: false,
    ref,
    status: mapStatus(String(body.status || "processando_autorizacao")),
    chave: body.chave ? String(body.chave) : undefined,
    numero: body.numero != null ? String(body.numero) : undefined,
    protocolo: body.protocolo ? String(body.protocolo) : undefined,
    payloadEnviado: payload,
    responseBody: body,
  };
}

/**
 * Emite NFS-e Nacional via Focus `/v2/nfsen?ref=`.
 * @see https://doc.focusnfe.com.br/reference/emitir_dps_nacional.md
 */
export async function emitirNfseNacional(
  cfg: FocusClientConfig,
  ref: string,
  payload: Record<string, unknown>,
): Promise<FocusEmitResult> {
  if (cfg.simular || !cfg.token) {
    return {
      simulado: true,
      ref,
      status: "autorizado",
      chave: String(payload.chave || ""),
      numero: String(payload.numero_dps || payload.numero || ""),
      payloadEnviado: payload,
      responseBody: { status: "autorizado", ref, simulado: true },
    };
  }

  const { ok, body } = await focusFetch(
    cfg,
    "POST",
    `/v2/nfsen?ref=${encodeURIComponent(ref)}`,
    payload,
  );
  if (!ok) {
    return {
      simulado: false,
      ref,
      status: "erro_autorizacao",
      mensagem: String(body.mensagem || body.message || "Erro Focus NFS-e Nacional"),
      payloadEnviado: payload,
      responseBody: body,
    };
  }
  return {
    simulado: false,
    ref,
    status: mapStatus(String(body.status || "processando_autorizacao")),
    chave: body.chave ? String(body.chave) : undefined,
    numero: body.numero != null ? String(body.numero) : undefined,
    protocolo: body.protocolo ? String(body.protocolo) : undefined,
    payloadEnviado: payload,
    responseBody: body,
  };
}

/** Consulta NF-e emitida. */
export async function consultarNfe(
  cfg: FocusClientConfig,
  ref: string,
): Promise<FocusEmitResult> {
  if (cfg.simular || !cfg.token) {
    return {
      simulado: true,
      ref,
      status: "autorizado",
      payloadEnviado: {},
      responseBody: { status: "autorizado", ref, simulado: true },
    };
  }
  const { ok, body } = await focusFetch(cfg, "GET", `/v2/nfe/${encodeURIComponent(ref)}`);
  return {
    simulado: false,
    ref,
    status: ok
      ? mapStatus(String(body.status || "processando_autorizacao"))
      : "erro_autorizacao",
    chave: body.chave ? String(body.chave) : undefined,
    mensagem: body.mensagem ? String(body.mensagem) : undefined,
    payloadEnviado: {},
    responseBody: body,
  };
}

/** Consulta NFS-e Nacional emitida. */
export async function consultarNfseNacional(
  cfg: FocusClientConfig,
  ref: string,
): Promise<FocusEmitResult> {
  if (cfg.simular || !cfg.token) {
    return {
      simulado: true,
      ref,
      status: "autorizado",
      payloadEnviado: {},
      responseBody: { status: "autorizado", ref, simulado: true },
    };
  }
  const { ok, body } = await focusFetch(cfg, "GET", `/v2/nfsen/${encodeURIComponent(ref)}`);
  return {
    simulado: false,
    ref,
    status: ok
      ? mapStatus(String(body.status || "processando_autorizacao"))
      : "erro_autorizacao",
    chave: body.chave ? String(body.chave) : undefined,
    mensagem: body.mensagem ? String(body.mensagem) : undefined,
    payloadEnviado: {},
    responseBody: body,
  };
}

/** Cancela NF-e autorizada (síncrono). */
export async function cancelarNfe(
  cfg: FocusClientConfig,
  ref: string,
  justificativa: string,
): Promise<FocusEmitResult> {
  const payload = { justificativa };
  if (cfg.simular || !cfg.token) {
    return {
      simulado: true,
      ref,
      status: "cancelado",
      payloadEnviado: payload,
      responseBody: { status: "cancelado", ref, simulado: true },
    };
  }
  const { ok, body } = await focusFetch(
    cfg,
    "DELETE",
    `/v2/nfe/${encodeURIComponent(ref)}`,
    payload,
  );
  return {
    simulado: false,
    ref,
    status: ok ? "cancelado" : "erro_autorizacao",
    mensagem: body.mensagem ? String(body.mensagem) : undefined,
    payloadEnviado: payload,
    responseBody: body,
  };
}

/** Cancela NFS-e Nacional autorizada (síncrono). */
export async function cancelarNfseNacional(
  cfg: FocusClientConfig,
  ref: string,
  justificativa: string,
): Promise<FocusEmitResult> {
  const payload = { justificativa };
  if (cfg.simular || !cfg.token) {
    return {
      simulado: true,
      ref,
      status: "cancelado",
      payloadEnviado: payload,
      responseBody: { status: "cancelado", ref, simulado: true },
    };
  }
  const { ok, body } = await focusFetch(
    cfg,
    "DELETE",
    `/v2/nfsen/${encodeURIComponent(ref)}`,
    payload,
  );
  return {
    simulado: false,
    ref,
    status: ok ? "cancelado" : "erro_autorizacao",
    mensagem: body.mensagem ? String(body.mensagem) : undefined,
    payloadEnviado: payload,
    responseBody: body,
  };
}

/** Carta de Correção Eletrônica (NF-e). */
export async function emitirCartaCorrecaoNfe(
  cfg: FocusClientConfig,
  ref: string,
  correcao: string,
): Promise<FocusEmitResult> {
  const payload = { correcao };
  if (cfg.simular || !cfg.token) {
    return {
      simulado: true,
      ref,
      status: "autorizado",
      payloadEnviado: payload,
      responseBody: { status: "autorizado", ref, simulado: true },
    };
  }
  const { ok, body } = await focusFetch(
    cfg,
    "POST",
    `/v2/nfe/${encodeURIComponent(ref)}/carta_correcao`,
    payload,
  );
  return {
    simulado: false,
    ref,
    status: ok ? "autorizado" : "erro_autorizacao",
    mensagem: body.mensagem ? String(body.mensagem) : undefined,
    payloadEnviado: payload,
    responseBody: body,
  };
}

/** Envia NF-e por e-mail. */
export async function enviarNfeEmail(
  cfg: FocusClientConfig,
  ref: string,
  emails: string[],
): Promise<FocusEmitResult> {
  const payload = { emails };
  if (cfg.simular || !cfg.token) {
    return {
      simulado: true,
      ref,
      status: "autorizado",
      payloadEnviado: payload,
      responseBody: { status: "ok", ref, simulado: true },
    };
  }
  const { ok, body } = await focusFetch(
    cfg,
    "POST",
    `/v2/nfe/${encodeURIComponent(ref)}/email`,
    payload,
  );
  return {
    simulado: false,
    ref,
    status: ok ? "autorizado" : "erro_autorizacao",
    mensagem: body.mensagem ? String(body.mensagem) : undefined,
    payloadEnviado: payload,
    responseBody: body,
  };
}

/** Inutiliza faixa de numeração NF-e. */
export async function inutilizarNumeracaoNfe(
  cfg: FocusClientConfig,
  opts: {
    cnpj: string;
    serie: number;
    numero_inicial: number;
    numero_final: number;
    justificativa: string;
  },
): Promise<FocusEmitResult> {
  if (cfg.simular || !cfg.token) {
    return {
      simulado: true,
      ref: `inut:${opts.serie}:${opts.numero_inicial}`,
      status: "autorizado",
      payloadEnviado: opts,
      responseBody: { status: "autorizado", simulado: true },
    };
  }
  const { ok, body } = await focusFetch(cfg, "POST", `/v2/nfe/inutilizacao`, opts);
  return {
    simulado: false,
    ref: `inut:${opts.serie}:${opts.numero_inicial}`,
    status: ok ? "autorizado" : "erro_autorizacao",
    mensagem: body.mensagem ? String(body.mensagem) : undefined,
    payloadEnviado: opts,
    responseBody: body,
  };
}

/** Solicita reenvio de notificação (webhook) NF-e. */
export async function reenviarHookNfe(
  cfg: FocusClientConfig,
  ref: string,
): Promise<FocusEmitResult> {
  if (cfg.simular || !cfg.token) {
    return {
      simulado: true,
      ref,
      status: "autorizado",
      payloadEnviado: {},
      responseBody: { status: "ok", simulado: true },
    };
  }
  const { ok, body } = await focusFetch(
    cfg,
    "POST",
    `/v2/nfe/${encodeURIComponent(ref)}/hook`,
  );
  return {
    simulado: false,
    ref,
    status: ok ? "autorizado" : "erro_autorizacao",
    mensagem: body.mensagem ? String(body.mensagem) : undefined,
    payloadEnviado: {},
    responseBody: body,
  };
}

/** Solicita reenvio de notificação (webhook) NFS-e Nacional. */
export async function reenviarHookNfseNacional(
  cfg: FocusClientConfig,
  ref: string,
): Promise<FocusEmitResult> {
  if (cfg.simular || !cfg.token) {
    return {
      simulado: true,
      ref,
      status: "autorizado",
      payloadEnviado: {},
      responseBody: { status: "ok", simulado: true },
    };
  }
  const { ok, body } = await focusFetch(
    cfg,
    "POST",
    `/v2/nfsen/${encodeURIComponent(ref)}/hook`,
  );
  return {
    simulado: false,
    ref,
    status: ok ? "autorizado" : "erro_autorizacao",
    mensagem: body.mensagem ? String(body.mensagem) : undefined,
    payloadEnviado: {},
    responseBody: body,
  };
}

/** Consulta NFe recebida (entrada de compra). */
export async function consultarNfeRecebida(
  cfg: FocusClientConfig,
  chave: string,
): Promise<{ simulado: boolean; chave: string; xml?: string }> {
  if (cfg.simular || !cfg.token) {
    return { simulado: true, chave };
  }
  const url = `${baseUrl(cfg)}/v2/nfes_recebidas/${encodeURIComponent(chave)}.xml`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader(cfg.token) },
  });
  if (!res.ok) {
    throw new Error(`Focus NFe recebida: ${res.status}`);
  }
  return { simulado: false, chave, xml: await res.text() };
}
