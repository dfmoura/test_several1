CREATE OR REPLACE PROCEDURE STP_REQ_MAIL_PEND_SATIS
AS
-- Procedure para enviar emails de notificação sobre liberações pendentes
    -- Cursor para percorrer os registros do SELECT
    CURSOR c_liberacoes_pendentes IS
        SELECT
            LIB.NUCHAVE,
            LIB.NUCLL,
            LIB.SEQCASCATA,
            LIB.SEQUENCIA,
            LIB.EVENTO,
            LIB.TABELA,
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
    v_nucll TSILIB.NUCLL%TYPE;
    v_seqcascata TSILIB.SEQCASCATA%TYPE;
    v_sequencia TSILIB.SEQUENCIA%TYPE;
    v_evento TSILIB.EVENTO%TYPE;
    v_tabela TSILIB.TABELA%TYPE;
    v_dhsolicit TSILIB.DHSOLICIT%TYPE;
    v_nome_usuario TSIUSU.NOMEUSU%TYPE;
    v_dias_pendentes NUMBER;
    v_observacao VARCHAR2(4000);
    v_email TSIUSU.EMAIL%TYPE;
    
    -- Variáveis para o email
    v_assunto VARCHAR2(200);
    v_corpo VARCHAR2(4000);
    v_codfila NUMBER;
    
    -- Variável para controlar se já foi enviado o email inicial
    v_email_inicial_enviado BOOLEAN := FALSE;
    
BEGIN
    -- Enviar email inicial de notificação sobre o início da rotina
    IF NOT v_email_inicial_enviado THEN
        -- Gerar código único para a fila do email inicial
        SELECT NVL(MAX(CODFILA), 0) + 1 INTO v_codfila FROM TMDFMG;
        
        -- Assunto do email inicial
        v_assunto := 'SISTEMA DE NOTIFICAÇÕES - Início da Rotina de Liberações Pendentes';
        
        -- Corpo do email inicial
        v_corpo := 
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">' ||
            '<h2 style="color: #2c3e50; text-align: center; border-bottom: 3px solid #3498db; padding-bottom: 10px;">' ||
            '🚀 SISTEMA DE NOTIFICAÇÕES ATIVADO</h2>' ||
            '<p>Prezados usuários,</p>' ||
            '<p>Informamos que o <strong>Sistema de Notificações de Liberações Pendentes</strong> foi ativado e está monitorando todas as requisições pendentes no banco de dados legado.</p>' ||
            '<div style="background-color: #e8f4fd; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0;">' ||
            '<h3 style="color: #2c3e50; margin-top: 0;">📋 POLÍTICA DE REJEIÇÃO AUTOMÁTICA</h3>' ||
            '<p><strong>IMPORTANTE:</strong> Todas as requisições que permanecerem pendentes por <strong>5 dias corridos</strong> a partir da data da solicitação serão <u>automaticamente rejeitadas</u> do sistema.</p>' ||
            '<p style="color: #e74c3c; font-weight: bold;">⚠️ ATENÇÃO: Após a rejeição automática, será <u>OBRIGATÓRIO</u> criar uma <strong>NOVA REQUISIÇÃO</strong> no sistema para prosseguir com o processo de liberação.</p>' ||
            '</div>' ||
            '<div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin: 20px 0;">' ||
            '<h4 style="color: #856404; margin-top: 0;">📅 CRONOGRAMA DE NOTIFICAÇÕES:</h4>' ||
            '<ul style="color: #856404;">' ||
            '<li><strong>Dias 1-3:</strong> Notificação inicial de pendência</li>' ||
            '<li><strong>Dia 4:</strong> Aviso de urgência (última chance)</li>' ||
            '<li><strong>Dia 5:</strong> Rejeição automática + notificação de nova solicitação obrigatória</li>' ||
            '</ul>' ||
            '</div>' ||
            '<div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">' ||
            '<h4 style="color: #155724; margin-top: 0;">✅ AÇÕES RECOMENDADAS:</h4>' ||
            '<ul style="color: #155724;">' ||
            '<li>Verificar requisições pendentes em seu nome</li>' ||
            '<li>Realizar liberações dentro do prazo de 5 dias</li>' ||
            '<li>Manter-se atento às notificações por email</li>' ||
            '<li>Em caso de rejeição, criar nova requisição imediatamente</li>' ||
            '</ul>' ||
            '</div>' ||
            '<p style="text-align: center; margin-top: 30px; color: #7f8c8d;">' ||
            'Este é um sistema automatizado. Em caso de dúvidas, entre em contato com o Departamento de Compras.' ||
            '</p>' ||
            '<p style="text-align: center; margin-top: 20px;">' ||
            'Atenciosamente,<br>' ||
            '<strong>Departamento de Compras - Sistema de Notificações</strong>' ||
            '</p>' ||
            '<div style="text-align: center; margin-top: 30px;">' ||
            '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="max-width: 200px;">' ||
            '</div>' ||
            '</div>';
        
        -- Inserir o email inicial na tabela de envio de mensagens
        INSERT INTO TMDFMG (
            CODFILA, ASSUNTO, CODMSG, DTENTRADA, STATUS,
            CODCON, TENTENVIO, MENSAGEM, TIPOENVIO, MAXTENTENVIO,
            EMAIL, CODSMTP
        )
        VALUES (
            v_codfila, v_assunto, NULL, SYSDATE, 'Pendente',
            0, 0, v_corpo, 'E', 3,
            'admin@sistema.com', 11  -- Email administrativo para notificação inicial
        );
        
        v_email_inicial_enviado := TRUE;
    END IF;
    
    -- Abrir o cursor
    OPEN c_liberacoes_pendentes;
    
    LOOP
        -- Buscar o próximo registro
        FETCH c_liberacoes_pendentes INTO v_nuchave, v_nucll, v_seqcascata, v_sequencia, v_evento, v_tabela, v_nome_usuario, v_dhsolicit, v_dias_pendentes, v_observacao, v_email;
        
        -- Sair do loop quando não houver mais registros
        EXIT WHEN c_liberacoes_pendentes%NOTFOUND;
        
        -- Gerar código único para a fila (pode ser ajustado conforme necessidade)
        SELECT NVL(MAX(CODFILA), 0) + 1 INTO v_codfila FROM TMDFMG;
        
        -- Criar o assunto do email
        v_assunto := 'Notificação: Liberação Pendente - Requisição N° ' || v_nuchave;

        -- Criar o corpo do email baseado no tempo de pendência (5 dias)
        IF v_dias_pendentes BETWEEN 1 AND 3 THEN
            -- Email para requisições pendentes entre 1 e 3 dias
            v_corpo := 
                '<p>Prezado(a) <strong>' || v_nome_usuario || '</strong>,</p>' ||
                '<p>Informamos que a requisição nº <strong>' || v_nuchave || '</strong> encontra-se pendente há <strong>' || round(v_dias_pendentes,2) || ' dia(s)</strong>.</p>' ||
                '<p><strong>Data da solicitação:</strong> ' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY HH24:MI') || '</p>' ||
                '<p><strong>Descrição da Requisição:</strong><br>' || v_observacao || '</p>' ||
                -- Bloco de destaque para ação
                '<div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 10px; border-radius: 5px; margin-top: 15px;">' ||
                '<strong>Por favor, tome as providências necessárias e realize a liberação o quanto antes.</strong>' ||
                '</div>' ||
                -- Alerta de rejeição em 5 dias
                '<p style="color: red; margin-top: 15px;"><strong>Atenção:</strong> Requisições que permanecerem pendentes por <strong>5 dias corridos</strong> a partir da data da solicitação (<strong>' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY') || '</strong>) serão <u>automaticamente rejeitadas</u> do sistema.</p>' ||
                '<p style="color: #e74c3c; font-weight: bold; margin-top: 10px;"><strong>⚠️ IMPORTANTE:</strong> Após a rejeição automática, será <u>OBRIGATÓRIO</u> criar uma <strong>NOVA REQUISIÇÃO</strong> no sistema para prosseguir com a liberação.</p>' ||
                '<br>' ||
                '<p>Atenciosamente,<br>' ||
                'Departamento de Compras - Sistema de Notificações</p>' ||
                -- Logo ao final
                '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="margin-top: 20px;">';
        
        ELSIF v_dias_pendentes = 4 THEN
            -- Email para requisições pendentes há exatamente 4 dias (último aviso)
            v_corpo := 
                '<p>Prezado(a) <strong>' || v_nome_usuario || '</strong>,</p>' ||
                '<p><strong>URGENTE:</strong> A requisição nº <strong>' || v_nuchave || '</strong> encontra-se pendente há <strong>' || round(v_dias_pendentes,2) || ' dia(s)</strong>.</p>' ||
                '<p><strong>Data da solicitação:</strong> ' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY HH24:MI') || '</p>' ||
                '<p><strong>Descrição da Requisição:</strong><br>' || v_observacao || '</p>' ||
                -- Bloco de destaque para ação urgente
                '<div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 5px; margin-top: 15px;">' ||
                '<strong style="color: #721c24;">ATENÇÃO: Esta é a última notificação antes da rejeição automática!</strong><br>' ||
                '<strong>É necessário realizar a liberação IMEDIATAMENTE para evitar a rejeição automática.</strong>' ||
                '</div>' ||
                -- Alerta crítico de rejeição
                '<p style="color: #721c24; margin-top: 15px;"><strong>ALERTA CRÍTICO:</strong> Amanhã, dia <strong>' || TO_CHAR(v_dhsolicit + 5, 'DD/MM/YYYY') || '</strong>, esta requisição será <u>automaticamente rejeitada</u> do sistema se não for liberada.</p>' ||
                '<p style="color: #e74c3c; font-weight: bold; margin-top: 10px;"><strong>🚨 CRÍTICO:</strong> Após a rejeição automática, será <u>OBRIGATÓRIO</u> criar uma <strong>NOVA REQUISIÇÃO</strong> no sistema para prosseguir com a liberação.</p>' ||
                '<br>' ||
                '<p>Atenciosamente,<br>' ||
                'Departamento de Compras - Sistema de Notificações</p>' ||
                -- Logo ao final
                '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="margin-top: 20px;">';
        
        ELSIF v_dias_pendentes >= 5 THEN
            -- Email para requisições pendentes há 5 dias ou mais (após prazo)
            v_corpo := 
                '<p>Prezado(a) <strong>' || v_nome_usuario || '</strong>,</p>' ||
                '<p><strong>INFORMAÇÃO:</strong> A requisição nº <strong>' || v_nuchave || '</strong> foi <strong>automaticamente rejeitada</strong> do sistema.</p>' ||
                '<p><strong>Data da solicitação:</strong> ' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY HH24:MI') || '</p>' ||
                '<p><strong>Descrição da Requisição:</strong><br>' || v_observacao || '</p>' ||
                '<p><strong>Tempo de pendência:</strong> ' || round(v_dias_pendentes,2) || ' dia(s)</p>' ||
                -- Bloco de destaque para informação de rejeição
                '<div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 10px; border-radius: 5px; margin-top: 15px;">' ||
                '<strong style="color: #155724;">REJEIÇÃO AUTOMÁTICA REALIZADA</strong><br>' ||
                '<strong>Esta requisição foi rejeitada do sistema conforme a política de rejeição automática após 5 dias de pendência.</strong>' ||
                '</div>' ||
                -- Informação sobre nova solicitação obrigatória
                '<div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin-top: 15px;">' ||
                '<h4 style="color: #721c24; margin-top: 0;">🔄 NOVA REQUISIÇÃO OBRIGATÓRIA</h4>' ||
                '<p style="color: #721c24;"><strong>IMPORTANTE:</strong> Após ser <strong>rejeitada</strong>, será <u>OBRIGATÓRIO</u> criar uma <strong>NOVA REQUISIÇÃO</strong> no sistema para prosseguir com a liberação.</p>' ||
                '<p style="color: #721c24;"><strong>⚠️ ATENÇÃO:</strong> Não será possível reativar esta requisição rejeitada. Uma nova solicitação deve ser criada do zero.</p>' ||
                '</div>' ||
                '<br>' ||
                '<p>Atenciosamente,<br>' ||
                'Departamento de Compras - Sistema de Notificações</p>' ||
                -- Logo ao final
                '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="margin-top: 20px;">';
        
        END IF;

        
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