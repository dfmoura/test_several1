import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="shell muted">Carregando…</div>}>
      <LoginForm />
    </Suspense>
  );
}
