"""Regras de negócio: organização, unidades e vínculos de usuários."""

from __future__ import annotations

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, joinedload

from app.database import (
    PAPEIS_UNIDADE,
    TIPOS_UNIDADE,
    ConfiguracaoColeta,
    FilialMunicipio,
    FilialUasg,
    Organizacao,
    Sessao,
    Unidade,
    Usuario,
    UsuarioUnidade,
)

PAPEL_ADMIN_PLATAFORMA = "admin"


class OrgError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _norm_codigo(codigo: str | None) -> str | None:
    """Normaliza código operacional (mnemônico, único no escopo).

    Rejeita códigos só numéricos (ex.: «1») — placeholder frágil para
    identificação humana e relatórios. Preferir OSB, OSBUDI, MAT-DEMO.
    """
    if codigo is None:
        return None
    c = codigo.strip().upper()
    if not c:
        return None
    if c.isdigit():
        raise OrgError(
            "Código deve ser mnemônico (letras ou letras+números), "
            "não apenas dígitos. Ex.: OSB, OSBUDI."
        )
    return c


def _norm_cnpj(cnpj: str | None) -> str | None:
    if not cnpj:
        return None
    digits = "".join(ch for ch in cnpj if ch.isdigit())
    if not digits:
        return None
    if len(digits) != 14:
        raise OrgError("CNPJ deve ter 14 dígitos.")
    return digits


def _validar_papel_unidade(papel: str) -> str:
    p = (papel or "").strip().lower()
    if p not in PAPEIS_UNIDADE:
        raise OrgError(
            f"Papel de unidade inválido. Use: {', '.join(sorted(PAPEIS_UNIDADE))}."
        )
    return p


def _validar_papel_para_unidade(unidade: Unidade, papel: str) -> str:
    papel_ok = _validar_papel_unidade(papel)
    if unidade.tipo == "matriz" and papel_ok in {"gestor_filial", "analista_filial"}:
        raise OrgError("Papel de filial não se aplica à matriz.")
    if unidade.tipo == "filial" and papel_ok in {"admin_matriz", "gestor_matriz"}:
        raise OrgError("Papel de matriz não se aplica à filial.")
    return papel_ok


def is_admin_plataforma(user: Usuario) -> bool:
    return user.papel == PAPEL_ADMIN_PLATAFORMA and user.ativo


def listar_vinculos_usuario(db: Session, usuario_id: int) -> list[UsuarioUnidade]:
    return list(
        db.scalars(
            select(UsuarioUnidade)
            .where(
                UsuarioUnidade.usuario_id == usuario_id,
                UsuarioUnidade.ativo.is_(True),
            )
            .options(joinedload(UsuarioUnidade.unidade).joinedload(Unidade.organizacao))
        ).unique().all()
    )


def _filiais_da_organizacao(db: Session, organizacao_id: int) -> list[Unidade]:
    return list(
        db.scalars(
            select(Unidade)
            .where(
                Unidade.organizacao_id == organizacao_id,
                Unidade.tipo == "filial",
                Unidade.ativo.is_(True),
            )
            .options(joinedload(Unidade.organizacao))
            .order_by(Unidade.nome.asc())
        )
        .unique()
        .all()
    )


def unidades_acessiveis(db: Session, user: Usuario) -> list[Unidade]:
    """Unidades no ACL efetivo: vínculos diretos + filiais descendentes de matriz.

    O login (memberships) dita o escopo. Papel na matriz inclui as filiais da org.
    """
    if is_admin_plataforma(user):
        return list(
            db.scalars(
                select(Unidade)
                .where(Unidade.ativo.is_(True))
                .options(joinedload(Unidade.organizacao))
                .order_by(Unidade.organizacao_id, Unidade.tipo, Unidade.nome)
            )
            .unique()
            .all()
        )
    vinculos = listar_vinculos_usuario(db, user.id)
    por_id: dict[int, Unidade] = {}
    for v in vinculos:
        u = v.unidade
        if not u or not u.ativo:
            continue
        por_id[u.id] = u
        if u.tipo == "matriz":
            for filial in _filiais_da_organizacao(db, u.organizacao_id):
                por_id.setdefault(filial.id, filial)
    return sorted(
        por_id.values(),
        key=lambda x: (x.organizacao_id, 0 if x.tipo == "matriz" else 1, x.nome or ""),
    )


def usuario_acessa_unidade(db: Session, user: Usuario, unidade_id: int) -> bool:
    if is_admin_plataforma(user):
        return db.get(Unidade, unidade_id) is not None
    return any(u.id == unidade_id for u in unidades_acessiveis(db, user))


def papel_na_unidade(db: Session, user: Usuario, unidade_id: int) -> str | None:
    """Papel efetivo: vínculo direto ou herança da matriz (quando acessa filial)."""
    if is_admin_plataforma(user):
        return "admin_plataforma"
    row = db.scalar(
        select(UsuarioUnidade).where(
            UsuarioUnidade.usuario_id == user.id,
            UsuarioUnidade.unidade_id == unidade_id,
            UsuarioUnidade.ativo.is_(True),
        )
    )
    if row:
        return row.papel

    unidade = db.get(Unidade, unidade_id)
    if unidade is None or not unidade.ativo or unidade.tipo != "filial":
        return None
    for v in listar_vinculos_usuario(db, user.id):
        m = v.unidade
        if (
            m
            and m.ativo
            and m.tipo == "matriz"
            and m.organizacao_id == unidade.organizacao_id
        ):
            return v.papel
    return None


def filiais_acessiveis(db: Session, user: Usuario) -> list[Unidade]:
    """Somente filiais no ACL efetivo (admin = todas as filiais ativas)."""
    return [u for u in unidades_acessiveis(db, user) if u.tipo == "filial"]


def criar_organizacao(
    db: Session,
    *,
    nome: str,
    codigo: str | None = None,
) -> Organizacao:
    nome_ok = (nome or "").strip()
    if len(nome_ok) < 2:
        raise OrgError("Nome da organização deve ter ao menos 2 caracteres.")
    codigo_ok = _norm_codigo(codigo)
    if codigo_ok:
        existe = db.scalar(select(Organizacao).where(Organizacao.codigo == codigo_ok))
        if existe:
            raise OrgError("Já existe organização com este código.", status_code=409)
    org = Organizacao(nome=nome_ok, codigo=codigo_ok, ativo=True)
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


def listar_organizacoes(db: Session, user: Usuario) -> list[Organizacao]:
    if is_admin_plataforma(user):
        return list(
            db.scalars(
                select(Organizacao).order_by(Organizacao.nome.asc())
            ).all()
        )
    ids = {u.organizacao_id for u in unidades_acessiveis(db, user)}
    if not ids:
        return []
    return list(
        db.scalars(
            select(Organizacao)
            .where(Organizacao.id.in_(ids))
            .order_by(Organizacao.nome.asc())
        ).all()
    )


def obter_organizacao(db: Session, org_id: int) -> Organizacao:
    org = db.get(Organizacao, org_id)
    if org is None:
        raise OrgError("Organização não encontrada.", status_code=404)
    return org


def atualizar_organizacao(
    db: Session,
    org_id: int,
    *,
    nome: str | None = None,
    codigo: str | None = None,
    ativo: bool | None = None,
) -> Organizacao:
    org = obter_organizacao(db, org_id)
    if nome is not None:
        nome_ok = nome.strip()
        if len(nome_ok) < 2:
            raise OrgError("Nome da organização deve ter ao menos 2 caracteres.")
        org.nome = nome_ok
    if codigo is not None:
        codigo_ok = _norm_codigo(codigo)
        if codigo_ok:
            conflito = db.scalar(
                select(Organizacao).where(
                    Organizacao.codigo == codigo_ok,
                    Organizacao.id != org.id,
                )
            )
            if conflito:
                raise OrgError(
                    "Já existe organização com este código.",
                    status_code=409,
                )
        org.codigo = codigo_ok
    if ativo is not None:
        org.ativo = ativo
    db.commit()
    db.refresh(org)
    return org


def _token_confirmacao_org(org: Organizacao) -> str:
    """Token que o admin deve digitar para confirmar exclusão definitiva.

    Preferência: código mnemônico (ex.: OSB-DEMO). Sem código, usa o nome.
    """
    if org.codigo and org.codigo.strip():
        return org.codigo.strip().upper()
    return (org.nome or "").strip()


def impacto_exclusao_organizacao(db: Session, org_id: int) -> dict:
    """Inventário do que será removido com a organização (derivações de escopo).

    Catálogos centrais (UASG, órgãos, contratações, municípios IBGE) não entram:
    são compartilhados e independentes do tenant.
    """
    org = obter_organizacao(db, org_id)
    unidade_ids = list(
        db.scalars(select(Unidade.id).where(Unidade.organizacao_id == org_id)).all()
    )
    n_unidades = len(unidade_ids)
    n_matrizes = (
        db.scalar(
            select(func.count())
            .select_from(Unidade)
            .where(Unidade.organizacao_id == org_id, Unidade.tipo == "matriz")
        )
        or 0
    )
    n_filiais = (
        db.scalar(
            select(func.count())
            .select_from(Unidade)
            .where(Unidade.organizacao_id == org_id, Unidade.tipo == "filial")
        )
        or 0
    )
    if unidade_ids:
        n_vinculos = (
            db.scalar(
                select(func.count())
                .select_from(UsuarioUnidade)
                .where(UsuarioUnidade.unidade_id.in_(unidade_ids))
            )
            or 0
        )
        n_municipios = (
            db.scalar(
                select(func.count())
                .select_from(FilialMunicipio)
                .where(FilialMunicipio.unidade_id.in_(unidade_ids))
            )
            or 0
        )
        n_uasgs = (
            db.scalar(
                select(func.count())
                .select_from(FilialUasg)
                .where(FilialUasg.unidade_id.in_(unidade_ids))
            )
            or 0
        )
        n_configs = (
            db.scalar(
                select(func.count())
                .select_from(ConfiguracaoColeta)
                .where(ConfiguracaoColeta.unidade_id.in_(unidade_ids))
            )
            or 0
        )
        n_sessoes = (
            db.scalar(
                select(func.count())
                .select_from(Sessao)
                .where(Sessao.unidade_ativa_id.in_(unidade_ids))
            )
            or 0
        )
    else:
        n_vinculos = n_municipios = n_uasgs = n_configs = n_sessoes = 0

    unidades = list(
        db.scalars(
            select(Unidade)
            .where(Unidade.organizacao_id == org_id)
            .order_by(Unidade.tipo.asc(), Unidade.nome.asc())
        ).all()
    )
    return {
        "organizacao": {
            "id": org.id,
            "nome": org.nome,
            "codigo": org.codigo,
            "ativo": org.ativo,
        },
        "confirmacao_requerida": _token_confirmacao_org(org),
        "totais": {
            "unidades": n_unidades,
            "matrizes": int(n_matrizes),
            "filiais": int(n_filiais),
            "vinculos_usuario": int(n_vinculos),
            "filial_municipio": int(n_municipios),
            "filial_uasg": int(n_uasgs),
            "configuracoes_coleta": int(n_configs),
            "sessoes_filtro_visao": int(n_sessoes),
        },
        "unidades": [
            {
                "id": u.id,
                "tipo": u.tipo,
                "nome": u.nome,
                "codigo": u.codigo,
                "ativo": u.ativo,
            }
            for u in unidades
        ],
        "preserva": (
            "Catálogos centrais (municípios IBGE, órgãos, UASGs, contratações, "
            "fornecedores) e usuários da plataforma não são removidos."
        ),
    }


def excluir_organizacao(
    db: Session,
    org_id: int,
    *,
    confirmacao: str,
) -> dict:
    """Exclusão definitiva da organização e derivações de escopo.

    Segurança: admin deve digitar o código (ou nome) exato. Sessões com
    filtro de visão apontando para unidades da org são liberadas (SET NULL).
    """
    org = obter_organizacao(db, org_id)
    esperado = _token_confirmacao_org(org)
    digitado = (confirmacao or "").strip()
    if org.codigo and org.codigo.strip():
        digitado = digitado.upper()
    if not digitado or digitado != esperado:
        raise OrgError(
            f"Confirmação inválida. Digite exatamente «{esperado}» para excluir.",
            status_code=400,
        )

    impacto = impacto_exclusao_organizacao(db, org_id)
    unidade_ids = [u["id"] for u in impacto["unidades"]]

    if unidade_ids:
        db.execute(
            update(Sessao)
            .where(Sessao.unidade_ativa_id.in_(unidade_ids))
            .values(unidade_ativa_id=None)
        )

    snapshot = {
        "id": org.id,
        "nome": org.nome,
        "codigo": org.codigo,
    }
    db.delete(org)
    db.commit()
    return {
        "ok": True,
        "excluida": snapshot,
        "impacto": impacto["totais"],
        "preserva": impacto["preserva"],
    }


def criar_unidade(
    db: Session,
    *,
    organizacao_id: int,
    tipo: str,
    nome: str,
    codigo: str | None = None,
    matriz_id: int | None = None,
    cnpj: str | None = None,
    observacoes: str | None = None,
) -> Unidade:
    org = obter_organizacao(db, organizacao_id)
    if not org.ativo:
        raise OrgError("Organização inativa.")

    tipo_ok = (tipo or "").strip().lower()
    if tipo_ok not in TIPOS_UNIDADE:
        raise OrgError("Tipo inválido. Use: matriz ou filial.")

    nome_ok = (nome or "").strip()
    if len(nome_ok) < 2:
        raise OrgError("Nome da unidade deve ter ao menos 2 caracteres.")

    codigo_ok = _norm_codigo(codigo)
    cnpj_ok = _norm_cnpj(cnpj)

    if tipo_ok == "matriz":
        existente = db.scalar(
            select(Unidade).where(
                Unidade.organizacao_id == organizacao_id,
                Unidade.tipo == "matriz",
                Unidade.ativo.is_(True),
            )
        )
        if existente:
            raise OrgError(
                "Esta organização já possui uma matriz ativa.",
                status_code=409,
            )
        matriz_id = None
    else:
        # Filial: se matriz_id omitido e há exatamente uma matriz ativa, resolve sozinho.
        if matriz_id is None:
            matrizes = list(
                db.scalars(
                    select(Unidade).where(
                        Unidade.organizacao_id == organizacao_id,
                        Unidade.tipo == "matriz",
                        Unidade.ativo.is_(True),
                    )
                ).all()
            )
            if len(matrizes) == 1:
                matriz_id = matrizes[0].id
            elif not matrizes:
                raise OrgError(
                    "Cadastre a matriz da organização antes de criar uma filial."
                )
            else:
                raise OrgError(
                    "Informe a matriz à qual esta filial pertence (matriz_id)."
                )
        matriz = db.get(Unidade, matriz_id)
        if matriz is None or matriz.organizacao_id != organizacao_id:
            raise OrgError("Matriz inválida para esta organização.")
        if matriz.tipo != "matriz":
            raise OrgError("matriz_id deve apontar para uma unidade do tipo matriz.")
        if not matriz.ativo:
            raise OrgError("A matriz informada está inativa.")

    if codigo_ok:
        conflito = db.scalar(
            select(Unidade).where(
                Unidade.organizacao_id == organizacao_id,
                Unidade.codigo == codigo_ok,
            )
        )
        if conflito:
            raise OrgError("Já existe unidade com este código na organização.", status_code=409)

    unidade = Unidade(
        organizacao_id=organizacao_id,
        tipo=tipo_ok,
        nome=nome_ok,
        codigo=codigo_ok,
        matriz_id=matriz_id,
        cnpj=cnpj_ok,
        observacoes=(observacoes or "").strip() or None,
        ativo=True,
    )
    db.add(unidade)
    db.commit()
    db.refresh(unidade)
    return unidade


def listar_unidades_org(db: Session, organizacao_id: int, user: Usuario) -> list[Unidade]:
    obter_organizacao(db, organizacao_id)
    rows = list(
        db.scalars(
            select(Unidade)
            .where(Unidade.organizacao_id == organizacao_id)
            .options(joinedload(Unidade.organizacao))
            .order_by(Unidade.tipo.asc(), Unidade.nome.asc())
        )
        .unique()
        .all()
    )
    if is_admin_plataforma(user):
        return rows
    acessiveis = {u.id for u in unidades_acessiveis(db, user)}
    return [u for u in rows if u.id in acessiveis]


def obter_unidade(db: Session, unidade_id: int) -> Unidade:
    unidade = db.get(Unidade, unidade_id)
    if unidade is None:
        raise OrgError("Unidade não encontrada.", status_code=404)
    return unidade


def atualizar_unidade(
    db: Session,
    unidade_id: int,
    *,
    nome: str | None = None,
    codigo: str | None = None,
    cnpj: str | None = None,
    ativo: bool | None = None,
    observacoes: str | None = None,
) -> Unidade:
    unidade = obter_unidade(db, unidade_id)
    if nome is not None:
        nome_ok = nome.strip()
        if len(nome_ok) < 2:
            raise OrgError("Nome da unidade deve ter ao menos 2 caracteres.")
        unidade.nome = nome_ok
    if codigo is not None:
        codigo_ok = _norm_codigo(codigo)
        if codigo_ok:
            conflito = db.scalar(
                select(Unidade).where(
                    Unidade.organizacao_id == unidade.organizacao_id,
                    Unidade.codigo == codigo_ok,
                    Unidade.id != unidade.id,
                )
            )
            if conflito:
                raise OrgError(
                    "Já existe unidade com este código na organização.",
                    status_code=409,
                )
        unidade.codigo = codigo_ok
    if cnpj is not None:
        unidade.cnpj = _norm_cnpj(cnpj)
    if observacoes is not None:
        unidade.observacoes = observacoes.strip() or None
    if ativo is not None:
        unidade.ativo = ativo
    db.commit()
    db.refresh(unidade)
    return unidade


def _token_confirmacao_unidade(unidade: Unidade) -> str:
    """Token que o admin deve digitar para confirmar exclusão definitiva.

    Preferência: código mnemônico (ex.: FIL-CENTRO). Sem código, usa o nome.
    """
    if unidade.codigo and unidade.codigo.strip():
        return unidade.codigo.strip().upper()
    return (unidade.nome or "").strip()


def impacto_exclusao_unidade(db: Session, unidade_id: int) -> dict:
    """Inventário do que será removido com a unidade (derivações de escopo).

    Catálogos centrais (UASG, órgãos, contratações, municípios IBGE) não entram:
    são compartilhados e independentes do tenant.
    """
    unidade = obter_unidade(db, unidade_id)
    n_filiais_dependentes = 0
    if unidade.tipo == "matriz":
        n_filiais_dependentes = (
            db.scalar(
                select(func.count())
                .select_from(Unidade)
                .where(Unidade.matriz_id == unidade_id)
            )
            or 0
        )

    n_vinculos = (
        db.scalar(
            select(func.count())
            .select_from(UsuarioUnidade)
            .where(UsuarioUnidade.unidade_id == unidade_id)
        )
        or 0
    )
    n_municipios = (
        db.scalar(
            select(func.count())
            .select_from(FilialMunicipio)
            .where(FilialMunicipio.unidade_id == unidade_id)
        )
        or 0
    )
    n_uasgs = (
        db.scalar(
            select(func.count())
            .select_from(FilialUasg)
            .where(FilialUasg.unidade_id == unidade_id)
        )
        or 0
    )
    n_configs = (
        db.scalar(
            select(func.count())
            .select_from(ConfiguracaoColeta)
            .where(ConfiguracaoColeta.unidade_id == unidade_id)
        )
        or 0
    )
    n_sessoes = (
        db.scalar(
            select(func.count())
            .select_from(Sessao)
            .where(Sessao.unidade_ativa_id == unidade_id)
        )
        or 0
    )

    bloqueio = None
    if unidade.tipo == "matriz" and n_filiais_dependentes > 0:
        bloqueio = (
            f"Esta matriz possui {int(n_filiais_dependentes)} filial(is) vinculada(s). "
            "Exclua as filiais antes de remover a matriz."
        )

    return {
        "unidade": {
            "id": unidade.id,
            "tipo": unidade.tipo,
            "nome": unidade.nome,
            "codigo": unidade.codigo,
            "organizacao_id": unidade.organizacao_id,
            "ativo": unidade.ativo,
        },
        "confirmacao_requerida": _token_confirmacao_unidade(unidade),
        "pode_excluir": bloqueio is None,
        "bloqueio": bloqueio,
        "totais": {
            "filiais_dependentes": int(n_filiais_dependentes),
            "vinculos_usuario": int(n_vinculos),
            "filial_municipio": int(n_municipios),
            "filial_uasg": int(n_uasgs),
            "configuracoes_coleta": int(n_configs),
            "sessoes_filtro_visao": int(n_sessoes),
        },
        "preserva": (
            "Catálogos centrais (municípios IBGE, órgãos, UASGs, contratações, "
            "fornecedores), a organização/matriz e usuários da plataforma não são removidos."
        ),
    }


def excluir_unidade(
    db: Session,
    unidade_id: int,
    *,
    confirmacao: str,
) -> dict:
    """Exclusão definitiva da unidade e derivações de escopo.

    Segurança: admin deve digitar o código (ou nome) exato. Matriz com filiais
    vinculadas é bloqueada (excluir filiais primeiro). Sessões com filtro de
    visão apontando para a unidade são liberadas (SET NULL).
    """
    unidade = obter_unidade(db, unidade_id)
    esperado = _token_confirmacao_unidade(unidade)
    digitado = (confirmacao or "").strip()
    if unidade.codigo and unidade.codigo.strip():
        digitado = digitado.upper()
    if not digitado or digitado != esperado:
        raise OrgError(
            f"Confirmação inválida. Digite exatamente «{esperado}» para excluir.",
            status_code=400,
        )

    impacto = impacto_exclusao_unidade(db, unidade_id)
    if not impacto["pode_excluir"]:
        raise OrgError(impacto["bloqueio"] or "Unidade não pode ser excluída.", status_code=409)

    db.execute(
        update(Sessao)
        .where(Sessao.unidade_ativa_id == unidade_id)
        .values(unidade_ativa_id=None)
    )

    snapshot = {
        "id": unidade.id,
        "tipo": unidade.tipo,
        "nome": unidade.nome,
        "codigo": unidade.codigo,
        "organizacao_id": unidade.organizacao_id,
    }
    db.delete(unidade)
    db.commit()
    return {
        "ok": True,
        "excluida": snapshot,
        "impacto": impacto["totais"],
        "preserva": impacto["preserva"],
    }


def vincular_usuario(
    db: Session,
    *,
    unidade_id: int,
    usuario_id: int,
    papel: str,
) -> UsuarioUnidade:
    unidade = obter_unidade(db, unidade_id)
    user = db.get(Usuario, usuario_id)
    if user is None:
        raise OrgError("Usuário não encontrado.", status_code=404)

    papel_ok = _validar_papel_para_unidade(unidade, papel)

    existente = db.scalar(
        select(UsuarioUnidade).where(
            UsuarioUnidade.usuario_id == usuario_id,
            UsuarioUnidade.unidade_id == unidade_id,
        )
    )
    if existente:
        existente.papel = papel_ok
        existente.ativo = True
        db.commit()
        db.refresh(existente)
        return existente

    vinculo = UsuarioUnidade(
        usuario_id=usuario_id,
        unidade_id=unidade_id,
        papel=papel_ok,
        ativo=True,
    )
    db.add(vinculo)
    db.commit()
    db.refresh(vinculo)
    return vinculo


def listar_usuarios_unidade(db: Session, unidade_id: int) -> list[UsuarioUnidade]:
    obter_unidade(db, unidade_id)
    return list(
        db.scalars(
            select(UsuarioUnidade)
            .where(UsuarioUnidade.unidade_id == unidade_id)
            .options(joinedload(UsuarioUnidade.usuario))
            .order_by(UsuarioUnidade.id.asc())
        )
        .unique()
        .all()
    )


def _obter_vinculo(
    db: Session, unidade_id: int, usuario_id: int
) -> UsuarioUnidade:
    obter_unidade(db, unidade_id)
    row = db.scalar(
        select(UsuarioUnidade).where(
            UsuarioUnidade.unidade_id == unidade_id,
            UsuarioUnidade.usuario_id == usuario_id,
        )
    )
    if row is None:
        raise OrgError("Vínculo não encontrado.", status_code=404)
    return row


def atualizar_vinculo(
    db: Session,
    *,
    unidade_id: int,
    usuario_id: int,
    papel: str | None = None,
    ativo: bool | None = None,
) -> UsuarioUnidade:
    """Atualiza papel e/ou status do vínculo usuário ↔ unidade."""
    if papel is None and ativo is None:
        raise OrgError("Informe papel e/ou ativo para atualizar.")

    unidade = obter_unidade(db, unidade_id)
    row = _obter_vinculo(db, unidade_id, usuario_id)

    if papel is not None:
        row.papel = _validar_papel_para_unidade(unidade, papel)
    if ativo is not None:
        row.ativo = bool(ativo)

    db.commit()
    db.refresh(row)
    return row


def desvincular_usuario(db: Session, unidade_id: int, usuario_id: int) -> None:
    """Desativa o vínculo (soft delete) — remove acesso sem apagar o histórico."""
    row = _obter_vinculo(db, unidade_id, usuario_id)
    if not row.ativo:
        raise OrgError("Vínculo já está inativo.")
    row.ativo = False
    db.commit()


def excluir_vinculo(db: Session, unidade_id: int, usuario_id: int) -> dict:
    """Remove definitivamente o registro de vínculo (permite novo vínculo limpo)."""
    row = _obter_vinculo(db, unidade_id, usuario_id)
    snapshot = {
        "id": row.id,
        "usuario_id": row.usuario_id,
        "unidade_id": row.unidade_id,
        "papel": row.papel,
        "ativo": row.ativo,
    }
    db.delete(row)
    db.commit()
    return {"ok": True, "excluido": snapshot}
