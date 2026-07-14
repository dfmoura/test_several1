import { CompositeCnpjClient } from './composite-cnpj-client.js';
import { IbgeMunicipioClient } from './ibge-municipio-client.js';
import type { DadosCnpj, DadosMunicipioIbge, ICadastroConsultaGateway } from './types.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CachedCadastroClient implements ICadastroConsultaGateway {
  private readonly cnpjCache = new Map<string, CacheEntry<DadosCnpj | null>>();
  private readonly municipioCache = new Map<string, CacheEntry<DadosMunicipioIbge | null>>();

  constructor(
    private readonly cnpjClient = new CompositeCnpjClient(),
    private readonly ibgeClient = new IbgeMunicipioClient(),
    private readonly cacheTtlMs = 86_400_000,
  ) {}

  async consultarCnpj(cnpj: string): Promise<DadosCnpj | null> {
    const digits = cnpj.replace(/\D/g, '');
    const cached = this.cnpjCache.get(digits);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const result = await this.cnpjClient.consultar(digits);
    this.cnpjCache.set(digits, { value: result, expiresAt: Date.now() + this.cacheTtlMs });
    return result;
  }

  async dadosMunicipio(codigoIbge: string): Promise<DadosMunicipioIbge | null> {
    const code = codigoIbge.replace(/\D/g, '');
    const cached = this.municipioCache.get(code);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const result = await this.ibgeClient.dadosMunicipio(code);
    this.municipioCache.set(code, { value: result, expiresAt: Date.now() + this.cacheTtlMs });
    return result;
  }

  async nomeMunicipio(codigoIbge: string): Promise<string | null> {
    const dados = await this.dadosMunicipio(codigoIbge);
    return dados?.nome ?? null;
  }
}

export function createCadastroGateway(cacheTtlSec = 86_400): ICadastroConsultaGateway {
  return new CachedCadastroClient(
    new CompositeCnpjClient(),
    new IbgeMunicipioClient(),
    cacheTtlSec * 1000,
  );
}
