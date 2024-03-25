# Objetivos
```markdown

Atualmente o cliente utiliza o relatório formatado abaixo, porém seu layout e filtros podem ser melhorados, além do que, o cliente relatou que os valores do mesmo não bateram com o fechamento da comissão.

Relatório com base no agrupamento abaixo:


-> VENDEDOR
    -> REFERENCIA
        DETALHE (NOTAS)
    - TOTAL REFERENCIA
TOTAL VENDEDOR


    Select que obtém os valores de comissão


SELECT * FROM TGFCOM
WHERE CODVEND = 1
AND NUFECHAMENTO <> 0

* O campo TGFCOM.NUFIN corresponde ao financeiro de despesa gerado no fechamento de comissão.

```

### 1. Log's Execução

#### 1.1. 20/03/2024 13:00 as 18:00
```markdown

GUI - RELATORIO - COMISSÕES PELA BAIXA - NOVO - 1) Replicamos o relatório existente para permitir modificações sem impactar o original. 2) Iniciamos a estrutura do novo relatório com um SELECT apropriado para extrair dados conforme o escopo necessário. A configuração anterior resultava em valores de comissão discrepantes com o processo de fechamento de comissão. 3) Implementamos no WHERE do SELECT a capacidade de filtrar até quatro vendedores, garantindo que, se nenhum parâmetro for especificado, o relatório resultante contenha informações completas. 4) Configuramos o arquivo responsável pela geração do relatório para integrar o novo SELECT. 5) Iniciamos a formatação e o agrupamento de layout no relatório, garantindo uma apresentação clara e organizada dos dados.


```

#### 1.1. 21/03/2024 8:00 as 11:30
```markdown

GUI - RELATORIO - COMISSÕES PELA BAIXA - NOVO - 5) Concluímos a etapa de formatação do relatório, que havia sido iniciada anteriormente, assegurando a consistência visual e estrutural dos dados apresentados. Além disso, implementamos um processo de validação dos dados do relatório para garantir a integridade e precisão das informações. Isso inclui a verificação de possíveis discrepâncias, como valores ausentes ou incoerentes, e a aplicação de regras específicas para validar a consistência dos dados extraídos. Essa validação contribui significativamente para a confiabilidade do relatório, fornecendo aos usuários uma base sólida para suas análises e tomadas de decisão.


```
