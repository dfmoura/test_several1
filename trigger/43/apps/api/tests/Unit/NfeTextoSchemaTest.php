<?php

namespace Tests\Unit;

use App\Services\Fiscal\NfeTextoSchema;
use PHPUnit\Framework\TestCase;

class NfeTextoSchemaTest extends TestCase
{
    public function test_travessao_das_informacoes_da_nota_vira_hifen(): void
    {
        $texto = NfeTextoSchema::texto('Q 10000 — 10 BOB · 1 CX');

        $this->assertSame('Q 10000 - 10 BOB · 1 CX', $texto);
        $this->assertStringNotContainsString("\u{2014}", $texto);
    }

    public function test_aspas_curvas_e_caractere_fora_do_schema_saem(): void
    {
        $texto = NfeTextoSchema::texto("“Nota”…");

        $this->assertSame('"Nota"...', $texto);
    }
}
