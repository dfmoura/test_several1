import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EmitirNfseInput } from '@nfse/domain';
import type { DadosCnpj, ICadastroConsultaGateway } from '@nfse/gov-client';
import { CadastroEnrichmentService } from './cadastro-enrichment.js';
import type { EmitenteResolvido } from './emitente-resolver.js';

const dadosCnpj: DadosCnpj = {
  cnpj: '51124668000181',
  razaoSocial: 'TOMADOR EXEMPLO LTDA',
  situacaoCadastral: 'ATIVA',
  email: 'tomador@exemplo.com',
  telefone: '34999998888',
  endereco: {
    logradouro: 'RUA TESTE',
    numero: '100',
    bairro: 'CENTRO',
    codigoMunicipio: '3170206',
    uf: 'MG',
    cep: '38400000',
    nomeMunicipio: 'Uberlândia',
  },
  fontes: ['brasilapi'],
};

const mockCadastro: ICadastroConsultaGateway = {
  consultarCnpj: async () => dadosCnpj,
  nomeMunicipio: async () => 'Uberlândia',
  dadosMunicipio: async () => ({ nome: 'Uberlândia', uf: 'MG' }),
};

const baseInput: EmitirNfseInput = {
  tomador: {
    tipo: 'PJ',
    cpfCnpj: '51124668000181',
    inscricaoMunicipal: 'IM-MANUAL-TOMADOR',
    razaoSocial: 'TOMADOR EXEMPLO LTDA',
  },
  servico: {
    codigoServico: '170202',
    descricao: 'Serviço teste',
    codigoMunicipioIncidencia: '3170206',
  },
  valores: { valorServico: 100 },
};

const baseEmitente: EmitenteResolvido = {
  cnpj: '53369941000163',
  razaoSocial: 'PRESTADOR LTDA',
  codigoMunicipio: '3170206',
  inscricaoMunicipal: 'IM-MANUAL-PRESTADOR',
  certificadoAtivo: true,
};

describe('CadastroEnrichmentService — inscrição municipal', () => {
  it('preserva IM do tomador informada manualmente após enriquecimento CNPJ', async () => {
    const service = new CadastroEnrichmentService(mockCadastro, true);
    const { input } = await service.enriquecerEmissao(baseInput, baseEmitente);

    assert.equal(input.tomador.inscricaoMunicipal, 'IM-MANUAL-TOMADOR');
    assert.equal(input.tomador.email, 'tomador@exemplo.com');
  });

  it('preserva IM do prestador (.env) após enriquecimento CNPJ', async () => {
    const service = new CadastroEnrichmentService(mockCadastro, true);
    const { emitente } = await service.enriquecerEmissao(baseInput, baseEmitente);

    assert.equal(emitente.inscricaoMunicipal, 'IM-MANUAL-PRESTADOR');
    assert.equal(emitente.razaoSocial, 'PRESTADOR LTDA');
  });

  it('não inventa IM quando tomador não informou', async () => {
    const service = new CadastroEnrichmentService(mockCadastro, true);
    const inputSemIm: EmitirNfseInput = {
      ...baseInput,
      tomador: { ...baseInput.tomador, inscricaoMunicipal: undefined },
    };
    const { input } = await service.enriquecerEmissao(inputSemIm, baseEmitente);

    assert.equal(input.tomador.inscricaoMunicipal, undefined);
  });

  it('enriquecerEmitente não altera IM do prestador', async () => {
    const service = new CadastroEnrichmentService(mockCadastro, true);
    const enriched = await service.enriquecerEmitente(baseEmitente);

    assert.equal(enriched.inscricaoMunicipal, 'IM-MANUAL-PRESTADOR');
  });
});
