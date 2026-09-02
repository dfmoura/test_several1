<?php

namespace Tests\Unit;

use App\Support\ContornoSvgSanitizer;
use PHPUnit\Framework\TestCase;

class ContornoSvgSanitizerTest extends TestCase
{
    public function test_aceita_path_simples(): void
    {
        $out = (new ContornoSvgSanitizer)->sanitize('<path d="M0 0 L10 10"/>');
        $this->assertNotNull($out);
        $this->assertStringContainsString('<svg', strtolower($out));
        $this->assertStringContainsString('<path', strtolower($out));
    }

    public function test_rejeita_script(): void
    {
        $out = (new ContornoSvgSanitizer)->sanitize('<svg><script>alert(1)</script></svg>');
        $this->assertNull($out);
    }

    public function test_rejeita_event_handler(): void
    {
        $out = (new ContornoSvgSanitizer)->sanitize('<svg onload="alert(1)"><rect width="10" height="10"/></svg>');
        $this->assertNull($out);
    }

    public function test_vazio_retorna_null(): void
    {
        $san = new ContornoSvgSanitizer;
        $this->assertNull($san->sanitize(null));
        $this->assertNull($san->sanitize('   '));
    }

    public function test_normaliza_svg_corel_remove_dimensoes_e_preserva_viewbox(): void
    {
        $corel = file_get_contents(__DIR__.'/../../resources/data/orcamento/fixtures/faca_corel_sample.svg');
        $this->assertNotFalse($corel);

        $out = (new ContornoSvgSanitizer)->sanitize($corel);
        $this->assertNotNull($out);
        $this->assertStringContainsString('viewBox="0 0 2100000 2970000"', $out);
        $this->assertStringNotContainsString('width=', strtolower($out));
        $this->assertStringNotContainsString('height=', strtolower($out));
        $this->assertStringContainsString('preserveAspectRatio="xMidYMid meet"', $out);
        $this->assertStringContainsString('<path', strtolower($out));
    }

    public function test_preserva_marcador_cols_completo(): void
    {
        $raw = '<svg data-faca-cols="completo" viewBox="0 0 10 20" width="10mm" height="20mm"><path d="M0 0 L10 20"/></svg>';
        $out = (new ContornoSvgSanitizer)->sanitize($raw);
        $this->assertNotNull($out);
        $this->assertStringContainsString('data-faca-cols="completo"', $out);
        $this->assertStringContainsString('viewBox="0 0 10 20"', $out);
        $this->assertStringNotContainsString('width=', strtolower($out));
    }
}
