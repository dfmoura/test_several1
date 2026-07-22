import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_upsert_and_get_contact_profile(api_client: AsyncClient) -> None:
    headers = {"x-webhook-secret": "test-secret"}
    payload = {
        "name": "Ana",
        "relation": "esposa",
        "notes": "Prefere respostas curtas",
    }

    put = await api_client.put(
        "/contacts/5534999909660",
        json=payload,
        headers=headers,
    )
    assert put.status_code == 200
    body = put.json()
    assert body["phone"] == "5534999909660"
    assert body["relation"] == "esposa"

    get = await api_client.get("/contacts/5534999909660", headers=headers)
    assert get.status_code == 200
    assert get.json()["notes"] == "Prefere respostas curtas"

    listed = await api_client.get("/contacts", headers=headers)
    assert listed.status_code == 200
    phones = [item["phone"] for item in listed.json()]
    assert "5534999909660" in phones


@pytest.mark.asyncio
async def test_get_contact_not_found(api_client: AsyncClient) -> None:
    response = await api_client.get(
        "/contacts/5511000000000",
        headers={"x-webhook-secret": "test-secret"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_admin_page_and_meta(api_client: AsyncClient) -> None:
    meta = await api_client.get("/admin/meta")
    assert meta.status_code == 200
    body = meta.json()
    assert body["admin_ui_enabled"] is True
    assert "contact_kb_enabled" in body

    page = await api_client.get("/admin")
    assert page.status_code == 200
    assert "text/html" in page.headers["content-type"]
    assert "Contatos e leads" in page.text


@pytest.mark.asyncio
async def test_admin_disabled(
    api_client: AsyncClient,
    settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings.admin_ui_enabled = False
    monkeypatch.setattr("app.config.settings.get_settings", lambda: settings)
    monkeypatch.setattr("app.config.get_settings", lambda: settings)
    monkeypatch.setattr("app.api.routes.admin.get_settings", lambda: settings)

    response = await api_client.get("/admin")
    assert response.status_code == 404
