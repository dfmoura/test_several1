CREATE OR REPLACE PROCEDURE GMINEIROPRD."STP_APROVACAO_RESERVAS_GM" (
       P_CODUSU NUMBER,        -- Código do usuário logado
       P_IDSESSAO VARCHAR2,    -- Identificador da execução. Serve para buscar informações dos parâmetros/campos da execução.
       P_QTDLINHAS NUMBER,     -- Informa a quantidade de registros selecionados no momento da execução.
       P_MENSAGEM OUT VARCHAR2 -- Caso seja passada uma mensagem aqui, ela será exibida como uma informação ao usuário.
) AS
       FIELD_CODRES NUMBER;
       PARAM_P_STATUS   VARCHAR2(10);
       P_STATUSSOL NUMBER;
       P_STATUSRES  NUMBER;
       P_STATUSFAT  NUMBER;
       P_EMAIL_APROVADOR  VARCHAR2(500);
   	   V_PROXIMO_CODFILA  NUMBER;
   	   P_ASSUNTO  VARCHAR2(4000);
   	   P_CORPOEMAIL1  VARCHAR2(4000);
BEGIN
        PARAM_P_STATUS := ACT_TXT_PARAM(P_IDSESSAO, 'P_STATUS');

       -- Os valores informados pelo formulário de parâmetros, podem ser obtidos com as funções:
       --     ACT_INT_PARAM
       --     ACT_DEC_PARAM
       --     ACT_TXT_PARAM
       --     ACT_DTA_PARAM
       -- Estas funções recebem 2 argumentos:
       --     ID DA SESSÃO - Identificador da execução (Obtido através de P_IDSESSAO))
       --     NOME DO PARAMETRO - Determina qual parametro deve se deseja obter.


       FOR I IN 1..P_QTDLINHAS -- Este loop permite obter o valor de campos dos registros envolvidos na execução.
       LOOP                    -- A variável "I" representa o registro corrente.
           -- Para obter o valor dos campos utilize uma das seguintes funções:
           --     ACT_INT_FIELD (Retorna o valor de um campo tipo NUMÉRICO INTEIRO))
           --     ACT_DEC_FIELD (Retorna o valor de um campo tipo NUMÉRICO DECIMAL))
           --     ACT_TXT_FIELD (Retorna o valor de um campo tipo TEXTO),
           --     ACT_DTA_FIELD (Retorna o valor de um campo tipo DATA)
           -- Estas funções recebem 3 argumentos:
           --     ID DA SESSÃO - Identificador da execução (Obtido através do parâmetro P_IDSESSAO))
           --     NÚMERO DA LINHA - Relativo a qual linha selecionada.
           --     NOME DO CAMPO - Determina qual campo deve ser obtido.
           FIELD_CODRES := ACT_INT_FIELD(P_IDSESSAO, I, 'CODRES');
           SELECT STATUSSOL, STATUSRES, STATUSFAT INTO P_STATUSSOL, P_STATUSRES, P_STATUSFAT FROM AD_RESERVAS WHERE CODRES=FIELD_CODRES;
           SELECT USU.EMAIL INTO P_EMAIL_APROVADOR FROM TSIUSU USU INNER JOIN AD_RESERVAS RES ON USU.CODUSU = RES.USUINC WHERE RES.CODRES = FIELD_CODRES;
           SELECT NVL(MAX(CODFILA), 0) +1 INTO V_PROXIMO_CODFILA FROM TMDFMG;

            IF P_STATUSSOL IN (1,3) AND PARAM_P_STATUS = 'S' AND P_STATUSRES=4 AND P_STATUSFAT =1 THEN
            
                UPDATE AD_RESERVAS SET STATUSSOL = 2, CODUSUAPROV = STP_GET_CODUSULOGADO, DT_HR_APROV_SOLIC = SYSDATE WHERE CODRES = FIELD_CODRES;
                P_MENSAGEM := 'Solicitações aprovadas com sucesso!';  
                P_ASSUNTO := 'Mensagem Aprovação Teste';
                P_CORPOEMAIL1 := 'Mensagem Aprovação Teste';
                
                --Insert para email com mensagem de aprovação
                INSERT INTO TMDFMG (CODFILA, ASSUNTO, CODMSG, DTENTRADA, STATUS, CODCON, TENTENVIO, MENSAGEM, TIPOENVIO, MAXTENTENVIO, EMAIL, CODSMTP)
                VALUES (V_PROXIMO_CODFILA, P_ASSUNTO, NULL, SYSDATE,  'Pendente', 0, 0, P_CORPOEMAIL1, 'E', 3, P_EMAIL_APROVADOR, NULL );


            ELSIF P_STATUSSOL= 2 AND PARAM_P_STATUS = 'S' THEN
            
                P_MENSAGEM := 'A solicitação selecionada já foi aprovada.';  
                
            ELSIF P_STATUSRES <> 4 OR P_STATUSFAT <> 1 THEN
            
                P_MENSAGEM := 'A solicitação selecionada já foi PRÉ-RESERVADA, RESERVADA ou FATURADA, portanto sua aprovação não pode ser alterada.';  
                
            ELSIF P_STATUSSOL IN (1,2) AND PARAM_P_STATUS = 'N' AND P_STATUSRES=4 AND P_STATUSFAT =1 THEN
            
                UPDATE AD_RESERVAS SET STATUSSOL = 3, CODUSUAPROV = STP_GET_CODUSULOGADO  WHERE CODRES = FIELD_CODRES; 
                P_MENSAGEM := 'Solicitações reprovadas!';
                P_ASSUNTO := 'Mensagem Reprovação Teste';
                P_CORPOEMAIL1 := 'Mensagem Reprovação Teste';
                
                --Insert para email com mensagem de reprovação
                INSERT INTO TMDFMG (CODFILA, ASSUNTO, CODMSG, DTENTRADA, STATUS, CODCON, TENTENVIO, MENSAGEM, TIPOENVIO, MAXTENTENVIO, EMAIL,CODSMTP)
                VALUES (V_PROXIMO_CODFILA, P_ASSUNTO, NULL, SYSDATE,  'Pendente', 0, 0, P_CORPOEMAIL1, 'E', 3, P_EMAIL_APROVADOR,NULL);  
            
            END IF;

       END LOOP;

-- <ESCREVA SEU CÓDIGO DE FINALIZAÇÃO AQUI> --

END;
/
