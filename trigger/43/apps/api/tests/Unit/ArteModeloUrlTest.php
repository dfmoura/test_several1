<?php

namespace Tests\Unit;

use App\Support\ArteModeloUrl;
use App\Support\ModelosComposicao;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ArteModeloUrlTest extends TestCase
{
    public function test_normaliza_http(): void
    {
        $this->assertSame(
            'https://cdn.exemplo.com/a.svg',
            ArteModeloUrl::normalize('  https://cdn.exemplo.com/a.svg  ')
        );
    }

    public function test_normaliza_ref_interna(): void
    {
        $ref = 'orc-arte:3/550e8400-e29b-41d4-a716-446655440000.svg';
        $this->assertSame($ref, ArteModeloUrl::normalize($ref));
        $parsed = ArteModeloUrl::parseInternal($ref);
        $this->assertSame(3, $parsed['empresa_id']);
        $this->assertSame('550e8400-e29b-41d4-a716-446655440000.svg', $parsed['arquivo']);
    }

    public function test_rejeita_javascript_e_data(): void
    {
        $this->assertNull(ArteModeloUrl::normalize('javascript:alert(1)'));
        $this->assertNull(ArteModeloUrl::normalize('data:image/svg+xml,<svg>'));
        $this->assertNull(ArteModeloUrl::normalize('orc-arte:../etc/passwd'));
    }

    public function test_composicao_preserva_arte_url(): void
    {
        $rows = ModelosComposicao::normalizeAndAssert([
            [
                'nome' => 'maçã',
                'percentual' => 100,
                'valor_arte' => 10,
                'arte_url' => 'https://cdn.exemplo.com/maca.svg',
            ],
        ], 1);

        $this->assertSame('https://cdn.exemplo.com/maca.svg', $rows[0]['arte_url']);
    }

    public function test_composicao_rejeita_arte_url_invalida(): void
    {
        $this->expectException(ValidationException::class);
        ModelosComposicao::normalizeAndAssert([
            [
                'nome' => 'x',
                'percentual' => 100,
                'arte_url' => 'javascript:alert(1)',
            ],
        ], 1);
    }
}
