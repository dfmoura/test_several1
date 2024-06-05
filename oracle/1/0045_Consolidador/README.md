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

#### 1.1. 28/05/2024 20:00 as 22:30
```markdown

SATIS - Consolidador de Dados - Foi desenvolvida uma tabela adicional denominada 'AD_CONSOLDADOS', que espelha os campos da visualização 'VGF_VENDAS_SATIS'. Também foi criada uma procedimento denominada 'STP_INS_DADOS_CONSOLIDADOR', responsável por limpar a tabela 'AD_CONSOLDADOS' e inserir os dados provenientes da visualização 'VGF_VENDAS_SATIS'. Uma rotina foi agendada para executar este procedimento a cada 23 horas (Tarefa 212 - Pendente de autorização de personalização). Adicionalmente, foi elaborada uma visualização para a tabela adicional 'AD_CONSOLDADOS'.


```
