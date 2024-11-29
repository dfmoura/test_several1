CREATE OR REPLACE PROCEDURE GMINEIROPRD."STP_CONCLUIR_RESERVAS_XXXX" (
       P_CODUSU NUMBER,        -- Código do usuário logado
       P_IDSESSAO VARCHAR2,    -- Identificador da execução. Serve para buscar informações dos parâmetros/campos da execução.
       P_QTDLINHAS NUMBER,     -- Informa a quantidade de registros selecionados no momento da execução.
       P_MENSAGEM OUT VARCHAR2 -- Caso seja passada uma mensagem aqui, ela será exibida como uma informação ao usuário.
) AS
       PARAM_P_STATUS NUMBER;
       FIELD_CODRES NUMBER;
       P_CODHOTEL   NUMBER;
       P_VALOR  NUMBER;
       P_STATUSSOL  NUMBER;
       P_STATUSFAT  NUMBER;
       P_EMAIL_APROVADOR  VARCHAR2(500);       
       V_PROXIMO_CODFILA  NUMBER;
   	   P_ASSUNTO  VARCHAR2(4000);
   	   P_CORPOEMAIL1  VARCHAR2(4000);
BEGIN

       PARAM_P_STATUS := ACT_TXT_PARAM(P_IDSESSAO, 'P_STATUS');

       FOR I IN 1..P_QTDLINHAS -- Este loop permite obter o valor de campos dos registros envolvidos na execução.
       LOOP                    -- A variável "I" representa o registro corrente.

           FIELD_CODRES := ACT_INT_FIELD(P_IDSESSAO, I, 'CODRES');
           SELECT CODPARCHOTEL, VALOR, STATUSSOL, STATUSFAT INTO P_CODHOTEL, P_VALOR, P_STATUSSOL, P_STATUSFAT FROM AD_RESERVAS WHERE CODRES = FIELD_CODRES;
           SELECT USU.EMAIL INTO P_EMAIL_APROVADOR FROM TSIUSU USU INNER JOIN AD_RESERVAS RES ON USU.CODUSU = RES.USUINC WHERE RES.CODRES = FIELD_CODRES;
           SELECT NVL(MAX(CODFILA), 0) +1 INTO V_PROXIMO_CODFILA FROM TMDFMG;


            IF P_STATUSSOL <> 2 THEN
            
                P_MENSAGEM := 'A solicitação deve estar APROVADA.';  
            
            ELSIF NVL(P_CODHOTEL,0) = 0 THEN
            
                P_MENSAGEM := 'O hotel deve ser indicado para atualizar a reserva.';  
            
            ELSIF NVL(P_VALOR,0) = 0 THEN

                P_MENSAGEM := 'O valor das diarias deve ser indicado para atualizar a reserva.';  
                
            ELSIF NVL(P_STATUSFAT,1) = 2 THEN

                P_MENSAGEM := 'A reserva selecionada já foi FATURADA, portanto não pode ser alterada.';  
                
            ELSIF NVL(P_VALOR,0) <> 0 AND  NVL(P_VALOR,0) <> 0 AND P_STATUSSOL = 2 AND P_STATUSFAT=1  AND PARAM_P_STATUS = 2 THEN
            
                UPDATE AD_RESERVAS SET STATUSRES = PARAM_P_STATUS, DT_HR_CONFIR_RESERVA = SYSDATE WHERE CODRES = FIELD_CODRES;
                P_MENSAGEM := 'Reserva alterada com sucesso para Reservado!';
                P_ASSUNTO := 'Mensagem RESERVADO Teste';
                P_CORPOEMAIL1 := 'Mensagem Reserva RESERVADO Teste';
                
                --Insert para email com mensagem de aprovação
                INSERT INTO TMDFMG (CODFILA, ASSUNTO, CODMSG, DTENTRADA, STATUS, CODCON, TENTENVIO, MENSAGEM, TIPOENVIO, MAXTENTENVIO, EMAIL, CODSMTP)
                VALUES (V_PROXIMO_CODFILA, P_ASSUNTO, NULL, SYSDATE,  'Pendente', 0, 0, P_CORPOEMAIL1, 'E', 3, P_EMAIL_APROVADOR, NULL);
            


            ELSIF NVL(P_VALOR,0) <> 0 AND  NVL(P_VALOR,0) <> 0 AND P_STATUSSOL = 2 AND P_STATUSFAT=1 AND PARAM_P_STATUS = 3 THEN
            
                UPDATE AD_RESERVAS SET STATUSRES = PARAM_P_STATUS, DT_HR_CONFIR_RESERVA = SYSDATE WHERE CODRES = FIELD_CODRES;              
                P_MENSAGEM := 'Reserva alterada com sucesso para Cancelado!';
                P_ASSUNTO := 'Mensagem Cancelado Teste' ;
                P_CORPOEMAIL1 := 'Mensagem Reserva Cancelado Teste';
                        
                --Insert para email com mensagem de aprovação
                INSERT INTO TMDFMG (CODFILA, ASSUNTO, CODMSG, DTENTRADA, STATUS, CODCON, TENTENVIO, MENSAGEM, TIPOENVIO, MAXTENTENVIO, EMAIL, CODSMTP)
                VALUES (V_PROXIMO_CODFILA, P_ASSUNTO, NULL, SYSDATE,  'Pendente', 0, 0, P_CORPOEMAIL1, 'E', 3, P_EMAIL_APROVADOR, NULL );


            END IF;

       END LOOP;


-- <ESCREVA SEU CÓDIGO DE FINALIZAÇÃO AQUI> --


END;
/