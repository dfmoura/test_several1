import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StepRail, type StepRailItem } from "@/components/StepRail";
import { CICLO_ETAPAS, HUB_REFS } from "@/domain/ciclo/etapas";
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

  const counts: Record<string, number> = {
    compras: necAbertas,
    estoque: entradasPendentes,
    orcamento: orcamentosAbertos,
    pedido: pedidosProduzir,
    notas: pedidosFaturar,
    boletos: titulosReceber,
    entrega: pedidosEntregar,
    recebimento: titulosReceber,
  };

  const cicloSteps: StepRailItem[] = CICLO_ETAPAS.map((e) => {
    const n = counts[e.id] ?? 0;
    return {
      id: e.id,
      label: `${e.ordem}. ${e.label}`,
      detail: n > 0 ? `${n} pendente(s)` : e.descricao.split("→")[0].trim().slice(0, 28),
      state: n > 0 ? "current" : e.ordem <= 2 ? "done" : "pending",
      href: e.href,
    };
  });

  const queues = [
    { href: "/compras?tab=necessidades", label: "1. Comprar", count: necAbertas, hint: "Necessidades MRP" },
    { href: "/compras?tab=entradas", label: "2. Gerar estoque", count: entradasPendentes, hint: "Entradas a lançar" },
    { href: "/orcamentos", label: "3. Orçamentos", count: orcamentosAbertos, hint: "Rascunho / enviados" },
    { href: "/pedidos", label: "4. Produção (OS)", count: pedidosProduzir, hint: "Liberadas / em produção" },
    { href: "/pedidos", label: "5–6. Faturar / boleto", count: pedidosFaturar, hint: "NF-e + NFS-e + Bolepix" },
    { href: "/pedidos", label: "7. Entregar", count: pedidosEntregar, hint: "Pedidos faturados" },
    { href: "/financeiro?tab=receber", label: "8. Receber", count: titulosReceber, hint: "Títulos em aberto" },
  ];

  return (
    <AppShell name={session.name} role={session.role}>
      <PageHeader
        kicker="Ciclo operacional"
        title="Reta Etiquetas — passo a passo"
        subtitle={
          <>
            Cada etapa tem um propósito. No faturamento saem <strong>duas notas</strong>:{" "}
            <strong>NF-e de revenda</strong> (mercadoria) e <strong>NFS-e de serviço</strong>{" "}
            Cobrança e extrato via Inter Bolepix. Tesouraria em{" "}
            <Link href="/financeiro">Financeiro</Link> (AR/AP, saldo, conciliação).
          </>
        }
        actions={
          <>
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
              4–7. Pedidos
            </Link>
            <Link className="btn secondary-link" href="/financeiro">
              8. Financeiro
            </Link>
          </>
        }
      >
        <StepRail
          steps={cicloSteps}
          ariaLabel="Ciclo operacional completo"
          columns={8}
          className="ciclo-hub-rail"
        />
        <div className="hub-refs">
          <a href={HUB_REFS.focus} target="_blank" rel="noreferrer">
            Focus NFe · docs
          </a>
          <a href={HUB_REFS.interCobranca} target="_blank" rel="noreferrer">
            Inter · Bolepix
          </a>
          <a href={HUB_REFS.interExtrato} target="_blank" rel="noreferrer">
            Inter · Extrato
          </a>
          <a href={HUB_REFS.interSaldo} target="_blank" rel="noreferrer">
            Inter · Saldo
          </a>
        </div>
      </PageHeader>

      <section className="card-panel" style={{ marginTop: "1.25rem" }}>
        <h2>Filas de trabalho</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Itens que pedem ação agora — siga a numeração do ciclo.
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
        <div className="dual-fiscal">
          <div className="dual-fiscal-card nfe">
            <span className="doc-tag">Documento 1</span>
            <h3>NF-e — revenda de mercadoria</h3>
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
              CFOP 5102 · XML/DANFE no padrão de <code>modelos/nfe</code>. Hub Focus{" "}
              <code>/v2/nfe</code>.
            </p>
          </div>
          <div className="dual-fiscal-card nfse">
            <span className="doc-tag">Documento 2</span>
            <h3>NFS-e — prestação de serviço</h3>
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
              cTribNac 130501 · XML/DANFSe no padrão de <code>modelos/nfse</code>. Hub Focus{" "}
              <code>/v2/nfsen</code>.
            </p>
          </div>
        </div>
      </section>

      <section className="card-panel" style={{ marginTop: "1.25rem" }}>
        <div className="jornada-section-head">
          <h2 style={{ margin: 0 }}>Orçamentos recentes</h2>
          <Link href="/orcamentos">Ver todos →</Link>
        </div>
        {recentOrc.length === 0 ? (
          <p className="muted">Nenhum orçamento — comece pelo passo 3.</p>
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
    </AppShell>
  );
}
