# Objetivos
```markdown
Estabelecer a programação automatizada para a geração de relatórios regulatórios, otimizando a gestão e fornecendo informações essenciais de forma eficiente. Os relatórios serão enviados diariamente, pontualmente às 07:30 da manhã, assegurando que as informações críticas estejam disponíveis para análise no início do dia útil.

Além disso, será implementada uma funcionalidade avançada na tabela 'TSIUSU', introduzindo uma sinalização que permite aos usuários indicar sua preferência de receber ou não os relatórios regulatórios. Essa personalização proporciona maior controle e flexibilidade, adaptando-se às necessidades individuais de cada usuário. Dessa forma, a experiência do usuário é aprimorada, garantindo que apenas informações relevantes e desejadas sejam recebidas, promovendo uma abordagem mais eficaz e centrada no usuário no contexto do gerenciamento de relatórios regulatórios.

```
     
### 1. Log's Execução
#### 4.1. 14/12/2023 17:00 as 18:20
```markdown
JB - Regulatorios - Relatório Regulatorio Agendado  - Foi implementado um campo 'flag', destinado a identificar os usuários aptos a receberem o relatório, o qual está vinculado à tabela 'TSIUSU', por meio do campo 'AD_RECEB_REGULAT'. Além disso, efetuou-se a duplicação do relatório regulatório já existente. Como parte deste processo, procedeu-se com a exclusão dos parâmetros destinados ao filtro do grupo de relatórios que compõem o relatório de regulatório. Além disso, foi estabelecida uma ação agendada, integrando-a ao sistema, a qual realiza uma seleção específica de usuários que possuem a flag ativada para receberem o relatório. 
```



