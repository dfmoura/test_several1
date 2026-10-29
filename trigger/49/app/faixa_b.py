from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.coleta import _data, _decimal, _janelas, _status_etapas, configuracao
from app.db import definir_contexto, garantir_contexto, restaurar_contexto
from app.escopo import uasgs_coletaveis
from app.models import AtaPncp, ColetaJob, ContratoPncp, Filial
from app.regras import faixa_b_autorizada, periodo_diario, vinculo_compra
from app.tempo import agora_utc

# PNCP consulta de contratos/atas tolera bem janelas curtas; evita 429 e timeout.
JANELA_B_DIAS = 31


def executar_faixa_b(db: Session, job: ColetaJob, cliente, *, hoje: date | None = None) -> None:
    tokens = definir_contexto(str(job.filial_id), master=False)
    garantir_contexto(db)
    try:
        _executar_faixa_b(db, job, cliente, hoje=hoje)
    finally:
        restaurar_contexto(tokens)


def _executar_faixa_b(db: Session, job: ColetaJob, cliente, *, hoje: date | None = None) -> None:
    # Mesmo tipo (carga/diário); noite pode divergir após continua_amanha.
    job_a = db.scalar(
        select(ColetaJob)
        .where(
            ColetaJob.filial_id == job.filial_id,
            ColetaJob.faixa == "A",
            ColetaJob.tipo == job.tipo,
        )
        .order_by(ColetaJob.noite.desc())
    )
    etapas = _status_etapas(db, job_a) if job_a is not None else {}
    if not faixa_b_autorizada(etapas):
        job.status = "continua_amanha"
        job.motivo = "Faixa A obrigatória incompleta. Faixa B aguarda A2–A4 ok."
        job.noite = hoje or agora_utc().date()
        job.terminado_em = agora_utc()
        db.commit()
        return
    filial = db.get(Filial, job.filial_id)
    if filial is None:
        job.status = "erro"
        job.motivo = "Filial ausente."
        db.commit()
        return
    cfg = configuracao(db)
    hoje = hoje or agora_utc().date()
    inicio, fim = periodo_diario(hoje, cfg.janela_dias)
    if job.tipo == "carga_inicial":
        inicio = date(cfg.ano_inicial_carga, 1, 1)
    job.status = "executando"
    # Um CNPJ de órgão pode atender várias UASGs; a consulta federal é por CNPJ.
    por_cnpj: dict[str, str] = {}
    for uasg in uasgs_coletaveis(db, filial.id):
        cnpj = (uasg.cnpj_orgao or "").strip()
        if not cnpj or cnpj == filial.cnpj:
            continue
        por_cnpj.setdefault(cnpj, uasg.codigo_uasg)
    try:
        for cnpj, codigo_uasg in por_cnpj.items():
            for bloco_ini, bloco_fim in _janelas(inicio, fim, JANELA_B_DIAS):
                _coletar_paginas(
                    db,
                    cliente.contratos,
                    ContratoPncp,
                    filial.id,
                    cnpj,
                    codigo_uasg,
                    bloco_ini,
                    bloco_fim,
                )
                _coletar_paginas(
                    db,
                    cliente.atas,
                    AtaPncp,
                    filial.id,
                    cnpj,
                    codigo_uasg,
                    bloco_ini,
                    bloco_fim,
                )
    except Exception as exc:
        # noite = hoje impede promover_continua_amanha no mesmo dia (martelo na API).
        job.status = "continua_amanha"
        job.motivo = exc.__class__.__name__
        job.noite = hoje
        job.terminado_em = agora_utc()
        db.commit()
        return
    job.status = "ok"
    job.motivo = ""
    job.terminado_em = agora_utc()
    db.commit()


def _coletar_paginas(db, metodo, modelo, tenant_id, cnpj: str, codigo_uasg: str, inicio: date, fim: date) -> None:
    """Grava página a página. Assim um 429 não descarta o que já veio da API."""
    pagina = 1
    while pagina <= 50:
        payload = metodo(
            cnpj_orgao=cnpj,
            data_inicial=inicio.strftime("%Y%m%d"),
            data_final=fim.strftime("%Y%m%d"),
            pagina=pagina,
        )
        if not payload:
            break
        registros = payload.get("data") or payload.get("resultado") or []
        if not isinstance(registros, list):
            break
        for bruto in registros:
            if isinstance(bruto, dict):
                _upsert_instrumento(db, modelo, tenant_id, bruto, codigo_uasg, cnpj)
        db.commit()
        total = int(payload.get("totalPaginas") or 1)
        if pagina >= total or not registros:
            break
        pagina += 1


def _compra(bruto: dict) -> str | None:
    valor = bruto.get("numeroControlePncpCompra") or bruto.get("numeroControlePNCPCompra")
    texto = str(valor or "").strip()
    return texto or None


def _numero_instrumento(bruto: dict) -> str:
    return str(
        bruto.get("numeroControlePNCP")
        or bruto.get("numeroControlePNCPAta")
        or bruto.get("numeroControlePncp")
        or ""
    ).strip()


def _upsert_instrumento(db, modelo, tenant_id, bruto: dict, codigo_uasg: str, cnpj: str) -> None:
    numero = _numero_instrumento(bruto)
    if not numero:
        return
    # numeroControlePNCPAta pode exceder 80 em casos raros; corta com segurança.
    numero = numero[:80]
    agora = agora_utc()
    compra = _compra(bruto)
    # RLS só enxerga UASG aderida. Usar código da API de outra unidade
    # esconde a linha e o próximo insert quebra na UNIQUE.
    valores = {
        "numero_controle_pncp_compra": (compra or "")[:80] or None,
        "cnpj_orgao": str(bruto.get("cnpjOrgao") or cnpj)[:14],
        "codigo_uasg": codigo_uasg[:12],
        "objeto": str(
            bruto.get("objetoContrato")
            or bruto.get("objetoContratacao")
            or bruto.get("objeto")
            or ""
        ),
        "valor": _decimal(
            bruto.get("valorGlobal")
            or bruto.get("valorInicial")
            or bruto.get("valor")
        ),
        "data_assinatura": _data(bruto.get("dataAssinatura") or bruto.get("dataPublicacaoPncp")),
        "atualizado_em": agora,
    }
    atual = db.scalar(select(modelo).where(modelo.numero_controle_pncp == numero))
    if atual is None:
        db.add(modelo(tenant_id=tenant_id, numero_controle_pncp=numero, **valores))
    else:
        for chave, valor in valores.items():
            setattr(atual, chave, valor)
    db.flush()


def rotulo_vinculo(numero_compra: str | None) -> str:
    return "não vinculado" if vinculo_compra(numero_compra) == "nao_vinculado" else "vinculado"
