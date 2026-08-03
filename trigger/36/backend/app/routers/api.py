from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal, engine
from app.core.deps import CurrentUser, DbDep, require_perms, serialize_user
from app.core.security import create_access_token, hash_password, verify_password
from app.domain import rbac as R
from app.domain.etapas import CRITERIOS_ACEITE, etapas_dict
from app.domain.rbac import rbac_manifest, user_has_any, user_has_perm
from app.engine.calculator import (
    FaixaEntrada,
    OrcamentoEntrada,
    calcular_orcamento,
    resultado_to_dict,
)
from app.engine.catalog import load_catalog
from app.models import (
    Base,
    Baixa,
    CaStatus,
    Cobranca,
    CobrancaStatus,
    DocFiscalStatus,
    DocFiscalTipo,
    DocumentoFiscalSaida,
    Empresa,
    Entrega,
    EntregaStatus,
    FornecedorProdutoCodigo,
    HomologacaoResultado,
    ItemNatureza,
    MatrizCobrada,
    MovTipo,
    NaturezaGerencial,
    NecessidadeCompra,
    NecessidadeOrigem,
    NecessidadeStatus,
    NfeDuplicata,
    NfeImport,
    NfeItem,
    NfeStatus,
    BemPatrimonio,
    Devolucao,
    OpStatus,
    Orcamento,
    OrcamentoStatus,
    OrdemCompra,
    OrdemCompraStatus,
    OrdemProducao,
    Parceiro,
    Pedido,
    PedidoItem,
    PedidoStatus,
    Produto,
    ProdutoTipo,
    Role,
    Titulo,
    TituloStatus,
    TituloTipo,
    Unidade,
    User,
)
from app.schemas import (
    AcceptNfeIn,
    BaixaIn,
    DecidirIn,
    EmitirFiscalIn,
    EntregaIn,
    FaixaIn,
    HomologacaoUpdateIn,
    LiberarPedidoIn,
    LoginIn,
    MovimentoIn,
    NecessidadeIn,
    OrcamentoCalcularIn,
    OrdemCompraIn,
    OrdemCompraStatusIn,
    ParceiroIn,
    ProdutoIn,
    ReservaIn,
    SugerirLimiteIn,
    UserBlockIn,
    UserCreateIn,
    UserUpdateIn,
)
from app.services.codes import (
    apply_stock_move,
    dec,
    next_business_code,
    next_codigo,
    write_audit,
)
from app.services.credito import (
    DEFAULT_PARAMS,
    alerta_orcamento,
    avaliar_parceiro,
    contar_liberacoes_credito_mes,
    liberacao_ainda_valida,
    montar_snapshot_liberacao,
    sugerir_limite_inicial,
    validar_justificativa,
    verificar_pedido,
)
from app.services.external import (
    digits_only,
    lookup_cep,
    lookup_cest_por_ncm,
    lookup_cnpj,
    lookup_ncm,
    search_ncm,
    sugerir_ncm_por_largura,
)
from app.services.fiscal_tables import (
    ORIGENS_MERCADORIA,
    TIPO_ITEM_SPED,
    lookup_cfop,
    search_cfop,
    sugerir_fiscal_por_tipo,
)
from app.services.nfe_parser import NfeParseError, parse_nfe_xml
from app.services.purchasing import (
    _necessidade_out,
    _ordem_out,
    aplicar_recebimento_oc,
    criar_necessidade,
    criar_ordem_compra,
    gerar_necessidades_reposicao,
)
from app.services.stock import compute_measures
router = APIRouter()
FACAS_PATH = Path(__file__).resolve().parent.parent / "data" / "mapa_facas.json"


def _require(user: User, *perms: str, any_of: bool = False) -> None:
    """Autorização por perfil — ADMIN passa; demais precisam das perms do PER."""
    if user.role == Role.ADMIN:
        return
    ok = user_has_any(user.role, *perms) if any_of else user_has_perm(user.role, *perms)
    if not ok:
        raise HTTPException(403, "Sem permissão para esta operação (perfil insuficiente)")


def _assert_parceiro_write(user: User, tipos: list[str]) -> None:
    if user.role == Role.ADMIN:
        return
    tipos_u = {t.upper() for t in (tipos or [])}
    if "FORNECEDOR" in tipos_u and user_has_perm(user.role, R.PERM_PARCEIRO_COMERCIAL_FORNEC):
        return
    if tipos_u & {"CLIENTE", "VENDEDOR", "TRANSPORTADORA", "COLABORADOR"} and user_has_perm(
        user.role, R.PERM_PARCEIRO_COMERCIAL_CLIENTE
    ):
        return
    if user_has_perm(user.role, R.PERM_PARCEIRO_FISCAL):
        return
    raise HTTPException(403, "Perfil sem permissão para gravar este tipo de parceiro")


def _ensure_produto_columns() -> None:
    """create_all não altera tabelas existentes — garante colunas/enums novos."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    tables = set(insp.get_table_names())

    if "produtos" in tables:
        cols = {c["name"] for c in insp.get_columns("produtos")}
        wanted = {
            "cest": "VARCHAR(7)",
            "origem": "VARCHAR(1) DEFAULT '0'",
            "tipo_item_sped": "VARCHAR(2)",
            "csosn": "VARCHAR(3) DEFAULT '102'",
            "cfop_entrada": "VARCHAR(4)",
            "cfop_saida_dentro": "VARCHAR(4)",
            "cfop_saida_fora": "VARCHAR(4)",
            "ponto_pedido": "NUMERIC(14,4) DEFAULT 0",
            "lote_compra": "NUMERIC(14,4) DEFAULT 0",
            "saldo_reservado": "NUMERIC(14,4) DEFAULT 0",
        }
        statements = [
            f"ALTER TABLE produtos ADD COLUMN {name} {ctype}"
            for name, ctype in wanted.items()
            if name not in cols
        ]
        if statements:
            with engine.begin() as conn:
                for sql in statements:
                    conn.execute(text(sql))

    if "parceiros" in tables:
        cols = {c["name"] for c in insp.get_columns("parceiros")}
        wanted_p = {
            "credito_bloqueio_manual": "BOOLEAN DEFAULT FALSE",
            "credito_analisado_em": "TIMESTAMPTZ",
            "credito_validade_ate": "DATE",
            "credito_condicao_max_ddl": "INTEGER",
        }
        stmts = [
            f"ALTER TABLE parceiros ADD COLUMN {name} {ctype}"
            for name, ctype in wanted_p.items()
            if name not in cols
        ]
        if stmts:
            with engine.begin() as conn:
                for sql in stmts:
                    conn.execute(text(sql))

    if "pedidos" in tables:
        cols = {c["name"] for c in insp.get_columns("pedidos")}
        if "credito_liberacao" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE pedidos ADD COLUMN credito_liberacao JSON"))

    if "nfe_imports" in tables:
        cols = {c["name"] for c in insp.get_columns("nfe_imports")}
        if "ordem_compra_id" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE nfe_imports ADD COLUMN ordem_compra_id INTEGER"))

    if "users" in tables:
        cols = {c["name"] for c in insp.get_columns("users")}
        with engine.begin() as conn:
            if "bloqueado_em" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN bloqueado_em TIMESTAMPTZ"))
            if "bloqueado_motivo" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN bloqueado_motivo VARCHAR(255)"))
            # Enum nativo PostgreSQL: adiciona FISCAL se faltar
            try:
                conn.execute(text("ALTER TYPE role ADD VALUE IF NOT EXISTS 'FISCAL'"))
            except Exception:
                pass  # SQLite / tipo varchar / já existe com outro nome

    # MovTipo: novos valores SAIDA_VENDA / ENTRADA_DEVOLUCAO
    for enum_name in ("movtipo", "mov_tipo"):
        try:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS 'SAIDA_VENDA'"))
                conn.execute(text(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS 'ENTRADA_DEVOLUCAO'"))
            break
        except Exception:
            continue

    if "estoque_movimentos" in tables:
        cols = {c["name"] for c in insp.get_columns("estoque_movimentos")}
        wanted_m = {
            "op_id": "INTEGER",
            "pedido_id": "INTEGER",
            "devolucao_id": "INTEGER",
        }
        stmts = [
            f"ALTER TABLE estoque_movimentos ADD COLUMN {name} {ctype}"
            for name, ctype in wanted_m.items()
            if name not in cols
        ]
        if stmts:
            with engine.begin() as conn:
                for sql in stmts:
                    conn.execute(text(sql))


DEMO_USERS = [
    ("comercial@rlp.com.br", "Comercial Demo", Role.COMERCIAL),
    ("financeiro@rlp.com.br", "Financeiro Demo", Role.FINANCEIRO),
    ("fiscal@rlp.com.br", "Fiscal Demo", Role.FISCAL),
    ("producao@rlp.com.br", "Produção Demo", Role.PRODUCAO),
    ("compras@rlp.com.br", "Compras Demo", Role.COMPRAS),
    ("expedicao@rlp.com.br", "Expedição Demo", Role.EXPEDICAO),
    ("consulta@rlp.com.br", "Consulta Demo", Role.CONSULTA),
]


# =============================================================================
# bootstrap / auth / meta
# =============================================================================


def seed_if_empty() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_produto_columns()
    db = SessionLocal()
    try:
        settings = get_settings()
        emp = db.query(Empresa).filter(Empresa.codigo == settings.empresa_codigo).first()
        if not emp:
            emp = Empresa(
                codigo=settings.empresa_codigo,
                cnpj=settings.empresa_cnpj,
                razao_social=settings.empresa_razao,
                nome_fantasia="RLP Etiquetas",
                uf="MG",
            )
            db.add(emp)
            db.flush()
            # EMP-00002 presente mas sem venda
            db.add(
                Empresa(
                    codigo="EMP-00002",
                    cnpj="58820046000137",
                    razao_social="RLP ETIQUETAS AUTO ADESIVOS LTDA FILIAL",
                    nome_fantasia="RLP Filial",
                    vende=False,
                )
            )

        admin = db.query(User).filter(User.email == settings.admin_email).first()
        if not admin:
            db.add(
                User(
                    empresa_id=emp.id,
                    email=settings.admin_email,
                    nome="Administrador",
                    password_hash=hash_password(settings.admin_password),
                    role=Role.ADMIN,
                )
            )

        # Usuários demo por perfil (senha Demo@123) — homologação da matriz RBAC/SoD
        demo_pwd = hash_password("Demo@123")
        for email, nome, role in DEMO_USERS:
            if not db.query(User).filter(User.email == email).first():
                db.add(
                    User(
                        empresa_id=emp.id,
                        email=email,
                        nome=nome,
                        password_hash=demo_pwd,
                        role=role,
                    )
                )

        if db.query(Parceiro).count() == 0:
            from datetime import timedelta

            db.add(
                Parceiro(
                    empresa_id=emp.id,
                    codigo="0001",
                    tipos=["CLIENTE"],
                    cnpj_cpf="12345678000199",
                    razao_social="CLIENTE DEMONSTRACAO LTDA",
                    nome_fantasia="Cliente Demo",
                    municipio="Uberlândia",
                    uf="MG",
                    limite_credito=Decimal("50000"),
                    credito_analisado_em=datetime.now(timezone.utc),
                    credito_validade_ate=datetime.utcnow().date() + timedelta(days=365),
                    credito_condicao_max_ddl=42,
                )
            )
            db.add(
                Parceiro(
                    empresa_id=emp.id,
                    codigo="0002",
                    tipos=["FORNECEDOR"],
                    cnpj_cpf="11222333000181",
                    razao_social="FORNECEDOR DE PAPEL LTDA",
                    nome_fantasia="Papéis MG",
                    municipio="Uberlândia",
                    uf="MG",
                )
            )

        if db.query(Produto).count() == 0:
            db.add(
                Produto(
                    empresa_id=emp.id,
                    codigo="0001",
                    sku="PAP-COUCHE-90",
                    descricao="Papel Couchê 90g",
                    tipo=ProdutoTipo.INSUMO,
                    unidade=Unidade.M2,
                    grupo="COUCHE",
                    ncm="48114110",
                    largura_mm=Decimal("330"),
                    comprimento_m=Decimal("1000"),
                    estoque_minimo=Decimal("50"),
                    ponto_pedido=Decimal("80"),
                    lote_compra=Decimal("100"),
                )
            )
            db.add(
                Produto(
                    empresa_id=emp.id,
                    codigo="0002",
                    sku="ETQ-SERVICO",
                    descricao="Serviço impressão etiqueta flexográfica",
                    tipo=ProdutoTipo.SERVICO,
                    unidade=Unidade.UN,
                    controla_estoque=False,
                )
            )

        for ca in CRITERIOS_ACEITE:
            exists = (
                db.query(HomologacaoResultado)
                .filter(
                    HomologacaoResultado.empresa_id == emp.id,
                    HomologacaoResultado.criterio_id == ca["id"],
                )
                .first()
            )
            if not exists:
                db.add(
                    HomologacaoResultado(
                        empresa_id=emp.id,
                        criterio_id=ca["id"],
                        status=CaStatus.PENDENTE,
                    )
                )

        from app.services.naturezas import seed_naturezas
        from app.services.jornada import seed_jornada_demo

        seed_naturezas(db)
        # estoque inicial mínimo no insumo se saldo zerado (mesmo com pedidos)
        mp0 = (
            db.query(Produto)
            .filter(
                Produto.empresa_id == emp.id,
                Produto.tipo == ProdutoTipo.INSUMO,
                Produto.controla_estoque.is_(True),
            )
            .first()
        )
        if mp0 and (mp0.saldo_qtd or 0) == 0:
            apply_stock_move(
                db,
                empresa_id=emp.id,
                produto=mp0,
                tipo=MovTipo.ENTRADA_MANUAL,
                quantidade=Decimal("500"),
                custo_unitario=Decimal("2.50"),
                documento_ref="SEED-MP",
                observacao="Saldo inicial HML",
            )
        seed_jornada_demo(db, emp)

        db.commit()
    finally:
        db.close()


@router.get("/health")
def health():
    settings = get_settings()
    return {
        "ok": True,
        "app": settings.app_name,
        "environment": settings.environment,
        "simular_integracoes": settings.simular_integracoes,
    }


@router.get("/meta/etapas")
def meta_etapas():
    return {"etapas": etapas_dict(), "fluxo": "ORC→PED→OP/OS→NF+TIT→COB→ENT→BX"}


@router.get("/meta/rbac")
def meta_rbac(_user: CurrentUser):
    """Matriz de perfis × permissões (transparência / CA-12)."""
    return rbac_manifest()


@router.post("/auth/login")
def login(body: LoginIn, db: DbDep):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Credenciais inválidas")
    if not user.ativo:
        raise HTTPException(401, "Usuário bloqueado")
    token = create_access_token(user.email, {"role": user.role.value, "empresa_id": user.empresa_id})
    return {"access_token": token, "token_type": "bearer", "user": serialize_user(user)}


@router.get("/auth/me")
def me(user: CurrentUser):
    return serialize_user(user)


# =============================================================================
# usuários (ADMIN) — UC-PLT-001/002/008
# =============================================================================


@router.get("/usuarios")
def list_usuarios(
    db: DbDep,
    user: Annotated[User, Depends(require_perms(R.PERM_USUARIOS))],
):
    rows = (
        db.query(User)
        .filter(User.empresa_id == user.empresa_id)
        .order_by(User.email)
        .all()
    )
    return [serialize_user(u) for u in rows]


@router.post("/usuarios", status_code=201)
def create_usuario(
    body: UserCreateIn,
    db: DbDep,
    user: Annotated[User, Depends(require_perms(R.PERM_USUARIOS))],
):
    email = body.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "E-mail já cadastrado")
    try:
        role = Role(body.role)
    except ValueError as exc:
        raise HTTPException(400, "Perfil inválido") from exc
    # ADMIN operacional: aviso soft — permite criar, mas estudo recomenda não acumular rotina
    u = User(
        empresa_id=user.empresa_id,
        email=email,
        nome=body.nome.strip(),
        password_hash=hash_password(body.password),
        role=role,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    write_audit(
        db,
        empresa_id=user.empresa_id,
        user=user,
        acao="CREATE",
        entidade="User",
        entidade_id=str(u.id),
        detalhe={"email": email, "role": role.value},
    )
    db.commit()
    return serialize_user(u)


@router.put("/usuarios/{uid}")
def update_usuario(
    uid: int,
    body: UserUpdateIn,
    db: DbDep,
    user: Annotated[User, Depends(require_perms(R.PERM_USUARIOS))],
):
    u = db.query(User).filter(User.id == uid, User.empresa_id == user.empresa_id).first()
    if not u:
        raise HTTPException(404, "Usuário não encontrado")
    before = {"nome": u.nome, "role": u.role.value}
    if body.nome is not None:
        u.nome = body.nome.strip()
    if body.role is not None:
        u.role = Role(body.role)
    if body.password:
        u.password_hash = hash_password(body.password)
    db.commit()
    db.refresh(u)
    write_audit(
        db,
        empresa_id=user.empresa_id,
        user=user,
        acao="UPDATE",
        entidade="User",
        entidade_id=str(uid),
        detalhe={"de": before, "para": {"nome": u.nome, "role": u.role.value}},
    )
    db.commit()
    return serialize_user(u)


@router.post("/usuarios/{uid}/bloquear")
def bloquear_usuario(
    uid: int,
    body: UserBlockIn,
    db: DbDep,
    user: Annotated[User, Depends(require_perms(R.PERM_USUARIOS))],
):
    """Bloqueia/reativa sem apagar (UC-PLT-008)."""
    u = db.query(User).filter(User.id == uid, User.empresa_id == user.empresa_id).first()
    if not u:
        raise HTTPException(404, "Usuário não encontrado")
    if u.id == user.id and not body.ativo:
        raise HTTPException(400, "Não é possível bloquear o próprio usuário logado")
    u.ativo = body.ativo
    if body.ativo:
        u.bloqueado_em = None
        u.bloqueado_motivo = None
    else:
        u.bloqueado_em = datetime.now(timezone.utc)
        u.bloqueado_motivo = (body.motivo or "Desligamento / bloqueio administrativo").strip()
    db.commit()
    db.refresh(u)
    write_audit(
        db,
        empresa_id=user.empresa_id,
        user=user,
        acao="BLOCK" if not body.ativo else "UNBLOCK",
        entidade="User",
        entidade_id=str(uid),
        detalhe={"ativo": u.ativo, "motivo": u.bloqueado_motivo},
    )
    db.commit()
    return serialize_user(u)


# =============================================================================
# lookups
# =============================================================================


@router.get("/lookups/cnpj/{cnpj}")
async def api_cnpj(cnpj: str, user: CurrentUser):
    return await lookup_cnpj(cnpj)


@router.get("/lookups/cep/{cep}")
async def api_cep(cep: str, user: CurrentUser):
    return await lookup_cep(cep)


@router.get("/lookups/ncm")
async def api_ncm_search(user: CurrentUser, search: str = ""):
    return await search_ncm(search)


@router.get("/lookups/ncm/codigo/{codigo}")
async def api_ncm_codigo(codigo: str, user: CurrentUser):
    return await lookup_ncm(codigo)


@router.get("/lookups/cest")
def api_cest(user: CurrentUser, ncm: str = ""):
    return lookup_cest_por_ncm(ncm)


@router.get("/lookups/ncm-sugestao-largura")
def api_ncm_sugestao_largura(
    user: CurrentUser,
    largura_mm: float,
    material: str = "PP",
):
    return sugerir_ncm_por_largura(largura_mm, material=material)


@router.get("/lookups/cfop")
def api_cfop_search(user: CurrentUser, search: str = "", tipo: str | None = None):
    return search_cfop(search, tipo=tipo)


@router.get("/lookups/cfop/{codigo}")
def api_cfop_codigo(codigo: str, user: CurrentUser):
    return lookup_cfop(codigo)


@router.get("/lookups/fiscal-produto")
def api_fiscal_produto(user: CurrentUser, tipo: str = "INSUMO"):
    return sugerir_fiscal_por_tipo(tipo)


@router.get("/lookups/origens")
def api_origens(user: CurrentUser):
    return ORIGENS_MERCADORIA


@router.get("/lookups/tipos-item-sped")
def api_tipos_item_sped(user: CurrentUser):
    return TIPO_ITEM_SPED


@router.get("/catalog")
def api_catalog(user: CurrentUser):
    cat = load_catalog()
    return {
        "papeis": sorted(cat.papel.keys()),
        "acabamentos": sorted(cat.acabamentos.keys()),
        "tubetes": sorted(cat.tubete.keys()),
        "maquinas": list(cat.maquinas),
        "maquinas_roda_servico": list(cat.maquinas_roda_servico),
        "tipos_troca_produto": sorted(cat.hora_parada_h.keys()),
        "imposto_pct_default": 16.0,
    }


@router.get("/facas")
def api_facas(
    user: CurrentUser,
    q: str | None = None,
    medida: str | None = None,
    maquina: str | None = None,
    formato: str | None = None,
    completas: bool = False,
    so_completas: bool = False,
):
    """
    Catálogo MAPA DE FACAS 20260715 ATUAL (mesmo contrato do trigger/29).
    Ao escolher a faca: medida, puxada, Z, formato e REP vêm juntos.
    REDONDA: medida = diâmetro (Ø).
    """
    import json

    data = json.loads(FACAS_PATH.read_text(encoding="utf-8"))
    all_facas = data if isinstance(data, list) else data.get("facas", data.get("items", []))
    facas = list(all_facas)

    only_complete = completas or so_completas
    if only_complete:
        facas = [f for f in facas if f.get("completa", True)]

    if medida:
        m = medida.strip().upper().replace(" ", "")
        facas = [
            f
            for f in facas
            if (f.get("medida") or "").upper().replace(" ", "") == m
            or (f.get("tamanho_raw") or "").upper().replace(" ", "") == m
        ]
    if maquina:
        mq = maquina.strip().upper()
        facas = [
            f
            for f in facas
            if (f.get("maquina_catalogo") or "").upper() == mq
            or (f.get("maquina_origem") or "").upper() == mq
        ]
    if formato:
        fo = formato.strip().upper()
        facas = [
            f
            for f in facas
            if fo in (f.get("formato") or "").upper() or fo in (f.get("faca") or "").upper()
        ]
    if q:
        qq = q.strip().upper()
        facas = [
            f
            for f in facas
            if qq in (f.get("label") or "").upper()
            or qq in (f.get("medida") or "").upper()
            or qq in (f.get("tamanho_raw") or "").upper()
            or qq in (f.get("formato") or "").upper()
            or qq in (f.get("faca") or "").upper()
            or qq in (f.get("cliente_nota") or "").upper()
            or qq in (f.get("maquina_catalogo") or "").upper()
            or qq in (f.get("maquina_origem") or "").upper()
            or qq in (f.get("fornecedor") or "").upper()
            or qq in (f.get("conjugada") or "").upper()
        ]

    formatos = sorted({(f.get("formato") or "").strip() for f in all_facas if f.get("formato")})
    return {
        "total": len(facas),
        "items": facas[:800],
        "formatos": formatos,
        "meta": {
            "fonte": "MAPA DE FACAS 20260715 ATUAL",
            "pivot": "MAPA_DE_FACAS",
            "nota_redonda": "Formato REDONDA: TAMANHO = diâmetro (Ø).",
            "nota_rep": "REP = REPETIÇÃO.",
            "nota_manual": "Facas incompletas exigem puxada/Z manuais.",
        },
    }


# =============================================================================
# parceiros / produtos
# =============================================================================


def _analise_parceiro(db: Session, p: Parceiro, *, excluir_pedido_id: int | None = None):
    return avaliar_parceiro(
        db,
        empresa_id=p.empresa_id,
        parceiro_id=p.id,
        limite=p.limite_credito,
        bloqueio_manual=bool(getattr(p, "credito_bloqueio_manual", False)),
        credito_validade_ate=getattr(p, "credito_validade_ate", None),
        excluir_pedido_id=excluir_pedido_id,
    )


def _parceiro_out(p: Parceiro, db: Session | None = None, *, com_credito: bool = False) -> dict:
    out = {
        "id": p.id,
        "codigo": p.codigo,
        "tipos": p.tipos or [],
        "cnpj_cpf": p.cnpj_cpf,
        "razao_social": p.razao_social,
        "nome_fantasia": p.nome_fantasia,
        "ie": p.ie,
        "email": p.email,
        "telefone": p.telefone,
        "cep": p.cep,
        "logradouro": p.logradouro,
        "numero": p.numero,
        "complemento": p.complemento,
        "bairro": p.bairro,
        "municipio": p.municipio,
        "uf": p.uf,
        "ibge": p.ibge,
        "limite_credito": p.limite_credito,
        "credito_bloqueio_manual": bool(getattr(p, "credito_bloqueio_manual", False)),
        "credito_analisado_em": getattr(p, "credito_analisado_em", None),
        "credito_validade_ate": getattr(p, "credito_validade_ate", None),
        "credito_condicao_max_ddl": getattr(p, "credito_condicao_max_ddl", None),
        "comissao_pct": p.comissao_pct,
        "observacao": p.observacao,
        "ativo": p.ativo,
    }
    if com_credito and db is not None and "CLIENTE" in (p.tipos or []):
        out["credito"] = _analise_parceiro(db, p).to_dict(incluir_titulos=False)
    return out


@router.get("/parceiros")
def list_parceiros(
    db: DbDep,
    user: CurrentUser,
    tipo: str | None = None,
    q: str | None = None,
    com_credito: bool = False,
):
    query = db.query(Parceiro).filter(Parceiro.empresa_id == user.empresa_id)
    if q:
        like = f"%{q}%"
        query = query.filter(Parceiro.razao_social.ilike(like) | Parceiro.codigo.ilike(like))
    rows = query.order_by(Parceiro.codigo).limit(500).all()
    if tipo:
        rows = [r for r in rows if tipo in (r.tipos or [])]
    return [_parceiro_out(r, db, com_credito=com_credito) for r in rows]


@router.get("/parceiros/{pid}/credito")
def get_parceiro_credito(pid: int, db: DbDep, user: CurrentUser):
    p = db.query(Parceiro).filter(Parceiro.id == pid, Parceiro.empresa_id == user.empresa_id).first()
    if not p:
        raise HTTPException(404, "Parceiro não encontrado")
    return _analise_parceiro(db, p).to_dict()


@router.post("/parceiros/{pid}/credito/sugerir-limite")
def sugerir_limite_parceiro(pid: int, body: SugerirLimiteIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_CREDITO)
    p = db.query(Parceiro).filter(Parceiro.id == pid, Parceiro.empresa_id == user.empresa_id).first()
    if not p:
        raise HTTPException(404, "Parceiro não encontrado")
    sugestao = sugerir_limite_inicial(
        body.compra_mensal_estimada,
        restricao_bureau=body.restricao_bureau,
    )
    return {
        "parceiro_id": p.id,
        "limite_atual": p.limite_credito,
        "sugestao": sugestao,
        "regua": "1× compra mensal estimada, teto R$ 5.000 sem histórico (§3.3)",
        "restricao_bureau": body.restricao_bureau,
    }


@router.post("/parceiros", status_code=201)
def create_parceiro(body: ParceiroIn, db: DbDep, user: CurrentUser):
    _assert_parceiro_write(user, body.tipos)
    if body.limite_credito and body.limite_credito > 0:
        _require(user, R.PERM_CREDITO)
    codigo = next_codigo(db, user.empresa_id, Parceiro)
    data = body.model_dump()
    if data.get("limite_credito") and Decimal(str(data["limite_credito"])) > 0:
        data["credito_analisado_em"] = datetime.now(timezone.utc)
        if not data.get("credito_validade_ate"):
            from datetime import timedelta

            data["credito_validade_ate"] = datetime.utcnow().date() + timedelta(days=365)
    p = Parceiro(empresa_id=user.empresa_id, codigo=codigo, **data)
    db.add(p)
    write_audit(
        db,
        empresa_id=user.empresa_id,
        user=user,
        acao="CREATE",
        entidade="Parceiro",
        detalhe={"limite_credito": str(body.limite_credito)},
    )
    db.commit()
    db.refresh(p)
    return _parceiro_out(p, db, com_credito=True)


@router.put("/parceiros/{pid}")
def update_parceiro(pid: int, body: ParceiroIn, db: DbDep, user: CurrentUser):
    p = db.query(Parceiro).filter(Parceiro.id == pid, Parceiro.empresa_id == user.empresa_id).first()
    if not p:
        raise HTTPException(404, "Parceiro não encontrado")
    limite_antes = Decimal(str(p.limite_credito or 0))
    credito_mudou = Decimal(str(body.limite_credito)) != limite_antes
    bloqueio_mudou = bool(body.credito_bloqueio_manual) != bool(
        getattr(p, "credito_bloqueio_manual", False)
    )
    _assert_parceiro_write(user, body.tipos)
    if credito_mudou or bloqueio_mudou:
        _require(user, R.PERM_CREDITO)
    for k, v in body.model_dump().items():
        setattr(p, k, v)
    if credito_mudou and Decimal(str(body.limite_credito)) > 0:
        p.credito_analisado_em = datetime.now(timezone.utc)
        if not p.credito_validade_ate:
            from datetime import timedelta

            p.credito_validade_ate = datetime.utcnow().date() + timedelta(days=365)
    write_audit(
        db,
        empresa_id=user.empresa_id,
        user=user,
        acao="ALTERAR_LIMITE_CREDITO" if credito_mudou else "UPDATE",
        entidade="Parceiro",
        entidade_id=str(pid),
        detalhe={
            "limite_antes": str(limite_antes),
            "limite_depois": str(body.limite_credito),
            "bloqueio_manual": body.credito_bloqueio_manual,
        },
    )
    db.commit()
    db.refresh(p)
    return _parceiro_out(p, db, com_credito=True)



def _produto_out(p: Produto) -> dict:
    return {
        "id": p.id,
        "codigo": p.codigo,
        "sku": p.sku,
        "descricao": p.descricao,
        "tipo": p.tipo.value,
        "unidade": p.unidade.value,
        "grupo": p.grupo,
        "ncm": p.ncm,
        "cest": p.cest,
        "origem": p.origem,
        "tipo_item_sped": p.tipo_item_sped,
        "csosn": p.csosn,
        "cfop_entrada": p.cfop_entrada,
        "cfop_saida_dentro": p.cfop_saida_dentro,
        "cfop_saida_fora": p.cfop_saida_fora,
        "largura_mm": p.largura_mm,
        "comprimento_m": p.comprimento_m,
        "controla_estoque": p.controla_estoque,
        "estoque_minimo": p.estoque_minimo,
        "ponto_pedido": p.ponto_pedido,
        "lote_compra": p.lote_compra,
        "custo_medio": p.custo_medio,
        "saldo_qtd": p.saldo_qtd,
        "saldo_reservado": p.saldo_reservado,
        "saldo_disponivel": p.saldo_disponivel,
        "saldo_valor": p.saldo_valor,
        "limiar_reposicao": p.limiar_reposicao,
        "observacao": p.observacao,
        "ativo": p.ativo,
    }


def _norm_fiscal_code(value: str | None, size: int) -> str | None:
    if value is None or str(value).strip() == "":
        return None
    d = digits_only(str(value))
    if not d:
        return None
    if len(d) != size:
        raise HTTPException(400, f"Código fiscal deve ter {size} dígitos (recebido {len(d)}).")
    return d


def _produto_fiscal_from_body(data: dict) -> dict:
    return {
        "ncm": _norm_fiscal_code(data.get("ncm"), 8),
        "cest": _norm_fiscal_code(data.get("cest"), 7),
        "origem": _norm_fiscal_code(data.get("origem"), 1) or "0",
        "tipo_item_sped": _norm_fiscal_code(data.get("tipo_item_sped"), 2),
        "csosn": _norm_fiscal_code(data.get("csosn"), 3) or "102",
        "cfop_entrada": _norm_fiscal_code(data.get("cfop_entrada"), 4),
        "cfop_saida_dentro": _norm_fiscal_code(data.get("cfop_saida_dentro"), 4),
        "cfop_saida_fora": _norm_fiscal_code(data.get("cfop_saida_fora"), 4),
    }


@router.get("/produtos")
def list_produtos(db: DbDep, user: CurrentUser, tipo: str | None = None, q: str | None = None):
    query = db.query(Produto).filter(Produto.empresa_id == user.empresa_id)
    if tipo:
        query = query.filter(Produto.tipo == ProdutoTipo(tipo))
    if q:
        like = f"%{q}%"
        query = query.filter(Produto.descricao.ilike(like) | Produto.codigo.ilike(like))
    return [_produto_out(r) for r in query.order_by(Produto.codigo).limit(500).all()]


@router.post("/produtos", status_code=201)
def create_produto(body: ProdutoIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_PRODUTO_WRITE, R.PERM_PRODUTO_FISCAL, any_of=True)
    codigo = next_codigo(db, user.empresa_id, Produto)
    data = body.model_dump()
    fiscal = _produto_fiscal_from_body(data)
    # se tipo SPED/CFOP vazios, aplica sugestão do estudo
    if not fiscal["tipo_item_sped"] or not any(
        [fiscal["cfop_entrada"], fiscal["cfop_saida_dentro"], fiscal["cfop_saida_fora"]]
    ):
        sug = sugerir_fiscal_por_tipo(data["tipo"])
        fiscal["tipo_item_sped"] = fiscal["tipo_item_sped"] or sug["tipo_item_sped"]
        fiscal["origem"] = fiscal["origem"] or sug["origem"]
        fiscal["csosn"] = fiscal["csosn"] or sug["csosn"]
        for key in ("cfop_entrada", "cfop_saida_dentro", "cfop_saida_fora"):
            if not fiscal[key] and sug.get(key) and sug[key].get("codigo"):
                fiscal[key] = sug[key]["codigo"]
    p = Produto(
        empresa_id=user.empresa_id,
        codigo=codigo,
        sku=data["sku"],
        descricao=data["descricao"],
        tipo=ProdutoTipo(data["tipo"]),
        unidade=Unidade(data["unidade"]),
        grupo=data["grupo"],
        **fiscal,
        largura_mm=data["largura_mm"],
        comprimento_m=data["comprimento_m"],
        controla_estoque=data["controla_estoque"],
        estoque_minimo=data["estoque_minimo"],
        ponto_pedido=data.get("ponto_pedido") or Decimal("0"),
        lote_compra=data.get("lote_compra") or Decimal("0"),
        observacao=data["observacao"],
        ativo=data["ativo"],
    )
    db.add(p)
    write_audit(db, empresa_id=user.empresa_id, user=user, acao="CREATE", entidade="Produto")
    db.commit()
    db.refresh(p)
    return _produto_out(p)


@router.put("/produtos/{pid}")
def update_produto(pid: int, body: ProdutoIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_PRODUTO_WRITE, R.PERM_PRODUTO_FISCAL, any_of=True)
    p = db.query(Produto).filter(Produto.id == pid, Produto.empresa_id == user.empresa_id).first()
    if not p:
        raise HTTPException(404, "Produto não encontrado")
    data = body.model_dump()
    fiscal = _produto_fiscal_from_body(data)
    p.sku = data["sku"]
    p.descricao = data["descricao"]
    p.tipo = ProdutoTipo(data["tipo"])
    p.unidade = Unidade(data["unidade"])
    p.grupo = data["grupo"]
    for k, v in fiscal.items():
        setattr(p, k, v)
    p.largura_mm = data["largura_mm"]
    p.comprimento_m = data["comprimento_m"]
    p.controla_estoque = data["controla_estoque"]
    p.estoque_minimo = data["estoque_minimo"]
    p.ponto_pedido = data.get("ponto_pedido") or Decimal("0")
    p.lote_compra = data.get("lote_compra") or Decimal("0")
    p.observacao = data["observacao"]
    p.ativo = data["ativo"]
    db.commit()
    db.refresh(p)
    return _produto_out(p)


# =============================================================================
# orçamentos
# =============================================================================


def _entrada_from_body(body: OrcamentoCalcularIn, matriz_ja: bool) -> OrcamentoEntrada:
    return OrcamentoEntrada(
        cliente=body.cliente,
        medida=body.medida,
        largura_cm=body.largura_cm,
        puxada_cm=body.puxada_cm,
        cores=body.cores,
        papel=body.papel,
        acabamento=body.acabamento,
        modelos=body.modelos,
        colunas=body.colunas,
        etiq_por_rolo=body.etiq_por_rolo,
        tubete=body.tubete,
        z=body.z,
        maquina=body.maquina,
        maquina_roda_servico=body.maquina_roda_servico,
        imposto_pct=body.imposto_pct,
        matriz=body.matriz,
        coluna_rebobinacao=body.coluna_rebobinacao,
        tipo_troca_produto=body.tipo_troca_produto,
        rpm=body.rpm,
        faixas=[FaixaEntrada(quantidade=f.quantidade, comissao_pct=f.comissao_pct) for f in body.faixas],
        overrides=body.overrides,
        matriz_ja_cobrada=matriz_ja,
    )


def _orc_editavel(status: OrcamentoStatus) -> bool:
    """Pré-envio: RASCUNHO/CALCULADO. Após ENVIADO o snapshot fica imutável (nova versão = novo ORC)."""
    return status in (OrcamentoStatus.RASCUNHO, OrcamentoStatus.CALCULADO)


def _orc_out(o: Orcamento, db=None) -> dict:
    pedido = None
    credito_alerta = None
    if db is not None:
        ped = db.query(Pedido).filter(Pedido.orcamento_id == o.id).first()
        if ped:
            pedido = {"id": ped.id, "codigo": ped.codigo, "status": ped.status.value}
        if o.parceiro_id:
            p = db.query(Parceiro).filter(Parceiro.id == o.parceiro_id).first()
            if p:
                valor_est = None
                faixas = (o.result_snapshot or {}).get("faixas") or []
                if o.faixa_escolhida is not None and 0 <= o.faixa_escolhida < len(faixas):
                    valor_est = faixas[o.faixa_escolhida].get("valor_total")
                elif faixas:
                    valor_est = faixas[0].get("valor_total")
                credito_alerta = alerta_orcamento(_analise_parceiro(db, p), valor_est)
    return {
        "id": o.id,
        "codigo": o.codigo,
        "parceiro_id": o.parceiro_id,
        "cliente_nome": o.cliente_nome,
        "status": o.status.value,
        "versao": o.versao,
        "editavel": _orc_editavel(o.status),
        "input_snapshot": o.input_snapshot,
        "result_snapshot": o.result_snapshot,
        "chave_matriz": o.chave_matriz,
        "cobra_matriz": o.cobra_matriz,
        "valor_matriz": o.valor_matriz,
        "prazo_entrega_dias": o.prazo_entrega_dias,
        "validade_dias": o.validade_dias,
        "tolerancia_qtd_pct": o.tolerancia_qtd_pct,
        "faixa_escolhida": o.faixa_escolhida,
        "observacao": o.observacao,
        "aprovado_em": o.aprovado_em,
        "created_at": o.created_at,
        "updated_at": o.updated_at,
        "pedido": pedido,
        "credito_alerta": credito_alerta,
    }


def _matriz_ja_cobrada(db, empresa_id: int, body: OrcamentoCalcularIn) -> bool:
    from app.engine.matrix_key import chave_matriz

    tmp = _entrada_from_body(body, False)
    ck = chave_matriz(tmp.cliente, tmp.medida, tmp.z, tmp.cores, tmp.largura_cm, tmp.colunas)
    return (
        db.query(MatrizCobrada)
        .filter(MatrizCobrada.empresa_id == empresa_id, MatrizCobrada.chave_matriz == ck)
        .first()
        is not None
    )


def _apply_calculo_orcamento(o: Orcamento, body: OrcamentoCalcularIn, result: dict) -> None:
    o.parceiro_id = body.parceiro_id
    o.cliente_nome = body.cliente
    o.status = OrcamentoStatus.CALCULADO
    o.input_snapshot = body.model_dump(mode="json")
    o.result_snapshot = result
    o.chave_matriz = result["chave_matriz"]
    o.cobra_matriz = result["cobra_matriz"]
    o.valor_matriz = dec(result["valor_matriz"])
    o.prazo_entrega_dias = body.prazo_entrega_dias
    o.validade_dias = body.validade_dias
    o.tolerancia_qtd_pct = dec(body.tolerancia_qtd_pct, "0.0001")
    o.observacao = body.observacao


@router.post("/orcamentos/calcular")
def calcular(body: OrcamentoCalcularIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_ORC_WRITE)
    if not body.faixas:
        raise HTTPException(400, "Informe ao menos uma faixa de quantidade")
    ja = _matriz_ja_cobrada(db, user.empresa_id, body)
    res = calcular_orcamento(_entrada_from_body(body, ja))
    return resultado_to_dict(res)


@router.get("/orcamentos")
def list_orcamentos(db: DbDep, user: CurrentUser, status: str | None = None):
    q = db.query(Orcamento).filter(Orcamento.empresa_id == user.empresa_id)
    if status:
        q = q.filter(Orcamento.status == OrcamentoStatus(status))
    return [_orc_out(o) for o in q.order_by(Orcamento.id.desc()).limit(200).all()]


@router.get("/orcamentos/{oid}")
def get_orcamento(oid: int, db: DbDep, user: CurrentUser):
    o = db.query(Orcamento).filter(Orcamento.id == oid, Orcamento.empresa_id == user.empresa_id).first()
    if not o:
        raise HTTPException(404, "Orçamento não encontrado")
    return _orc_out(o, db)


@router.post("/orcamentos", status_code=201)
def create_orcamento(body: OrcamentoCalcularIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_ORC_WRITE)
    if not body.faixas:
        raise HTTPException(400, "Informe ao menos uma faixa")
    ja = _matriz_ja_cobrada(db, user.empresa_id, body)
    res = calcular_orcamento(_entrada_from_body(body, ja))
    result = resultado_to_dict(res)
    codigo = next_business_code(db, "ORC", Orcamento)
    o = Orcamento(
        empresa_id=user.empresa_id,
        codigo=codigo,
        parceiro_id=body.parceiro_id,
        cliente_nome=body.cliente,
        status=OrcamentoStatus.CALCULADO,
        versao=1,
        input_snapshot=body.model_dump(mode="json"),
        result_snapshot=result,
        chave_matriz=result["chave_matriz"],
        cobra_matriz=result["cobra_matriz"],
        valor_matriz=dec(result["valor_matriz"]),
        prazo_entrega_dias=body.prazo_entrega_dias,
        validade_dias=body.validade_dias,
        tolerancia_qtd_pct=dec(body.tolerancia_qtd_pct, "0.0001"),
        observacao=body.observacao,
    )
    db.add(o)
    write_audit(db, empresa_id=user.empresa_id, user=user, acao="CREATE", entidade="Orcamento", detalhe={"codigo": codigo})
    db.commit()
    db.refresh(o)
    return _orc_out(o, db)


@router.put("/orcamentos/{oid}")
def update_orcamento(oid: int, body: OrcamentoCalcularIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_ORC_WRITE)
    """Recalcula e atualiza snapshot — só pré-envio (RASCUNHO/CALCULADO). Após ENVIADO: imutável."""
    o = db.query(Orcamento).filter(Orcamento.id == oid, Orcamento.empresa_id == user.empresa_id).first()
    if not o:
        raise HTTPException(404, "Orçamento não encontrado")
    if not _orc_editavel(o.status):
        raise HTTPException(
            400,
            f"Orçamento {o.status.value} não pode ser editado. Após envio o snapshot fica travado "
            "(gere um novo ORC se precisar alterar).",
        )
    if not body.faixas:
        raise HTTPException(400, "Informe ao menos uma faixa")
    ja = _matriz_ja_cobrada(db, user.empresa_id, body)
    result = resultado_to_dict(calcular_orcamento(_entrada_from_body(body, ja)))
    _apply_calculo_orcamento(o, body, result)
    o.versao = (o.versao or 1) + 1
    write_audit(
        db,
        empresa_id=user.empresa_id,
        user=user,
        acao="UPDATE",
        entidade="Orcamento",
        entidade_id=str(o.id),
        detalhe={"codigo": o.codigo, "versao": o.versao},
    )
    db.commit()
    db.refresh(o)
    return _orc_out(o, db)


@router.post("/orcamentos/{oid}/enviar")
def enviar_orcamento(oid: int, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_ORC_WRITE)
    o = db.query(Orcamento).filter(Orcamento.id == oid, Orcamento.empresa_id == user.empresa_id).first()
    if not o:
        raise HTTPException(404)
    if not _orc_editavel(o.status):
        raise HTTPException(400, f"Status inválido: {o.status.value}")
    if not o.result_snapshot:
        raise HTTPException(400, "Calcule e salve o orçamento antes de enviar")
    o.status = OrcamentoStatus.ENVIADO
    write_audit(
        db,
        empresa_id=user.empresa_id,
        user=user,
        acao="ENVIAR",
        entidade="Orcamento",
        entidade_id=str(o.id),
        detalhe={"codigo": o.codigo},
    )
    db.commit()
    db.refresh(o)
    return _orc_out(o, db)


@router.post("/orcamentos/{oid}/decidir")
def decidir_orcamento(oid: int, body: DecidirIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_ORC_WRITE)
    o = db.query(Orcamento).filter(Orcamento.id == oid, Orcamento.empresa_id == user.empresa_id).first()
    if not o:
        raise HTTPException(404)
    if o.status != OrcamentoStatus.ENVIADO:
        raise HTTPException(400, "Só orçamento ENVIADO pode ser decidido (simula aceite do link)")
    if not body.aprovado:
        o.status = OrcamentoStatus.REPROVADO
        write_audit(
            db,
            empresa_id=user.empresa_id,
            user=user,
            acao="REPROVAR",
            entidade="Orcamento",
            entidade_id=str(o.id),
            detalhe={"codigo": o.codigo, "motivo": body.motivo},
        )
        db.commit()
        db.refresh(o)
        return {"orcamento": _orc_out(o, db), "pedido": None}

    faixas = (o.result_snapshot or {}).get("faixas") or []
    if body.faixa_index < 0 or body.faixa_index >= len(faixas):
        raise HTTPException(400, "Faixa inválida")
    faixa = faixas[body.faixa_index]
    o.status = OrcamentoStatus.APROVADO
    o.faixa_escolhida = body.faixa_index
    o.aprovado_em = datetime.utcnow()

    # registra matriz cobrada
    if o.cobra_matriz and o.chave_matriz:
        exists = (
            db.query(MatrizCobrada)
            .filter(MatrizCobrada.empresa_id == user.empresa_id, MatrizCobrada.chave_matriz == o.chave_matriz)
            .first()
        )
        if not exists:
            db.add(
                MatrizCobrada(
                    empresa_id=user.empresa_id,
                    chave_matriz=o.chave_matriz,
                    cliente=o.cliente_nome,
                    orcamento_id=o.id,
                    valor=o.valor_matriz,
                )
            )

    qtd = int(faixa["quantidade"])
    val_etq = dec(faixa["valor_etiqueta"])
    val_mtx = dec(faixa.get("valor_matriz") or 0)
    valor_total = dec(faixa["valor_total"])
    ped_codigo = next_business_code(db, "PED", Pedido)
    ped = Pedido(
        empresa_id=user.empresa_id,
        codigo=ped_codigo,
        orcamento_id=o.id,
        parceiro_id=o.parceiro_id,
        cliente_nome=o.cliente_nome,
        status=PedidoStatus.AGUARDA_CREDITO,
        snapshot={
            "orcamento_codigo": o.codigo,
            "input": o.input_snapshot,
            "faixa": faixa,
            "result": o.result_snapshot,
        },
        quantidade=qtd,
        valor_etiquetas=val_etq,
        valor_matriz=val_mtx,
        valor_total=valor_total,
    )
    db.add(ped)
    db.flush()
    db.add(
        PedidoItem(
            pedido_id=ped.id,
            natureza=ItemNatureza.PRODUCAO,
            descricao=f"Etiquetas {o.input_snapshot.get('medida', '')}",
            quantidade=qtd,
            valor_unitario=dec(val_etq / qtd if qtd else 0, "0.000001"),
            valor_total=val_etq,
        )
    )
    if val_mtx > 0:
        db.add(
            PedidoItem(
                pedido_id=ped.id,
                natureza=ItemNatureza.SERVICO,
                descricao="Matriz / clichê",
                quantidade=1,
                valor_unitario=val_mtx,
                valor_total=val_mtx,
            )
        )
    write_audit(
        db,
        empresa_id=user.empresa_id,
        user=user,
        acao="APROVAR",
        entidade="Orcamento",
        entidade_id=str(o.id),
        detalhe={"pedido": ped_codigo},
    )
    db.commit()
    db.refresh(ped)
    db.refresh(o)
    return {"orcamento": _orc_out(o, db), "pedido": _ped_out(ped, db)}


def _ped_out(p: Pedido, db: Session | None = None, *, com_verificacao: bool = False) -> dict:
    out = {
        "id": p.id,
        "codigo": p.codigo,
        "orcamento_id": p.orcamento_id,
        "parceiro_id": p.parceiro_id,
        "cliente_nome": p.cliente_nome,
        "status": p.status.value,
        "quantidade": p.quantidade,
        "valor_etiquetas": p.valor_etiquetas,
        "valor_matriz": p.valor_matriz,
        "valor_total": p.valor_total,
        "credito_ok": p.credito_ok,
        "adiantamento_ok": p.adiantamento_ok,
        "credito_liberacao": getattr(p, "credito_liberacao", None),
        "observacao": p.observacao,
        "snapshot": p.snapshot,
        "created_at": p.created_at,
    }
    if db is not None and p.parceiro_id:
        parc = db.query(Parceiro).filter(Parceiro.id == p.parceiro_id).first()
        if parc:
            out["credito"] = _analise_parceiro(db, parc, excluir_pedido_id=p.id).to_dict(
                incluir_titulos=False
            )
            if com_verificacao or p.status in (
                PedidoStatus.NOVO,
                PedidoStatus.AGUARDA_CREDITO,
            ):
                lib_mes = contar_liberacoes_credito_mes(
                    db,
                    empresa_id=p.empresa_id,
                    parceiro_id=parc.id,
                    excluir_pedido_id=p.id,
                )
                ver = verificar_pedido(
                    db,
                    empresa_id=p.empresa_id,
                    parceiro_id=parc.id,
                    limite=parc.limite_credito,
                    valor_pedido=p.valor_total,
                    pedido_id=p.id,
                    bloqueio_manual=bool(getattr(parc, "credito_bloqueio_manual", False)),
                    credito_validade_ate=getattr(parc, "credito_validade_ate", None),
                    liberacoes_mes_cliente=lib_mes,
                )
                out["verificacao_credito"] = ver.to_dict()
    return out


# =============================================================================
# pedidos / produção
# =============================================================================


@router.get("/credito/fila")
def fila_credito(db: DbDep, user: CurrentUser):
    """Fila de pedidos aguardando crédito (§7.1) — Financeiro/Direção."""
    _require(user, R.PERM_PEDIDO_LIBERAR, R.PERM_CREDITO, any_of=True)
    rows = (
        db.query(Pedido)
        .filter(
            Pedido.empresa_id == user.empresa_id,
            Pedido.status.in_((PedidoStatus.AGUARDA_CREDITO, PedidoStatus.NOVO)),
        )
        .order_by(Pedido.id.asc())
        .limit(200)
        .all()
    )
    return [_ped_out(p, db, com_verificacao=True) for p in rows]


@router.get("/pedidos")
def list_pedidos(db: DbDep, user: CurrentUser):

    rows = (
        db.query(Pedido)
        .filter(Pedido.empresa_id == user.empresa_id)
        .order_by(Pedido.id.desc())
        .limit(200)
        .all()
    )
    return [_ped_out(p, db) for p in rows]


@router.get("/pedidos/{pid}")
def get_pedido(pid: int, db: DbDep, user: CurrentUser):
    p = db.query(Pedido).filter(Pedido.id == pid, Pedido.empresa_id == user.empresa_id).first()
    if not p:
        raise HTTPException(404)
    itens = db.query(PedidoItem).filter(PedidoItem.pedido_id == p.id).all()
    ops = db.query(OrdemProducao).filter(OrdemProducao.pedido_id == p.id).all()
    return {
        **_ped_out(p, db, com_verificacao=True),
        "itens": [
            {
                "id": i.id,
                "natureza": i.natureza.value,
                "descricao": i.descricao,
                "quantidade": i.quantidade,
                "valor_unitario": i.valor_unitario,
                "valor_total": i.valor_total,
            }
            for i in itens
        ],
        "ordens": [_op_out(o) for o in ops],
    }


@router.post("/pedidos/{pid}/liberar")
def liberar_pedido(pid: int, body: LiberarPedidoIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_PEDIDO_LIBERAR)
    p = db.query(Pedido).filter(Pedido.id == pid, Pedido.empresa_id == user.empresa_id).first()
    if not p:
        raise HTTPException(404)
    if p.status not in (PedidoStatus.NOVO, PedidoStatus.AGUARDA_CREDITO, PedidoStatus.AGUARDA_ADIANTAMENTO):
        raise HTTPException(400, f"Status {p.status.value} não permite liberação")

    verificacao = None
    if body.modo == "credito":
        if not p.parceiro_id:
            raise HTTPException(
                400,
                "Pedido sem parceiro vinculado — libere por adiantamento ou vincule o cliente",
            )
        parc = db.query(Parceiro).filter(Parceiro.id == p.parceiro_id).first()
        if not parc:
            raise HTTPException(400, "Parceiro do pedido não encontrado")
        lib_mes = contar_liberacoes_credito_mes(
            db,
            empresa_id=user.empresa_id,
            parceiro_id=parc.id,
            excluir_pedido_id=p.id,
        )
        verificacao = verificar_pedido(
            db,
            empresa_id=user.empresa_id,
            parceiro_id=parc.id,
            limite=parc.limite_credito,
            valor_pedido=p.valor_total,
            pedido_id=p.id,
            bloqueio_manual=bool(getattr(parc, "credito_bloqueio_manual", False)),
            credito_validade_ate=getattr(parc, "credito_validade_ate", None),
            liberacoes_mes_cliente=lib_mes,
        )
        justificativa = None
        if verificacao.requer_justificativa:
            try:
                justificativa = validar_justificativa(body.justificativa)
            except ValueError as e:
                raise HTTPException(
                    400,
                    detail={
                        "message": str(e),
                        "verificacao_credito": verificacao.to_dict(),
                    },
                ) from e
        p.credito_ok = True
        p.adiantamento_ok = False
        p.credito_liberacao = montar_snapshot_liberacao(
            verificacao=verificacao,
            modo="credito",
            justificativa=justificativa,
            user_email=user.email,
            excecao=verificacao.requer_justificativa,
        )
        write_audit(
            db,
            empresa_id=user.empresa_id,
            user=user,
            acao="LIBERAR_CREDITO_EXCECAO" if verificacao.requer_justificativa else "LIBERAR_CREDITO",
            entidade="Pedido",
            entidade_id=str(p.id),
            detalhe={
                "codigo": p.codigo,
                "parceiro_id": p.parceiro_id,
                "excecao": verificacao.requer_justificativa,
                "alcada": verificacao.alcada.value,
                "snapshot": p.credito_liberacao,
            },
        )
    else:
        # Adiantamento/sinal — venda sem risco de crédito (§6.3)
        p.adiantamento_ok = True
        p.credito_liberacao = {
            "modo": "adiantamento",
            "excecao": False,
            "liberado_em": datetime.utcnow().isoformat(),
            "autor": user.email,
            "justificativa": (body.justificativa or "").strip() or None,
        }
        write_audit(
            db,
            empresa_id=user.empresa_id,
            user=user,
            acao="LIBERAR_ADIANTAMENTO",
            entidade="Pedido",
            entidade_id=str(p.id),
            detalhe={"codigo": p.codigo},
        )

    p.status = PedidoStatus.LIBERADO

    # gera OP/OS
    itens = db.query(PedidoItem).filter(PedidoItem.pedido_id == p.id).all()
    ops_criadas: list[OrdemProducao] = []
    for it in itens:
        tipo = "OS" if it.natureza == ItemNatureza.SERVICO else "OP"
        if it.natureza == ItemNatureza.REVENDA:
            continue
        existing_op = db.query(OrdemProducao).filter(OrdemProducao.pedido_item_id == it.id).first()
        if existing_op:
            ops_criadas.append(existing_op)
            continue
        op = OrdemProducao(
            empresa_id=user.empresa_id,
            codigo=next_business_code(db, tipo, OrdemProducao),
            pedido_id=p.id,
            pedido_item_id=it.id,
            tipo=tipo,
            status=OpStatus.ABERTA,
            descricao=it.descricao,
            quantidade=it.quantidade,
        )
        db.add(op)
        db.flush()
        ops_criadas.append(op)

    from app.services.jornada import empenhar_mp_pedido

    empenhar_mp_pedido(db, empresa_id=user.empresa_id, pedido=p, ops=ops_criadas)
    db.commit()
    db.refresh(p)
    return _ped_out(p, db)


@router.post("/pedidos/{pid}/iniciar-producao")
def iniciar_producao(pid: int, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_PEDIDO_WRITE, R.PERM_PROD_WRITE, any_of=True)
    p = db.query(Pedido).filter(Pedido.id == pid, Pedido.empresa_id == user.empresa_id).first()
    if not p:
        raise HTTPException(404)
    if p.status != PedidoStatus.LIBERADO:
        raise HTTPException(400, "Pedido precisa estar LIBERADO")
    p.status = PedidoStatus.EM_PRODUCAO
    ops = db.query(OrdemProducao).filter(OrdemProducao.pedido_id == p.id, OrdemProducao.status == OpStatus.ABERTA).all()
    for op in ops:
        op.status = OpStatus.EM_ANDAMENTO
        pts = list(op.apontamentos or [])
        pts.append({"evento": "INICIO", "em": datetime.utcnow().isoformat()})
        op.apontamentos = pts
    db.commit()
    return _ped_out(p)


def _op_out(o: OrdemProducao) -> dict:
    return {
        "id": o.id,
        "codigo": o.codigo,
        "pedido_id": o.pedido_id,
        "tipo": o.tipo,
        "status": o.status.value,
        "descricao": o.descricao,
        "quantidade": o.quantidade,
        "apontamentos": o.apontamentos or [],
        "created_at": o.created_at,
        "concluidas_em": o.concluidas_em,
    }


@router.get("/producao")
def list_producao(db: DbDep, user: CurrentUser):
    rows = (
        db.query(OrdemProducao)
        .filter(OrdemProducao.empresa_id == user.empresa_id)
        .order_by(OrdemProducao.id.desc())
        .limit(200)
        .all()
    )
    return [_op_out(o) for o in rows]


@router.post("/producao/{oid}/concluir")
def concluir_op(oid: int, db: DbDep, user: CurrentUser, qtd_sobra: float | None = None):
    _require(user, R.PERM_PROD_WRITE)
    op = db.query(OrdemProducao).filter(OrdemProducao.id == oid, OrdemProducao.empresa_id == user.empresa_id).first()
    if not op:
        raise HTTPException(404)
    if op.status not in (OpStatus.ABERTA, OpStatus.EM_ANDAMENTO):
        raise HTTPException(400, "OP/OS já encerrada")
    op.status = OpStatus.CONCLUIDA
    op.concluidas_em = datetime.utcnow()
    pts = list(op.apontamentos or [])
    pts.append({"evento": "CONCLUSAO", "em": datetime.utcnow().isoformat()})
    op.apontamentos = pts

    from app.services.jornada import concluir_op_com_estoque

    sobra = Decimal(str(qtd_sobra)) if qtd_sobra is not None else None
    stock_result = concluir_op_com_estoque(
        db, empresa_id=user.empresa_id, op=op, qtd_sobra=sobra
    )

    ped = db.get(Pedido, op.pedido_id)
    all_ops = db.query(OrdemProducao).filter(OrdemProducao.pedido_id == op.pedido_id).all()
    if ped and all(x.status == OpStatus.CONCLUIDA for x in all_ops):
        ped.status = PedidoStatus.EM_SEPARACAO
    db.commit()
    out = _op_out(op)
    out["estoque"] = stock_result
    return out


# =============================================================================
# estoque / compras / nfe
# =============================================================================


@router.get("/estoque/saldos")
def estoque_saldos(db: DbDep, user: CurrentUser):
    rows = (
        db.query(Produto)
        .filter(Produto.empresa_id == user.empresa_id, Produto.controla_estoque.is_(True), Produto.ativo.is_(True))
        .order_by(Produto.codigo)
        .all()
    )
    out = []
    for p in rows:
        _, m2, ml = compute_measures(p, p.saldo_qtd, p.unidade.value)
        limiar = p.limiar_reposicao
        disponivel = p.saldo_disponivel
        out.append(
            {
                **_produto_out(p),
                "qtd_m2": m2,
                "qtd_ml": ml,
                "abaixo_minimo": disponivel < (p.estoque_minimo or Decimal("0")),
                "abaixo_ponto_pedido": limiar > 0 and disponivel < limiar,
                "sugestao_compra": max(Decimal("0"), limiar - disponivel)
                if limiar > 0 and disponivel < limiar
                else Decimal("0"),
            }
        )
    return out


@router.get("/estoque/movimentos")
def estoque_movimentos(db: DbDep, user: CurrentUser, produto_id: int | None = None):
    from app.models import EstoqueMovimento

    q = db.query(EstoqueMovimento).filter(EstoqueMovimento.empresa_id == user.empresa_id)
    if produto_id:
        q = q.filter(EstoqueMovimento.produto_id == produto_id)
    rows = q.order_by(EstoqueMovimento.id.desc()).limit(300).all()
    return [
        {
            "id": m.id,
            "produto_id": m.produto_id,
            "tipo": m.tipo.value,
            "quantidade": m.quantidade,
            "qtd_m2": m.qtd_m2,
            "qtd_ml": m.qtd_ml,
            "custo_unitario": m.custo_unitario,
            "valor_total": m.valor_total,
            "documento_ref": m.documento_ref,
            "observacao": m.observacao,
            "op_id": getattr(m, "op_id", None),
            "pedido_id": getattr(m, "pedido_id", None),
            "devolucao_id": getattr(m, "devolucao_id", None),
            "created_at": m.created_at,
        }
        for m in rows
    ]


@router.post("/estoque/movimentos", status_code=201)
def criar_movimento(body: MovimentoIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_ESTOQUE_MOV)
    p = db.query(Produto).filter(Produto.id == body.produto_id, Produto.empresa_id == user.empresa_id).first()
    if not p:
        raise HTTPException(404, "Produto não encontrado")
    if body.tipo == "AJUSTE" and not (body.observacao or "").strip():
        raise HTTPException(400, "Ajuste exige motivo em observação")
    base, m2, ml = compute_measures(p, body.quantidade, body.unidade_entrada)
    try:
        mov = apply_stock_move(
            db,
            empresa_id=user.empresa_id,
            produto=p,
            tipo=MovTipo(body.tipo),
            quantidade=base,
            custo_unitario=body.custo_unitario,
            qtd_m2=m2,
            qtd_ml=ml,
            documento_ref=body.documento_ref,
            observacao=body.observacao,
            # movimentos manuais não canibalizam reserva de OP
            consumir_reserva=False,
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    db.commit()
    db.refresh(mov)
    return {
        "id": mov.id,
        "produto_id": mov.produto_id,
        "tipo": mov.tipo.value,
        "quantidade": mov.quantidade,
        "saldo_atual": p.saldo_qtd,
        "saldo_reservado": p.saldo_reservado,
        "saldo_disponivel": p.saldo_disponivel,
        "custo_medio": p.custo_medio,
    }


@router.post("/estoque/reservas", status_code=201)
def criar_reserva(body: ReservaIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_ESTOQUE_MOV)
    p = db.query(Produto).filter(Produto.id == body.produto_id, Produto.empresa_id == user.empresa_id).first()
    if not p:
        raise HTTPException(404, "Produto não encontrado")
    base, m2, ml = compute_measures(p, body.quantidade, body.unidade_entrada)
    try:
        mov = apply_stock_move(
            db,
            empresa_id=user.empresa_id,
            produto=p,
            tipo=MovTipo.RESERVA,
            quantidade=base,
            qtd_m2=m2,
            qtd_ml=ml,
            documento_ref=body.documento_ref,
            observacao=body.observacao,
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    db.commit()
    return {
        "id": mov.id,
        "produto_id": p.id,
        "saldo_reservado": p.saldo_reservado,
        "saldo_disponivel": p.saldo_disponivel,
    }


@router.post("/estoque/reservas/liberar", status_code=201)
def liberar_reserva(body: ReservaIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_ESTOQUE_MOV)
    p = db.query(Produto).filter(Produto.id == body.produto_id, Produto.empresa_id == user.empresa_id).first()
    if not p:
        raise HTTPException(404, "Produto não encontrado")
    base, m2, ml = compute_measures(p, body.quantidade, body.unidade_entrada)
    try:
        mov = apply_stock_move(
            db,
            empresa_id=user.empresa_id,
            produto=p,
            tipo=MovTipo.LIBERA_RESERVA,
            quantidade=base,
            qtd_m2=m2,
            qtd_ml=ml,
            documento_ref=body.documento_ref,
            observacao=body.observacao,
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    db.commit()
    return {
        "id": mov.id,
        "produto_id": p.id,
        "saldo_reservado": p.saldo_reservado,
        "saldo_disponivel": p.saldo_disponivel,
    }


# ---- compras (M07) — paralelo ao ORC→BX


@router.get("/compras/necessidades")
def list_necessidades(db: DbDep, user: CurrentUser, status: str | None = None):
    q = db.query(NecessidadeCompra).filter(NecessidadeCompra.empresa_id == user.empresa_id)
    if status:
        q = q.filter(NecessidadeCompra.status == NecessidadeStatus(status))
    rows = q.order_by(NecessidadeCompra.id.desc()).limit(200).all()
    return [_necessidade_out(n) for n in rows]


@router.post("/compras/necessidades", status_code=201)
def post_necessidade(body: NecessidadeIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_COMPRAS_WRITE)
    try:
        nec = criar_necessidade(
            db,
            empresa_id=user.empresa_id,
            itens=[i.model_dump() for i in body.itens],
            origem=NecessidadeOrigem(body.origem),
            urgencia=body.urgencia,
            solicitante=body.solicitante or user.nome or user.email,
            op_id=body.op_id,
            observacao=body.observacao,
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    write_audit(
        db,
        empresa_id=user.empresa_id,
        user=user,
        acao="CREATE",
        entidade="NecessidadeCompra",
        entidade_id=nec.codigo,
    )
    db.commit()
    db.refresh(nec)
    return _necessidade_out(nec)


@router.post("/compras/necessidades/gerar-reposicao", status_code=201)
def post_gerar_reposicao(db: DbDep, user: CurrentUser):
    _require(user, R.PERM_COMPRAS_WRITE)
    criadas = gerar_necessidades_reposicao(
        db, empresa_id=user.empresa_id, solicitante=user.nome or user.email
    )
    db.commit()
    return {"criadas": len(criadas), "itens": [_necessidade_out(n) for n in criadas]}


@router.post("/compras/necessidades/{nid}/cancelar")
def cancelar_necessidade(nid: int, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_COMPRAS_WRITE)
    nec = (
        db.query(NecessidadeCompra)
        .filter(NecessidadeCompra.id == nid, NecessidadeCompra.empresa_id == user.empresa_id)
        .first()
    )
    if not nec:
        raise HTTPException(404)
    if nec.status in (NecessidadeStatus.ATENDIDA, NecessidadeStatus.CANCELADA):
        raise HTTPException(400, "Necessidade já encerrada")
    nec.status = NecessidadeStatus.CANCELADA
    db.commit()
    return _necessidade_out(nec)


@router.get("/compras/ordens")
def list_ordens_compra(db: DbDep, user: CurrentUser, status: str | None = None):
    q = db.query(OrdemCompra).filter(OrdemCompra.empresa_id == user.empresa_id)
    if status:
        q = q.filter(OrdemCompra.status == OrdemCompraStatus(status))
    rows = q.order_by(OrdemCompra.id.desc()).limit(200).all()
    return [_ordem_out(o) for o in rows]


@router.post("/compras/ordens", status_code=201)
def post_ordem_compra(body: OrdemCompraIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_COMPRAS_WRITE)
    forn = (
        db.query(Parceiro)
        .filter(Parceiro.id == body.parceiro_id, Parceiro.empresa_id == user.empresa_id)
        .first()
    )
    if not forn:
        raise HTTPException(400, "Fornecedor inválido")
    tipos = forn.tipos or []
    if "FORNECEDOR" not in tipos and "AMBOS" not in tipos:
        # ainda permite se CNPJ fornecedor típico; exige papel quando tipado
        if tipos and "FORNECEDOR" not in tipos:
            raise HTTPException(400, "Parceiro precisa ter papel FORNECEDOR")
    try:
        oc = criar_ordem_compra(
            db,
            empresa_id=user.empresa_id,
            parceiro_id=body.parceiro_id,
            itens=[i.model_dump() for i in body.itens],
            necessidade_id=body.necessidade_id,
            urgencia=body.urgencia,
            previsao_entrega=body.previsao_entrega,
            condicao_pagamento=body.condicao_pagamento,
            observacao=body.observacao,
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    write_audit(
        db,
        empresa_id=user.empresa_id,
        user=user,
        acao="CREATE",
        entidade="OrdemCompra",
        entidade_id=oc.codigo,
    )
    db.commit()
    db.refresh(oc)
    return _ordem_out(oc)


@router.post("/compras/ordens/{oid}/status")
def set_ordem_status(oid: int, body: OrdemCompraStatusIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_COMPRAS_WRITE)
    oc = db.query(OrdemCompra).filter(OrdemCompra.id == oid, OrdemCompra.empresa_id == user.empresa_id).first()
    if not oc:
        raise HTTPException(404)
    oc.status = OrdemCompraStatus(body.status)
    db.commit()
    return _ordem_out(oc)


@router.get("/nfe")
def list_nfe(db: DbDep, user: CurrentUser):
    rows = db.query(NfeImport).filter(NfeImport.empresa_id == user.empresa_id).order_by(NfeImport.id.desc()).limit(100).all()
    return [_nfe_out(n, db) for n in rows]


def _nfe_out(n: NfeImport, db: Session) -> dict:
    return {
        "id": n.id,
        "chave": n.chave,
        "numero": n.numero,
        "serie": n.serie,
        "emitida_em": n.emitida_em,
        "emit_cnpj": n.emit_cnpj,
        "emit_nome": n.emit_nome,
        "parceiro_id": n.parceiro_id,
        "ordem_compra_id": n.ordem_compra_id,
        "valor_produtos": n.valor_produtos,
        "valor_total": n.valor_total,
        "status": n.status.value,
        "created_at": n.created_at,
        "itens": [
            {
                "id": i.id,
                "numero_item": i.numero_item,
                "codigo_produto": i.codigo_produto,
                "descricao": i.descricao,
                "ncm": i.ncm,
                "unidade": i.unidade,
                "quantidade": i.quantidade,
                "valor_unitario": i.valor_unitario,
                "valor_total": i.valor_total,
                "produto_id": i.produto_id,
            }
            for i in n.itens
        ],
        "duplicatas": [
            {"id": d.id, "numero": d.numero, "vencimento": d.vencimento, "valor": d.valor} for d in n.duplicatas
        ],
    }


@router.post("/nfe/upload")
async def upload_nfe(user: CurrentUser, db: DbDep, files: list[UploadFile] = File(...)):
    _require(user, R.PERM_NFE_ENTRADA)
    results = []
    for f in files:
        content = await f.read()
        try:
            parsed = parse_nfe_xml(content)
        except NfeParseError as e:
            results.append({"filename": f.filename, "ok": False, "error": str(e)})
            continue
        if db.query(NfeImport).filter(NfeImport.chave == parsed.chave).first():
            results.append({"filename": f.filename, "ok": False, "error": "Chave já importada"})
            continue
        fornecedor = (
            db.query(Parceiro)
            .filter(Parceiro.empresa_id == user.empresa_id, Parceiro.cnpj_cpf == parsed.emit_cnpj)
            .first()
        )
        if not fornecedor:
            fornecedor = Parceiro(
                empresa_id=user.empresa_id,
                codigo=next_codigo(db, user.empresa_id, Parceiro),
                tipos=["FORNECEDOR"],
                cnpj_cpf=parsed.emit_cnpj,
                razao_social=parsed.emit_nome,
                nome_fantasia=parsed.emit_nome,
                ie=parsed.emit_ie,
            )
            db.add(fornecedor)
            db.flush()
        elif "FORNECEDOR" not in (fornecedor.tipos or []):
            tipos = list(fornecedor.tipos or [])
            tipos.append("FORNECEDOR")
            fornecedor.tipos = tipos

        # OC aberta do mesmo fornecedor (sugestão automática)
        oc_sugerida = (
            db.query(OrdemCompra)
            .filter(
                OrdemCompra.empresa_id == user.empresa_id,
                OrdemCompra.parceiro_id == fornecedor.id,
                OrdemCompra.status.in_(
                    [OrdemCompraStatus.ENVIADA, OrdemCompraStatus.PARCIAL, OrdemCompraStatus.RASCUNHO]
                ),
            )
            .order_by(OrdemCompra.id.desc())
            .first()
        )

        nfe = NfeImport(
            empresa_id=user.empresa_id,
            chave=parsed.chave,
            numero=parsed.numero,
            serie=parsed.serie,
            emitida_em=parsed.emitida_em,
            emit_cnpj=parsed.emit_cnpj,
            emit_nome=parsed.emit_nome,
            parceiro_id=fornecedor.id,
            ordem_compra_id=oc_sugerida.id if oc_sugerida else None,
            valor_produtos=dec(parsed.valor_produtos),
            valor_total=dec(parsed.valor_total),
            status=NfeStatus.PENDENTE,
            xml_content=content.decode("utf-8", errors="ignore"),
        )
        db.add(nfe)
        db.flush()
        for it in parsed.items:
            mapping = None
            if it.codigo_fornecedor:
                mapping = (
                    db.query(FornecedorProdutoCodigo)
                    .filter(
                        FornecedorProdutoCodigo.parceiro_id == fornecedor.id,
                        FornecedorProdutoCodigo.codigo_fornecedor == it.codigo_fornecedor,
                    )
                    .first()
                )
            db.add(
                NfeItem(
                    nfe_id=nfe.id,
                    numero_item=it.n_item,
                    codigo_produto=it.codigo_fornecedor,
                    descricao=it.descricao,
                    ncm=it.ncm,
                    unidade=it.unidade,
                    quantidade=dec(it.quantidade, "0.0001"),
                    valor_unitario=dec(it.valor_unitario, "0.000001"),
                    valor_total=dec(it.valor_total),
                    produto_id=mapping.produto_id if mapping else None,
                )
            )
        for dup in parsed.duplicatas:
            db.add(
                NfeDuplicata(
                    nfe_id=nfe.id,
                    numero=dup.numero,
                    vencimento=dup.vencimento,
                    valor=dec(dup.valor),
                )
            )
        results.append(
            {
                "filename": f.filename,
                "ok": True,
                "id": nfe.id,
                "chave": nfe.chave,
                "ordem_compra_id": nfe.ordem_compra_id,
            }
        )
    db.commit()
    return {"results": results}


@router.post("/nfe/{nid}/accept")
def accept_nfe(nid: int, body: AcceptNfeIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_NFE_ENTRADA)
    nfe = db.query(NfeImport).filter(NfeImport.id == nid, NfeImport.empresa_id == user.empresa_id).first()
    if not nfe:
        raise HTTPException(404)
    if nfe.status != NfeStatus.PENDENTE:
        raise HTTPException(400, "NF-e já processada")

    oc = None
    if body.ordem_compra_id is not None:
        oc = (
            db.query(OrdemCompra)
            .filter(OrdemCompra.id == body.ordem_compra_id, OrdemCompra.empresa_id == user.empresa_id)
            .first()
        )
        if not oc:
            raise HTTPException(400, "Ordem de compra inválida")
        if oc.status == OrdemCompraStatus.CANCELADA:
            raise HTTPException(400, "OC cancelada não pode receber NF-e")
        nfe.ordem_compra_id = oc.id
    elif nfe.ordem_compra_id:
        oc = db.get(OrdemCompra, nfe.ordem_compra_id)

    mapa = {i.nfe_item_id: i for i in body.itens}
    recebimentos: list[tuple[int | None, Decimal]] = []
    for item in nfe.itens:
        bind = mapa.get(item.id)
        if not bind:
            raise HTTPException(400, f"Item {item.id} sem mapeamento")
        if bind.criar_produto:
            prod = Produto(
                empresa_id=user.empresa_id,
                codigo=next_codigo(db, user.empresa_id, Produto),
                descricao=bind.descricao or item.descricao,
                tipo=ProdutoTipo(bind.tipo),
                unidade=Unidade(bind.unidade),
                grupo=bind.grupo,
                ncm=item.ncm,
                largura_mm=bind.largura_mm,
            )
            db.add(prod)
            db.flush()
        else:
            prod = db.query(Produto).filter(Produto.id == bind.produto_id, Produto.empresa_id == user.empresa_id).first()
            if not prod:
                raise HTTPException(400, f"Produto inválido no item {item.id}")
        item.produto_id = prod.id

        # persiste de/para fornecedor × código
        if nfe.parceiro_id and item.codigo_produto:
            existente = (
                db.query(FornecedorProdutoCodigo)
                .filter(
                    FornecedorProdutoCodigo.parceiro_id == nfe.parceiro_id,
                    FornecedorProdutoCodigo.codigo_fornecedor == item.codigo_produto,
                )
                .first()
            )
            if existente:
                existente.produto_id = prod.id
            else:
                db.add(
                    FornecedorProdutoCodigo(
                        parceiro_id=nfe.parceiro_id,
                        codigo_fornecedor=item.codigo_produto,
                        produto_id=prod.id,
                    )
                )

        base, m2, ml = compute_measures(prod, item.quantidade, item.unidade or prod.unidade.value)
        try:
            apply_stock_move(
                db,
                empresa_id=user.empresa_id,
                produto=prod,
                tipo=MovTipo.ENTRADA_NFE,
                quantidade=base,
                custo_unitario=item.valor_unitario,
                qtd_m2=m2,
                qtd_ml=ml,
                documento_ref=nfe.chave,
            )
        except ValueError as e:
            raise HTTPException(400, str(e)) from e
        recebimentos.append((prod.id, base))

    if oc:
        aplicar_recebimento_oc(db, ordem=oc, recebimentos=recebimentos)

    for dup in nfe.duplicatas:
        db.add(
            Titulo(
                empresa_id=user.empresa_id,
                codigo=next_business_code(db, "TIT", Titulo),
                tipo=TituloTipo.PAGAR,
                status=TituloStatus.ABERTO,
                parceiro_id=nfe.parceiro_id,
                nfe_import_id=nfe.id,
                descricao=f"NF-e {nfe.numero} dup {dup.numero}",
                valor=dup.valor,
                valor_aberto=dup.valor,
                vencimento=dup.vencimento,
                natureza_codigo="2.01",
            )
        )
    nfe.status = NfeStatus.ACEITA
    db.commit()
    return _nfe_out(nfe, db)


@router.post("/nfe/{nid}/reject")
def reject_nfe(nid: int, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_NFE_ENTRADA)
    nfe = db.query(NfeImport).filter(NfeImport.id == nid, NfeImport.empresa_id == user.empresa_id).first()
    if not nfe:
        raise HTTPException(404)
    nfe.status = NfeStatus.REJEITADA
    db.commit()
    return _nfe_out(nfe, db)


# =============================================================================
# fiscal / financeiro / entrega
# =============================================================================


@router.get("/fiscal")
def list_fiscal(db: DbDep, user: CurrentUser):
    rows = (
        db.query(DocumentoFiscalSaida)
        .filter(DocumentoFiscalSaida.empresa_id == user.empresa_id)
        .order_by(DocumentoFiscalSaida.id.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id": d.id,
            "codigo": d.codigo,
            "pedido_id": d.pedido_id,
            "tipo": d.tipo.value,
            "status": d.status.value,
            "numero": d.numero,
            "chave": d.chave,
            "valor_total": d.valor_total,
            "idempotency_key": d.idempotency_key,
            "created_at": d.created_at,
        }
        for d in rows
    ]


@router.post("/pedidos/{pid}/faturar")
def faturar_pedido(pid: int, body: EmitirFiscalIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_FISCAL_EMITIR)
    p = db.query(Pedido).filter(Pedido.id == pid, Pedido.empresa_id == user.empresa_id).first()
    if not p:
        raise HTTPException(404)
    if p.status not in (PedidoStatus.EM_SEPARACAO, PedidoStatus.EM_PRODUCAO, PedidoStatus.LIBERADO):
        raise HTTPException(400, f"Status {p.status.value} não permite faturar")

    # Re-verificação de crédito no faturamento (§6.1 ponto 3) — não trava adiantamento
    if p.credito_ok and not p.adiantamento_ok and p.parceiro_id:
        parc = db.query(Parceiro).filter(Parceiro.id == p.parceiro_id).first()
        if parc:
            analise = _analise_parceiro(db, parc, excluir_pedido_id=p.id)
            snap = getattr(p, "credito_liberacao", None) or {}
            liberacao_ok = liberacao_ainda_valida(snap) if snap.get("excecao") else True
            # atraso novo após liberação automática, ou liberação excepcional expirada
            bloqueia_atraso = analise.atraso_max_dias > DEFAULT_PARAMS.tolerancia_atraso_dias
            if (bloqueia_atraso or analise.bloqueio_manual) and not (
                snap.get("excecao") and liberacao_ok
            ):
                if body.justificativa_credito:
                    try:
                        just = validar_justificativa(body.justificativa_credito)
                    except ValueError as e:
                        raise HTTPException(400, str(e)) from e
                    write_audit(
                        db,
                        empresa_id=user.empresa_id,
                        user=user,
                        acao="RELIBERAR_CREDITO_FATURAMENTO",
                        entidade="Pedido",
                        entidade_id=str(p.id),
                        detalhe={
                            "codigo": p.codigo,
                            "justificativa": just,
                            "atraso_max_dias": analise.atraso_max_dias,
                        },
                    )
                else:
                    raise HTTPException(
                        400,
                        detail={
                            "message": (
                                "Cliente com bloqueio de crédito no faturamento "
                                "(atraso ou bloqueio manual). Informe justificativa_credito "
                                "ou regularize títulos / liberação."
                            ),
                            "credito": analise.to_dict(),
                        },
                    )
            elif snap.get("excecao") and not liberacao_ok:
                raise HTTPException(
                    400,
                    detail={
                        "message": (
                            "Liberação excepcional expirada (7 dias). "
                            "Reapresente o pedido ao financeiro."
                        ),
                        "credito_liberacao": snap,
                    },
                )

    key = f"FAT-{p.codigo}-{body.tipo}"
    existing = db.query(DocumentoFiscalSaida).filter(DocumentoFiscalSaida.idempotency_key == key).first()
    if existing:
        return {"documento": existing.codigo, "idempotent": True}

    settings = get_settings()
    doc = DocumentoFiscalSaida(
        empresa_id=user.empresa_id,
        codigo=next_business_code(db, "NF", DocumentoFiscalSaida),
        pedido_id=p.id,
        tipo=DocFiscalTipo(body.tipo),
        status=DocFiscalStatus.SIMULADO if settings.simular_integracoes else DocFiscalStatus.AUTORIZADO,
        numero=str(1000 + p.id),
        chave=f"SIM{p.codigo.replace('-', '')}{body.tipo}",
        valor_total=p.valor_total,
        idempotency_key=key,
        payload={"simulado": settings.simular_integracoes, "focus": False},
    )
    db.add(doc)
    db.flush()

    tit = Titulo(
        empresa_id=user.empresa_id,
        codigo=next_business_code(db, "TIT", Titulo),
        tipo=TituloTipo.RECEBER,
        status=TituloStatus.ABERTO,
        parceiro_id=p.parceiro_id,
        pedido_id=p.id,
        documento_fiscal_id=doc.id,
        descricao=f"Faturamento {p.codigo}",
        valor=p.valor_total,
        valor_aberto=p.valor_total,
        vencimento=datetime.utcnow().date(),
        natureza_codigo="1.01.01",
    )
    db.add(tit)
    db.flush()

    cob = Cobranca(
        empresa_id=user.empresa_id,
        codigo=next_business_code(db, "COB", Cobranca),
        titulo_id=tit.id,
        status=CobrancaStatus.REGISTRADA,
        provider="SIMULADO",
        nosso_numero=f"SIM{tit.id:08d}",
        linha_digitavel=f"00000.00000 00000.000000 00000.000000 {tit.id % 10} {int(tit.valor * 100):014d}",
        valor=tit.valor,
        vencimento=tit.vencimento,
        idempotency_key=f"COB-{tit.codigo}",
    )
    db.add(cob)
    p.status = PedidoStatus.FATURADO

    from app.services.jornada import baixa_pa_na_venda

    stock_venda = baixa_pa_na_venda(
        db, empresa_id=user.empresa_id, pedido=p, doc_ref=doc.codigo
    )
    db.commit()
    return {
        "documento": doc.codigo,
        "titulo": tit.codigo,
        "cobranca": cob.codigo,
        "simulado": settings.simular_integracoes,
        "natureza_codigo": tit.natureza_codigo,
        "estoque_saida": stock_venda,
    }


@router.get("/financeiro/titulos")
def list_titulos(db: DbDep, user: CurrentUser, tipo: str | None = None):
    q = db.query(Titulo).filter(Titulo.empresa_id == user.empresa_id)
    if tipo:
        q = q.filter(Titulo.tipo == TituloTipo(tipo))
    rows = q.order_by(Titulo.id.desc()).limit(300).all()
    return [
        {
            "id": t.id,
            "codigo": t.codigo,
            "tipo": t.tipo.value,
            "status": t.status.value,
            "parceiro_id": t.parceiro_id,
            "pedido_id": t.pedido_id,
            "descricao": t.descricao,
            "valor": t.valor,
            "valor_aberto": t.valor_aberto,
            "vencimento": t.vencimento,
            "natureza_codigo": t.natureza_codigo,
            "created_at": t.created_at,
            "cobrancas": [
                {
                    "id": c.id,
                    "codigo": c.codigo,
                    "status": c.status.value,
                    "provider": c.provider,
                    "linha_digitavel": c.linha_digitavel,
                    "valor": c.valor,
                }
                for c in t.cobrancas
            ],
            "baixas": [
                {"id": b.id, "codigo": b.codigo, "valor": b.valor, "origem": b.origem, "pago_em": b.pago_em}
                for b in t.baixas
            ],
        }
        for t in rows
    ]


@router.post("/financeiro/titulos/{tid}/baixar")
def baixar_titulo(tid: int, body: BaixaIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_FIN_WRITE)
    t = db.query(Titulo).filter(Titulo.id == tid, Titulo.empresa_id == user.empresa_id).first()
    if not t:
        raise HTTPException(404)
    if t.natureza_codigo.startswith("9"):
        raise HTTPException(400, "Natureza 9.xx / LAI proibida (CA-09)")
    key = body.idempotency_key or f"BX-{t.codigo}-{t.valor_aberto}"
    exists = db.query(Baixa).filter(Baixa.idempotency_key == key).first()
    if exists:
        return {"baixa": exists.codigo, "idempotent": True}
    valor = body.valor if body.valor is not None else t.valor_aberto
    valor = dec(valor)
    if valor <= 0 or valor > t.valor_aberto:
        raise HTTPException(400, "Valor de baixa inválido")
    cob = t.cobrancas[0] if t.cobrancas else None
    bx = Baixa(
        empresa_id=user.empresa_id,
        codigo=next_business_code(db, "BX", Baixa),
        titulo_id=t.id,
        cobranca_id=cob.id if cob else None,
        valor=valor,
        origem=body.origem,
        idempotency_key=key,
    )
    db.add(bx)
    t.valor_aberto = dec(t.valor_aberto - valor)
    t.status = TituloStatus.BAIXADO if t.valor_aberto == 0 else TituloStatus.PARCIAL
    if cob:
        cob.status = CobrancaStatus.PAGA if t.status == TituloStatus.BAIXADO else cob.status
    if t.pedido_id and t.tipo == TituloTipo.RECEBER and t.status == TituloStatus.BAIXADO:
        ped = db.get(Pedido, t.pedido_id)
        if ped and ped.status == PedidoStatus.ENTREGUE:
            ped.status = PedidoStatus.ENCERRADO
    db.commit()
    return {"baixa": bx.codigo, "titulo_status": t.status.value, "valor_aberto": t.valor_aberto}


@router.get("/entregas")
def list_entregas(db: DbDep, user: CurrentUser):
    rows = db.query(Entrega).filter(Entrega.empresa_id == user.empresa_id).order_by(Entrega.id.desc()).limit(200).all()
    return [
        {
            "id": e.id,
            "codigo": e.codigo,
            "pedido_id": e.pedido_id,
            "status": e.status.value,
            "volumes": e.volumes,
            "rolos": e.rolos,
            "caixas": e.caixas,
            "transportadora": e.transportadora,
            "observacao": e.observacao,
            "expedida_em": e.expedida_em,
            "confirmada_em": e.confirmada_em,
            "created_at": e.created_at,
        }
        for e in rows
    ]


@router.post("/pedidos/{pid}/entregar")
def criar_entrega(pid: int, body: EntregaIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_ENTREGA_WRITE)
    p = db.query(Pedido).filter(Pedido.id == pid, Pedido.empresa_id == user.empresa_id).first()
    if not p:
        raise HTTPException(404)
    if p.status not in (PedidoStatus.FATURADO, PedidoStatus.FATURADO_PARCIAL):
        raise HTTPException(400, "Pedido precisa estar faturado")
    e = Entrega(
        empresa_id=user.empresa_id,
        codigo=next_business_code(db, "ENT", Entrega),
        pedido_id=p.id,
        status=EntregaStatus.EXPEDIDA,
        volumes=body.volumes,
        rolos=body.rolos,
        caixas=body.caixas,
        transportadora=body.transportadora,
        observacao=body.observacao,
        expedida_em=datetime.utcnow(),
    )
    db.add(e)
    p.status = PedidoStatus.ENTREGUE
    db.commit()
    db.refresh(e)
    return {"codigo": e.codigo, "status": e.status.value}


@router.post("/entregas/{eid}/confirmar")
def confirmar_entrega(eid: int, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_ENTREGA_WRITE)
    e = db.query(Entrega).filter(Entrega.id == eid, Entrega.empresa_id == user.empresa_id).first()
    if not e:
        raise HTTPException(404)
    e.status = EntregaStatus.CONFIRMADA
    e.confirmada_em = datetime.utcnow()
    db.commit()
    return {"codigo": e.codigo, "status": e.status.value}


@router.post("/homologacao/seed-jornada")
def seed_jornada_endpoint(db: DbDep, user: CurrentUser):
    """Popula jornada demo se ainda não houver pedidos (ADMIN / homologação)."""
    _require(user, R.PERM_HOMOLOGACAO, R.PERM_PARAMETROS, any_of=True)
    from app.services.jornada import seed_jornada_demo, seed_patrimonio_demo
    from app.services.naturezas import seed_naturezas

    emp = db.get(Empresa, user.empresa_id)
    if not emp:
        raise HTTPException(404, "Empresa não encontrada")
    n = seed_naturezas(db)
    p = seed_patrimonio_demo(db, emp)
    j = seed_jornada_demo(db, emp, force=False)
    db.commit()
    return {"naturezas_inseridas": n, "patrimonio_inserido": p, "jornada": j}


# =============================================================================
# homologação
# =============================================================================


@router.get("/homologacao/resumo")
def homologacao_resumo(db: DbDep, user: CurrentUser):
    settings = get_settings()
    return {
        "environment": settings.environment,
        "simular_integracoes": settings.simular_integracoes,
        "etapas": etapas_dict(),
        "filas": {
            "orcamentos_enviados": db.query(Orcamento)
            .filter(Orcamento.empresa_id == user.empresa_id, Orcamento.status == OrcamentoStatus.ENVIADO)
            .count(),
            "pedidos_aguarda_credito": db.query(Pedido)
            .filter(Pedido.empresa_id == user.empresa_id, Pedido.status == PedidoStatus.AGUARDA_CREDITO)
            .count(),
            "ops_abertas": db.query(OrdemProducao)
            .filter(OrdemProducao.empresa_id == user.empresa_id, OrdemProducao.status != OpStatus.CONCLUIDA)
            .count(),
            "nfe_pendentes": db.query(NfeImport)
            .filter(NfeImport.empresa_id == user.empresa_id, NfeImport.status == NfeStatus.PENDENTE)
            .count(),
            "necessidades_abertas": db.query(NecessidadeCompra)
            .filter(
                NecessidadeCompra.empresa_id == user.empresa_id,
                NecessidadeCompra.status.in_([NecessidadeStatus.ABERTA, NecessidadeStatus.EM_COMPRA]),
            )
            .count(),
            "oc_abertas": db.query(OrdemCompra)
            .filter(
                OrdemCompra.empresa_id == user.empresa_id,
                OrdemCompra.status.in_(
                    [OrdemCompraStatus.RASCUNHO, OrdemCompraStatus.ENVIADA, OrdemCompraStatus.PARCIAL]
                ),
            )
            .count(),
            "titulos_abertos": db.query(Titulo)
            .filter(Titulo.empresa_id == user.empresa_id, Titulo.status == TituloStatus.ABERTO)
            .count(),
            "entregas_abertas": db.query(Entrega)
            .filter(Entrega.empresa_id == user.empresa_id, Entrega.status != EntregaStatus.CONFIRMADA)
            .count(),
        },
        "contagens": {
            "parceiros": db.query(Parceiro).filter(Parceiro.empresa_id == user.empresa_id).count(),
            "produtos": db.query(Produto).filter(Produto.empresa_id == user.empresa_id).count(),
            "orcamentos": db.query(Orcamento).filter(Orcamento.empresa_id == user.empresa_id).count(),
            "pedidos": db.query(Pedido).filter(Pedido.empresa_id == user.empresa_id).count(),
            "ops": db.query(OrdemProducao).filter(OrdemProducao.empresa_id == user.empresa_id).count(),
            "nf_saida": db.query(DocumentoFiscalSaida)
            .filter(DocumentoFiscalSaida.empresa_id == user.empresa_id)
            .count(),
            "titulos": db.query(Titulo).filter(Titulo.empresa_id == user.empresa_id).count(),
            "entregas": db.query(Entrega).filter(Entrega.empresa_id == user.empresa_id).count(),
            "naturezas": db.query(NaturezaGerencial).count(),
            "patrimonio": db.query(BemPatrimonio).filter(BemPatrimonio.empresa_id == user.empresa_id).count(),
            "devolucoes": db.query(Devolucao).filter(Devolucao.empresa_id == user.empresa_id).count(),
        },
    }


@router.get("/homologacao/criterios")
def list_criterios(db: DbDep, user: CurrentUser):
    rows = (
        db.query(HomologacaoResultado)
        .filter(HomologacaoResultado.empresa_id == user.empresa_id)
        .order_by(HomologacaoResultado.criterio_id)
        .all()
    )
    by_id = {r.criterio_id: r for r in rows}
    out = []
    for ca in CRITERIOS_ACEITE:
        r = by_id.get(ca["id"])
        out.append(
            {
                **ca,
                "status": r.status.value if r else "PENDENTE",
                "evidencias": r.evidencias if r else None,
                "atualizado_por": r.atualizado_por if r else None,
                "updated_at": r.updated_at if r else None,
            }
        )
    return out


@router.put("/homologacao/criterios/{cid}")
def update_criterio(cid: str, body: HomologacaoUpdateIn, db: DbDep, user: CurrentUser):
    _require(user, R.PERM_HOMOLOGACAO)
    if cid not in {c["id"] for c in CRITERIOS_ACEITE}:
        raise HTTPException(404, "Critério desconhecido")
    r = (
        db.query(HomologacaoResultado)
        .filter(HomologacaoResultado.empresa_id == user.empresa_id, HomologacaoResultado.criterio_id == cid)
        .first()
    )
    if not r:
        r = HomologacaoResultado(empresa_id=user.empresa_id, criterio_id=cid)
        db.add(r)
    r.status = CaStatus(body.status)
    r.evidencias = body.evidencias
    r.atualizado_por = user.email
    db.commit()
    return {"id": cid, "status": r.status.value}


@router.get("/homologacao/go-nogo")
def go_nogo(db: DbDep, user: CurrentUser):
    rows = db.query(HomologacaoResultado).filter(HomologacaoResultado.empresa_id == user.empresa_id).all()
    by = {r.criterio_id: r.status for r in rows}
    # S1: CA-01..06, 08..12 PASS; CA-07 pelo menos lab (PASS ou NA ok in S1? Doc says lab DEV)
    s1_ids = [f"CA-{i:02d}" for i in (1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12)]
    fails = [cid for cid in s1_ids if by.get(cid) == CaStatus.FAIL]
    pending = [cid for cid in s1_ids if by.get(cid) not in (CaStatus.PASS, CaStatus.NA)]
    ca07 = by.get("CA-07")
    decision = "GO" if not fails and not pending else "NO-GO"
    return {
        "decisao": decision,
        "fails": fails,
        "pending": pending,
        "ca07_status": ca07.value if ca07 else "PENDENTE",
        "nota": "Gate S1 conforme HOMOLOGACAO_ERP_RLP — CA-07 aceito como lab/DEV.",
    }
