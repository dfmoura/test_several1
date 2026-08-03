import { prisma } from "@/lib/db";
import { requireEmpresaRaiz } from "@/lib/empresa";
import { sugerirCodigoParceiro } from "@/lib/cadastro-codigo";

/**
 * Cria parceiro CLIENTE mínimo marcado como prospect (estudo 32).
 * Usa tipo CLIENTE + observações — sem migration de enum PROSPECT.
 */
export async function ensureProspectParceiro(opts: {
  nome: string;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
}): Promise<{ id: string; codigo: string }> {
  const nome = opts.nome.trim();
  if (nome.length < 2) throw new Error("Nome do prospect inválido");

  const empresa = await requireEmpresaRaiz();
  const codigo = await sugerirCodigoParceiro({ empresaId: empresa.id });

  const created = await prisma.parceiro.create({
    data: {
      empresaId: empresa.id,
      codigo,
      nome,
      documento: opts.documento?.replace(/\D/g, "") || null,
      telefone: opts.telefone || null,
      email: opts.email || null,
      observacoes: "PROSPECT — cadastro mínimo gerado no orçamento (promover antes do faturamento).",
      tipos: {
        create: [{ tipo: "CLIENTE", ativo: true }],
      },
    },
    select: { id: true, codigo: true },
  });

  return created;
}
