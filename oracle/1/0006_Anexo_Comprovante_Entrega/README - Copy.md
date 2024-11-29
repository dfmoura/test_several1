# Objetivos
```markdown

Desenvolver uma etapa para validação de documento anexado, especificamente relacionado ao comprovante de entrega de mercadorias. Aprimorar a funcionalidade da ação 'Marcar como Entregue' ao incorporar uma condição que garanta que a ação prossiga no fluxo apenas se o documento anexado estiver em conformidade. Certificar-se de que o processo de validação seja robusto, assegurando a integridade e autenticidade do comprovante, antes de prosseguir para a etapa de marcação como entregue. Efetuar as seguintes tarefas:
1) Criar campo da tsiuso que indique que usuario pode validar documento.
2) Criar campo na tgfcab que demonstra que documento foi validade ou não.
3) Colorir a linha que ainda não foi validado o anexo.
4) Desenvolver rotina para pedidos que não foram validade ja passados 7 dias retornar o campo PENDENTE para 'S'.


```
     
### 1. Log's Execução
#### 1.1. 15/12/2023 07:00 as 11:20
```markdown
JB - Dash Cotação - 1) Implementar um novo campo na entidade TSIUSU, denominado "ad_auditor_anexo", que permitirá ao usuário realizar a validação de documentos.  2) Introduzir um campo na tabela TGFCAB, intitulado "ad_validacao_comprov_engrega", com o propósito de indicar se o documento em questão foi validado ou não.  3) Aprimorar a interface do sistema, incorporando uma funcionalidade que colore dinamicamente as linhas que contêm anexos ainda não validados. Essa abordagem visual facilitará a identificação rápida e eficiente dos documentos que necessitam de validação.
```

#### 1.2. 15/12/2023 12:30 as 17:20
```markdown
JB - Dash Cotação - Criado a rotina 'STP_RETORN_PEND' para lidar com pedidos que não foram validados após um período de 7 dias. Em outras palavras, se o campo 'ad_auditor_anexo' da tabela TGFCAB referente a um registro específico não estiver marcado como 'S', a rotina altera o status do campo PENDENTE para 'S'. Essa ação visa garantir que os pedidos que permaneceram sem validação por mais de uma semana sejam devidamente identificados e tratados, contribuindo assim para a eficiência e integridade do sistema.
```
