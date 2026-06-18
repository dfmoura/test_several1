"""Diagnóstico temporário — endpoints Compras.gov."""
from __future__ import annotations

import re

import httpx

BASE = "https://cnetmobile.estaleiro.serpro.gov.br"


def main() -> None:
    r = httpx.get(f"{BASE}/comprasnet-web/public/compras", timeout=60, follow_redirects=True)
    scripts = re.findall(r'src="([^"]+\.js)"', r.text)
    print("scripts", len(scripts))
    apis: set[str] = set()
    for s in scripts:
        url = s if s.startswith("http") else f"{BASE}/{s.lstrip('/')}"
        try:
            js = httpx.get(url, timeout=60).text
        except Exception as exc:
            print("skip", s, exc)
            continue
        found = re.findall(r"comprasnet-fase-externa/v1/[a-zA-Z0-9_/${}.-]+", js)
        apis.update(found)
    for a in sorted(apis):
        print(a)


if __name__ == "__main__":
    main()
