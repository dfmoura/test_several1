# Objetivos
```markdown

Levantamento de regras de negócio para
parametrização
Identificação
Parceiro: MR SOLUÇÕES AMBIENTAIS
Objetivos
O desenvolvimento de personalizações relacionadas a gestão das pesagens, desde
seu apontamento ao faturamento.
Solução Proposta
Apontamento das Pesagens
O apontamento é feito na tela ‘Pesagem Avulsa’, sendo necessário personalizar os
itens a seguir:
 Campo ‘Número do Contrato’
o Deve apresentar apenas os contratos do parceiro da pesagem;
o Será atendido por meio de filtro na ligação do campo com a tabela de
contratos.
 Campo ‘Produto’
o Deve apresentar apenas os produtos do contrato filtrado;
o Será atendido com a substituição do campo nativo de produto por um
campo adicional com filtro na ligação do campo com a tabela de produtos.
Um objeto personalizado deverá atualizar o campo nativo.
Indicadores
 Boletim de Medição – Detalhado
o As pesagens são apresentadas de forma analítica e agrupadas por resíduo
(serviço/produto).
BRAION
 Boletim de Medição - Resumido
o As pesagens são apresentadas de forma sintética, sendo agrupadas por
resíduo (serviço/produto).
 Filtros
o Ambos relatórios devem dispor dos filtros:
 Inicio do período (De)* - considerar o campo AD_DTHRSAIDA da tabela
TGAPEA;
 Fim do período (Até)* - considerar o campo AD_DTHRSAIDA da tabela
TGAPEA;
 Cód. Empresa*;
 Cód. Parceiro;
 Nro. Contrato;
 Produto/Serviço.
Ambos relatórios apresentados acima serão desenvolvidos em iReport para geração
do PDF e para apresentação dos mesmos no dash de faturamento que será
detalhado a seguir.
BRAION
Faturamento
Após o registro das pesagens, deve-se apurar o realizado, registrar as horas extras
do período fechado e faturar, gerando o pedido de venda.
Para atendimento, será criado uma rotina personalizada, segue em detalhes:
 Criar o dashboard ‘Gestão de Pesagens e Faturamento’
o Filtros
 Inicio do período (De)* - considerar o campo AD_DTHRSAIDA da tabela
TGAPEA;
 Fim do período (Até)* - considerar o campo AD_DTHRSAIDA da tabela
TGAPEA;
 Cód. Empresa*;
 Cód. Parceiro;
 Nro. Contrato;
 Produto/Serviço.
o Painel Principal
 Criar um componente de tabela no lado esquerdo da tela para
apresentar as pesagens pendentes de faturamento conforme o
filtro.
 Botão ‘Gerar Fechamento’
o O usuário poderá selecionar as pesagens que deve-se
faturar e acionar um botão de ação, como resultado,
será gerado um fechamento e as pesagens selecionadas
estarão relacionadas a ele, dessa forma deixando de
estar pendentes;
o O fechamento irá agrupar automaticamente as
pesagens de mesmo contrato;
o O fechamento deve gerar o número do boletim.
o Possibilitar o estorno do fechamento ‘exclusão’, assim
tornando as pesagens pendentes novamente.
o Possui controle de acessos.
 Criar um componente de tabela a direita para apresentar os
fechamentos (faturamentos) já realizados.
 Através da seleção do fechamento, deve ser possível exibir os
relatórios de ‘Boletim Resumido’ e ‘Boletim Detalhado’.
 Botão ‘Registrar Horas Extras’
o Deve possibilitar o registro (inclusão e alteração) do
valor de horas extras para o fechamento selecionado;
o Possui controle de acessos.
 Botão ‘Faturar’
o Gerar um pedido de venda correspondente ao
fechamento;
BRAION
o Criar tela adicional para possibilizar flexibilizar a origem
dos campos que vão compor o pedido;
o O número do pedido será o mesmo número do boletim
do fechamento.
o Possibilitar o estorno do pedido de venda ‘exclusão’,
assim tornando o fechamento disponível para um novo
faturamento;
o Possui controle de acessos.
Controle de Saldo
Criar uma aba adicional na tela de ‘Contratos’, para possibilitar registrar
manualmente o saldo previsto do contrato. Essa mesma aba deve ser atualizada
automaticamente com o saldo após os fechamentos, esse comportamento pode ser
implementado no botão de faturar do dashboard ‘Gestão de Pesagens e Faturamento’.
Contemplar os campos:
 Data Fechamento
 Nro Fechamento
 Valor Fechamento
 Saldo
Algumas empresas precisam destacar o saldo do contrato no rodapé do relatório de
boletim resumido por serviço, tal comportamento será flexibilizado por empresa
```
     
### 1. Log's Execução
#### 1.1. 24/02/2024 13:00 as 16:00
```markdown
Ultra - Relatorio Boletim de Medição - 1) Desenvolvimento de uma consulta SQL para gerar um relatório de boletins de medição, cujo critério se estabelece no nível de detalhamento dashboard de controle de pesagens. Este relatório visa fornecer uma visão abrangente e sucinta dos boletins de medição, categorizados por produto e contrato. O select elaborado extrai informações relevantes a partir da base de dados, considerando os parâmetros de filtragem especificados no dashboard. A consulta será estruturada de modo a apresentar uma síntese clara e concisa dos boletins de medição, destacando métricas-chave e sumarizando os dados conforme a necessidade de análise. Por meio desta abordagem técnica, pretende-se otimizar o processo de geração de relatórios, proporcionando aos usuários uma ferramenta eficiente para avaliar e monitorar os boletins de medição de forma precisa e contextualizada, facilitando a tomada de decisões estratégicas e operacionais.

```

### 1. Log's Execução
#### 1.1. 24/02/2024 13:00 as 16:00
```markdown
Ultra - Relatorio Boletim de Medição - 2) A partir do select desenvolvido, foi concebido um relatório analítico e detalhado utilizando o iReport, uma ferramenta de geração de relatórios. Este relatório foi estruturado para apresentar de forma detalhada as informações extraídas, utilizando as funcionalidades de formatação disponíveis no iReport para garantir uma apresentação visualmente atraente e de fácil compreensão. Foram aplicadas formatações adequadas, como cores, fontes, tamanhos de texto e alinhamentos, visando realçar aspectos importantes e facilitar a interpretação dos dados pelos usuários.

3) Após a criação dos relatórios no iReport, foram configurados eventos nos botões criados no dashboard para permitir o acesso e a visualização direta dos relatórios gerados. Estes eventos foram programados para proporcionar uma integração fluida entre o dashboard e os relatórios, garantindo uma experiência de usuário contínua e intuitiva. Dessa forma, os usuários podem facilmente acessar os relatórios relevantes diretamente a partir do dashboard, agilizando o processo de análise e tomada de decisões.
```