from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.coleta import _data, _decimal, _status_etapas, configuracao
from app.db import definir_contexto, garantir_contexto, restaurar_contexto
from app.escopo import uasgs_coletaveis
from app.models import AtaPncp, ColetaJob, ContratoPncp, Filial
from app.regras import faixa_b_autorizada, periodo_diario, vinculo_compra
from app.tempo import agora_utc


def executar_faixa_b(db: Session, job: ColetaJob, cliente, *, hoje: date | None = None) -> None:
    tokens = definir_contexto(str(job.filial_id), master=False)
    garantir_contexto(db)
    try:
        _executar_faixa_b(db, job, cliente, hoje=hoje)
    finally:
        restaurar_contexto(tokens)


def _executar_faixa_b(db: Session, job: ColetaJob, cliente, *, hoje: date | None = None) -> None:
    job_a = db.scalar(
        select(ColetaJob).where(
            ColetaJob.filial_id == job.filial_id,
            ColetaJob.faixa == "A",
            ColetaJob.tipo == job.tipo,
            ColetaJob.noite == job.noite,
        )
    )
    etapas = _status_etapas(db, job_a) if job_a is not None else {}
    if not faixa_b_autorizada(etapas):
        job.status = "erro"
        job.motivo = "Faixa A obrigatória incompleta. Faixa B não começa nesta noite."
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
    try:
        for uasg in uasgs_coletaveis(db, filial.id):
            # CNPJ do órgão público. O CNPJ da filial não entra na consulta.
            cnpj = uasg.cnpj_orgao
            if not cnpj or cnpj == filial.cnpj:
                continue
            for bruto in _paginas(cliente.contratos, cnpj, inicio, fim):
                _upsert_instrumento(db, ContratoPncp, filial.id, bruto, uasg.codigo_uasg, cnpj)
            for bruto in _paginas(cliente.atas, cnpj, inicio, fim):
                _upsert_instrumento(db, AtaPncp, filial.id, bruto, uasg.codigo_uasg, cnpj)
    except Exception as exc:
        job.status = "continua_amanha"
        job.motivo = exc.__class__.__name__
        job.terminado_em = agora_utc()
        db.commit()
        return
    job.status = "ok"
    job.motivo = ""
    job.terminado_em = agora_utc()
    db.commit()


def _paginas(metodo, cnpj: str, inicio: date, fim: date) -> list[dict]:
    saida: list[dict] = []
    pagina = 1
    while pagina <= 20:
        payload = metodo(
            cnpj_orgao=cnpj,
            data_inicial=inicio.strftime("%Y%m%d"),
            data_final=fim.strftime("%Y%m%d"),
            pagina=pagina,
        )
        registros = payload.get("data") or payload.get("resultado") or []
        if not isinstance(registros, list):
            break
        saida.extend(item for item in registros if isinstance(item, dict))
        total = int(payload.get("totalPaginas") or 1)
        if pagina >= total or not registros:
            break
        pagina += 1
    return saida


def _compra(bruto: dict) -> str | None:
    valor = bruto.get("numeroControlePncpCompra") or bruto.get("numeroControlePNCPCompra")
    texto = str(valor or "").strip()
    return texto or None


def _upsert_instrumento(db, modelo, tenant_id, bruto: dict, codigo_uasg: str, cnpj: str) -> None:
    numero = str(bruto.get("numeroControlePNCP") or "").strip()
    if not numero:
        return
    agora = agora_utc()
    compra = _compra(bruto)
    valores = {
        "numero_controle_pncp_compra": compra,
        "cnpj_orgao": cnpj,
        "codigo_uasg": codigo_uasg,
        "objeto": str(bruto.get("objetoContrato") or bruto.get("objeto") or ""),
        "valor": _decimal(bruto.get("valorGlobal") or bruto.get("valor")),
        "data_assinatura": _data(bruto.get("dataAssinatura")),
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
