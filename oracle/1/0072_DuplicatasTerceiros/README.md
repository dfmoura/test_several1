

Detalhes da demanda:

1 - Apresentar na tela "Movimentação Financeira", uma aba que apresente as duplicatas de terceiros relacionadas ao título selecionado.

    Existem situações onde o título próprio pode ser renegociado, nesse caso o sistema gera um novo título financeiro porém a duplicata continua vinculada ao título de origem. Nessas situações ao selecionar o novo título, a aba de duplicatas deve apresentar as duplicatas de terceiro do título original;
    Essa demanda pode ser atendida criando uma tabela detalhe da tabela TGFFIN e a convertendo para view (recurso do construtor de telas);
    Desenvolver uma query para a view da tabela detalhe que foi criada, que atenda está demanda.



Execucao:

1) 26/11/2024 14:10 as 18:30
Durante este período, foi realizada a análise inicial do sistema para identificar os requisitos necessários à implementação da aba "Duplicatas de Terceiros" dentro da tela "Movimentação Financeira". Isso incluiu a verificação do comportamento do sistema em casos de renegociação de títulos financeiros e o mapeamento do vínculo entre duplicatas de terceiros e os títulos originais. Além disso, foram levantadas as especificações técnicas para a criação de uma tabela detalhe vinculada à TGFFIN, garantindo compatibilidade com o modelo de dados existente.

2) 27/11/2024 8:35 as 12:50
Nesta etapa, foi implementada a tabela detalhe na estrutura do banco de dados. A tabela foi projetada para armazenar as informações necessárias ao vínculo entre duplicatas de terceiros e títulos financeiros renegociados, garantindo que todas as duplicatas associadas fossem exibidas corretamente. Em seguida, a tabela foi convertida para uma view utilizando o recurso do construtor de telas. Isso permitiu a integração inicial da nova funcionalidade no ambiente de desenvolvimento, com foco na compatibilidade com a tela "Movimentação Financeira".

3) 27/11/2024 13:40 as 18:20
Com a view criada, iniciou-se o desenvolvimento da query necessária para preencher a aba "Duplicatas de Terceiros". A query foi projetada para buscar, de forma dinâmica, as duplicatas vinculadas ao título original mesmo em casos de renegociação. Foram realizados testes iniciais utilizando dados simulados para garantir que a exibição das duplicatas na aba atendesse todos os critérios definidos na demanda. Eventuais ajustes no modelo de dados foram feitos para atender às regras de negócios identificadas durante os testes.

4) 28/11/2024 8:50 as 12:25
A etapa foi dedicada à integração e testes da aba "Duplicatas de Terceiros" na tela "Movimentação Financeira". O comportamento do sistema foi validado para situações em que os títulos financeiros foram renegociados, garantindo que as duplicatas vinculadas ao título original fossem exibidas corretamente. Foram identificados e corrigidos problemas relacionados à exibição de dados em situações específicas, como títulos com múltiplas renegociações ou duplicatas associadas a mais de um título.

5) 28/11/2024 13:10 as 18:00
Por fim, foi realizada a revisão completa do código, abrangendo a query e a integração da aba, e a finalização dos testes em ambiente controlado. Após a validação de todos os cenários, a funcionalidade foi documentada e entregue para homologação. A documentação incluiu o detalhamento técnico da view criada, as regras de negócios aplicadas e as instruções para validação em ambiente de produção. A nova funcionalidade está agora pronta para ser submetida a testes pelo cliente.



efetuado atualizacao na view para que os dados da cte AD_HISTCOB troxesse alem do campo obervacao os
demais campos da tabela.

