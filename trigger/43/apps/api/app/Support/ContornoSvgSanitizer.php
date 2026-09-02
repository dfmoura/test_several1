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

        $svg = $this->stripEnvelope(trim($raw));
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

        return $this->normalizeRootSvg($svg);
    }

    private function stripEnvelope(string $raw): string
    {
        $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw) ?? $raw;
        $raw = preg_replace('/<\?xml[^?]*\?>\s*/i', '', $raw) ?? $raw;
        $raw = preg_replace('/<!DOCTYPE[^>]*>\s*/i', '', $raw) ?? $raw;

        return trim($raw);
    }

    /** Dimensões fixas (mm/px) no `<svg>` raiz atrapalham escala responsiva — viewBox governa proporção. */
    private function normalizeRootSvg(string $svg): string
    {
        $trimmed = ltrim($svg);
        if (! str_starts_with(strtolower($trimmed), '<svg')) {
            return $svg;
        }

        $normalized = preg_replace_callback(
            '/^(\s*<svg\b)([^>]*)(>)/is',
            function (array $m): string {
                $attrs = preg_replace('/\s(width|height)\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $m[2]) ?? $m[2];
                $tag = $m[1].$attrs.$m[3];
                if (! preg_match('/preserveAspectRatio\s*=/i', $tag)) {
                    $tag = preg_replace('/^(\s*<svg\b)/i', '$1 preserveAspectRatio="xMidYMid meet"', $tag) ?? $tag;
                }
                if (! preg_match('/xmlns\s*=/i', $tag)) {
                    $tag = preg_replace('/^(\s*<svg\b)/i', '$1 xmlns="http://www.w3.org/2000/svg"', $tag) ?? $tag;
                }
                // Preserva data-faca-cols="completo" (SVG já traz todas as vias).

                return $tag;
            },
            $svg,
            1
        );

        return trim($normalized ?? $svg);
    }
}
