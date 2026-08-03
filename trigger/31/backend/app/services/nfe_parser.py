"""Parser de NF-e (layout 4.00), tolerante a variações de estrutura.

Aceita tanto <nfeProc> (nota processada, com protocolo) quanto <NFe> pura.
Compatível com os campos novos da reforma tributária (IBS/CBS) — que são
simplesmente ignorados no que não interessa à entrada de estoque/financeiro.
"""

from dataclasses import dataclass, field
from datetime import date, datetime

from lxml import etree


@dataclass
class ParsedItem:
    n_item: int
    codigo_fornecedor: str
    descricao: str
    ncm: str | None
    cfop: str | None
    unidade: str
    quantidade: float
    valor_unitario: float
    valor_total: float
    valor_icms: float | None = None
    valor_ipi: float | None = None


@dataclass
class ParsedDuplicata:
    numero: str
    vencimento: date
    valor: float


@dataclass
class ParsedNfe:
    chave: str
    numero: str
    serie: str | None
    emitida_em: datetime | None
    emit_cnpj: str
    emit_nome: str
    emit_ie: str | None
    emit_endereco: dict
    dest_cnpj: str | None
    valor_produtos: float
    valor_total: float
    valor_icms: float | None
    valor_ipi: float | None
    items: list[ParsedItem] = field(default_factory=list)
    duplicatas: list[ParsedDuplicata] = field(default_factory=list)


class NfeParseError(Exception):
    pass


def _strip_ns(tree: etree._Element) -> etree._Element:
    for el in tree.iter():
        if isinstance(el.tag, str) and "}" in el.tag:
            el.tag = el.tag.split("}", 1)[1]
    etree.cleanup_namespaces(tree)
    return tree


def _text(el: etree._Element | None, path: str) -> str | None:
    if el is None:
        return None
    found = el.find(path)
    return found.text.strip() if found is not None and found.text else None


def _num(el: etree._Element | None, path: str) -> float | None:
    t = _text(el, path)
    try:
        return float(t) if t is not None else None
    except ValueError:
        return None


def parse_nfe_xml(content: bytes) -> ParsedNfe:
    try:
        root = etree.fromstring(content)
    except etree.XMLSyntaxError as exc:
        raise NfeParseError(f"XML inválido: {exc}") from exc

    root = _strip_ns(root)

    inf = root.find(".//infNFe")
    if inf is None:
        raise NfeParseError("Arquivo não é uma NF-e: tag <infNFe> não encontrada.")

    chave = (inf.get("Id") or "").replace("NFe", "")
    if not chave:
        chave = _text(root, ".//protNFe/infProt/chNFe") or ""
    if len(chave) != 44:
        raise NfeParseError("Chave de acesso da NF-e não encontrada ou inválida.")

    ide = inf.find("ide")
    emit = inf.find("emit")
    dest = inf.find("dest")
    total = inf.find("total/ICMSTot")

    if emit is None or total is None:
        raise NfeParseError("Estrutura da NF-e incompleta (emit/total ausentes).")

    dh_emi = _text(ide, "dhEmi") or _text(ide, "dEmi")
    emitida_em = None
    if dh_emi:
        try:
            emitida_em = datetime.fromisoformat(dh_emi)
        except ValueError:
            pass

    ender = emit.find("enderEmit")
    endereco = {
        "cep": _text(ender, "CEP"),
        "logradouro": _text(ender, "xLgr"),
        "numero": _text(ender, "nro"),
        "complemento": _text(ender, "xCpl"),
        "bairro": _text(ender, "xBairro"),
        "municipio": _text(ender, "xMun"),
        "uf": _text(ender, "UF"),
        "telefone": _text(ender, "fone"),
    }

    items: list[ParsedItem] = []
    for det in inf.findall("det"):
        prod = det.find("prod")
        if prod is None:
            continue
        imposto = det.find("imposto")
        v_icms = None
        v_ipi = None
        if imposto is not None:
            icms_el = imposto.find(".//vICMS")
            if icms_el is not None and icms_el.text:
                try:
                    v_icms = float(icms_el.text)
                except ValueError:
                    pass
            ipi_el = imposto.find(".//IPI//vIPI")
            if ipi_el is not None and ipi_el.text:
                try:
                    v_ipi = float(ipi_el.text)
                except ValueError:
                    pass
        items.append(
            ParsedItem(
                n_item=int(det.get("nItem") or len(items) + 1),
                codigo_fornecedor=_text(prod, "cProd") or "",
                descricao=_text(prod, "xProd") or "",
                ncm=_text(prod, "NCM"),
                cfop=_text(prod, "CFOP"),
                unidade=(_text(prod, "uCom") or "UN").upper(),
                quantidade=_num(prod, "qCom") or 0.0,
                valor_unitario=_num(prod, "vUnCom") or 0.0,
                valor_total=_num(prod, "vProd") or 0.0,
                valor_icms=v_icms,
                valor_ipi=v_ipi,
            )
        )

    duplicatas: list[ParsedDuplicata] = []
    for dup in inf.findall("cobr/dup"):
        venc = _text(dup, "dVenc")
        valor = _num(dup, "vDup")
        if venc and valor is not None:
            duplicatas.append(
                ParsedDuplicata(
                    numero=_text(dup, "nDup") or str(len(duplicatas) + 1),
                    vencimento=date.fromisoformat(venc),
                    valor=valor,
                )
            )

    return ParsedNfe(
        chave=chave,
        numero=_text(ide, "nNF") or "",
        serie=_text(ide, "serie"),
        emitida_em=emitida_em,
        emit_cnpj=_text(emit, "CNPJ") or "",
        emit_nome=_text(emit, "xNome") or "",
        emit_ie=_text(emit, "IE"),
        emit_endereco=endereco,
        dest_cnpj=_text(dest, "CNPJ"),
        valor_produtos=_num(total, "vProd") or 0.0,
        valor_total=_num(total, "vNF") or 0.0,
        valor_icms=_num(total, "vICMS"),
        valor_ipi=_num(total, "vIPI"),
        items=items,
        duplicatas=duplicatas,
    )
