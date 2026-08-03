import { useAuth } from '../lib/auth';

export function HomePage() {
  const { usuario, empresa } = useAuth();

  return (
    <section className="page">
      <header className="page-header">
        <h1>Operação</h1>
        <p className="muted">
          Sessão em <strong>{empresa?.codigo}</strong>
          {empresa && !empresa.vendaAtiva ? ' · venda desligada' : ''}
        </p>
      </header>

      <div className="stat-grid">
        <article>
          <h2>Usuário</h2>
          <p>{usuario?.nome}</p>
          <p className="mono">{usuario?.email}</p>
        </article>
        <article>
          <h2>Perfis</h2>
          <p>{usuario?.perfis.join(' · ') || '—'}</p>
        </article>
        <article>
          <h2>Empresa</h2>
          <p>{empresa?.razaoSocial}</p>
          <p className="mono">{formatCnpj(empresa?.cnpj)}</p>
        </article>
        <article>
          <h2>Próximo</h2>
          <p>Fase 1 Must · Gate G1 · ver FASE2 outline</p>
        </article>
      </div>

      <div className="callout">
        M06: TIT em /titulos (gerado na NF) · baixa manual · COB/CNAB fica para depois.
      </div>
    </section>
  );
}

function formatCnpj(cnpj?: string) {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? '';
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}
