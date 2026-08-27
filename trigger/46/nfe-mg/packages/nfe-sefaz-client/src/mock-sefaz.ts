import { SefazError } from '@nfe/shared';
import { wrapProcNFe, extractTag, formatDhEmiBr } from '@nfe/xml';
import type {
  ISefazGateway,
  ResultadoAutorizacao,
  ResultadoConsulta,
  ResultadoEvento,
  ResultadoInutilizacao,
  StatusServicoResult,
} from './ports.js';

export class MockSefazAdapter implements ISefazGateway {
  private readonly autorizadas = new Map<string, { xml: string; nProt: string }>();
  private readonly recibos = new Map<string, ResultadoAutorizacao>();
  private seqProt = 1;

  async statusServico(_tpAmb: '1' | '2'): Promise<StatusServicoResult> {
    return {
      cStat: '107',
      xMotivo: 'Serviço em operação (mock SEFAZ-MG)',
      tMed: '1',
      dhRecbto: formatDhEmiBr(),
    };
  }

  async autorizar(enviNFeXml: string, _tpAmb: '1' | '2'): Promise<ResultadoAutorizacao> {
    const chave = enviNFeXml.match(/Id="NFe(\d{44})"/)?.[1];
    if (!chave) {
      throw new SefazError('XML sem chave de acesso', 'XML_INVALID', 422);
    }

    const nfeMatch = enviNFeXml.match(/<NFe[\s\S]*<\/NFe>/);
    if (!nfeMatch) {
      throw new SefazError('enviNFe sem elemento NFe', 'XML_INVALID', 422);
    }

    const nProt = `13126${String(this.seqProt++).padStart(9, '0')}`;
    const dh = formatDhEmiBr();
    const proc = wrapProcNFe(nfeMatch[0], nProt, dh);
    this.autorizadas.set(chave, { xml: proc, nProt });

    return {
      modo: 'sincrona',
      cStat: '100',
      xMotivo: 'Autorizado o uso da NF-e',
      chaveAcesso: chave,
      nProt,
      dhRecbto: dh,
      xmlRetorno: proc,
    };
  }

  async consultarRecibo(nRec: string, _tpAmb: '1' | '2'): Promise<ResultadoAutorizacao> {
    const cached = this.recibos.get(nRec);
    if (cached) return cached;
    throw new SefazError('Recibo não encontrado', 'RECIBO_NOT_FOUND', 404, '106');
  }

  async consultarProtocolo(chave: string, _tpAmb: '1' | '2'): Promise<ResultadoConsulta> {
    const found = this.autorizadas.get(chave);
    if (!found) {
      throw new SefazError('NF-e não encontrada', 'NFE_NOT_FOUND', 404, '217');
    }
    return {
      cStat: '100',
      xMotivo: 'Autorizado o uso da NF-e',
      nProt: found.nProt,
      chaveAcesso: chave,
      xmlProt: found.xml,
    };
  }

  async registrarEvento(eventoXml: string, _tpAmb: '1' | '2'): Promise<ResultadoEvento> {
    const tipo = extractTag(eventoXml, 'tpEvento') ?? '110111';
    const nProt = `13126${String(this.seqProt++).padStart(9, '0')}`;
    const cStat = tipo === '110111' ? '135' : '135';
    return {
      cStat,
      xMotivo: tipo === '110111' ? 'Evento registrado e vinculado a NF-e' : 'Evento registrado e vinculado a NF-e',
      nProt,
      xmlRetorno: eventoXml,
    };
  }

  async inutilizar(_inutXml: string, _tpAmb: '1' | '2'): Promise<ResultadoInutilizacao> {
    const nProt = `13126${String(this.seqProt++).padStart(9, '0')}`;
    return {
      cStat: '102',
      xMotivo: 'Inutilização de número homologado',
      nProt,
      xmlRetorno: _inutXml,
    };
  }
}
