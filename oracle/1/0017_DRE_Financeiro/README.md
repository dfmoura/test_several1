
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