CREATE OR REPLACE PROCEDURE SATISTST."STP_ATUALIZA_VLR_DEC_SATIS" (
       P_CODUSU NUMBER,        -- Código do usuário logado
       P_IDSESSAO VARCHAR2,    -- Identificador da execução. Serve para buscar informações dos parâmetros/campos da execução.
       P_QTDLINHAS NUMBER,     -- Informa a quantidade de registros selecionados no momento da execução.
       P_MENSAGEM OUT VARCHAR2 -- Caso seja passada uma mensagem aqui, ela será exibida como uma informação ao usuário.
) AS
       PARAM_VLRDEC             NUMBER;
       FIELD_NUFIN                  NUMBER;
       FIELD_DESDOBRAMENTO NUMBER;
       P_CONTAR                     NUMBER;
BEGIN

       -- Os valores informados pelo formulário de parâmetros, podem ser obtidos com as funções:
       --     ACT_INT_PARAM
       --     ACT_DEC_PARAM
       --     ACT_TXT_PARAM
       --     ACT_DTA_PARAM
       -- Estas funções recebem 2 argumentos:
       --     ID DA SESSÃO - Identificador da execução (Obtido através de P_IDSESSAO))
       --     NOME DO PARAMETRO - Determina qual parametro deve se deseja obter.

       PARAM_VLRDEC := ACT_INT_PARAM(P_IDSESSAO, 'VLRDEC');

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
           FIELD_NUFIN := ACT_INT_FIELD(P_IDSESSAO, I, 'NUFIN');

           
           
           
           -- Obtendo valores de DHBAIXA e NUNOTA para a verificação
           SELECT COUNT(*) 
           INTO P_CONTAR 
           FROM TGFFIN 
           WHERE NUFIN = FIELD_NUFIN AND DHBAIXA IS NULL AND NUNOTA IS NOT NULL;



-- <ESCREVA SEU CÓDIGO AQUI (SERÁ EXECUTADO PARA CADA REGISTRO SELECIONADO)> --

           IF P_CONTAR > 0 THEN
           
               -- Executa o update se DHBAIXA for nulo e NUNOTA não for nulo
               UPDATE TGFFIN
               SET VLRDESDOB = TRUNC(VLRDESDOB) + (PARAM_VLRDEC / POWER(10, LENGTH(PARAM_VLRDEC)))
               WHERE NUFIN = FIELD_NUFIN AND DHBAIXA IS NULL AND NUNOTA IS NOT NULL;
               P_MENSAGEM := 'Valor decimal alterado com sucesso!';
          ELSE
          
                P_MENSAGEM := 'Valor decimal não pode ser alterado no titulo!';
            
          END IF;

       END LOOP;




-- <ESCREVA SEU CÓDIGO DE FINALIZAÇÃO AQUI> --



END;
/
