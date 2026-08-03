"""RBAC por perfil (PER) — alinhado a ORGANIZACAO_USUARIOS_PERFIS_ACESSO + M11.

Modelo deliberado (Fase 1):
  • Um usuário → um PERFIL (Role). Permissões nunca ficam soltas no USR.
  • Matriz PER × ação em código (catalogo versionável, fácil de auditar).
  • ADMIN tem tudo; demais perfis recebem o mínimo da função (least privilege).
  • SoD: pares incompatíveis bloqueados se no futuro houver multi-perfil;
    com perfil único, cada PER já nasce segregado internamente.
  • Não altera jornadas ORC→PED→…→BX: só barra quem não deveria operar.
"""

from __future__ import annotations

from typing import Iterable

from app.models import Role

# ---------------------------------------------------------------------------
# Catálogo de permissões (códigos estáveis — API + UI)
# ---------------------------------------------------------------------------

# Plataforma
PERM_USUARIOS = "usuarios.gerir"
PERM_PARAMETROS = "parametros.gerir"
PERM_HOMOLOGACAO = "homologacao.gerir"
PERM_AUDITORIA = "auditoria.ler"

# Cadastros
PERM_PARCEIRO_LER = "parceiro.ler"
PERM_PARCEIRO_COMERCIAL_CLIENTE = "parceiro.comercial.cliente.write"
PERM_PARCEIRO_COMERCIAL_FORNEC = "parceiro.comercial.fornecedor.write"
PERM_PARCEIRO_FISCAL = "parceiro.fiscal.write"
PERM_PARCEIRO_BANCARIO = "parceiro.bancario.write"
PERM_CREDITO = "parceiro.credito.write"

PERM_PRODUTO_LER = "produto.ler"
PERM_PRODUTO_WRITE = "produto.write"
PERM_PRODUTO_FISCAL = "produto.fiscal.write"
PERM_CUSTOS_LER = "produto.custos.ler"

# Comercial / pedido
PERM_ORC_LER = "orcamento.ler"
PERM_ORC_WRITE = "orcamento.write"
PERM_PEDIDO_LER = "pedido.ler"
PERM_PEDIDO_WRITE = "pedido.write"
PERM_PEDIDO_LIBERAR = "pedido.liberar"  # crédito / sinal (financeiro)

# Produção / estoque / entrega
PERM_PROD_LER = "producao.ler"
PERM_PROD_WRITE = "producao.write"
PERM_ESTOQUE_LER = "estoque.ler"
PERM_ESTOQUE_MOV = "estoque.movimentar"
PERM_ENTREGA_LER = "entrega.ler"
PERM_ENTREGA_WRITE = "entrega.write"

# Compras / NF entrada
PERM_COMPRAS_LER = "compras.ler"
PERM_COMPRAS_WRITE = "compras.write"
PERM_NFE_ENTRADA = "nfe.entrada.write"

# Fiscal / financeiro
PERM_FISCAL_LER = "fiscal.ler"
PERM_FISCAL_EMITIR = "fiscal.emitir"
PERM_FIN_LER = "financeiro.ler"
PERM_FIN_WRITE = "financeiro.write"
PERM_PAGAMENTO_LIBERAR = "pagamento.liberar"

PERM_RELATORIOS = "relatorios.ler"

ALL_PERMS: frozenset[str] = frozenset(
    {
        PERM_USUARIOS,
        PERM_PARAMETROS,
        PERM_HOMOLOGACAO,
        PERM_AUDITORIA,
        PERM_PARCEIRO_LER,
        PERM_PARCEIRO_COMERCIAL_CLIENTE,
        PERM_PARCEIRO_COMERCIAL_FORNEC,
        PERM_PARCEIRO_FISCAL,
        PERM_PARCEIRO_BANCARIO,
        PERM_CREDITO,
        PERM_PRODUTO_LER,
        PERM_PRODUTO_WRITE,
        PERM_PRODUTO_FISCAL,
        PERM_CUSTOS_LER,
        PERM_ORC_LER,
        PERM_ORC_WRITE,
        PERM_PEDIDO_LER,
        PERM_PEDIDO_WRITE,
        PERM_PEDIDO_LIBERAR,
        PERM_PROD_LER,
        PERM_PROD_WRITE,
        PERM_ESTOQUE_LER,
        PERM_ESTOQUE_MOV,
        PERM_ENTREGA_LER,
        PERM_ENTREGA_WRITE,
        PERM_COMPRAS_LER,
        PERM_COMPRAS_WRITE,
        PERM_NFE_ENTRADA,
        PERM_FISCAL_LER,
        PERM_FISCAL_EMITIR,
        PERM_FIN_LER,
        PERM_FIN_WRITE,
        PERM_PAGAMENTO_LIBERAR,
        PERM_RELATORIOS,
    }
)

# Leitura ampla (comum a quem opera ou consulta)
_L_BASE = {
    PERM_PARCEIRO_LER,
    PERM_PRODUTO_LER,
    PERM_ORC_LER,
    PERM_PEDIDO_LER,
    PERM_PROD_LER,
    PERM_ESTOQUE_LER,
    PERM_ENTREGA_LER,
    PERM_COMPRAS_LER,
    PERM_FISCAL_LER,
    PERM_FIN_LER,
    PERM_RELATORIOS,
    PERM_AUDITORIA,
}

# Matriz PER × permissões (estudo §3). ADMIN = ALL via código.
ROLE_PERMISSIONS: dict[Role, frozenset[str]] = {
    Role.ADMIN: ALL_PERMS,
    Role.FISCAL: frozenset(
        _L_BASE
        | {
            PERM_PARCEIRO_FISCAL,
            PERM_PRODUTO_FISCAL,
            PERM_PRODUTO_WRITE,  # cadastro fiscal de produto
            PERM_CUSTOS_LER,
            PERM_FISCAL_EMITIR,
            PERM_NFE_ENTRADA,  # manifestação / leitura operacional de entrada
        }
    ),
    Role.FINANCEIRO: frozenset(
        _L_BASE
        | {
            PERM_PARCEIRO_BANCARIO,
            PERM_CREDITO,
            PERM_PEDIDO_LIBERAR,
            PERM_CUSTOS_LER,
            PERM_FIN_WRITE,
            PERM_PAGAMENTO_LIBERAR,
        }
    ),
    Role.COMERCIAL: frozenset(
        {
            PERM_PARCEIRO_LER,
            PERM_PARCEIRO_COMERCIAL_CLIENTE,
            PERM_PRODUTO_LER,
            PERM_ORC_LER,
            PERM_ORC_WRITE,
            PERM_PEDIDO_LER,
            PERM_PEDIDO_WRITE,
            PERM_ESTOQUE_LER,
            PERM_ENTREGA_LER,
            PERM_FISCAL_LER,
            PERM_FIN_LER,
            PERM_RELATORIOS,
            PERM_AUDITORIA,
        }
    ),
    Role.PRODUCAO: frozenset(
        {
            PERM_PARCEIRO_LER,
            PERM_PRODUTO_LER,
            PERM_PEDIDO_LER,
            PERM_PROD_LER,
            PERM_PROD_WRITE,
            PERM_ESTOQUE_LER,
            PERM_ESTOQUE_MOV,
            PERM_ENTREGA_LER,
            PERM_ENTREGA_WRITE,  # expedição acomodada no início (estudo §2)
            PERM_RELATORIOS,
        }
    ),
    Role.COMPRAS: frozenset(
        {
            PERM_PARCEIRO_LER,
            PERM_PARCEIRO_COMERCIAL_FORNEC,
            PERM_PRODUTO_LER,
            PERM_PRODUTO_WRITE,
            PERM_CUSTOS_LER,
            PERM_ESTOQUE_LER,
            PERM_ESTOQUE_MOV,
            PERM_COMPRAS_LER,
            PERM_COMPRAS_WRITE,
            PERM_NFE_ENTRADA,
            PERM_FISCAL_LER,
            PERM_RELATORIOS,
        }
    ),
    Role.EXPEDICAO: frozenset(
        {
            PERM_PARCEIRO_LER,
            PERM_PEDIDO_LER,
            PERM_ESTOQUE_LER,
            PERM_ENTREGA_LER,
            PERM_ENTREGA_WRITE,
            PERM_RELATORIOS,
        }
    ),
    Role.CONSULTA: frozenset(_L_BASE),
}

# Pares SoD (estudo §4) — perfis que NÃO devem ser acumulados na mesma pessoa
SOD_INCOMPATIBLE: frozenset[frozenset[Role]] = frozenset(
    {
        frozenset({Role.ADMIN, Role.FINANCEIRO}),
        frozenset({Role.ADMIN, Role.FISCAL}),
        frozenset({Role.COMERCIAL, Role.FINANCEIRO}),  # pedido × crédito
        frozenset({Role.COMPRAS, Role.FINANCEIRO}),  # fornecedor × pagamento (aprox.)
    }
)

ROLE_LABELS: dict[Role, str] = {
    Role.ADMIN: "Administrador (parametrização — não usar na rotina)",
    Role.FISCAL: "Fiscal",
    Role.FINANCEIRO: "Financeiro",
    Role.COMERCIAL: "Comercial",
    Role.PRODUCAO: "Produção",
    Role.COMPRAS: "Compras",
    Role.EXPEDICAO: "Expedição",
    Role.CONSULTA: "Consulta (somente leitura)",
}

# Mapa de rotas UI → permissão mínima de leitura/entrada
NAV_PERMISSIONS: dict[str, str] = {
    "/": PERM_RELATORIOS,  # painel liberado a todos com algum perfil
    "/jornada": PERM_RELATORIOS,
    "/parceiros": PERM_PARCEIRO_LER,
    "/produtos": PERM_PRODUTO_LER,
    "/orcamentos": PERM_ORC_LER,
    "/pedidos": PERM_PEDIDO_LER,
    "/producao": PERM_PROD_LER,
    "/estoque": PERM_ESTOQUE_LER,
    "/compras": PERM_COMPRAS_LER,
    "/nfe": PERM_COMPRAS_LER,  # leitura XML; escrita exige nfe.entrada.write no backend
    "/fiscal": PERM_FISCAL_LER,
    "/financeiro": PERM_FIN_LER,
    "/entrega": PERM_ENTREGA_LER,
    "/empresas": PERM_RELATORIOS,
    "/naturezas": PERM_FIN_LER,
    "/patrimonio": PERM_RELATORIOS,
    "/devolucoes": PERM_FISCAL_LER,
    "/homologacao": PERM_HOMOLOGACAO,
    "/usuarios": PERM_USUARIOS,
}


def permissions_for_role(role: Role | str) -> frozenset[str]:
    if isinstance(role, str):
        role = Role(role)
    if role == Role.ADMIN:
        return ALL_PERMS
    return ROLE_PERMISSIONS.get(role, frozenset())


def user_has_perm(role: Role | str, *needed: str) -> bool:
    """True se o perfil possui TODAS as permissões pedidas."""
    have = permissions_for_role(role)
    return all(p in have for p in needed)


def user_has_any(role: Role | str, *needed: str) -> bool:
    have = permissions_for_role(role)
    return any(p in have for p in needed)


def assert_sod(roles: Iterable[Role]) -> str | None:
    """Retorna mensagem de erro se o conjunto de perfis violar SoD; senão None."""
    rs = {r if isinstance(r, Role) else Role(r) for r in roles}
    if len(rs) < 2:
        return None
    for pair in SOD_INCOMPATIBLE:
        if pair.issubset(rs):
            nomes = " × ".join(sorted(r.value for r in pair))
            return f"Segregação de funções: perfis incompatíveis ({nomes})"
    return None


def rbac_manifest() -> dict:
    """Payload para /meta/rbac — transparência em homologação."""
    return {
        "modelo": "RBAC_POR_PERFIL",
        "principio": "Permissões só via PER; usuário não recebe perm avulsa",
        "perfis": [
            {
                "codigo": r.value,
                "label": ROLE_LABELS[r],
                "permissoes": sorted(permissions_for_role(r)),
            }
            for r in Role
        ],
        "sod": [
            sorted(p.value for p in pair) for pair in SOD_INCOMPATIBLE
        ],
        "catalogo": sorted(ALL_PERMS),
    }
