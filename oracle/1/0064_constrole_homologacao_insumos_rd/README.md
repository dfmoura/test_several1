# Desenvolvimento de Gatilhos e Funcionalidades

## 1. Gatilho para Validação de Data de Validade
Desenvolver um gatilho para validar a data de validade dos insumos em estoque. O gatilho deve:

- Verificar a proximidade da data de vencimento.
- Quando faltarem **X dias** para o vencimento, enviar uma mensagem aos responsáveis com o alerta: 
  > "Faltam X dias para vencer o insumo e ainda há X quantidade disponível".

## 2. Gatilho para Conversão de Gramas
Desenvolver um gatilho para realizar a conversão de gramas, com base nos valores informados nos campos de **Densidade** e **Quantidade**:

- O gatilho deve registrar automaticamente:
  - O código do usuário que fez a inclusão do insumo.
  - A data de entrada.
  - O código do último usuário que realizou alterações.
  - A data da modificação.

- O gatilho deve impedir alterações nos campos:
  - **Cód. Homologado**
  - **Insumo não Homologado**
  
  Quando a análise na tela de **Solicitação de Homologação** já estiver com status **Concluída** e **Aprovada**.

## 3. Botão de Ação para Solicitação de Homologação
Criar um botão de ação para enviar um e-mail ao setor de Qualidade, solicitando a homologação do insumo. O e-mail deverá conter todos os campos da tela de **Cadastro de Insumo**, exceto os relacionados à quantidade. Após o envio:

- O campo checkbox **Solicitado Homologação** não poderá mais ser alterado.
- Os destinatários do e-mail serão definidos com base em um campo a ser criado na tela de **Usuários**.

## 4. Trigger para Impedir Alterações
Criar uma trigger para impedir a alteração dos seguintes campos na aba de Controle após a inserção de seus valores:

- **Dta. Entrada**
- **Dta. Validade**
- **Quantidade**
- **Densidade**

## 5. Automatização dos Status da Solicitação de Homologação
Desenvolver gatilho de automatização dos Status da Solicitação de Homologação geral:

- Se o campo **Dta. de Recebimento** na aba Observações estiver vazio, o Status na aba Geral deve ser **Aguardando Envio**.
- Se o campo **Dta. de Recebimento** estiver preenchido e a **Dta Inicial** informada na aba Análise de Insumos, o Status na aba Geral deve ser **Aguardando Análise**.
- Se a aba Análise de Insumos estiver com o Status **Aprovada** ou **Reprovada**:
  - A aba deve ser atualizada para **Concluído**.
  - A **Dta Final** deve ser preenchida com a data atual (Sysdate).
  - O Status na aba Geral deve ser **Concluído**.

## 6. Gatilho para Envio de E-mail ao Setor de Compras
Desenvolver um gatilho que, ao ser finalizada a Análise de Insumos com o Status **Concluído** e **Aprovada**, envie um e-mail para o setor de Compras contendo os dados e o código do insumo (informações disponíveis na tela de Cadastro de Insumos).

## 7. Validação de Cadastro pelo Setor de Compras
Após o setor de Compras receber o e-mail do setor de Qualidade informando a aprovação do insumo, será validado o cadastro pelo Compras:

- Para criar o produto, será usada uma tela duplicada de Produtos, onde deverá ser informado que o produto é homologado e o código do insumo (recebido no e-mail do setor de Qualidade).
- Após o cadastro, automatizar o envio de e-mails para:
  - **Setor Fiscal**, para validação das informações fiscais do insumo homologado.
  - **Edson**, para validar as informações de estoque (especialmente o lote).
  - O responsável pela homologação do fornecedor (definido na tela de Usuários).

Além disso, o campo **Cód. Produto** na tela de Solicitação de Homologação e o campo **Cód. Homologado** na tela de Cadastro de Insumos devem ser atualizados com o novo código gerado pelo Compras.


<<<<<<< HEAD


2) 

toda vez que inserir ou ataulizar a tabela AD_CADMATERIA o campo CODUSU ira puxar o usuario atual STP_GET_CODUSULOGADO e
tambem na tabela relacionada AD_CONTINSUMO ira atulizar o campo DTAENTRADA com o sysdate e 
mulitiplicar QUANTIDADE x DENSIDADE que vai armazenar este resultado em um paramentro chamada GRAMAS e por sua vez este resultado
sera tambem atualizado ou inserido no campo GRAMAS
=======
30-09-2024 08:00 às 12:00
Foi desenvolvido um Gatilho para Conversão de Gramas que realiza automaticamente a conversão de peso em gramas com base nos valores inseridos nos campos de Densidade e Quantidade. Este gatilho tem como objetivo padronizar o processo de cálculo, garantindo maior precisão e agilidade nas operações de controle de insumos. Além da conversão, o sistema implementado armazena automaticamente os seguintes dados operacionais: o código do usuário responsável pela inclusão do insumo no sistema, a data de entrada, o código do último usuário que efetuou alguma modificação no registro, e a data exata da última alteração.


30-09-2024 13:00 às 18:00
Durante o desenvolvimento do gatilho, foram realizadas diversas validações para assegurar que as informações coletadas e os cálculos de conversão de gramas fossem consistentes e integrados adequadamente ao sistema. O mecanismo permite o rastreamento completo das operações, registrando automaticamente a autoria e o histórico de alterações em cada inclusão ou modificação de dados, contribuindo para maior segurança e transparência no fluxo de trabalho. Além disso, o gatilho foi projetado para otimizar o desempenho e reduzir o tempo de processamento nas tarefas relacionadas à conversão de insumos.


10:01
CRIAMOS A TRIGGER PARA 
DEPOIS DE INSERIDO A INFORMACAO NO CAMPO CODINSUMO E INSNHOMOLOG
DA TABELA AD_CADMATERIA OS CAMPOS NAO PODEM SER ALTERADOS.
ENVIAMOS O EMAIL DE SOLICITACAO
PROTEJEMOS OS CAMPOS DE CONTROLE JA PREENCHIDO PARA NAO PODER SEREM ALTERADOS    ddfad

>>>>>>> b622cb9f0ef31dd24b94323d2c6e95128f8599d6
