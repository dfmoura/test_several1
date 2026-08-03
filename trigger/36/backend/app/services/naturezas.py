"""Catálogo de naturezas gerenciais (grupos 1–5) — NATUREZAS_GERENCIAIS_RECEITA_DESPESA."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import NaturezaGerencial

# Código hierárquico → descrição (aceitam lançamento = folhas)
NATUREZAS_OFICIAIS: list[tuple[str, str, int, bool]] = [
    ("1.01", "Receita operacional bruta", 1, False),
    ("1.01.01", "Venda produção própria (etiquetas PA)", 1, True),
    ("1.01.02", "Venda revenda (ribbon / material)", 1, True),
    ("1.01.03", "Serviços (rebobinação, acerto, SVC)", 1, True),
    ("1.01.04", "Ferramental / faca / clichê", 1, True),
    ("1.01.05", "Frete cobrado do cliente", 1, True),
    ("1.02", "Deduções da receita", 1, False),
    ("1.02.01", "Devoluções de venda", 1, True),
    ("1.02.02", "Descontos condicionais concedidos", 1, True),
    ("1.02.03", "Abatimentos / perdas comerciais", 1, True),
    ("1.03", "Receitas financeiras", 1, False),
    ("1.03.01", "Juros recebidos", 1, True),
    ("1.03.02", "Multas recebidas", 1, True),
    ("1.04", "Outras receitas", 1, False),
    ("1.04.01", "Venda de sucata / apara", 1, True),
    ("1.04.02", "Venda de ativo imobilizado", 1, True),
    ("2.01", "Material consumido (MP/EMB)", 2, True),
    ("2.02", "Serviço de terceiros (industrialização)", 2, True),
    ("2.03", "Frete sobre compras", 2, True),
    ("2.04", "Quebras / perdas de produção", 2, True),
    ("3.01", "Pessoal", 3, False),
    ("3.01.01", "Salários líquidos pagos", 3, True),
    ("3.01.05", "Comissões de vendedores", 3, True),
    ("3.02", "Encargos e impostos", 3, False),
    ("3.02.01", "DAS / impostos do Simples", 3, True),
    ("3.04", "Manutenção e operação", 3, False),
    ("3.04.01", "Manutenção de máquinas", 3, True),
    ("3.06", "Logística de saída", 3, False),
    ("3.06.01", "Frete de entrega (despesa)", 3, True),
    ("4.01", "Aquisição de máquinas / equipamentos", 4, True),
    ("4.02", "Móveis / informática", 4, True),
    ("4.03", "Veículos", 4, True),
    ("4.04", "Benfeitorias", 4, True),
    ("5.01", "Transferência entre contas", 5, True),
    ("5.03", "Aporte de sócio", 5, True),
    ("5.04", "Retirada de sócio / distribuição", 5, True),
]


def seed_naturezas(db: Session) -> int:
    """Insere catálogo oficial se vazio. Retorna quantidade inserida."""
    if db.query(NaturezaGerencial).count() > 0:
        return 0
    for codigo, descricao, grupo, aceita in NATUREZAS_OFICIAIS:
        db.add(
            NaturezaGerencial(
                codigo=codigo,
                descricao=descricao,
                grupo=grupo,
                aceita_lancamento=aceita,
                ativo=True,
            )
        )
    return len(NATUREZAS_OFICIAIS)


def natureza_valida(db: Session, codigo: str) -> bool:
    if not codigo or codigo.startswith("9"):
        return False
    n = db.query(NaturezaGerencial).filter(NaturezaGerencial.codigo == codigo).first()
    if n:
        return bool(n.ativo and n.aceita_lancamento)
    # permite folhas ainda não cadastradas nos grupos 1–5
    return codigo[0] in "12345" and not codigo.startswith("9")
