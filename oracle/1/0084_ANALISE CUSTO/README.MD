Dashboard Análise de Metas -> Nível de Análise de Custo
  - Criar parâmetro para que o usuário indique se a data das despesas a ser considerada será data de baixa ou data de entrada (TFGFIN.DTENTSAI)
  - Criar parâmetro para que o usuário possa filtrar as naturezas financeiras das despesas da análise de custo (aplicar o filtro por parametro em todos páineis/níveis da análise de custo)
  - Criar botão dentro do nível de análise de custo, para acessar uma tabela semelhante a planilha disponibilizada pelo Gusmão (link no campo observação)
  - Garantir a apresentação do vendedor 0 na análise de custo pois pode ser que um C.R desses tenha despesas vinculadas mas o Gusmão não veja pelo fato do C.R estar sem um vendedor responsável. Vincular o vendedor 0 em todo C.R comercial que não possuir um reponsável, ou seja, a faixa de C.R comercial nunca ficará com o campo de responsável vazio, nesse caso, entra o vendedor 0 (considerar criar trigger e atualizar os registros do C.R conforme essa orientação)
- Possibilitar alterar a visualização da análise de custo, mantendo a visao atual como padrão mas possibilitando apresentar uma visão desmenbrada por C.R, nesse caso, um vendedor poderia ter vários registros, cada um se referindo a um C.R que ele é responsável.
- Adicionar a coluna de apelido do C.R no nível principal de análise de custo e no nível inferior (detalhe do vendedor). No nível principal, entendo que deve haver agrupamento (listagg), pois o mesmo vendedor pode ter vários C.R/apelidos.
 - Ajustar o nível 3 da análise de custo para demonstrar no título dos paineis, o nome do vendedor que o usuário selecionou e no painel lateral de naturezas, apresentar o nome do C.R selecionado.
 
 
