"""Extrai strings de API dos bundles Angular."""
from __future__ import annotations

import re

import httpx

BASE = "https://cnetmobile.estaleiro.serpro.gov.br"


def main() -> None:
    html = httpx.get(f"{BASE}/comprasnet-web/public/compras", timeout=60).text
    scripts = re.findall(r'src="([^"]+\.js)"', html)
    all_strings: set[str] = set()
    for s in scripts:
        url = s if s.startswith("http") else f"{BASE}/{s.lstrip('/')}"
        js = httpx.get(url, timeout=60).text
        for m in re.findall(r'"(/v1/[^"]{3,120})"', js):
            all_strings.add(m)
        for m in re.findall(r"'(/v1/[^']{3,120})'", js):
            all_strings.add(m)
        for m in re.findall(r'"(compras[^"]{3,120})"', js):
            if "/" in m:
                all_strings.add(m)
    for s in sorted(all_strings):
        if any(k in s for k in ("compra", "pncp", "public", "pesquis", "captcha", "cabecalho")):
            print(s)


if __name__ == "__main__":
    main()
