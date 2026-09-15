import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../lib/auth';

type SectionId =
  | 'visao'
  | 'produto'
  | 'produto-grupos'
  | 'produto-passos'
  | 'produto-exemplos'
  | 'parceiro'
  | 'unidades'
  | 'importacao'
  | 'anti-padroes';

const TOC: Array<{ id: SectionId; label: string }> = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'produto', label: 'Produto — o quê' },
  { id: 'produto-grupos', label: 'Produto — qual grupo' },
  { id: 'produto-passos', label: 'Produto — passo a passo' },
  { id: 'produto-exemplos', label: 'Produto — exemplos' },
  { id: 'parceiro', label: 'Parceiro (PAR)' },
  { id: 'unidades', label: 'Unidades e bobina' },
  { id: 'importacao', label: 'Importação' },
  { id: 'anti-padroes', label: 'O que não fazer' },
];

export function ComoCadastraPage() {
  const [ativo, setAtivo] = useState<SectionId>('visao');
  const { hasPermission } = useAuth();
  const location = useLocation();
  const canProduto = hasPermission('produto.ler');
  const canParceiro = hasPermission('parceiro.ler');
  const canWriteProduto = hasPermission('produto.escrever');
  const canWriteParceiro = hasPermission('parceiro.escrever');

  useEffect(() => {
    const hash = location.hash.replace(/^#/, '') as SectionId;
    if (TOC.some((t) => t.id === hash)) {
      setAtivo(hash);
      const el = document.getElementById(hash);
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    }
  }, [location.hash]);

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
        title="Como cadastra"
        description="Guia interno — produto (SKU) e parceiro (PAR). Qual grupo usar, passo a passo na tela e o que não fazer."
      />

      <aside className="calc-guide-banner" role="note">
        <strong>Uso interno.</strong> Confira a empresa ativa no topo antes de gravar. Cadastros
        mestres alimentam ORC → PED → OP → FAT → estoque — e ficam isolados por EMP.
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
                Dois mestres sustentam a operação. O <strong>parceiro</strong> é quem compra,
                vende ou presta serviço. O <strong>produto</strong> é o material / SKU que a
                fábrica compra, estoca e consome na OP — não o preço da etiqueta sob medida
                (isso fica no catálogo ORC).
              </p>
              <ol className="calc-flow">
                <li>
                  <span className="calc-flow-n">1</span>
                  <div>
                    <strong>Parceiro mínimo</strong>
                    <span>Prospect com nome e contato já permite orçar.</span>
                  </div>
                </li>
                <li>
                  <span className="calc-flow-n">2</span>
                  <div>
                    <strong>Produto operacional</strong>
                    <span>MP / EMB / REV com unidade e código do fornecedor (de-para).</span>
                  </div>
                </li>
                <li>
                  <span className="calc-flow-n">3</span>
                  <div>
                    <strong>Fiscal quando emitir</strong>
                    <span>CNPJ, IE e endereço completos só quando for faturar ou comprar.</span>
                  </div>
                </li>
                <li>
                  <span className="calc-flow-n">4</span>
                  <div>
                    <strong>PA sob encomenda</strong>
                    <span>Poucas famílias PA/SVC — arte e medida viajam no pedido, não no SKU.</span>
                  </div>
                </li>
              </ol>
            </div>
          </section>

          <section id="produto" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Produto — o que você está cadastrando</h2>
              <p className="calc-lead">
                Pense no produto como a <strong>identidade do material</strong> (ou do serviço /
                família fiscal), não como cada bobina física nem como cada arte do cliente.
                Ordem mental: <strong>família → grupo → linha de estoque</strong> (se a tela
                pedir) → descrições → unidades → salvar → de-para. O código (ex.:{' '}
                <code>MP-FLM-001</code>) nasce do grupo.
              </p>

              <div className="calc-compare" style={{ marginBottom: '1rem' }}>
                <div className="calc-compare-col calc-compare-in">
                  <h3>Cadastre como produto</h3>
                  <ul>
                    <li>Papel, filme, tinta, foil, tubete, caixa, ribbon</li>
                    <li>Material + programa de compra (ex.: Exact 1000)</li>
                    <li>Poucas famílias de PA/SVC para faturar (não milhares de artes)</li>
                    <li>Ferramental (FAC) quando for patrimônio de uso</li>
                  </ul>
                </div>
                <div className="calc-compare-col calc-compare-out">
                  <h3>Não vira produto novo</h3>
                  <ul>
                    <li>Cada bobina / lote físico (isso é volume na entrada)</li>
                    <li>210×1000 vs 210×1020 do mesmo Exact (mesmo SKU)</li>
                    <li>Etiqueta “Cliente X · arte Y” sob medida (spec no PED)</li>
                    <li>Preço da etiqueta (catálogo ORC da EMP)</li>
                  </ul>
                </div>
              </div>

              <h3 className="calc-section-title" style={{ fontSize: '1.05rem' }}>
                Escolha a família (primeira pergunta)
              </h3>
              <div className="calc-input-grid" style={{ marginBottom: '1rem' }}>
                <div>
                  <h3>MP — Matéria-prima</h3>
                  <p>O que entra na máquina: papel, filme, tinta, laminação, foil, tecido.</p>
                </div>
                <div>
                  <h3>EMB — Embalagem</h3>
                  <p>Tubete, caixa, filme stretch — acompanha o acabado, não é a face impressa.</p>
                </div>
                <div>
                  <h3>REV — Revenda</h3>
                  <p>Compra e vende sem transformar (ribbon, toner, material de prateleira).</p>
                </div>
                <div>
                  <h3>PA — Produto acabado</h3>
                  <p>Famílias fiscais poucas (ex.: PA-ETQ). Personalização vive no pedido.</p>
                </div>
                <div>
                  <h3>SVC — Serviço</h3>
                  <p>Serviço faturável sem estoque físico de material.</p>
                </div>
                <div>
                  <h3>FAC — Ferramental</h3>
                  <p>Facas e ferramentas — patrimônio / uso, não consumo de bobina.</p>
                </div>
              </div>

              <h3 className="calc-section-title" style={{ fontSize: '1.05rem' }}>
                Insumo único por fornecedor (tratativa canônica)
              </h3>
              <p className="calc-lead">
                Se o material <strong>não é intercambiável</strong> (marca, programa, face/adesivo ou
                custo devem ficar separados), trate assim — sem inventar segundo modelo:
              </p>
              <div className="calc-compare" style={{ marginBottom: '1rem' }}>
                <div className="calc-compare-col calc-compare-in">
                  <h3>Único por fornecedor → 1 SKU</h3>
                  <ul>
                    <li>Um SKU só para aquele material daquele fornecedor</li>
                    <li>Descrição = material da NF (ex.: FASSON… Exact 1000) — sem nome do fornecedor</li>
                    <li>Exatamente <strong>um</strong> de-para: aquele fornecedor + cProd</li>
                    <li>Saldo e custo médio ficam separados naturalmente</li>
                    <li>OC e NF desse fornecedor casam só com esse SKU</li>
                  </ul>
                </div>
                <div className="calc-compare-col calc-compare-out">
                  <h3>Só une SKU se for o mesmo material</h3>
                  <ul>
                    <li>Mesmo programa técnico e intercambiável na OP</li>
                    <li>Aí: 1 SKU + vários de-para (um cProd por fornecedor)</li>
                    <li>Saldo e custo médio misturam — consciente</li>
                    <li>Nunca misture Avery com “parecido” sem decisão de PCP</li>
                    <li>Não coloque fornecedor no código do SKU como regra</li>
                  </ul>
                </div>
              </div>
              <ol className="calc-flow">
                <li>
                  <span className="calc-flow-n">1</span>
                  <div>
                    <strong>Mínimo para comprar e estocar</strong>
                    <span>Família + grupo + descrição fiscal + unidade comercial.</span>
                  </div>
                </li>
                <li>
                  <span className="calc-flow-n">2</span>
                  <div>
                    <strong>De-para 1:1 (caso único)</strong>
                    <span>Salvou o SKU → um vínculo fornecedor + cProd. Não amarre segundo fornecedor.</span>
                  </div>
                </li>
                <li>
                  <span className="calc-flow-n">3</span>
                  <div>
                    <strong>Para emitir / SPED</strong>
                    <span>Aba Fiscal (NCM, CSOSN…) — quem tem permissão produto.fiscal.</span>
                  </div>
                </li>
                <li>
                  <span className="calc-flow-n">4</span>
                  <div>
                    <strong>Na operação</strong>
                    <span>OC do fornecedor → XML casa pelo de-para → estoque → OP baixa aquele SKU.</span>
                  </div>
                </li>
              </ol>

              {canWriteProduto ? (
                <p className="calc-formula-note" style={{ marginTop: '1rem' }}>
                  <Link to="/produtos/novo">Abrir novo produto →</Link>
                  {' · '}
                  <a href="#produto-grupos">Qual grupo usar ↓</a>
                  {' · '}
                  <a href="#produto-passos">Passo a passo na tela ↓</a>
                </p>
              ) : canProduto ? (
                <p className="calc-formula-note" style={{ marginTop: '1rem' }}>
                  <Link to="/produtos">Ir para produtos →</Link>
                  {' · '}
                  <a href="#produto-grupos">Qual grupo usar ↓</a>
                </p>
              ) : null}
            </div>
          </section>

          <section id="produto-grupos" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Produto — qual grupo escolher</h2>
              <p className="calc-lead">
                O grupo é a decisão que define o prefixo do SKU, NCM sugerido e unidades
                padrão. Lista fixa do domínio — escolha pelo material real, não pela marca do
                fornecedor.
              </p>

              <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Família</th>
                      <th>Grupo</th>
                      <th>Use quando for…</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>MP</td>
                      <td>
                        <code>MP-PAP</code>
                      </td>
                      <td>Papel autoadesivo ou tag (couché, fosco, térmico, cartão sem adesivo)</td>
                    </tr>
                    <tr>
                      <td>MP</td>
                      <td>
                        <code>MP-FLM</code>
                      </td>
                      <td>Filme BOPP autoadesivo</td>
                    </tr>
                    <tr>
                      <td>MP</td>
                      <td>
                        <code>MP-TEC</code>
                      </td>
                      <td>Tecido para etiqueta têxtil</td>
                    </tr>
                    <tr>
                      <td>MP</td>
                      <td>
                        <code>MP-LAM</code>
                      </td>
                      <td>Laminação</td>
                    </tr>
                    <tr>
                      <td>MP</td>
                      <td>
                        <code>MP-CLD</code>
                      </td>
                      <td>Cold foil / hot stamping</td>
                    </tr>
                    <tr>
                      <td>MP</td>
                      <td>
                        <code>MP-TIN</code>
                      </td>
                      <td>Tinta, verniz ou auxiliar de impressão</td>
                    </tr>
                    <tr>
                      <td>MP</td>
                      <td>
                        <code>MP-ADF</code>
                      </td>
                      <td>Fita dupla face</td>
                    </tr>
                    <tr>
                      <td>MP</td>
                      <td>
                        <code>MP-RET</code>
                      </td>
                      <td>Retalho / sobra útil de bobina (cada retalho útil = SKU próprio)</td>
                    </tr>
                    <tr>
                      <td>EMB</td>
                      <td>
                        <code>EMB-TUB</code>
                      </td>
                      <td>Tubete</td>
                    </tr>
                    <tr>
                      <td>EMB</td>
                      <td>
                        <code>EMB-CX</code>
                      </td>
                      <td>Caixa de papelão</td>
                    </tr>
                    <tr>
                      <td>REV</td>
                      <td>
                        <code>REV-RIB</code>
                      </td>
                      <td>Ribbon (revenda / transferência térmica)</td>
                    </tr>
                    <tr>
                      <td>PA</td>
                      <td>
                        <code>PA-ETQ</code>
                      </td>
                      <td>Família fiscal de etiqueta — não uma arte por cliente</td>
                    </tr>
                    <tr>
                      <td>PA</td>
                      <td>
                        <code>PA-BOB</code>
                      </td>
                      <td>Bobina / material faturado como acabado</td>
                    </tr>
                    <tr>
                      <td>SVC</td>
                      <td>
                        <code>SVC</code>
                      </td>
                      <td>Serviço avulso faturável (sem estoque de material)</td>
                    </tr>
                    <tr>
                      <td>FAC</td>
                      <td>
                        <code>FAC</code>
                      </td>
                      <td>Faca / matriz (ferramental de uso, não consumo de bobina)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="calc-section-title" style={{ fontSize: '1.05rem' }}>
                Linha de estoque (só quando a tela pedir)
              </h3>
              <p className="calc-lead">
                Em alguns grupos (ex.: <code>MP-PAP</code>) aparece o campo{' '}
                <strong>Linha de estoque</strong>: subclasse do material no almoxarifado
                (couché, fosco, térmico…). Não muda o prefixo do SKU (
                <code>MP-PAP-nnn</code> continua igual). Se o grupo tem uma linha só, o sistema
                já assume — você nem vê o campo.
              </p>
              <ul className="calc-rules">
                <li>
                  <strong>MP-PAP:</strong> escolha a linha que bate com a face (couché / fosco /
                  térmico / tag).
                </li>
                <li>
                  <strong>Demais grupos:</strong> linha única ou padrão do catálogo — não invente
                  código.
                </li>
                <li>
                  <strong>Não confundir:</strong> linha de estoque ≠ família ≠ grupo ≠ marca do
                  fornecedor.
                </li>
              </ul>

              {canWriteProduto ? (
                <p className="calc-formula-note" style={{ marginTop: '1rem' }}>
                  <a href="#produto-passos">Seguir o passo a passo ↓</a>
                  {' · '}
                  <Link to="/produtos/novo">Novo produto →</Link>
                </p>
              ) : null}
            </div>
          </section>

          <section id="produto-passos" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Produto — passo a passo na tela</h2>
              <p className="calc-lead">
                Preferência: <Link to="/produtos/do-xml">Produtos → Do XML</Link> (NF-e de
                compra). Alternativa: <strong>Novo produto</strong> na aba{' '}
                <strong>Comercial</strong>, nesta ordem. Em dúvida de grupo, use a{' '}
                <a href="#produto-grupos">tabela acima</a>. Campos que o grupo já preenche podem
                ficar como estão — só mude se a nota do fornecedor disser o contrário.
              </p>

              <div className="calc-steps">
                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">P0</span>
                    <h3>Antes de digitar</h3>
                    <p>Três checagens de 10 segundos.</p>
                  </header>
                  <ul>
                    <li>
                      Empresa ativa correta no topo (cadastro fica só nessa EMP).
                    </li>
                    <li>
                      Você tem permissão de escrever produto? Sem ela o formulário fica só
                      leitura.
                    </li>
                    <li>
                      Já existe o mesmo material? Busque em Produtos pelo código Exact / marca /
                      descrição — evite inventar segundo SKU para o mesmo item.
                    </li>
                    <li>
                      Precisa de cadastro parecido com nomes distintos? Na lista ou na ficha use{' '}
                      <strong>Novo a partir deste</strong> — copia o perfil técnico; foque em nome
                      no estoque e descrição fiscal. Saldo e de-para ficam separados.
                    </li>
                  </ul>
                </article>

                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">P1</span>
                    <h3>Família</h3>
                    <p>Primeiro campo do formulário. Define o “tipo de coisa”.</p>
                  </header>
                  <ul>
                    <li>
                      <strong>MP</strong> para o que a OP consome (papel, filme, tinta…).
                    </li>
                    <li>
                      <strong>EMB</strong> para embalagem auxiliar; <strong>REV</strong> para
                      revenda pura.
                    </li>
                    <li>
                      <strong>PA / SVC</strong> só quando for família fiscal de venda — não uma
                      arte por cliente.
                    </li>
                    <li>Ao trocar a família, o sistema sugere o grupo padrão daquela família.</li>
                  </ul>
                </article>

                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">P2</span>
                    <h3>Grupo (obrigatório)</h3>
                    <p>
                      Lista fixa do domínio (MP-PAP, MP-FLM, EMB-TUB, PA-ETQ…). É a decisão mais
                      importante do cadastro.
                    </p>
                  </header>
                  <ul>
                    <li>
                      O grupo define o <strong>prefixo do código</strong> (ex.: MP-FLM-001),
                      sugestão de NCM, unidades e CFOP.
                    </li>
                    <li>
                      Escolha pelo material real — veja a{' '}
                      <a href="#produto-grupos">tabela de grupos</a>. Ex.: filme BOPP →{' '}
                      <code>MP-FLM</code>; couché / térmico → <code>MP-PAP</code>; tubete →{' '}
                      <code>EMB-TUB</code>.
                    </li>
                    <li>
                      Se aparecer “NCM a confirmar (pendente contador)”, ainda assim você pode
                      salvar o comercial — o contador fecha o fiscal depois.
                    </li>
                    <li>
                      Em grupos de bobina, a tela avisa: dimensões nominais ≠ bobina física
                      (volume na entrada).
                    </li>
                  </ul>
                </article>

                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">P3</span>
                    <h3>Linha de estoque (quando aparecer)</h3>
                    <p>
                      Só em grupos com mais de uma subclasse (ex.: MP-PAP). Classifica o
                      material no almoxarifado — não muda o código do SKU.
                    </p>
                  </header>
                  <ul>
                    <li>
                      Opções tipicamente: <strong>Couché</strong>, <strong>Fosco</strong>,{' '}
                      <strong>Térmico</strong>, <strong>Tag / cartão sem adesivo</strong>.
                    </li>
                    <li>
                      Escolha o que bate com a face / tipo do material da NF. O prefixo continua{' '}
                      <code>MP-PAP-nnn</code>.
                    </li>
                    <li>
                      Se o campo não aparecer, o grupo já tem linha única — nada a fazer.
                    </li>
                  </ul>
                </article>

                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">P4</span>
                    <h3>Código</h3>
                    <p>Deixe em branco no produto novo — o sistema gera.</p>
                  </header>
                  <ul>
                    <li>
                      Formato típico: <code>GRUPO-nnn</code> (ex.: <code>MP-PAP-012</code>).
                    </li>
                    <li>
                      Só digite código manual se a EMP tiver política explícita de códigos
                      herdados — o padrão profissional é deixar gerar.
                    </li>
                    <li>Depois de salvar, o código não muda.</li>
                  </ul>
                </article>

                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">P5</span>
                    <h3>Descrições</h3>
                    <p>Duas caixas de texto — papéis diferentes.</p>
                  </header>
                  <ul>
                    <li>
                      <strong>Descrição fiscal</strong> (obrigatória): texto estável que pode ir
                      para NF-e / SPED. Ex.: “Filme BOPP branco Exact 1000 FasSon…”.
                    </li>
                    <li>
                      <strong>Descrição comercial</strong>: nome curto da operação / almoxarifado.
                      Pode repetir a fiscal se preferir.
                    </li>
                    <li>
                      Marca do <em>material</em> (FasSon, programa Exact…) pode ir na descrição.
                      Nome do <strong>fornecedor</strong> não — isso é o de-para.
                    </li>
                  </ul>
                </article>

                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">P6</span>
                    <h3>Unidades</h3>
                    <p>Como a nota fala × como o estoque conta.</p>
                  </header>
                  <ul>
                    <li>
                      <strong>Unidade comercial</strong> = o que aparece na NF / pedido de compra
                      (KG, M², RL, UN…).
                    </li>
                    <li>
                      <strong>Unidade de estoque</strong> = saldo oficial. Vazio = mesma da
                      comercial (fator 1) — caso mais comum em Exact (M² = M²).
                    </li>
                    <li>
                      Só preencha estoque diferente quando a nota e o almoxarifado usam unidades
                      distintas (ex.: compra em KG, saldo em M²).
                    </li>
                    <li>
                      Quando as unidades diferem, a tela mostra o fator e a equação. Use a
                      sugestão do motor; não invente número se faltar largura / comprimento /
                      gramatura.
                    </li>
                  </ul>
                </article>

                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">P7</span>
                    <h3>Dimensões nominais (quando aparecer)</h3>
                    <p>Só em grupos de bobina / fórmula — referência, não identidade do SKU.</p>
                  </header>
                  <ul>
                    <li>
                      <strong>Largura (mm)</strong>, <strong>comprimento (m)</strong>,{' '}
                      <strong>gramatura (g/m²)</strong> ajudam OC e conversão.
                    </li>
                    <li>
                      Podem ficar vazios no cadastro inicial (aviso, não bloqueio). Complete
                      quando tiver a ficha técnica.
                    </li>
                    <li>
                      A bobina real (mm × m conferidos) nasce na <strong>entrada do lote</strong>,
                      não aqui.
                    </li>
                  </ul>
                </article>

                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">P8</span>
                    <h3>Estoque mínimo, lote e validade</h3>
                    <p>Controles de reposição e FEFO — o grupo já sugere o padrão.</p>
                  </header>
                  <ul>
                    <li>
                      <strong>Estoque mínimo</strong> e <strong>lead time</strong>: opcionais;
                      alimentam a visão “a repor”.
                    </li>
                    <li>
                      <strong>Controla lote</strong>: tipicamente ligado em adesivos, tintas e
                      foils (saída FEFO).
                    </li>
                    <li>
                      <strong>Controla validade</strong> + prazo em dias: quando o material vence
                      (tintas / adesivos). O grupo já acende o padrão.
                    </li>
                    <li>
                      Preço tabela: só se a EMP usar preço de lista neste SKU. Etiqueta sob medida
                      continua no ORC.
                    </li>
                  </ul>
                </article>

                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">P9</span>
                    <h3>Salvar</h3>
                    <p>Grave a aba Comercial. O SKU passa a existir.</p>
                  </header>
                  <ul>
                    <li>Confira a mensagem de sucesso e o código gerado no topo.</li>
                    <li>
                      Situação padrão: <strong>ATIVO</strong>. Use inativo só para desligar sem
                      apagar histórico.
                    </li>
                  </ul>
                </article>

                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">P10</span>
                    <h3>Códigos do fornecedor (de-para) — obrigatório na prática</h3>
                    <p>
                      Aparece depois de criar o produto. Sem isso a entrada por XML não casa
                      sozinha.
                    </p>
                  </header>
                  <ul>
                    <li>
                      Escolha o <strong>fornecedor</strong> (parceiro com papel fornecedor).
                    </li>
                    <li>
                      Informe o <strong>cProd</strong> exatamente como na NF-e (ex.:{' '}
                      <code>AAS029-EX4</code>).
                    </li>
                    <li>
                      Opcional: descrição do item na nota (<code>xProd</code>) — ajuda a auditoria.
                    </li>
                    <li>
                      <strong>Insumo único por fornecedor:</strong> amarre só esse fornecedor +
                      cProd. Não acrescente outro fornecedor no mesmo SKU.
                    </li>
                    <li>
                      <strong>Material intercambiável:</strong> aí sim o mesmo SKU pode ter vários
                      cProd (um por fornecedor). Saldo e custo médio misturam.
                    </li>
                  </ul>
                </article>

                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">P11</span>
                    <h3>Aba Fiscal</h3>
                    <p>Quem tem permissão produto.fiscal — ou o contador depois.</p>
                  </header>
                  <ul>
                    <li>
                      <strong>NCM</strong> vem sugerido pelo grupo; confirme com a NF do
                      fornecedor.
                    </li>
                    <li>
                      Origem, CSOSN/CST, CFOP de entrada/saída: padrões do grupo / RLP. Não
                      invente classificação.
                    </li>
                    <li>
                      CEST: deixe vazio se não houver ST. CBS/IBS (reforma): campos para o
                      contador ajustar.
                    </li>
                    <li>
                      Dá para operar compra/estoque com comercial ok e fiscal pendente — feche o
                      fiscal antes de emitir NF de saída crítica.
                    </li>
                  </ul>
                </article>
              </div>

              <div className="calc-cta" style={{ marginTop: '1.1rem' }}>
                <div>
                  <strong>Pronto para cadastrar?</strong>
                  <p>Use o passo a passo acima com a tela aberta ao lado.</p>
                </div>
                <div className="btn-row">
                  {canWriteProduto ? (
                    <Link to="/produtos/novo" className="btn btn-primary">
                      Novo produto
                    </Link>
                  ) : null}
                  <a href="#produto-exemplos" className="btn btn-secondary">
                    Ver exemplos
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section id="produto-exemplos" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Produto — exemplos prontos</h2>
              <p className="calc-lead">
                Quatro casos frequentes. Para qualquer outro material, use a{' '}
                <a href="#produto-grupos">tabela de grupos</a> e o mesmo passo a passo. Valores
                de NCM/unidade seguem o grupo; confirme sempre na NF do fornecedor.
              </p>

              <div className="calc-steps">
                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">Ex. 1</span>
                    <h3>Filme BOPP Exact — único do fornecedor Avery</h3>
                    <p>
                      Insumo exclusivo da Avery: 1 SKU + 1 de-para. Bobinas diferentes (1000 m /
                      1020 m) continuam o mesmo SKU.
                    </p>
                  </header>
                  <ul>
                    <li>
                      Família <strong>MP</strong> · Grupo <code>MP-FLM</code> · código gerado (ex.:
                      MP-FLM-001)
                    </li>
                    <li>
                      Descrição fiscal = texto da NF: “FASSON … Exact 1000” (sem “Avery” no nome)
                    </li>
                    <li>
                      Unidade comercial <strong>M2</strong> · estoque vazio ou M2 (fator 1)
                    </li>
                    <li>
                      Fornecedor Avery só no de-para + <code>cProd</code> (ex.: AAS029-EX4) — e
                      pare aí
                    </li>
                    <li>
                      Se amanhã comprar “parecido” da Colacril que <em>não</em> mistura na OP →
                      outro SKU + outro de-para (não reutilize este)
                    </li>
                  </ul>
                </article>

                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">Ex. 2</span>
                    <h3>Papel autoadesivo (compra em KG, estoque em M²)</h3>
                    <p>Quando a nota fala quilograma e o almoxarifado trabalha em metro².</p>
                  </header>
                  <ul>
                    <li>
                      Família <strong>MP</strong> · Grupo <code>MP-PAP</code>
                    </li>
                    <li>
                      Comercial <strong>KG</strong> · estoque <strong>M2</strong>
                    </li>
                    <li>
                      Preencha <strong>gramatura</strong> (e dimensões se a fórmula pedir) para o
                      motor sugerir o fator — não chute
                    </li>
                    <li>
                      Linha de estoque — couché / fosco / térmico conforme o material (não
                      altera o prefixo do SKU)
                    </li>
                  </ul>
                </article>

                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">Ex. 3</span>
                    <h3>Tubete (embalagem)</h3>
                    <p>Consumível de acabamento — não é face impressa.</p>
                  </header>
                  <ul>
                    <li>
                      Família <strong>EMB</strong> · Grupo <code>EMB-TUB</code>
                    </li>
                    <li>Unidade tipicamente UN ou PC conforme a NF</li>
                    <li>Descrição com diâmetro / medida comercial estável</li>
                    <li>De-para do fornecedor de tubetes, se a entrada for por XML</li>
                  </ul>
                </article>

                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">Ex. 4</span>
                    <h3>Família PA-ETQ (venda) — sem explosão</h3>
                    <p>Produto acabado fiscal, não “uma arte = um código”.</p>
                  </header>
                  <ul>
                    <li>
                      Família <strong>PA</strong> · Grupo <code>PA-ETQ</code> (BOPP ou papel
                      conforme o go-live da EMP)
                    </li>
                    <li>
                      Cadastre <em>poucas</em> famílias fiscais. A arte, medida e quantidade
                      entram no PED / OP
                    </li>
                    <li>
                      Preço da etiqueta sob medida: catálogo ORC — não invente milhares de
                      PA-ETQ-…
                    </li>
                  </ul>
                </article>
              </div>

              <h3 className="calc-section-title" style={{ fontSize: '1.05rem', marginTop: '1.1rem' }}>
                Checklist rápido antes de sair da tela
              </h3>
              <ul className="calc-rules">
                <li>
                  <strong>Grupo certo?</strong> Material real bate com a{' '}
                  <a href="#produto-grupos">tabela</a> (MP-PAP / MP-FLM / EMB…)?
                </li>
                <li>
                  <strong>Linha de estoque?</strong> Se o campo apareceu, escolheu a face certa
                  (couché / fosco / térmico…)?
                </li>
                <li>
                  <strong>Descrição fiscal legível?</strong> Outra pessoa entenderia na NF?
                </li>
                <li>
                  <strong>Unidade comercial = unidade da nota?</strong> Estoque só diferente se
                  precisar.
                </li>
                <li>
                  <strong>De-para criado?</strong> cProd do fornecedor amarrado após o save.
                </li>
                <li>
                  <strong>Não criou SKU por bobina ou por arte?</strong> Volume e spec ficam fora
                  do cadastro.
                </li>
              </ul>

              {canWriteProduto ? (
                <p className="calc-formula-note">
                  <Link to="/produtos/do-xml">Cadastrar a partir do XML →</Link>
                  {' · '}
                  <Link to="/produtos/novo">Formulário completo →</Link>
                </p>
              ) : null}
            </div>
          </section>

          <section id="parceiro" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Parceiro (PAR)</h2>
              <p className="calc-lead">
                Um cadastro, vários papéis. Cliente, fornecedor, transportadora, vendedor e
                demais classificações convivem no mesmo PAR.
              </p>
              <div className="calc-steps">
                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">R1</span>
                    <h3>Prospect ou completo</h3>
                    <p>
                      Prospect (nome, contato, cidade) já permite orçar. Cadastro fiscal
                      completo entra quando for emitir NF ou receber compra com rigor fiscal.
                    </p>
                  </header>
                </article>
                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">R2</span>
                    <h3>Identificação e papéis</h3>
                    <p>
                      PJ: consulte o CNPJ para preencher razão, fantasia, CNAE e endereço.
                      Marque os papéis necessários — o mesmo PAR pode ser cliente e
                      fornecedor.
                    </p>
                  </header>
                </article>
                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">R3</span>
                    <h3>Endereço e distância</h3>
                    <p>
                      CEP preenche logradouro e IBGE. Posição e km de carro usam a origem
                      operacional da empresa (aba Operação). Sem origem, o ponto do parceiro
                      grava, mas o km fica pendente.
                    </p>
                  </header>
                </article>
                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">R4</span>
                    <h3>Fiscal e contatos</h3>
                    <p>
                      IE, indicação de IE do destinatário, regime e consumidor final. Contatos
                      autorizados a aprovar e e-mail de XML evitam retrabalho no faturamento.
                    </p>
                  </header>
                </article>
                <article className="calc-step">
                  <header>
                    <span className="calc-step-n">R5</span>
                    <h3>Financeiro e classificação</h3>
                    <p>
                      Condição e forma de pagamento, limite, vendedor vinculado e contas
                      bancárias / PIX quando o papel exigir.
                    </p>
                  </header>
                </article>
              </div>
              {canWriteParceiro ? (
                <p className="calc-formula-note" style={{ marginTop: '1rem' }}>
                  <Link to="/parceiros/novo">Abrir novo parceiro →</Link>
                </p>
              ) : canParceiro ? (
                <p className="calc-formula-note" style={{ marginTop: '1rem' }}>
                  <Link to="/parceiros">Ir para parceiros →</Link>
                </p>
              ) : null}
            </div>
          </section>

          <section id="unidades" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Unidades e bobina</h2>
              <p className="calc-lead">
                O SKU é o material (programa Exact, face/adesivo/liner). Cada bobina física é
                volume na entrada — não um código novo.
              </p>
              <div className="calc-principles">
                <article>
                  <h3>Documento × estoque</h3>
                  <p>
                    1 comercial = fator × interna. Exact tipicamente M² = M² (fator 1). O
                    motor sugere o fator; não invente se faltar largura, comprimento ou
                    gramatura.
                  </p>
                </article>
                <article>
                  <h3>Dimensões nominais</h3>
                  <p>
                    Largura / comprimento / gramatura no produto são referência de OC e
                    conversão. A dimensão real da bobina nasce na conferência do lote.
                  </p>
                </article>
                <article>
                  <h3>De-para</h3>
                  <p>
                    Códigos do fornecedor são regra: o XML fala a língua do fornecedor; a OC
                    casa com o SKU interno. Sem de-para, a entrada assistida não amarra sozinha.
                  </p>
                </article>
              </div>
            </div>
          </section>

          <section id="importacao" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">Importação</h2>
              <p className="calc-lead">
                Produtos: XML da NF-e de compra (confirmação por cProd). Parceiros: CSV em
                massa ou XML para enriquecer CNPJ/IE/papéis.
              </p>
              <div className="calc-input-grid">
                {canWriteProduto ? (
                  <div>
                    <h3>Produtos</h3>
                    <p>
                      Envie o XML, confira família/grupo por cProd único e grave SKU + de-para.
                      Não lança estoque — entrada continua na OC.
                    </p>
                    <p className="calc-formula-note">
                      <Link to="/produtos/do-xml">Produtos a partir do XML →</Link>
                    </p>
                  </div>
                ) : null}
                {canWriteParceiro ? (
                  <div>
                    <h3>Parceiros</h3>
                    <p>
                      CSV para lista; XML de NF-e para enriquecer CNPJ, IE e papéis a partir
                      da nota.
                    </p>
                    <p className="calc-formula-note">
                      <Link to="/parceiros/importar">Importar parceiros →</Link>
                    </p>
                  </div>
                ) : null}
                {!canWriteProduto && !canWriteParceiro ? (
                  <div>
                    <h3>Sem permissão de escrita</h3>
                    <p>
                      Peça <code>produto.escrever</code> ou <code>parceiro.escrever</code>.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section id="anti-padroes" className="card calc-section">
            <div className="card-body">
              <h2 className="calc-section-title">O que não fazer</h2>
              <div className="calc-principles">
                <article>
                  <h3>Grupo inventado</h3>
                  <p>
                    Não cadastre fora do catálogo (MP-PAP, MP-FLM…). Marca ou fornecedor não
                    viram grupo novo — vão na descrição ou no de-para.
                  </p>
                </article>
                <article>
                  <h3>Milhares de PA-ETQ</h3>
                  <p>
                    Não crie um SKU por arte ou cliente. PA sob encomenda = família +
                    especificação no pedido.
                  </p>
                </article>
                <article>
                  <h3>SKU por L×C Exact</h3>
                  <p>
                    210×1000 e 210×1020 são a mesma identidade de material. Volumes diferentes
                    entram como lotes, não como códigos novos.
                  </p>
                </article>
                <article>
                  <h3>Entrada sem OC</h3>
                  <p>
                    NF-e de entrada amarra na ordem de compra (assist + conferência humana).
                    Estoque não tem segundo escritor de saldo.
                  </p>
                </article>
                <article>
                  <h3>Fiscal incompleto na emissão</h3>
                  <p>
                    Orçar com prospect é certo. Emitir NF com IE/endereço pendentes gera
                    retrabalho e rejeição — complete o PAR antes do faturamento.
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
