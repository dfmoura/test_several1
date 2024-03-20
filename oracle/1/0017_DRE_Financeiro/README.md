
# Objetivos
```markdown

Premissas para a primeira fase do desenvolvimento do dash de DRE FINANCEIRO

    Criar uma tela em nível de hierarquia, chamada 'Dashboard DRE Financeiro'
        Criar aba para vincular as naturezas que irão compor o valor do registro
        Criar aba para definir as condições para retornar valores do faturamento = ?
            Criar campo para indicar o tipo do produto que será retornado = 
            Criar campo para indicar os tipos de movimentos que serão considerados
                Venda
                Devolução de Venda
                Ambos
    Criar dash de tabela que retorne os campos:
        Código
        Descrição
        Valor
    Filtros:
        Período de negociação
        Período de baixa
    Desenvolvimento da query
        Sugiro criar duas query's ligadas por UNION ALL
        Uma das query irá retornar valor de faturamento conforme as condições (tipo de produto e tipo de movimento) configuradas no DRE
        A outra query irá retornar valor financeiro conforme as condições de naturezas configuradas no DRE




::::: I D E I A :::::

Criar estrutura do dre gerencial olhando diretamente para o financeiro.
Ser utilizado como ferramenta diária de monitoramento dos gastos.
Na contabilidade os números não são contabilizados diáriamente e a auditoria
deve acontecer antes da contabilização.

*criar um novo DRE com base no que já existe.
*O DRE atual se baseia em uma tela adicional, você vai precisar replica-la.
*Utilizar view de financeiro.


Objetivo:
Dre financeiro com base no contabil

(Cria uma tela adicional do dre-financeiro
cod
descr.natureza
valor
)

*com exceção da receita: dash rentabilidade


//**/*/*//*****************/*/*/////////////////////////////////////////////////
DRE FINANCEIRO

ESTRUTURA DO DRE GERENCIAL FINANCEIRO
- ABA FATURAMENTO
    - CRIAR CAMPO "TIPO DO VALOR" COM AS OPÇÕES 'VALOR NOTA' E 'CUSTO'

- FLEXIBILIZAR O VALOR APRESENTADO NO DASH COM BASE NA OPÇÃO ESCOLHIDA

NÍVEL PRINCIPAL DO DASH
- DETALHAR O REALIZADO POR C.R EM UM PAINEL A DIREITA

FILTROS DO DASH
- CAMPO "TIPO DE CUSTO" DA NATUREZA (CAMPO ADICIONAL JÁ EXISTENTE)
- EMPRESA
- CENTRO DE RESULTADO

Iasmim pediu para também criar um filtro com o usuário responsável pelo C.R
Quando utilizado, deve filtrar apenas os C.R onde o usuário selecionado é responsável 
Faz o filtro como múltipla escolha (pode ser que ainda não tenha usuário informados nos C.R, mas tudo bem, ela ainda vai configurar)




```


### 1. Log's Execução

#### 1.1. 07/02/2024 20:00 as 22:00
```markdown

GF - DRE Gerencial Financeiro - 1) Foi criado uma tabela principal no construtor de telas, inserida no contexto hierárquico da 'DRE Gerencial Financeiro'. 2) Adicionalmente, implementou-se uma tela de detalhes como tabela secundária, destinada ao cadastro das naturezas correspondentes, incluindo uma aba específica para as naturezas associadas a esse nível.3) Introduziu-se um novo campo para identificar o tipo de produto a ser recuperado, proporcionando maior flexibilidade e detalhamento na gestão.4) Acrescentou-se um campo adicional para especificar os tipos de movimentos a serem considerados no contexto, oferecendo opções como Venda, Devolução de Venda ou ambos, conforme necessário. Essa adição visa otimizar a funcionalidade e personalização do sistema de acordo com as necessidades do usuário.

```
#### 1.2. 08/02/2024 08:30 as 12:30
```markdown

GF - DRE Gerencial Financeiro - 5) Concluída a etapa inicial de padronização das máscaras, estabelecendo os níveis correspondentes a cada movimento identificado no Demonstrativo do Resultado do Exercício (DRE). Este processo visa proporcionar uniformidade e consistência na representação dos dados contábeis, contribuindo para uma análise mais precisa e eficaz das operações financeiras. 6) Concluída a implementação da estrutura de cadastro padronizada que servirá como base fundamental para a elaboração do DRE e lançamento da tela para acesso. Esta estrutura estabelece os parâmetros essenciais para a coleta, organização e apresentação das informações contábeis, garantindo a integridade e confiabilidade do relatório financeiro.

```


#### 1.3. 08/02/2024 13:30 as 18:30
```markdown

GF - DRE Gerencial Financeiro - 7) Implementação de uma estruturação de consultas (select) que integra dados relacionados ao faturamento, categorizados por tipo de produto e tipo de movimentação. Além disso, a análise da movimentação financeira é refinada mediante a consideração da natureza da operação associada. Este processo técnico visa otimizar a coleta e organização de informações, proporcionando uma visão mais abrangente e detalhada das transações comerciais, aprimorando assim a tomada de decisões e a eficiência operacional. 8) Formatação por grau na apresentação dos níveis.

```

#### 1.4. 29/02/2024 13:30 as 18:30
```markdown

GF - DRE Gerencial Financeiro - 7) Iniciou-se a fase de implementação no código desenvolvido para a estrutura do Demonstrativo do Resultado do Exercício (DRE) gerencial financeiro, com a adição dos seguintes totalizadores essenciais para uma análise abrangente: (=) Faturamento Líquido, (=) Receita Líquida, (=) Margem de Contribuição Direta, (=) EBITDA (Lucro Antes de Juros, Impostos, Depreciação e Amortização), (=) Resultado Antes dos Impostos, (=) Resultado Líquido e (=) Resultado Após Depreciação e Investimentos. Este aprimoramento proporcionará uma visão mais completa e detalhada do desempenho financeiro da empresa, permitindo uma melhor tomada de decisões e análise estratégica.

```

#### 1.4. 01/03/2024 13:00 as 18:00
```markdown

GF - DRE Gerencial Financeiro - 7) Prosseguiu-se com o desenvolvimento do código para a estrutura do Demonstrativo do Resultado do Exercício (DRE) no âmbito financeiro, visando aprimorar a capacidade de análise gerencial. Este processo envolve a implementação e integração de algoritmos e lógicas de programação para a construção de um modelo robusto que permita a geração automatizada e precisa do DRE, considerando diversos aspectos contábeis e financeiros relevantes para a tomada de decisões estratégicas e operacionais.

```

#### 1.4. 14/03/2024 08:00 as 11:30
```markdown

GF - DRE Gerencial Financeiro - 8) Realizou-se uma otimização significativa no SELECT utilizado para o dashboard de Demonstrativo de Resultados do Exercício (DRE) Gerencial Financeiro. Esta otimização não apenas aprimorou o desempenho do processo, mas também proporcionou uma estrutura de código mais acessível e compreensível, facilitando a manutenção contínua do sistema.

```

#### 1.5. 14/03/2024 13:00 as 18:30
```markdown

GF - DRE Gerencial Financeiro - 9) Procedemos com a execução das atividades designadas para a fase 2, mantendo o fluxo de desenvolvimento conforme o planejado. 10) Introduzimos um novo campo denominado "TIPO DO VALOR" na seção de faturamento do Demonstrativo de Resultados do Exercício (DRE) Gerencial Financeiro, oferecendo as opções 'VALOR NOTA' e 'CUSTO'. Esse campo proporciona uma segmentação refinada dos dados, permitindo uma análise mais precisa e abrangente das informações relacionadas ao faturamento. 11) Implementamos filtros adicionais no dashboard, enriquecendo a capacidade de análise e personalização da visualização de dados. Estes incluem: - Campo "TIPO DE CUSTO" da natureza - Filtros por empresa e centro de resultado. 
```


#### 1.6. 15/03/2024 8:00 as 11:30
```markdown

GM - DRE Gerencial Financeiro - 12) Realizamos a validação dos dados obtidos por meio deste processo com outros dashboards, visando garantir a consistência e integridade das informações em todo o sistema. Essa etapa crítica de validação compreende a comparação e cruzamento dos dados apresentados com fontes de informação adicionais, assegurando que não haja discrepâncias ou inconsistências entre os diversos pontos de acesso aos dados. 
```

#### 1.6. 15/03/2024 13:00 as 18:00
```markdown

GM - DRE Gerencial Financeiro - 13) Concluímos o processo de validação que havia sido iniciado anteriormente, assegurando que todos os requisitos e critérios estabelecidos tenham sido integralmente cumpridos. Esta etapa crucial de validação abrangeu uma revisão detalhada dos dados, funcionalidades e integrações relevantes, garantindo a conformidade e qualidade do sistema. 14) Implementamos um filtro adicional no sistema, permitindo aos usuários filtrar os Centros de Resultado (C.R) com base no usuário responsável associado a cada C.R. Este filtro oferece uma funcionalidade avançada de segmentação, possibilitando aos usuários visualizar e analisar apenas os C.R pelos quais são responsáveis, contribuindo assim para uma análise mais focada e personalizada.
```