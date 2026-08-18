import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

type SectionId =
  | 'visao'
  | 'principios'
  | 'entrada'
  | 'passos'
  | 'matriz'
  | 'exemplo'
  | 'interno-vs-cliente'
  | 'regras';

const TOC: Array<{ id: SectionId; label: string }> = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'principios', label: 'Princípios' },
  { id: 'entrada', label: 'O que entra' },
  { id: 'passos', label: 'Passo a passo' },
  { id: 'matriz', label: 'Matriz e faca' },
  { id: 'exemplo', label: 'Exemplo real' },
  { id: 'interno-vs-cliente', label: 'Interno × cliente' },
  { id: 'regras', label: 'Regras importantes' },
];

const PASSOS = [
  {
    n: 1,
    titulo: 'Metragens',
    resumo: 'Quanto de bobina o serviço consome em metros e em m².',
    itens: [
      'Metragem linear (m) = (puxada ÷ 100) × quantidade ÷ colunas',
      'Área (m²) = teto de (qtd × largura × puxada ÷ 10.000) em passos de 0,1',
    ],
  },
  {
    n: 2,
    titulo: 'Tempos',
    resumo: 'Horas de máquina, troca entre modelos e troca de bobina.',
    itens: [
      'Hora máquina = (metragem ÷ RPM) + 1 h de setup básico',
      'Troca de produto = tempo da parada × (modelos − 1)',
      'Troca de bobina só se metragem ≥ 1.000 m',
    ],
  },
  {
    n: 3,
    titulo: 'Perdas',
    resumo: 'Papel de acerto, acabamento, troca de arte e troca de bobina.',
    itens: [
      'Acerto de impressão depende das cores (tabela do catálogo)',
      'Acerto por modelo cresce com a quantidade de artes',
      'Acabamento tem perda fixa (ex.: laminação = 5 m²)',
      'Troca de bobina = 0 abaixo de 1.000 m',
    ],
  },
  {
    n: 4,
    titulo: 'Embalagem',
    resumo: 'Rolos e caixas derivados da especificação.',
    itens: [
      'Rolos = quantidade ÷ etiquetas por rolo',
      'Caixas = teto de (rolos ÷ capacidade do tubete)',
    ],
  },
  {
    n: 5,
    titulo: 'Custos (serviço)',
    resumo: 'Soma de todas as linhas de custo parametrizadas.',
    itens: [
      'Papel, máquina, tintas, acabamento, rebobinação',
      'Trocas (produto e bobina), tubetes e caixas',
      'Cada linha vem de preço de catálogo × quantidade calculada',
      'Valor do serviço = soma dessas linhas',
    ],
  },
  {
    n: 6,
    titulo: 'Fechamento comercial',
    resumo: 'Comissão, imposto estimado e arredondamento para cima.',
    itens: [
      'Comissão = serviço × % da faixa',
      'Imposto estimado = serviço × % informado (padrão 16%)',
      'Base = serviço + comissão + imposto',
      'Etiquetas = teto da base em múltiplos de R$ 10',
      'Total = etiquetas + matriz (se cobrada) + faca nova (se houver)',
    ],
  },
];

export function OrcamentoComoCalculaPage() {
  const [ativo, setAtivo] = useState<SectionId>('visao');
  const [matrizCm2, setMatrizCm2] = useState<number | null>(null);
  const { hasPermission } = useAuth();
  const canOpenCatalogo = hasPermission('orcamento.catalogo.gerir');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: { matriz_cm2?: number } }>('/orcamentos/catalogo');
        if (!cancelled && res.data.matriz_cm2 != null) {
          setMatrizCm2(Number(res.data.matriz_cm2));
        }
      } catch {
        /* página educativa — fallback silencioso */
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
  }, []);

  return (
    <div className="calc-guide">
      <PageHeader
        title="Como o orçamento calcula"
        description="Memória de cálculo interna — o caminho completo do motor R1–R20, do domínio GERACAO_ORCAMENTO."
        actions={
          <div className="btn-row">
            <Link to="/orcamentos" className="btn btn-secondary">
              Orçamentos
            </Link>
            <Link to="/orcamentos/novo" className="btn btn-primary">
              Novo orçamento
            </Link>
          </div>
        }
      />

      <aside className="calc-guide-banner" role="note">
        <strong>Uso interno.</strong> Esta tela explica a composição para o time comercial.
        O cliente vê apenas a proposta (quantidades, totais, matriz, prazo) — nunca papel,
        hora-máquina, perdas, comissão ou imposto.
      </aside>

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
                Todo orçamento é a soma de componentes calculados a partir de parâmetros
                cadastrados — nunca números “digitados no meio”. O motor roda por faixa de
                quantidade e grava um snapshot auditável.
              </p>

              <ol className="calc-flow">
                {PASSOS.map((p) => (
                  <li key={p.n}>
                    <span className="calc-flow-n">{p.n}</span>
                    <div>
                      <strong>{p.titulo}</strong>
                      <span>{p.resumo}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="principios" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Princípios</h2>
              <div className="calc-principles">
                <article>
                  <h3>Parametrizado</h3>
                  <p>
                    Preços de papel, hora-máquina, tubete, caixa e cm² de matriz vêm do
                    catálogo. Trocar um preço não exige alterar fórmula.
                  </p>
                </article>
                <article>
                  <h3>Auditável</h3>
                  <p>
                    Ao calcular, o sistema fotografa entradas e resultados. Reabrir o ORC
                    mostra os mesmos números, mesmo se o catálogo já mudou.
                  </p>
                </article>
                <article>
                  <h3>Faixas (N quantidades)</h3>
                  <p>
                    O cliente recebe uma escada (ex.: 5.000 / 10.000 / 20.000). Setup e
                    ferramental se diluem e o unitário cai.
                  </p>
                </article>
                <article>
                  <h3>Arredonda para cima</h3>
                  <p>
                    No fechamento, o serviço sobe em múltiplos de R$ 10 e a matriz em R$ 1.
                    A margem só pode crescer nesse passo.
                  </p>
                </article>
              </div>
            </div>
          </section>

          <section id="entrada" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">O que o orçamentista informa</h2>
              <div className="calc-input-grid">
                <div>
                  <h3>Parceiro</h3>
                  <p>Cliente ou prospect do cadastro — sem texto livre.</p>
                </div>
                <div>
                  <h3>Faca / medida</h3>
                  <p>Mapa oficial ou faca nova cotada (valor e prazo).</p>
                </div>
                <div>
                  <h3>Especificação</h3>
                  <p>Largura, puxada, Z, cores, papel, acabamento, modelos, colunas.</p>
                </div>
                <div>
                  <h3>Produção</h3>
                  <p>Máquina, RPM, matriz SIM/NÃO, tubete, rebobinação, tipo de troca.</p>
                </div>
                <div>
                  <h3>Faixas</h3>
                  <p>Quantidades e % de comissão por degrau da escada.</p>
                </div>
                <div>
                  <h3>Imposto %</h3>
                  <p>Estimativa comercial (padrão 16%) — não é NF oficial.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="passos" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Passo a passo do motor</h2>
              <p className="calc-lead">
                Para cada faixa de quantidade o motor executa os seis passos abaixo. Os
                intermediários ficam no breakdown interno do ORC.
              </p>

              <div className="calc-steps">
                {PASSOS.map((p) => (
                  <article key={p.n} className="calc-step">
                    <header>
                      <span className="calc-step-n">Passo {p.n}</span>
                      <h3>{p.titulo}</h3>
                      <p>{p.resumo}</p>
                    </header>
                    <ul>
                      {p.itens.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>

              <div className="calc-formula-block">
                <h3>Linhas que formam o valor do serviço</h3>
                <div className="calc-cost-chips" aria-label="Componentes de custo">
                  {[
                    'Papel',
                    'Máquina',
                    'Troca produto',
                    'Troca bobina',
                    'Tinta',
                    'Acabamento',
                    'Rebobinação',
                    'Tubete',
                    'Caixa',
                  ].map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
                <p className="calc-formula-note">
                  Tintagem: até 30 m² (com perda de acerto) → R$ 10 por cor; acima → R$ 0,40/m².
                  Rebobinação: (metragem × colunas ÷ col. rebob. ÷ 1.000) × preço do catálogo.
                </p>
                <p className="calc-formula-note">
                  Frete entra depois do motor, no fechamento. Entregar: <strong>Calculada</strong>{' '}
                  (peso = caixas × peso da caixa escolhe a faixa; valor = máx(mínimo,
                  R$/km × km), teto para cima) ou <strong>Manual</strong> um R$ da
                  proposta (mesmo valor em todas as quantidades; não exige km). Não dilui
                  no unitário nem altera R1–R20. Default da proposta é Retirar (R$ 0);
                  em Entregar o padrão é Calculada.
                </p>
              </div>
            </div>
          </section>

          <section id="matriz" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Matriz (clichê) e faca nova</h2>
              <div className="calc-two-col">
                <div>
                  <h3>Matriz — só no 1º pedido</h3>
                  <p>
                    Cobrado quando Matriz = SIM e a chave daquele item ainda não foi paga
                    pelo parceiro. Nas recompras o sistema isenta.
                  </p>
                  <div className="calc-formula">
                    <code>
                      ((Z × 3,175 ÷ 10) + 4) × (largura × colunas + 4) × cores ×{' '}
                      {matrizCm2 != null
                        ? Number(matrizCm2).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          })
                        : 'R$/cm²'}
                    </code>
                    <span>Depois arredonda para cima em R$ 1.</span>
                    <span className="field-note">
                      Tarifa vigente do catálogo
                      {canOpenCatalogo ? (
                        <>
                          {' '}
                          · editável em{' '}
                          <Link to="/orcamento-catalogo">Catálogo ORC · Matriz</Link>
                        </>
                      ) : null}
                      .
                    </span>
                  </div>
                </div>
                <div>
                  <h3>Faca nova</h3>
                  <p>
                    Se não houver faca no mapa, o ORC aceita faca simulada com valor e prazo
                    cotados. Esse valor entra no total comercial, fora do núcleo R1–R20, e
                    só vai para o mapa oficial após aprovação.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="exemplo" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Exemplo real conferido</h2>
              <p className="calc-lead">
                9,5 × 3,5 cm · Couche Fasson 20G · laminação brilho · 1 cor · 1 modelo ·
                1 coluna · 500 etiq/rolo · tubete 3" · Z=60 · 10.000 etiquetas · imposto 16%.
              </p>

              <div className="table-wrap">
                <table className="data-table calc-example-table">
                  <thead>
                    <tr>
                      <th>Etapa</th>
                      <th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Metragem / área</td>
                      <td>380 m · 38 m²</td>
                    </tr>
                    <tr>
                      <td>Papel + máquina + tinta + acabamento + rebob. + tubete + caixa</td>
                      <td>Serviço R$ 461,02</td>
                    </tr>
                    <tr>
                      <td>Imposto estimado 16%</td>
                      <td>R$ 73,76 → base R$ 534,78</td>
                    </tr>
                    <tr>
                      <td>Arredondamento comercial (múltiplo de 10)</td>
                      <td>
                        <strong>Etiquetas R$ 540</strong>
                      </td>
                    </tr>
                    <tr>
                      <td>Matriz (Z=60, 1 cor)</td>
                      <td>
                        <strong>R$ 91</strong>
                      </td>
                    </tr>
                    <tr className="calc-example-total">
                      <td>Total 1º pedido</td>
                      <td>
                        <strong>R$ 631</strong> · unitário R$ 0,054
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="calc-formula-note">
                Nos ORCs salvos, a aba <em>Breakdown interno</em> mostra os valores em R$ e a
                aba <em>Guia de produção</em> lista os mesmos componentes em quantidade física
                (sem preço), por faixa.
              </p>
            </div>
          </section>

          <section id="interno-vs-cliente" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Interno × proposta ao cliente</h2>
              <div className="calc-compare">
                <div className="calc-compare-col calc-compare-in">
                  <h3>Time interno vê</h3>
                  <ul>
                    <li>Papel, hora-máquina, tintas, perdas</li>
                    <li>Comissão e imposto estimado</li>
                    <li>Metragem, m², rolos e caixas</li>
                    <li>Guia de produção (consumos físicos, sem R$)</li>
                    <li>Snapshot completo (entrada + resultado)</li>
                  </ul>
                </div>
                <div className="calc-compare-col calc-compare-out">
                  <h3>Cliente vê (futuro envio)</h3>
                  <ul>
                    <li>Material, medida, acabamento, cores</li>
                    <li>Faixas: total (com frete se levantado), unitário, valor do rolo</li>
                    <li>Matriz (nota: só no 1º pedido) e frete estimado quando Entregar</li>
                    <li>Prazo, validade e tolerância de quantidade</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section id="regras" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Regras importantes</h2>
              <ul className="calc-rules">
                <li>
                  <strong>Matriz / faca só uma vez</strong> — ferramental cobrado no 1º
                  pedido daquele modelo; recompra isenta.
                </li>
                <li>
                  <strong>Metragem &lt; 1.000 m</strong> — sem tempo nem perda de troca de
                  bobina.
                </li>
                <li>
                  <strong>Vários modelos</strong> — parada e perda crescem com
                  (modelos − 1) e o tipo de troca. O detalhe nome + % da quantidade
                  (composição) aparece na proposta ao cliente e segue para produção;
                  não altera a fórmula de preço.
                </li>
                <li>
                  <strong>Imposto é estimativa</strong> — serve para precificar; não
                  substitui a NF.
                </li>
                <li>
                  <strong>Catálogo alimenta o motor</strong> — alterações valem em novos
                  cálculos; ORCs já salvos permanecem com o snapshot antigo.
                </li>
                <li>
                  <strong>Frete estimado</strong> — Entregar usa origem Calculada (km já
                  gravado no parceiro desta empresa × R$/km da faixa de peso do catálogo,
                  com mínimo) ou Manual (um R$ informado, igual em todas as quantidades,
                  sem exigir km). Sem km ou sem tarifa na Calculada, não inventa valor.
                  Retirar = R$ 0. Frete levantado compõe o total da proposta (cliente ou
                  prospect) e não entra no unitário da etiqueta. O cliente vê o valor, não
                  se foi calculado ou informado.
                </li>
                <li>
                  <strong>Pré-fluxo atual</strong> — nesta fase só RASCUNHO / CALCULADO
                  (salvar, editar, excluir). Envio, aceite e PED ficam para etapas
                  seguintes.
                </li>
              </ul>

              <div className="calc-cta">
                <div>
                  <strong>Pronto para praticar?</strong>
                  <p>Abra um orçamento e confira a proposta comercial ao lado do breakdown.</p>
                </div>
                <div className="btn-row">
                  <Link to="/orcamentos" className="btn btn-secondary">
                    Ver orçamentos
                  </Link>
                  <Link to="/orcamentos/novo" className="btn btn-primary">
                    Calcular agora
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
