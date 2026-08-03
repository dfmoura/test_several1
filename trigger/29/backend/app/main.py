from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from sqlalchemy.orm import Session

from app.db import MatrizCobrada, Quote, dumps, get_db, init_db
from app.engine.calculator import FaixaEntrada, OrcamentoEntrada, calcular_orcamento, resultado_to_dict
from app.engine.catalog import load_catalog
from app.engine.matrix_key import chave_matriz
from app.schemas import CalcularIn, QuoteCreate

app = FastAPI(title="Orçamento Flexográfico", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()


def _to_entrada(body: CalcularIn, matriz_ja_cobrada: bool | None = None) -> OrcamentoEntrada:
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
        maquina_roda_servico=(
            None
            if body.maquina_roda_servico is None
            else str(body.maquina_roda_servico).strip()
        ),
        imposto_pct=body.imposto_pct,
        matriz=body.matriz,
        coluna_rebobinacao=body.coluna_rebobinacao,
        tipo_troca_produto=body.tipo_troca_produto,
        rpm=body.rpm,
        faixas=[FaixaEntrada(f.quantidade, f.comissao_pct) for f in body.faixas],
        overrides=body.overrides,
        matriz_ja_cobrada=body.matriz_ja_cobrada if matriz_ja_cobrada is None else matriz_ja_cobrada,
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/catalog")
def catalog():
    cat = load_catalog()
    return {
        "papel": cat.papel,
        "acabamentos": cat.acabamentos,
        "tubete": {k: v for k, v in cat.tubete.items() if k != '1" 1/2'},
        "hora_parada": cat.hora_parada_h,
        "hora_maquina": cat.hora_maquina,
        "tinta_acima_m2": cat.tinta_acima_m2,
        "preco_caixa": cat.preco_caixa,
        "medida_caixas": cat.medida_caixas,
        "caixa_empacotamento": cat.caixa_empacotamento,
        "cores": ["0", "1", "2", "3", "4", "4V", "5", "6", "7", "8"],
        # G10 — máquinas detalhadas (BETA, 160, 250, ETIRAMA, BATIDA, MODULAR)
        "maquinas": cat.maquinas or list(cat.hora_maquina.keys()),
        "maquinas_roda_servico": cat.maquinas_roda_servico,
        "maquina_aliases": cat.maquina_aliases,
    }


@app.get("/api/facas")
def list_facas(
    q: str | None = None,
    medida: str | None = None,
    maquina: str | None = None,
    formato: str | None = None,
    so_completas: bool = False,
):
    """
    Catálogo MAPA DE FACAS 20260715 ATUAL.
    Ao escolher a faca: medida, puxada, Z, formato e REP (repetição) vêm juntos.
    REDONDA: medida = diâmetro (Ø).
    """
    import json

    path = Path(__file__).resolve().parent / "data" / "mapa_facas.json"
    all_facas = json.loads(path.read_text(encoding="utf-8"))
    facas = list(all_facas)

    if so_completas:
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
            if fo in (f.get("formato") or "").upper()
            or fo in (f.get("faca") or "").upper()
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
        ]

    formatos = sorted(
        {(f.get("formato") or "").strip() for f in all_facas if f.get("formato")}
    )
    return {
        "total": len(facas),
        "items": facas[:800],
        "formatos": formatos,
        "meta": {
            "fonte": "MAPA DE FACAS 20260715 ATUAL",
            "pivot": "MAPA_DE_FACAS",
            "nota_redonda": "Formato REDONDA: TAMANHO = diâmetro (Ø).",
            "nota_rep": "REP = REPETIÇÃO.",
            "nota_manual": "Planilha oficial tem lacunas; facas incompletas exigem puxada/Z manuais.",
        },
    }


@app.get("/api/facas/{faca_id}")
def get_faca(faca_id: int):
    import json

    path = Path(__file__).resolve().parent / "data" / "mapa_facas.json"
    facas = json.loads(path.read_text(encoding="utf-8"))
    for f in facas:
        if f.get("id") == faca_id:
            return f
    raise HTTPException(404, "Faca não encontrada")


@app.post("/api/calculate")
def calculate(body: CalcularIn, db: Session = Depends(get_db)):
    if not body.faixas:
        raise HTTPException(400, "Informe ao menos uma faixa de quantidade")
    ck = chave_matriz(
        body.cliente, body.medida, body.z, body.cores, body.largura_cm, body.colunas
    )
    ja = db.query(MatrizCobrada).filter(MatrizCobrada.chave_matriz == ck).first() is not None
    if body.matriz_ja_cobrada:
        ja = True
    res = calcular_orcamento(_to_entrada(body, matriz_ja_cobrada=ja))
    out = resultado_to_dict(res)
    out["proposta"] = {
        "prazo_entrega": body.prazo_entrega,
        "validade_proposta": body.validade_proposta,
        "tolerancia_qtd_pct": body.tolerancia_qtd_pct,
        "cliente": body.cliente,
        "papel": body.papel,
        "acabamento": body.acabamento,
        "medida": body.medida,
        "cores": body.cores,
        "etiq_por_rolo": body.etiq_por_rolo,
        "maquina_roda_servico": body.maquina_roda_servico,
    }
    return out


@app.post("/api/quotes")
def create_quote(body: QuoteCreate, db: Session = Depends(get_db)):
    if not body.faixas:
        raise HTTPException(400, "Informe ao menos uma faixa de quantidade")
    ck = chave_matriz(
        body.cliente, body.medida, body.z, body.cores, body.largura_cm, body.colunas
    )
    ja = db.query(MatrizCobrada).filter(MatrizCobrada.chave_matriz == ck).first() is not None
    res = calcular_orcamento(_to_entrada(body, matriz_ja_cobrada=ja or body.matriz_ja_cobrada))
    out = resultado_to_dict(res)
    quote = Quote(
        cliente=body.cliente,
        payload_json=dumps(body.model_dump()),
        result_json=dumps(out),
        chave_matriz=ck,
        cobra_matriz=res.cobra_matriz,
        valor_matriz=res.valor_matriz,
        prazo_entrega=body.prazo_entrega,
        validade_proposta=body.validade_proposta,
        tolerancia_qtd_pct=body.tolerancia_qtd_pct,
    )
    db.add(quote)
    db.flush()
    if res.cobra_matriz and res.valor_matriz > 0:
        if not db.query(MatrizCobrada).filter(MatrizCobrada.chave_matriz == ck).first():
            db.add(
                MatrizCobrada(
                    chave_matriz=ck,
                    cliente=body.cliente,
                    quote_id=quote.id,
                    valor=res.valor_matriz,
                )
            )
    db.commit()
    db.refresh(quote)
    return {"id": quote.id, "result": out}


@app.get("/api/quotes/{quote_id}")
def get_quote(quote_id: int, db: Session = Depends(get_db)):
    q = db.get(Quote, quote_id)
    if not q:
        raise HTTPException(404, "Orçamento não encontrado")
    import json

    return {
        "id": q.id,
        "cliente": q.cliente,
        "created_at": q.created_at,
        "payload": json.loads(q.payload_json),
        "result": json.loads(q.result_json),
        "prazo_entrega": q.prazo_entrega,
        "validade_proposta": q.validade_proposta,
        "tolerancia_qtd_pct": q.tolerancia_qtd_pct,
    }


static_dir = Path(__file__).resolve().parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
