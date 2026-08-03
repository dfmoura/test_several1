"""Ciclo operacional canônico — única fonte de verdade (domínio DOC/32 + jornada HML)."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Literal

StageMode = Literal["OPERACIONAL", "HOMOLOGAVEL", "TEORICO"]


@dataclass(frozen=True)
class Etapa:
    id: str
    ordem: int
    codigo: str
    label: str
    titulo: str
    descricao: str
    href: str
    modo: StageMode
    modulo: str
    regra: str


ETAPAS: tuple[Etapa, ...] = (
    Etapa(
        id="plataforma",
        ordem=0,
        codigo="E0",
        label="Plataforma",
        titulo="0. Plataforma",
        descricao="Auth, RBAC, ambiente HML/PROD, parâmetros e saúde do sistema.",
        href="/",
        modo="OPERACIONAL",
        modulo="M11",
        regra="Documento nunca é apagado; dinheiro/NF exigem idempotência; multi-empresa via empresa_id.",
    ),
    Etapa(
        id="cadastros",
        ordem=1,
        codigo="E1",
        label="Cadastros",
        titulo="1. Cadastros",
        descricao="Parceiros (Party) e produtos MP/PA/SVC/REV com chaves de negócio imutáveis.",
        href="/parceiros",
        modo="OPERACIONAL",
        modulo="M01",
        regra="Um parceiro, vários papéis (CLIENTE/FORNECEDOR/VENDEDOR). Código numérico imutável após criar.",
    ),
    Etapa(
        id="orcamento",
        ordem=2,
        codigo="E2",
        label="Orçamento",
        titulo="2. Orçamento",
        descricao="Motor R1–R20 a partir do XLSM oficial; faixas; snapshot; aceite formal.",
        href="/orcamentos",
        modo="OPERACIONAL",
        modulo="M02",
        regra="Aceite formal gera PED. 'Combinado no zap' NÃO gera pedido. Snapshot trava preço/espec.",
    ),
    Etapa(
        id="pedido",
        ordem=3,
        codigo="E3",
        label="Pedido",
        titulo="3. Pedido",
        descricao="PED nasce do ORC aprovado; crédito/sinal liberam produção.",
        href="/pedidos",
        modo="OPERACIONAL",
        modulo="M02",
        regra="PED é o agregado-raiz operacional. Não recalcular na conversão ORC→PED.",
    ),
    Etapa(
        id="producao",
        ordem=4,
        codigo="E4",
        label="Produção",
        titulo="4. Produção / PCP",
        descricao="OP (PRODUCAO) e OS (SERVICO) a partir dos itens do PED.",
        href="/producao",
        modo="HOMOLOGAVEL",
        modulo="M03",
        regra="Produção só após crédito OK ou adiantamento baixado. MOV MP↓ → sobra → PA↑.",
    ),
    Etapa(
        id="estoque",
        ordem=5,
        codigo="E5",
        label="Estoque",
        titulo="5. Estoque",
        descricao="Saldos dual unit, reservas, ponto de pedido; entrada NF-e × OC.",
        href="/estoque",
        modo="OPERACIONAL",
        modulo="M04",
        regra="Saldo nunca editado na mão. Custo médio por (saldo_qtd, saldo_valor). Sem float binário.",
    ),
    Etapa(
        id="fiscal",
        ordem=6,
        codigo="E6",
        label="Fiscal",
        titulo="6. Fiscal operacional",
        descricao="NF-e/NFS-e via Focus (simulado em HML). Não fecha SPED.",
        href="/fiscal",
        modo="HOMOLOGAVEL",
        modulo="M05",
        regra="NF ≠ TIT (nascem juntos no faturamento, conceitos distintos). Contador fecha o fiscal.",
    ),
    Etapa(
        id="financeiro",
        ordem=7,
        codigo="E7",
        label="Financeiro",
        titulo="7. Financeiro",
        descricao="TIT → COB (banco) → BX. Contas a pagar de NF-e entrada.",
        href="/financeiro",
        modo="HOMOLOGAVEL",
        modulo="M06",
        regra="Naturezas gerenciais só grupos 1–5. LAI/9.xx proibidos. Baixa idempotente.",
    ),
    Etapa(
        id="entrega",
        ordem=8,
        codigo="E8",
        label="Entrega",
        titulo="8. Entrega",
        descricao="Romaneio ENT + confirmação do cliente.",
        href="/entregas",
        modo="HOMOLOGAVEL",
        modulo="M02",
        regra="Expedição registra volumes/rolos/caixas. Confirmação encerra o ciclo logístico.",
    ),
    Etapa(
        id="homologacao",
        ordem=9,
        codigo="HML",
        label="Homologação",
        titulo="9. Homologação UAT",
        descricao="Gates CA-01…CA-12 + scripts HT-* para GO/NO-GO.",
        href="/homologacao",
        modo="OPERACIONAL",
        modulo="HML",
        regra="Homologar o fluxo, não a tela. Evidência = códigos de negócio + correlation logs.",
    ),
)


def etapas_dict() -> list[dict]:
    return [asdict(e) for e in ETAPAS]


# Critérios de aceite SRS §15
CRITERIOS_ACEITE: tuple[dict, ...] = (
    {"id": "CA-01", "titulo": "ORC link → PED com snapshot travado", "etapa": "pedido", "script": "HT-COM-01"},
    {"id": "CA-02", "titulo": "Crédito OK ou adiantamento BX libera produção", "etapa": "pedido", "script": "HT-COM-02"},
    {"id": "CA-03", "titulo": "OP consome MP / gera sobra / entra PA", "etapa": "producao", "script": "HT-PRD-01"},
    {"id": "CA-04", "titulo": "NF Focus idempotente + nascem TIT/COB", "etapa": "fiscal", "script": "HT-FAT-01"},
    {"id": "CA-05", "titulo": "BX sem duplicidade (webhook/extrato)", "etapa": "financeiro", "script": "HT-FAT-02"},
    {"id": "CA-06", "titulo": "ENT + confirmação cliente", "etapa": "entrega", "script": "HT-FAT-03"},
    {"id": "CA-07", "titulo": "DEV estorno ponta a ponta (lab)", "etapa": "fiscal", "script": "HT-POS-01"},
    {"id": "CA-08", "titulo": "Isolamento multi-empresa (empresa_id)", "etapa": "plataforma", "script": "HT-PLT-01"},
    {"id": "CA-09", "titulo": "Natureza LAI/9.xx rejeitada", "etapa": "financeiro", "script": "HT-GER-01"},
    {"id": "CA-10", "titulo": "Backup/restore HML", "etapa": "plataforma", "script": "HT-NFR-01"},
    {"id": "CA-11", "titulo": "Decimal HALF-UP + sem float dinheiro", "etapa": "orcamento", "script": "HT-NFR-02"},
    {"id": "CA-12", "titulo": "SoD — pares incompatíveis bloqueados", "etapa": "plataforma", "script": "HT-PLT-02"},
)
