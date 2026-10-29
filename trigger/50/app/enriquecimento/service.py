"""Persistência e orquestração de enriquecimento — nunca aborta coleta 07."""

from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable
from zoneinfo import ZoneInfo

from sqlalchemy import and_, func, select, update
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app import config as app_config
from app.compras.normalizers import normalizar_ni
from app.database import CacheCep, EnriquecimentoPosColeta, Fornecedor
from app.enriquecimento.cep import Fetcher as CepFetcher
from app.enriquecimento.cep import consultar_cep_publico, normalizar_cep
from app.enriquecimento.cnpj import Fetcher as CnpjFetcher
from app.enriquecimento.cnpj import consultar_cnpj_publico

# Cadeia pública de CNPJ só aceita 14 dígitos (CPF/outros ficam fora da fila).
NI_CNPJ_LEN = 14
_TZ_BRT = ZoneInfo("America/Sao_Paulo")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _agora_brt() -> datetime:
    return datetime.now(_TZ_BRT)


def eh_ni_cnpj(ni: str | None) -> bool:
    return bool(ni) and len(ni) == NI_CNPJ_LEN


def criterio_cnpj_pendente() -> ColumnElement[bool]:
    """Pendentes elegíveis à cadeia CNPJ — somente NI com 14 dígitos."""
    return and_(
        Fornecedor.cnpj_pendente.is_(True),
        func.length(Fornecedor.ni) == NI_CNPJ_LEN,
    )


def sanear_pendentes_nao_cnpj(db: Session, *, commit: bool = True) -> int:
    """Remove da fila NI que não são CNPJ (ex.: CPF 11). Idempotente."""
    result = db.execute(
        update(Fornecedor)
        .where(
            Fornecedor.cnpj_pendente.is_(True),
            func.length(Fornecedor.ni) != NI_CNPJ_LEN,
        )
        .values(cnpj_pendente=False, cnpj_ultimo_erro=None)
    )
    n = int(result.rowcount or 0)
    if commit and n:
        db.commit()
    elif n:
        db.flush()
    return n


def cache_cnpj_valido(row: Fornecedor, *, dias: int | None = None) -> bool:
    if row.cnpj_pendente or not row.cnpj_enriquecido_em or not row.fonte_cnpj:
        return False
    limite = dias if dias is not None else app_config.CNPJ_PUBLICO_CACHE_DIAS
    return row.cnpj_enriquecido_em >= _utcnow() - timedelta(days=limite)


def cache_cep_valido(row: CacheCep, *, dias: int | None = None) -> bool:
    if row.pendente or not row.fonte_cep or not row.enriquecido_em:
        return False
    limite = dias if dias is not None else app_config.CEP_PUBLICO_CACHE_DIAS
    return row.enriquecido_em >= _utcnow() - timedelta(days=limite)


def _truthy(val: str | None) -> bool:
    return str(val or "").strip().lower() in ("1", "true", "yes", "sim", "on")


def cnpj_pos_coleta_habilitado(db: Session) -> bool:
    """Respeita catálogo `enriquecimento.cnpj` (global) + limite env."""
    if int(getattr(app_config, "CNPJ_PUBLICO_POS_COLETA_LIMIT", 0) or 0) <= 0:
        return False
    try:
        from app.config_coleta.service import resolver_efetiva

        for row in resolver_efetiva(db, unidade_id=None):
            if row.get("chave") == "enriquecimento.cnpj":
                return _truthy(row.get("valor"))
    except Exception:  # noqa: BLE001 — catálogo ausente não bloqueia default
        return True
    return True


def limite_pos_coleta(db: Session) -> int:
    """Quantos CNPJs processar após coleta; 0 = não disparar."""
    if not cnpj_pos_coleta_habilitado(db):
        return 0
    return max(0, int(app_config.CNPJ_PUBLICO_POS_COLETA_LIMIT))


def max_sec_pos_coleta() -> float:
    """Teto de tempo por lote (segundos). 0 = sem teto por lote."""
    return max(0.0, float(getattr(app_config, "CNPJ_PUBLICO_POS_COLETA_MAX_SEC", 0) or 0))


def ate_hora_pos_coleta() -> str:
    """HH:MM local (BRT) — fim da janela de multi-lote."""
    return str(
        getattr(app_config, "CNPJ_PUBLICO_POS_COLETA_ATE_HORA", "06:00") or "06:00"
    ).strip() or "06:00"


def descanso_pos_coleta_sec() -> float:
    """Pausa entre lotes na janela noturna."""
    return max(
        0.0,
        float(getattr(app_config, "CNPJ_PUBLICO_POS_COLETA_DESCANSO_SEC", 0) or 0),
    )


def _parse_hhmm(hora: str) -> tuple[int, int]:
    hh, mm = (hora or "06:00").strip().split(":", 1)
    return int(hh), int(mm)


def dentro_janela_multi_lote(
    *,
    agora: datetime | None = None,
    ate_hora: str | None = None,
) -> bool:
    """True enquanto horário BRT for estritamente antes de ``ate_hora``."""
    ref = agora or _agora_brt()
    if ref.tzinfo is None:
        ref = ref.replace(tzinfo=_TZ_BRT)
    else:
        ref = ref.astimezone(_TZ_BRT)
    hh, mm = _parse_hhmm(ate_hora or ate_hora_pos_coleta())
    return (ref.hour, ref.minute, ref.second, ref.microsecond) < (hh, mm, 0, 0)


def orcamento_pos_coleta(db: Session) -> dict[str, Any]:
    """Orçamento efetivo da fase 2 (para UI / ops)."""
    lim = limite_pos_coleta(db)
    habilitado = lim > 0
    return {
        "habilitado": habilitado,
        "limit": lim,
        "max_sec": max_sec_pos_coleta() if habilitado else 0.0,
        "ate_hora": ate_hora_pos_coleta() if habilitado else None,
        "descanso_sec": descanso_pos_coleta_sec() if habilitado else 0.0,
        "timezone": "America/Sao_Paulo",
        "multi_lote_na_janela": habilitado,
    }


def garantir_pos_coleta_status(db: Session) -> EnriquecimentoPosColeta:
    """Singleton id=1 — telemetria da última fase 2."""
    row = db.get(EnriquecimentoPosColeta, 1)
    if row is None:
        row = EnriquecimentoPosColeta(id=1)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def obter_pos_coleta_status(db: Session) -> dict[str, Any]:
    row = garantir_pos_coleta_status(db)
    return {
        "iniciado_em": row.iniciado_em.isoformat() if row.iniciado_em else None,
        "terminado_em": row.terminado_em.isoformat() if row.terminado_em else None,
        "execucao_coleta_id": row.execucao_coleta_id,
        "total": int(row.total or 0),
        "ok_count": int(row.ok_count or 0),
        "erros": int(row.erros or 0),
        "limit_aplicado": int(row.limit_aplicado or 0),
        "max_sec_aplicado": (
            float(row.max_sec_aplicado) if row.max_sec_aplicado is not None else None
        ),
        "motivo_parada": row.motivo_parada,
        "pendentes_restantes": row.pendentes_restantes,
        "atualizado_em": row.atualizado_em.isoformat() if row.atualizado_em else None,
    }


def registrar_pos_coleta(
    db: Session,
    *,
    resultado: dict[str, Any],
    execucao_coleta_id: int | None = None,
    limit_aplicado: int = 0,
    max_sec_aplicado: float | None = None,
    iniciado_em: datetime | None = None,
) -> dict[str, Any]:
    """Persiste o último resultado da fase 2 (não altera situação da coleta 07)."""
    row = garantir_pos_coleta_status(db)
    agora = _utcnow()
    row.iniciado_em = iniciado_em or agora
    row.terminado_em = agora
    row.execucao_coleta_id = execucao_coleta_id
    row.total = int(resultado.get("total") or 0)
    row.ok_count = int(resultado.get("ok_count") or 0)
    row.erros = int(resultado.get("erros") or 0)
    row.limit_aplicado = int(limit_aplicado)
    row.max_sec_aplicado = max_sec_aplicado
    motivo = resultado.get("motivo_parada")
    if resultado.get("pulado"):
        motivo = "pulado"
    elif resultado.get("ok") is False and not motivo:
        motivo = "erro"
    row.motivo_parada = str(motivo) if motivo else None
    try:
        row.pendentes_restantes = contar_pendentes_cnpj(db)
    except Exception:  # noqa: BLE001
        row.pendentes_restantes = None
    row.atualizado_em = agora
    db.commit()
    return obter_pos_coleta_status(db)


def _aplicar_cnpj(row: Fornecedor, data: dict[str, Any]) -> None:
    for campo in (
        "razao_social",
        "nome_fantasia",
        "porte",
        "situacao_cadastral",
        "natureza_juridica",
        "codigo_cnae",
        "nome_cnae",
        "uf",
        "municipio",
        "codigo_municipio_ibge",
        "cep",
        "logradouro",
        "numero",
        "bairro",
        "fonte_cnpj",
        "cnpj_dados_json",
        "cnpj_enriquecido_em",
        "cnpj_pendente",
        "cnpj_ultimo_erro",
    ):
        if campo in data:
            setattr(row, campo, data[campo])


def enriquecer_cnpj(
    db: Session,
    cnpj: str,
    *,
    forcar: bool = False,
    fetchers: list[tuple[str, CnpjFetcher]] | None = None,
) -> dict[str, Any]:
    """Consulta cadeia (ou cache) e persiste em Fornecedor. Propaga erros da cadeia."""
    ni = normalizar_ni(cnpj)
    if not ni or len(ni) != 14:
        raise ValueError("CNPJ inválido.")

    row = db.scalar(select(Fornecedor).where(Fornecedor.ni == ni))
    if row is None:
        row = Fornecedor(ni=ni, cnpj_pendente=True)
        db.add(row)
        db.flush()

    if not forcar and cache_cnpj_valido(row):
        return {"ok": True, "cache": True, "fonte_cnpj": row.fonte_cnpj, "ni": ni}

    data = consultar_cnpj_publico(ni, fetchers=fetchers)
    _aplicar_cnpj(row, data)
    db.commit()
    return {
        "ok": True,
        "cache": False,
        "fonte_cnpj": row.fonte_cnpj,
        "ni": ni,
        "razao_social": row.razao_social,
    }


def enriquecer_cep(
    db: Session,
    cep: str,
    *,
    forcar: bool = False,
    fetchers: list[tuple[str, CepFetcher]] | None = None,
    aplicar_em_ni: str | None = None,
) -> dict[str, Any]:
    codigo = normalizar_cep(cep)
    if not codigo:
        raise ValueError("CEP inválido.")

    row = db.get(CacheCep, codigo)
    if row is not None and not forcar and cache_cep_valido(row):
        result = {
            "ok": True,
            "cache": True,
            "fonte_cep": row.fonte_cep,
            "cep": codigo,
            "municipio": row.municipio,
            "uf": row.uf,
            "codigo_municipio_ibge": row.codigo_municipio_ibge,
        }
    else:
        data = consultar_cep_publico(codigo, fetchers=fetchers)
        if row is None:
            row = CacheCep(cep=codigo)
            db.add(row)
        row.logradouro = data.get("logradouro")
        row.bairro = data.get("bairro")
        row.municipio = data.get("municipio")
        row.uf = data.get("uf")
        row.codigo_municipio_ibge = data.get("codigo_municipio_ibge")
        row.fonte_cep = data.get("fonte_cep")
        row.cep_dados_json = data.get("cep_dados_json")
        row.enriquecido_em = data.get("enriquecido_em") or _utcnow()
        row.pendente = False
        row.ultimo_erro = None
        db.flush()
        result = {
            "ok": True,
            "cache": False,
            "fonte_cep": row.fonte_cep,
            "cep": codigo,
            "municipio": row.municipio,
            "uf": row.uf,
            "codigo_municipio_ibge": row.codigo_municipio_ibge,
        }

    if aplicar_em_ni:
        ni = normalizar_ni(aplicar_em_ni)
        forn = db.scalar(select(Fornecedor).where(Fornecedor.ni == ni)) if ni else None
        if forn:
            forn.cep = row.cep
            forn.logradouro = forn.logradouro or row.logradouro
            forn.bairro = forn.bairro or row.bairro
            forn.municipio = forn.municipio or row.municipio
            forn.uf = forn.uf or row.uf
            forn.codigo_municipio_ibge = (
                forn.codigo_municipio_ibge or row.codigo_municipio_ibge
            )
            forn.fonte_cep = row.fonte_cep
            forn.cep_dados_json = row.cep_dados_json
            forn.cep_enriquecido_em = row.enriquecido_em

    db.commit()
    return result


def listar_pendentes_cnpj(db: Session, *, limit: int = 100) -> list[Fornecedor]:
    return list(
        db.scalars(
            select(Fornecedor)
            .where(criterio_cnpj_pendente())
            .order_by(Fornecedor.id.asc())
            .limit(limit)
        ).all()
    )


def contar_pendentes_cnpj(db: Session) -> int:
    return int(
        db.scalar(
            select(func.count()).select_from(Fornecedor).where(criterio_cnpj_pendente())
        )
        or 0
    )


def marcar_falha_cnpj(db: Session, ni: str, erro: str) -> None:
    row = db.scalar(select(Fornecedor).where(Fornecedor.ni == ni))
    if row is None:
        return
    # CPF/outros nunca reentram na fila de CNPJ.
    row.cnpj_pendente = eh_ni_cnpj(row.ni)
    row.cnpj_ultimo_erro = erro[:2000] if eh_ni_cnpj(row.ni) else None
    db.commit()


def processar_pendentes_cnpj(
    db: Session,
    *,
    limit: int = 50,
    fetchers: list[tuple[str, CnpjFetcher]] | None = None,
    on_item: Callable[[str, bool, str | None], None] | None = None,
    intervalo_sec: float | None = None,
    backoff_sec: float | None = None,
    max_sec: float | None = None,
) -> dict[str, Any]:
    """Processa fila. Falhas individuais não interrompem o lote.

    Throttle entre itens (ADR-07 / Lightsail): intervalo após sucesso;
    backoff maior após falha (respeita rate limit das fontes públicas).
    Orçamento opcional ``max_sec`` interrompe o lote sem abortar a coleta 07.
    """
    fila = listar_pendentes_cnpj(db, limit=limit)
    if not fila:
        return {
            "ok": True,
            "total": 0,
            "ok_count": 0,
            "erros": 0,
            "detalhes": [],
            "motivo_parada": "fila_vazia",
            "processados": 0,
        }
    intervalo = (
        float(app_config.CNPJ_PUBLICO_LOTE_INTERVALO_SEC)
        if intervalo_sec is None
        else float(intervalo_sec)
    )
    backoff = (
        float(app_config.CNPJ_PUBLICO_LOTE_BACKOFF_SEC)
        if backoff_sec is None
        else float(backoff_sec)
    )
    teto = None if max_sec is None or max_sec <= 0 else float(max_sec)
    t0 = time.monotonic()
    ok = erros = 0
    detalhes: list[dict[str, Any]] = []
    ultimo_ok: bool | None = None
    motivo_parada = "lote"
    processados = 0
    for i, row in enumerate(fila):
        if teto is not None and (time.monotonic() - t0) >= teto:
            motivo_parada = "tempo"
            break
        if i > 0 and ultimo_ok is not None:
            espera = intervalo if ultimo_ok else max(intervalo, backoff)
            if espera > 0:
                # Reserva tempo: se o sleep estouraria o orçamento, para antes.
                if teto is not None and (time.monotonic() - t0 + espera) >= teto:
                    motivo_parada = "tempo"
                    break
                time.sleep(espera)
        try:
            r = enriquecer_cnpj(db, row.ni, forcar=True, fetchers=fetchers)
            ok += 1
            ultimo_ok = True
            detalhes.append({"ni": row.ni, "ok": True, "fonte": r.get("fonte_cnpj")})
            if on_item:
                on_item(row.ni, True, None)
        except Exception as exc:  # noqa: BLE001 — pendência permanece
            erros += 1
            ultimo_ok = False
            marcar_falha_cnpj(db, row.ni, str(exc))
            detalhes.append({"ni": row.ni, "ok": False, "erro": str(exc)[:300]})
            if on_item:
                on_item(row.ni, False, str(exc))
        processados += 1
    else:
        # Sem break por tempo: esgotou a fatia oferecida.
        motivo_parada = "lote" if len(fila) >= limit else "fila_vazia"
    return {
        "ok": True,
        "total": processados,
        "ok_count": ok,
        "erros": erros,
        "detalhes": detalhes,
        "motivo_parada": motivo_parada,
        "processados": processados,
        "fila_oferecida": len(fila),
    }


def tentar_enriquecer_pos_coleta(
    db: Session,
    *,
    limit: int | None = None,
    max_sec: float | None = None,
    execucao_coleta_id: int | None = None,
    fetchers: list[tuple[str, CnpjFetcher]] | None = None,
    intervalo_sec: float | None = None,
    backoff_sec: float | None = None,
    persistir: bool = True,
    ate_hora: str | None = None,
    descanso_sec: float | None = None,
    agora_fn: Callable[[], datetime] | None = None,
) -> dict[str, Any]:
    """Hook pós-coleta (fase 2): nunca levanta exceção (coleta 07 já concluída).

    - Na janela BRT (antes de ``ate_hora``, default 06:00): vários lotes de
      ``limit`` com descanso entre eles, até zerar a fila ou bater a hora.
    - Fora da janela (ex.: coleta manual de dia): um único lote.
    Coleta 07 não é alterada em hipótese alguma.
    """
    iniciado = _utcnow()
    lim = 0
    teto: float | None = None
    hora_fim = ate_hora if ate_hora is not None else ate_hora_pos_coleta()
    pausa = (
        float(descanso_sec)
        if descanso_sec is not None
        else descanso_pos_coleta_sec()
    )
    clock = agora_fn or _agora_brt

    def _na_janela() -> bool:
        return dentro_janela_multi_lote(agora=clock(), ate_hora=hora_fim)

    try:
        lim = limit if limit is not None else limite_pos_coleta(db)
        teto = max_sec if max_sec is not None else max_sec_pos_coleta()
        if lim <= 0:
            result = {
                "ok": True,
                "total": 0,
                "ok_count": 0,
                "erros": 0,
                "pulado": True,
                "motivo_parada": "pulado",
                "lotes": 0,
            }
        else:
            na_janela_inicio = _na_janela()
            lotes = 0
            ok_tot = erros_tot = proc_tot = 0
            motivo = "lote"
            while True:
                # Fora da janela: no máximo 1 lote (não segura o sistema de dia).
                if lotes >= 1 and not na_janela_inicio:
                    break
                # Dentro da janela: para ao chegar em ate_hora.
                if lotes >= 1 and na_janela_inicio and not _na_janela():
                    motivo = "janela"
                    break

                batch = processar_pendentes_cnpj(
                    db,
                    limit=lim,
                    fetchers=fetchers,
                    intervalo_sec=intervalo_sec,
                    backoff_sec=backoff_sec,
                    max_sec=teto,
                )
                lotes += 1
                ok_tot += int(batch.get("ok_count") or 0)
                erros_tot += int(batch.get("erros") or 0)
                proc_tot += int(batch.get("processados") or 0)
                motivo = str(batch.get("motivo_parada") or "lote")

                if int(batch.get("processados") or 0) <= 0 or motivo == "fila_vazia":
                    motivo = "fila_vazia"
                    break

                # Ainda há fila (lote cheio ou teto por lote).
                if not na_janela_inicio:
                    break
                if not _na_janela():
                    motivo = "janela"
                    break
                if pausa > 0:
                    time.sleep(pausa)

            result = {
                "ok": True,
                "total": proc_tot,
                "ok_count": ok_tot,
                "erros": erros_tot,
                "motivo_parada": motivo,
                "lotes": lotes,
                "ate_hora": hora_fim,
                "multi_lote": na_janela_inicio,
            }
    except Exception as exc:  # noqa: BLE001
        result = {
            "ok": False,
            "erro": str(exc),
            "total": 0,
            "ok_count": 0,
            "erros": 0,
            "motivo_parada": "erro",
            "lotes": 0,
        }
    if persistir:
        try:
            status = registrar_pos_coleta(
                db,
                resultado=result,
                execucao_coleta_id=execucao_coleta_id,
                limit_aplicado=lim,
                max_sec_aplicado=teto,
                iniciado_em=iniciado,
            )
            result = {**result, "status": status}
        except Exception as exc:  # noqa: BLE001 — telemetria nunca derruba 07
            result = {**result, "status_erro": str(exc)}
    return result


def fornecedor_para_api(row: Fornecedor) -> dict[str, Any]:
    return {
        "id": row.id,
        "ni": row.ni,
        "razao_social": row.razao_social,
        "nome_fantasia": row.nome_fantasia,
        "porte": row.porte,
        "situacao_cadastral": row.situacao_cadastral,
        "uf": row.uf,
        "municipio": row.municipio,
        "codigo_municipio_ibge": row.codigo_municipio_ibge,
        "cep": row.cep,
        "fonte_cnpj": row.fonte_cnpj,
        "fonte_cep": row.fonte_cep,
        "cnpj_pendente": row.cnpj_pendente,
        "cnpj_enriquecido_em": (
            row.cnpj_enriquecido_em.isoformat() if row.cnpj_enriquecido_em else None
        ),
        "cnpj_ultimo_erro": row.cnpj_ultimo_erro,
    }
