import { PrismaClient, Role, TipoParceiro, TipoPessoa, AmbienteFiscal, RegimeTributario, TipoCertificado, FinalidadeCertificado, StatusCertificado, TipoCnae } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();
const catalogs = join(__dirname, "../../../data/catalogs");

/** EMP-00001 — operação principal (RLP / Reta Etiquetas). Spec trigger/32. */
const EMPRESA_PRINCIPAL_ID = "seed-emp-00001";
/** EMP-00002 — cadastrada, venda desabilitada até parecer Contador+Direção. */
const EMPRESA_SECUNDARIA_ID = "seed-emp-00002";

/** @deprecated use EMPRESA_PRINCIPAL_ID */
const EMPRESA_ID = EMPRESA_PRINCIPAL_ID;

/** CNAEs oficiais da emitente (Receita / Minha Receita). */
const EMPRESA_CNAES: Array<{
  codigo: string;
  descricao: string;
  tipo: TipoCnae;
  ordem: number;
}> = [
  {
    codigo: "1813099",
    descricao: "Impressão de material para outros usos",
    tipo: TipoCnae.PRINCIPAL,
    ordem: 0,
  },
  {
    codigo: "1813001",
    descricao: "Impressão de material para uso publicitário",
    tipo: TipoCnae.SECUNDARIO,
    ordem: 1,
  },
  {
    codigo: "1821100",
    descricao: "Serviços de pré-impressão",
    tipo: TipoCnae.SECUNDARIO,
    ordem: 2,
  },
  {
    codigo: "4751201",
    descricao: "Comércio varejista especializado de equipamentos e suprimentos de informática",
    tipo: TipoCnae.SECUNDARIO,
    ordem: 3,
  },
];

function load<T>(file: string): T {
  return JSON.parse(readFileSync(join(catalogs, file), "utf-8")) as T;
}

async function upsertEmpresaRaiz() {
  const principal = EMPRESA_CNAES.find((c) => c.tipo === TipoCnae.PRINCIPAL)!;

  // EMP-00001 — RLP ETIQUETAS (emitente real das NF-e de venda) — operação principal.
  const empresa = await prisma.empresa.upsert({
    where: { id: EMPRESA_PRINCIPAL_ID },
    update: {
      codigo: "EMP-00001",
      razaoSocial: "RLP ETIQUETAS AUTO ADESIVOS LTDA",
      nomeFantasia: "Reta Etiquetas",
      cnpj: "01423183000110",
      inscricaoEstadual: "7023251210034",
      inscricaoMunicipal: "123456",
      cnaePrincipal: principal.codigo,
      cnaePrincipalDescricao: principal.descricao,
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      email: "contato@retaetiquetas.com.br",
      telefone: "3432383955",
      cep: "38400328",
      logradouro: "AVENIDA MARCOS DE FREITAS COSTA",
      numero: "385",
      bairro: "Daniel Fonseca",
      cidade: "Uberlândia",
      uf: "MG",
      codigoMunicipioIbge: "3170206",
      logoUrl: "/brand/logotipo-retaetiquetas.png",
      ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
      simularProducao: true,
      isMatriz: true,
      operacionalPrincipal: true,
      vendaHabilitada: true,
      ativo: true,
      observacoes:
        "EMP-00001 — operação principal (indústria/vendas). Homologação com simulação fiscal. Migrará Simples → Lucro Real (contador).",
    },
    create: {
      id: EMPRESA_PRINCIPAL_ID,
      codigo: "EMP-00001",
      razaoSocial: "RLP ETIQUETAS AUTO ADESIVOS LTDA",
      nomeFantasia: "Reta Etiquetas",
      cnpj: "01423183000110",
      inscricaoEstadual: "7023251210034",
      inscricaoMunicipal: "123456",
      cnaePrincipal: principal.codigo,
      cnaePrincipalDescricao: principal.descricao,
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      email: "contato@retaetiquetas.com.br",
      telefone: "3432383955",
      cep: "38400328",
      logradouro: "AVENIDA MARCOS DE FREITAS COSTA",
      numero: "385",
      bairro: "Daniel Fonseca",
      cidade: "Uberlândia",
      uf: "MG",
      codigoMunicipioIbge: "3170206",
      logoUrl: "/brand/logotipo-retaetiquetas.png",
      ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
      simularProducao: true,
      isMatriz: true,
      operacionalPrincipal: true,
      vendaHabilitada: true,
      ativo: true,
      observacoes:
        "EMP-00001 — operação principal (indústria/vendas). Homologação com simulação fiscal. Migrará Simples → Lucro Real (contador).",
    },
  });

  // EMP-00002 — entra no ERP, sem venda de etiquetas (flag vendaHabilitada=false).
  await prisma.empresa.upsert({
    where: { id: EMPRESA_SECUNDARIA_ID },
    update: {
      codigo: "EMP-00002",
      razaoSocial: "ADESIVOS, ETIQUETAS E ROTULOS UDI LTDA",
      nomeFantasia: "Etiquetas UDI (grupo)",
      cnpj: "58820046000137",
      inscricaoEstadual: "0012345678901",
      inscricaoMunicipal: "123456",
      cnaePrincipal: principal.codigo,
      cnaePrincipalDescricao: principal.descricao,
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      email: "ETIQUETASUDI@YAHOO.COM.BR",
      telefone: "3491807742",
      cep: "38411160",
      logradouro: "ALAMEDA SOSTHENES GUIMARAES",
      numero: "65",
      bairro: "MORADA DA COLINA",
      cidade: "Uberlândia",
      uf: "MG",
      codigoMunicipioIbge: "3170206",
      ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
      simularProducao: true,
      isMatriz: false,
      parentId: empresa.id,
      operacionalPrincipal: false,
      vendaHabilitada: false,
      ativo: true,
      observacoes:
        "EMP-00002 — cadastro ativo; venda/estoque de etiquetas DESLIGADOS até parecer Contador+Direção (possível veículo laboral/RH).",
    },
    create: {
      id: EMPRESA_SECUNDARIA_ID,
      codigo: "EMP-00002",
      razaoSocial: "ADESIVOS, ETIQUETAS E ROTULOS UDI LTDA",
      nomeFantasia: "Etiquetas UDI (grupo)",
      cnpj: "58820046000137",
      inscricaoEstadual: "0012345678901",
      inscricaoMunicipal: "123456",
      cnaePrincipal: principal.codigo,
      cnaePrincipalDescricao: principal.descricao,
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      email: "ETIQUETASUDI@YAHOO.COM.BR",
      telefone: "3491807742",
      cep: "38411160",
      logradouro: "ALAMEDA SOSTHENES GUIMARAES",
      numero: "65",
      bairro: "MORADA DA COLINA",
      cidade: "Uberlândia",
      uf: "MG",
      codigoMunicipioIbge: "3170206",
      ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
      simularProducao: true,
      isMatriz: false,
      parentId: empresa.id,
      operacionalPrincipal: false,
      vendaHabilitada: false,
      ativo: true,
      observacoes:
        "EMP-00002 — cadastro ativo; venda/estoque de etiquetas DESLIGADOS até parecer Contador+Direção (possível veículo laboral/RH).",
    },
  });

  await prisma.empresaCnae.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.empresaCnae.createMany({
    data: EMPRESA_CNAES.map((c) => ({
      empresaId: empresa.id,
      codigo: c.codigo,
      descricao: c.descricao,
      tipo: c.tipo,
      ordem: c.ordem,
      fonte: "seed",
      ativo: true,
    })),
  });

  return empresa;
}

async function upsertParceiro(opts: {
  id: string;
  codigo?: string;
  tipoPessoa?: TipoPessoa;
  nome: string;
  razaoSocial?: string;
  documento?: string;
  email?: string;
  tipos: TipoParceiro[];
  comissaoPadraoPct?: number;
  empresaId: string;
  limiteCredito?: number;
}) {
  const parceiro = await prisma.parceiro.upsert({
    where: { id: opts.id },
    update: {
      empresaId: opts.empresaId,
      codigo: opts.codigo,
      tipoPessoa: opts.tipoPessoa ?? TipoPessoa.PJ,
      nome: opts.nome,
      razaoSocial: opts.razaoSocial,
      documento: opts.documento,
      email: opts.email,
      ativo: true,
      ...(opts.limiteCredito != null ? { limiteCredito: opts.limiteCredito } : {}),
    },
    create: {
      id: opts.id,
      empresaId: opts.empresaId,
      codigo: opts.codigo,
      tipoPessoa: opts.tipoPessoa ?? TipoPessoa.PJ,
      nome: opts.nome,
      razaoSocial: opts.razaoSocial,
      documento: opts.documento,
      email: opts.email,
      ativo: true,
      limiteCredito: opts.limiteCredito ?? 0,
    },
  });

  await prisma.parceiroTipo.deleteMany({ where: { parceiroId: parceiro.id } });
  await prisma.parceiroTipo.createMany({
    data: opts.tipos.map((tipo) => ({
      parceiroId: parceiro.id,
      tipo,
      comissaoPadraoPct: tipo === TipoParceiro.VENDEDOR ? (opts.comissaoPadraoPct ?? null) : null,
    })),
  });

  return parceiro;
}

async function main() {
  const empresa = await upsertEmpresaRaiz();

  // Certificado NFS-e simulado (metadados) — arquivo real pode ser anexado no admin.
  await prisma.empresaCertificado.upsert({
    where: {
      empresaId_apelido: { empresaId: empresa.id, apelido: "NFS-e homologação" },
    },
    update: {
      tipo: TipoCertificado.A1,
      finalidade: FinalidadeCertificado.NFSE,
      status: StatusCertificado.PENDENTE,
      subjectCn: "RLP ETIQUETAS AUTO ADESIVOS LTDA:01423183000110",
      validadeInicio: new Date("2025-01-01T00:00:00.000Z"),
      validadeFim: new Date("2027-01-01T00:00:00.000Z"),
      ativo: true,
      observacoes: "Seed de homologação — anexe o .pfx real quando disponível.",
    },
    create: {
      empresaId: empresa.id,
      apelido: "NFS-e homologação",
      tipo: TipoCertificado.A1,
      finalidade: FinalidadeCertificado.NFSE,
      status: StatusCertificado.PENDENTE,
      subjectCn: "RLP ETIQUETAS AUTO ADESIVOS LTDA:01423183000110",
      validadeInicio: new Date("2025-01-01T00:00:00.000Z"),
      validadeFim: new Date("2027-01-01T00:00:00.000Z"),
      ativo: true,
      observacoes: "Seed de homologação — anexe o .pfx real quando disponível.",
    },
  });

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@123", 12);

  const adminParceiro = await upsertParceiro({
    id: "seed-parceiro-admin",
    empresaId: empresa.id,
    codigo: "0001",
    tipoPessoa: TipoPessoa.PF,
    nome: "Administrador",
    email: "admin@reta.local",
    tipos: [TipoParceiro.USUARIO],
  });

  const vendedorParceiro = await upsertParceiro({
    id: "seed-parceiro-marcelo",
    empresaId: empresa.id,
    codigo: "0002",
    tipoPessoa: TipoPessoa.PF,
    nome: "Marcelo",
    email: "vendedor@reta.local",
    tipos: [TipoParceiro.VENDEDOR, TipoParceiro.USUARIO],
    comissaoPadraoPct: 5,
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@reta.local" },
    update: {
      parceiroId: adminParceiro.id,
      name: "Administrador",
      empresaId: empresa.id,
      passwordHash,
      role: Role.ADMIN,
      active: true,
    },
    create: {
      email: "admin@reta.local",
      name: "Administrador",
      passwordHash,
      role: Role.ADMIN,
      parceiroId: adminParceiro.id,
      empresaId: empresa.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "vendedor@reta.local" },
    update: {
      parceiroId: vendedorParceiro.id,
      name: "Marcelo",
      empresaId: empresa.id,
      role: Role.VENDEDOR,
      active: true,
    },
    create: {
      email: "vendedor@reta.local",
      name: "Marcelo",
      passwordHash: await bcrypt.hash("Vendedor@123", 12),
      role: Role.VENDEDOR,
      parceiroId: vendedorParceiro.id,
      empresaId: empresa.id,
    },
  });

  // Alias legado (protótipos anteriores) — mesmo hash; sem parceiro (único 1:1)
  await prisma.user.upsert({
    where: { email: "admin@flexo.local" },
    update: {
      name: "Administrador (legado)",
      empresaId: empresa.id,
      passwordHash,
      role: Role.ADMIN,
      active: true,
      parceiroId: null,
    },
    create: {
      email: "admin@flexo.local",
      name: "Administrador (legado)",
      passwordHash,
      role: Role.ADMIN,
      empresaId: empresa.id,
    },
  });

  // Parâmetros oficiais PENDENTE_RATIFICACAO (spec trigger/32)
  const paramsOficiais: Array<{ chave: string; valor: unknown }> = [
    { chave: "empresa.defaultCodigo", valor: "EMP-00001" },
    { chave: "empresa.emp00002.vendaHabilitada", valor: false },
    { chave: "lai.noErp", valor: false },
    { chave: "bank.provider.prod", valor: "SICOOB" },
    { chave: "bank.provider.sandbox", valor: "INTER" },
    { chave: "whatsapp.transporte", valor: "META_CLOUD_API" },
    {
      chave: "financeiro.reguaCobranca",
      valor: { dias: [-3, 1, 7, 15], status: "PENDENTE_RATIFICACAO" },
    },
    {
      chave: "patrimonio.valorMinimoCapitalizar",
      valor: { valor: 1000, status: "PENDENTE_RATIFICACAO" },
    },
    {
      chave: "expedicao.politicaNfAntesExpedir",
      valor: { valor: true, status: "PENDENTE_RATIFICACAO" },
    },
    {
      chave: "comissao.base",
      valor: { valor: null, status: "PENDENTE_RATIFICACAO" },
    },
    { chave: "orcamento.exigeAceiteLinkCliente", valor: true },
    { chave: "credito.sinalPctNovoCliente", valor: 50 },
    { chave: "credito.toleranciaAtrasoDias", valor: 7 },
    { chave: "estoque.sobraComprimentoMinimoM", valor: 100 },
    { chave: "estoque.sobraPctMesmoSku", valor: 80 },
    { chave: "pedido.nfAntesDeExpedir", valor: true },
  ];
  for (const p of paramsOficiais) {
    await prisma.parametroSistema.upsert({
      where: { chave: p.chave },
      update: { valor: p.valor as object, empresaId: empresa.id },
      create: { chave: p.chave, valor: p.valor as object, empresaId: empresa.id },
    });
  }

  await upsertParceiro({
    id: "seed-banca-dinei",
    empresaId: empresa.id,
    codigo: "0003",
    tipoPessoa: TipoPessoa.PJ,
    nome: "BANCA DO DINEI",
    razaoSocial: "BANCA DO DINEI",
    tipos: [TipoParceiro.CLIENTE],
    /** HML: limite para testar fluxo a prazo sem adiantamento. */
    limiteCredito: 50000,
  });

  await upsertParceiro({
    id: "seed-fornecedor-facas",
    empresaId: empresa.id,
    codigo: "0004",
    tipoPessoa: TipoPessoa.PJ,
    nome: "Ferramentaria Exemplo",
    tipos: [TipoParceiro.FORNECEDOR],
  });

  const papeis = load<Array<{ nome: string; preco_m2: number }>>("papeis.json");
  for (const p of papeis) {
    await prisma.papel.upsert({
      where: { nome: p.nome },
      update: { precoM2: p.preco_m2 },
      create: { nome: p.nome, precoM2: p.preco_m2 },
    });
  }

  const perdaAcab = load<Record<string, number>>("perda_acabamento.json");
  const acabamentos = load<Array<{ nome: string; preco_m2: number }>>("acabamentos.json");
  for (const a of acabamentos) {
    await prisma.acabamento.upsert({
      where: { nome: a.nome },
      update: { precoM2: a.preco_m2, perdaM2: perdaAcab[a.nome] ?? 0 },
      create: {
        nome: a.nome,
        precoM2: a.preco_m2,
        perdaM2: perdaAcab[a.nome] ?? 0,
      },
    });
  }

  const tubetes = load<Array<{ tamanho: string; preco: number; nome: string }>>("tubetes.json");
  for (const t of tubetes) {
    await prisma.tubete.upsert({
      where: { tamanho: t.tamanho },
      update: { preco: t.preco, nome: t.nome },
      create: { tamanho: t.tamanho, preco: t.preco, nome: t.nome },
    });
  }

  const paradas = load<Array<{ tipo: string; tempo_h: number; tempo_min: number | null }>>("hora_parada.json");
  for (const p of paradas) {
    await prisma.horaParada.upsert({
      where: { tipo: p.tipo },
      update: { tempoH: p.tempo_h, tempoMin: p.tempo_min ?? null },
      create: { tipo: p.tipo, tempoH: p.tempo_h, tempoMin: p.tempo_min ?? null },
    });
  }

  const maquinas = load<Array<{ nome: string; grupo: string }>>("maquinas.json");
  for (const m of maquinas) {
    await prisma.maquina.upsert({
      where: { nome: m.nome },
      update: { grupo: m.grupo },
      create: { nome: m.nome, grupo: m.grupo },
    });
  }

  const horaMaq = load<Record<string, Record<string, number>>>("hora_maquina.json");
  for (const [grupo, tarifas] of Object.entries(horaMaq)) {
    for (const [cores, tarifa] of Object.entries(tarifas)) {
      await prisma.horaMaquinaTarifa.upsert({
        where: { grupo_cores: { grupo, cores } },
        update: { tarifa },
        create: { grupo, cores, tarifa },
      });
    }
  }

  const perdaPapel = load<{
    fixos: Record<string, { m2_fixo: number | null; fator_largura: number | null }>;
    fator_cores4: number;
  }>("perda_papel.json");
  for (const [cores, v] of Object.entries(perdaPapel.fixos)) {
    await prisma.perdaPapel.upsert({
      where: { cores },
      update: {
        m2Fixo: v.m2_fixo,
        fator: cores === "4" ? perdaPapel.fator_cores4 : v.fator_largura,
      },
      create: {
        cores,
        m2Fixo: v.m2_fixo,
        fator: cores === "4" ? perdaPapel.fator_cores4 : v.fator_largura,
      },
    });
  }

  const caixas = load<Record<string, number>>("caixas.json");
  for (const [chave, qtdeCaixas] of Object.entries(caixas)) {
    await prisma.caixaLookup.upsert({
      where: { chave },
      update: { qtdeCaixas },
      create: { chave, qtdeCaixas },
    });
  }

  const params = load<Record<string, unknown>>("parametros.json");
  const tinta = load<Record<string, unknown>>("tinta.json");
  const valorGeral = JSON.parse(JSON.stringify({ ...params, tinta }));
  await prisma.parametroSistema.upsert({
    where: { chave: "geral" },
    update: { valor: valorGeral, empresaId: empresa.id },
    create: { chave: "geral", valor: valorGeral, empresaId: empresa.id },
  });

  const facas = load<
    Array<{
      maquina: string;
      conjugada: string;
      fornecedor: string;
      numero: string | number | null;
      z: number | null;
      formato: string;
      tamanho: string;
      puxada: number | null;
      largura: number | null;
      rep: number | null;
      cil: string | number | null;
      col: string | number | null;
      cliente: string;
      notas: string;
    }>
  >("facas.json");

  const countFacas = await prisma.faca.count();
  if (countFacas === 0) {
    const toDec = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : null;
    };
    const chunk = 100;
    for (let i = 0; i < facas.length; i += chunk) {
      const slice = facas.slice(i, i + chunk);
      await prisma.faca.createMany({
        data: slice.map((f) => ({
          maquina: f.maquina || null,
          conjugada: f.conjugada || null,
          fornecedor: f.fornecedor || null,
          numero: f.numero != null ? String(f.numero) : null,
          z: toDec(f.z),
          formato: f.formato || null,
          tamanho: f.tamanho || null,
          puxada: toDec(f.puxada),
          largura: toDec(f.largura),
          rep: toDec(f.rep),
          cil: f.cil != null ? String(f.cil) : null,
          col: f.col != null ? String(f.col) : null,
          cliente: f.cliente || null,
          notas: f.notas || null,
          ativo: !(f.notas || "").toUpperCase().includes("NÃO USAR"),
        })),
      });
    }
  }

  // ── Ciclo operacional: depósito, produtos, integrações, parâmetros ──
  await prisma.deposito.upsert({
    where: { empresaId_codigo: { empresaId: empresa.id, codigo: "PRINCIPAL" } },
    update: { nome: "Depósito principal", padrao: true, ativo: true },
    create: {
      empresaId: empresa.id,
      codigo: "PRINCIPAL",
      nome: "Depósito principal",
      padrao: true,
      ativo: true,
    },
  });

  const cicloParams: Array<{ chave: string; valor: unknown }> = [
    { chave: "estoque.depositoPadraoCodigo", valor: "PRINCIPAL" },
    { chave: "mrp.reservaNaConfirmacao", valor: true },
    { chave: "mrp.percentualMinimoLiberacaoOs", valor: 100 },
    { chave: "faturamento.exigeOsConcluida", valor: true },
    { chave: "faturamento.documentoPadrao", valor: "NFE" },
    { chave: "faturamento.dualFiscal", valor: false },
    { chave: "compra.toleranciaQtdPct", valor: 5 },
    { chave: "compra.toleranciaValorPct", valor: 2 },
    { chave: "pedido.liquidacaoExigeEntrega", valor: false },
  ];
  for (const p of cicloParams) {
    await prisma.parametroSistema.upsert({
      where: { chave: p.chave },
      update: { valor: p.valor as object, empresaId: empresa.id },
      create: { chave: p.chave, valor: p.valor as object, empresaId: empresa.id },
    });
  }

  await prisma.empresaIntegracao.upsert({
    where: { empresaId_provider: { empresaId: empresa.id, provider: "FOCUS_NFE" } },
    update: { modo: "SIMULADO", ativo: true },
    create: {
      empresaId: empresa.id,
      provider: "FOCUS_NFE",
      modo: "SIMULADO",
      baseUrlHomolog: "https://homologacao.focusnfe.com.br",
      baseUrlProd: "https://api.focusnfe.com.br",
      ativo: true,
      observacoes: "Homologação — simularProducao da empresa controla emissão real vs mock",
    },
  });
  await prisma.empresaIntegracao.upsert({
    where: { empresaId_provider: { empresaId: empresa.id, provider: "INTER" } },
    update: { modo: "SIMULADO", ativo: true },
    create: {
      empresaId: empresa.id,
      provider: "INTER",
      modo: "SIMULADO",
      baseUrlHomolog: "https://cdpj.partners.bancointer.com.br",
      ativo: true,
      observacoes: "Bolepix + Extrato + Saldo (sandbox / simulado)",
    },
  });

  await prisma.contaBancaria.upsert({
    where: { id: "seed-conta-inter" },
    update: {
      apelido: "Conta Inter PJ",
      principal: true,
      ativa: true,
      simulado: true,
      bancoCodigo: "077",
      bancoNome: "Banco Inter",
    },
    create: {
      id: "seed-conta-inter",
      empresaId: empresa.id,
      bancoCodigo: "077",
      bancoNome: "Banco Inter",
      apelido: "Conta Inter PJ",
      tipo: "CORRENTE",
      principal: true,
      ativa: true,
      simulado: true,
      saldoDisponivel: 125430.87,
    },
  });

  // —— Cadastros fiscais Focus (natureza produção própria + revenda) ——
  const naturezaProducao = await prisma.naturezaOperacao.upsert({
    where: { empresaId_codigo: { empresaId: empresa.id, codigo: "PROD-5101" } },
    update: {
      descricao: "VENDA DE PRODUCAO DO ESTABELECIMENTO",
      cfopDentroUf: "5101",
      cfopForaUf: "6101",
      finalidadeEmissao: 1,
      ativo: true,
    },
    create: {
      empresaId: empresa.id,
      codigo: "PROD-5101",
      descricao: "VENDA DE PRODUCAO DO ESTABELECIMENTO",
      cfopDentroUf: "5101",
      cfopForaUf: "6101",
      finalidadeEmissao: 1,
      ativo: true,
    },
  });

  const naturezaRevenda = await prisma.naturezaOperacao.upsert({
    where: { empresaId_codigo: { empresaId: empresa.id, codigo: "REV-5102" } },
    update: {
      descricao: "VENDA DE MERCADORIA ADQUIRIDA OU RECEBIDA DE TERCEIROS",
      cfopDentroUf: "5102",
      cfopForaUf: "6102",
      finalidadeEmissao: 1,
      ativo: true,
    },
    create: {
      empresaId: empresa.id,
      codigo: "REV-5102",
      descricao: "VENDA DE MERCADORIA ADQUIRIDA OU RECEBIDA DE TERCEIROS",
      cfopDentroUf: "5102",
      cfopForaUf: "6102",
      finalidadeEmissao: 1,
      ativo: true,
    },
  });

  await prisma.serieDocumentoFiscal.upsert({
    where: {
      empresaId_tipo_serie_ambiente: {
        empresaId: empresa.id,
        tipo: "NFE",
        serie: 1,
        ambiente: AmbienteFiscal.HOMOLOGACAO,
      },
    },
    update: { ativo: true, proximoNumero: 1 },
    create: {
      empresaId: empresa.id,
      tipo: "NFE",
      serie: 1,
      proximoNumero: 1,
      ambiente: AmbienteFiscal.HOMOLOGACAO,
      ativo: true,
      observacoes: "Série NF-e homologação",
    },
  });

  await prisma.serieDocumentoFiscal.upsert({
    where: {
      empresaId_tipo_serie_ambiente: {
        empresaId: empresa.id,
        tipo: "NFSE_DPS",
        serie: 70000,
        ambiente: AmbienteFiscal.HOMOLOGACAO,
      },
    },
    update: { ativo: true, proximoNumero: 1 },
    create: {
      empresaId: empresa.id,
      tipo: "NFSE_DPS",
      serie: 70000,
      proximoNumero: 1,
      ambiente: AmbienteFiscal.HOMOLOGACAO,
      ativo: true,
      observacoes: "Série DPS NFS-e Nacional (padrão modelos)",
    },
  });

  await prisma.parametroFiscalEmpresa.upsert({
    where: { empresaId: empresa.id },
    update: {
      opSimpNac: 3,
      regApTribSN: 1,
      regEspTrib: 0,
      pTotTribSN: 11.81,
      csosnPadrao: "102",
      cstPisPadrao: "49",
      cstCofinsPadrao: "49",
      serieDpsPadrao: 70000,
      serieNfePadrao: 1,
      naturezaMercadoriaId: naturezaProducao.id,
      modalidadeFretePadrao: 9,
      presencaCompradorPadrao: 1,
    },
    create: {
      empresaId: empresa.id,
      opSimpNac: 3,
      regApTribSN: 1,
      regEspTrib: 0,
      pTotTribSN: 11.81,
      csosnPadrao: "102",
      cstPisPadrao: "49",
      cstCofinsPadrao: "49",
      serieDpsPadrao: 70000,
      serieNfePadrao: 1,
      naturezaMercadoriaId: naturezaProducao.id,
      modalidadeFretePadrao: 9,
      presencaCompradorPadrao: 1,
    },
  });

  // Cliente seed com dados fiscais mínimos para emissão Focus
  await prisma.parceiro.update({
    where: { id: "seed-banca-dinei" },
    data: {
      documento: "12345678000199",
      email: "banca@exemplo.local",
      emailFiscal: "fiscal.banca@exemplo.local",
      cep: "38400000",
      logradouro: "RUA EXEMPLO",
      numero: "100",
      bairro: "CENTRO",
      cidade: "Uberlândia",
      uf: "MG",
      codigoMunicipioIbge: "3170206",
      indicadorIeDest: "NAO_CONTRIBUINTE",
      consumidorFinal: true,
    },
  });

  const papeisDb = await prisma.papel.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
  const acabDb = await prisma.acabamento.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
  const tubDb = await prisma.tubete.findMany({ where: { ativo: true }, orderBy: { tamanho: "asc" } });

  function slugCatalogo(s: string): string {
    return s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toUpperCase()
      .slice(0, 36);
  }

  function padCodigo(n: number): string {
    return String(n).padStart(4, "0");
  }

  // Produtos: código numérico sequencial; sku guarda referência semântica de catálogo.
  let seqProduto = 0;

  for (const papel of papeisDb) {
    seqProduto += 1;
    const codigo = padCodigo(seqProduto);
    const sku = `PAPEL-${slugCatalogo(papel.nome)}`;
    await prisma.produto.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo } },
      update: {
        sku,
        descricao: papel.nome,
        papelId: papel.id,
        unidade: "M2",
        tipo: "INSUMO",
        ncm: "48114110",
        documentoSaidaPadrao: "NFE",
        csosn: "102",
        cstPis: "49",
        cstCofins: "49",
        cfopVendaPadrao: "5102",
        naturezaOperacaoId: naturezaRevenda.id,
        controlaEstoque: true,
        ativo: true,
      },
      create: {
        empresaId: empresa.id,
        codigo,
        sku,
        descricao: papel.nome,
        tipo: "INSUMO",
        unidade: "M2",
        ncm: "48114110",
        documentoSaidaPadrao: "NFE",
        csosn: "102",
        cstPis: "49",
        cstCofins: "49",
        cfopVendaPadrao: "5102",
        naturezaOperacaoId: naturezaRevenda.id,
        controlaEstoque: true,
        papelId: papel.id,
        ativo: true,
      },
    });
  }

  for (const acab of acabDb) {
    seqProduto += 1;
    const codigo = padCodigo(seqProduto);
    const sku = `ACAB-${slugCatalogo(acab.nome)}`;
    await prisma.produto.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo } },
      update: {
        sku,
        descricao: acab.nome,
        acabamentoId: acab.id,
        unidade: "M2",
        tipo: "INSUMO",
        controlaEstoque: true,
        ativo: true,
      },
      create: {
        empresaId: empresa.id,
        codigo,
        sku,
        descricao: acab.nome,
        tipo: "INSUMO",
        unidade: "M2",
        controlaEstoque: true,
        acabamentoId: acab.id,
        ativo: true,
      },
    });
  }

  for (const tub of tubDb) {
    seqProduto += 1;
    const codigo = padCodigo(seqProduto);
    const sku = `TUB-${tub.tamanho.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase()}`;
    await prisma.produto.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo } },
      update: {
        sku,
        descricao: `Tubete ${tub.tamanho}`,
        tubeteId: tub.id,
        tipo: "INSUMO",
        controlaEstoque: true,
        ativo: true,
      },
      create: {
        empresaId: empresa.id,
        codigo,
        sku,
        descricao: `Tubete ${tub.tamanho}`,
        tipo: "INSUMO",
        unidade: "UN",
        controlaEstoque: true,
        tubeteId: tub.id,
        ativo: true,
      },
    });
  }

  {
    seqProduto += 1;
    const codigo = padCodigo(seqProduto);
    await prisma.produto.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo } },
      update: {
        sku: "CAIXA",
        descricao: "Caixa para embalagem",
        tipo: "INSUMO",
        documentoSaidaPadrao: "NFE",
        csosn: "102",
        controlaEstoque: true,
        ativo: true,
      },
      create: {
        empresaId: empresa.id,
        codigo,
        sku: "CAIXA",
        descricao: "Caixa para embalagem",
        tipo: "INSUMO",
        unidade: "UN",
        documentoSaidaPadrao: "NFE",
        csosn: "102",
        controlaEstoque: true,
        ativo: true,
      },
    });
  }

  // Famílias fiscais de SAÍDA (CADASTRO_PRODUTOS_VENDA) — PA-ETQ + FAC + SVC
  const familiasSaida: Array<{
    sku: string;
    descricao: string;
    ncm: string | null;
    cfop: string | null;
    naturezaId: string | null;
    servico?: boolean;
  }> = [
    {
      sku: "PA-ETQ-001",
      descricao: "ETIQUETAS BOPP",
      ncm: "39191090",
      cfop: "5101",
      naturezaId: naturezaProducao.id,
    },
    {
      sku: "PA-ETQ-002",
      descricao: "ETIQUETAS PAPEL AUTOADESIVO",
      ncm: "48114190",
      cfop: "5101",
      naturezaId: naturezaProducao.id,
    },
    {
      sku: "FAC-MATRIZ",
      descricao: "MATRIZ FLEXOGRAFICA / FACA (1o pedido)",
      ncm: "84425000",
      cfop: "5101",
      naturezaId: naturezaProducao.id,
    },
    {
      sku: "SVC-001",
      descricao: "REBOBINAÇÃO / ACERTO DE BOBINA",
      ncm: null,
      cfop: null,
      naturezaId: null,
      servico: true,
    },
  ];

  for (const fam of familiasSaida) {
    seqProduto += 1;
    const codigo = padCodigo(seqProduto);
    const isSvc = Boolean(fam.servico);
    await prisma.produto.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo } },
      update: {
        sku: fam.sku,
        descricao: fam.descricao,
        descricaoFiscal: fam.descricao,
        tipo: isSvc ? "SERVICO" : "ACABADO",
        ncm: fam.ncm,
        documentoSaidaPadrao: isSvc ? "NFSE" : "NFE",
        cfopVendaPadrao: fam.cfop,
        naturezaOperacaoId: fam.naturezaId,
        csosn: isSvc ? undefined : "102",
        cTribNac: isSvc ? "130501" : undefined,
        cNbs: isSvc ? "121012100" : undefined,
        controlaEstoque: false,
        ativo: true,
      },
      create: {
        empresaId: empresa.id,
        codigo,
        sku: fam.sku,
        descricao: fam.descricao,
        descricaoFiscal: fam.descricao,
        tipo: isSvc ? "SERVICO" : "ACABADO",
        unidade: "UN",
        ncm: fam.ncm,
        documentoSaidaPadrao: isSvc ? "NFSE" : "NFE",
        cfopVendaPadrao: fam.cfop,
        naturezaOperacaoId: fam.naturezaId,
        csosn: isSvc ? undefined : "102",
        cTribNac: isSvc ? "130501" : undefined,
        cNbs: isSvc ? "121012100" : undefined,
        controlaEstoque: false,
        ativo: true,
      },
    });
  }

  // naturezaRevenda fica disponível para ribbons / revenda futura
  void naturezaRevenda;

  await prisma.auditLog.create({
    data: {
      entityType: "System",
      entityId: "seed",
      action: "SEED",
      userId: admin.id,
      newValue: {
        empresaId: empresa.id,
        empresaCnpj: empresa.cnpj,
        papeis: papeis.length,
        facas: facas.length,
        produtos: await prisma.produto.count({ where: { empresaId: empresa.id } }),
        parceiros: await prisma.parceiro.count(),
        naturezas: await prisma.naturezaOperacao.count({ where: { empresaId: empresa.id } }),
      },
    },
  });

  console.log("Seed OK — EMP-00001", empresa.nomeFantasia, empresa.cnpj);
  console.log("EMP-00002 cadastrada (venda desabilitada)");
  console.log("Login: admin@reta.local / Admin@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
