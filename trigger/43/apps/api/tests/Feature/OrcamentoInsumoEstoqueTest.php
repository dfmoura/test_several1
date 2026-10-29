<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueSaldo;
use App\Models\OrcCatalogoPapel;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Models\ProdutoGrupo;
use App\Models\User;
use App\Services\Comercial\Orcamento\OrcamentoCatalogo;
use App\Services\Comercial\Orcamento\OrcamentoInsumoEstoque;
use App\Services\Producao\OpBomDeriver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OrcamentoInsumoEstoqueTest extends TestCase
{
    use RefreshDatabase;

    public function test_lista_so_sku_com_saldo_do_grupo(): void
    {
        Permission::findOrCreate('orcamento.ler', 'web');
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-INS1',
            'razao_social' => 'Insumo ORC',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
        ]);
        $user = User::query()->create([
            'codigo' => 'USR-INS1',
            'name' => 'Comercial',
            'email' => 'insumo.orc@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo('orcamento.ler');
        $user->empresas()->attach($empresa->id);

        $papel = $this->grupo('MP-PAP', 'Papéis', 'MP');
        $lam = $this->grupo('MP-LAM', 'Laminação', 'MP');
        $comSaldo = $this->produto($empresa, 'MP-PAP-010', 'MP', $papel->id, 'PAPEL COUCHE 20G AUTOADESIVO FASSON');
        $semSaldo = $this->produto($empresa, 'MP-PAP-011', 'MP', $papel->id, 'PAPEL TERMICO AUTOADESIVO');
        $this->produto($empresa, 'MP-LAM-003', 'MP', $lam->id, 'LAMINACAO FOSCA');
        $this->saldo($empresa, $comSaldo, '12');

        Sanctum::actingAs($user);
        $res = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/orcamentos/insumos?slot=papel');

        $res->assertOk();
        $codigos = collect($res->json('data'))->pluck('codigo')->all();
        $this->assertSame(['MP-PAP-010'], $codigos);
        $this->assertNotContains($semSaldo->codigo, $codigos);
        $this->assertSame('COUCHE FASSON 20G', $res->json('data.0.tarifa'));
    }

    public function test_acabamento_cold_com_verniz_usa_tarifa_combinada(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-INS2',
            'razao_social' => 'Insumo 2',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
        ]);
        $cld = $this->grupo('MP-CLD', 'Cold', 'MP');
        $produto = $this->produto($empresa, 'MP-CLD-001', 'MP', $cld->id, 'FOIL COLD OURO');
        $this->saldo($empresa, $produto, '4');

        $out = app(OrcamentoInsumoEstoque::class)->aplicar($empresa, [
            'acabamento' => 'FOIL COLD OURO',
            'acabamento_produto_id' => $produto->id,
            'acabamento_complemento' => 'VERNIZ',
        ]);

        $this->assertSame('FOIL COLD OURO + VERNIZ', $out['acabamento']);
        $this->assertSame('COLD STAMP +VERNIZ', $out['acabamento_tarifa']);
        $this->assertTrue($out['acabamento_tarifa_composta']);

        $cat = OrcamentoCatalogo::load();
        $this->assertEqualsWithDelta(3.5, $cat->precoAcabamentoEfetivo($out), 0.0001);
    }

    public function test_laminacao_mais_verniz_soma_a_tarifa(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-INS3',
            'razao_social' => 'Insumo 3',
            'cnpj' => '00000000000353',
            'situacao' => 'ATIVA',
        ]);
        $lam = $this->grupo('MP-LAM', 'Laminação', 'MP');
        $produto = $this->produto($empresa, 'MP-LAM-003', 'MP', $lam->id, 'LAMINACAO FOSCA');
        $this->saldo($empresa, $produto, '8');

        $out = app(OrcamentoInsumoEstoque::class)->aplicar($empresa, [
            'acabamento_produto_id' => $produto->id,
            'acabamento_complemento' => 'VERNIZ',
        ]);

        $this->assertSame('LAMINAÇÃO FOSCA', $out['acabamento_tarifa']);
        $this->assertFalse($out['acabamento_tarifa_composta']);
        $cat = OrcamentoCatalogo::load();
        $this->assertEqualsWithDelta(3.1, $cat->precoAcabamentoEfetivo($out), 0.0001);
        $this->assertEqualsWithDelta(5.0, $cat->perdaAcabEfetiva($out), 0.0001);
    }

    public function test_op_usa_o_sku_escolhido_no_orcamento(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-INS4',
            'razao_social' => 'Insumo 4',
            'cnpj' => '00000000000434',
            'situacao' => 'ATIVA',
        ]);
        $filme = $this->grupo('MP-FLM', 'Filmes', 'MP');
        $produto = $this->produto($empresa, 'MP-FLM-001', 'MP', $filme->id, 'BOPP BRILHO AUTOADESIVO COLACRIL BXT');
        $pedido = new Pedido([
            'snapshot' => ['input' => [], 'faixa' => []],
        ]);
        $item = new PedidoItem([
            'especificacao' => [
                'papel' => 'BOPP BRILHO AUTOADESIVO COLACRIL BXT',
                'papel_produto_id' => $produto->id,
                'faixa' => ['m2' => 15, 'metragem' => 100, 'rolos' => 1],
            ],
        ]);

        $diag = app(OpBomDeriver::class)->diagnostico($empresa, $pedido, $item);
        $papel = collect($diag['linhas'])->firstWhere('componente', 'PAPEL');
        $this->assertSame($produto->id, $papel['produto_id']);
        $this->assertSame(0, bccomp((string) $papel['qtde'], '15', 4));
    }

    public function test_laminacao_com_cola_nao_tem_tarifa(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-INS5',
            'razao_social' => 'Insumo 5',
            'cnpj' => '00000000000515',
            'situacao' => 'ATIVA',
        ]);
        $lam = $this->grupo('MP-LAM', 'Laminação', 'MP');
        $produto = $this->produto($empresa, 'MP-LAM-002', 'MP', $lam->id, 'LAMINACAO BRILHO');
        $this->saldo($empresa, $produto, '3');

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        app(OrcamentoInsumoEstoque::class)->aplicar($empresa, [
            'acabamento_produto_id' => $produto->id,
            'acabamento_complemento' => 'COLA',
        ]);
    }

    public function test_papel_ambiguo_nao_herda_familia_e_preco_do_sku_vence(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-INS6',
            'razao_social' => 'Insumo 6',
            'cnpj' => '00000000000604',
            'situacao' => 'ATIVA',
        ]);
        $filme = $this->grupo('MP-FLM', 'Filmes', 'MP');
        $produto = $this->produto($empresa, 'MP-FLM-001', 'MP', $filme->id, 'BOPP BRILHO AUTOADESIVO COLACRIL BXT');
        $this->saldo($empresa, $produto, '10');

        try {
            app(OrcamentoInsumoEstoque::class)->aplicar($empresa, [
                'papel_produto_id' => $produto->id,
            ]);
            $this->fail('Papel ambíguo deveria exigir R$/m².');
        } catch (\Illuminate\Validation\ValidationException $e) {
            $this->assertStringContainsString('ainda não tem preço', $e->errors()['papel'][0]);
        }

        $row = OrcCatalogoPapel::query()->where('empresa_id', $empresa->id)->where('produto_id', $produto->id)->first();
        $this->assertNotNull($row);
        $this->assertNull($row->preco_m2);

        $row->preco_m2 = 4.2;
        $row->save();

        $out = app(OrcamentoInsumoEstoque::class)->aplicar($empresa, [
            'papel_produto_id' => $produto->id,
        ]);
        $cat = OrcamentoCatalogo::load(null, $empresa->id);
        $this->assertEqualsWithDelta(4.2, $cat->precoPapelEfetivo($out), 0.0001);
    }

    public function test_polegada_do_tubete(): void
    {
        $this->assertSame('1"', OrcamentoInsumoEstoque::polegada('TUBETE 1"'));
        $this->assertSame('1" 1/2', OrcamentoInsumoEstoque::polegada('TUBETE 1 1/2'));
        $this->assertSame('3"', OrcamentoInsumoEstoque::polegada('EMB TUBETE 3 POLEGADAS'));
    }

    public function test_orc_tubete_fica_so_na_polegada_sem_sku(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-INS7',
            'razao_social' => 'Insumo 7',
            'cnpj' => '00000000000787',
            'situacao' => 'ATIVA',
        ]);
        $emb = $this->grupo('EMB-TUB', 'Tubetes', 'EMB');
        $sku = $this->produto($empresa, 'EMB-TUB-001', 'EMB', $emb->id, 'TUBETE 3" 100MM C/LOGO');
        $this->saldo($empresa, $sku, '50');

        $out = app(OrcamentoInsumoEstoque::class)->aplicar($empresa, [
            'tubete' => '3"',
            'tubete_produto_id' => $sku->id,
            'tubete_produto_codigo' => $sku->codigo,
            'tubete_rotulo' => 'TUBETE 3" 100MM C/LOGO',
        ]);

        $this->assertSame('3"', $out['tubete']);
        $this->assertNull($out['tubete_produto_id']);
        $this->assertNull($out['tubete_produto_codigo']);
        $this->assertNull($out['tubete_rotulo']);
    }

    private function grupo(string $codigo, string $nome, string $familia): ProdutoGrupo
    {
        return ProdutoGrupo::query()->create([
            'codigo' => $codigo,
            'nome' => $nome,
            'familia' => $familia,
            'natureza' => 'COMPRA',
            'tipo_item_sped' => '01',
            'situacao' => 'ATIVO',
        ]);
    }

    private function produto(Empresa $empresa, string $codigo, string $familia, int $grupoId, string $descricao): Produto
    {
        return Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
            'familia' => $familia,
            'grupo_id' => $grupoId,
            'descricao_fiscal' => $descricao,
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
        ]);
    }

    private function saldo(Empresa $empresa, Produto $produto, string $qtde): void
    {
        EstoqueSaldo::query()->create([
            'empresa_id' => $empresa->id,
            'produto_id' => $produto->id,
            'qtde' => $qtde,
            'unidade' => 'M2',
            'custo_medio' => '1',
        ]);
    }
}
