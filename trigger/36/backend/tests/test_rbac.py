"""RBAC por perfil — matriz ORGANIZACAO_USUARIOS / M11 / CA-12."""

from __future__ import annotations

import pytest

from app.domain.rbac import (
    PERM_CREDITO,
    PERM_FIN_WRITE,
    PERM_FISCAL_EMITIR,
    PERM_ORC_WRITE,
    PERM_PEDIDO_LIBERAR,
    PERM_USUARIOS,
    assert_sod,
    permissions_for_role,
    rbac_manifest,
    user_has_perm,
)
from app.models import Role


def test_admin_has_all_critical():
    for p in (PERM_USUARIOS, PERM_ORC_WRITE, PERM_CREDITO, PERM_FISCAL_EMITIR, PERM_FIN_WRITE):
        assert user_has_perm(Role.ADMIN, p)


def test_comercial_orçamento_nao_credito():
    assert user_has_perm(Role.COMERCIAL, PERM_ORC_WRITE)
    assert not user_has_perm(Role.COMERCIAL, PERM_CREDITO)
    assert not user_has_perm(Role.COMERCIAL, PERM_PEDIDO_LIBERAR)
    assert not user_has_perm(Role.COMERCIAL, PERM_FIN_WRITE)


def test_financeiro_credito_nao_orcamento():
    assert user_has_perm(Role.FINANCEIRO, PERM_CREDITO)
    assert user_has_perm(Role.FINANCEIRO, PERM_PEDIDO_LIBERAR)
    assert user_has_perm(Role.FINANCEIRO, PERM_FIN_WRITE)
    assert not user_has_perm(Role.FINANCEIRO, PERM_ORC_WRITE)
    assert not user_has_perm(Role.FINANCEIRO, PERM_USUARIOS)


def test_consulta_somente_leitura():
    assert not user_has_perm(Role.CONSULTA, PERM_ORC_WRITE)
    assert not user_has_perm(Role.CONSULTA, PERM_FIN_WRITE)
    assert "orcamento.ler" in permissions_for_role(Role.CONSULTA)


def test_producao_sem_custos_nem_preco():
    perms = permissions_for_role(Role.PRODUCAO)
    assert "producao.write" in perms
    assert "produto.custos.ler" not in perms
    assert "orcamento.write" not in perms


def test_sod_admin_x_financeiro():
    msg = assert_sod([Role.ADMIN, Role.FINANCEIRO])
    assert msg is not None
    assert "incompatíveis" in msg


def test_sod_comercial_x_financeiro():
    assert assert_sod([Role.COMERCIAL, Role.FINANCEIRO]) is not None


def test_sod_ok_single_profile():
    assert assert_sod([Role.COMERCIAL]) is None


def test_manifest_tem_todos_perfis():
    m = rbac_manifest()
    codigos = {p["codigo"] for p in m["perfis"]}
    assert codigos == {r.value for r in Role}
    assert m["modelo"] == "RBAC_POR_PERFIL"
    assert "FISCAL" in codigos


@pytest.mark.parametrize(
    "role,perm,expected",
    [
        (Role.FISCAL, PERM_FISCAL_EMITIR, True),
        (Role.COMPRAS, "nfe.entrada.write", True),
        (Role.EXPEDICAO, "entrega.write", True),
        (Role.EXPEDICAO, PERM_FIN_WRITE, False),
    ],
)
def test_matriz_pontual(role, perm, expected):
    assert user_has_perm(role, perm) is expected
