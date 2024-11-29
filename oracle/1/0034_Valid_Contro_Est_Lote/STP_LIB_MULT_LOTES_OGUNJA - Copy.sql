CREATE OR REPLACE PROCEDURE           "STP_LIB_MULT_LOTES_OGUNJA" (
       P_CODUSU NUMBER,        -- Código do usuário logado
       P_IDSESSAO VARCHAR2,    -- Identificador da execução. Serve para buscar informações dos parâmetros/campos da execução.
       P_QTDLINHAS NUMBER,     -- Informa a quantidade de registros selecionados no momento da execução.
       P_MENSAGEM OUT VARCHAR2 -- Caso seja passada uma mensagem aqui, ela será exibida como uma informação ao usuário.
) AS
       FIELD_NUNOTA    NUMBER;
       FIELD_SEQUENCIA NUMBER;
       FIELD_CODPROD   NUMBER;
       FIELD_CONTROLE  VARCHAR2(4000);
       P_TOP            NUMBER;
       P_TOP_VALIDA     VARCHAR2(100);
       P_CAB_PERMITE    VARCHAR2(100);
       P_VALIDA_LOTE    VARCHAR2(100);

BEGIN

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
           FIELD_NUNOTA := ACT_INT_FIELD(P_IDSESSAO, I, 'NUNOTA');

            SELECT CAB.CODTIPOPER, NVL(TOP.AD_VALMULTLOTE,'N'), NVL(CAB.AD_PERMITEMULTLOTE,'N')
            INTO P_TOP, P_TOP_VALIDA, P_CAB_PERMITE
            FROM TGFCAB CAB
            INNER JOIN TGFTOP TOP ON TOP.CODTIPOPER = CAB.CODTIPOPER AND CAB.DHTIPOPER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = CAB.CODTIPOPER)
            WHERE CAB.NUNOTA = FIELD_NUNOTA;


-- <ESCREVA SEU CÓDIGO AQUI (SERÁ EXECUTADO PARA CADA REGISTRO SELECIONADO)> --
            
           IF P_TOP_VALIDA = 'S' THEN
           
           
                SELECT NVL(AD_VALIDALOTE,'N') INTO P_VALIDA_LOTE FROM TGFCAB WHERE NUNOTA = FIELD_NUNOTA;        
                
                        UPDATE TGFCAB SET AD_PERMITEMULTLOTE = 'S' WHERE NUNOTA = FIELD_NUNOTA;
                        P_MENSAGEM := 'Pedido/Nota liberado para MULTIPLOS LOTES com sucesso!';
  
            ELSE
            
                RAISE_APPLICATION_ERROR(-20001, '<br><b>A TOP do pedido/nota selecionado não está configurada para validar multiplos lotes.</b><br>');

            END IF;

       END LOOP;




-- <ESCREVA SEU CÓDIGO DE FINALIZAÇÃO AQUI> --



END;
/