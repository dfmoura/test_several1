<?php

namespace Tests\Unit;

use App\Http\Qr;
use PHPUnit\Framework\TestCase;

class QrTest extends TestCase
{
    public function test_svg_retorna_markup_inline_nao_data_uri(): void
    {
        $svg = Qr::svg('00020126BR.GOV.BCB.PIX.LOCALTEST54010.006304FAKE');

        $this->assertStringStartsWith('<svg', $svg);
        $this->assertStringNotContainsString('data:image/svg+xml', $svg);
        $this->assertStringContainsString('</svg>', $svg);
    }
}
