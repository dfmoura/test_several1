"""Observador da filial e vínculo com a contratação oficial."""

from alembic import op

revision = "0003_acompanhamento"
down_revision = "0002_nucleo"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE observador (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL REFERENCES filial(id),
            nome varchar(200) NOT NULL,
            email varchar(200) NOT NULL DEFAULT '',
            telefone varchar(40) NOT NULL DEFAULT '',
            ativo boolean NOT NULL DEFAULT true,
            criado_em timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE acompanhamento (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL REFERENCES filial(id),
            alvo_tipo varchar(40) NOT NULL,
            alvo_chave varchar(80) NOT NULL,
            observador_id uuid NOT NULL REFERENCES observador(id),
            UNIQUE (tenant_id, alvo_tipo, alvo_chave)
        );
        """
    )
    for tabela in ("observador", "acompanhamento"):
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
            GRANT SELECT, INSERT, UPDATE, DELETE ON {tabela} TO osb_app;
            """
        )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS acompanhamento; DROP TABLE IF EXISTS observador;")
