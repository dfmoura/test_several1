<?php

namespace Tests\Unit;

use App\Services\Cadastros\ProdutoGrupoService;
use App\Services\Cadastros\ProdutoNfeItemSugestor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProdutoNfeItemSugestorTest extends TestCase
{
    use RefreshDatabase;

    private ProdutoNfeItemSugestor $sugestor;

    protected function setUp(): void
    {
        parent::setUp();
        app(ProdutoGrupoService::class)->seedCatalog();
        $this->sugestor = app(ProdutoNfeItemSugestor::class);
    }

    public function test_avery_exact_sugere_papel_m2_e_programa(): void
    {
        $s = $this->sugestor->sugerir([
            'c_prod' => 'AAS029-EX4',
            'x_prod' => 'FASSON ECOPRINT/S2045N/60G - EXACT 1000',
            'ncm' => '48114190',
            'u_com' => 'M2',
            'origem' => 0,
        ]);

        $this->assertSame('MP', $s['familia']);
        $this->assertSame('MP-PAP', $s['grupo']);
        $this->assertSame('M2', $s['unidade_comercial']);
        $this->assertSame('M2', $s['unidade_interna']);
        $this->assertSame('EXACT 1000', $s['programa_compra']);
        $this->assertTrue($s['depara_recomendado']);
        $this->assertSame('ALTA', $s['confianca']);
    }

    public function test_ncm_filme_bopp(): void
    {
        $s = $this->sugestor->sugerir([
            'c_prod' => '301A4G592N',
            'x_prod' => 'COLACRIL_BOPP BCO FOSCOTC 60M/ADC1000/GL52M',
            'ncm' => '39199010',
            'u_com' => 'M2',
        ]);

        $this->assertSame('MP-FLM', $s['grupo']);
        $this->assertTrue($s['depara_recomendado']);
    }

    public function test_ribbon_por_palavra_chave(): void
    {
        $s = $this->sugestor->sugerir([
            'c_prod' => 'Z11074108',
            'x_prod' => 'AXR1 ZEBRA 110MM X 300M',
            'ncm' => '96121000',
            'u_com' => 'UN',
        ]);

        $this->assertSame('REV', $s['familia']);
        $this->assertSame('REV-RIB', $s['grupo']);
    }

    public function test_cprod_retorno_nao_recomenda_depara(): void
    {
        $s = $this->sugestor->sugerir([
            'c_prod' => 'RETORNO',
            'x_prod' => 'FACA 135X80MM SANTA LUCIA',
            'ncm' => '84439199',
            'u_com' => 'PC',
        ]);

        $this->assertSame('FAC', $s['grupo']);
        $this->assertTrue($s['cprod_generico']);
        $this->assertFalse($s['depara_recomendado']);
        $this->assertSame('UN', $s['unidade_comercial']); // PC → UN
        $this->assertNotEmpty($s['warnings']);
    }
}
