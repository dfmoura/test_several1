# Objetivos
```markdown

"Criar a view que consolida o resultado de vendas em um único lugar e ajustar os relatórios e dash de vendas para consumir os dados da view.

1 - Criar uma segunda view de vendas que seja espelho a view atual (duplicar).
2 - Criar uma tabela adicional que irá receber os dados de consolidação de vendas e deverá conter os mesmos campos que a atual view de vendas contém.
3 - Criar uma ação agendada que execute a view de vendas dos últimos X dias (exemplo 60 dias) e atualize a tabela de consolidação de vendas.
3.1 - A primeira execução da ação agendada deverá atualizar a tabela de consolidação com todo histórico de vendas (exemplo: ultimos 3 anos)
4 - Alterar a view de vendas atual para simplesmente retornar os dados da tabela de consolidação.
4.1 - Como a view de vendas atual que já está vinculada a vários indicadores passará a retornar os dados da tabela consolidada, esses mesmos indicadores já se estarão resolvidos, não requisitando alterações."

 


```

### 1. Log's Execução

#### 1.1. 28/05/2024 16:00 as 
```markdown


Efetuamos o select na VGF_VENDAS_SATIS1 para verificar os campos e respectivos tipo para criar uma tabela adicional com esta semelhança.
SELECT column_id,column_name,data_type
FROM all_tab_columns
WHERE table_name = 'VGF_VENDAS_SATIS1'
order by 1


```

