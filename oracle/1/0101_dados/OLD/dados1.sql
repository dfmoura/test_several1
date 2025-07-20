CREATE OR REPLACE PROCEDURE STP_REQ_MAIL_PEND_SATIS
AS
-- Procedure para enviar emails de notificação sobre liberações pendentes
    -- Cursor para percorrer os registros do SELECT
    CURSOR c_liberacoes_pendentes IS
        SELECT
            LIB.NUCHAVE,
            USU.NOMEUSU,
            LIB.DHSOLICIT,
            SYSDATE - LIB.DHSOLICIT AS DIAS_PENDENTES,
            NVL(CAB.OBSERVACAO, 'Sem observação') AS OBSERVACAO,
            USU.EMAIL
        FROM TSILIB LIB
        INNER JOIN TGFCAB CAB ON LIB.NUCHAVE = CAB.NUNOTA
        INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
        WHERE LIB.DHLIB IS NULL
          AND CAB.TIPMOV = 'J'
          --AND SYSDATE - LIB.DHSOLICIT BETWEEN 1 AND 13
          AND USU.EMAIL IS NOT NULL
        ORDER BY LIB.DHSOLICIT;
    
    -- Variáveis para armazenar os dados
    v_nuchave TSILIB.NUCHAVE%TYPE;
    v_dhsolicit TSILIB.DHSOLICIT%TYPE;
    v_nome_usuario TSIUSU.NOMEUSU%TYPE;
    v_dias_pendentes NUMBER;
    v_observacao VARCHAR2(4000);
    v_email TSIUSU.EMAIL%TYPE;
    
    -- Variáveis para o email
    v_assunto VARCHAR2(200);
    v_corpo VARCHAR2(4000);
    v_codfila NUMBER;
    
BEGIN
    -- Abrir o cursor
    OPEN c_liberacoes_pendentes;
    
    LOOP
        -- Buscar o próximo registro
        FETCH c_liberacoes_pendentes INTO v_nuchave, v_nome_usuario,v_dhsolicit, v_dias_pendentes, v_observacao, v_email;
        
        -- Sair do loop quando não houver mais registros
        EXIT WHEN c_liberacoes_pendentes%NOTFOUND;
        
        -- Gerar código único para a fila (pode ser ajustado conforme necessidade)
        SELECT NVL(MAX(CODFILA), 0) + 1 INTO v_codfila FROM TMDFMG;
        
        -- Criar o assunto do email
        v_assunto := 'Notificação: Liberação Pendente - Requisição N° ' || v_nuchave;



        -- Criar o corpo do email
        v_corpo := 
            '<p>Prezado(a) <strong>' || v_nome_usuario || '</strong>,</p>' ||
            '<p>Informamos que a requisição nº <strong>' || v_nuchave || '</strong> encontra-se pendente há <strong>' || round(v_dias_pendentes,2) || ' dia(s)</strong>.</p>' ||
            '<p><strong>Data da solicitação:</strong> ' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY HH24:MI') || '</p>' ||
            '<p><strong>Descrição da Requisição:</strong><br>' || v_observacao || '</p>' ||
            -- Bloco de destaque para ação
            '<div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 10px; border-radius: 5px; margin-top: 15px;">' ||
            '<strong>Por favor, tome as providências necessárias e realize a liberação o quanto antes.</strong>' ||
            '</div>' ||
            -- Alerta de exclusão
            '<p style="color: red; margin-top: 15px;"><strong>Atenção:</strong> Requisições que permanecerem pendentes por <strong>15 dias corridos</strong> a partir da data da solicitação (<strong>' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY') || '</strong>) serão <u>automaticamente excluídas</u> do sistema.</p>' ||
            '<br>' ||
            '<p>Atenciosamente,<br>' ||
            'Departamento de Compras - Sistema de Notificações</p>' ||
            -- Logo ao final
            '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="margin-top: 20px;">';




        
        -- Inserir o registro na tabela de envio de mensagens
        INSERT INTO TMDFMG (
            CODFILA, ASSUNTO, CODMSG, DTENTRADA, STATUS,
            CODCON, TENTENVIO, MENSAGEM, TIPOENVIO, MAXTENTENVIO,
            EMAIL, CODSMTP
        )
        VALUES (
            v_codfila, v_assunto, NULL, SYSDATE, 'Pendente',
            0, 0, v_corpo, 'E', 3,
            v_email, 11
        );
        
         
    END LOOP;
 
       -- Commit para cada inserção (opcional - pode ser movido para fora do loop)
        COMMIT;

   
    -- Fechar o cursor
    CLOSE c_liberacoes_pendentes;
    
END STP_REQ_MAIL_PEND_SATIS;
/


-- Exemplo de como executar a procedure
EXEC STP_REQ_MAIL_PEND_SATIS;