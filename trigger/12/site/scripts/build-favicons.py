#!/usr/bin/env python3
"""Gera favicons PNG/ICO compatíveis com Firefox (sem SVG no HTML)."""
from pathlib import Path
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "assets" / "img"
DENSITY = "384"


def rasterize(svg: Path, png: Path, size: int) -> None:
    subprocess.run(
        [
            "convert",
            "-background",
            "none",
            "-density",
            DENSITY,
            str(svg),
            "-resize",
            f"{size}x{size}",
            str(png),
        ],
        check=True,
    )


def save_ico(png16: Path, png32: Path, out: Path) -> None:
    im16 = Image.open(png16).convert("RGBA")
    im32 = Image.open(png32).convert("RGBA")
    im32.save(out, format="ICO", sizes=[(16, 16), (32, 32)], append_images=[im16])


def build_variant(svg_name: str, variant: str) -> tuple[Path, Path]:
    svg = IMG / svg_name
    png16 = IMG / f"favicon-16-{variant}.png"
    png32 = IMG / f"favicon-32-{variant}.png"
    png48 = IMG / f"favicon-48-{variant}.png"
    for size, dest in ((16, png16), (32, png32), (48, png48)):
        rasterize(svg, dest, size)
    return png16, png32


def build_estoque_sankhya() -> None:
    src = IMG / "logo-estoque-sankhya.png"
    if not src.exists():
        print("Pule estoque-sankhya: falta", src)
        return
    png16 = IMG / "favicon-estoque-sankhya-16.png"
    png32 = IMG / "favicon-estoque-sankhya-32.png"
    png48 = IMG / "favicon-estoque-sankhya-48.png"
    apple = IMG / "apple-touch-icon-estoque-sankhya.png"
    for size, dest in ((16, png16), (32, png32), (48, png48), (180, apple)):
        im = Image.open(src).convert("RGBA")
        im.resize((size, size), Image.Resampling.LANCZOS).save(dest)
    ico = ROOT / "estoque-sankhya" / "favicon.ico"
    save_ico(png16, png32, ico)


def build_gestao_condominial() -> None:
    src = IMG / "logo-gestao-condominial.png"
    if not src.exists():
        print("Pule gestao-condominial: falta", src)
        return
    png16 = IMG / "favicon-gestao-condominial-16.png"
    png32 = IMG / "favicon-gestao-condominial-32.png"
    png48 = IMG / "favicon-gestao-condominial-48.png"
    apple = IMG / "apple-touch-icon-gestao-condominial.png"
    for size, dest in ((16, png16), (32, png32), (48, png48), (180, apple)):
        im = Image.open(src).convert("RGBA")
        im.resize((size, size), Image.Resampling.LANCZOS).save(dest)

    ico = ROOT / "gestao-condominial" / "favicon.ico"
    save_ico(png16, png32, ico)


def main() -> None:
    light16, light32 = build_variant("favicon-light.svg", "light")
    dark16, dark32 = build_variant("favicon-dark.svg", "dark")

    save_ico(light16, light32, ROOT / "favicon.ico")
    save_ico(dark16, dark32, ROOT / "favicon-dark.ico")
    save_ico(light16, light32, IMG / "favicon-light.ico")
    save_ico(dark16, dark32, IMG / "favicon-dark.ico")
    save_ico(light16, light32, IMG / "favicon.ico")

    build_estoque_sankhya()
    build_gestao_condominial()

    print("Favicons gerados em", ROOT)


if __name__ == "__main__":
    main()
