CREATE OR REPLACE PROCEDURE STP_ENV_NOTIF_SATIS
AS
    -- Cursor para buscar os emails dos usuários
    CURSOR c_usuarios IS
        SELECT * FROM (
            SELECT
                USU.EMAIL
            FROM TSILIB LIB
            INNER JOIN TGFCAB CAB ON LIB.NUCHAVE = CAB.NUNOTA
            INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
            WHERE CAB.TIPMOV = 'J'
              AND USU.EMAIL IS NOT NULL

        UNION ALL

            SELECT
                USU.EMAIL
            FROM TSILIB LIB
            INNER JOIN TGFCAB CAB ON LIB.NUCHAVE = CAB.NUNOTA
            INNER JOIN TSIUSU USU ON LIB.CODUSULIB = USU.CODUSU
            WHERE CAB.TIPMOV = 'J'
              AND USU.EMAIL IS NOT NULL
        )
        GROUP BY EMAIL;
    
    -- Variáveis para armazenar os dados
    v_codfila NUMBER;
    v_assunto VARCHAR2(500);
    v_corpo CLOB;
    v_email VARCHAR2(255);
    
BEGIN
    -- Definir o assunto do e-mail
    v_assunto := 'Nova Política de Pendências e Reprovação de Requisições';
    
    -- Definir o corpo do e-mail
    v_corpo := '<p>Prezado(a) Usuário(a),</p>

<p>Com o objetivo de melhorar o fluxo de aprovação e controle de requisições no sistema, informamos que foi implementada uma <strong>nova política de gerenciamento de pendências e reprovação automática de requisições</strong>.</p>

<p>Esta política se aplica tanto a <strong>usuários requisitantes</strong> quanto a <strong>usuários aprovadores</strong> e entrará em vigor a partir desta comunicação. <strong>Aprovadores</strong> são incentivados a revisar e tomar decisão sobre as requisições pendentes em suas responsabilidades, seja para <strong>liberar</strong> ou <strong>reprovar</strong>, evitando que fiquem sem atenção.</p>

<hr>

<p><strong>A seguir, veja como os prazos e notificações passarão a funcionar:</strong></p>

<ul>
    <li><strong>Entre 1 e 13 dias de pendência:</strong> O sistema envia notificações periódicas informando que a requisição está pendente e solicitando que seja revisada e decidida (liberada ou reprovada) com brevidade.</li>
    <li><strong>Com 14 dias de pendência:</strong> Uma notificação de <strong>último aviso</strong> será enviada, alertando que a requisição será automaticamente reprovada no dia seguinte, caso não seja revisada e decidida.</li>
    <li><strong>Com 15 dias ou mais:</strong> A requisição será <strong>automaticamente reprovada</strong> do sistema, conforme as regras estabelecidas. Um e-mail será enviado ao requisitante informando a reprovação.</li>
    <li><strong>Tratamento de base legada (requisitões antigas):</strong> Requisições com mais de 15 dias, cadastradas antes da política entrar em vigor, também serão tratadas. Um e-mail será enviado avisando que ainda há possibilidade de aprovação, mas que essas requisições <u>serão reprovadas automaticamente em 5 dias corridos</u> a partir do aviso.</li>
</ul>

<hr>

<div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 12px; border-radius: 5px;">
    <strong>Recomendações Importantes:</strong><br>
    - Requisitantes: Acompanhem suas solicitações e comuniquem os aprovadores sobre pendências próximas do vencimento.<br>
    - Aprovadores: Realizem a análise e tomem decisão (liberar ou reprovar) com a maior brevidade possível para manter o fluxo de trabalho ágil e evitar reprovações automáticas.<br>
    - Após a reprovação automática, será necessário realizar uma nova requisição.
</div>

<br>

<p>Contamos com a colaboração de todos para garantir a fluidez no processo de compras e solicitações. A participação ativa dos aprovadores na revisão e decisão das requisições é fundamental para o sucesso deste sistema.</p>

<p>Em caso de dúvidas, entre em contato com a equipe do Departamento de Compras.</p>

<br>
<p>Atenciosamente,<br>Departamento de Compras - Sistema de Notificações</p>
<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="margin-top: 20px;">';

    -- Processar cada registro do cursor
    FOR rec IN c_usuarios LOOP
        v_email := rec.EMAIL;
        
        -- Gerar código único para a fila
        SELECT NVL(MAX(CODFILA), 0) + 1 INTO v_codfila FROM TMDFMG;
        
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
        
        -- Commit a cada inserção para garantir que os dados sejam salvos
        COMMIT;
    END LOOP;
    
    -- Commit final
    COMMIT;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, fazer rollback e registrar o erro
        ROLLBACK;
        DBMS_OUTPUT.PUT_LINE('Erro na execução da procedure: ' || SQLERRM);
        RAISE;
END STP_ENV_NOTIF_SATIS;
/
