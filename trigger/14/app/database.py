import os
from pathlib import Path

from sqlalchemy import Boolean, Column, Float, Integer, String, create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

DATA_DIR = Path(os.getenv("DATA_DIR", "/data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
INTER_DIR = DATA_DIR / "inter_trigger_ti"
INTER_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "app.db"

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _sqlite_pragmas(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=FULL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class SupabaseConfig(Base):
    __tablename__ = "supabase_config"

    id = Column(Integer, primary_key=True, default=1)
    url = Column(String, nullable=False)
    service_role_key = Column(String, nullable=False)


DEFAULT_VALOR_IMPLANTACAO = 500.0
DEFAULT_VALOR_MENSALIDADE = 99.0


class RegisteredApp(Base):
    __tablename__ = "registered_apps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    app_id = Column(String, unique=True, nullable=False)
    valor_implantacao = Column(Float, nullable=False, default=DEFAULT_VALOR_IMPLANTACAO)
    valor_mensalidade = Column(Float, nullable=False, default=DEFAULT_VALOR_MENSALIDADE)


class InterBillingConfig(Base):
    """Credenciais Inter da Trigger TI (cobrança de licenças). Separado do Inter dos condomínios."""

    __tablename__ = "inter_billing_config"

    id = Column(Integer, primary_key=True, default=1)
    client_id = Column(String, nullable=False, default="")
    client_secret = Column(String, nullable=False, default="")
    cert_filename = Column(String, nullable=False, default="")
    key_filename = Column(String, nullable=False, default="")
    conta_corrente = Column(String, nullable=True)
    sandbox = Column(Boolean, nullable=False, default=False)
    scopes = Column(String, nullable=False, default="boleto-cobranca.read boleto-cobranca.write")
    webhook_public_url = Column(String, nullable=False, default="")
    webhook_token = Column(String, nullable=False, default="")
    valor_implantacao = Column(Float, nullable=False, default=500.0)
    valor_mensalidade = Column(Float, nullable=False, default=99.0)
    dias_vencimento = Column(Integer, nullable=False, default=7)
    pagador_endereco = Column(String, nullable=False, default="A informar")
    pagador_cidade = Column(String, nullable=False, default="Belo Horizonte")
    pagador_uf = Column(String, nullable=False, default="MG")
    pagador_cep = Column(String, nullable=False, default="30130000")


DEFAULT_APPS = ("estsankhya", "mycondominio")


def _registered_apps_column_names() -> set[str]:
    conn = engine.raw_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(registered_apps)")
        return {row[1] for row in cursor.fetchall()}
    finally:
        conn.close()


def migrate_registered_apps_pricing(db) -> None:
    """SQLite: adiciona colunas de preço por app em bases já existentes."""
    cols = _registered_apps_column_names()
    if not cols:
        return
    conn = engine.raw_connection()
    try:
        cursor = conn.cursor()
        if "valor_implantacao" not in cols:
            cursor.execute(
                "ALTER TABLE registered_apps "
                f"ADD COLUMN valor_implantacao REAL NOT NULL DEFAULT {DEFAULT_VALOR_IMPLANTACAO}"
            )
        if "valor_mensalidade" not in cols:
            cursor.execute(
                "ALTER TABLE registered_apps "
                f"ADD COLUMN valor_mensalidade REAL NOT NULL DEFAULT {DEFAULT_VALOR_MENSALIDADE}"
            )
        conn.commit()
    finally:
        conn.close()
    db.expire_all()


def seed_apps(db):
    for name in DEFAULT_APPS:
        exists = db.query(RegisteredApp).filter(RegisteredApp.app_id == name).first()
        if not exists:
            db.add(RegisteredApp(app_id=name))
    db.commit()


def get_registered_app_row(db, app_id: str) -> RegisteredApp | None:
    normalized = app_id.strip().lower()
    if not normalized:
        return None
    return db.query(RegisteredApp).filter(RegisteredApp.app_id == normalized).first()


def registered_app_to_dict(row: RegisteredApp) -> dict:
    return {
        "app_id": row.app_id,
        "valor_implantacao": row.valor_implantacao,
        "valor_mensalidade": row.valor_mensalidade,
    }


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        migrate_registered_apps_pricing(db)
        seed_apps(db)
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
