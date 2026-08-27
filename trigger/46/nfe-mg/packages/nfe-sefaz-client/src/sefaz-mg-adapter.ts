import https from 'node:https';
import { SefazError, getSefazEndpoints, type Ambiente, type SefazEndpoints } from '@nfe/shared';
import { extractTag } from '@nfe/xml';
import type { XmlSigner } from '@nfe/xml';
import type {
  ISefazGateway,
  ResultadoAutorizacao,
  ResultadoConsulta,
  ResultadoEvento,
  ResultadoInutilizacao,
  StatusServicoResult,
} from './ports.js';

const SOAP12 = 'application/soap+xml; charset=utf-8';

function soapEnvelope(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap12:Body>
    ${body}
  </soap12:Body>
</soap12:Envelope>`;
}

function nfeDadosMsg(payloadXml: string, wsdlNs: string): string {
  const inner = payloadXml.replace(/^<\?xml[^>]*>\s*/i, '');
  return `<nfeDadosMsg xmlns="${wsdlNs}">${inner}</nfeDadosMsg>`;
}

export class SefazMgAdapter implements ISefazGateway {
  private readonly endpoints: SefazEndpoints;

  constructor(
    private readonly signer: XmlSigner,
    ambiente: Ambiente,
  ) {
    this.endpoints = getSefazEndpoints(ambiente);
  }

  private agent(): https.Agent {
    const agent = this.signer.getHttpsAgent();
    if (!agent) {
      throw new SefazError(
        'Certificado A1 do emitente é obrigatório para chamar a SEFAZ-MG',
        'CERT_REQUIRED',
        503,
      );
    }
    return agent;
  }

  /** Transmissão mTLS via https.request — fetch nativo não expõe o agent PKCS#12 com facilidade. */
  private postMtls(url: string, xml: string, wsdl: string): Promise<string> {
    const body = soapEnvelope(nfeDadosMsg(xml, `http://www.portalfiscal.inf.br/nfe/wsdl/${wsdl}`));
    const agent = this.agent();
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const req = https.request(
        {
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port || 443,
          path: u.pathname + u.search,
          method: 'POST',
          agent,
          headers: {
            'Content-Type': SOAP12,
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(Buffer.from(c)));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            if (res.statusCode && res.statusCode >= 400) {
              reject(new SefazError(`SEFAZ-MG HTTP ${res.statusCode}`, 'SEFAZ_HTTP', 502, undefined, { body: text.slice(0, 500) }));
              return;
            }
            resolve(text);
          });
        },
      );
      req.on('error', (err) => reject(new SefazError(err.message, 'SEFAZ_NETWORK', 503)));
      req.write(body);
      req.end();
    });
  }

  async statusServico(tpAmb: '1' | '2'): Promise<StatusServicoResult> {
    const cons = `<?xml version="1.0" encoding="UTF-8"?>
<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <tpAmb>${tpAmb}</tpAmb>
  <cUF>31</cUF>
  <xServ>STATUS</xServ>
</consStatServ>`;
    const xml = await this.postMtls(this.endpoints.statusServico, cons, 'NFeStatusServico4');
    return {
      cStat: extractTag(xml, 'cStat') ?? '0',
      xMotivo: extractTag(xml, 'xMotivo') ?? 'sem retorno',
      tMed: extractTag(xml, 'tMed'),
      dhRecbto: extractTag(xml, 'dhRecbto'),
    };
  }

  async autorizar(enviNFeXml: string, _tpAmb: '1' | '2'): Promise<ResultadoAutorizacao> {
    const xml = await this.postMtls(this.endpoints.autorizacao, enviNFeXml, 'NFeAutorizacao4');
    return this.parseAutorizacao(xml);
  }

  async consultarRecibo(nRec: string, tpAmb: '1' | '2'): Promise<ResultadoAutorizacao> {
    const cons = `<?xml version="1.0" encoding="UTF-8"?>
<consReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <tpAmb>${tpAmb}</tpAmb>
  <nRec>${nRec}</nRec>
</consReciNFe>`;
    const xml = await this.postMtls(this.endpoints.retAutorizacao, cons, 'NFeRetAutorizacao4');
    return this.parseAutorizacao(xml);
  }

  async consultarProtocolo(chave: string, tpAmb: '1' | '2'): Promise<ResultadoConsulta> {
    const cons = `<?xml version="1.0" encoding="UTF-8"?>
<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <tpAmb>${tpAmb}</tpAmb>
  <xServ>CONSULTAR</xServ>
  <chNFe>${chave}</chNFe>
</consSitNFe>`;
    const xml = await this.postMtls(this.endpoints.consultaProtocolo, cons, 'NFeConsultaProtocolo4');
    return {
      cStat: extractTag(xml, 'cStat') ?? '0',
      xMotivo: extractTag(xml, 'xMotivo') ?? '',
      nProt: extractTag(xml, 'nProt'),
      chaveAcesso: extractTag(xml, 'chNFe') ?? chave,
      xmlProt: xml,
    };
  }

  async registrarEvento(eventoXml: string, _tpAmb: '1' | '2'): Promise<ResultadoEvento> {
    const envEvento = `<?xml version="1.0" encoding="UTF-8"?>
<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <idLote>1</idLote>
  ${eventoXml.replace(/^<\?xml[^>]*>\s*/i, '')}
</envEvento>`;
    const xml = await this.postMtls(this.endpoints.recepcaoEvento, envEvento, 'NFeRecepcaoEvento4');
    return {
      cStat: extractTag(xml, 'cStat') ?? '0',
      xMotivo: extractTag(xml, 'xMotivo') ?? '',
      nProt: extractTag(xml, 'nProt'),
      xmlRetorno: xml,
    };
  }

  async inutilizar(inutXml: string, _tpAmb: '1' | '2'): Promise<ResultadoInutilizacao> {
    const xml = await this.postMtls(this.endpoints.inutilizacao, inutXml, 'NFeInutilizacao4');
    return {
      cStat: extractTag(xml, 'cStat') ?? '0',
      xMotivo: extractTag(xml, 'xMotivo') ?? '',
      nProt: extractTag(xml, 'nProt'),
      xmlRetorno: xml,
    };
  }

  private parseAutorizacao(xml: string): ResultadoAutorizacao {
    const nRec = extractTag(xml, 'nRec');
    const cStat = extractTag(xml, 'cStat') ?? '0';
    const xMotivo = extractTag(xml, 'xMotivo') ?? '';
    const chave = extractTag(xml, 'chNFe');
    const nProt = extractTag(xml, 'nProt');
    const dhRecbto = extractTag(xml, 'dhRecbto');

    if (nRec && (cStat === '103' || cStat === '105' || !nProt)) {
      return { modo: 'recibo', cStat, xMotivo, nRec, xmlRetorno: xml, dhRecbto };
    }
    return {
      modo: 'sincrona',
      cStat,
      xMotivo,
      chaveAcesso: chave,
      nProt,
      dhRecbto,
      xmlRetorno: xml,
    };
  }
}
