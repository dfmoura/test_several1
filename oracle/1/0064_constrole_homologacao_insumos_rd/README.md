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
