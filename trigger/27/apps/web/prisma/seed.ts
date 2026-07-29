import { PrismaClient, Role, TipoParceiro, TipoPessoa, AmbienteFiscal, RegimeTributario, TipoCertificado, FinalidadeCertificado, StatusCertificado, TipoCnae } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();
const catalogs = join(__dirname, "../../../data/catalogs");

const EMPRESA_ID = "seed-empresa-matriz";

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
  // Dados reais da emitente (NFS-e de referência) — ambiente de teste simula produção.
  const empresa = await prisma.empresa.upsert({
    where: { id: EMPRESA_ID },
    update: {
      codigo: "MATRIZ",
      razaoSocial: "ADESIVOS, ETIQUETAS E ROTULOS UDI LTDA",
      nomeFantasia: "Etiquetas UDI",
      cnpj: "58820046000137",
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
      isMatriz: true,
      ativo: true,
    },
    create: {
      id: EMPRESA_ID,
      codigo: "MATRIZ",
      razaoSocial: "ADESIVOS, ETIQUETAS E ROTULOS UDI LTDA",
      nomeFantasia: "Etiquetas UDI",
      cnpj: "58820046000137",
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
      isMatriz: true,
      ativo: true,
      observacoes:
        "Empresa raiz do sistema (seed). Ambiente de teste com simulação de produção.",
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
      subjectCn: "ADESIVOS ETIQUETAS E ROTULOS UDI LTDA:58820046000137",
      validadeInicio: new Date("2025-01-01T00:00:00.000Z"),
      validadeFim: new Date("2027-01-01T00:00:00.000Z"),
      ativo: true,
      observacoes: "Seed de teste — anexe o .pfx real quando disponível.",
    },
    create: {
      empresaId: empresa.id,
      apelido: "NFS-e homologação",
      tipo: TipoCertificado.A1,
      finalidade: FinalidadeCertificado.NFSE,
      status: StatusCertificado.PENDENTE,
      subjectCn: "ADESIVOS ETIQUETAS E ROTULOS UDI LTDA:58820046000137",
      validadeInicio: new Date("2025-01-01T00:00:00.000Z"),
      validadeFim: new Date("2027-01-01T00:00:00.000Z"),
      ativo: true,
      observacoes: "Seed de teste — anexe o .pfx real quando disponível.",
    },
  });

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@123", 12);

  const adminParceiro = await upsertParceiro({
    id: "seed-parceiro-admin",
    empresaId: empresa.id,
    codigo: "USR-ADMIN",
    tipoPessoa: TipoPessoa.PF,
    nome: "Administrador",
    email: "admin@flexo.local",
    tipos: [TipoParceiro.USUARIO],
  });

  const vendedorParceiro = await upsertParceiro({
    id: "seed-parceiro-marcelo",
    empresaId: empresa.id,
    codigo: "VEN-001",
    tipoPessoa: TipoPessoa.PF,
    nome: "Marcelo",
    email: "vendedor@flexo.local",
    tipos: [TipoParceiro.VENDEDOR, TipoParceiro.USUARIO],
    comissaoPadraoPct: 5,
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@flexo.local" },
    update: {
      parceiroId: adminParceiro.id,
      name: "Administrador",
      empresaId: empresa.id,
    },
    create: {
      email: "admin@flexo.local",
      name: "Administrador",
      passwordHash,
      role: Role.ADMIN,
      parceiroId: adminParceiro.id,
      empresaId: empresa.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "vendedor@flexo.local" },
    update: {
      parceiroId: vendedorParceiro.id,
      name: "Marcelo",
      empresaId: empresa.id,
    },
    create: {
      email: "vendedor@flexo.local",
      name: "Marcelo",
      passwordHash: await bcrypt.hash("Vendedor@123", 12),
      role: Role.VENDEDOR,
      parceiroId: vendedorParceiro.id,
      empresaId: empresa.id,
    },
  });

  await upsertParceiro({
    id: "seed-banca-dinei",
    empresaId: empresa.id,
    codigo: "CLI-001",
    tipoPessoa: TipoPessoa.PJ,
    nome: "BANCA DO DINEI",
    razaoSocial: "BANCA DO DINEI",
    tipos: [TipoParceiro.CLIENTE],
  });

  await upsertParceiro({
    id: "seed-fornecedor-facas",
    empresaId: empresa.id,
    codigo: "FOR-001",
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
    { chave: "faturamento.documentoPadrao", valor: "NFSE" },
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
      observacoes: "Bolepix sandbox / simulado",
    },
  });

  const papeisDb = await prisma.papel.findMany({ where: { ativo: true } });
  for (const papel of papeisDb) {
    const codigo = `PAPEL-${papel.nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toUpperCase()
      .slice(0, 36)}`;
    await prisma.produto.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo } },
      update: { descricao: papel.nome, papelId: papel.id, unidade: "M2", tipo: "INSUMO" },
      create: {
        empresaId: empresa.id,
        codigo,
        descricao: papel.nome,
        tipo: "INSUMO",
        unidade: "M2",
        ncm: "48114110",
        controlaEstoque: true,
        papelId: papel.id,
        ativo: true,
      },
    });
  }

  const acabDb = await prisma.acabamento.findMany({ where: { ativo: true } });
  for (const acab of acabDb) {
    const codigo = `ACAB-${acab.nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toUpperCase()
      .slice(0, 36)}`;
    await prisma.produto.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo } },
      update: {
        descricao: acab.nome,
        acabamentoId: acab.id,
        unidade: "M2",
        tipo: "INSUMO",
      },
      create: {
        empresaId: empresa.id,
        codigo,
        descricao: acab.nome,
        tipo: "INSUMO",
        unidade: "M2",
        controlaEstoque: true,
        acabamentoId: acab.id,
        ativo: true,
      },
    });
  }

  const tubDb = await prisma.tubete.findMany({ where: { ativo: true } });
  for (const tub of tubDb) {
    const codigo = `TUB-${tub.tamanho.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase()}`;
    await prisma.produto.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo } },
      update: { descricao: `Tubete ${tub.tamanho}`, tubeteId: tub.id, tipo: "INSUMO" },
      create: {
        empresaId: empresa.id,
        codigo,
        descricao: `Tubete ${tub.tamanho}`,
        tipo: "INSUMO",
        unidade: "UN",
        controlaEstoque: true,
        tubeteId: tub.id,
        ativo: true,
      },
    });
  }

  await prisma.produto.upsert({
    where: { empresaId_codigo: { empresaId: empresa.id, codigo: "CAIXA" } },
    update: { descricao: "Caixa para embalagem", tipo: "INSUMO" },
    create: {
      empresaId: empresa.id,
      codigo: "CAIXA",
      descricao: "Caixa para embalagem",
      tipo: "INSUMO",
      unidade: "UN",
      controlaEstoque: true,
      ativo: true,
    },
  });

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
      },
    },
  });

  console.log("Seed OK — empresa raiz", empresa.nomeFantasia, empresa.cnpj);
  console.log("Login: admin@flexo.local / Admin@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
