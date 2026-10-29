"""Health e casca operacional — Fase 0."""

from __future__ import annotations

from sqlalchemy import text


def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["checks"]["database"]["ok"] is True
    assert body["fase"] == "9"
    assert body.get("power_bi") is False
    assert body.get("analytics") == "nativo"


def test_index_serve_html(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Observatório Social Brasil" in r.text


def test_sqlite_wal(db):
    mode = db.execute(text("PRAGMA journal_mode")).scalar()
    assert str(mode).lower() == "wal"
