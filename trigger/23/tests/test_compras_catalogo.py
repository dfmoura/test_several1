"""Testes do enriquecimento on-demand CATMAT/CATSER."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from app.compras.coletor_catalogo import enrich_catalogo


def test_enrich_catalogo_respeita_limite_e_resume_falhas():
    codigos = [(i, "M") for i in range(1, 21)]
    logs: list[str] = []

    def fake_coletar(codigo, **kwargs):
        if codigo <= 3:
            return {
                "tipo_item": "Material",
                "codigo_item_catalogo": codigo,
                "descricao": f"item {codigo}",
            }
        raise RuntimeError(
            'CATMAT x HTTP 429: { "statusCode": 429, "message": '
            '"Rate limit is exceeded. Try again in 1 seconds." }'
        )

    with (
        patch("app.compras.coletor_catalogo.COMPRAS_ENRICH_CATALOGO_MAX", 10),
        patch("app.compras.coletor_catalogo.coletar_item_catalogo", side_effect=fake_coletar),
        patch("app.compras.coletor_catalogo.ComprasGovClient") as client_cls,
        patch("app.compras.coletor_catalogo.time.sleep"),
    ):
        client_cls.return_value.__enter__.return_value = MagicMock()
        out = enrich_catalogo(codigos, on_log=logs.append)

    assert len(out) == 3
    assert any("limitado a 10 de 20" in m for m in logs)
    assert any("Enriquecimento catálogo: 3" in m for m in logs)
    assert any("por rate-limit 429" in m for m in logs)
    # Não spam: no máximo ~5 avisos individuais + 1 de omissão
    avisos = [m for m in logs if m.startswith("  ⚠ Catálogo")]
    assert len(avisos) <= 6
