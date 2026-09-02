<?php

namespace Tests\Unit;

use App\Models\Empresa;
use App\Models\Feriado;
use App\Services\Calendario\DiasUteisService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiasUteisServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_soma_dias_uteis_pulando_fim_de_semana(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-DU1',
            'razao_social' => 'Teste DU',
            'nome_fantasia' => 'DU',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $service = app(DiasUteisService::class);

        // Sexta 2026-09-04 + 1 d.útil = segunda 2026-09-07
        $result = $service->previsaoEntrega($empresa, 1, \Carbon\Carbon::parse('2026-09-04'));
        $this->assertSame('2026-09-07', $result['data_entrega_prevista']);
    }

    public function test_feriado_recorrente_anual(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-DU2',
            'razao_social' => 'Teste DU2',
            'nome_fantasia' => 'DU2',
            'cnpj' => '44555666000199',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        Feriado::query()->create([
            'empresa_id' => $empresa->id,
            'data' => '2020-12-25',
            'nome' => 'Natal',
            'tipo' => Feriado::TIPO_NACIONAL,
            'recorrente_anual' => true,
            'ativo' => true,
        ]);

        $service = app(DiasUteisService::class);
        $this->assertTrue($service->isFeriado(\Carbon\Carbon::parse('2026-12-25'), $empresa));
    }

    public function test_prazo_efetivo_soma_faca(): void
    {
        $service = app(DiasUteisService::class);
        $this->assertSame(15, $service->prazoEfetivoDias(12, true, 3));
        $this->assertSame(12, $service->prazoEfetivoDias(12, false, 3));
    }
}
