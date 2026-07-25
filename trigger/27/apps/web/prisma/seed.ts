import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();
const catalogs = join(__dirname, "../../../data/catalogs");

function load<T>(file: string): T {
  return JSON.parse(readFileSync(join(catalogs, file), "utf-8")) as T;
}

async function main() {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@flexo.local" },
    update: {},
    create: {
      email: "admin@flexo.local",
      name: "Administrador",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "vendedor@flexo.local" },
    update: {},
    create: {
      email: "vendedor@flexo.local",
      name: "Marcelo",
      passwordHash: await bcrypt.hash("Vendedor@123", 12),
      role: Role.VENDEDOR,
    },
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
    update: { valor: valorGeral },
    create: { chave: "geral", valor: valorGeral },
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

  await prisma.cliente.upsert({
    where: { id: "seed-banca-dinei" },
    update: {},
    create: {
      id: "seed-banca-dinei",
      nome: "BANCA DO DINEI",
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "System",
      entityId: "seed",
      action: "SEED",
      userId: admin.id,
      newValue: { papeis: papeis.length, facas: facas.length },
    },
  });

  console.log("Seed OK — admin@flexo.local / Admin@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
