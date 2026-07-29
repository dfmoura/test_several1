import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { StepRail, type StepRailItem } from "@/components/StepRail";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { STATUS_CHIP_CLASS, STATUS_LABEL } from "@/lib/orcamento-status";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [
    necAbertas,
    entradasPendentes,
    orcamentosAbertos,
    pedidosProduzir,
    pedidosFaturar,
    pedidosEntregar,
    titulosReceber,
    recentOrc,
  ] = await Promise.all([
    prisma.necessidadeCompra.count({
      where: { status: { in: ["ABERTA", "EM_COMPRA"] } },
    }),
    prisma.documentoFiscalEntrada.count({
      where: { status: { notIn: ["ESTOQUE_LANCADO", "CANCELADO"] } },
    }),
    prisma.orcamento.count({
      where: { status: { in: ["RASCUNHO", "ENVIADO"] } },
    }),
    prisma.ordemServico.count({
      where: { status: { in: ["LIBERADA", "EM_PRODUCAO", "AGUARDANDO_MATERIAL"] } },
    }),
    prisma.pedidoVenda.count({
      where: { status: { in: ["EM_PRODUCAO", "CONFIRMADO"] } },
    }),
    prisma.pedidoVenda.count({ where: { status: "FATURADO" } }),
    prisma.tituloReceber.count({ where: { status: { in: ["ABERTO", "VENCIDO"] } } }),
    prisma.orcamento.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        numero: true,
        versao: true,
        status: true,
        clienteNome: true,
        vendedorNome: true,
        createdAt: true,
      },
    }),
  ]);

  const cicloSteps: StepRailItem[] = [
    {
      id: "comprar",
      label: "1. Comprar",
      detail: necAbertas > 0 ? `${necAbertas} necessidade(s)` : "Suprimentos",
      state: necAbertas > 0 ? "current" : "done",
      href: "/compras?tab=necessidades",
    },
    {
      id: "estoque",
      label: "2. Estoque",
      detail: entradasPendentes > 0 ? `${entradasPendentes} entrada(s)` : "Saldos",
      state: entradasPendentes > 0 ? "current" : "pending",
      href: "/estoque",
    },
    {
      id: "orcamento",
      label: "3. Orçamento",
      detail: orcamentosAbertos > 0 ? `${orcamentosAbertos} em aberto` : "Proposta",
      state: orcamentosAbertos > 0 ? "current" : "pending",
      href: "/orcamentos",
    },
    {
      id: "pedido",
      label: "4. Pedido / OS",
      detail: pedidosProduzir > 0 ? `${pedidosProduzir} OS ativa(s)` : "Produção",
      state: pedidosProduzir > 0 ? "current" : "pending",
      href: "/pedidos",
    },
    {
      id: "nf",
      label: "5. Notas fiscais",
      detail: "NFS-e / NF-e",
      state: pedidosFaturar > 0 ? "current" : "pending",
      href: "/pedidos",
    },
    {
      id: "boleto",
      label: "6. Boletos",
      detail: "Bolepix",
      state: titulosReceber > 0 ? "current" : "pending",
      href: "/pedidos",
    },
    {
      id: "entrega",
      label: "7. Entrega",
      detail: pedidosEntregar > 0 ? `${pedidosEntregar} a entregar` : "Expedição",
      state: pedidosEntregar > 0 ? "current" : "pending",
      href: "/pedidos",
    },
    {
      id: "recebimento",
      label: "8. Recebimento",
      detail: titulosReceber > 0 ? `${titulosReceber} aberto(s)` : "Liquidar",
      state: titulosReceber > 0 ? "current" : "pending",
      href: "/pedidos",
    },
  ];

  const queues = [
    {
      href: "/compras?tab=necessidades",
      label: "Comprar",
      count: necAbertas,
      hint: "Necessidades MRP",
    },
    {
      href: "/compras?tab=entradas",
      label: "Gerar estoque",
      count: entradasPendentes,
      hint: "Entradas a lançar",
    },
    {
      href: "/orcamentos",
      label: "Orçamentos",
      count: orcamentosAbertos,
      hint: "Rascunho / enviados",
    },
    {
      href: "/pedidos",
      label: "Produção (OS)",
      count: pedidosProduzir,
      hint: "Liberadas / em produção",
    },
    {
      href: "/pedidos",
      label: "A entregar",
      count: pedidosEntregar,
      hint: "Pedidos faturados",
    },
    {
      href: "/pedidos",
      label: "A receber",
      count: titulosReceber,
      hint: "Títulos em aberto",
    },
  ];

  return (
    <div className="shell">
      <AppHeader name={session.name} role={session.role} />

      <section className="card-panel">
        <p className="jornada-kicker">Ciclo operacional</p>
        <h1>Passo a passo</h1>
        <p className="muted">
          Comprar → estoque → orçamento → pedido e OS → notas fiscais → boletos →
          entrega → recebimento. Cadastros mestres ficam em Cadastros.
        </p>
        <StepRail
          steps={cicloSteps}
          ariaLabel="Ciclo operacional completo"
          columns={8}
          className="ciclo-hub-rail"
        />
        <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link className="btn" href="/compras">
            1. Comprar
          </Link>
          <Link className="btn secondary-link" href="/estoque">
            2. Estoque
          </Link>
          <Link className="btn secondary-link" href="/orcamentos/novo">
            3. Novo orçamento
          </Link>
          <Link className="btn secondary-link" href="/pedidos">
            Pedidos / OS
          </Link>
        </div>
      </section>

      <section className="card-panel" style={{ marginTop: "1.25rem" }}>
        <h2>Filas de trabalho</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Itens que pedem ação agora.
        </p>
        <div className="ciclo-hub-queues">
          {queues.map((q) => (
            <Link
              key={q.label}
              href={q.href}
              className={`ciclo-queue-card ${q.count > 0 ? "has-work" : ""}`}
            >
              <span>{q.label}</span>
              <strong>{q.count}</strong>
              <em>{q.hint}</em>
            </Link>
          ))}
        </div>
      </section>

      <section className="card-panel" style={{ marginTop: "1.25rem" }}>
        <div className="jornada-section-head">
          <h2 style={{ margin: 0 }}>Orçamentos recentes</h2>
          <Link href="/orcamentos">Ver todos →</Link>
        </div>
        {recentOrc.length === 0 ? (
          <p className="muted">Nenhum orçamento — comece pelo passo 3 ou use Novo orçamento.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {recentOrc.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/orcamentos/${o.id}`}>
                      {o.numero}-v{o.versao}
                    </Link>
                  </td>
                  <td>{o.clienteNome}</td>
                  <td>{o.vendedorNome}</td>
                  <td>
                    <span className={`chip ${STATUS_CHIP_CLASS[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td>{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
