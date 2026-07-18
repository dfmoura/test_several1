"""Análise de preço de mercado via IA — Propostas abertas.

Monta prompt pré-definido com Descrição / NCM / QTD / Unitário / Total est.
e consome ``IAClient.chat`` (rotação de tokens do Setup). Persistência isolada
em ``proposta_analise_preco`` — não altera tabelas oficiais PNCP.

O comparativo processo×mercado é normalizado no servidor a partir da faixa
(e, se necessário, dos achados), para evitar inversão de sinal/rótulo pela IA.
"""

from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import require_admin, require_login
from app.database import CompraContratacao, CompraContratacaoItem, PropostaAnalisePreco, Usuario, get_db
from app.ia_client import ChatMessage, ia_client
from app.propostas_abertas import (
    _decimal_to_br,
    _ncm_do_item,
    _parse_valor_item,
)

router = APIRouter(prefix="/api/propostas-abertas", tags=["analise-preco-ia"])

PROMPT_VERSAO = "v3"

# Mesmo limiar da referência local (mediana do catálogo): |desvio| < 15% ⇒ alinhado.
_COMPARATIVO_LIMIAR_PCT = 15.0

_PROMPT_TEMPLATE = """Você é um assistente especializado em pesquisa de preços de mercado para apoio à fiscalização de compras públicas no Brasil.

OBJETIVO
Com base no item abaixo, estime faixas de preço de mercado atuais no Brasil (BRL) e apresente achados concretos de sites/fontes, com o máximo de detalhe útil para verificação humana. O resultado é auxiliar — não prova oficial.

REGRAS
- Seja conservador: se houver incerteza, declare explicitamente.
- Não invente notas fiscais, CNPJs, editais, atas ou números de processo.
- Não invente URLs; se não souber o endereço exato, cite o site/canal e deixe url como null.
- Prefira produtos equivalentes (mesma função, material, capacidade e padrão de qualidade). Se usar similar, declare a diferença.
- Informe preços unitários em R$ (número decimal, sem símbolo). Indique se o valor parece incluir frete, IPI, ICMS ou é só produto.
- Considere o mercado brasileiro (B2C e B2B). Quando fizer sentido, priorize fontes públicas de referência de preços.

FONTES A CONSIDERAR (quando aplicável ao item)
Marketplaces e varejo: Mercado Livre, Magazine Luiza, Amazon Brasil, Americanas, Casas Bahia, Shopee, Kabum, Pichau, Loja Oficial do fabricante.
Atacado / B2B: Mercado Livre Empresas, catálogos B2B, distribuidores especializados.
Referências públicas / compras: Painel de Preços (compras.gov.br), Banco de Preços em Saúde (quando saúde), catálogos CATMAT/CATSER, atas/editais públicos similares (sem inventar números).
Outros: site do fabricante, revenda autorizada, tabelas setoriais reconhecidas.

Item em análise:
- Descrição: {descricao}
- NCM: {ncm}
- Quantidade: {qtd}
- Valor unitário estimado no processo: {valor_unitario}
- Total estimado no processo: {total_estimado}

Responda em português do Brasil, nesta ordem:

1) Resumo do item interpretado
   Identifique o bem/serviço, unidade de medida e critérios de equivalência usados.

2) Achados de preço por site/fonte (obrigatório detalhar)
   Liste de 3 a 8 achados, cada um com:
   - nome do site ou fonte
   - tipo (marketplace | varejo | atacado_b2b | painel_publico | catalogo | fabricante | outro)
   - preço unitário em R$ (ou null se indisponível)
   - descrição curta do produto/oferta encontrado
   - URL ou referência (null se desconhecida)
   - data/referência da observação (ex.: "pesquisa atual", "média recente", ou null)
   - nota breve (condição, similaridade, frete, promoção, estoque etc.)
   Se não for possível detalhar sites, explique o motivo em Observações e ainda assim estime a faixa com critérios declarados.

3) Faixa de preço unitário de mercado (mín / típico / máx) em R$
   Derive a faixa a partir dos achados; não use valores incompatíveis com eles sem justificar.

4) Comparativo com o valor unitário do processo
   O sujeito da classificação é SEMPRE o valor unitário estimado do PROCESSO
   em relação ao preço típico de mercado (não o contrário):
   - mais_barato: o processo está abaixo do mercado (processo < mercado)
   - alinhado: desvio absoluto até cerca de 15%
   - mais_caro: o processo está acima do mercado (processo > mercado)
   - indeterminado: sem base suficiente para comparar
   desvio_percentual_aprox = ((unitário_processo − típico_mercado) / típico_mercado) × 100
   Ex.: processo 12,80 e mercado típico 16,00 → desvio ≈ -20 e comparativo mais_barato.
   Explique em 1–3 frases o desvio aproximado percentual, quando calculável.

5) Observações e limitações
   Similaridade, sazonalidade, volumes (atacado vs varejo), impostos, frete, marca, qualidade e qualquer lacuna da pesquisa.

6) Síntese das fontes
   Liste os nomes das fontes efetivamente usadas.

Ao final, inclua um bloco JSON (e somente um) entre as marcas ```json e ``` com o esquema:
{{
  "resumo_item": "string",
  "faixa_unitario": {{"minimo": number|null, "tipico": number|null, "maximo": number|null}},
  "comparativo": "mais_barato"|"alinhado"|"mais_caro"|"indeterminado",
  "desvio_percentual_aprox": number|null,
  "observacoes": "string",
  "fontes": ["string"],
  "achados": [
    {{
      "site": "string",
      "tipo": "marketplace"|"varejo"|"atacado_b2b"|"painel_publico"|"catalogo"|"fabricante"|"outro",
      "preco_unitario": number|null,
      "produto": "string",
      "url": "string|null",
      "referencia_data": "string|null",
      "nota": "string|null"
    }}
  ]
}}
"""


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _fmt_campo(val: Any, default: str = "não informado") -> str:
    if val is None:
        return default
    texto = str(val).strip()
    return texto if texto else default


def _carregar_item(db: Session, item_id: int) -> tuple[CompraContratacaoItem, CompraContratacao]:
    item = db.scalar(
        select(CompraContratacaoItem)
        .options(selectinload(CompraContratacaoItem.contratacao))
        .where(CompraContratacaoItem.id == item_id)
    )
    if not item:
        raise HTTPException(404, "Item não encontrado")
    contratacao = item.contratacao
    if contratacao is None and item.contratacao_id:
        contratacao = db.get(CompraContratacao, item.contratacao_id)
    if contratacao is None:
        raise HTTPException(404, "Contratação do item não encontrada")
    return item, contratacao


def campos_item_para_prompt(item: CompraContratacaoItem) -> dict[str, Any]:
    """Extrai Descrição, NCM, QTD, Unitário e Total est. para o prompt."""
    codigo_ncm, descricao_ncm = _ncm_do_item(item)
    descricao = (
        (item.descricao_detalhada or "").strip()
        or (item.descricao_resumida or "").strip()
        or "não informado"
    )
    if codigo_ncm and descricao_ncm:
        ncm = f"{codigo_ncm} — {descricao_ncm}"
    elif codigo_ncm:
        ncm = codigo_ncm
    else:
        ncm = "não informado"

    qtd_parts = [str(item.quantidade).strip()] if item.quantidade not in (None, "") else []
    if item.unidade_medida:
        qtd_parts.append(str(item.unidade_medida).strip())
    qtd = " ".join(qtd_parts) if qtd_parts else "não informado"

    unitario_num = _parse_valor_item(item.valor_unitario_estimado)
    if unitario_num is not None and unitario_num <= 0:
        unitario_num = None
    total_num = _parse_valor_item(item.valor_total)
    if total_num is not None and total_num <= 0:
        total_num = None
    if total_num is None and unitario_num is not None:
        q = _parse_valor_item(item.quantidade)
        if q is not None:
            total_num = unitario_num * q

    valor_unitario = (
        item.valor_unitario_estimado
        if item.valor_unitario_estimado not in (None, "")
        else _decimal_to_br(unitario_num) or "não informado"
    )
    total_estimado = (
        item.valor_total
        if item.valor_total not in (None, "")
        else _decimal_to_br(total_num) or "não informado"
    )

    return {
        "descricao": descricao,
        "ncm": ncm,
        "codigo_ncm": codigo_ncm,
        "descricao_ncm": descricao_ncm,
        "qtd": qtd,
        "quantidade": item.quantidade,
        "unidade_medida": item.unidade_medida,
        "valor_unitario": _fmt_campo(valor_unitario),
        "total_estimado": _fmt_campo(total_estimado),
        "valor_unitario_num": float(unitario_num) if unitario_num is not None else None,
        "total_estimado_num": float(total_num) if total_num is not None else None,
    }


def montar_prompt(campos: dict[str, Any]) -> str:
    return _PROMPT_TEMPLATE.format(
        descricao=campos["descricao"],
        ncm=campos["ncm"],
        qtd=campos["qtd"],
        valor_unitario=campos["valor_unitario"],
        total_estimado=campos["total_estimado"],
    )


_JSON_FENCE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL | re.IGNORECASE)


def extrair_json_resposta(texto: str | None) -> dict[str, Any] | None:
    if not texto:
        return None
    m = _JSON_FENCE.search(texto)
    candidato = m.group(1) if m else None
    if not candidato:
        # Último objeto JSON “solto” no texto
        inicio = texto.rfind("{")
        fim = texto.rfind("}")
        if inicio >= 0 and fim > inicio:
            candidato = texto[inicio : fim + 1]
    if not candidato:
        return None
    try:
        data = json.loads(candidato)
    except (TypeError, ValueError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _num_preco(val: Any) -> float | None:
    if val is None or isinstance(val, bool):
        return None
    try:
        n = float(val)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(n) or n <= 0:
        return None
    return n


def referencia_preco_mercado(estruturado: dict[str, Any]) -> float | None:
    """Preço de mercado de referência: típico da faixa, senão média min/máx, senão mediana dos achados."""
    faixa = estruturado.get("faixa_unitario")
    if isinstance(faixa, dict):
        tipico = _num_preco(faixa.get("tipico"))
        if tipico is not None:
            return tipico
        minimo = _num_preco(faixa.get("minimo"))
        maximo = _num_preco(faixa.get("maximo"))
        if minimo is not None and maximo is not None:
            return (minimo + maximo) / 2.0
        if minimo is not None:
            return minimo
        if maximo is not None:
            return maximo

    achados = estruturado.get("achados")
    if not isinstance(achados, list):
        return None
    precos = [
        p
        for a in achados
        if isinstance(a, dict)
        for p in (_num_preco(a.get("preco_unitario")),)
        if p is not None
    ]
    if not precos:
        return None
    precos.sort()
    mid = len(precos) // 2
    if len(precos) % 2:
        return precos[mid]
    return (precos[mid - 1] + precos[mid]) / 2.0


def normalizar_comparativo_mercado(
    estruturado: dict[str, Any] | None,
    valor_unitario_processo: float | None,
) -> dict[str, Any] | None:
    """Recalcula comparativo e desvio: processo versus mercado.

    Convenção alinhada à UI:
    - mais_barato → unitário do processo abaixo do mercado
    - mais_caro → unitário do processo acima do mercado
    - desvio_percentual_aprox = ((processo − mercado) / mercado) × 100
    """
    if not isinstance(estruturado, dict):
        return estruturado

    out = dict(estruturado)
    processo = _num_preco(valor_unitario_processo)
    mercado = referencia_preco_mercado(out)
    if processo is None or mercado is None:
        return out

    pct = ((processo - mercado) / mercado) * 100.0
    pct_r = round(pct, 1)
    if pct_r >= _COMPARATIVO_LIMIAR_PCT:
        comparativo = "mais_caro"
    elif pct_r <= -_COMPARATIVO_LIMIAR_PCT:
        comparativo = "mais_barato"
    else:
        comparativo = "alinhado"
    out["comparativo"] = comparativo
    out["desvio_percentual_aprox"] = pct_r
    return out


def analise_para_out(
    row: PropostaAnalisePreco,
    *,
    valor_unitario_processo: float | None = None,
) -> dict[str, Any]:
    estruturado = None
    if row.resposta_json:
        try:
            parsed = json.loads(row.resposta_json)
            if isinstance(parsed, dict):
                estruturado = normalizar_comparativo_mercado(parsed, valor_unitario_processo)
            else:
                estruturado = None
        except (TypeError, ValueError, json.JSONDecodeError):
            estruturado = None
    return {
        "id": row.id,
        "item_id": row.item_id,
        "id_compra_item": row.id_compra_item,
        "prompt_versao": row.prompt_versao,
        "prompt_enviado": row.prompt_enviado,
        "provedor_id": row.provedor_id,
        "provedor_nome": row.provedor_nome,
        "provedor_tipo": row.provedor_tipo,
        "modelo": row.modelo,
        "resposta_texto": row.resposta_texto,
        "resposta_estruturada": estruturado,
        "status": row.status,
        "erro": row.erro,
        "usuario_id": row.usuario_id,
        "criado_em": row.criado_em.isoformat(timespec="seconds") if row.criado_em else None,
        "finalizado_em": (
            row.finalizado_em.isoformat(timespec="seconds") if row.finalizado_em else None
        ),
    }


def executar_busca_mercado(
    db: Session,
    item_id: int,
    *,
    usuario: Usuario | None = None,
) -> PropostaAnalisePreco:
    """Monta prompt, chama IA com rotação e persiste o resultado."""
    item, _contratacao = _carregar_item(db, item_id)
    campos = campos_item_para_prompt(item)
    prompt = montar_prompt(campos)

    row = PropostaAnalisePreco(
        item_id=item.id,
        id_compra_item=item.id_compra_item,
        prompt_versao=PROMPT_VERSAO,
        prompt_enviado=prompt,
        status="pendente",
        usuario_id=usuario.id if usuario and usuario.id else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    resultado = ia_client.chat(
        [
            ChatMessage(
                role="system",
                content=(
                    "Você apoia fiscalização de compras públicas no Brasil. "
                    "Seja factual, conservador e transparente sobre limitações. "
                    "Priorize achados detalhados de sites e preços unitários em R$; "
                    "não invente URLs, CNPJs nem documentos oficiais."
                ),
            ),
            ChatMessage(role="user", content=prompt),
        ],
        purpose="analise_preco",
        db=db,
    )

    row.finalizado_em = _utcnow()
    if resultado.ok and resultado.texto:
        row.status = "ok"
        row.resposta_texto = resultado.texto
        row.provedor_id = resultado.provedor_id
        row.provedor_nome = resultado.provedor_nome
        row.provedor_tipo = resultado.provedor_tipo
        row.modelo = resultado.modelo
        estruturado = extrair_json_resposta(resultado.texto)
        if estruturado is not None:
            estruturado = normalizar_comparativo_mercado(
                estruturado, campos.get("valor_unitario_num")
            )
            row.resposta_json = json.dumps(estruturado, ensure_ascii=False)
    else:
        row.status = "erro"
        row.erro = resultado.erro or "Falha ao obter resposta da IA."
        row.provedor_id = resultado.provedor_id
        row.provedor_nome = resultado.provedor_nome
        row.provedor_tipo = resultado.provedor_tipo
        row.modelo = resultado.modelo

    db.commit()
    db.refresh(row)
    return row


def listar_analises(db: Session, item_id: int, *, limit: int = 20) -> list[PropostaAnalisePreco]:
    return list(
        db.scalars(
            select(PropostaAnalisePreco)
            .where(PropostaAnalisePreco.item_id == item_id)
            .order_by(PropostaAnalisePreco.criado_em.desc(), PropostaAnalisePreco.id.desc())
            .limit(limit)
        ).all()
    )


@router.get("/itens/{item_id}/mercado-ia")
def api_listar_mercado_ia(
    item_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_login),
):
    """Histórico de análises de preço de mercado (somente leitura para consulta)."""
    item, contratacao = _carregar_item(db, item_id)
    campos = campos_item_para_prompt(item)
    prompt = montar_prompt(campos)
    unitario = campos.get("valor_unitario_num")
    historico = [
        analise_para_out(r, valor_unitario_processo=unitario)
        for r in listar_analises(db, item_id)
    ]
    return {
        "item_id": item.id,
        "campos": campos,
        "prompt_versao": PROMPT_VERSAO,
        "prompt_previsto": prompt,
        "aviso": (
            "Resultado auxiliar para apoio à fiscalização — "
            "não constitui prova oficial de preço."
        ),
        "contratacao": {
            "id": contratacao.id,
            "numero": contratacao.numero or contratacao.id_compra,
            "processo": contratacao.processo,
            "data_encerramento_proposta_pncp": contratacao.data_encerramento_proposta_pncp,
        },
        "historico": historico,
        "ultima": historico[0] if historico else None,
    }


@router.post("/itens/{item_id}/mercado-ia")
def api_buscar_mercado_ia(
    item_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_admin),
):
    """Dispara busca de preços de mercado via tokens ativos do Setup (admin).

    Sempre persiste o registro (ok ou erro). Falha de token não altera o item PNCP.
    """
    row = executar_busca_mercado(db, item_id, usuario=usuario)
    item, _ = _carregar_item(db, item_id)
    unitario = campos_item_para_prompt(item).get("valor_unitario_num")
    return analise_para_out(row, valor_unitario_processo=unitario)


@router.get("/itens/{item_id}/mercado-ia/{analise_id}")
def api_obter_mercado_ia(
    item_id: int,
    analise_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_login),
):
    row = db.scalar(
        select(PropostaAnalisePreco).where(
            PropostaAnalisePreco.id == analise_id,
            PropostaAnalisePreco.item_id == item_id,
        )
    )
    if not row:
        raise HTTPException(404, "Análise não encontrada")
    item, _ = _carregar_item(db, item_id)
    unitario = campos_item_para_prompt(item).get("valor_unitario_num")
    return analise_para_out(row, valor_unitario_processo=unitario)
