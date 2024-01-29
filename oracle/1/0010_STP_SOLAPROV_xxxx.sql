CREATE OR REPLACE PROCEDURE "STP_SOLAPROV_REFORzxxxx" (
       P_CODUSU NUMBER,        -- Código do usuário logado
       P_IDSESSAO VARCHAR2,    -- Identificador da execução. Serve para buscar informações dos parâmetros/campos da execução.
       P_QTDLINHAS NUMBER,     -- Informa a quantidade de registros selecionados no momento da execução.
       P_MENSAGEM OUT VARCHAR2 -- Caso seja passada uma mensagem aqui, ela será exibida como uma informação ao usuário.
) AS
       PARAM_CODUSUAPROV VARCHAR2(4000);
       FIELD_ID         NUMBER;
       P_SEQ            NUMBER;
       P_CORPOEMAIL1                VARCHAR2(4000);
       P_ITENS                           CLOB;
       P_EMAIL_APROVADOR        VARCHAR2(500);
       V_PROXIMO_CODFILA        NUMBER;
       P_ASSUNTO                       VARCHAR2(4000);
       P_CODSMTP                      NUMBER;
       P_DESCRPROD                  VARCHAR2(4000);
       P_PROJETO                       VARCHAR2(4000);
       P_COUNT                          NUMBER;
       
BEGIN

       -- Os valores informados pelo formulário de parâmetros, podem ser obtidos com as funções:
       --     ACT_INT_PARAM
       --     ACT_DEC_PARAM
       --     ACT_TXT_PARAM
       --     ACT_DTA_PARAM
       -- Estas funções recebem 2 argumentos:
       --     ID DA SESSÃO - Identificador da execução (Obtido através de P_IDSESSAO))
       --     NOME DO PARAMETRO - Determina qual parametro deve se deseja obter.

       PARAM_CODUSUAPROV := ACT_TXT_PARAM(P_IDSESSAO, 'CODUSUAPROV');

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
           FIELD_ID := ACT_INT_FIELD(P_IDSESSAO, I, 'ID');
           
           SELECT NVL(MAX(SEQORCAMENTO),0) +1 INTO P_SEQ FROM AD_REFMAQITEM WHERE ID = FIELD_ID;
           SELECT EMAIL INTO P_EMAIL_APROVADOR FROM TSIUSU WHERE CODUSU = PARAM_CODUSUAPROV;
           SELECT NVL(MAX(CODFILA), 0) +1 INTO V_PROXIMO_CODFILA FROM TMDFMG;
           SELECT 'Solicitação de Aprovação - Reforma de Máquinas (Nro. ' || FIELD_ID || ')' AS ASSUNTO, PRO.DESCRPROD, PRJ.IDENTIFICACAO INTO P_ASSUNTO, P_DESCRPROD, P_PROJETO FROM AD_REFMAQ MAQ, TGFPRO PRO, TCSPRJ PRJ  WHERE ID = FIELD_ID AND MAQ.CODPROD = PRO.CODPROD AND MAQ.CODPROJ = PRJ.CODPROJ ;
           P_CORPOEMAIL1 := 'Olá! Segue a relação de componentes para aprovação da reforma da máquina: ' || CHR(10) || CHR(10) || '<b>Máquina: </b>' || P_DESCRPROD || CHR(10) || '<b>Projeto: </b>' || P_PROJETO || CHR(10) || CHR(10) ||'<b>Componentes do Orçamento: </b>' || CHR(10);
           SELECT CODSMTP INTO P_CODSMTP FROM TSISMTP WHERE AD_CODUSU = STP_GET_CODUSULOGADO;
           
           
           
           IF P_EMAIL_APROVADOR IS NULL OR P_EMAIL_APROVADOR = ' ' THEN
           
               P_MENSAGEM := 'O usuário informado não possui email. Corrija e tente novamente.' || CHR(10) ;
               RETURN;
           
           END IF;
           
           SELECT COUNT(*) INTO P_COUNT FROM AD_REFMAQITEM WHERE ID = FIELD_ID AND SEQORCAMENTO IS NULL;
           
           IF P_COUNT > 0 THEN


            --Obtem a relação de itens que ainda sem solicitação de aprovação
            SELECT RTRIM(xmlagg(xmlelement(e, 'Orçado: ' || ITEM.QTDNEG ||  ' '|| ITEM.CODVOL || ' Custo UN: '||ITEM.VLRUN ||  ' - Custo TOT: '||ROUND(ITEM.VLRTOTORC,2) || ' -  Produto: '||ITEM.CODPROD ||'-'|| PRO.DESCRPROD ,CHR(10)|| CHR(10) ).EXTRACT('//text()') ORDER BY DESCRPROD).getclobval(),' ') x
            INTO P_ITENS
            FROM AD_REFMAQITEM ITEM, TGFPRO PRO 
            WHERE ITEM.CODPROD = PRO.CODPROD 
            AND ID = FIELD_ID
            AND ITEM.SEQORCAMENTO IS NULL;
            
            --Envia a solicitação de aprovação para o email do usuário aprovador
            INSERT INTO TMDFMG (CODFILA, ASSUNTO, CODMSG, DTENTRADA, STATUS, CODCON, TENTENVIO, MENSAGEM, TIPOENVIO, MAXTENTENVIO, EMAIL, CODSMTP)
            VALUES (V_PROXIMO_CODFILA, P_ASSUNTO, NULL, SYSDATE,  'Pendente', 0, 0, P_CORPOEMAIL1 || P_ITENS, 'E', 3, P_EMAIL_APROVADOR, NVL(P_CODSMTP,NULL)  );
            
            --Atualiza os itens orçados com a sequencia de orçamento
            UPDATE AD_REFMAQITEM SET SEQORCAMENTO = NVL(P_SEQ,0)  WHERE ID = FIELD_ID AND SEQORCAMENTO IS NULL;
            
            P_MENSAGEM := 'Solicitação de nro. "' ||  NVL(P_SEQ,0)  || '" enviada com sucesso!';
            
            --Atualiza o Status da Reforma para "Em Aprovação"
            UPDATE AD_REFMAQ SET STATUS = 'EA' WHERE ID = FIELD_ID;
            
            ELSE 

               P_MENSAGEM := 'Não existem produtos PENDENTES de solicitação de aprovação.' || CHR(10) ;
               RETURN;
            
            END IF;
             

       END LOOP;




-- <ESCREVA SEU CÓDIGO DE FINALIZAÇÃO AQUI> --



END;
/
