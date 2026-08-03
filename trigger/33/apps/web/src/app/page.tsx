import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StepRail, type StepRailItem } from "@/components/StepRail";
import { CICLO_COMERCIAL } from "@/domain/ciclo/etapas";
import { getSession } from "@/lib/auth";
import { formatOrcamento } from "@/lib/codigos-documento";
import { prisma } from "@/lib/db";
import { STATUS_CHIP_CLASS, STATUS_LABEL } from "@/lib/orcamento-status";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [
    orcamentosAbertos,
    pedidosPendentes,
    opsAbertas,
    titulosReceber,
    necAbertas,
    recentOrc,
  ] = await Promise.all([
    prisma.orcamento.count({
      where: { status: { in: ["RASCUNHO", "ENVIADO", "VISUALIZADO"] } },
    }),
    prisma.pedidoVenda.count({
      where: {
        status: {
          in: [
            "RASCUNHO",
            "AGUARDA_CREDITO",
            "AGUARDA_ADIANTAMENTO",
            "LIBERADO",
            "CONFIRMADO",
            "EM_PRODUCAO",
            "PRODUZIDO",
            "FATURADO",
          ],
        },
      },
    }),
    prisma.ordemProducao.count({
      where: {
        status: {
          in: ["PLANEJADA", "EMPENHADA", "EM_SETUP", "EM_PRODUCAO", "PAUSADA", "AGUARDA_INSUMO"],
        },
      },
    }),
    prisma.tituloReceber.count({
      where: { status: { in: ["ABERTO", "VENCIDO", "PARCIAL"] } },
    }),
    prisma.necessidadeCompra.count({
      where: { status: { in: ["ABERTA", "EM_COMPRA"] } },
    }),
    prisma.orcamento.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
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

  const queueCounts: Record<string, number> = {
    orcamento: orcamentosAbertos,
    pedido: pedidosPendentes,
    producao: opsAbertas,
    notas: pedidosPendentes,
    entrega: pedidosPendentes,
    recebimento: titulosReceber,
  };

  const fluxoSteps: StepRailItem[] = CICLO_COMERCIAL.map((e) => {
    const n = queueCounts[e.id] ?? 0;
    return {
      id: e.id,
      label: e.label,
      detail: n > 0 ? `${n} em aberto` : e.descricao.split("→")[0].trim().slice(0, 32),
      state: n > 0 ? "current" : "pending",
      href: e.href,
    };
  });

  const queues = [
    {
      href: "/orcamentos",
      label: "Orçamentos",
      code: "ORC",
      count: orcamentosAbertos,
      hint: "Rascunho · enviados · visualizados",
    },
    {
      href: "/pedidos",
      label: "Pedidos",
      code: "PED",
      count: pedidosPendentes,
      hint: "Crédito · produção · faturamento",
    },
    {
      href: "/producao",
      label: "Produção",
      code: "OP",
      count: opsAbertas,
      hint: "Fila PCP / apontamento",
    },
    {
      href: "/financeiro?tab=receber",
      label: "A receber",
      code: "TIT / BX",
      count: titulosReceber,
      hint: "Títulos abertos e vencidos",
    },
  ];

  return (
    <AppShell name={session.name} role={session.role}>
      <PageHeader
        kicker="Reta Etiquetas · EMP-00001"
        title="Operação comercial"
        subtitle="Fluxo feliz: orçamento → aceite do cliente → pedido → produção → notas → entrega → baixa."
        actions={
          <>
            <Link className="btn" href="/orcamentos/novo">
              Novo orçamento
            </Link>
            <Link className="btn secondary-link" href="/orcamentos">
              Ver orçamentos
            </Link>
            <Link className="btn secondary-link" href="/pedidos">
              Pedidos
            </Link>
          </>
        }
      >
        <StepRail
          steps={fluxoSteps}
          ariaLabel="Fluxo comercial ORC → BX"
          columns={6}
          className="ciclo-hub-rail"
        />
      </PageHeader>

      <section className="home-queues card-panel">
        <div className="jornada-section-head">
          <h2 style={{ margin: 0 }}>Filas de trabalho</h2>
          <p className="muted" style={{ margin: 0 }}>
            Itens que pedem atenção agora
          </p>
        </div>
        <div className="home-queue-grid">
          {queues.map((q) => (
            <Link
              key={q.code}
              href={q.href}
              className={`home-queue-card ${q.count > 0 ? "has-work" : ""}`}
            >
              <span className="home-queue-code">{q.code}</span>
              <span className="home-queue-label">{q.label}</span>
              <strong className="home-queue-count">{q.count}</strong>
              <em className="home-queue-hint">{q.hint}</em>
            </Link>
          ))}
        </div>
      </section>

      <div className="home-split">
        <section className="card-panel">
          <div className="jornada-section-head">
            <h2 style={{ margin: 0 }}>Orçamentos recentes</h2>
            <Link href="/orcamentos">Ver todos →</Link>
          </div>
          {recentOrc.length === 0 ? (
            <div className="home-empty">
              <p className="muted" style={{ margin: 0 }}>
                Nenhum orçamento ainda.
              </p>
              <Link className="btn" href="/orcamentos/novo">
                Gerar o primeiro orçamento
              </Link>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {recentOrc.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/orcamentos/${o.id}`}>{formatOrcamento(o)}</Link>
                    </td>
                    <td>{o.clienteNome}</td>
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

        <aside className="card-panel home-aside">
          <h2 style={{ marginTop: 0 }}>Suporte operacional</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Compras só entram quando a OP para por falta de material (estudo 32 —
            fluxo paralelo). Estoque alimenta a produção.
          </p>
          <ul className="home-aside-list">
            <li>
              <Link href="/estoque">
                Estoque
                <span className="muted">MP · reservas · PA</span>
              </Link>
            </li>
            <li>
              <Link href="/compras?tab=necessidades">
                Compras
                {necAbertas > 0 ? (
                  <strong>{necAbertas} urgência(s)</strong>
                ) : (
                  <span className="muted">sem urgência</span>
                )}
              </Link>
            </li>
            <li>
              <Link href="/financeiro">
                Financeiro
                <span className="muted">TIT · COB · BX</span>
              </Link>
            </li>
          </ul>
        </aside>
      </div>
    </AppShell>
  );
}
