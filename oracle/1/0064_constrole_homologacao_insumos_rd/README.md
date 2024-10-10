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


30-09-2024 08:00 às 12:00
Foi desenvolvido um Gatilho para Conversão de Gramas que realiza automaticamente a conversão de peso em gramas com base nos valores inseridos nos campos de Densidade e Quantidade. Este gatilho tem como objetivo padronizar o processo de cálculo, garantindo maior precisão e agilidade nas operações de controle de insumos. Além da conversão, o sistema implementado armazena automaticamente os seguintes dados operacionais: o código do usuário responsável pela inclusão do insumo no sistema, a data de entrada, o código do último usuário que efetuou alguma modificação no registro, e a data exata da última alteração.


30-09-2024 13:00 às 18:00
Durante o desenvolvimento do gatilho, foram realizadas diversas validações para assegurar que as informações coletadas e os cálculos de conversão de gramas fossem consistentes e integrados adequadamente ao sistema. O mecanismo permite o rastreamento completo das operações, registrando automaticamente a autoria e o histórico de alterações em cada inclusão ou modificação de dados, contribuindo para maior segurança e transparência no fluxo de trabalho. Além disso, o gatilho foi projetado para otimizar o desempenho e reduzir o tempo de processamento nas tarefas relacionadas à conversão de insumos.


01/10/2024 - 8h às 12h Iniciamos a implementação de uma trigger responsável por bloquear alterações nas tabelas AD_CONTINSUMO e AD_CADMATERIA após o preenchimento dos campos de cadastro e controle. Esta trigger, denominada TGF_NAO_UPDATE_AD_CONTINSUMO, garante que, uma vez completado o cadastro, os dados dessas tabelas não poderão ser modificados, promovendo maior integridade e segurança nas informações relacionadas a insumos e materiais cadastrados no sistema.

01/10/2024 - 13h às 18h Foi desenvolvida uma procedure específica, denominada STP_ORDER_PARA_SOLICIT_SATIS, com a função de enviar um e-mail solicitando a análise de um item. Após o envio deste e-mail, a opção de solicitação de homologação será automaticamente marcada. Além disso, ajustamos o layout do e-mail, incorporando todas as informações necessárias para que o destinatário possa realizar a análise de maneira clara e objetiva, garantindo um fluxo mais eficiente no processo de homologação.

02/10/2024 - 8h às 12h Implementamos uma nova trigger chamada TRG_BEFORE_INS_AD_INSHOMOLOG. Esta funcionalidade foi desenvolvida para replicar automaticamente o código homologado de insumos. Ao salvar um item no módulo "Insumo Homologação", caso o campo "Cód. Homologado" já tenha um valor no cadastro de insumos, este será replicado para o campo "Cód. Produto" da tela de homologação. Isso agiliza o processo e evita inconsistências nos cadastros de insumos homologados e seus respectivos produtos.

02/10/2024 - 13h às 18h Satis - Id 149 - Desenvolvemos e aplicamos uma nova trigger denominada TRG_CHECK_APROVADO. Esta trigger valida o preenchimento do campo "Aprovado" apenas se o status do insumo estiver como "Concluído". Além disso, todos os campos de homologação e observações devem estar completos. Caso o "Cód. Produto" de insumo homologado esteja vazio, será gerada uma solicitação de cadastro via e-mail para o departamento de compras. Quando todas as condições forem atendidas, a data final será automaticamente preenchida e o produto será homologado no controle de insumo.

03/10/2024 - 8h às 12h Satis - Id 149 - Adequamos a tabela TGFPRO, adicionando o campo [TIPO_CADASTRO], que é um campo de texto de preenchimento padrão, com o atributo de somente leitura. Além disso, criamos dois novos campos, AD_CODCADINSU e AD_CODCONT_EMAIL, que deverão ser preenchidos obrigatoriamente ao iniciar um novo cadastro. Esta melhoria visa padronizar o processo de cadastro de insumos, assegurando que todas as informações relevantes estejam disponíveis no momento da criação do registro.

03/10/2024 - 13h às 18h Satis - Id 149 - Foi desenvolvida uma variação da tela de cadastro de produtos, intitulada [Produtos - Insumos Homologados]. Nessa nova tela, o campo [TIPO_CADASTRO] foi configurado para ser exibido no painel principal, com o valor padrão 'Insumo Homologado'. Além disso, criamos um filtro que exibe apenas os registros cujo campo [TIPO_CADASTRO] tenha esse valor. Essas configurações visam facilitar a visualização e o gerenciamento dos insumos homologados, tornando o processo de homologação mais eficiente e organizado.

04/10/2024 - 8h às 12h Satis - Id 149 - Atualizamos o layout do e-mail enviado ao departamento de compras, buscando todas as informações do cadastro de insumo e controle necessárias para compor o corpo do e-mail de forma clara e detalhada. Essa melhoria garante que o departamento de compras receba todas as informações essenciais para a análise e cadastro de novos produtos, promovendo uma comunicação mais eficiente entre as áreas envolvidas no processo.

04/10/2024 - 13h às 18h Satis - Id 149 - Concluímos a verificação da rotina de cadastro de produto após o recebimento do e-mail pelo departamento de compras. O processo de cadastro segue com o preenchimento obrigatório dos campos: Descrição, Cód. Insumo, Cód. Controle, Grupo, Unidade Padrão, Usado Como, NCM, Cód. Sit. Trib. IPI Entrada e Cód. Sit. Trib. IPI Saída. Este controle assegura que todas as informações necessárias estejam devidamente preenchidas, promovendo a integridade e conformidade dos dados cadastrados no sistema.


Período: 07/10/2024 (8h às 12h e 13h às 18h)
No dia 7 de outubro de 2024, realizamos a continuidade da configuração da trigger associada ao processo de cadastro de produtos. Essa configuração é crucial, pois, ao finalizarmos o cadastro, a rotina automatizada envia notificações por e-mail para os validadores fiscal, lote e homologação do produto junto ao fornecedor. Além disso, estruturamos a rotina para garantir que o código do produto recém-cadastrado seja atualizado na aba 'Insumos Homologados' da tela de Solicitação de Homologação. Adicionalmente, o campo de data de finalização na aba 'Insumos Homologados' foi ajustado para refletir a data atual.


Parágrafo 1: 07/10/2024, das 8h às 12h
No dia 07 de outubro de 2024, das 8h às 12h, Satis - Id 149 - Iniciamos a configuração da trigger relacionada ao cadastro de produtos. Essa trigger foi implementada para garantir que, ao finalizar o cadastro de um produto, e-mails sejam enviados automaticamente aos validadores fiscais, de lote e de homologação do produto junto ao fornecedor. Organizamos meticulosamente toda essa rotina de envio de e-mails, além de incluir um mecanismo que atualiza o código do produto cadastrado na aba "Insumos Homologados" da tela de Solicitação de Homologação. Essa atualização também abrange o campo "Cód. Homologado" na tela de Cadastro de Insumos, onde a data atual será registrada na data de término da aba "Insumos Homologados".

Parágrafo 2: 07/10/2024, das 13h às 18h
No período da tarde, das 13h às 18h, Satis - Id 149 - Continuamos os ajustes necessários para otimizar a operação das triggers implementadas. A principal atividade foi a revisão da lógica de envio de e-mails, assegurando que todas as partes interessadas recebam as notificações pertinentes no momento certo. Adicionalmente, realizamos testes para validar a consistência dos dados durante o cadastro, assegurando que as informações enviadas estejam corretas e que os validadores possam agir com eficiência. A refinamento do processo de envio é crucial para manter a integridade do fluxo de trabalho e facilitar a homologação do produto.

Parágrafo 3: 08/10/2024, das 8h às 12h
No dia 08 de outubro de 2024, das 8h às 12h, Satis - Id 149 - Realizamos uma atualização significativa para unificar a tabela de "Insumos Homologados". Essa unificação exigiu a reprogramação dos eventos previamente criados, garantindo que todas as interações e dependências entre os dados fossem mantidas de forma coerente. Durante esse período, também implementamos uma nova funcionalidade que, ao cadastrar um produto, a opção de status "Aprovado" seja automaticamente marcada como "Aprovado (aguardando homologação do produto junto ao fornecedor)". Essa mudança visa otimizar o fluxo de aprovação, garantindo que as etapas de validação sejam mais claras e bem definidas.

Parágrafo 4: 08/10/2024, das 13h às 18h
No período da tarde, das 13h às 18h, Satis - Id 149 - Finalizamos a integração da nova lógica de homologação. Uma vez que o produto é homologado junto ao fornecedor, a tela "Forn. Homologado" é atualizada automaticamente para refletir o status "Aprovado". Além disso, a data atual é registrada no campo "data fim" da aba "Insumos Homologados" na tela de Solicitação de Homologação. Também implementamos uma atualização na aba "Controle" da tela "Cadastro de Insumos", onde o campo "Homologado" será ajustado para "S" (Sim). Essa implementação não apenas melhora a eficiência do processo, mas também proporciona um rastreamento mais preciso do status de homologação dos insumos.

10:01
CRIAMOS A TRIGGER PARA 
DEPOIS DE INSERIDO A INFORMACAO NO CAMPO CODINSUMO E INSNHOMOLOG
DA TABELA AD_CADMATERIA OS CAMPOS NAO PODEM SER ALTERADOS.
ENVIAMOS O EMAIL DE SOLICITACAO
PROTEJEMOS OS CAMPOS DE CONTROLE JA PREENCHIDO PARA NAO PODER SEREM ALTERADOS



ATUALIZAMOS O EMAIL DE ORDEM PARA CRIAR SOLICITACAO DE ANALISE DO insumo

	
quando campo STATUS = 3 E APROVADO = 1 da tabela AD_ANALISEINS
os campos NFOK CERTIFICADO QUANTIDADE DTARECEBIMENTO CODENT CODPRH
 da tabela AD_INSHOMOLOG DEVEM ESTAR PREENCHIDOS PARA SER APROVADO E HOMOLOGADO.
 
 
"Feito:
    - Desenvolver gatilho que realiza a conversão de Gramas, baseando o que foi informado no campo de Densidade e Quantidade;
    - Esse gatilho também deverá informar o código de usuário que deu entrada no insumo e sua data de inclusão automaticamente. (O campos do cadastro de insumo depois de inseridos nao podem ser alterados)

    - Criar botão de Ação que irá enviar e-mail para setor de Qualidade realizar a solicitação de Homologação daquele insumo (No corpo do e-mail, deverão ser informados todos os campos da tela Cadastro de Insumo, exceto dados relacionados a quantidade do insumo). Após enviado o e-mail, não pode ser possível alteração do campo checkbox de Solicitado Homologação novamente.

    - Os campos de Dta. Entrada, Dta. Validade, Quantidade e Densidade da aba de Controle, não poderão ser alterados quando for inserido seus valores; Tambem consideramos os campos:Lote,Codforn,Nomecom.



"


email para seguir 
1) ordem para solicitacao analise.
2) ao cadastrar a solicitacao conforme o email recebido se o campo o Cód. Homologado estiver preenchido ja preencher o campo código do produto do nível Insumos Homologação da tela Solicitação Homologação.

fazer uma trigger ANTES de inserir na tabela 'AD_INSHOMOLOG'
pegar a informacao do campo CODCADINSU e armazenar em um variavel P_CODCADINSU
pegar a informacao do campo CODSOLICIT e armazenar em um variavel P_CODSOLICIT

com esta variavel fazer um select na tabela AD_CADMATERIA com where CODCAD = P_CODCADINSU
trazer o campo CODINSUMO na variavel P_CODINSUMO

se o campo P_CODINSUMO nao estiver nulo
fazer um update na tabela AD_INSHOMOLOG com um set CODPRH = P_CODINSUMO 
WHERE CODCADINSU = P_CODCADINSU AND CODSOLICIT = P_CODSOLICIT

se estiver nulo nao fazer nada

CREATE OR REPLACE TRIGGER trg_before_insert_ad_inshomolog
BEFORE INSERT ON AD_INSHOMOLOG
FOR EACH ROW
DECLARE
    P_CODINSUMO AD_CADMATERIA.CODINSUMO%TYPE;
BEGIN
    -- Busca o valor do campo CODINSUMO na tabela AD_CADMATERIA com base no CODCADINSU
    SELECT CODINSUMO INTO P_CODINSUMO
    FROM AD_CADMATERIA
    WHERE CODCAD = :NEW.CODCADINSU;

    -- Se o campo CODINSUMO não for nulo, atribui o valor a CODPRH
    IF P_CODINSUMO IS NOT NULL THEN
        :NEW.CODPRH := P_CODINSUMO;
    END IF;

EXCEPTION
    -- Tratamento de exceção para o caso de não encontrar um registro correspondente
    WHEN NO_DATA_FOUND THEN
        NULL; -- Não faz nada se não encontrar dados
    WHEN OTHERS THEN
        RAISE; -- Re-levanta outras exceções, se houver
END;
/



3) na tela Analise de Insumos AD_ANALISEINS, o campo APROVADO so vai poder ser utilizado se o campo STATUS = 3

fazer uma trigger na tabela AD_ANALISEINS onde o campo APROVADO so podera ser utilizado com alguma das opcoes caso o
campo STATUS = 3

CREATE OR REPLACE TRIGGER TRG_CHECK_APROVADO
BEFORE INSERT OR UPDATE ON AD_ANALISEINS
FOR EACH ROW
BEGIN
    -- Verifica se o campo APROVADO está sendo preenchido e se o STATUS é diferente de 3
    IF :NEW.APROVADO IS NOT NULL AND :NEW.STATUS != 3 THEN
        RAISE_APPLICATION_ERROR(-20001, 'O campo APROVADO só pode ser utilizado se o STATUS for igual a Concluído.');
    END IF;
END;
/



4) 

acrescentar na trigger:
na tabela AD_ANALISEINS onde o campo APROVADO so podera ser utilizado com alguma das opcoes caso o
todos os campos da tabela AD_INSHOMOLOG estiverem preenchidos:


campos:

CODCONT_EMAIL
NFOK
CERTIFICADO
QUANTIDADE
CODCAD
CODSOLICIT
CODPRH
DTASOLICIT
DTAPREV
DTARECEBIMENTO
CODRECEB
CODENT
CODCADINSU

PARA VERIFICAR 
ARMAZER NAS VARIAVEIS DA TABELA AD_ANALISEINS
P_CODCAD = CODCAD
P_CODSOLICIT = CODSOLICIT

NO SELECT DO AD_INSHOMOLOG UTILIZAR NO WHERE CODCAD = P_CODCAD AND CODSOLICIT = P_CODSOLICIT
PARA FAZER A VERIFICACAO SE AD_INSHOMOLOG TODOS OS CAMPOS ESTAO PREENCHIDOS




--campos da tabela:
SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH
FROM USER_TAB_COLUMNS
WHERE TABLE_NAME = 'AD_INSHOMOLOG'


5) 
adicionado na trigger anterior
ao selecionar na tabela AD_ANALISEINS alguma informacao do campo APROVADO
fazer update na propria tabela AD_ANALISEINS no campo set DTAFIM = SYSDATE com 
where CODCAD = P_CODCAD and CODSOLICIT = P_CODSOLICIT and CODANALISE = P_CODANALISE



6) 
na tabela AD_ANALISEINS ao colocar 1 NO CAMPO APROVADO, alem das verificacoes feitas for detectado 
que o campo CODPRH da tabela AD_INSHOMOLOG (where CODCAD = P_CODCAD and CODSOLICIT = P_CODSOLICIT)
se encontra vazio.
fazer uma P_MENSAGEM := 'Email para o compras.'
e
fazer update na propria tabela AD_ANALISEINS no campo set APROVADO = 3 com 
where CODCAD = P_CODCAD and CODSOLICIT = P_CODSOLICIT and CODANALISE = P_CODANALISE


preencher o clockfy




acessei a tgfpro e criei um campo [TIPO_CADASTRO] um campo de texto padrao, com o atributo de somente leitura.
tambem aproveitei e criei os campo AD_CODCADINSU e AD_CODCONT_EMAIL, para ser preenchido ao iniciar o cadastro,
seu preenchimento sera obrigatorio.
criei uma variacao da tela de cadastro de produto chamada [Produtos - Insumos Homologados]
nesta tela [Produtos - Insumos Homologados], na configuracao da tela, deixei o campo no painel principal
e nas configuracoes do campo coloquei no valor padrão 'Insumo Homologado' e salvei.
na sequencia criei um filtro padrao na tela na qual aparecera somente os registro cujo campo [TIPO_CADASTRO]
esteja 'Insumo Homologado'.


agora irei atualizar o layout do email para o compras.
busquei todas as informacoes de cadastro de insumo e controa para montar o email.

agora segui com a rotina apos o recebimento do email para cadastro de produto
com o cadastro feito a priori com o preenchimento dos campos 
Descrição, Cód. Insumo, Cód. Controle, Grupo, Unidade Padrão, Usado Como, NCM, 
Cód. Sit. Trib. IPI Entrada, Cód. Sit. Trib. IPI Saída

ao salvar 
1) os dados deste código de produto será informado em:
- campo CODPRH da tabela AD_INSHOMOLOG
- campo CODINSUMO da tabela AD_CADMATERIA

ao inserir ou atualizar na tabela TGFPRO quando o campo AD_TIPOCADASTRO = 'Insumo Homologado'
os campo abaixo devem estar preenchidos com o conteudo recebido por email:
AD_CODCADINSU
AD_CODCONT_EMAIL
AD_CODANALISE

2) o insumo tem que ficar homologado na tabela AD_CONTINSUMO campo HOMOLOG = 'S'
3) a anlise aprovada na tabela AD_ANALISEINS campo  APROVADO = 1
4) email para analise Fiscal
5) email para analise lote
6) email para homologador fornecedor



------------
FAZER UM LISTAGG PARA OS EMAIS DE CADA ENVIO DE ACORDO COM AS FLAGS DE CADASTRO DE USUARIO
PARAR ARMAZENAR NA VARIAVEL DO EMAIL

SELECT LISTAGG(EMAIL, ', ') WITHIN GROUP (ORDER BY EMAIL) AS EMAIL
FROM TSIUSU
WHERE AD_SOLICITHOMOLOG = 'S'

AD_SOLICITHOMOLOG
AD_CADASTRADOR_INSUM_HOMOL
AD_VALIDADOR_LOTE_INSUMO
AD_VALIDADOR_FISCAL_INSUMO
AD_HOMOLOG_FORNECEDOR




-----
colocar os campos da tabela AD_ANALISEINS na tabela AD_INSHOMOLOG
DTAINICIAL - Data - Dta.Inicial
DTAFIM - Data - Dta.Final
APROVADO - Texto - Aprovada --- Aprovada,Reprovada,Aprovado (Aguardando Cadastro)
MOTIVO - Texto - Motivo
STATUS - Texto - Status Análise --- Aguardando Envio,Aguardando Análise,Concluído
pois nao sera utilizado mais a tabela AD_ANALISEINS
------

Organizar os campos na tela solicitacao de homologacao
continuando a separacao em 2 guias, observao e analise Insumos

------
CRIAR A TRIGGER ABAIXO

------
para produtos que ja estao cadastrados 
quando for selecionar Aprovada na guia analise de insumo
verificar se possui ou nao homologacao produto fornecedor
nao possuir mudar aprovado (aguardando homologacao produto fornecedor)
e enviar o email
------

TRG_UPDATE_DTAFIM
AD_INSHOMOLOG


TRG_UPDATE_HOMOLOG
AD_PRODHOMOL


TRG_UPDATE_CADASTRO_HOMOL
TGFPRO