from __future__ import annotations

from pathlib import Path

PORTAS_PROIBIDAS_NO_LOCAL = ("8096", "5432", "8000", "80", "443")


def _servicos(texto: str) -> dict[str, dict]:
    servicos: dict[str, dict] = {}
    secao: str | None = None
    atual: str | None = None
    em_ports = False
    for linha in texto.splitlines():
        if linha and not linha.startswith(" ") and linha.endswith(":"):
            secao = linha.split(":", 1)[0]
            atual = None
            em_ports = False
            continue
        if secao != "services":
            continue
        if linha.startswith("  ") and not linha.startswith("    ") and linha.rstrip().endswith(":"):
            nome = linha.strip()[:-1]
            atual = nome
            servicos[atual] = {"ports": [], "profiles": []}
            em_ports = False
            continue
        if atual is None:
            continue
        if linha.startswith("    ") and not linha.startswith("      "):
            chave = linha.strip()
            em_ports = chave == "ports:"
            if chave.startswith("profiles:") and "[" in chave:
                miolo = chave.split("[", 1)[1].split("]", 1)[0]
                servicos[atual]["profiles"] = [
                    parte.strip().strip('"').strip("'")
                    for parte in miolo.split(",")
                    if parte.strip()
                ]
            continue
        if em_ports and linha.strip().startswith("- "):
            valor = linha.strip()[2:].strip().strip('"').strip("'")
            servicos[atual]["ports"].append(valor)
    return servicos


def test_compose_local_so_publica_8097():
    texto = Path("/app/docker-compose.yml").read_text(encoding="utf-8")
    servicos = _servicos(texto)
    assert set(servicos) == {"api", "worker", "db", "db_test", "caddy"}

    assert servicos["api"]["ports"] == ["8097:8097"]
    assert servicos["api"]["profiles"] == []
    assert servicos["worker"]["ports"] == []
    assert servicos["db"]["ports"] == []
    assert servicos["db_test"]["ports"] == []
    assert servicos["db_test"]["profiles"] == ["test"]
    assert servicos["caddy"]["profiles"] == ["https"]
    assert servicos["caddy"]["ports"] == ["80:80", "443:443"]

    for nome, spec in servicos.items():
        if "https" in spec["profiles"]:
            continue
        for porta in spec["ports"]:
            host = porta.split(":", 1)[0]
            assert host == "8097"
            for proibida in PORTAS_PROIBIDAS_NO_LOCAL:
                assert host != proibida
        if nome != "api":
            assert spec["ports"] == []


def test_repo_sem_atalho_fora_do_docker():
    raiz = Path("/repo")
    assert raiz.is_dir()
    assert not (raiz / "setup.sh").exists()
    assert not (raiz / "run.sh").exists()
    assert not (raiz / ".venv").exists()


def test_publicacao_e_backup_documentados():
    readme = Path("/repo/README.md").read_text(encoding="utf-8")
    assert "Publicar na AWS" in readme
    assert "02:10" in readme
    assert "05:10" in readme
    assert "Não reutilizar `licitacoes.osbrasiluberlandia.org`" in readme
    script = Path("/repo/db/backup/backup.sh").read_text(encoding="utf-8")
    assert "pg_dump -U postgres" in script
    assert "docker.sock" not in script
    assert "sleep 1800" in script
    restore = Path("/repo/db/backup/restore.sh").read_text(encoding="utf-8")
    assert "pg_restore -U postgres" in restore
    tela = Path("/repo/app/static/app.js").read_text(encoding="utf-8")
    assert "nenhuma UASG aderida — a coleta ainda não tem escopo" in tela
    assert "brasilapi" not in tela and "viacep" not in tela


def test_worker_nao_cita_api_externa():
    texto = Path("/app/app/worker.py").read_text(encoding="utf-8").lower()
    for host in ("compras.gov.br", "pncp.gov.br", "brasilapi", "viacep", "cnpj.ws"):
        assert host not in texto
