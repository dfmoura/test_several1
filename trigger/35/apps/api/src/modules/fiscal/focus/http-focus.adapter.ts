import type {
  FocusCancelarInput,
  FocusCancelarResult,
  FocusCceInput,
  FocusCceResult,
  FocusEmitirInput,
  FocusEmitirResult,
  FocusNfePort,
} from './focus.port.js';

type HttpFocusConfig = {
  baseUrl: string;
  token: string;
};

/**
 * Adapter HTTP Focus NFe/NFS-e (Basic Auth: token como usuário, senha vazia).
 * Mapeia o contrato interno → payload mínimo Focus; numero/série/chave vêm da resposta.
 * Sem credenciais o factory não instancia esta classe (permanece stub).
 */
export class HttpFocusNfeAdapter implements FocusNfePort {
  readonly name = 'http';

  constructor(private readonly cfg: HttpFocusConfig) {}

  async emitir(input: FocusEmitirInput): Promise<FocusEmitirResult> {
    const base = this.cfg.baseUrl.replace(/\/+$/, '');
    const path = input.tipo === 'NFSE' ? 'nfse' : 'nfe';
    const ref = sanitizeRef(input.idempotencyKey || input.referenciaInterna);
    const url = `${base}/${path}?ref=${encodeURIComponent(ref)}`;
    const body = input.tipo === 'NFSE' ? buildNfsePayload(input) : buildNfePayload(input);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: basicAuth(this.cfg.token),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falha de rede';
      return {
        ok: false,
        adapter: this.name,
        codigo: 'FOCUS_REDE',
        mensagem: `Falha ao contatar Focus: ${msg}`,
      };
    }

    const raw = (await safeJson(response)) ?? {};
    if (response.status === 202) {
      return {
        ok: false,
        adapter: this.name,
        codigo: 'FOCUS_PROCESSANDO',
        mensagem:
          'Focus aceitou a nota em modo assíncrono (202). Consulte a ref ou aguarde webhook.',
        raw,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        adapter: this.name,
        codigo: String(raw.codigo ?? `FOCUS_HTTP_${response.status}`),
        mensagem: String(raw.mensagem ?? raw.message ?? `Focus HTTP ${response.status}`),
        raw,
      };
    }

    const status = String(raw.status ?? '').toLowerCase();
    if (status.includes('erro') || status === 'erro_autorizacao') {
      return {
        ok: false,
        adapter: this.name,
        codigo: String(raw.codigo ?? 'FOCUS_REJEICAO'),
        mensagem: String(raw.mensagem_sefaz ?? raw.mensagem ?? 'Focus rejeitou a autorização'),
        raw,
      };
    }

    if (input.tipo === 'NFE') {
      const chave44 = digitsOnly(String(raw.chave_nfe ?? raw.chave ?? ''));
      const numero = String(raw.numero ?? '');
      const serie = String(raw.serie ?? '1');
      if (!chave44 || chave44.length !== 44 || !numero) {
        return {
          ok: false,
          adapter: this.name,
          codigo: 'FOCUS_RESPOSTA_INCOMPLETA',
          mensagem: 'Resposta Focus sem chave44/número autorizados',
          raw,
        };
      }
      return {
        ok: true,
        adapter: this.name,
        focusRef: ref,
        serie,
        numero,
        chave44,
        protocolo: String(raw.protocolo ?? raw.numero_protocolo ?? ''),
        xmlRef: String(raw.caminho_xml_nota_fiscal ?? raw.caminho_xml ?? `focus://xml/${ref}`),
        pdfRef: String(raw.caminho_danfe ?? raw.caminho_pdf ?? `focus://pdf/${ref}`),
        raw,
      };
    }

    // NFS-e
    const numero = String(raw.numero ?? raw.numero_rps ?? '');
    if (!numero) {
      return {
        ok: false,
        adapter: this.name,
        codigo: 'FOCUS_RESPOSTA_INCOMPLETA',
        mensagem: 'Resposta Focus NFS-e sem número',
        raw,
      };
    }
    const chaveLike = digitsOnly(
      String(raw.codigo_verificacao ?? raw.chave_nfse ?? raw.codigo ?? ref),
    )
      .padEnd(44, '0')
      .slice(0, 44);

    return {
      ok: true,
      adapter: this.name,
      focusRef: ref,
      serie: String(raw.serie_rps ?? '1'),
      numero,
      chave44: chaveLike,
      protocolo: String(raw.codigo_verificacao ?? raw.protocolo ?? ''),
      xmlRef: String(raw.caminho_xml_nota_fiscal ?? `focus://xml/${ref}`),
      pdfRef: String(raw.caminho_danfe ?? `focus://pdf/${ref}`),
      raw,
    };
  }

  async cancelar(input: FocusCancelarInput): Promise<FocusCancelarResult> {
    const base = this.cfg.baseUrl.replace(/\/+$/, '');
    const ref = sanitizeRef(input.focusRef || input.idempotencyKey);
    const url = `${base}/nfe/${encodeURIComponent(ref)}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: basicAuth(this.cfg.token),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ justificativa: input.justificativa }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falha de rede';
      return {
        ok: false,
        adapter: this.name,
        codigo: 'FOCUS_REDE',
        mensagem: `Falha ao cancelar Focus: ${msg}`,
      };
    }
    const raw = (await safeJson(response)) ?? {};
    if (!response.ok) {
      return {
        ok: false,
        adapter: this.name,
        codigo: String(raw.codigo ?? `FOCUS_HTTP_${response.status}`),
        mensagem: String(raw.mensagem ?? raw.message ?? `Focus HTTP ${response.status}`),
        raw,
      };
    }
    return {
      ok: true,
      adapter: this.name,
      protocoloCancelamento: String(raw.protocolo ?? raw.numero_protocolo ?? ''),
      raw,
    };
  }

  async emitirCce(input: FocusCceInput): Promise<FocusCceResult> {
    const base = this.cfg.baseUrl.replace(/\/+$/, '');
    const ref = sanitizeRef(input.focusRef || input.idempotencyKey);
    const url = `${base}/nfe/${encodeURIComponent(ref)}/carta_correcao`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: basicAuth(this.cfg.token),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          correcao: input.correcao,
          sequencia: input.sequencia,
        }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falha de rede';
      return {
        ok: false,
        adapter: this.name,
        codigo: 'FOCUS_REDE',
        mensagem: `Falha CC-e Focus: ${msg}`,
      };
    }
    const raw = (await safeJson(response)) ?? {};
    if (!response.ok) {
      return {
        ok: false,
        adapter: this.name,
        codigo: String(raw.codigo ?? `FOCUS_HTTP_${response.status}`),
        mensagem: String(raw.mensagem ?? raw.message ?? `Focus HTTP ${response.status}`),
        raw,
      };
    }
    return {
      ok: true,
      adapter: this.name,
      sequencia: input.sequencia,
      protocolo: String(raw.protocolo ?? raw.numero_protocolo ?? ''),
      xmlRef: String(raw.caminho_xml_carta_correcao ?? `focus://cce/${ref}`),
      raw,
    };
  }
}

function basicAuth(token: string): string {
  return `Basic ${Buffer.from(`${token}:`, 'utf8').toString('base64')}`;
}

function sanitizeRef(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || `ref${Date.now()}`;
}

function digitsOnly(v: string): string {
  return v.replace(/\D/g, '');
}

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const t = await res.text();
    if (!t) return {};
    return JSON.parse(t) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildNfePayload(input: FocusEmitirInput): Record<string, unknown> {
  const doc = digitsOnly(input.destinatario.cnpjCpf ?? '');
  const isCnpj = doc.length === 14;
  return {
    natureza_operacao: input.naturezaOperacao,
    data_emissao: new Date().toISOString(),
    tipo_documento: 1,
    finalidade_emissao: 1,
    local_destino: 1,
    consumidor_final: 1,
    presenca_comprador: 9,
    modalidade_frete: 9,
    nome_destinatario: input.destinatario.razaoSocial,
    ...(isCnpj
      ? { cnpj_destinatario: doc }
      : { cpf_destinatario: doc.padStart(11, '0').slice(0, 11) }),
    indicador_inscricao_estadual_destinatario: 9,
    uf_destinatario: input.destinatario.uf ?? 'SP',
    items: input.itens.map((it, idx) => ({
      numero_item: idx + 1,
      codigo_produto: it.codigo ?? `ITEM${idx + 1}`,
      descricao: it.descricao,
      codigo_ncm: digitsOnly(it.ncm ?? '00000000').padStart(8, '0').slice(0, 8),
      cfop: Number(digitsOnly(it.cfop ?? '5102').slice(0, 4) || '5102'),
      unidade_comercial: it.unidade,
      quantidade_comercial: Number(it.quantidade),
      valor_unitario_comercial: Number(it.valorUnitario),
      valor_unitario_tributavel: Number(it.valorUnitario),
      unidade_tributavel: it.unidade,
      quantidade_tributavel: Number(it.quantidade),
      valor_bruto: Number(it.valorTotal),
      icms_origem: 0,
      icms_situacao_tributaria: it.csosn ?? '102',
    })),
    formas_pagamento: [
      {
        forma_pagamento: '99',
        valor_pagamento: Number(input.valorTotal),
      },
    ],
  };
}

function buildNfsePayload(input: FocusEmitirInput): Record<string, unknown> {
  const doc = digitsOnly(input.destinatario.cnpjCpf ?? '');
  const isCnpj = doc.length === 14;
  const item = input.itens[0];
  return {
    data_emissao: new Date().toISOString(),
    natureza_operacao: '1',
    optante_simples_nacional: true,
    incentivador_cultural: false,
    prestacao: {
      codigo_municipio: '3550308',
    },
    tomador: {
      razao_social: input.destinatario.razaoSocial,
      ...(isCnpj ? { cnpj: doc } : { cpf: doc.padStart(11, '0').slice(0, 11) }),
    },
    servico: {
      discriminacao: item?.descricao ?? input.naturezaOperacao,
      valor_servicos: Number(input.valorTotal),
      iss_retido: false,
      item_lista_servico: '14.01',
      codigo_municipio: '3550308',
    },
  };
}
