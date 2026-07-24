"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert, LoadingBlock } from "@/components/ui/Feedback";
import { apiClient } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";
import styles from "./dashboard.module.css";

const CARDS = [
  { key: "quotesOpen" as const, label: "Orçamentos abertos", href: "/orcamentos", accent: "teal" },
  { key: "ordersOpen" as const, label: "Pedidos em andamento", href: "/pedidos", accent: "blue" },
  { key: "workOrdersToday" as const, label: "OS do dia", href: "/ordens", accent: "amber" },
  { key: "receivablesDue" as const, label: "AR a vencer", href: "/financeiro", accent: "rose" },
  { key: "stockCritical" as const, label: "Estoque crítico", href: "/estoque", accent: "red" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .dashboard()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar dashboard"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Visão operacional do dia — comercial, produção e financeiro"
      />

      {error && <div style={{ marginBottom: "1rem" }}><ErrorAlert message={error} /></div>}

      {loading ? (
        <LoadingBlock />
      ) : (
        <div className={styles.grid}>
          {CARDS.map((card) => (
            <Link key={card.key} href={card.href} className={`${styles.card} ${styles[card.accent]}`}>
              <span className={styles.cardValue}>{stats?.[card.key] ?? 0}</span>
              <span className={styles.cardLabel}>{card.label}</span>
              <span className={styles.cardAction}>Ver →</span>
            </Link>
          ))}
        </div>
      )}

      <section className={styles.quick}>
        <h2>Ações rápidas</h2>
        <div className={styles.quickLinks}>
          <Link href="/orcamentos/novo" className="btn btn-primary">
            Novo orçamento
          </Link>
          <Link href="/clientes" className="btn btn-secondary">
            Cadastrar cliente
          </Link>
          <Link href="/ordens" className="btn btn-secondary">
            Ver ordens de serviço
          </Link>
        </div>
      </section>
    </>
  );
}
