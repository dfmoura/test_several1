<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueAjuste;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueSaldo;
use App\Models\Produto;
use App\Models\User;
use App\Services\Estoque\EstoqueViradaCatalogData;
use App\Services\Estoque\EstoqueViradaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Virada de estoque via AJU A03 — caminho canônico (estudo 32), sem editar saldo direto.
 */
class EstoqueViradaSeedTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $solicitante;

    private User $aprovador;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['estoque.ler', 'estoque.escrever', 'estoque.aprovar'] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-VIR1',
            'razao_social' => 'Empresa Virada',
            'nome_fantasia' => 'Virada',
            'cnpj' => '22333444000192',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->solicitante = User::query()->create([
            'name' => 'Operador Virada',
            'email' => 'op.virada@test.local',
            'password' => 'secret',
            'codigo' => 'USR-VIR1',
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->solicitante->givePermissionTo(['estoque.ler', 'estoque.escrever']);
        $this->solicitante->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->aprovador = User::query()->create([
            'name' => 'Aprovador Virada',
            'email' => 'apr.virada@test.local',
            'password' => 'secret',
            'codigo' => 'USR-VIR2',
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->aprovador->givePermissionTo(['estoque.ler', 'estoque.escrever', 'estoque.aprovar']);
        $this->aprovador->empresas()->attach($this->empresa->id, ['padrao' => true]);

        foreach (['EMB-CX-001', 'EMB-CX-003', 'MP-CLD-001'] as $codigo) {
            Produto::query()->create([
                'empresa_id' => $this->empresa->id,
                'codigo' => $codigo,
                'familia' => str_starts_with($codigo, 'EMB') ? 'EMB' : 'MP',
                'grupo' => str_starts_with($codigo, 'EMB') ? 'EMB-CX' : 'MP-CLD',
                'descricao_fiscal' => $codigo,
                'unidade_comercial' => 'UN',
                'unidade_interna' => 'UN',
                'fator_conversao' => '1',
                'custo_medio' => '0',
                'situacao' => 'ATIVO',
            ]);
        }
    }

    public function test_virada_gera_aju_a03_mov_e_saldo_via_writer(): void
    {
        $service = app(EstoqueViradaService::class);
        $result = $service->popular($this->empresa, $this->solicitante, $this->aprovador, [
            'incluir_demos' => false,
            'set_minimos' => true,
            'dry_run' => false,
        ]);

        $this->assertSame(0, $result['erros']);
        $this->assertGreaterThanOrEqual(3, $result['aplicados']);

        $cx1 = Produto::query()->where('codigo', 'EMB-CX-001')->firstOrFail();
        $saldo = EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $cx1->id)
            ->firstOrFail();
        $this->assertSame('325.0000', (string) $saldo->qtde);
        $this->assertSame('80.0000', (string) $cx1->fresh()->estoque_minimo);

        $aju = EstoqueAjuste::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $cx1->id)
            ->where('motivo_codigo', 'A03')
            ->where('status', EstoqueAjuste::STATUS_APROVADO)
            ->firstOrFail();
        $this->assertNotNull($aju->movimento_id);
        $this->assertNotSame((int) $aju->solicitado_por, (int) $aju->aprovado_por);

        $mov = EstoqueMovimento::query()->findOrFail($aju->movimento_id);
        $this->assertSame(EstoqueMovimento::TIPO_AJUSTE, $mov->tipo);
    }

    public function test_virada_e_idempotente_nao_sobrescreve_saldo(): void
    {
        $service = app(EstoqueViradaService::class);
        $service->popular($this->empresa, $this->solicitante, $this->aprovador);

        $cx1 = Produto::query()->where('codigo', 'EMB-CX-001')->firstOrFail();
        EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $cx1->id)
            ->update(['qtde' => '10.0000']);

        $again = $service->popular($this->empresa, $this->solicitante, $this->aprovador);
        $this->assertSame(0, $again['aplicados']);
        $this->assertGreaterThan(0, $again['pulados']);

        $this->assertSame(
            '10.0000',
            (string) EstoqueSaldo::query()
                ->where('empresa_id', $this->empresa->id)
                ->where('produto_id', $cx1->id)
                ->value('qtde')
        );
    }

    public function test_virada_exige_sod(): void
    {
        $this->expectException(\Illuminate\Validation\ValidationException::class);

        app(EstoqueViradaService::class)->popular(
            $this->empresa,
            $this->aprovador,
            $this->aprovador
        );
    }

    public function test_catalogo_tintas_26_fora_do_consolidado(): void
    {
        $tintas = EstoqueViradaCatalogData::aberturaTintas();
        $this->assertCount(26, $tintas);

        $codigos = array_column($tintas, 'codigo');
        $this->assertContains('MP-TIN-001', $codigos);
        $this->assertContains('MP-TIN-026', $codigos);
        $this->assertCount(count($codigos), array_unique($codigos));

        foreach ($tintas as $row) {
            $this->assertSame('abertura_operacional_tinta', $row['fonte']);
            $this->assertTrue(str_starts_with($row['codigo'], 'MP-TIN-'));
            $this->assertGreaterThan(0, (float) $row['qtde']);
        }

        $consolidado = array_column(EstoqueViradaCatalogData::abertura(), 'codigo');
        $this->assertSame([], array_values(array_intersect($consolidado, $codigos)));

        $demos = array_column(EstoqueViradaCatalogData::demosTeste(), 'codigo');
        $this->assertSame([], array_values(array_intersect($demos, $codigos)));
    }

    public function test_virada_tinta_a03_com_lote_validade_e_unidade(): void
    {
        foreach ([
            ['MP-TIN-001', 'KG'],
            ['MP-TIN-025', 'L'],
        ] as [$codigo, $un]) {
            Produto::query()->create([
                'empresa_id' => $this->empresa->id,
                'codigo' => $codigo,
                'familia' => 'MP',
                'grupo' => 'MP-TIN',
                'descricao_fiscal' => $codigo,
                'unidade_comercial' => $un,
                'unidade_interna' => $un,
                'fator_conversao' => '1',
                'custo_medio' => '0',
                'controla_lote' => true,
                'controla_validade' => true,
                'prazo_validade_dias' => 365,
                'situacao' => 'ATIVO',
            ]);
        }

        $result = app(EstoqueViradaService::class)->popular(
            $this->empresa,
            $this->solicitante,
            $this->aprovador,
            ['incluir_demos' => false, 'set_minimos' => true]
        );

        $this->assertSame(0, $result['erros']);

        $alvo = [];
        foreach (EstoqueViradaCatalogData::aberturaTintas() as $row) {
            $alvo[$row['codigo']] = $row;
        }

        $black = Produto::query()->where('codigo', 'MP-TIN-001')->firstOrFail();
        $this->assertSame(
            '15.0000',
            (string) EstoqueSaldo::query()->where('produto_id', $black->id)->value('qtde')
        );
        $this->assertSame('5.0000', (string) $black->fresh()->estoque_minimo);
        $this->assertSame('KG', (string) EstoqueSaldo::query()->where('produto_id', $black->id)->value('unidade'));

        $lotesBlack = EstoqueLote::query()->where('produto_id', $black->id)->get();
        $this->assertCount(2, $lotesBlack);
        $this->assertNotNull($lotesBlack->first()->data_validade);
        $this->assertNotNull($lotesBlack->first()->data_entrada);
        $soma = $lotesBlack->reduce(
            fn (string $acc, EstoqueLote $l) => bcadd($acc, (string) $l->qtde, 4),
            '0'
        );
        $this->assertSame('15.0000', $soma);

        $aju = EstoqueAjuste::query()
            ->where('produto_id', $black->id)
            ->where('motivo_codigo', 'A03')
            ->where('status', EstoqueAjuste::STATUS_APROVADO)
            ->firstOrFail();
        $this->assertNotSame((int) $aju->solicitado_por, (int) $aju->aprovado_por);

        $diluente = Produto::query()->where('codigo', 'MP-TIN-025')->firstOrFail();
        $this->assertSame(
            '6.0000',
            (string) EstoqueSaldo::query()->where('produto_id', $diluente->id)->value('qtde')
        );
        $this->assertSame(
            'L',
            (string) EstoqueSaldo::query()->where('produto_id', $diluente->id)->value('unidade')
        );
        $this->assertCount(1, EstoqueLote::query()->where('produto_id', $diluente->id)->get());
        $this->assertSame('6', $alvo['MP-TIN-025']['qtde']);
    }
}
