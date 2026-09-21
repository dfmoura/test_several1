<?php

namespace Tests\Unit;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\OrcamentoItem;
use App\Models\Parceiro;
use App\Support\OrcamentoItens;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrcamentoItensTest extends TestCase
{
    use RefreshDatabase;

    public function test_sync_unico_job_cria_ordem_1_e_remove_extras(): void
    {
        [$empresa, $parceiro] = $this->seedEmpresaParceiro();
        $orc = $this->orcFlat($empresa, $parceiro);

        OrcamentoItem::query()->create([
            'empresa_id' => $empresa->id,
            'orcamento_id' => $orc->id,
            'ordem' => 2,
            'input_snapshot' => ['x' => 1],
            'result_snapshot' => ['y' => 1],
        ]);

        $item = OrcamentoItens::syncUnicoJob($orc, ['medida' => '50x30'], ['faixas' => []]);

        $this->assertSame(1, $item->ordem);
        $this->assertSame(['medida' => '50x30'], $item->input_snapshot);
        $this->assertSame(1, OrcamentoItem::query()->where('orcamento_id', $orc->id)->count());
        $this->assertSame(0, OrcamentoItem::query()->where('orcamento_id', $orc->id)->where('ordem', '>', 1)->count());
    }

    public function test_to_out_materializa_legado_sem_gravar(): void
    {
        [$empresa, $parceiro] = $this->seedEmpresaParceiro();
        $orc = $this->orcFlat($empresa, $parceiro);

        $this->assertSame(0, OrcamentoItem::query()->where('orcamento_id', $orc->id)->count());

        $itens = OrcamentoItens::toOut($orc);

        $this->assertCount(1, $itens);
        $this->assertTrue($itens[0]['legado']);
        $this->assertNull($itens[0]['id']);
        $this->assertSame(1, $itens[0]['ordem']);
        $this->assertSame($orc->input_snapshot, $itens[0]['input_snapshot']);
        $this->assertSame(0, OrcamentoItem::query()->where('orcamento_id', $orc->id)->count());
    }

    public function test_sync_jobs_persiste_n_posicoes_e_remove_extras(): void
    {
        [$empresa, $parceiro] = $this->seedEmpresaParceiro();
        $orc = $this->orcFlat($empresa, $parceiro);

        OrcamentoItens::syncJobs($orc, [
            ['rotulo' => 'A', 'input' => ['medida' => '10x10'], 'result' => ['faixas' => []]],
            ['rotulo' => 'B', 'input' => ['medida' => '20x20'], 'result' => ['faixas' => [['q' => 1]]]],
        ]);

        $rows = OrcamentoItem::query()->where('orcamento_id', $orc->id)->orderBy('ordem')->get();
        $this->assertCount(2, $rows);
        $this->assertSame('A', $rows[0]->rotulo);
        $this->assertSame(['medida' => '10x10'], $rows[0]->input_snapshot);
        $this->assertSame(2, $rows[1]->ordem);
        $this->assertSame(['medida' => '20x20'], $rows[1]->input_snapshot);

        OrcamentoItens::syncJobs($orc, [
            ['rotulo' => null, 'input' => ['x' => 1], 'result' => ['y' => 1]],
        ]);
        $this->assertSame(1, OrcamentoItem::query()->where('orcamento_id', $orc->id)->count());
    }

    public function test_expand_payload_flat_wraps_unico_job(): void
    {
        $expanded = OrcamentoItens::expandPayload([
            'parceiro_id' => 1,
            'medida' => '50x30',
            'faixas' => [['quantidade' => 1000]],
        ]);

        $this->assertSame(1, $expanded['header']['parceiro_id']);
        $this->assertCount(1, $expanded['jobs']);
        $this->assertSame('50x30', $expanded['jobs'][0]['data']['medida']);
    }

    public function test_expand_payload_multi_item(): void
    {
        $expanded = OrcamentoItens::expandPayload([
            'parceiro_id' => 1,
            'tipo_operacao' => 'INDUSTRIALIZACAO',
            'itens' => [
                ['rotulo' => 'Etq A', 'medida' => '10x10', 'faixas' => [['quantidade' => 1000]]],
                ['medida' => '20x20', 'faixas' => [['quantidade' => 2000]]],
            ],
        ]);

        $this->assertCount(2, $expanded['jobs']);
        $this->assertSame('Etq A', $expanded['jobs'][0]['rotulo']);
        $this->assertSame('10x10', $expanded['jobs'][0]['data']['medida']);
        $this->assertSame('INDUSTRIALIZACAO', $expanded['jobs'][0]['data']['tipo_operacao']);
        $this->assertNull($expanded['jobs'][1]['rotulo']);
    }

    public function test_to_out_usa_itens_persistidos(): void
    {
        [$empresa, $parceiro] = $this->seedEmpresaParceiro();
        $orc = $this->orcFlat($empresa, $parceiro);
        OrcamentoItens::syncUnicoJob($orc, ['a' => 1], ['b' => 2]);

        $itens = OrcamentoItens::toOut($orc->fresh('itens'));

        $this->assertCount(1, $itens);
        $this->assertFalse($itens[0]['legado']);
        $this->assertNotNull($itens[0]['id']);
        $this->assertSame(['a' => 1], $itens[0]['input_snapshot']);
        $this->assertSame(['b' => 2], $itens[0]['result_snapshot']);
    }

    /** @return array{0: Empresa, 1: Parceiro} */
    private function seedEmpresaParceiro(): array
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-ITENS',
            'razao_social' => 'EMP Itens',
            'nome_fantasia' => 'Itens',
            'cnpj' => '00000000000353',
            'situacao' => 'ATIVA',
        ]);
        $parceiro = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-ITENS',
            'razao_social' => 'Cliente Itens',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);

        return [$empresa, $parceiro];
    }

    private function orcFlat(Empresa $empresa, Parceiro $parceiro): Orcamento
    {
        return Orcamento::query()->create([
            'empresa_id' => $empresa->id,
            'ano' => 2026,
            'numero' => 1,
            'codigo' => 'ORC-2026-00001',
            'versao' => 1,
            'parceiro_id' => $parceiro->id,
            'cliente_nome' => $parceiro->razao_social,
            'status' => Orcamento::STATUS_CALCULADO,
            'input_snapshot' => ['medida' => 'legado'],
            'result_snapshot' => ['faixas' => [['quantidade' => 1000]]],
        ]);
    }
}
