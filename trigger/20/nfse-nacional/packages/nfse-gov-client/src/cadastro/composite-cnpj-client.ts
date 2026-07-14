import { BrasilApiCnpjClient } from './brasil-api-cnpj-client.js';
import { mergeDadosCnpj } from './cnpj-data-merge.js';
import { IbgeMunicipioClient } from './ibge-municipio-client.js';
import { ReceitaWsCnpjClient } from './receitaws-cnpj-client.js';
import type { DadosCnpj } from './types.js';

function isValidIbge(code?: string): boolean {
  const digits = (code ?? '').replace(/\D/g, '');
  return digits.length === 7 && digits !== '0000000';
}

/**
 * Consulta CNPJ em paralelo na Brasil API e Receita WS, unificando o resultado.
 * Brasil API é prioridade para código IBGE; Receita WS complementa campos adicionais.
 */
export class CompositeCnpjClient {
  constructor(
    private readonly brasil = new BrasilApiCnpjClient(),
    private readonly receitaws = new ReceitaWsCnpjClient(),
    private readonly ibge = new IbgeMunicipioClient(),
  ) {}

  async consultar(cnpj: string): Promise<DadosCnpj | null> {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return null;

    const [brasilResult, receitaResult] = await Promise.allSettled([
      this.brasil.consultar(digits),
      this.receitaws.consultar(digits),
    ]);

    const brasilData = brasilResult.status === 'fulfilled' ? brasilResult.value : null;
    const receitaData = receitaResult.status === 'fulfilled' ? receitaResult.value : null;

    let merged = mergeDadosCnpj(brasilData, receitaData);
    if (!merged) return null;

    merged = await this.resolveIbgeIfNeeded(merged);
    return merged;
  }

  private async resolveIbgeIfNeeded(dados: DadosCnpj): Promise<DadosCnpj> {
    if (isValidIbge(dados.endereco.codigoMunicipio)) return dados;

    const nome = dados.endereco.nomeMunicipio?.trim();
    const uf = dados.endereco.uf?.trim();
    if (!nome || !uf) return dados;

    try {
      const codigo = await this.ibge.buscarCodigoPorNomeUf(nome, uf);
      if (!codigo) return dados;

      return {
        ...dados,
        endereco: {
          ...dados.endereco,
          codigoMunicipio: codigo,
        },
      };
    } catch {
      return dados;
    }
  }
}
