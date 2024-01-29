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


