from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import (
    JANELA_CONTRATACAO_DIAS,
    JANELA_ITENS_DIAS,
    MODALIDADES_COMPRAS,
    PAGINA_CONTRATACAO,
    PAGINA_ITENS,
)
from app.db import definir_contexto, garantir_contexto, restaurar_contexto
from app.escopo import sincronizar_registros, uasgs_coletaveis
from app.models import (
    AnotacaoInterna,
    ColetaCursor,
    ColetaEtapa,
    ColetaJob,
    ConfiguracaoAgenda,
    Contratacao,
    ContratacaoItem,
    Filial,
    ResultadoItem,
)
from app.regras import a1_deve_rodar, faixa_b_autorizada, periodo_diario
from app.tempo import agora_utc


class OrcamentoEstourado(Exception):
    pass


class PaginaInterrompida(Exception):
    def __init__(self, pagina: int) -> None:
        super().__init__(f"página {pagina}")
        self.pagina = pagina


def configuracao(db: Session) -> ConfiguracaoAgenda:
    cfg = db.get(ConfiguracaoAgenda, 1)
    if cfg is None:
        cfg = ConfiguracaoAgenda(id=1)
        db.add(cfg)
        db.flush()
    return cfg


def _decimal(valor: object, casas: str = "0.01") -> Decimal | None:
    if valor is None or valor == "":
        return None
    try:
        texto = str(valor).strip().replace("R$", "").strip()
        if "," in texto and "." in texto:
            texto = texto.replace(".", "").replace(",", ".")
        elif "," in texto:
            texto = texto.replace(",", ".")
        return Decimal(texto).quantize(Decimal(casas))
    except (InvalidOperation, ValueError):
        return None


def _data(valor: object) -> date | None:
    if not valor:
        return None
    texto = str(valor)[:10]
    try:
        return date.fromisoformat(texto)
    except ValueError:
        return None


def _int(valor: object) -> int | None:
    if valor is None or valor == "":
        return None
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


def _etapa(db: Session, job: ColetaJob, codigo: str, status: str, mensagem: str = "") -> None:
    etapa = db.scalar(
        select(ColetaEtapa).where(ColetaEtapa.job_id == job.id, ColetaEtapa.codigo == codigo)
    )
    if etapa is None:
        etapa = ColetaEtapa(job_id=job.id, codigo=codigo, status=status, mensagem="")
        db.add(etapa)
    etapa.status = status
    if mensagem:
        etapa.mensagem = (etapa.mensagem + "\n" + mensagem).strip()[-1500:]
    db.flush()


def _status_etapas(db: Session, job: ColetaJob) -> dict[str, str]:
    linhas = db.scalars(select(ColetaEtapa).where(ColetaEtapa.job_id == job.id)).all()
    return {linha.codigo: linha.status for linha in linhas}


def _cursor(
    db: Session,
    filial_id: uuid.UUID,
    codigo_uasg: str,
    tipo: str,
    inicio: date,
    fim: date,
) -> ColetaCursor | None:
    return db.scalar(
        select(ColetaCursor).where(
            ColetaCursor.filial_id == filial_id,
            ColetaCursor.codigo_uasg == codigo_uasg,
            ColetaCursor.tipo == tipo,
            ColetaCursor.janela_ini == inicio,
            ColetaCursor.janela_fim == fim,
        )
    )


def _gravar_cursor(
    db: Session,
    filial_id: uuid.UUID,
    codigo_uasg: str,
    tipo: str,
    inicio: date,
    fim: date,
    pagina: int,
    tamanho: int,
) -> None:
    cursor = _cursor(db, filial_id, codigo_uasg, tipo, inicio, fim)
    agora = agora_utc()
    if cursor is None:
        db.add(
            ColetaCursor(
                filial_id=filial_id,
                codigo_uasg=codigo_uasg,
                tipo=tipo,
                janela_ini=inicio,
                janela_fim=fim,
                pagina=pagina,
                tamanho_pagina=tamanho,
                atualizado_em=agora,
            )
        )
    else:
        cursor.pagina = pagina
        cursor.tamanho_pagina = tamanho
        cursor.atualizado_em = agora
    db.flush()


def _consumir(job: ColetaJob, cfg: ConfiguracaoAgenda) -> None:
    job.chamadas += 1
    if job.chamadas > cfg.orcamento_chamadas:
        raise OrcamentoEstourado


def upsert_contratacao(db: Session, tenant_id: uuid.UUID, bruto: dict, codigo_uasg: str) -> None:
    garantir_contexto(db)
    numero = str(bruto.get("numeroControlePNCP") or "").strip()
    if not numero:
        return
    agora = agora_utc()
    existe_resultado = bool(bruto.get("existeResultado"))
    valores = {
        "codigo_uasg": codigo_uasg,
        "cnpj_orgao": "".join(ch for ch in str(bruto.get("orgaoEntidadeCnpj") or "") if ch.isdigit()),
        "objeto": str(bruto.get("objetoCompra") or ""),
        "modalidade_id_pncp": _int(bruto.get("modalidadeIdPncp")),
        "codigo_modalidade": _int(bruto.get("codigoModalidade")),
        "modalidade_nome": str(bruto.get("modalidadeNome") or ""),
        "situacao": str(bruto.get("situacaoCompraNomePncp") or ""),
        "valor_estimado": _decimal(bruto.get("valorTotalEstimado")),
        "valor_homologado": _decimal(bruto.get("valorTotalHomologado")),
        "data_publicacao": _data(bruto.get("dataPublicacaoPncp")),
        "existe_resultado": existe_resultado,
        "aberta": not existe_resultado,
        "ano": _int(bruto.get("anoCompraPncp")),
        "atualizado_em": agora,
    }
    atual = db.scalar(select(Contratacao).where(Contratacao.numero_controle_pncp == numero))
    if atual is None:
        db.add(Contratacao(tenant_id=tenant_id, numero_controle_pncp=numero, **valores))
    else:
        for chave, valor in valores.items():
            setattr(atual, chave, valor)
    db.flush()


def upsert_item(db: Session, tenant_id: uuid.UUID, bruto: dict) -> None:
    numero = str(bruto.get("numeroControlePNCPCompra") or bruto.get("numeroControlePNCP") or "").strip()
    numero_item = _int(
        bruto.get("numeroItemPncp")
        if bruto.get("numeroItemPncp") is not None
        else bruto.get("numeroItemCompra")
    )
    if not numero or numero_item is None:
        return
    if db.scalar(select(Contratacao.id).where(Contratacao.numero_controle_pncp == numero)) is None:
        return
    agora = agora_utc()
    material = str(bruto.get("materialOuServicoNome") or bruto.get("materialOuServico") or "").strip()
    if not material:
        material = "serviço" if str(bruto.get("materialOuServico") or "").upper().startswith("S") else "material"
    valores = {
        "descricao": str(bruto.get("descricaoResumida") or bruto.get("descricaodetalhada") or ""),
        "descricao_detalhada": str(
            bruto.get("descricaodetalhada") or bruto.get("descricaoDetalhada") or ""
        ),
        "quantidade": _decimal(bruto.get("quantidade"), "0.0001"),
        "unidade_medida": str(bruto.get("unidadeMedida") or "")[:40],
        "valor_unitario": _decimal(
            bruto.get("valorUnitarioEstimado") or bruto.get("valorUnitario"), "0.0001"
        ),
        "material_ou_servico": material[:20],
        "situacao_item": str(bruto.get("situacaoCompraItemNome") or bruto.get("situacaoItem") or "")[:120],
        "tem_resultado": bool(bruto.get("temResultado")),
        "cod_item_catalogo": str(bruto.get("codItemCatalogo") or ""),
        "tipo_catalogo": "servico" if str(bruto.get("materialOuServico") or "").upper().startswith("S") else "material",
        "ni_fornecedor": "".join(ch for ch in str(bruto.get("codFornecedor") or "") if ch.isdigit()),
        "nome_fornecedor": str(bruto.get("nomeFornecedor") or ""),
        "valor_total": _decimal(bruto.get("valorTotal")),
        "atualizado_em": agora,
    }
    atual = db.scalar(
        select(ContratacaoItem).where(
            ContratacaoItem.numero_controle_pncp == numero,
            ContratacaoItem.numero_item == numero_item,
        )
    )
    if atual is None:
        db.add(
            ContratacaoItem(
                tenant_id=tenant_id,
                numero_controle_pncp=numero,
                numero_item=numero_item,
                **valores,
            )
        )
    else:
        for chave, valor in valores.items():
            setattr(atual, chave, valor)
    db.flush()


def upsert_resultado(db: Session, tenant_id: uuid.UUID, bruto: dict) -> None:
    numero = str(
        bruto.get("numeroControlePNCPCompra")
        or bruto.get("numeroControlePNCP")
        or bruto.get("idContratacaoPNCP")
        or ""
    ).strip()
    numero_item = _int(bruto.get("numeroItemPncp") or bruto.get("numeroItem"))
    if not numero or numero_item is None:
        return
    if db.scalar(select(Contratacao.id).where(Contratacao.numero_controle_pncp == numero)) is None:
        return
    ni = "".join(ch for ch in str(bruto.get("niFornecedor") or bruto.get("codFornecedor") or "") if ch.isdigit())
    data_resultado = _data(
        bruto.get("dataResultadoPncp") or bruto.get("dataResultado") or bruto.get("dataInclusaoPncp")
    )
    agora = agora_utc()
    candidatos = db.scalars(
        select(ResultadoItem).where(
            ResultadoItem.numero_controle_pncp == numero,
            ResultadoItem.numero_item == numero_item,
            ResultadoItem.ni_fornecedor == ni,
        )
    ).all()
    atual = next((c for c in candidatos if c.data_resultado == data_resultado), None)
    valores = {
        "nome_fornecedor": str(
            bruto.get("nomeRazaoSocialFornecedor") or bruto.get("nomeFornecedor") or ""
        ),
        "valor": _decimal(
            bruto.get("valorTotalHomologado")
            or bruto.get("valorTotalResultado")
            or bruto.get("valorTotal")
        ),
        "atualizado_em": agora,
    }
    if atual is None:
        db.add(
            ResultadoItem(
                tenant_id=tenant_id,
                numero_controle_pncp=numero,
                numero_item=numero_item,
                ni_fornecedor=ni,
                data_resultado=data_resultado,
                **valores,
            )
        )
    else:
        for chave, valor in valores.items():
            setattr(atual, chave, valor)
    db.flush()


def _janelas(inicio: date, fim: date, dias: int) -> list[tuple[date, date]]:
    blocos: list[tuple[date, date]] = []
    cursor = inicio
    while cursor <= fim:
        limite = min(fim, date.fromordinal(cursor.toordinal() + dias - 1))
        blocos.append((cursor, limite))
        cursor = date.fromordinal(limite.toordinal() + 1)
    return blocos


def _periodo_job(job: ColetaJob, cfg: ConfiguracaoAgenda, hoje: date) -> tuple[date, date]:
    if job.tipo == "diario":
        return periodo_diario(hoje, cfg.janela_dias)
    return date(cfg.ano_inicial_carga, 1, 1), hoje


def executar_faixa_a(db: Session, job: ColetaJob, cliente, *, hoje: date | None = None) -> None:
    tokens = definir_contexto(str(job.filial_id), master=False)
    garantir_contexto(db)
    try:
        _executar_faixa_a(db, job, cliente, hoje=hoje)
    finally:
        restaurar_contexto(tokens)


def _executar_faixa_a(db: Session, job: ColetaJob, cliente, *, hoje: date | None = None) -> None:
    cfg = configuracao(db)
    filial = db.get(Filial, job.filial_id)
    if filial is None:
        job.status = "erro"
        job.motivo = "Filial ausente."
        db.commit()
        return
    hoje = hoje or agora_utc().date()
    job.status = "executando"
    job.iniciado_em = job.iniciado_em or agora_utc()
    db.flush()
    try:
        _a1(db, job, filial, cliente)
        if _status_etapas(db, job).get("A2") != "ok":
            _a2(db, job, filial, cliente, cfg, hoje)
        if _status_etapas(db, job).get("A3") != "ok":
            _a3(db, job, filial, cliente, cfg, hoje)
        if _status_etapas(db, job).get("A4") != "ok":
            _a4(db, job, filial, cliente, cfg)
    except OrcamentoEstourado:
        job.status = "continua_amanha"
        job.motivo = "Orçamento da noite esgotado. Continua amanhã do cursor."
        job.noite = hoje
        job.terminado_em = agora_utc()
        db.commit()
        return
    except PaginaInterrompida as exc:
        job.status = "continua_amanha"
        job.motivo = (
            f"Coleta pausada no cursor {exc.pagina}. "
            "Continua na próxima janela. Faixa B não começa nesta noite."
        )
        job.noite = hoje
        job.terminado_em = agora_utc()
        db.commit()
        return
    except Exception as exc:
        # Falha transitória da API federal: pausa e retoma, não abandona a carga.
        job.status = "continua_amanha"
        job.motivo = exc.__class__.__name__
        job.noite = hoje
        job.terminado_em = agora_utc()
        db.commit()
        return
    etapas = _status_etapas(db, job)
    if not faixa_b_autorizada(etapas):
        job.status = "parcial"
        job.motivo = "Faixa A obrigatória incompleta. Faixa B não começa nesta noite."
        job.terminado_em = agora_utc()
        db.commit()
        return
    job.status = "ok"
    job.motivo = ""
    job.terminado_em = agora_utc()
    _abrir_faixa_b(db, job)
    _catalogo(db, job, cliente, cfg)
    db.commit()


def _a1(db: Session, job: ColetaJob, filial: Filial, cliente) -> None:
    if not a1_deve_rodar(filial.ultima_sync_uasg, filial.escopo_alterado_em, agora_utc()):
        _etapa(db, job, "A1", "ok", "Pulada: dimensão já sincronizada nesta semana.")
        return
    try:
        registros = cliente.uasgs(ibge=filial.codigo_ibge, uf=filial.uf)
        sincronizar_registros(db, filial, registros)
        _etapa(db, job, "A1", "ok")
    except Exception:
        _etapa(db, job, "A1", "erro", "Falha na dimensão de UASG.")
        if not uasgs_coletaveis(db, filial.id):
            raise


def _a2(db, job, filial, cliente, cfg, hoje: date) -> None:
    inicio, fim = _periodo_job(job, cfg, hoje)
    uasgs = uasgs_coletaveis(db, filial.id)
    if not uasgs:
        _etapa(db, job, "A2", "ok", "Nenhuma UASG aderida.")
        return
    for bloco_ini, bloco_fim in _janelas(inicio, fim, JANELA_CONTRATACAO_DIAS):
        for uasg in uasgs:
            for codigo in MODALIDADES_COMPRAS:
                pagina = 1
                while True:
                    _consumir(job, cfg)
                    payload = cliente.contratacoes(
                        uasg=uasg.codigo_uasg,
                        inicio=bloco_ini,
                        fim=bloco_fim,
                        codigo_modalidade=codigo,
                        pagina=pagina,
                        tamanho=PAGINA_CONTRATACAO,
                    )
                    for bruto in payload.get("resultado") or []:
                        if isinstance(bruto, dict):
                            upsert_contratacao(db, filial.id, bruto, uasg.codigo_uasg)
                    total = int(payload.get("totalPaginas") or 1)
                    if pagina >= total:
                        break
                    pagina += 1
    if job.tipo == "diario":
        abertas = db.scalars(
            select(Contratacao)
            .where(Contratacao.aberta.is_(True))
            .limit(cfg.teto_abertas)
        ).all()
        for contratacao in abertas:
            _consumir(job, cfg)
            bruto = cliente.por_numero(contratacao.numero_controle_pncp)
            if isinstance(bruto, dict):
                upsert_contratacao(db, filial.id, bruto, contratacao.codigo_uasg)
    _etapa(db, job, "A2", "ok")


def _a3(db, job, filial, cliente, cfg, hoje: date) -> None:
    inicio, fim = _periodo_job(job, cfg, hoje)
    uasgs = uasgs_coletaveis(db, filial.id)
    for uasg in uasgs:
        for bloco_ini, bloco_fim in _janelas(inicio, fim, JANELA_ITENS_DIAS):
            cursor = _cursor(db, filial.id, uasg.codigo_uasg, "itens", bloco_ini, bloco_fim)
            pagina = cursor.pagina if cursor else 1
            tamanho = cursor.tamanho_pagina if cursor else PAGINA_ITENS
            while True:
                _gravar_cursor(db, filial.id, uasg.codigo_uasg, "itens", bloco_ini, bloco_fim, pagina, tamanho)
                db.commit()
                _consumir(job, cfg)
                try:
                    payload = cliente.itens(
                        uasg=uasg.codigo_uasg,
                        inicio=bloco_ini,
                        fim=bloco_fim,
                        pagina=pagina,
                        tamanho=tamanho,
                    )
                except PaginaInterrompida:
                    _etapa(db, job, "A3", "incompleta", f"Cursor na página {pagina}.")
                    raise
                for bruto in payload.get("resultado") or []:
                    if isinstance(bruto, dict):
                        upsert_item(db, filial.id, bruto)
                total = int(payload.get("totalPaginas") or 1)
                if pagina >= total:
                    break
                pagina += 1
    _etapa(db, job, "A3", "ok")


def _a4(db, job, filial, cliente, cfg) -> None:
    """Resultados por UASG e janela de 90 dias — mesmo padrão do Compras.gov no sistema 23."""
    inicio, fim = _periodo_job(job, cfg, agora_utc().date())
    uasgs = uasgs_coletaveis(db, filial.id)
    if not uasgs:
        _etapa(db, job, "A4", "ok", "Nenhuma UASG aderida.")
        return
    for uasg in uasgs:
        for bloco_ini, bloco_fim in _janelas(inicio, fim, JANELA_ITENS_DIAS):
            cursor = _cursor(db, filial.id, uasg.codigo_uasg, "resultados", bloco_ini, bloco_fim)
            pagina = cursor.pagina if cursor else 1
            tamanho = cursor.tamanho_pagina if cursor else PAGINA_ITENS
            while True:
                _gravar_cursor(
                    db, filial.id, uasg.codigo_uasg, "resultados", bloco_ini, bloco_fim, pagina, tamanho
                )
                db.commit()
                _consumir(job, cfg)
                try:
                    payload = cliente.resultados(
                        uasg=uasg.codigo_uasg,
                        inicio=bloco_ini,
                        fim=bloco_fim,
                        pagina=pagina,
                        tamanho=tamanho,
                    )
                except OrcamentoEstourado:
                    raise
                except Exception as exc:
                    _etapa(db, job, "A4", "incompleta", f"Cursor na página {pagina}.")
                    raise PaginaInterrompida(pagina) from exc
                for bruto in payload.get("resultado") or []:
                    if isinstance(bruto, dict):
                        upsert_resultado(db, filial.id, bruto)
                total = int(payload.get("totalPaginas") or 1)
                if pagina >= total:
                    break
                pagina += 1
    _etapa(db, job, "A4", "ok")


def _catalogo(db, job, cliente, cfg) -> None:
    from app.models import CatalogoItem

    codigos = db.execute(
        select(ContratacaoItem.cod_item_catalogo, ContratacaoItem.tipo_catalogo)
        .where(ContratacaoItem.cod_item_catalogo != "")
        .limit(20)
    ).all()
    feitos = 0
    for codigo, tipo in codigos:
        if feitos >= 20:
            break
        ja = db.scalar(
            select(CatalogoItem).where(CatalogoItem.codigo == codigo, CatalogoItem.tipo == tipo)
        )
        if ja is not None:
            continue
        try:
            bruto = cliente.catalogo(codigo, tipo)
        except Exception:
            _etapa(db, job, "A3", _status_etapas(db, job).get("A3", "ok"), "Catálogo não respondeu.")
            return
        if isinstance(bruto, dict):
            db.add(
                CatalogoItem(
                    codigo=codigo,
                    tipo=tipo,
                    descricao=str(bruto.get("descricao") or ""),
                    consultado_em=agora_utc(),
                )
            )
            feitos += 1
    db.flush()


def _abrir_faixa_b(db: Session, job: ColetaJob) -> None:
    existe = db.scalar(
        select(ColetaJob).where(
            ColetaJob.filial_id == job.filial_id,
            ColetaJob.faixa == "B",
            ColetaJob.tipo == job.tipo,
            ColetaJob.noite == job.noite,
        )
    )
    if existe is None:
        db.add(
            ColetaJob(
                filial_id=job.filial_id,
                faixa="B",
                tipo=job.tipo,
                noite=job.noite,
                status="pendente",
            )
        )
        return
    # Se B ficou em erro/pausa enquanto A era refeita, reabre sem criar job duplicado.
    if existe.status in {"erro", "continua_amanha", "parcial"}:
        existe.status = "pendente"
        existe.chamadas = 0
        existe.motivo = ""
        existe.terminado_em = None


def preserva_anotacao(db: Session, tenant_id: uuid.UUID, chave: str) -> str | None:
    anotacao = db.scalar(
        select(AnotacaoInterna).where(
            AnotacaoInterna.tenant_id == tenant_id,
            AnotacaoInterna.alvo_tipo == "contratacao",
            AnotacaoInterna.alvo_chave == chave,
        )
    )
    return None if anotacao is None else anotacao.texto
