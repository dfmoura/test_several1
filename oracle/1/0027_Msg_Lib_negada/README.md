# Objetivos
```markdown

Negar pedido e notificar solicitante
- Ao negar, deve-se alterar o evento de liberação (criar evento especifico), pois assim ao tentar confirmar o pedido novamente o sistema irá identificar que o evento de liberação de limites ainda não foi gerado e então irá gera-lo novamente.
     - O evento é criado na tela "Regras de Negócio" -> Botão ". . ." -> Eventos 
- Enviar email para o usuário solicitante com a observação de negação.
   - A observação corresponde ao campo TSILIB.OBSLIB
   - Exemplo de envio por email personalizado na PROCEDURE "STP_FEEDBACKCLIENTE_SATIS"

```

### 1. Log's Execução


#### 1.1. 26/03/2024 08:00 as 11:30
```markdown
Satis - Comunicação de Liberação Negada - 1) Começamos criando o evento 1100 na tela 'Regras de Negócio', acessando a opção superior direita "Eventos". 2) Em seguida, associamos esse evento ao usuário. Para fazer isso, acessamos a tela de usuário na opção superior direita "Liberação para Limites" e cadastramos o evento 1100, preenchendo os campos necessários.3) A criação do evento é iniciada com a elaboração da estrutura básica na tela de dicionário de dados, na tabela TSILIB, sob a aba "Evento". Aqui, criamos a procedure 'STP_NEGACAO_LIBERACAO_SATIS' como parte do processo.4) Com a procedure criada, damos início ao desenvolvimento da rotina, implementando as funcionalidades necessárias para o evento 1100. Este passo inclui a codificação de lógica de negócio e integração com outros componentes do sistema, conforme especificado nos requisitos.
```

#### 1.1. 26/03/2024 13:00 as 18:30
```markdown
Satis - Comunicação de Liberação Negada - 4) Em seguida, avançamos no desenvolvimento da rotina, concentrando-nos na alimentação dos parâmetros com base nos campos-chave encontrados na tabela TSILIB.5) Para manter a sequência de execução da rotina, empregamos o parâmetro 'AFTER UPDATE'.6) Com os parâmetros devidamente alimentados, elaboramos uma instrução SELECT para recuperar e preencher os valores dos parâmetros adicionais: P_REPROVADO, P_OBSLIB e P_CODUSUSOLICIT, todos extraídos da tabela TSILIB.7) Na próxima etapa, estabelecemos a primeira verificação, utilizando como critério o campo REPROVADO com o valor 'S'. Essa verificação é fundamental para determinar a continuidade do fluxo da rotina, definindo possíveis ações com base nesse resultado.
```

#### 1.1. 27/03/2024 8:00 as 11:30
```markdown
Satis - Comunicação de Liberação Negada - 8) Em seguida, dentro desta condição 'IF', realizamos uma nova consulta utilizando a instrução SELECT para preencher o parâmetro P_STATUSNOTA. Essa consulta é feita na tabela TGFCAB, com base no parâmetro P_NUCHAVE obtido anteriormente.9) Após essa consulta, realizamos outra verificação para determinar se o valor do parâmetro P_STATUSNOTA é igual a 'L'. Se essa condição for verdadeira, procedemos com a atualização desse status para 'A', utilizando a instrução UPDATE. Todo esse processo é realizado de forma sequencial dentro deste bloco de código.Além disso, para garantir a integridade da operação de atualização do status, desativamos e reativamos a trigger 'TRG_UPD_TGFCAB'. Essa ação é necessária para permitir a execução da atualização do status para 'A' na tabela, assegurando que a trigger não interfira nesse processo.
```

#### 1.1. 27/03/2024 13:00 as 18:30
```markdown
Satis - Comunicação de Liberação Negada - 8) Continuando, realizamos a inserção de um registro na tabela TMDFMG, a fim de adicionar a entrada na fila de envio de mensagens. Nesse processo, o solicitante da liberação é designado como o destinatário da mensagem, e a observação de negação é incluída com base nas informações fornecidas pelo usuário liberador durante a negação da liberação.9) Em seguida, procedemos com a atualização do evento na tabela TSILIB, referente ao evento 1100 criado anteriormente. Essa atualização é crucial para garantir que as modificações feitas na rotina sejam refletidas adequadamente e que o evento esteja configurado corretamente para seu funcionamento subsequente.10) Prosseguimos com os procedimentos necessários para realizar testes e verificações detalhadas da rotina desenvolvida. Essa etapa envolve a execução de casos de teste para validar o comportamento esperado da rotina em diferentes cenários, bem como a verificação minuciosa de logs e resultados para identificar e corrigir possíveis problemas ou anomalias.

```

#### 1.1. 28/03/2024 08:00 as 11:30
```markdown
Satis - Comunicação de Liberação Negada - 11) Após a conclusão dos testes e verificações, implementamos a rotina no ambiente de produção, seguindo os protocolos e procedimentos estabelecidos pela equipe de operações. Isso inclui a coordenação de atividades com as partes interessadas e a documentação adequada de todas as mudanças realizadas. 
12) Após a implementação, monitoramos o desempenho da rotina em produção, utilizando ferramentas de monitoramento e acompanhando os registros de atividades para garantir que tudo esteja funcionando conforme o esperado. Eventuais ajustes ou otimizações são realizados conforme necessário para garantir a estabilidade e eficiência da rotina em operação contínua.

```