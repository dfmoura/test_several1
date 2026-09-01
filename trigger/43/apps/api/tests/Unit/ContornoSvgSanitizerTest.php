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
}
