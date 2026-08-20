<?php

namespace Tests\Unit;

use App\Models\CodigoSequence;
use App\Models\Empresa;
use App\Models\Parceiro;
use App\Services\Codigo\CodigoGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CodigoGeneratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_alinhas_sequencia_atrasada_com_maximo_existente(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-CG1',
            'razao_social' => 'Empresa Codigo',
            'nome_fantasia' => 'CG',
            'cnpj' => '00000000000434',
            'situacao' => 'ATIVA',
        ]);

        Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-00010',
            'razao_social' => 'Cliente Exemplo',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);

        CodigoSequence::query()->create([
            'empresa_id' => $empresa->id,
            'prefixo' => 'PAR',
            'proximo' => 8,
        ]);

        $gen = app(CodigoGenerator::class);

        $this->assertSame('PAR-00011', $gen->nextCode($empresa->id, 'PAR', 5));
        $this->assertSame('PAR-00012', $gen->nextCode($empresa->id, 'PAR', 5));

        $this->assertSame(13, (int) CodigoSequence::query()
            ->where('empresa_id', $empresa->id)
            ->where('prefixo', 'PAR')
            ->value('proximo'));
    }

    public function test_cria_sequencia_pela_primeira_vez_apos_codigos_explicitos(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-CG2',
            'razao_social' => 'Empresa Codigo 2',
            'nome_fantasia' => 'CG2',
            'cnpj' => '00000000000515',
            'situacao' => 'ATIVA',
        ]);

        Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-00007',
            'razao_social' => 'Colaborador',
            'papel_colaborador' => true,
            'situacao' => 'ATIVO',
        ]);

        $gen = app(CodigoGenerator::class);
        $this->assertSame('PAR-00008', $gen->nextCode($empresa->id, 'PAR', 5));
    }
}
