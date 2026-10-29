<?php

namespace Tests\Unit;

use App\Domain\Demanda\PropostaEtapas;
use App\Domain\RegraNegocio;
use PHPUnit\Framework\TestCase;

class PropostaEtapasTest extends TestCase
{
    public function test_ignora_linhas_vazias_e_numera(): void
    {
        $etapas = PropostaEtapas::normalizar([
            ['titulo' => '', 'resultado' => '', 'aceite' => ''],
            ['titulo' => 'Pagamento', 'resultado' => 'Pix no posto', 'aceite' => 'Cobrança ok'],
            ['titulo' => 'App Android', 'resultado' => '', 'aceite' => ''],
        ]);

        $this->assertCount(2, $etapas);
        $this->assertSame(1, $etapas[0]['ordem']);
        $this->assertSame('Pagamento', $etapas[0]['titulo']);
        $this->assertSame(2, $etapas[1]['ordem']);
    }

    public function test_recusa_titulo_ausente_em_linha_parcial(): void
    {
        $this->expectException(RegraNegocio::class);
        PropostaEtapas::normalizar([
            ['titulo' => '', 'resultado' => 'Algo', 'aceite' => ''],
        ]);
    }

    public function test_texto_marco(): void
    {
        $texto = PropostaEtapas::textoMarco([
            ['ordem' => 1, 'titulo' => 'Fundação'],
            ['ordem' => 2, 'titulo' => 'Entrega'],
        ]);
        $this->assertSame('Plano de entrega: 1. Fundação · 2. Entrega', $texto);
    }
}
