from __future__ import annotations

import json
import re
from typing import Any

import httpx

SYSTEM_DESDOBRAR = (
    "Você organiza propostas da Trigger. Sua função é DESDOBRAR o pedido do cliente "
    "com fidelidade — reorganizar com clareza, nunca ampliar o escopo.\n"
    "Regras obrigatórias:\n"
    "1. Use SOMENTE o que está no título, descrição, objetivo, sistema atual e conversa. "
    "Se não estiver escrito, não existe.\n"
    "2. Não invente: stack, fornecedor, Pix/Stripe, plataforma, hardware, documentação, "
    "treinamento, suporte, operação contínua, kickoff, alinhamento, fundação, homologação, "
    "go-live, licenças, infraestrutura, preço, prazo, horas nem tipo de contrato.\n"
    "3. descricao_funcional, incluso e criterios_aceite: reescreva o pedido em linguagem "
    "direta, sem acrescentar entregas.\n"
    "4. nao_incluso: se o cliente não excluiu nada, use exatamente "
    "'Tudo o que não foi pedido nesta demanda.' "
    "Só detalhe exclusões se o próprio texto já as disser. Sem catálogo genérico.\n"
    "5. Etapas: o MÍNIMO necessário. Preferir 1. Só abra N etapas se o pedido tiver "
    "entregas distintas de valor já citadas (ex.: NFC e pagamento; Android e iOS). "
    "Máximo 4. Cada etapa: título curto, resultado observável, 'pronta quando' — "
    "tudo ancorado no texto. Sem etapas de processo interno.\n"
    "6. Não peça senhas nem acessos. Português do Brasil, tom direto."
)

ETAPAS_PROCESSO_PROIBIDAS = (
    "alinhamento",
    "fundação",
    "kickoff",
    "homologação",
    "homologacao",
    "go-live",
    "golive",
    "documentação",
    "documentacao",
    "treinamento",
    "suporte",
    "fechamento",
)


def desdobrar_mock(payload: dict[str, Any]) -> dict[str, Any]:
    titulo = (payload.get("titulo") or "Entrega").strip() or "Entrega"
    descricao = (payload.get("descricao") or "").strip()
    objetivo = (payload.get("objetivo") or "").strip()
    sistema = (payload.get("sistema_atual") or "").strip()
    conversa = _texto_mensagens(payload.get("mensagens"))
    pedido = "\n".join(p for p in (titulo, objetivo, descricao, sistema, conversa) if p).strip()
    nucleo = (objetivo or descricao or titulo).strip()

    # Junta só o que veio no pedido (sem redação inventada).
    blocos: list[str] = []
    for bloco in (objetivo, descricao):
        if bloco and bloco not in blocos:
            blocos.append(bloco)
    if conversa:
        blocos.append(conversa)
    if not blocos:
        blocos.append(titulo)
    descricao_funcional = "\n\n".join(blocos).strip()[:8000]

    incluso = _frase_incluso(nucleo if nucleo else descricao_funcional, "")
    nao_incluso = "Tudo o que não foi pedido nesta demanda."
    criterios = (
        f"O resultado pedido está funcionando conforme descrito: {nucleo[:280]}"
        if nucleo
        else "O resultado pedido está funcionando conforme o escopo."
    )

    return {
        "descricao_funcional": descricao_funcional,
        "incluso": incluso,
        "nao_incluso": nao_incluso,
        "criterios_aceite": criterios[:4000],
        "etapas": _etapas_do_pedido(titulo=titulo, pedido=pedido, nucleo=nucleo),
    }


def desdobrar_openai(settings: Any, payload: dict[str, Any]) -> dict[str, Any]:
    if not getattr(settings, "openai_api_key", ""):
        raise RuntimeError("OPENAI_API_KEY ausente")

    trechos = [
        f"Código: {payload.get('codigo') or '—'}",
        f"Título: {payload.get('titulo') or '—'}",
        f"Objetivo: {payload.get('objetivo') or '—'}",
        f"Sistema atual: {payload.get('sistema_atual') or '—'}",
        f"Descrição:\n{payload.get('descricao') or '—'}",
    ]
    mensagens = payload.get("mensagens") or []
    if isinstance(mensagens, list) and mensagens:
        linhas = []
        for m in mensagens[-8:]:
            if not isinstance(m, dict):
                continue
            autor = str(m.get("autor") or "—")
            corpo = str(m.get("corpo") or "").strip()
            if corpo:
                linhas.append(f"- {autor}: {corpo[:500]}")
        if linhas:
            trechos.append("Conversa recente:\n" + "\n".join(linhas))

    messages = [
        {"role": "system", "content": SYSTEM_DESDOBRAR},
        {
            "role": "user",
            "content": (
                "Desdobre com fidelidade o pedido abaixo. Não invente escopo.\n"
                "Responda só com JSON neste formato:\n"
                '{"descricao_funcional":"...","incluso":"...","nao_incluso":"...",'
                '"criterios_aceite":"...","etapas":[{"ordem":1,"titulo":"...",'
                '"resultado":"...","aceite":"..."}]}\n'
                "Se houver um único resultado, use uma única etapa.\n\n"
                + "\n\n".join(trechos)
            ),
        },
    ]
    url = settings.openai_base_url.rstrip("/") + "/chat/completions"
    with httpx.Client(timeout=45.0) as client:
        resp = client.post(
            url,
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.openai_model,
                "messages": messages,
                "temperature": 0.1,
            },
        )
        resp.raise_for_status()
        raw = str(resp.json()["choices"][0]["message"]["content"]).strip()

    data = _parse_json(raw)
    if not data:
        return desdobrar_mock(payload)
    return _normalizar_draft(data, payload)


def _texto_mensagens(mensagens: Any) -> str:
    if not isinstance(mensagens, list):
        return ""
    partes: list[str] = []
    for m in mensagens[-8:]:
        if not isinstance(m, dict):
            continue
        corpo = str(m.get("corpo") or "").strip()
        if corpo:
            partes.append(corpo[:500])
    return "\n".join(partes)


def _frase_incluso(nucleo: str, conversa: str) -> str:
    bits = [b for b in (nucleo[:500], conversa[:300]) if b]
    if not bits:
        return "O que foi pedido na demanda."
    return "O que foi pedido: " + " ".join(bits).strip()[:3900]


def _etapas_do_pedido(*, titulo: str, pedido: str, nucleo: str) -> list[dict[str, Any]]:
    """Só parte o plano quando o próprio texto marca entregas distintas."""
    texto = pedido.lower()
    candidatas: list[tuple[str, str, str]] = []

    tem_nfc = any(t in texto for t in ("nfc", "aproxim", "terminal"))
    tem_pag = any(t in texto for t in ("pix", "stripe", "pagamento", "cobran"))
    tem_android = "android" in texto
    tem_ios = "ios" in texto or "iphone" in texto

    if tem_nfc and tem_pag:
        candidatas.append(
            (
                "NFC no posto",
                "Aproximação ao terminal e registro do local conforme o pedido.",
                "O fluxo de aproximação/NFC descrito no pedido funciona.",
            )
        )
        candidatas.append(
            (
                "Pagamento e liberação",
                "Pagamento no fluxo pedido e liberação do terminal após a confirmação.",
                "Após o pagamento, o terminal libera conforme o pedido.",
            )
        )
    elif tem_pag and not tem_nfc:
        candidatas.append(
            (
                "Pagamento",
                "Cobrança/pagamento no fluxo descrito no pedido.",
                "O pagamento descrito no pedido funciona de ponta a ponta.",
            )
        )
    elif tem_nfc and not tem_pag:
        candidatas.append(
            (
                "NFC / terminal",
                "Aproximação e uso do terminal conforme o pedido.",
                "O fluxo NFC/terminal descrito no pedido funciona.",
            )
        )

    if tem_android and tem_ios:
        candidatas.append(
            (
                "App Android e iOS",
                "Aplicativo disponível para Android e iOS no escopo pedido.",
                "O app atende Android e iOS conforme o pedido.",
            )
        )
    elif tem_android:
        candidatas.append(
            (
                "App Android",
                "Aplicativo Android no escopo pedido.",
                "O app Android funciona conforme o pedido.",
            )
        )
    elif tem_ios:
        candidatas.append(
            (
                "App iOS",
                "Aplicativo iOS no escopo pedido.",
                "O app iOS funciona conforme o pedido.",
            )
        )

    # Sem sinais claros de partes distintas → uma etapa só (o próprio pedido).
    if len(candidatas) <= 1:
        titulo_etapa = (titulo[:120] if titulo else "Entrega pedida").strip()
        resultado = nucleo[:800] if nucleo else titulo_etapa
        return [
            {
                "ordem": 1,
                "titulo": titulo_etapa[:160],
                "resultado": resultado,
                "aceite": "O que foi pedido está pronto e utilizável conforme a descrição.",
            }
        ]

    # Evita duplicar “app” quando NFC+pag já cobrem o valor; se app também veio, mantém.
    etapas: list[dict[str, Any]] = []
    for titulo_e, resultado, aceite in candidatas[:4]:
        etapas.append(
            {
                "ordem": len(etapas) + 1,
                "titulo": titulo_e[:160],
                "resultado": resultado[:800],
                "aceite": aceite[:800],
            }
        )
    return etapas


def _parse_json(raw: str) -> dict[str, Any] | None:
    raw = raw.strip()
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def _etapa_proibida(titulo: str) -> bool:
    t = titulo.lower()
    return any(p in t for p in ETAPAS_PROCESSO_PROIBIDAS)


def _normalizar_draft(data: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    fallback = desdobrar_mock(payload)
    etapas_raw = data.get("etapas")
    etapas: list[dict[str, Any]] = []
    if isinstance(etapas_raw, list):
        for item in etapas_raw[:4]:
            if not isinstance(item, dict):
                continue
            titulo = str(item.get("titulo") or "").strip()
            if not titulo or _etapa_proibida(titulo):
                continue
            etapas.append(
                {
                    "ordem": len(etapas) + 1,
                    "titulo": titulo[:160],
                    "resultado": str(item.get("resultado") or "").strip()[:800],
                    "aceite": str(item.get("aceite") or "").strip()[:800],
                }
            )
    if not etapas:
        etapas = fallback["etapas"]

    descricao = str(data.get("descricao_funcional") or "").strip()
    incluso = str(data.get("incluso") or "").strip()
    nao_incluso = str(data.get("nao_incluso") or "").strip()
    criterios = str(data.get("criterios_aceite") or "").strip()

    return {
        "descricao_funcional": (descricao or fallback["descricao_funcional"])[:8000],
        "incluso": (incluso or fallback["incluso"])[:4000],
        "nao_incluso": (nao_incluso or fallback["nao_incluso"])[:4000],
        "criterios_aceite": (criterios or fallback["criterios_aceite"])[:4000],
        "etapas": etapas,
    }
