<?php

namespace Tests\Unit;

use App\Models\Empresa;
use App\Services\Fiscal\Sefaz\NfeNumeracaoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NfeNumeracaoServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_reserva_atomica_incrementa_por_serie(): void
    {
        $emp = Empresa::query()->create([
            'codigo' => 'EMP-NUM1',
            'razao_social' => 'Teste Num',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
        ]);
        $svc = app(NfeNumeracaoService::class);
        $svc->seedUltimo($emp, 10, 1);
        $a = $svc->reservar($emp, 1);
        $b = $svc->reservar($emp, 1);
        $this->assertSame(1, $a['serie']);
        $this->assertSame(11, $a['numero']);
        $this->assertSame(12, $b['numero']);
    }
}
