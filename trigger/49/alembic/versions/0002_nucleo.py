"""Núcleo: identidade, escopo, coleta e RLS por adesão de UASG."""

from alembic import op

revision = "0002_nucleo"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None

_TABELAS_RLS_TENANT = ("filial_uasg", "anotacao_interna")
_TABELAS_RLS_UASG = (
    "contratacao",
    "contratacao_item",
    "resultado_item",
    "contrato_pncp",
    "ata_pncp",
)


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE filial (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            nome varchar(200) NOT NULL,
            cnpj varchar(14) NOT NULL UNIQUE,
            municipio varchar(120) NOT NULL,
            uf varchar(2) NOT NULL,
            codigo_ibge integer NOT NULL,
            situacao varchar(20) NOT NULL DEFAULT 'ativa',
            cnpj_conferencia_pendente boolean NOT NULL DEFAULT true,
            ultima_sync_uasg timestamptz,
            escopo_alterado_em timestamptz,
            criada_em timestamptz NOT NULL DEFAULT now(),
            atualizada_em timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE usuario (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            username varchar(80) NOT NULL UNIQUE,
            senha_hash varchar(255) NOT NULL,
            papel varchar(32) NOT NULL,
            ativo boolean NOT NULL DEFAULT true,
            filial_id uuid REFERENCES filial(id),
            criado_em timestamptz NOT NULL DEFAULT now(),
            desativado_em timestamptz,
            CONSTRAINT usuario_papel_filial CHECK (
                (papel IN ('master_admin', 'master_analista') AND filial_id IS NULL)
                OR (papel IN ('filial_gestor', 'filial_analista') AND filial_id IS NOT NULL)
            )
        );
        CREATE TABLE sessao (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
            token_hash varchar(64) NOT NULL UNIQUE,
            criada_em timestamptz NOT NULL,
            ultimo_acesso_em timestamptz NOT NULL,
            expira_em timestamptz NOT NULL
        );
        CREATE TABLE auditoria_acesso (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            instante timestamptz NOT NULL,
            usuario_id uuid REFERENCES usuario(id),
            filial_id uuid REFERENCES filial(id),
            evento varchar(60) NOT NULL,
            detalhe text NOT NULL DEFAULT ''
        );
        CREATE TABLE orgao_publico (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            cnpj varchar(14) NOT NULL UNIQUE,
            nome varchar(200) NOT NULL DEFAULT '',
            codigo_orgao integer,
            uf varchar(2) NOT NULL DEFAULT '',
            codigo_ibge integer
        );
        CREATE TABLE uasg (
            codigo_uasg varchar(12) PRIMARY KEY,
            nome varchar(200) NOT NULL DEFAULT '',
            cnpj_orgao varchar(14) NOT NULL DEFAULT '',
            uf varchar(2) NOT NULL DEFAULT '',
            codigo_ibge integer,
            ativa_oficial boolean NOT NULL DEFAULT true,
            atualizada_em timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE filial_uasg (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL REFERENCES filial(id),
            codigo_uasg varchar(12) NOT NULL REFERENCES uasg(codigo_uasg),
            aderida boolean NOT NULL DEFAULT false,
            UNIQUE (tenant_id, codigo_uasg)
        );
        CREATE TABLE contratacao (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL REFERENCES filial(id),
            numero_controle_pncp varchar(80) NOT NULL UNIQUE,
            codigo_uasg varchar(12) NOT NULL REFERENCES uasg(codigo_uasg),
            cnpj_orgao varchar(14) NOT NULL DEFAULT '',
            objeto text NOT NULL DEFAULT '',
            modalidade_id_pncp integer,
            codigo_modalidade integer,
            modalidade_nome varchar(120) NOT NULL DEFAULT '',
            situacao varchar(80) NOT NULL DEFAULT '',
            valor_estimado numeric(18, 2),
            valor_homologado numeric(18, 2),
            data_publicacao date,
            existe_resultado boolean NOT NULL DEFAULT false,
            aberta boolean NOT NULL DEFAULT true,
            ano integer,
            atualizado_em timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE contratacao_item (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL REFERENCES filial(id),
            numero_controle_pncp varchar(80) NOT NULL
                REFERENCES contratacao(numero_controle_pncp),
            numero_item integer NOT NULL,
            descricao text NOT NULL DEFAULT '',
            tem_resultado boolean NOT NULL DEFAULT false,
            cod_item_catalogo varchar(40) NOT NULL DEFAULT '',
            tipo_catalogo varchar(20) NOT NULL DEFAULT '',
            ni_fornecedor varchar(14) NOT NULL DEFAULT '',
            nome_fornecedor varchar(200) NOT NULL DEFAULT '',
            valor_total numeric(18, 2),
            atualizado_em timestamptz NOT NULL DEFAULT now(),
            UNIQUE (numero_controle_pncp, numero_item)
        );
        CREATE TABLE resultado_item (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL REFERENCES filial(id),
            numero_controle_pncp varchar(80) NOT NULL,
            numero_item integer NOT NULL,
            ni_fornecedor varchar(14) NOT NULL DEFAULT '',
            nome_fornecedor varchar(200) NOT NULL DEFAULT '',
            data_resultado date,
            valor numeric(18, 2),
            atualizado_em timestamptz NOT NULL DEFAULT now()
        );
        CREATE UNIQUE INDEX uq_resultado_item ON resultado_item (
            numero_controle_pncp,
            numero_item,
            ni_fornecedor,
            COALESCE(data_resultado, DATE '0001-01-01')
        );
        CREATE TABLE contrato_pncp (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL REFERENCES filial(id),
            numero_controle_pncp varchar(80) NOT NULL UNIQUE,
            numero_controle_pncp_compra varchar(80),
            cnpj_orgao varchar(14) NOT NULL DEFAULT '',
            codigo_uasg varchar(12) NOT NULL DEFAULT '',
            objeto text NOT NULL DEFAULT '',
            valor numeric(18, 2),
            data_assinatura date,
            atualizado_em timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE ata_pncp (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL REFERENCES filial(id),
            numero_controle_pncp varchar(80) NOT NULL UNIQUE,
            numero_controle_pncp_compra varchar(80),
            cnpj_orgao varchar(14) NOT NULL DEFAULT '',
            codigo_uasg varchar(12) NOT NULL DEFAULT '',
            objeto text NOT NULL DEFAULT '',
            valor numeric(18, 2),
            data_assinatura date,
            atualizado_em timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE anotacao_interna (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL REFERENCES filial(id),
            alvo_tipo varchar(40) NOT NULL,
            alvo_chave varchar(80) NOT NULL,
            texto text NOT NULL DEFAULT '',
            UNIQUE (tenant_id, alvo_tipo, alvo_chave)
        );
        CREATE TABLE catalogo_item (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            codigo varchar(40) NOT NULL,
            tipo varchar(20) NOT NULL,
            descricao text NOT NULL DEFAULT '',
            consultado_em timestamptz NOT NULL DEFAULT now(),
            UNIQUE (codigo, tipo)
        );
        CREATE TABLE cnpj_cache (
            cnpj varchar(14) PRIMARY KEY,
            payload text NOT NULL DEFAULT '',
            consultado_em timestamptz,
            valido_ate timestamptz
        );
        CREATE TABLE cep_cache (
            cep varchar(8) PRIMARY KEY,
            payload text NOT NULL DEFAULT '',
            consultado_em timestamptz
        );
        CREATE TABLE coleta_job (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            filial_id uuid NOT NULL REFERENCES filial(id),
            faixa varchar(1) NOT NULL,
            tipo varchar(20) NOT NULL,
            noite date NOT NULL,
            status varchar(30) NOT NULL DEFAULT 'pendente',
            motivo text NOT NULL DEFAULT '',
            chamadas integer NOT NULL DEFAULT 0,
            iniciado_em timestamptz,
            terminado_em timestamptz,
            UNIQUE (filial_id, faixa, tipo, noite)
        );
        CREATE TABLE coleta_etapa (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            job_id uuid NOT NULL REFERENCES coleta_job(id) ON DELETE CASCADE,
            codigo varchar(4) NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'pendente',
            mensagem text NOT NULL DEFAULT '',
            UNIQUE (job_id, codigo)
        );
        CREATE TABLE coleta_cursor (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            filial_id uuid NOT NULL REFERENCES filial(id),
            codigo_uasg varchar(12) NOT NULL DEFAULT '',
            tipo varchar(30) NOT NULL,
            janela_ini date NOT NULL,
            janela_fim date NOT NULL,
            pagina integer NOT NULL DEFAULT 1,
            tamanho_pagina integer NOT NULL DEFAULT 100,
            atualizado_em timestamptz NOT NULL DEFAULT now(),
            UNIQUE (filial_id, codigo_uasg, tipo, janela_ini, janela_fim)
        );
        CREATE TABLE configuracao_agenda (
            id integer PRIMARY KEY,
            hora integer NOT NULL DEFAULT 2,
            minuto integer NOT NULL DEFAULT 10,
            janela_dias integer NOT NULL DEFAULT 7,
            teto_abertas integer NOT NULL DEFAULT 40,
            orcamento_chamadas integer NOT NULL DEFAULT 300,
            ano_inicial_carga integer NOT NULL DEFAULT 2023,
            backup_hora integer NOT NULL DEFAULT 5,
            backup_minuto integer NOT NULL DEFAULT 10,
            ultimo_filial_id uuid
        );
        INSERT INTO configuracao_agenda (id) VALUES (1);
        INSERT INTO filial (
            id, nome, cnpj, municipio, uf, codigo_ibge, situacao,
            cnpj_conferencia_pendente
        ) VALUES (
            'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            'Observatório Social do Brasil — Uberlândia',
            '23497346000142',
            'Uberlândia',
            'MG',
            3170206,
            'ativa',
            true
        );
        """
    )
    for tabela in _TABELAS_RLS_TENANT:
        op.execute(
            f"""
            ALTER TABLE {tabela} ENABLE ROW LEVEL SECURITY;
            ALTER TABLE {tabela} FORCE ROW LEVEL SECURITY;
            CREATE POLICY isolamento_{tabela} ON {tabela}
            USING (
                current_setting('app.acesso', true) = 'master'
                OR tenant_id = NULLIF(current_setting('app.filial_id', true), '')::uuid
            )
            WITH CHECK (
                tenant_id = NULLIF(current_setting('app.filial_id', true), '')::uuid
            );
            """
        )
    # Leitura pela UASG aderida: a linha oficial não se duplica por filial.
    op.execute(
        """
        ALTER TABLE contratacao ENABLE ROW LEVEL SECURITY;
        ALTER TABLE contratacao FORCE ROW LEVEL SECURITY;
        CREATE POLICY isolamento_contratacao ON contratacao
        USING (
            current_setting('app.acesso', true) = 'master'
            OR EXISTS (
                SELECT 1 FROM filial_uasg fu
                WHERE fu.codigo_uasg = contratacao.codigo_uasg
                  AND fu.aderida
                  AND fu.tenant_id = NULLIF(current_setting('app.filial_id', true), '')::uuid
            )
        )
        WITH CHECK (
            tenant_id = NULLIF(current_setting('app.filial_id', true), '')::uuid
            AND EXISTS (
                SELECT 1 FROM filial_uasg fu
                WHERE fu.codigo_uasg = contratacao.codigo_uasg
                  AND fu.aderida
                  AND fu.tenant_id = NULLIF(current_setting('app.filial_id', true), '')::uuid
            )
        );
        """
    )
    for tabela, chave in (
        ("contratacao_item", "numero_controle_pncp"),
        ("resultado_item", "numero_controle_pncp"),
    ):
        op.execute(
            f"""
            ALTER TABLE {tabela} ENABLE ROW LEVEL SECURITY;
            ALTER TABLE {tabela} FORCE ROW LEVEL SECURITY;
            CREATE POLICY isolamento_{tabela} ON {tabela}
            USING (
                current_setting('app.acesso', true) = 'master'
                OR EXISTS (
                    SELECT 1 FROM contratacao c
                    JOIN filial_uasg fu ON fu.codigo_uasg = c.codigo_uasg AND fu.aderida
                    WHERE c.numero_controle_pncp = {tabela}.{chave}
                      AND fu.tenant_id = NULLIF(current_setting('app.filial_id', true), '')::uuid
                )
            )
            WITH CHECK (
                tenant_id = NULLIF(current_setting('app.filial_id', true), '')::uuid
            );
            """
        )
    for tabela in ("contrato_pncp", "ata_pncp"):
        op.execute(
            f"""
            ALTER TABLE {tabela} ENABLE ROW LEVEL SECURITY;
            ALTER TABLE {tabela} FORCE ROW LEVEL SECURITY;
            CREATE POLICY isolamento_{tabela} ON {tabela}
            USING (
                current_setting('app.acesso', true) = 'master'
                OR (
                    codigo_uasg <> ''
                    AND EXISTS (
                        SELECT 1 FROM filial_uasg fu
                        WHERE fu.codigo_uasg = {tabela}.codigo_uasg
                          AND fu.aderida
                          AND fu.tenant_id = NULLIF(current_setting('app.filial_id', true), '')::uuid
                    )
                )
                OR (
                    codigo_uasg = ''
                    AND tenant_id = NULLIF(current_setting('app.filial_id', true), '')::uuid
                )
            )
            WITH CHECK (
                tenant_id = NULLIF(current_setting('app.filial_id', true), '')::uuid
            );
            """
        )
    op.execute(
        """
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO osb_app;
        """
    )


def downgrade() -> None:
    for tabela in (
        "ata_pncp",
        "contrato_pncp",
        "resultado_item",
        "contratacao_item",
        "contratacao",
        "anotacao_interna",
        "filial_uasg",
    ):
        op.execute(f"DROP POLICY IF EXISTS isolamento_{tabela} ON {tabela}")
    op.execute(
        """
        DROP TABLE IF EXISTS coleta_cursor, coleta_etapa, coleta_job, configuracao_agenda,
            cep_cache, cnpj_cache, catalogo_item, anotacao_interna, ata_pncp, contrato_pncp,
            resultado_item, contratacao_item, contratacao, filial_uasg, uasg, orgao_publico,
            auditoria_acesso, sessao, usuario, filial CASCADE;
        """
    )
