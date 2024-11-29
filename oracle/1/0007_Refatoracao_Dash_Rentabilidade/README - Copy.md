# Objetivos
```markdown

1.1) Corrigir Divergência de valor no gráfico de faturamento por evolução e a tabela - Período filtrado: 01/11/2023 a 30/11/2023.
1.2) Tornar  apresentáveis, as legendas de todos os gráficos de "Faturamento". Talvez usar legendas seja uma opção.
1.3)    O gráficos de faturamento devem restringir a informação ao tipo de produto selecionado no nível principal
        Exemplo, usuário seleciona o TIPO água e clica no no gráfico de faturamento, então será exibido análises filtradas pelo tipo água
        Exemplo, usuário seleciona o TIPO TODOS e clica no no gráfico de faturamento, então será exibido análises filtradas pelo tipo TODOS
        Exemplo, usuário seleciona o produto e clica no gráfico de faturamento por produto, então será exibido análises filtradas pelo produto

1.5)    Auditoria das origens do ICMS
        Criamos a auditoria dos valores de ICMS, porém o gestor precisa do resultado macro, por regra
        O nível atual, que apresenta o resultado de forma análitica por nota pode ser mantido como um nível inferior ao nível macro
        A demanda é, ao clicar sobre o item "ICMS", deve-se abrir um nível macro, que apresente as regras de ICMS do GM, o valor de ICMS efetivo (com beneficio), o valor de ICMS sem benefício e a diferença
        O gestor identificou uma divergência no cálculo do benefício atual, pois a UF origem deve ser considerada e aparentemente não está. 
        Um exemplo são as vendas originadas da unidade de GO, elas não tem benefício, porém o dash apresenta que tem.
        Auditoria das origens de todos os impostos
        Assim como o ICMS pode ser auditado, o GM também gostaria de possibilitar auditar os demais impostos

1.6)Criar um nível para ser acessado a partir do cliente no componente de LUCRO/PREJUIZO dos gráficos de rentabilidade (por tipo e por produto)
        Apresentar as despesas que foram pagas com o lucro
        Essas despesas são obtidas da mesma forma que o custo fixo, porém com a classificação de naturezas diferentes de (I-Indireto e F-Fixo); 
        Naturezas não classificadas também devem ser consideradas. Usar o nível do custo fixo como modelo.
```
     
### 1. Log's Execução
#### 1.1. 18/12/2023 07:00 as 08:20
```markdown
Corrigido Divergência de valor no gráfico de faturamento por evolução e a tabela - Período filtrado: 01/11/2023 a 30/11/2023.
```
#### 1.2. 18/12/2023 08:20 as 9:00
```markdown
Inclusão de legendas em graficos de pizza do faturamento.
```
#### 1.3. 18/12/2023 09:00 as 11:20
```markdown
Atualizamos os gráficos de faturamento para restringir as informações ao tipo de produto selecionado no nível principal. Agora, ao escolher um tipo específico, você verá análises filtradas exclusivamente por esse tipo. Se optar por "Todos" no campo de tipo, as análises exibidas serão filtradas para abranger todos os tipos disponíveis. Da mesma forma, ao selecionar um produto específico, as análises serão filtradas para fornecer informações específicas desse produto.

```
#### 1.3. 18/12/2023 12:20 as 17:10
```markdown
Atualizamos os gráficos de faturamento para restringir as informações Da mesma forma, ao selecionar um produto específico, as análises serão filtradas para fornecer informações específicas desse produto.

```
#### 1.5. 19/12/2023 07:00 as 11:30
```markdown
GM - Custo x Rentabilidade - Controle de qualidade - Redefinições das ações para acesso ao nivel principal e secundario do custo variavel no dashboard  de rentabilidade.
```

#### 1.5. 19/12/2023 14:00 as 17:50
```markdown

GM - Custo x Rentabilidade - Controle de qualidade - Aprimorei o cálculo do benefício fiscal no SELECT exclusivamente para notas originárias de 'MG'. Além disso, realizei uma expansão no detalhamento do custo variável, incorporando um componente de tabela na parte inferior, cuja atualização é acionada por meio de um clique no componente de tabela superior.
```

#### 1.5. 20/12/2023 07:00 as 12:00
```markdown

GM - Custo x Rentabilidade - Controle de qualidade - Desenvolvimento de um componente de tabela de nível secundário, destinado a aprimorar a visualização e análise dos valores brutos e líquidos do ICMS, organizados de forma agrupada conforme o tipo de benefício associado. Este componente visa oferecer uma abordagem mais detalhada e eficiente para a apresentação das informações, proporcionando uma compreensão mais aprofundada dos dados relacionados ao ICMS.
```

#### 1.5. 20/12/2023 13:00 as 17:20
```markdown
GM - Custo x Rentabilidade - Controle de qualidade - Aprimoramento da eficiência por meio da otimização para acelerar as respostas das consultas SELECT. Esta iniciativa visa aperfeiçoar o desempenho e a agilidade na recuperação de dados, proporcionando uma resposta mais rápida e eficaz às consultas SELECT realizadas. A otimização implementada visa maximizar a eficiência operacional, garantindo uma experiência mais fluida e eficaz no processo de recuperação de informações.
```

#### 1.6. 21/12/2023 07:00 as 12:00
```markdown
GM - Custo x Rentabilidade - Desenvolveu-se um nível de resultado estruturado para apresentar de maneira mais eficaz as saídas, levando em consideração o filtro NVL(AD_TIPOCUSTO, 'N') NOT IN ('I', 'F', 'V', 'D'). A implementação deste filtro visa excluir categorias específicas, proporcionando uma análise mais precisa e focalizada.  Adicionalmente, para enriquecer a visualização e compreensão dos resultados, incorporou-se um gráfico de pizza ao lado do nível de resultado. Esse gráfico de pizza destaca de forma vívida e intuitiva o TOP 5 das saídas, proporcionando uma visão rápida e acessível das principais categorias identificadas.  Essa abordagem combina a eficiência analítica do filtro personalizado com a representação visual do gráfico de pizza, elevando a apresentação a um patamar mais robusto e informativo.
```

#### 1.6. 21/12/2023 13:00 as 17:30
```markdown
GM - Custo x Rentabilidade - Além disso, aprimoramos o nível de resultado introduzindo outra funcionalidade, ao realizar um duplo clique no componente da tabela, é possível acessar um detalhamento abrangente das saídas. Por último, introduzimos um elemento adicional de praticidade ao incorporar um link direto no painel de resultados. Esse link conduz os usuários para um novo nível de análise dedicado a oferecer uma visão mais aprofundada das saídas, categorizadas por sua natureza específica. Ao clicar em cada natureza, uma apresentação detalhada é revelada, exibindo a evolução das saídas ao longo dos últimos 12 meses.
```


#### 1.6. 22/12/2023 07:00 as 12:00
```markdown
GM - Custo x Rentabilidade - (Andamento) Desenvolvemos uma instrução SELECT, projetada especificamente para extrair os resultados dos últimos 12 meses.
```

#### 1.7. 02/01/2024 08:30 as 12:30
```markdown
GM - Custo x Rentabilidade - 1.7) Realizou-se uma minuciosa revisão dos filtros relacionados à 'CODEMP' incorporados no comando SELECT de todos os componentes integrantes do 'DASH DE RENTABILIDADE'. 1.8) Em busca da máxima otimização, identificaram-se e corrigiram-se pontos de redundância no comando SELECT aplicado ao 'DASH DE RENTABILIDADE'.
```
