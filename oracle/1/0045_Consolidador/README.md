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

#### 1.1. 29/05/2024 08:00 as 12:00
```markdown

SATIS - Consolidador de Dados - Foi realizada a testagem completa das funcionalidades desenvolvidas, incluindo a tabela adicional 'AD_CONSOLDADOS' que espelha os campos da visualização 'VGF_VENDAS_SATIS'. O procedimento 'STP_INS_DADOS_CONSOLIDADOR' foi executado diversas vezes para garantir que a limpeza e inserção dos dados provenientes da visualização 'VGF_VENDAS_SATIS' ocorrem corretamente. Além disso, um teste específico foi conduzido duplicando os dashboards atuais e incluindo a tabela adicional 'AD_CONSOLDADOS', permitindo verificar se os valores e a quantidade de registros estão consistentes e em conformidade com os dados esperados. Todos os testes foram concluídos com sucesso, confirmando a precisão e a integridade dos dados na tabela adicional.
```


#### 1.1. 29/05/2024 13:30 as 18:30
```markdown

SATIS - Consolidador de Dados - Efetuamos um backup utilizando a mesma estrutura da visualização 'VGF_VENDAS_SATIS', criando uma nova visualização denominada 'VGF_VENDAS_SATIS1' como medida de segurança. Revisamos o procedimento na parte que utiliza 'VGF_VENDAS_DUPLI_SATIS' para realizar o insert na tabela adicional 'AD_CONSOLDADOS'. Inicialmente, este insert popula completamente a tabela adicional; em um segundo momento, ele realiza uma reconciliação do insert, atualizando somente os dados dos últimos 60 dias. Em seguida, alteramos a estrutura da visualização 'VGF_VENDAS_SATIS' para buscar as informações diretamente da tabela adicional 'AD_CONSOLDADOS'. Esta abordagem assegura a integridade dos dados e a consistência das operações, garantindo que a visualização 'VGF_VENDAS_SATIS' reflita corretamente os dados consolidados da nova tabela.

```


```
#VERIFICAÇÃO#

select 
'AD_CONSOLDADOS' AS A1,
COUNT(*) AS CONTAGEM
FROM AD_CONSOLDADOS

UNION ALL

select 
'VGF_VENDAS_DUPLI_SATIS' AS A1,
COUNT(*) AS CONTAGEM
FROM VGF_VENDAS_DUPLI_SATIS

UNION ALL

select 
'VGF_VENDAS_SATIS' AS A1,
COUNT(*) AS CONTAGEM
FROM VGF_VENDAS_SATIS


```