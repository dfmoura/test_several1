<?php

namespace App\Services\Relatorio;

/**
 * SVG do polígono/formato da faca — espelha FacaShapeIcon do frontend (ORC).
 */
class FacaShapeSvg
{
    public function kind(?string $formato): string
    {
        $f = $this->normalize($formato);
        if ($f === '') {
            return 'DESCONHECIDO';
        }
        if (str_starts_with($f, 'REDOND')) {
            return 'REDONDA';
        }
        if (str_starts_with($f, 'OVAL')) {
            return 'OVAL';
        }
        if (str_contains($f, 'SERRILH')) {
            return 'SERRILHA';
        }
        if (str_contains($f, 'PICOTE')) {
            return 'PICOTE';
        }
        if (str_contains($f, 'GONDOLA')) {
            return 'GONDOLA';
        }
        if (str_contains($f, 'LACRE')) {
            return 'LACRE';
        }
        if (str_contains($f, 'TAG')) {
            return 'TAG';
        }
        if (str_contains($f, 'GAP')) {
            return 'GAP';
        }
        if (str_contains($f, 'CORTE')) {
            return 'CORTE';
        }
        if (str_contains($f, 'DESENH')) {
            return 'DESENHADA';
        }
        if (str_contains($f, 'ESPECIAL') || str_contains($f, 'ESP')) {
            return 'ESPECIAL';
        }
        if (str_starts_with($f, 'RETA')) {
            return 'RETA';
        }

        return 'ESPECIAL';
    }

    /**
     * @param  array<string, mixed>  $faca
     */
    public function renderHtml(array $faca, int $size = 36): string
    {
        $formato = (string) ($faca['formato'] ?? $faca['faca'] ?? '');
        $kind = $this->kind($formato);
        $aspect = $this->aspect($faca);
        $a = $this->clampAspect($aspect);
        $w = 40;
        $h = 40;
        $stroke = '#1a3568';
        $fill = '#1a3568';

        $rw = min(30.0, 18.0 * sqrt($a));
        $rh = min(28.0, $rw / $a);
        $rx = ($w - $rw) / 2;
        $ry = ($h - $rh) / 2;

        $body = match ($kind) {
            'REDONDA' => '<circle cx="20" cy="20" r="12" fill="'.$fill.'" fill-opacity="0.12" stroke="'.$stroke.'" stroke-width="1.75"/>',
            'OVAL' => '<ellipse cx="20" cy="20" rx="14" ry="9" fill="'.$fill.'" fill-opacity="0.12" stroke="'.$stroke.'" stroke-width="1.75"/>',
            'SERRILHA' => '<path d="M8 12 L12 8 L16 12 L20 8 L24 12 L28 8 L32 12 V30 H8 Z" fill="'.$fill.'" fill-opacity="0.12" stroke="'.$stroke.'" stroke-width="1.5" stroke-linejoin="round"/>',
            'PICOTE' => '<rect x="'.$rx.'" y="'.$ry.'" width="'.$rw.'" height="'.$rh.'" rx="2" fill="'.$fill.'" fill-opacity="0.1" stroke="'.$stroke.'" stroke-width="1.5"/>'
                .'<line x1="'.$rx.'" y1="20" x2="'.($rx + $rw).'" y2="20" stroke="'.$stroke.'" stroke-width="1.25" stroke-dasharray="2 2.5"/>',
            'GONDOLA' => '<path d="M10 10 H30 V22 L26 30 H14 L10 22 Z" fill="'.$fill.'" fill-opacity="0.12" stroke="'.$stroke.'" stroke-width="1.6" stroke-linejoin="round"/>',
            'LACRE' => '<circle cx="20" cy="18" r="10" fill="'.$fill.'" fill-opacity="0.12" stroke="'.$stroke.'" stroke-width="1.6"/>'
                .'<path d="M14 26 L16 34 L20 30 L24 34 L26 26" fill="'.$fill.'" fill-opacity="0.12" stroke="'.$stroke.'" stroke-width="1.4" stroke-linejoin="round"/>',
            'TAG' => '<path d="M8 14 L22 8 L32 20 L18 30 Z" fill="'.$fill.'" fill-opacity="0.12" stroke="'.$stroke.'" stroke-width="1.6" stroke-linejoin="round"/>',
            'GAP' => '<rect x="7" y="12" width="10" height="16" rx="1.5" fill="'.$fill.'" fill-opacity="0.12" stroke="'.$stroke.'" stroke-width="1.4"/>'
                .'<rect x="23" y="12" width="10" height="16" rx="1.5" fill="'.$fill.'" fill-opacity="0.12" stroke="'.$stroke.'" stroke-width="1.4"/>',
            'CORTE' => '<line x1="8" y1="20" x2="32" y2="20" stroke="'.$stroke.'" stroke-width="1.75" stroke-dasharray="3 2"/>'
                .'<path d="M28 16 L34 20 L28 24" fill="none" stroke="'.$stroke.'" stroke-width="1.5" stroke-linejoin="round"/>',
            'DESENHADA' => '<path d="M12 22 C10 14, 16 8, 22 10 C28 12, 34 16, 30 24 C27 30, 18 32, 12 26 Z" fill="'.$fill.'" fill-opacity="0.12" stroke="'.$stroke.'" stroke-width="1.6" stroke-linejoin="round"/>',
            'ESPECIAL' => '<path d="M20 7 L28 13 L30 23 L22 31 L12 27 L10 16 Z" fill="'.$fill.'" fill-opacity="0.12" stroke="'.$stroke.'" stroke-width="1.6" stroke-linejoin="round"/>',
            default => '<rect x="'.$rx.'" y="'.$ry.'" width="'.$rw.'" height="'.$rh.'" rx="1.5" fill="'.$fill.'" fill-opacity="0.12" stroke="'.$stroke.'" stroke-width="1.75"/>',
        };

        $tip = htmlspecialchars($formato !== '' ? $formato : $kind, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        return '<svg xmlns="http://www.w3.org/2000/svg" width="'.$size.'" height="'.$size.'" viewBox="0 0 '.$w.' '.$h.'" role="img" aria-label="'.$tip.'">'
            .$body
            .'</svg>';
    }

    /**
     * @param  array<string, mixed>  $f
     */
    private function aspect(array $f): ?float
    {
        $tipo = strtolower((string) ($f['tamanho_tipo'] ?? ''));
        if ($tipo === 'diametro') {
            return 1.0;
        }
        $larg = (float) ($f['largura_faca'] ?? 0);
        $pux = (float) ($f['puxada'] ?? 0);
        if ($larg > 0 && $pux > 0) {
            return $larg / $pux;
        }

        return null;
    }

    private function clampAspect(?float $aspect): float
    {
        if ($aspect === null || ! is_finite($aspect) || $aspect <= 0) {
            return 1.6;
        }

        return min(2.8, max(0.45, $aspect));
    }

    private function normalize(?string $formato): string
    {
        $f = (string) ($formato ?? '');
        if (class_exists(\Normalizer::class)) {
            $n = \Normalizer::normalize($f, \Normalizer::FORM_D);
            if (is_string($n)) {
                $f = $n;
            }
        }
        $f = preg_replace('/\p{Mn}/u', '', $f) ?? $f;

        return strtoupper(trim($f));
    }
}
