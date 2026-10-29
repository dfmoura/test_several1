"""Herança de configuração: global → matriz → filial (se autorizada)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import (
    ESCOPOS_CONFIG,
    ConfiguracaoColeta,
    ConfiguracaoColetaParametro,
    HistoricoConfiguracao,
    ParametroColeta,
    Unidade,
    Usuario,
)
from app.org.service import is_admin_plataforma, papel_na_unidade, usuario_acessa_unidade


class ConfigError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def pode_editar_escopo(db: Session, user: Usuario, escopo: str, unidade_id: int | None) -> bool:
    if is_admin_plataforma(user):
        return True
    if escopo == "global":
        return False
    if unidade_id is None:
        return False
    if not usuario_acessa_unidade(db, user, unidade_id):
        return False
    papel = papel_na_unidade(db, user, unidade_id)
    if escopo == "matriz":
        return papel in {"admin_matriz", "gestor_matriz", "admin_plataforma"}
    if escopo == "filial":
        return papel in {
            "admin_matriz",
            "gestor_matriz",
            "gestor_filial",
            "admin_plataforma",
        }
    return False


def listar_parametros(db: Session) -> list[ParametroColeta]:
    return list(
        db.scalars(
            select(ParametroColeta)
            .where(ParametroColeta.ativo.is_(True))
            .order_by(ParametroColeta.chave.asc())
        ).all()
    )


def _validar_valor(param: ParametroColeta, valor: str | None) -> str | None:
    if valor is None:
        return None
    v = valor.strip() if isinstance(valor, str) else str(valor)
    t = param.tipo_valor
    if t == "int":
        try:
            int(v)
        except ValueError as exc:
            raise ConfigError(f"Parâmetro {param.chave} exige inteiro.") from exc
    elif t == "bool":
        if v.lower() not in ("true", "false", "1", "0", "sim", "nao", "não"):
            raise ConfigError(f"Parâmetro {param.chave} exige boolean.")
        v = "true" if v.lower() in ("true", "1", "sim") else "false"
    elif t == "json":
        try:
            json.loads(v)
        except json.JSONDecodeError as exc:
            raise ConfigError(f"Parâmetro {param.chave} exige JSON válido.") from exc
    return v


def garantir_configuracao(
    db: Session,
    *,
    escopo: str,
    unidade_id: int | None = None,
    nome: str | None = None,
) -> ConfiguracaoColeta:
    escopo_ok = (escopo or "").strip().lower()
    if escopo_ok not in ESCOPOS_CONFIG:
        raise ConfigError("Escopo inválido. Use: global, matriz ou filial.")

    if escopo_ok == "global":
        unidade_id = None
    else:
        if unidade_id is None:
            raise ConfigError(f"Escopo {escopo_ok} exige unidade_id.")
        unidade = db.get(Unidade, unidade_id)
        if unidade is None:
            raise ConfigError("Unidade não encontrada.", status_code=404)
        if escopo_ok == "matriz" and unidade.tipo != "matriz":
            raise ConfigError("Escopo matriz exige unidade do tipo matriz.")
        if escopo_ok == "filial" and unidade.tipo != "filial":
            raise ConfigError("Escopo filial exige unidade do tipo filial.")

    stmt = select(ConfiguracaoColeta).where(
        ConfiguracaoColeta.escopo == escopo_ok,
        ConfiguracaoColeta.situacao == "ativa",
    )
    if unidade_id is None:
        stmt = stmt.where(ConfiguracaoColeta.unidade_id.is_(None))
    else:
        stmt = stmt.where(ConfiguracaoColeta.unidade_id == unidade_id)

    cfg = db.scalar(stmt)
    if cfg is None:
        cfg = ConfiguracaoColeta(
            escopo=escopo_ok,
            unidade_id=unidade_id,
            nome=nome or f"Config {escopo_ok}",
            situacao="ativa",
            versao=1,
            vigencia_inicio=_utcnow(),
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


def _mapa_valores_config(cfg: ConfiguracaoColeta | None) -> dict[int, str | None]:
    if cfg is None:
        return {}
    return {p.parametro_id: p.valor for p in cfg.parametros}


def _config_ativa(
    db: Session,
    escopo: str,
    unidade_id: int | None,
) -> ConfiguracaoColeta | None:
    stmt = (
        select(ConfiguracaoColeta)
        .where(
            ConfiguracaoColeta.escopo == escopo,
            ConfiguracaoColeta.situacao == "ativa",
        )
        .options(
            joinedload(ConfiguracaoColeta.parametros).joinedload(
                ConfiguracaoColetaParametro.parametro
            )
        )
    )
    if unidade_id is None:
        stmt = stmt.where(ConfiguracaoColeta.unidade_id.is_(None))
    else:
        stmt = stmt.where(ConfiguracaoColeta.unidade_id == unidade_id)
    return db.scalar(stmt)


def resolver_efetiva(
    db: Session,
    *,
    unidade_id: int | None = None,
) -> list[dict[str, Any]]:
    """Resolve valores efetivos com herança (não cópia).

    Precedência: catálogo (padrão) → global → matriz → filial (se autorizada).
    """
    catalogo = listar_parametros(db)
    global_cfg = _config_ativa(db, "global", None)
    global_vals = _mapa_valores_config(global_cfg)

    matriz_cfg = None
    matriz_vals: dict[int, str | None] = {}
    filial_cfg = None
    filial_vals: dict[int, str | None] = {}
    unidade: Unidade | None = None
    excecoes_ok = False

    if unidade_id is not None:
        unidade = db.get(Unidade, unidade_id)
        if unidade is None:
            raise ConfigError("Unidade não encontrada.", status_code=404)

        matriz_id = unidade.id if unidade.tipo == "matriz" else unidade.matriz_id
        if matriz_id:
            matriz_cfg = _config_ativa(db, "matriz", matriz_id)
            matriz_vals = _mapa_valores_config(matriz_cfg)

        if unidade.tipo == "filial":
            filial_cfg = _config_ativa(db, "filial", unidade.id)
            filial_vals = _mapa_valores_config(filial_cfg)
            excecoes_ok = bool(unidade.excecoes_config_autorizadas)

    out: list[dict[str, Any]] = []
    for param in catalogo:
        valor = param.valor_padrao
        origem = "catalogo"
        escopo_fonte = None

        if param.id in global_vals:
            valor = global_vals[param.id]
            origem = "global"
            escopo_fonte = "global"

        if param.id in matriz_vals:
            valor = matriz_vals[param.id]
            origem = "matriz"
            escopo_fonte = "matriz"

        if (
            unidade
            and unidade.tipo == "filial"
            and excecoes_ok
            and param.permite_excecao_filial
            and param.id in filial_vals
        ):
            valor = filial_vals[param.id]
            origem = "filial"
            escopo_fonte = "filial"

        out.append(
            {
                "parametro_id": param.id,
                "chave": param.chave,
                "nome": param.nome,
                "descricao": param.descricao,
                "tipo_valor": param.tipo_valor,
                "modulo": param.modulo,
                "valor": valor,
                "origem": origem,
                "escopo_fonte": escopo_fonte,
                "permite_excecao_filial": param.permite_excecao_filial,
                "valor_padrao": param.valor_padrao,
                "excecoes_filial_autorizadas": excecoes_ok if unidade and unidade.tipo == "filial" else None,
            }
        )
    return out


def definir_valor(
    db: Session,
    *,
    escopo: str,
    chave: str,
    valor: str | None,
    usuario_id: int | None = None,
    unidade_id: int | None = None,
    motivo: str | None = None,
) -> dict[str, Any]:
    param = db.scalar(select(ParametroColeta).where(ParametroColeta.chave == chave))
    if param is None or not param.ativo:
        raise ConfigError("Parâmetro não encontrado.", status_code=404)

    escopo_ok = (escopo or "").strip().lower()
    if escopo_ok == "filial":
        if unidade_id is None:
            raise ConfigError("Escopo filial exige unidade_id.")
        unidade = db.get(Unidade, unidade_id)
        if unidade is None or unidade.tipo != "filial":
            raise ConfigError("Unidade filial inválida.")
        if not unidade.excecoes_config_autorizadas:
            raise ConfigError(
                "Filial sem autorização da matriz para exceções de configuração.",
                status_code=403,
            )
        if not param.permite_excecao_filial:
            raise ConfigError(
                f"Parâmetro {chave} não permite exceção por filial.",
                status_code=403,
            )

    valor_ok = _validar_valor(param, valor)
    cfg = garantir_configuracao(db, escopo=escopo_ok, unidade_id=unidade_id)
    # reload with params
    cfg = _config_ativa(db, escopo_ok, unidade_id) or cfg

    row = next((p for p in cfg.parametros if p.parametro_id == param.id), None)
    anterior = {param.chave: row.valor if row else None}

    if row is None:
        row = ConfiguracaoColetaParametro(
            configuracao_id=cfg.id,
            parametro_id=param.id,
            valor=valor_ok,
            origem_valor="definido",
        )
        db.add(row)
    else:
        row.valor = valor_ok
        row.origem_valor = "definido"

    cfg.versao = int(cfg.versao or 1) + 1
    cfg.atualizado_em = _utcnow()

    db.add(
        HistoricoConfiguracao(
            configuracao_id=cfg.id,
            usuario_id=usuario_id,
            valores_anteriores=json.dumps(anterior, ensure_ascii=False),
            valores_novos=json.dumps({param.chave: valor_ok}, ensure_ascii=False),
            motivo=motivo,
        )
    )
    db.commit()

    return {
        "configuracao_id": cfg.id,
        "escopo": cfg.escopo,
        "unidade_id": cfg.unidade_id,
        "versao": cfg.versao,
        "chave": param.chave,
        "valor": valor_ok,
    }


def limpar_excecao_filial(
    db: Session,
    *,
    unidade_id: int,
    chave: str,
    usuario_id: int | None = None,
    motivo: str | None = None,
) -> dict[str, Any]:
    """Remove override local — filial volta a herdar matriz/global."""
    param = db.scalar(select(ParametroColeta).where(ParametroColeta.chave == chave))
    if param is None:
        raise ConfigError("Parâmetro não encontrado.", status_code=404)
    cfg = _config_ativa(db, "filial", unidade_id)
    if cfg is None:
        raise ConfigError("Filial sem configuração local.", status_code=404)
    row = next((p for p in cfg.parametros if p.parametro_id == param.id), None)
    if row is None:
        raise ConfigError("Sem exceção local para este parâmetro.", status_code=404)

    anterior = {param.chave: row.valor}
    db.delete(row)
    cfg.versao = int(cfg.versao or 1) + 1
    db.add(
        HistoricoConfiguracao(
            configuracao_id=cfg.id,
            usuario_id=usuario_id,
            valores_anteriores=json.dumps(anterior, ensure_ascii=False),
            valores_novos=json.dumps({param.chave: None}, ensure_ascii=False),
            motivo=motivo or "Remoção de exceção — herança restaurada",
        )
    )
    db.commit()
    return {"ok": True, "chave": chave, "herda_novamente": True}


def autorizar_excecoes_filial(
    db: Session,
    *,
    unidade_id: int,
    autorizar: bool,
) -> Unidade:
    unidade = db.get(Unidade, unidade_id)
    if unidade is None:
        raise ConfigError("Unidade não encontrada.", status_code=404)
    if unidade.tipo != "filial":
        raise ConfigError("Somente filiais recebem autorização de exceção.")
    unidade.excecoes_config_autorizadas = bool(autorizar)
    db.commit()
    db.refresh(unidade)
    return unidade


def listar_historico(
    db: Session,
    configuracao_id: int,
    *,
    limite: int = 50,
) -> list[HistoricoConfiguracao]:
    return list(
        db.scalars(
            select(HistoricoConfiguracao)
            .where(HistoricoConfiguracao.configuracao_id == configuracao_id)
            .order_by(HistoricoConfiguracao.id.desc())
            .limit(limite)
        ).all()
    )
