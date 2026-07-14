import type { Config } from './config.js';
import type { Db } from './db.js';
import { nextDpsNumero } from './db.js';
import { FileStorage } from './storage.js';
import { resolveEmitente, tpAmb } from './emitente.js';
import type { ISefinGateway, IAdnGateway } from '@nfse/gov-client';
import {
  DpsBuilder,
  EventoBuilder,
  CertificadoProvider,
  gzipBase64,
  dpsInfId,
  parseNfseXml,
} from '@nfse/xml';
import {
  GeradorIdDps,
  ValidadorRegrasNegocio,
  NfseStateMachine,
  applyEmissaoDefaults,
  EVENTO_CANCELAMENTO,
} from '@nfse/domain';
import type { EmitirNfseInput, CancelarNfseInput } from '@nfse/domain';
import { NotFoundError, ValidationError } from '@nfse/shared';

export interface NfseResumo {
  chaveAcesso: string;
  idDps: string;
  situacao: string;
  valorServico: number;
  tomadorNome?: string;
  tomadorDoc?: string;
  descricao?: string;
  emitidaEm: string;
}

export interface EmitirResult {
  chaveAcesso: string;
  idDps: string;
  situacao: string;
  valorServico: number;
  emitidaEm: string;
}

export class NfseService {
  private readonly validador = new ValidadorRegrasNegocio();
  private readonly dpsBuilder = new DpsBuilder();
  private readonly eventoBuilder = new EventoBuilder();
  private readonly certificado: CertificadoProvider;

  constructor(
    private readonly db: Db,
    private readonly sefin: ISefinGateway,
    private readonly adn: IAdnGateway,
    private readonly storage: FileStorage,
    private readonly config: Config,
    certificado?: CertificadoProvider,
  ) {
    this.certificado = certificado ?? CertificadoProvider.create({
      certPath: config.certPath,
      certPassword: config.certPassword,
      certPasswordFile: config.certPasswordFile,
      cnpj: config.cnpj,
      govMock: config.govMock,
      certRequired: config.certRequired,
    });
  }

  getHttpsAgent() {
    return this.certificado.getHttpsAgent();
  }

  certificadoInfo() {
    return this.certificado.validade();
  }

  emitenteInfo() {
    return resolveEmitente(this.config, this.certificado.validade());
  }

  status() {
    const cert = this.certificado.validade();
    const emitente = this.emitenteInfo();
    const emitidas = this.db.prepare('SELECT COUNT(*) as c FROM nfse').get() as { c: number };
    const recebidas = this.db.prepare('SELECT COUNT(*) as c FROM dfe_recebido').get() as { c: number };
    const canceladas = this.db.prepare("SELECT COUNT(*) as c FROM nfse WHERE situacao = 'CANCELADA'").get() as { c: number };

    return {
      ambiente: this.config.ambiente,
      govMock: this.config.govMock,
      emitente,
      certificado: {
        ativo: !cert.mock,
        cnpj: cert.cnpj,
        razaoSocial: cert.razaoSocial,
        validade: cert.validade?.toISOString?.() ?? String(cert.validade),
        diasParaExpirar: cert.diasParaExpirar,
        clientAuth: cert.clientAuth,
      },
      totais: {
        emitidas: emitidas.c,
        recebidas: recebidas.c,
        canceladas: canceladas.c,
      },
    };
  }

  async emitir(input: EmitirNfseInput): Promise<EmitirResult> {
    const emitente = this.emitenteInfo();
    const normalizado = applyEmissaoDefaults(input, true);
    this.validador.validarEmissao(normalizado);

    const numeroDps = String(nextDpsNumero(this.db));
    const idDps = new GeradorIdDps(
      emitente.codigoMunicipio,
      emitente.cnpj,
      this.config.dpsSerie,
    ).gerar(numeroDps);

    let dpsXml = this.dpsBuilder.build({
      idDps: idDps.toString(),
      numeroDps,
      serie: this.config.dpsSerie,
      cnpjPrestador: emitente.cnpj,
      razaoSocial: emitente.razaoSocial,
      codigoMunicipio: emitente.codigoMunicipio,
      inscricaoMunicipal: emitente.inscricaoMunicipal,
      input: normalizado,
      tpAmb: tpAmb(this.config),
      optanteSimples: true,
    });

    dpsXml = this.certificado.assinarXml(dpsXml, dpsInfId(idDps.toString()));
    const resultado = await this.sefin.emitir(gzipBase64(dpsXml));

    const dpsPath = this.storage.put(
      this.storage.buildKey(resultado.chaveAcesso, 'dps'),
      dpsXml,
    );
    const nfsePath = this.storage.put(
      this.storage.buildKey(resultado.chaveAcesso, 'nfse'),
      resultado.nfseXml,
    );

    const tomadorNome = normalizado.tomador.razaoSocial ?? normalizado.tomador.nome ?? '';
    const emitidaEm = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO nfse (chave_acesso, id_dps, situacao, valor_servico, tomador_nome, tomador_doc, descricao, xml_path, emitida_em)
      VALUES (?, ?, 'AUTORIZADA', ?, ?, ?, ?, ?, ?)
    `).run(
      resultado.chaveAcesso,
      idDps.toString(),
      normalizado.valores.valorServico,
      tomadorNome,
      normalizado.tomador.cpfCnpj.replace(/\D/g, ''),
      normalizado.servico.descricao,
      nfsePath,
      emitidaEm,
    );

    return {
      chaveAcesso: resultado.chaveAcesso,
      idDps: idDps.toString(),
      situacao: 'AUTORIZADA',
      valorServico: normalizado.valores.valorServico,
      emitidaEm,
    };
  }

  async cancelar(input: CancelarNfseInput): Promise<{ chaveAcesso: string; situacao: string }> {
    const row = this.db.prepare('SELECT * FROM nfse WHERE chave_acesso = ?').get(input.chaveAcesso) as
      | { chave_acesso: string; situacao: string }
      | undefined;

    if (!row) throw new NotFoundError('NFS-e', input.chaveAcesso);
    if (!NfseStateMachine.canTransition(row.situacao as 'AUTORIZADA', 'CANCELADA')) {
      throw new ValidationError(`NFS-e não pode ser cancelada (situação: ${row.situacao})`);
    }

    const sequencial = 1;

    const emitente = this.emitenteInfo();
    let eventoXml = this.eventoBuilder.buildCancelamento({
      chaveAcesso: input.chaveAcesso,
      codigoMotivo: input.codigoMotivo,
      motivo: input.motivo,
      cnpj: emitente.cnpj,
      sequencial,
      tpAmb: tpAmb(this.config),
    });

    const evtId = `PRE${input.chaveAcesso}${String(sequencial).padStart(3, '0')}`;
    eventoXml = this.certificado.assinarXml(eventoXml, evtId);

    await this.sefin.registrarEvento(input.chaveAcesso, gzipBase64(eventoXml));

    this.db.prepare("UPDATE nfse SET situacao = 'CANCELADA' WHERE chave_acesso = ?").run(input.chaveAcesso);

    return { chaveAcesso: input.chaveAcesso, situacao: 'CANCELADA' };
  }

  listarEmitidas(limit = 50, offset = 0): { total: number; items: NfseResumo[] } {
    const totalRow = this.db.prepare('SELECT COUNT(*) as c FROM nfse').get() as { c: number };
    const rows = this.db.prepare(`
      SELECT * FROM nfse ORDER BY emitida_em DESC LIMIT ? OFFSET ?
    `).all(limit, offset) as Array<{
      chave_acesso: string;
      id_dps: string;
      situacao: string;
      valor_servico: number;
      tomador_nome: string | null;
      tomador_doc: string | null;
      descricao: string | null;
      emitida_em: string;
    }>;

    return {
      total: totalRow.c,
      items: rows.map((r) => ({
        chaveAcesso: r.chave_acesso,
        idDps: r.id_dps,
        situacao: r.situacao,
        valorServico: r.valor_servico,
        tomadorNome: r.tomador_nome ?? undefined,
        tomadorDoc: r.tomador_doc ?? undefined,
        descricao: r.descricao ?? undefined,
        emitidaEm: r.emitida_em,
      })),
    };
  }

  consultarEmitida(chave: string): NfseResumo & { xml?: string } {
    const row = this.db.prepare('SELECT * FROM nfse WHERE chave_acesso = ?').get(chave) as
      | {
          chave_acesso: string;
          id_dps: string;
          situacao: string;
          valor_servico: number;
          tomador_nome: string | null;
          tomador_doc: string | null;
          descricao: string | null;
          xml_path: string | null;
          emitida_em: string;
        }
      | undefined;

    if (!row) throw new NotFoundError('NFS-e', chave);

    let xml: string | undefined;
    if (row.xml_path && this.storage.exists(row.xml_path)) {
      xml = this.storage.get(row.xml_path);
    }

    return {
      chaveAcesso: row.chave_acesso,
      idDps: row.id_dps,
      situacao: row.situacao,
      valorServico: row.valor_servico,
      tomadorNome: row.tomador_nome ?? undefined,
      tomadorDoc: row.tomador_doc ?? undefined,
      descricao: row.descricao ?? undefined,
      emitidaEm: row.emitida_em,
      xml,
    };
  }

  getXmlEmitida(chave: string): string {
    const nfse = this.consultarEmitida(chave);
    if (nfse.xml) return nfse.xml;
    throw new NotFoundError('XML', chave);
  }

  async getPdf(chave: string): Promise<Buffer | null> {
    return this.adn.baixarDanfse(chave);
  }

  listarRecebidas(limit = 50, offset = 0): { total: number; items: RecebidaResumo[]; cnpjTomador: string } {
    const cnpj = this.emitenteInfo().cnpj;
    const totalRow = this.db.prepare('SELECT COUNT(*) as c FROM dfe_recebido').get() as { c: number };
    const rows = this.db.prepare(`
      SELECT * FROM dfe_recebido ORDER BY recebido_em DESC LIMIT ? OFFSET ?
    `).all(limit, offset) as Array<{
      chave: string;
      nsu: string;
      tipo_dfe: string;
      metadata: string | null;
      recebido_em: string;
    }>;

    const items = rows
      .map((r) => this.toRecebida(r, cnpj))
      .filter((r): r is RecebidaResumo => r !== null);

    return { total: totalRow.c, items, cnpjTomador: cnpj };
  }

  getXmlRecebida(chave: string): string {
    const row = this.db.prepare('SELECT xml_path FROM dfe_recebido WHERE chave = ?').get(chave) as
      | { xml_path: string | null }
      | undefined;
    if (!row?.xml_path) throw new NotFoundError('NFS-e recebida', chave);
    return this.storage.get(row.xml_path);
  }

  private toRecebida(
    row: { chave: string; nsu: string; tipo_dfe: string; metadata: string | null; recebido_em: string },
    cnpjTomador: string,
  ): RecebidaResumo | null {
    const meta = row.metadata ? JSON.parse(row.metadata) as DfeMetadata : null;
    if (meta?.tomadorCnpj && meta.tomadorCnpj !== cnpjTomador) return null;
    if (meta?.prestadorCnpj === cnpjTomador) return null;

    return {
      chave: row.chave,
      nsu: row.nsu,
      prestadorCnpj: meta?.prestadorCnpj ?? '',
      prestadorRazaoSocial: meta?.prestadorRazaoSocial ?? '',
      tomadorCnpj: meta?.tomadorCnpj ?? cnpjTomador,
      valorServico: meta?.valorServico ?? 0,
      emitidaEm: meta?.emitidaEm,
      situacao: meta?.situacao,
      recebidoEm: row.recebido_em,
    };
  }
}

export interface DfeMetadata {
  prestadorCnpj?: string;
  prestadorRazaoSocial?: string;
  tomadorCnpj?: string;
  tomadorRazaoSocial?: string;
  valorServico?: number;
  emitidaEm?: string;
  situacao?: string;
}

export interface RecebidaResumo {
  chave: string;
  nsu: string;
  prestadorCnpj: string;
  prestadorRazaoSocial: string;
  tomadorCnpj: string;
  valorServico: number;
  emitidaEm?: string;
  situacao?: string;
  recebidoEm: string;
}

export function extractMetadata(xml: string, chave?: string): DfeMetadata | null {
  try {
    const doc = parseNfseXml(xml, chave);
    return {
      prestadorCnpj: doc.prestador?.cnpj,
      prestadorRazaoSocial: doc.prestador?.razaoSocial,
      tomadorCnpj: doc.tomador?.cnpj ?? doc.tomador?.cpf,
      tomadorRazaoSocial: doc.tomador?.razaoSocial,
      valorServico: doc.valores?.valorServico,
      emitidaEm: doc.dhEmi,
      situacao: doc.situacao,
    };
  } catch {
    return null;
  }
}
