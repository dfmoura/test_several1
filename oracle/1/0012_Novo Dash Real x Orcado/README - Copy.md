# Objetivos
```markdown
Dias 15/01 a 19/01
Será criado com base no ''Dash Orçado x Realizado V2'' e o ''Rel. Orçado x Realizado''
Filtros
Considerar todos os filtros do relatório 'Rel. Orçado x Realizado''

Nível Principal

    Pode ser criado com base nos dados apresentados no link 'Indicadores Macro da Meta'  no ''Dash Orçado x Realizado V2''
        Não precisa copiar o layout do dash V2, pelo contrário, vamos melhorar em muito a sua apresentação
    Esse nível deve possibilitar acessas os detalhes da meta e realizado por vendedor, por cliente e por marca
        Pode ser atendido com 3 botões (não é uma premissa, você pode sugerir outras alternativas)
        
        
Nível Vendedor

    Deve detalhar o previsto e realizado por vendedor
        Deve permitir acessar o vendedor e visualizar o previsto e realizado por cliente do vendedor
            Deve permitir acessar o cliente e visualizar o previsto e realizado por marca do vendedor
    Todos os níveis acima devem ter uma pizza de TOP 10 (volume) e TOP 10(realizado)
    Criar um botão para selecionar o vendedor e visualizar em um mesmo nível, o consolidado do previsto e realizado por cliente e por marca
    Criar um botão para selecionar o vendedor e auditar as origens do realizado (notas fiscais). Isso já existe no dash  ''Dash Orçado x Realizado V2'', como o link 'Auditoria do Realizado'

Nível Cliente

    Previsto e Realizado por cliente
        Deve permitir acessar o cliente e visualizar o previsto e realizado por vendedor do cliente
            Deve permitir acessar o vendedor e visualizar o previsto e realizado por marca do cliente
        Todos os níveis acima devem ter uma pizza de TOP 10 (volume) e TOP 10(realizado)
        Criar um botão para selecionar o cliente e visualizar em um mesmo nível, o consolidado do previsto e realizado por vendedor e por marca
        Criar um botão para selecionar o cliente e auditar as origens do realizado (notas fiscais). Isso já existe no dash  ''Dash Orçado x Realizado V2'', como o link 'Auditoria do Realizado'

Nível Marca

    Previsto e Realizado por marca
        Deve permitir acessar a marca e visualizar o previsto e realizado por vendedor da marca
            Deve permitir acessar o vendedor e visualizar o previsto e realizado por cliente da marca
        Todos os níveis acima devem ter uma pizza de TOP 10 (volume) e TOP 10(realizado)
        Criar um botão para selecionar o cliente e visualizar em um mesmo nível, o consolidado do previsto e realizado por vendedor e por cliente
        Criar um botão para selecionar a marca e auditar as origens do realizado (notas fiscais). Isso já existe no dash  ''Dash Orçado x Realizado V2'', como o link 'Auditoria do Realizado'
        
```
     
### 1. Log's Execução
#### 1.1. 15/01/2024 07:00 as 12:00
```markdown
1.1) Estruturação de select's para dash principal e definição de lay-out.
```

#### 1.1. 15/01/2024 13:00 as 17:30
```markdown
1.1) Continuação na estruturação de select's para dash principal e definição de lay-out.
```

#### 1.1. 16/01/2024 07:00 as 12:00
```markdown
1.1) Continuação na estruturação de select's para dash principal e definição de lay-out.

```

#### 1.1. 16/01/2024 13:00 as 17:30
```markdown
Satis - Novo Dash Metas - 1.1) Continuação estruturação de select's para dash principal e definição de lay-out.

```


#### 1.1. 18/01/2024 07:30 as 12:30
```markdown
Satis - Novo Dash Metas - Estruturação de níveis e sub-niveis no dash.
```

#### 1.1. 18/01/2024 13:30 as 18:00
```markdown
Satis - Novo Dash Metas - Estruturação de níveis e sub-niveis no dash.
```



#### 1.1. 19/01/2024 15:30 as 18:30
```markdown
Satis - Novo Dash Metas - Reposicionamento de componentes em todos os niveis do dash, com adequações de paramentros para executar o eventos associados.
```


#### 1.1. 21/01/2024 18:00 as 19:00
```markdown
Satis - Novo Dash Metas - Atualzação de condições para sinalização de flag's por intervalo de valores relacionado a atingimento das metas.
```


#### 1.1. 22/01/2024 14:30 as 15:30
```markdown
Satis - Novo Dash Metas - Reuniao de alinhamento Dash.
```

#### 1.1. 22/01/2024 15:50 as 18:30
```markdown
Satis - Novo Dash Metas - Atualizações e correções na disposição de valores nos componentes gráficos do dashboard, com subtitiuições de % de Atigimento de Meta em quantidade e valor, para Qtd. Prev. / Qtd. Real e Vlr. Prev. / Vlr. Real nas barras do gráfico com uma dica de % de meta atingida ao passar o mouse. Adição da categoria outros no gráfico de pizza para agrupar o restante do top 3.
```


#### 1.1. 23/01/2024 07:00 as 11:30
```markdown
Satis - Novo Dash Metas - Finalização, atualizações e correções na disposição de valores nos componentes gráficos do dashboard, com subtitiuições de % de Atigimento de Meta em quantidade e valor, para Qtd. Prev. / Qtd. Real e Vlr. Prev. / Vlr. Real nas barras do gráfico com uma dica de % de meta atingida ao passar o mouse. Adição da categoria outros no gráfico de pizza para agrupar o restante do top 3.
```

#### 1.1. 23/01/2024 13:30 as 18:00
```markdown
Satis - Novo Dash Metas - Correção no valor previsto tanto em dash quanto relatório para ficar de acordo com o V2. Implementação de filtro Coordenador/Supervisor em dash e relatório.
```


#### 1.1. 28/03/2024 13:30 as 18:00
```markdown
Satis - Novo Dash Metas - 1) Realizar uma revisão meticulosa dos comandos SELECT a fim de alinhar os valores retornados com as especificações do portal de vendas, garantindo consistência e precisão nos dados apresentados.2) Implementar refinamentos detalhados nas formatações de fontes e cores no dashboard, visando aprimorar a apresentação visual e a usabilidade da interface, promovendo uma experiência mais agradável e intuitiva para os usuários.
```

#### 1.1. 02/04/2024 09:00 as 12:30
```markdown
Satis - Novo Dash Metas - 1) Desenvolvimento de parametrização para a implementação de uma lista múltipla por marca, a ser utilizada como filtro no painel de controle, requerendo a devida adaptação da cláusula 'WHERE' em todas as consultas realizadas pelos componentes do referido painel. Este processo visa otimizar a análise e visualização de dados, permitindo aos usuários selecionar múltiplas marcas de interesse, garantindo uma experiência mais flexível e abrangente no contexto do dashboard.
```

#### 1.1. 02/04/2024 13:30 as 18:00
```markdown
Satis - Novo Dash Metas - 2) Continuando com a atividade anterior, foi necessário um aprofundamento na implementação da parametrização para a criação da lista múltipla por marca. Isso envolveu uma configuração detalhada dos parâmetros relevantes, a integração com a estrutura existente do dashboard e a validação de sua funcionalidade em diferentes cenários de uso, com a efetiva conclusão da tarefa.
```

#### 1.1. 03/04/2024 09:00 as 11:00
```markdown
Satis - Novo Dash Metas - Grafico Real x Custo Vendedor - 1) Começamos a criar o gráfico que compara o valor real com o custo, utilizando a consulta do componente principal do nivel de custos. Em seguida, fizemos atualizações na consulta para agrupar as informações por período mensal, vendedor, valor real e custo. Essas modificações permitirão uma análise mais detalhada e segmentada do desempenho em relação aos custos e valor real ao longo do tempo.
```

#### 1.1. 03/04/2024 11:00 as 12:30
```markdown
Satis - Novo Dash Metas - 1)Detectamos uma falha na cláusula WHERE que filtrava valores, onde faltava incluir um novo campo. Realizamos a correção adicionando a condição VLRREAL <> 0. A nova condição inserida ficou da seguinte forma: (:P_NTEMMETA = 'S' AND (QTDPREV <> 0 OR QTDREAL <> 0 OR VLRREAL <> 0)) OR :P_NTEMMETA = 'N'. Após essa correção, os dados foram apresentados corretamente.
```


#### 1.1. 03/04/2024 13:30 as 15:00
```markdown
Satis - Novo Dash Metas - Grafico Real x Custo Vendedor - 2) Em continuidade ao desenvolvimento, procedemos com a conclusão do gráfico, integrando o componente gráfico no espaço designado da interface. Além disso, implementamos o select previamente elaborado no gráfico para possibilitar a seleção de diferentes conjuntos de dados. Concluímos essa etapa efetuando as configurações básicas necessárias para a visualização e análise adequada do gráfico, garantindo assim sua funcionalidade e utilidade para os usuários finais.
```