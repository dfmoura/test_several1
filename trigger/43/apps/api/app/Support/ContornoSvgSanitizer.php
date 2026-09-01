<?php

namespace App\Support;

/**
 * Sanitiza SVG colado/exportado (Corel, Illustrator…) para exibição segura no mapa.
 * Aceita documento SVG completo ou fragmento path/g.
 */
class ContornoSvgSanitizer
{
    public const MAX_BYTES = 32768;

    public function sanitize(?string $raw): ?string
    {
        if ($raw === null) {
            return null;
        }

        $svg = trim($raw);
        if ($svg === '') {
            return null;
        }

        if (strlen($svg) > self::MAX_BYTES) {
            return null;
        }

        $lower = strtolower($svg);
        foreach (['<script', 'javascript:', 'data:text/html', '<iframe', '<object', '<embed', '<foreignobject'] as $blocked) {
            if (str_contains($lower, $blocked)) {
                return null;
            }
        }

        if (! preg_match('/<(svg|path|g|polygon|polyline|circle|ellipse|rect|line)\b/i', $svg)) {
            return null;
        }

        $svg = preg_replace('/<!--.*?-->/s', '', $svg) ?? $svg;
        $svg = preg_replace('/<\/?(script|foreignObject|iframe|object|embed|image|use|style)[^>]*>/i', '', $svg) ?? $svg;
        if (preg_match('/\bon\w+\s*=/i', $svg)) {
            return null;
        }
        $svg = preg_replace('/\s(on\w+|xlink:href|href)\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $svg) ?? $svg;

        $svg = trim($svg);
        if ($svg === '') {
            return null;
        }

        if (! str_starts_with(strtolower(ltrim($svg)), '<svg')) {
            $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor">'.$svg.'</svg>';
        }

        return $svg;
    }
}
