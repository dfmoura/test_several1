import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [papeis, acabamentos, tubetes, paradas, maquinas, params] = await Promise.all([
    prisma.papel.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.acabamento.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.tubete.findMany({ where: { ativo: true }, orderBy: { tamanho: "asc" } }),
    prisma.horaParada.findMany({ where: { ativo: true }, orderBy: { tipo: "asc" } }),
    prisma.maquina.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.parametroSistema.findUnique({ where: { chave: "geral" } }),
  ]);

  return NextResponse.json({
    papeis: papeis.map((p) => ({ nome: p.nome, precoM2: Number(p.precoM2) })),
    acabamentos: acabamentos.map((a) => ({
      nome: a.nome,
      precoM2: Number(a.precoM2),
      perdaM2: Number(a.perdaM2),
    })),
    tubetes: tubetes.map((t) => ({ tamanho: t.tamanho, preco: Number(t.preco) })),
    paradas: paradas.map((p) => ({ tipo: p.tipo, tempoH: Number(p.tempoH) })),
    maquinas: maquinas.map((m) => ({ nome: m.nome, grupo: m.grupo })),
    impostos: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
    comissoes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    parametros: params?.valor ?? null,
  });
}
