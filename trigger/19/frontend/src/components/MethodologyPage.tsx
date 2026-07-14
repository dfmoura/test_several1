import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Calculator,
  Coins,
  LineChart,
  Scale,
  TrendingUp,
  Wallet,
} from "lucide-react";

interface Props {
  onBack: () => void;
}

export function MethodologyPage({ onBack }: Props) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-surface-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-glow">
              <BookOpen size={22} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Metodologia
              </p>
              <h1 className="text-xl font-semibold text-white">
                Como os cálculos são feitos
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-surface-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-accent/40 hover:text-white"
          >
            <ArrowLeft size={16} />
            Voltar ao dashboard
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <IntroCard />
        <Section
          icon={<Wallet size={18} />}
          title="1. Origem dos dados"
          subtitle="Movimentação oficial da B3"
        >
          <p>
            Todas as análises partem do arquivo <strong>XLSX de Movimentação</strong>{" "}
            baixado na Área do Investidor B3. Cada linha é interpretada como um evento
            financeiro (compra, venda, provento, bonificação, desdobramento etc.).
          </p>
          <p>
            Movimentações idênticas são deduplicadas por uma chave criptográfica
            (SHA-256) montada com data, tipo, produto, direção, quantidade e valor
            total — assim reimportações do mesmo extrato não duplicam posições.
          </p>
          <FormulaBlock
            title="Chave de deduplicação"
            formula="chave = SHA-256(data | movimento | produto | direção | quantidade | valor)"
          />
        </Section>

        <Section
          icon={<Scale size={18} />}
          title="2. Classificação das movimentações"
          subtitle="Como cada linha do extrato entra no cálculo"
        >
          <p>
            O sistema classifica o rótulo da movimentação B3 em categorias de domínio.
            Apenas eventos relevantes alteram posição, caixa investido ou proventos:
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/5">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-900/80 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Efeito no cálculo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <Row
                  label="Compra (BUY)"
                  effect="Soma quantidade e valor ao total investido; aumenta o custo de aquisição."
                />
                <Row
                  label="Venda (SELL)"
                  effect="Reduz quantidade e soma o valor ao total liquidado; reduz o custo proporcionalmente."
                />
                <Row
                  label="Provento (INCOME)"
                  effect="Soma dividendos, JCP e rendimentos ao total de proventos. Não altera quantidade."
                />
                <Row
                  label="Bonificação (BONUS)"
                  effect="Aumenta quantidade sem custo adicional (dilui o preço médio)."
                />
                <Row
                  label="Desdobramento / fração (SPLIT)"
                  effect="Ajusta quantidade conforme crédito ou débito; custo é redistribuído."
                />
                <Row
                  label="Posição inicial (POSITION_SET)"
                  effect="Define a quantidade em carteira (ex.: saldo de custódia). Custo é zerado nesse evento."
                />
                <Row
                  label="Ignorado (IGNORE)"
                  effect="Direitos, transferências internas sem efeito líquido e eventos sem impacto patrimonial."
                />
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          icon={<BarChart3 size={18} />}
          title="3. Indicadores do dashboard"
          subtitle="Cards superiores e totais da carteira"
        >
          <p>
            Os quatro KPIs da tela inicial são consolidados a partir de todas as
            posições ativas (tickers com quantidade, proventos ou capital investido):
          </p>
          <MetricList
            items={[
              {
                name: "Total investido",
                detail:
                  "Soma de todos os valores de compra (e liquidações de crédito equivalentes) de todos os tickers.",
                formula: "Σ total_investido(ticker)",
              },
              {
                name: "Total liquidado",
                detail:
                  "Soma de todos os valores de venda / resgate realizados na carteira.",
                formula: "Σ total_liquidado(ticker)",
              },
              {
                name: "Proventos recebidos",
                detail:
                  "Soma de dividendos, JCP, rendimentos e demais proventos creditados.",
                formula: "Σ total_proventos(ticker)",
              },
              {
                name: "Posições ativas",
                detail:
                  "Quantidade de tickers com saldo de ações maior que zero (após filtros de busca).",
                formula: "contagem(quantidade > 0)",
              },
            ]}
          />
        </Section>

        <Section
          icon={<Coins size={18} />}
          title="4. Posição por ticker"
          subtitle="Cards individuais e preço médio"
        >
          <p>
            Para cada ativo, as movimentações são processadas em ordem cronológica
            (data e chave externa). O estado final da posição é:
          </p>
          <MetricList
            items={[
              {
                name: "Quantidade",
                detail:
                  "Saldo de ações após compras, vendas, bonificações e desdobramentos. Vendas nunca deixam a quantidade negativa.",
                formula: "qtd = max(0, compras − vendas ± ajustes)",
              },
              {
                name: "Total investido",
                detail: "Soma dos valores pagos nas compras do ticker.",
                formula: "investido = Σ valor_compra",
              },
              {
                name: "Total liquidado",
                detail: "Soma dos valores recebidos nas vendas do ticker.",
                formula: "liquidado = Σ valor_venda",
              },
              {
                name: "Proventos pagos",
                detail: "Soma dos proventos creditados para aquele ticker.",
                formula: "proventos = Σ valor_provento",
              },
              {
                name: "Preço médio (custo médio)",
                detail:
                  "Custo médio unitário da posição atual. No card do dashboard usa o total investido histórico dividido pela quantidade atual (quando ambos são positivos).",
                formula: "preço_médio = total_investido ÷ quantidade",
              },
              {
                name: "Preço atual",
                detail:
                  "Cotação de mercado obtida via brapi.dev, com fallback para Yahoo Finance.",
                formula: "cotação(ticker)",
              },
              {
                name: "Valor em carteira",
                detail: "Marcação a mercado da posição aberta.",
                formula: "valor_mercado = quantidade × preço_atual",
              },
              {
                name: "Yield 12m",
                detail:
                  "Dividend yield com base nos proventos unitários creditados nos últimos 12 meses, dividido pelo preço atual de mercado. Exibido no rodapé do card.",
                formula: "yield_12m = (Σ provento_unitário_12m) ÷ preço_atual",
              },
            ]}
          />
        </Section>

        <Section
          icon={<Calculator size={18} />}
          title="5. Custo de aquisição ao longo do tempo"
          subtitle="Base de custo usada nos gráficos e no patrimônio"
        >
          <p>
            Nos horizontes mensais (ticker e carteira), o sistema mantém uma{" "}
            <strong>base de custo (cost basis)</strong> mais precisa do que o simples
            total investido histórico:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300">
            <li>
              <strong>Compra:</strong> soma o valor pago à base de custo e a
              quantidade à posição.
            </li>
            <li>
              <strong>Venda:</strong> remove da base o custo proporcional das ações
              vendidas, usando o preço médio vigente no momento da venda.
            </li>
            <li>
              <strong>Bonificação:</strong> aumenta a quantidade sem alterar a base
              de custo (dilui o preço médio).
            </li>
            <li>
              <strong>Desdobramento a débito:</strong> reduz quantidade e base de
              custo proporcionalmente.
            </li>
          </ul>
          <FormulaBlock
            title="Custo removido em uma venda"
            formula="custo_vendido = (base_custo ÷ quantidade) × qtd_vendida"
          />
          <FormulaBlock
            title="Preço médio no fim do mês"
            formula="preço_médio_mês = base_custo ÷ quantidade_fim_mês"
          />
        </Section>

        <Section
          icon={<TrendingUp size={18} />}
          title="6. Patrimônio do ativo"
          subtitle="Linha verde dos gráficos comparativos"
        >
          <p>
            O patrimônio atribuído ao investimento (ticker ou carteira inteira)
            representa o valor econômico acumulado até aquele mês:
          </p>
          <FormulaBlock
            title="Patrimônio no ativo"
            formula="patrimônio_ativo = proventos_acumulados + liquidado_acumulado + valor_da_posição"
          />
          <p className="mt-4">O valor da posição em cada mês é calculado assim:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300">
            <li>
              <strong>Mês mais recente:</strong> quantidade × cotação atual de
              mercado (quando disponível).
            </li>
            <li>
              <strong>Meses anteriores:</strong> quantidade × preço médio de
              aquisição vigente naquele mês (base de custo), ou a própria base de
              custo no consolidado da carteira.
            </li>
            <li>
              Se não houver posição aberta, o valor da posição é zero — o
              patrimônio fica apenas em proventos e liquidações já realizados.
            </li>
          </ul>
          <Callout>
            Em outras palavras: o gráfico do ativo mostra quanto você já recebeu de
            volta (proventos + vendas) mais o que ainda está investido, marcado a
            mercado no ponto final.
          </Callout>
        </Section>

        <Section
          icon={<LineChart size={18} />}
          title="7. Benchmarks: poupança e Selic"
          subtitle="Taxas mensais oficiais do Banco Central (SGS)"
        >
          <p>
            Para responder “e se o mesmo dinheiro tivesse ido para renda fixa?”, o
            sistema simula dois cenários com os{" "}
            <strong>mesmos fluxos mensais de aporte e resgate</strong> do ativo,
            usando as taxas mensais publicadas pelo Banco Central:
          </p>
          <MetricList
            items={[
              {
                name: "Poupança",
                detail:
                  "Série SGS 196 — rentabilidade mensal dos depósitos de poupança.",
                formula: "taxa_mês = valor_BCB ÷ 100",
              },
              {
                name: "Selic",
                detail: "Série SGS 4391 — Selic acumulada no mês (% a.m.).",
                formula: "taxa_mês = valor_BCB ÷ 100",
              },
            ]}
          />
          <p className="mt-4">
            Em cada mês, o saldo simulado é atualizado nesta ordem:
          </p>
          <FormulaBlock
            title="Saldo mensal simulado"
            formula="saldo = saldo_anterior × (1 + taxa_mensal_BCB) + investido_mês − liquidado_mês"
          />
          <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-300">
            <li>
              O rendimento do mês incide sobre o saldo existente{" "}
              <em>antes</em> de aplicar o fluxo do mês.
            </li>
            <li>
              Aportes (compras) aumentam o saldo; resgates (vendas) diminuem.
            </li>
            <li>
              Proventos do ativo <strong>não</strong> entram no saldo dos benchmarks
              — cada um só replica o capital aportado e resgatado.
            </li>
            <li>
              Se a API do BCB estiver indisponível, o sistema usa taxas de fallback
              (poupança 0,50% a.m.; Selic 0,85% a.m.).
            </li>
          </ul>
        </Section>

        <Section
          icon={<Scale size={18} />}
          title="8. Vantagem vs benchmarks"
          subtitle="Badges “+R$ … vs Selic / poupança”"
        >
          <p>
            A vantagem exibida nos gráficos é a diferença no{" "}
            <strong>último mês da série</strong> entre o patrimônio do ativo e o
            saldo simulado:
          </p>
          <FormulaBlock
            title="Vantagem"
            formula="vantagem_Selic = patrimônio_ativo − patrimônio_Selic"
          />
          <FormulaBlock
            title="Vantagem"
            formula="vantagem_poupança = patrimônio_ativo − patrimônio_poupança"
          />
          <p className="mt-4">
            Valores positivos (badge verde) indicam que o investimento superou o
            benchmark; valores negativos (badge laranja) indicam desempenho abaixo
            da referência no período analisado.
          </p>
        </Section>

        <Section
          icon={<BarChart3 size={18} />}
          title="9. Gráficos do horizonte do ticker"
          subtitle="Detalhamento ao abrir um ativo"
        >
          <MetricList
            items={[
              {
                name: "Fluxo mensal: investido vs liquidado",
                detail:
                  "Barras com o capital entrando (compras) e saindo (vendas) em cada mês. O tooltip mostra quantidade e preço unitário médio ponderado do mês.",
                formula: "preço_unitário = valor_mês ÷ quantidade_mês",
              },
              {
                name: "Evolução acumulada de proventos",
                detail:
                  "Soma progressiva dos proventos mês a mês, com a quantidade em posição no fim do período.",
                formula: "proventos_acum(t) = Σ proventos até t",
              },
              {
                name: "Proventos mensais",
                detail:
                  "Valor creditado em cada mês. O tooltip calcula o yield do provento em relação ao preço médio de compra vigente nos eventos de provento.",
                formula:
                  "yield_mês = preço_unitário_provento ÷ preço_médio_compra_ponderado",
              },
            ]}
          />
          <Callout>
            O preço médio de compra usado no yield do provento é ponderado pelo
            valor de cada provento no mês, considerando o custo médio da posição no
            instante em que o provento foi creditado.
          </Callout>
        </Section>

        <Section
          icon={<LineChart size={18} />}
          title="10. Comparativo da carteira"
          subtitle="Seção “Carteira vs benchmarks”"
        >
          <p>
            O gráfico consolidado aplica a mesma lógica de patrimônio e benchmarks,
            porém somando <strong>todos os tickers</strong> em cada mês:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300">
            <li>
              Fluxos mensais de investido, liquidado e proventos são agregados da
              carteira inteira.
            </li>
            <li>
              O valor da posição é a soma, ticker a ticker, de quantidade × cotação
              (no mês atual) ou da base de custo (meses anteriores).
            </li>
            <li>
              Poupança e Selic usam os fluxos consolidados de aporte e resgate de
              toda a carteira.
            </li>
          </ul>
        </Section>

        <Section
          icon={<BookOpen size={18} />}
          title="11. Premissas e limitações"
          subtitle="O que o modelo não pretende ser"
        >
          <ul className="list-disc space-y-2 pl-5 text-slate-300">
            <li>
              As taxas de poupança e Selic são <strong>constantes e simplificadas</strong>,
              não a série histórica diária do Banco Central.
            </li>
            <li>
              Não há ajuste por inflação (IPCA), IR sobre proventos/ganhos de capital
              nem custos de corretagem além do que já vier no valor total do extrato.
            </li>
            <li>
              Cotações de mercado dependem de provedores externos e podem ficar
              indisponíveis para alguns tickers.
            </li>
            <li>
              Transferências de custódia e eventos corporativos complexos são
              tratados de forma conservadora; linhas sem impacto patrimonial são
              ignoradas.
            </li>
            <li>
              O objetivo é uma visão previdenciária clara do capital aportado,
              proventos e desempenho relativo — não um extrato contábil oficial.
            </li>
          </ul>
        </Section>

        <div className="rounded-2xl border border-accent/20 bg-accent/5 px-6 py-5 text-center">
          <p className="text-sm text-slate-300">
            Todos os valores monetários são exibidos em reais (BRL), com formatação
            brasileira. Os cálculos internos usam precisão decimal para evitar erros
            de ponto flutuante.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-surface-900 transition hover:bg-accent-glow"
          >
            <ArrowLeft size={16} />
            Voltar ao dashboard
          </button>
        </div>
      </main>
    </div>
  );
}

function IntroCard() {
  return (
    <section className="rounded-2xl border border-white/5 bg-surface-800/80 p-6 shadow-card">
      <p className="text-sm leading-relaxed text-slate-300">
        Esta página descreve, em detalhe, todas as fórmulas e regras usadas pelo{" "}
        <strong className="text-white">B3 Dashboard</strong> para reconstruir sua
        carteira a partir do extrato de movimentação, calcular proventos, marcar
        posições a mercado e comparar o resultado com poupança e Selic.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        Nada aqui altera os números exibidos no dashboard — é apenas a documentação
        da metodologia já aplicada pelo sistema.
      </p>
    </section>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/5 bg-surface-800/80 p-6 shadow-card">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-slate-300">
        {children}
      </div>
    </section>
  );
}

function FormulaBlock({ title, formula }: { title: string; formula: string }) {
  return (
    <div className="mt-3 rounded-xl border border-white/5 bg-surface-900/70 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-1 font-mono text-sm text-accent-glow">{formula}</p>
    </div>
  );
}

function MetricList({
  items,
}: {
  items: Array<{ name: string; detail: string; formula: string }>;
}) {
  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <div
          key={item.name}
          className="rounded-xl border border-white/5 bg-surface-900/50 px-4 py-3"
        >
          <p className="font-medium text-white">{item.name}</p>
          <p className="mt-1 text-slate-400">{item.detail}</p>
          <p className="mt-2 font-mono text-xs text-accent-glow">{item.formula}</p>
        </div>
      ))}
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-accent/15 bg-accent/5 px-4 py-3 text-sm text-slate-300">
      {children}
    </div>
  );
}

function Row({ label, effect }: { label: string; effect: string }) {
  return (
    <tr className="bg-surface-800/40">
      <td className="px-4 py-3 font-medium text-slate-100">{label}</td>
      <td className="px-4 py-3 text-slate-400">{effect}</td>
    </tr>
  );
}
