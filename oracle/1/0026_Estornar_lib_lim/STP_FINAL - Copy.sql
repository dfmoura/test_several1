CREATE OR REPLACE PROCEDURE          "STP_ESTORNOLIB_SATIS" (
       P_CODUSU NUMBER,        -- Código do usuário logado
       P_IDSESSAO VARCHAR2,    -- Identificador da execução. Serve para buscar informações dos parâmetros/campos da execução.
       P_QTDLINHAS NUMBER,     -- Informa a quantidade de registros selecionados no momento da execução.
       P_MENSAGEM OUT VARCHAR2 -- Caso seja passada uma mensagem aqui, ela será exibida como uma informação ao usuário.
) AS
       FIELD_NUNOTA NUMBER;
       FIELD_TABELA  VARCHAR(300);
       FIELD_EVENTO NUMBER;
       FIELD_SEQUENCIA NUMBER;
       FIELD_SEQCASCATA NUMBER;
       FIELD_NUCLL NUMBER;
       
       V_USULIB NUMBER;
       P_COUNT  NUMBER;
       P_ESTORNO VARCHAR2(10);
       
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
           FIELD_NUNOTA := ACT_INT_FIELD(P_IDSESSAO, I, 'NUCHAVE');
           FIELD_TABELA := ACT_TXT_FIELD(P_IDSESSAO, I, 'TABELA');
           FIELD_EVENTO := ACT_INT_FIELD(P_IDSESSAO, I, 'EVENTO');
           FIELD_SEQUENCIA:= ACT_INT_FIELD(P_IDSESSAO, I, 'SEQUENCIA');
           FIELD_SEQCASCATA:= ACT_INT_FIELD(P_IDSESSAO, I, 'SEQCASCATA');
           FIELD_NUCLL := ACT_INT_FIELD(P_IDSESSAO, I, 'NUCLL');
           
           
           
           --SELECT LIB.CODUSULIB INTO V_USULIB FROM TSILIB LIB WHERE LIB.NUCHAVE = FIELD_NUNOTA AND LIB.TABELA = FIELD_TABELA AND LIB.EVENTO=FIELD_EVENTO AND LIB.SEQUENCIA = FIELD_SEQUENCIA AND LIB.SEQCASCATA=FIELD_SEQCASCATA;
           
             --              P_MENSAGEM := 'CHAVE '||FIELD_NUNOTA||' ' ||FIELD_TABELA||' ' ||FIELD_EVENTO||' ' ||FIELD_SEQUENCIA||' ' ||FIELD_SEQCASCATA||' - '||V_USULIB ;
           
          
                SELECT 
                COUNT(*) INTO P_COUNT
                FROM TSILIB LIB 
                INNER JOIN TGFCAB CAB ON LIB.NUCHAVE = CAB.NUNOTA
                WHERE 
                    LIB.TABELA = 'TGFCAB' 
                    AND CAB.STATUSNOTA = 'A'
                    AND NOT EXISTS (SELECT 1 FROM TGFVAR WHERE NUNOTAORIG = LIB.NUCHAVE)
                    AND LIB.NUCHAVE = FIELD_NUNOTA AND LIB.TABELA = FIELD_TABELA AND LIB.EVENTO=FIELD_EVENTO AND LIB.SEQUENCIA = FIELD_SEQUENCIA AND LIB.SEQCASCATA=FIELD_SEQCASCATA;

                --P_MENSAGEM := 'Seguiremos com ESTORNO de registro';
                IF P_COUNT > 0 THEN

                     SELECT COUNT(*) INTO P_COUNT FROM TSILIB LIB INNER JOIN TGFCAB CAB ON LIB.NUCHAVE = CAB.NUNOTA
                     WHERE LIB.TABELA = 'TGFCAB' AND CAB.STATUSNOTA = 'A' AND NOT EXISTS (SELECT 1 FROM TGFVAR WHERE NUNOTAORIG = LIB.NUCHAVE)
                     AND CAB.AD_LIBERADO = 'N'
                     AND LIB.NUCHAVE = FIELD_NUNOTA AND LIB.TABELA = FIELD_TABELA AND LIB.EVENTO=FIELD_EVENTO AND LIB.SEQUENCIA = FIELD_SEQUENCIA AND LIB.SEQCASCATA=FIELD_SEQCASCATA;
                     
                        IF P_COUNT > 0 THEN
                        
                                   UPDATE TSILIB SET DHLIB = NULL, VLRLIBERADO = 0 WHERE NUCHAVE = FIELD_NUNOTA AND TABELA = FIELD_TABELA AND EVENTO=FIELD_EVENTO AND SEQUENCIA = FIELD_SEQUENCIA AND SEQCASCATA=FIELD_SEQCASCATA;
                                   P_MENSAGEM := 'Estorno realizado com sucesso!';   
                        
                        ELSE
                 
                                P_MENSAGEM := 'Documento não liberado pela Logística, o estorno não pode ser realizado.';
                        
                        END IF;
                     

                 ELSE
                 
                    P_MENSAGEM := 'Nota de origem já faturada, o estorno não pode ser realizado.';

                 END IF;
                   
                   



           
    
-- <ESCREVA SEU CÓDIGO AQUI (SERÁ EXECUTADO PARA CADA REGISTRO SELECIONADO)> --



       END LOOP;




-- <ESCREVA SEU CÓDIGO DE FINALIZAÇÃO AQUI> --



END;
/