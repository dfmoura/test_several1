# Objetivos
```markdown
Segue o escopo de entrega que foi alinhado:

    Adicionar o botão 'Análise de Custo' no painel principal do dash 'Análise de Metas Comerciais'
        O clique no botão acima, deverá direcionar o usuário a um nível que apresente o custo por vendedor:
            Tabela com os vendedores que tem meta, o valor de meta prevista, valor de meta realizada, custo dos vendedores e % de representabilidade do custo frente ao faturamento realizado.
            Painel lateral que detalhe as despesas do vendedor selecionado por natureza
                Esse painel deve apresentar a natureza, valor e percentual de representatividade frente ao faturamento realizado.
            Obtenção do custo do vendedor
                Para tanto, o vendedor que tem meta, deverá ser vinculado aos C.R do qual ele é responsável (campo adicional que será criado)
                Buscar o custo (Despesas) dos C.R vinculados ao vendedor
                    Despesa de devolução de venda não deve ser considerada
                    Comissões devem ser consideradas pela data de negociação (comissões provisionadas no faturamento)
                    Demais despesas são obtidas pela data de baixa (liquidação)
        O duplo clique sobre o vendedor deverá direcionar o usuário a um nível inferior que detalhe a meta prevista, realizada, custo pela equipe do vendedor e percentual de representabilidade.
            Esse nível deve apresentar uma tabela com os C.R que estão vinculados ao vendedor selecionado
            O valor de meta prevista, deve ser obtido a partir da meta vinculada aos clientes, para tanto, será necessário vincular o C.R analítico que atende o cliente (campo adicional a ser criado na tela  de parceiros).
            O valor da meta realizada será obtido a partir das notas vinculadas ao C.R.
            O custo será obtido da mesma forma que o custo do vendedor, porém considerando apenas o C.R analítico.
            Painel lateral que detalha as despesas do vendedor selecionado por natureza, da mesma forma que o nível de custo por vendedores.

```

### 1. Log's Execução

#### 1.1. 18/03/2024 8:30 as 11:30
```markdown

Satis - Análise de Meta / Custo por Vendedor e Equipe - 1) O processo teve início com a implementação de um campo adicional na tabela "tgfpar", denominado "CR Parceiro", e na tabela de centro de resultado, identificado como "Vendedor Responsável". Sob a direção de Silvana, foi realizada uma instrução para estabelecer o relacionamento entre ambos os campos, indicando o centro de resultado e o vendedor, respectivamente. 2)Além disso, foi introduzido o botão "Análise de Custo" no painel principal do painel de controle "Análise de Metas Comerciais", acompanhado de um evento correspondente para permitir o acesso ao nível inferior de detalhamento.

```

#### 1.1. 18/03/2024 13:00 as 18:00
```markdown

Satis - Análise de Meta / Custo por Vendedor e Equipe - 3) Foi implementado um tratamento SELECT para estabelecer uma ligação entre o "Resultado Financeiro por CR" e a Análise de Metas. Este SELECT foi configurado de forma a retornar informações essenciais, incluindo o vendedor associado, o valor previsto e realizado, o custo incorrido e o percentual desse custo em relação ao valor realizado. 4) Como parte do processo de otimização, optamos por remover o campo adicional anteriormente criado na tabela "tgfpar" para vincular o parceiro ao CR. Essa exclusão foi realizada para simplificar a estrutura de dados e garantir uma gestão mais eficiente das informações.

```

#### 1.1. 19/03/2024 8:00 as 11:30
```markdown

Satis - Análise de Meta / Custo por Vendedor e Equipe - 4) Concluímos o tratamento do SELECT iniciado anteriormente, garantindo que todas as especificações e requisitos fossem devidamente atendidos. 5) Prosseguimos com a criação de um componente de tabela, incorporando o SELECT previamente elaborado. Esse componente foi projetado para apresentar informações cruciais, tais como o vendedor associado, os valores previstos e realizados, o custo incorrido e o percentual desse custo em relação ao valor realizado. 6) Adicionalmente, desenvolvemos um painel adjacente utilizando o mesmo SELECT, porém com uma adaptação para agrupar as informações por natureza. Neste contexto, implementamos um evento que permite a atualização dinâmica do painel conforme as linhas relacionadas ao vendedor no componente principal são selecionadas. Essa funcionalidade proporciona uma visualização mais detalhada e interativa dos dados, promovendo uma análise mais aprofundada e eficaz.

```

#### 1.1. 19/03/2024 13:00 as 18:30
```markdown

Satis - Análise de Meta / Custo por Vendedor e Equipe - 7) Continuamos o desenvolvimento implementando um próximo nível de detalhamento, acessível por meio de um duplo clique no vendedor. Essa funcionalidade proporciona uma navegação mais granular nos dados, permitindo uma análise mais aprofundada das informações associadas a cada vendedor.8) Para isso, empregamos o mesmo SELECT anteriormente utilizado, com uma adaptação para agrupar os registros do vendedor por CR (Centro de Resultado). Essa abordagem facilita a visualização e compreensão da distribuição dos resultados financeiros em relação aos diferentes Centros de Resultado associados a cada vendedor. 9) Em paralelo, desenvolvemos o componente principal de tabela, integrando as informações de CR e valor de custo. Esse componente serve como ponto focal para a análise dos dados, fornecendo uma visão consolidada dos resultados financeiros de cada vendedor em relação aos diferentes Centros de Resultado.10) Adicionalmente, criamos um painel lateral que detalha as informações do painel principal por natureza. Utilizamos uma adaptação do SELECT, incluindo o Centro de Resultado como argumento para filtragem. Essa abordagem permite uma análise mais detalhada e específica das informações por natureza, proporcionando uma visão abrangente e contextualizada dos resultados financeiros.

```


#### 1.1. 20/03/2024 8:00 as 11:30
```markdown

Satis - Análise de Meta / Custo por Vendedor e Equipe - 11) Identificamos um problema decorrente do acesso à movimentação de vendas associada a um centro de resultado específico dos vendedores, onde a ausência de movimentação estava causando uma interferência na visualização dos custos correspondentes ao mesmo centro de resultado para o respectivo vendedor. Diante disso, iniciamos um processo de refatoração com o objetivo de integrar essa dinâmica ao comando de seleção de dados, garantindo uma melhor integridade e precisão na análise das transações.


```

#### 1.1. 21/03/2024 13:00 as 18:00
```markdown

Satis - Análise de Meta / Custo por Vendedor e Equipe - 12) Após a conclusão da reestruturação, o comando SELECT foi aprimorado para garantir que, mesmo na ausência de transações de vendas em um centro de resultado específico, seja possível visualizar as despesas associadas, promovendo uma visão abrangente do custo total. 13) As atualizações foram aplicadas com sucesso ao componente SELECT, assegurando sua capacidade de refletir com precisão tanto os custos quanto as vendas associadas a cada centro de resultado, mesmo em cenários onde as vendas não tenham ocorrido. 14) Iniciamos então o processo de configuração do SELECT no painel lateral, visando incorporar a porcentagem do custo em relação às vendas realizadas. Em situações onde não há vendas registradas, aplicaremos a participação direta sobre o custo total, garantindo uma análise completa e abrangente da performance financeira.

```

#### 1.1. 22/03/2024 08:00 as 12:00
```markdown

Satis - Análise de Meta / Custo por Vendedor e Equipe - 15) Concluímos a implementação do comando SELECT no painel lateral, responsável pelo detalhamento da natureza por centro de resultado, acionado mediante clique no componente principal. 16) Realizamos também a atualização das formatações e do layout em todos os níveis de detalhamento abordados, assegurando uma apresentação uniforme e coerente dos dados em todo o sistema.


```


