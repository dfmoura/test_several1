import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IAdnGateway, LoteDfe, EventoGov } from './ports.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** CNPJ de prestador fictício — sempre diferente do tomador (certificado). */
const PRESTADOR_DEMO_PADRAO = '51124668000181';
const PRESTADOR_DEMO_ALTERNATIVO = '98765432000100';

function prestadorDemoPara(tomadorCnpj: string): string {
  return tomadorCnpj === PRESTADOR_DEMO_PADRAO ? PRESTADOR_DEMO_ALTERNATIVO : PRESTADOR_DEMO_PADRAO;
}

function loadExampleNfseXml(tomadorCnpj: string, prestadorCnpj: string): string {
  const examplePath = join(
    __dirname,
    '../../../docs/example/oficial-31702062253369941000163000000000000626050264633732(1).xml',
  );
  try {
    let xml = readFileSync(examplePath, 'utf-8');
    xml = xml.replace(/<toma><CNPJ>\d{14}<\/CNPJ>/, `<toma><CNPJ>${tomadorCnpj}</CNPJ>`);
    xml = xml.replace(/<emit><CNPJ>\d{14}<\/CNPJ>/, `<emit><CNPJ>${prestadorCnpj}</CNPJ>`);
    xml = xml.replace(/<prest><CNPJ>\d{14}<\/CNPJ>/, `<prest><CNPJ>${prestadorCnpj}</CNPJ>`);
    return xml;
  } catch {
    return `<?xml version="1.0" encoding="UTF-8"?><NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00"><infNFSe Id="NFS31702062253369941000163000000000000626050264633732"><chNFSe>31702062253369941000163000000000000626050264633732</chNFSe><emit><CNPJ>${prestadorCnpj}</CNPJ><xNome>PRESTADOR EXEMPLO LTDA</xNome></emit><valores><vLiq>4484.00</vLiq></valores><DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00"><infDPS Id="DPS1"><dhEmi>2026-05-20T10:00:00-03:00</dhEmi><prest><CNPJ>${prestadorCnpj}</CNPJ><xNome>PRESTADOR EXEMPLO LTDA</xNome></prest><toma><CNPJ>${tomadorCnpj}</CNPJ><xNome>TOMADOR CERTIFICADO</xNome></toma><serv><cServ><xDescServ>Serviço de exemplo ADN</xDescServ></cServ></serv><valores><vServPrest><vServ>4484.00</vServ></vServPrest></valores></infDPS></DPS></infNFSe></NFSe>`;
  }
}

export class MockAdnAdapter implements IAdnGateway {
  private sampleDelivered = false;

  constructor(private readonly cnpjTomador?: string) {}

  async sincronizarDfe(ultimoNsu: string): Promise<LoteDfe> {
    const nsuNum = parseInt(ultimoNsu || '0', 10);
    const tomador = (this.cnpjTomador ?? '12345678000199').replace(/\D/g, '');

    // Entrega 1 NFS-e de demonstração na 1ª sync (NSU 0) ou se NSU avançou sem gravar DF-e (dev).
    const podeEntregarDemo = !this.sampleDelivered && tomador.length === 14 && nsuNum <= 1;

    if (podeEntregarDemo) {
      this.sampleDelivered = true;
      const prestador = prestadorDemoPara(tomador);
      const chave = '31702062253369941000163000000000000626050264633732';
      const xml = loadExampleNfseXml(tomador, prestador);
      const nsuDoc = nsuNum === 0 ? '1' : '2';
      return {
        documentos: [
          {
            nsu: nsuDoc,
            tipoDfe: 'NFSE',
            chave,
            xml,
          },
        ],
        ultimoNsu: String(nsuNum),
        maxNsu: nsuDoc,
      };
    }

    return {
      documentos: [],
      ultimoNsu: String(nsuNum),
      maxNsu: String(nsuNum),
    };
  }

  async baixarDanfse(_chave: string): Promise<Buffer | null> {
    return null;
  }

  async listarEventosNfse(_chave: string): Promise<EventoGov[]> {
    return [];
  }
}
