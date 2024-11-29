CREATE OR REPLACE PROCEDURE "STP_INC_PROGENTREGA_GUI" (
       P_CODUSU NUMBER,        -- Código do usuário logado
       P_IDSESSAO VARCHAR2,    -- Identificador da execução. Serve para buscar informações dos parâmetros/campos da execução.
       P_QTDLINHAS NUMBER,     -- Informa a quantidade de registros selecionados no momento da execução.
       P_MENSAGEM OUT VARCHAR2 -- Caso seja passada uma mensagem aqui, ela será exibida como uma informação ao usuário.
) AS
       PARAM_QTDPROG FLOAT;
       FIELD_ORDEMCARGA NUMBER;
       FIELD_NUNOTA NUMBER;
       FIELD_SEQUENCIA NUMBER;
       P_CODVOL VARCHAR2(20);
       P_COUNT  NUMBER;
BEGIN

       -- Os valores informados pelo formulário de parâmetros, podem ser obtidos com as funções:
       --     ACT_INT_PARAM
       --     ACT_DEC_PARAM
       --     ACT_TXT_PARAM
       --     ACT_DTA_PARAM
       -- Estas funções recebem 2 argumentos:
       --     ID DA SESSÃO - Identificador da execução (Obtido através de P_IDSESSAO))
       --     NOME DO PARAMETRO - Determina qual parametro deve se deseja obter.

       PARAM_QTDPROG := ACT_DEC_PARAM(P_IDSESSAO, 'QTDPROG');

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
           FIELD_ORDEMCARGA := ACT_INT_FIELD(P_IDSESSAO, I, 'ORDEMCARGA');
           FIELD_NUNOTA := ACT_INT_FIELD(P_IDSESSAO, I, 'NUNOTA');
           FIELD_SEQUENCIA := ACT_INT_FIELD(P_IDSESSAO, I, 'SEQUENCIA');
         
           SELECT PRO.CODVOL INTO P_CODVOL FROM TGFPRO PRO, TGFITE ITE WHERE ITE.CODPROD = PRO.CODPROD AND ITE.NUNOTA = FIELD_NUNOTA AND ITE.SEQUENCIA = FIELD_SEQUENCIA;
           SELECT COUNT(*) INTO P_COUNT FROM AD_PROGENTREGA WHERE NUNOTA = FIELD_NUNOTA AND SEQUENCIA = FIELD_SEQUENCIA AND ORDEMCARGA = FIELD_ORDEMCARGA; --IDENTIFICA SE JÁ EXISTE REGISTRO NA AD_PROGENTREGA 
            
           /*
           Criar validações:
           - Validar se a quantidade digitada pelo usuário é <> NULL e se é maior ou igual a 0, caso contrário não executa insert nem update, apenas retorna mensagem orientando a informar quantidade maior ou igual a 0
           - Valida se o item selecionado tem SALDO A PROGRAMAR, caso não tenha, retorna mensagem orientativa
           - Valida se alguma ordem de carga foi selecionada, caso o campo ORDEMCARGA seja null ou 0, retorna mensagem orientativa para que o usuário selecione uma ordem de carga
           
           
           */
            
           IF P_COUNT = 0 THEN -- VALIDA SE JÁ EXISTE REGISTRO NA AD_PROGENTREGA PARA A COMBINAÇÃO DE ORDEMCARGA, NUNOTA E SEQUENCIA
           
               --INCLUIR QTD PROGRAMADA
                INSERT INTO AD_PROGENTREGA (ORDEMCARGA,NUNOTA,SEQUENCIA,QTDPROG,CODVOL,STATUS)
                VALUES(FIELD_ORDEMCARGA,FIELD_NUNOTA,FIELD_SEQUENCIA,PARAM_QTDPROG,P_CODVOL,'P');
                
                P_MENSAGEM := 'Atualizado com Sucesso!';
            
           ELSE
           
                UPDATE AD_PROGENTREGA SET QTDPROG = PARAM_QTDPROG WHERE NUNOTA = FIELD_NUNOTA AND SEQUENCIA = FIELD_SEQUENCIA AND ORDEMCARGA = FIELD_ORDEMCARGA;
           
                P_MENSAGEM := 'Atualizado com Sucesso!';
           
           END IF;
            



       END LOOP;




-- <ESCREVA SEU CÓDIGO DE FINALIZAÇÃO AQUI> --



END;
/