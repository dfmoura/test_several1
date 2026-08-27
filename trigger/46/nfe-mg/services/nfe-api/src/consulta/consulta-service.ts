import { ValidationError } from '@nfe/shared';
import {
  buscarCfop,
  buscarCest,
  buscarNcm,
  CST_IBS_CBS_OPTIONS,
  CCLASS_TRIB_OPTIONS,
  CST_OPTIONS,
  CST_PIS_COFINS_OPTIONS,
  CSOSN_OPTIONS,
  CST_IS_OPTIONS,
  TIPO_ITEM_SPED_OPTIONS,
  ORIGEM_MERCADORIA,
} from '@nfe/domain';

type CacheEntry = { expires: number; payload: unknown };

const memoryCache = new Map<string, CacheEntry>();

function cacheGet<T>(key: string): T | null {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    memoryCache.delete(key);
    return null;
  }
  return hit.payload as T;
}

function cacheSet(key: string, payload: unknown, ttlMs: number) {
  memoryCache.set(key, { payload, expires: Date.now() + ttlMs });
}

function onlyDigits(v: string): string {
  return v.replace(/\D/g, '');
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} em ${url}`);
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }
    return res.json();
  } finally {
    clearTimeout(t);
  }
}

export interface CnpjConsulta {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacaoCadastral?: string;
  cnae?: string;
  cnaeDescricao?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  codigoMunicipio?: string;
  telefone?: string;
  email?: string;
  fonte: string;
  cacheHit: boolean;
}

export interface CepConsulta {
  cep: string;
  logradouro: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  codigoMunicipio: string;
  fonte: string;
  cacheHit: boolean;
}

export interface FiscalOption {
  codigo: string;
  descricao: string;
  meta?: string;
  observacao?: string;
  destaque?: boolean;
}

export class ConsultaService {
  async cnpj(raw: string): Promise<CnpjConsulta> {
    const cnpj = onlyDigits(raw);
    if (cnpj.length !== 14) throw new ValidationError('CNPJ deve ter 14 dígitos');

    const cacheKey = `cnpj:${cnpj}`;
    const cached = cacheGet<CnpjConsulta>(cacheKey);
    if (cached) return { ...cached, cacheHit: true };

    const base = process.env.BRASILAPI_BASE?.replace(/\/$/, '') || 'https://brasilapi.com.br/api';
    let data: Record<string, unknown>;
    try {
      data = (await fetchJson(`${base}/cnpj/v1/${cnpj}`)) as Record<string, unknown>;
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 404) throw new ValidationError('CNPJ não encontrado na base pública');
      throw new ValidationError('Falha ao consultar CNPJ (BrasilAPI). Tente novamente.');
    }

    const cep = onlyDigits(String(data.cep ?? ''));
    let codigoMunicipio = '';
    if (cep.length === 8) {
      try {
        const cepData = await this.cep(cep);
        codigoMunicipio = cepData.codigoMunicipio;
      } catch {
        /* IBGE opcional no enrich */
      }
    }

    const payload: CnpjConsulta = {
      cnpj,
      razaoSocial: String(data.razao_social ?? data.nome ?? ''),
      nomeFantasia: data.nome_fantasia ? String(data.nome_fantasia) : undefined,
      situacaoCadastral: data.descricao_situacao_cadastral
        ? String(data.descricao_situacao_cadastral)
        : undefined,
      cnae: data.cnae_fiscal != null ? String(data.cnae_fiscal) : undefined,
      cnaeDescricao: data.cnae_fiscal_descricao ? String(data.cnae_fiscal_descricao) : undefined,
      logradouro: [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(' ').trim() || undefined,
      numero: data.numero != null ? String(data.numero) : undefined,
      complemento: data.complemento ? String(data.complemento) : undefined,
      bairro: data.bairro ? String(data.bairro) : undefined,
      municipio: data.municipio ? String(data.municipio) : undefined,
      uf: data.uf ? String(data.uf) : undefined,
      cep: cep || undefined,
      codigoMunicipio: codigoMunicipio || undefined,
      telefone: data.ddd_telefone_1 ? String(data.ddd_telefone_1) : undefined,
      email: data.email ? String(data.email) : undefined,
      fonte: 'brasilapi',
      cacheHit: false,
    };

    cacheSet(cacheKey, payload, 30 * 24 * 60 * 60 * 1000);
    return payload;
  }

  async cep(raw: string): Promise<CepConsulta> {
    const cep = onlyDigits(raw);
    if (cep.length !== 8) throw new ValidationError('CEP deve ter 8 dígitos');

    const cacheKey = `cep:${cep}`;
    const cached = cacheGet<CepConsulta>(cacheKey);
    if (cached) return { ...cached, cacheHit: true };

    // ViaCEP first
    try {
      const via = (await fetchJson(`https://viacep.com.br/ws/${cep}/json/`)) as Record<string, unknown>;
      if (!via.erro) {
        const payload: CepConsulta = {
          cep,
          logradouro: String(via.logradouro ?? ''),
          complemento: via.complemento ? String(via.complemento) : undefined,
          bairro: String(via.bairro ?? ''),
          municipio: String(via.localidade ?? ''),
          uf: String(via.uf ?? ''),
          codigoMunicipio: String(via.ibge ?? ''),
          fonte: 'viacep',
          cacheHit: false,
        };
        if (payload.codigoMunicipio.length === 7) {
          cacheSet(cacheKey, payload, 90 * 24 * 60 * 60 * 1000);
          return payload;
        }
      }
    } catch {
      /* fallback */
    }

    const base = process.env.BRASILAPI_BASE?.replace(/\/$/, '') || 'https://brasilapi.com.br/api';
    try {
      const br = (await fetchJson(`${base}/cep/v1/${cep}`)) as Record<string, unknown>;
      const payload: CepConsulta = {
        cep,
        logradouro: String(br.street ?? ''),
        bairro: String(br.neighborhood ?? ''),
        municipio: String(br.city ?? ''),
        uf: String(br.state ?? ''),
        codigoMunicipio: '',
        fonte: 'brasilapi_cep_v1',
        cacheHit: false,
      };
      // BrasilAPI v1 sem IBGE — tenta OpenCEP
      try {
        const oc = (await fetchJson(`https://opencep.com/v1/${cep}`)) as Record<string, unknown>;
        if (oc.ibge) payload.codigoMunicipio = String(oc.ibge);
        if (!payload.logradouro && oc.logradouro) payload.logradouro = String(oc.logradouro);
        if (!payload.bairro && oc.bairro) payload.bairro = String(oc.bairro);
        payload.fonte = 'brasilapi+opencep';
      } catch {
        /* ok */
      }
      if (payload.codigoMunicipio.length !== 7 && !payload.municipio) {
        throw new ValidationError('CEP não encontrado');
      }
      cacheSet(cacheKey, payload, 90 * 24 * 60 * 60 * 1000);
      return payload;
    } catch {
      throw new ValidationError('Falha ao consultar CEP. Verifique o número e tente novamente.');
    }
  }

  async ncm(q = '', limit = 20): Promise<FiscalOption[]> {
    const local = buscarNcm(q, limit).map((n) => ({
      codigo: n.codigo,
      descricao: n.descricao,
      destaque: n.destaque,
    }));
    if (local.length >= Math.min(8, limit) || q.trim().length < 3) return local;

    // Enrich thin results via BrasilAPI
    try {
      const base = process.env.BRASILAPI_BASE?.replace(/\/$/, '') || 'https://brasilapi.com.br/api';
      const rows = (await fetchJson(
        `${base}/ncm/v1?search=${encodeURIComponent(q.trim())}`,
        6000,
      )) as Array<Record<string, unknown>>;
      const remote = (Array.isArray(rows) ? rows : [])
        .map((r) => ({
          codigo: onlyDigits(String(r.codigo ?? '')).slice(0, 8),
          descricao: String(r.descricao ?? r.description ?? ''),
          destaque: undefined as boolean | undefined,
        }))
        .filter((r) => r.codigo.length === 8 && r.descricao);
      const seen = new Set(local.map((x) => x.codigo));
      for (const r of remote) {
        if (!seen.has(r.codigo)) {
          local.push(r);
          seen.add(r.codigo);
        }
        if (local.length >= limit) break;
      }
    } catch {
      /* local only */
    }
    return local.slice(0, limit);
  }

  cest(q = '', ncm?: string, limit = 20): FiscalOption[] {
    return buscarCest(q, ncm, limit).map((c) => ({
      codigo: c.codigo,
      descricao: c.descricao,
      observacao: c.observacao,
    }));
  }

  cfop(q = '', tipo?: 'entrada' | 'saida'): FiscalOption[] {
    return buscarCfop(q, tipo).map((c) => ({
      codigo: c.codigo,
      descricao: c.descricao,
      meta: c.tipo,
    }));
  }

  filterStatic(
    items: readonly { codigo: string; descricao: string; destaque?: boolean }[],
    q: string,
    limit = 30,
  ): FiscalOption[] {
    const query = q.trim().toLowerCase();
    const list = !query
      ? [...items]
      : items.filter(
          (i) => i.codigo.toLowerCase().includes(query) || i.descricao.toLowerCase().includes(query),
        );
    return list.slice(0, limit).map((i) => ({
      codigo: i.codigo,
      descricao: i.descricao,
      destaque: 'destaque' in i ? Boolean((i as { destaque?: boolean }).destaque) : undefined,
    }));
  }

  csosn(q = '') { return this.filterStatic(CSOSN_OPTIONS, q); }
  cstIcms(q = '') { return this.filterStatic(CST_OPTIONS, q); }
  cstPisCofins(q = '') { return this.filterStatic(CST_PIS_COFINS_OPTIONS, q); }
  cstIbsCbs(q = '') { return this.filterStatic(CST_IBS_CBS_OPTIONS, q); }
  cclassTrib(q = '') { return this.filterStatic(CCLASS_TRIB_OPTIONS, q); }
  cstIs(q = '') { return this.filterStatic(CST_IS_OPTIONS, q); }
  tipoItemSped(q = '') { return this.filterStatic(TIPO_ITEM_SPED_OPTIONS, q); }
  origem(q = '') { return this.filterStatic(ORIGEM_MERCADORIA, q); }
}
