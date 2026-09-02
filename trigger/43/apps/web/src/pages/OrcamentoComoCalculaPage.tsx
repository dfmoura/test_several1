import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

type SectionId = 'visao' | 'regras' | 'estrutural' | 'parametros' | 'interno-vs-cliente';

type ParametroVigente = {
  chave: string;
  valor?: number | null;
  rotulo?: string;
  unidade?: string | null;
  ativo?: boolean;
  grupo?: string;
  fonte?: string;
};

type RegraMotor = {
  id: string;
  grupo: string;
  titulo: string;
  resumo: string;
  formula: string;
  parametrizado: boolean;
  catalogo_tab: string | null;
  parametros_vigentes: ParametroVigente[];
};

type RegrasPayload = {
  motor_version: number;
  regras: RegraMotor[];
  constantes_estruturais: Array<{
    id: string;
    rotulo: string;
    valor: number;
    formula: string;
    nota: string;
  }>;
  vigente: Record<string, number>;
};

const TOC: Array<{ id: SectionId; label: string }> = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'regras', label: 'Regras do motor' },
  { id: 'estrutural', label: 'Constantes' },
  { id: 'parametros', label: 'Parâmetros vigentes' },
  { id: 'interno-vs-cliente', label: 'Interno × cliente' },
];

function catalogoHref(tab: string | null): string {
  if (!tab) return '/orcamento-catalogo';
  return `/orcamento-catalogo?tab=${encodeURIComponent(tab)}`;
}

export function OrcamentoComoCalculaPage() {
  const [ativo, setAtivo] = useState<SectionId>('visao');
  const [data, setData] = useState<RegrasPayload | null>(null);
  const [error, setError] = useState('');
  const { hasPermission } = useAuth();
  const canOpenCatalogo = hasPermission('orcamento.catalogo.gerir');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: RegrasPayload }>('/orcamento-catalogo/regras');
        if (!cancelled) setData(res.data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Não foi possível carregar as regras.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const nodes = TOC.map((t) => document.getElementById(t.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          setAtivo(visible.target.id as SectionId);
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.15, 0.4, 0.7] },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [data]);

  return (
    <div className="calc-guide">
      <PageHeader
        title="Como o orçamento calcula"
        description="Regras R1–R20 desta empresa — álgebra fixa, parâmetros editáveis no catálogo."
        actions={
          <div className="btn-row">
            <Link to="/orcamentos" className="btn btn-secondary">
              Orçamentos
            </Link>
            {canOpenCatalogo ? (
              <Link to="/orcamento-catalogo" className="btn btn-secondary">
                Catálogo
              </Link>
            ) : null}
            <Link to="/orcamentos/novo" className="btn btn-primary">
              Novo orçamento
            </Link>
          </div>
        }
      />

      <aside className="calc-guide-banner" role="note">
        <strong>Uso interno.</strong> O cliente vê só a proposta. Trocar um preço no catálogo
        nunca exige alterar fórmula — motor versão {data?.motor_version ?? 1}.
      </aside>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="calc-guide-layout">
        <nav className="calc-guide-toc" aria-label="Seções do guia">
          <div className="calc-guide-toc-label">Nesta página</div>
          <ol>
            {TOC.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={ativo === item.id ? 'active' : undefined}
                  onClick={() => setAtivo(item.id)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="calc-guide-body">
          <section id="visao" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Visão geral</h2>
              <p className="calc-lead">
                O orçamento soma componentes a partir de parâmetros cadastrados. A álgebra
                (R1–R20) é versionada no código; a EMP edita tarifas, perdas, setup e
                embalagem no catálogo.
              </p>
              <ol className="calc-flow">
                {(data?.regras ?? [])
                  .slice(0, 8)
                  .map((r, i) => (
                    <li key={r.id}>
                      <span className="calc-flow-n">{i + 1}</span>
                      <div>
                        <strong>{r.titulo}</strong>
                        <span>{r.resumo}</span>
                      </div>
                    </li>
                  ))}
              </ol>
            </div>
          </section>

          <section id="regras" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Regras do motor</h2>
              <p className="calc-lead">
                Cada passo mostra a fórmula e os parâmetros vigentes desta empresa.
              </p>
              <div className="calc-steps">
                {(data?.regras ?? []).map((r) => (
                  <article key={r.id} className="calc-step">
                    <header>
                      <span className="calc-step-n">{r.id}</span>
                      <h3>{r.titulo}</h3>
                      <p>{r.resumo}</p>
                    </header>
                    <p className="calc-formula-note">
                      <code>{r.formula}</code>
                    </p>
                    {r.parametros_vigentes.length > 0 ? (
                      <ul>
                        {r.parametros_vigentes.map((p) => (
                          <li key={p.chave}>
                            {p.rotulo ?? p.chave}
                            {p.valor != null
                              ? `: ${Number(p.valor).toLocaleString('pt-BR', {
                                  maximumFractionDigits: 6,
                                })}${p.unidade ? ` ${p.unidade}` : ''}`
                              : ''}
                            {p.ativo === false ? ' (inativo → modelo padrão)' : ''}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {canOpenCatalogo && r.catalogo_tab ? (
                      <p className="calc-formula-note">
                        <Link to={catalogoHref(r.catalogo_tab)}>Editar no catálogo →</Link>
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="estrutural" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Constantes estruturais</h2>
              <p className="calc-lead">
                Somente leitura — fazem parte da geometria do motor v
                {data?.motor_version ?? 1}. Mudança exige ADR e golden test.
              </p>
              <ul>
                {(data?.constantes_estruturais ?? []).map((c) => (
                  <li key={c.id}>
                    <strong>{c.rotulo}</strong> = {c.valor} · <code>{c.formula}</code>
                    <div className="field-note">{c.nota}</div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="parametros" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Parâmetros vigentes</h2>
              <div className="calc-input-grid">
                {Object.entries(data?.vigente ?? {}).map(([k, v]) => (
                  <div key={k}>
                    <h3>{k}</h3>
                    <p>{Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</p>
                  </div>
                ))}
              </div>
              {canOpenCatalogo ? (
                <p className="calc-formula-note" style={{ marginTop: '1rem' }}>
                  <Link to="/orcamento-catalogo?tab=parametros">Abrir parâmetros do motor →</Link>
                </p>
              ) : null}
            </div>
          </section>

          <section id="interno-vs-cliente" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Interno × cliente</h2>
              <div className="calc-principles">
                <article>
                  <h3>Time comercial</h3>
                  <p>
                    Vê composição, perdas, comissão, imposto estimado e esta memória de
                    cálculo.
                  </p>
                </article>
                <article>
                  <h3>Cliente</h3>
                  <p>
                    Recebe proposta com quantidades, totais, matriz e prazo — sem breakdown
                    de custo.
                  </p>
                </article>
                <article>
                  <h3>Snapshot</h3>
                  <p>
                    ORCs salvos guardam o catálogo da época. Mudar parâmetro não reescreve
                    documentos antigos.
                  </p>
                </article>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
