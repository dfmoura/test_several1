"use client";

import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { LoadingBlock } from "@/components/ui/Feedback";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.hero}>
          <span className={styles.heroMark}>Reta</span>
          <span className={styles.heroSub}>Gestão</span>
          <p className={styles.heroDesc}>
            ERP operacional para impressão de etiquetas adesivas — orçamento, produção e financeiro
            em um só lugar.
          </p>
          <ul className={styles.heroList}>
            <li>Orçamento inteligente</li>
            <li>OS e estoque integrados</li>
            <li>NF-e e cobrança</li>
          </ul>
        </div>
        <Suspense fallback={<LoadingBlock />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
