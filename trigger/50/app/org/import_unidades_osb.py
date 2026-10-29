"""Import idempotente das filiais OSB a partir de unidades-osb.txt.

Identidade canônica: CNPJ (14 dígitos).
Não remove unidades existentes fora do arquivo (ex.: Maringá, Demo).
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import BASE_DIR, USER_AGENT
from app.database import Organizacao, Unidade
from app.org.service import OrgError, atualizar_unidade, criar_unidade
from app.territorial.service import associar_municipio

# Casos em que o rótulo do mapa ≠ município-sede IBGE.
_IBGE_OVERRIDES: dict[tuple[str, str], int] = {
    ("CAMPOS GERAIS", "PR"): 4119905,  # Ponta Grossa
    ("REGIAO DOS LAGOS", "RJ"): 3305208,  # São Pedro da Aldeia
    ("GRAVATAI/GLORINHA", "RS"): 4309209,  # Gravataí
}

_CODIGO_OVERRIDES: dict[str, str] = {
    # CNPJ → código já em uso (não regenerar)
    "23497346000142": "OSBUDI",  # Uberlândia
    "06161227000103": "OSBMAR",  # Maringá (fora do mapa; preserva se existir)
}

_LINHA_RE = re.compile(
    r"^(?P<cidade>.+?)\s*[–-]\s*(?P<uf>[A-Z]{2})\s*\|\s*"
    r"Presidente:\s*(?P<presidente>.+?)\s*\|\s*"
    r"CNPJ:\s*(?P<cnpj>[\d./-]+)\s*$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class UnidadeOsbFonte:
    cidade: str
    uf: str
    presidente: str
    cnpj: str  # 14 dígitos
    nome: str
    municipio_chave: str  # cidade normalizada p/ IBGE


@dataclass
class ResultadoImport:
    criadas: int = 0
    atualizadas: int = 0
    inalteradas: int = 0
    municipios_ok: int = 0
    municipios_falha: int = 0
    erros: list[str] | None = None

    def __post_init__(self) -> None:
        if self.erros is None:
            self.erros = []


def _sem_acento(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(ch for ch in nfkd if not unicodedata.combining(ch))


def _norm_chave(texto: str) -> str:
    t = _sem_acento(texto).upper().strip()
    t = re.sub(r"\s+", " ", t)
    return t


def _digits_cnpj(cnpj: str) -> str:
    digits = "".join(ch for ch in cnpj if ch.isdigit())
    if len(digits) != 14:
        raise ValueError(f"CNPJ inválido: {cnpj}")
    return digits


def parse_unidades_osb(texto: str) -> list[UnidadeOsbFonte]:
    """Extrai unidades do arquivo-fonte (ignora cabeçalhos e notas)."""
    out: list[UnidadeOsbFonte] = []
    vistos: set[str] = set()
    for raw in texto.splitlines():
        linha = raw.strip()
        if not linha or linha.startswith("#") or linha.startswith("---"):
            continue
        if linha.startswith("##") or linha.startswith("TOTAL:") or linha.startswith("Notas:"):
            continue
        if linha.startswith("- "):
            continue
        m = _LINHA_RE.match(linha)
        if not m:
            continue
        cidade = m.group("cidade").strip()
        uf = m.group("uf").strip().upper()
        presidente = m.group("presidente").strip()
        cnpj = _digits_cnpj(m.group("cnpj"))
        if cnpj in vistos:
            continue
        vistos.add(cnpj)
        chave = _norm_chave(cidade)
        out.append(
            UnidadeOsbFonte(
                cidade=cidade,
                uf=uf,
                presidente=presidente,
                cnpj=cnpj,
                nome=f"OSB {cidade}/{uf}",
                municipio_chave=chave,
            )
        )
    return out


def carregar_arquivo(path: Path | None = None) -> list[UnidadeOsbFonte]:
    arquivo = path or (BASE_DIR / "unidades-osb.txt")
    if not arquivo.is_file():
        alt = BASE_DIR / "app" / "org" / "fixtures" / "unidades-osb.txt"
        if alt.is_file():
            arquivo = alt
        else:
            raise FileNotFoundError(f"Arquivo não encontrado: {arquivo}")
    return parse_unidades_osb(arquivo.read_text(encoding="utf-8"))


def _slug_letras(cidade: str, n: int = 3) -> str:
    base = re.sub(r"[^A-Z]", "", _sem_acento(cidade).upper())
    if not base:
        return "X" * n
    if len(base) >= n:
        return base[:n]
    return (base + "X" * n)[:n]


def gerar_codigo(cidade: str, uf: str, cnpj: str, usados: set[str]) -> str:
    if cnpj in _CODIGO_OVERRIDES and _CODIGO_OVERRIDES[cnpj] not in usados:
        return _CODIGO_OVERRIDES[cnpj]
    if cnpj in _CODIGO_OVERRIDES:
        # override colidiu — cai no algoritmo
        pass

    candidatos = [
        f"OSB{_slug_letras(cidade, 3)}",
        f"OSB{_slug_letras(cidade, 3)}{uf}",
        f"OSB{_slug_letras(cidade, 4)}",
        f"OSB{_slug_letras(cidade, 2)}{uf}",
        f"OSB{cnpj[-4:]}",
    ]
    for cod in candidatos:
        if cod not in usados:
            return cod
    # Último recurso: sufixo incremental
    i = 2
    while True:
        cod = f"OSB{_slug_letras(cidade, 3)}{i}"
        if cod not in usados:
            return cod
        i += 1


def _observacoes(fonte: UnidadeOsbFonte) -> str:
    return (
        f"Presidente: {fonte.presidente}. "
        f"Fonte: mapa OSB (osbrasil.org.br) · CNPJ validado 2026-10-22."
    )


class _IbgeCache:
    """Lista municípios por UF (API IBGE Localidades) com cache em memória."""

    def __init__(self) -> None:
        self._por_uf: dict[str, dict[str, int]] = {}

    def codigo(self, cidade_chave: str, uf: str) -> int | None:
        override = _IBGE_OVERRIDES.get((cidade_chave, uf))
        if override:
            return override
        mapa = self._carregar_uf(uf)
        if cidade_chave in mapa:
            return mapa[cidade_chave]
        # Tentativa: parte antes de /
        if "/" in cidade_chave:
            prim = cidade_chave.split("/", 1)[0].strip()
            if prim in mapa:
                return mapa[prim]
        return None

    def _carregar_uf(self, uf: str) -> dict[str, int]:
        uf = uf.upper()
        if uf in self._por_uf:
            return self._por_uf[uf]
        url = (
            f"https://servicodados.ibge.gov.br/api/v1/localidades/"
            f"estados/{uf}/municipios"
        )
        try:
            with httpx.Client(
                timeout=30.0,
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
                follow_redirects=True,
            ) as client:
                resp = client.get(url)
                resp.raise_for_status()
                data = resp.json()
        except (httpx.HTTPError, ValueError):
            self._por_uf[uf] = {}
            return self._por_uf[uf]

        mapa: dict[str, int] = {}
        if isinstance(data, list):
            for item in data:
                if not isinstance(item, dict):
                    continue
                nome = item.get("nome")
                mid = item.get("id")
                if nome and mid:
                    mapa[_norm_chave(str(nome))] = int(mid)
        self._por_uf[uf] = mapa
        return mapa


def _resolver_org_osb(db: Session) -> tuple[Organizacao, Unidade]:
    org = db.scalar(
        select(Organizacao).where(
            Organizacao.codigo == "OSB",
            Organizacao.ativo.is_(True),
        )
    )
    if org is None:
        org = db.scalar(
            select(Organizacao).where(
                Organizacao.nome.ilike("%Observatório Social Brasil%"),
                Organizacao.ativo.is_(True),
            )
        )
    if org is None:
        raise OrgError(
            "Organização OSB não encontrada. Cadastre a matriz antes do import.",
            status_code=404,
        )
    matriz = db.scalar(
        select(Unidade).where(
            Unidade.organizacao_id == org.id,
            Unidade.tipo == "matriz",
            Unidade.ativo.is_(True),
        )
    )
    if matriz is None:
        raise OrgError("Matriz OSB ativa não encontrada.", status_code=404)
    return org, matriz


def _por_cnpj(db: Session, organizacao_id: int) -> dict[str, Unidade]:
    rows = db.scalars(
        select(Unidade).where(
            Unidade.organizacao_id == organizacao_id,
            Unidade.cnpj.is_not(None),
        )
    ).all()
    return {u.cnpj: u for u in rows if u.cnpj}


def importar_unidades_osb(
    db: Session,
    *,
    fontes: list[UnidadeOsbFonte] | None = None,
    path: Path | None = None,
    vincular_municipios: bool = True,
    dry_run: bool = False,
) -> ResultadoImport:
    """Sincroniza filiais OSB. Idempotente por CNPJ."""
    resultado = ResultadoImport()
    fontes = fontes if fontes is not None else carregar_arquivo(path)
    org, matriz = _resolver_org_osb(db)
    existentes = _por_cnpj(db, org.id)
    usados_codigos = {
        u.codigo
        for u in db.scalars(
            select(Unidade).where(Unidade.organizacao_id == org.id)
        ).all()
        if u.codigo
    }
    ibge = _IbgeCache() if vincular_municipios else None

    for fonte in fontes:
        atual = existentes.get(fonte.cnpj)
        obs = _observacoes(fonte)
        try:
            if atual is None:
                codigo = gerar_codigo(fonte.cidade, fonte.uf, fonte.cnpj, usados_codigos)
                if dry_run:
                    resultado.criadas += 1
                    usados_codigos.add(codigo)
                    continue
                uni = criar_unidade(
                    db,
                    organizacao_id=org.id,
                    tipo="filial",
                    nome=fonte.nome,
                    codigo=codigo,
                    matriz_id=matriz.id,
                    cnpj=fonte.cnpj,
                    observacoes=obs,
                )
                usados_codigos.add(codigo)
                existentes[fonte.cnpj] = uni
                resultado.criadas += 1
                atual = uni
            else:
                mudou = (
                    atual.nome != fonte.nome
                    or (atual.observacoes or "") != obs
                    or not atual.ativo
                )
                if mudou and not dry_run:
                    atualizar_unidade(
                        db,
                        atual.id,
                        nome=fonte.nome,
                        observacoes=obs,
                        ativo=True,
                    )
                    resultado.atualizadas += 1
                elif mudou and dry_run:
                    resultado.atualizadas += 1
                else:
                    resultado.inalteradas += 1

            if vincular_municipios and ibge is not None and atual is not None:
                codigo_ibge = ibge.codigo(fonte.municipio_chave, fonte.uf)
                if codigo_ibge is None:
                    resultado.municipios_falha += 1
                    resultado.erros.append(
                        f"IBGE não resolvido: {fonte.cidade}/{fonte.uf} ({fonte.cnpj})"
                    )
                elif not dry_run:
                    associar_municipio(
                        db,
                        unidade_id=atual.id,
                        codigo_ibge=codigo_ibge,
                    )
                    resultado.municipios_ok += 1
                else:
                    resultado.municipios_ok += 1
        except OrgError as exc:
            resultado.erros.append(f"{fonte.nome} ({fonte.cnpj}): {exc.message}")
        except Exception as exc:  # noqa: BLE001 — relatório agregado no import
            resultado.erros.append(f"{fonte.nome} ({fonte.cnpj}): {exc}")

    return resultado
