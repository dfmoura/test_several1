# Dashboard de Rentabilidade Financeira 2.0
## Documentação do Projeto

### Visão Geral

Foi desenvolvido um sistema completo de **Dashboard de Rentabilidade Financeira** para análise e acompanhamento dos indicadores financeiros da empresa. O projeto consiste em uma aplicação web moderna que apresenta dados financeiros de forma visual e interativa, permitindo aos gestores tomarem decisões estratégicas baseadas em informações precisas e atualizadas.

### Funcionalidades Implementadas

#### 1. **Painel Principal de Indicadores**
O dashboard principal apresenta os seguintes indicadores financeiros em tempo real:

- **Faturamento**: Valor total das vendas realizadas no período
- **Devoluções**: Valor total das mercadorias devolvidas pelos clientes  
- **Impostos**: Total de impostos incidentes sobre as vendas (IPI, ICMS, PIS, COFINS)
- **CMV (Custo da Mercadoria Vendida)**: Custo efetivo dos produtos comercializados
- **Volume em Toneladas**: Quantidade total de produtos comercializados
- **Descontos**: Valor total dos descontos concedidos nas vendas
- **Margem de Contribuição Nominal**: Margem bruta em valores absolutos
- **Margem de Contribuição Percentual**: Margem bruta em percentual
- **Despesas Operacionais**: Custos operacionais da empresa
- **Investimentos**: Valores aplicados em investimentos
- **Resultado Final**: Lucro líquido após todas as deduções

#### 2. **Análise Comparativa**
Cada indicador apresenta:
- Valor do período atual
- Valor do período anterior para comparação
- Percentual de variação entre os períodos
- Indicadores visuais (setas) para facilitar a interpretação dos resultados

#### 3. **Drill-Down por Categorias**
O sistema permite análise detalhada através de:

**Por Tipo de Produto:**
- Distribuição do faturamento por grupos de produtos
- Análise de rentabilidade por categoria
- Ranking dos produtos mais rentáveis

**Por Empresa:**
- Comparativo entre diferentes unidades de negócio
- Performance individual de cada empresa
- Análise de contribuição de cada unidade

**Por Vendedores:**
- Performance individual dos vendedores
- Ranking de vendas por representante
- Análise de produtividade da equipe comercial

**Por Produtos Específicos:**
- Detalhamento item por item
- Análise de margem por produto
- Identificação de produtos estratégicos

### Fórmulas de Cálculo

#### **Faturamento Líquido**
```
Faturamento = (Total dos Produtos - Desconto dos Produtos) - Desconto Rodapé Nota + Valor de Substituição - Desconto Redução de Base - Desconto Valor Unitário
```

#### **Devoluções**
```
Devoluções = (Total dos Produtos - Desconto dos Produtos) - Desconto Rodapé Nota + Valor de Substituição - Desconto Redução de Base
```

#### **Impostos**
```
Impostos = Valor IPI + Valor Substituição + Valor ICMS + Valor PIS + Valor COFINS
```

#### **CMV (Custo da Mercadoria Vendida)**
```
CMV = Último Custo Sem ICMS × Quantidade Negociada
```

#### **Volume em Toneladas**
```
TON = (Quantidade Negociada ÷ Quantidade Unidade Alternativa KG) ÷ 1000
```

#### **Descontos**
```
Descontos = Total de Desconto dos Produtos + Desconto Rodapé da Nota + Desconto Valor Unitário
```

#### **Margem de Contribuição Nominal**
```
Margem Nominal = Faturamento - Impostos (exceto Valor Substituição) - CMV
```

#### **Margem de Contribuição Percentual**
```
Margem % = (Margem de Contribuição Nominal ÷ Faturamento) × 100
```

#### **Despesas Operacionais**
```
Despesas Operacionais = Soma das despesas financeiras baixadas com naturezas que indicam Despesa Operacional
```

#### **Investimentos**
```
Investimentos = Soma das despesas financeiras baixadas com naturezas que indicam Investimentos
```

#### **Resultado Final**
```
Resultado = Faturamento - Devoluções - Impostos (exceto Valor Substituição) - CMV - Despesas Operacionais - Investimentos
```

### Características Técnicas

#### **Interface do Usuário**
- Design moderno e responsivo utilizando Bootstrap 4
- Interface intuitiva com cards interativos
- Cores corporativas e layout profissional
- Indicadores visuais para facilitar interpretação

#### **Funcionalidades Interativas**
- Filtros de período com seletor de datas
- Filtro multi-seleção para empresas
- Gráficos interativos (rosca e barras)
- Drill-down por clique nos gráficos
- Navegação entre diferentes níveis de análise

#### **Visualizações Gráficas**
- Gráficos de rosca para distribuição por categorias
- Gráficos de barras para comparações
- Tabelas detalhadas com dados específicos
- Indicadores de tendência com setas direcionais

### Benefícios do Sistema

1. **Visão Unificada**: Centralização de todos os indicadores financeiros em uma única tela
2. **Análise Temporal**: Comparação automática entre períodos para identificar tendências
3. **Drill-Down Inteligente**: Navegação detalhada para análises específicas
4. **Tomada de Decisão**: Informações precisas para decisões estratégicas
5. **Eficiência Operacional**: Redução do tempo para análise de dados financeiros
6. **Controle Gerencial**: Acompanhamento em tempo real dos resultados da empresa

### Aplicação Prática

O Dashboard de Rentabilidade Financeira 2.0 oferece aos gestores uma ferramenta poderosa para:

- **Monitoramento Contínuo**: Acompanhamento diário dos indicadores de performance
- **Análise de Rentabilidade**: Identificação dos produtos e clientes mais lucrativos  
- **Controle de Custos**: Monitoramento das despesas operacionais e investimentos
- **Planejamento Estratégico**: Base sólida para tomada de decisões futuras
- **Relatórios Gerenciais**: Informações consolidadas para apresentações executivas

Este sistema representa uma evolução significativa na gestão financeira da empresa, proporcionando maior transparência, agilidade e precisão nas análises de rentabilidade.
