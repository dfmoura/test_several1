<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Empresa;
use App\Models\EstoqueSaldo;
use App\Models\Orcamento;
use App\Models\OrcamentoItem;
use App\Models\OrcCatalogoPapel;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\ProdutoGrupo;
use App\Support\OrcamentoItens;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OrcamentoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private Empresa $outraEmpresa;

    private User $comercial;

    private User $consulta;

    private Parceiro $parceiro;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('orcamento.ler', 'web');
        Permission::findOrCreate('orcamento.escrever', 'web');

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-ORC1',
            'razao_social' => 'Empresa ORC Teste',
            'nome_fantasia' => 'ORC',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
        ]);

        $this->outraEmpresa = Empresa::query()->create([
            'codigo' => 'EMP-ORC2',
            'razao_social' => 'Outra Empresa ORC',
            'nome_fantasia' => 'ORC2',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
        ]);

        $this->parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-00001',
            'razao_social' => 'BRAHVA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
        ]);

        Parceiro::query()->create([
            'empresa_id' => $this->outraEmpresa->id,
            'codigo' => 'PAR-00001',
            'razao_social' => 'OUTRO',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-ORC1',
            'name' => 'Comercial ORC',
            'email' => 'comercial.orc@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['orcamento.ler', 'orcamento.escrever']);
        $this->comercial->empresas()->attach($this->empresa->id);

        $this->consulta = User::query()->create([
            'codigo' => 'USR-ORC2',
            'name' => 'Consulta ORC',
            'email' => 'consulta.orc@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->consulta->givePermissionTo('orcamento.ler');
        $this->consulta->empresas()->attach($this->empresa->id);
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        $fx = json_decode(
            (string) file_get_contents(dirname(__DIR__).'/fixtures/orcamento_brahva.json'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        return [
            'parceiro_id' => $this->parceiro->id,
            'medida' => $fx['medida'],
            'largura_cm' => $fx['largura_cm'],
            'puxada_cm' => $fx['puxada_cm'],
            'cores' => $fx['cores'],
            'papel' => $fx['papel'],
            'acabamento' => $fx['acabamento'],
            'modelos' => $fx['modelos'],
            'colunas' => $fx['colunas'],
            'etiq_por_rolo' => $fx['etiq_por_rolo'],
            'tubete' => $fx['tubete'],
            'z' => $fx['z'],
            'maquina' => $fx['maquina'],
            'maquina_roda_servico' => $fx['maquina_roda_servico'],
            'imposto_pct' => $fx['imposto_pct'],
            'matriz' => $fx['matriz'],
            'coluna_rebobinacao' => $fx['coluna_rebobinacao'],
            'tipo_troca_produto' => $fx['tipo_troca_produto'],
            'rpm' => $fx['rpm'],
            'overrides' => $fx['overrides'],
            'faixas' => array_map(static fn (array $f) => [
                'quantidade' => $f['quantidade'],
                'comissao_pct' => $f['comissao_pct'],
            ], $fx['faixas']),
            'prazo_entrega_dias' => 12,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ];
    }

    /** @return list<array<string, mixed>> */
    private function duasFacasPayload(): array
    {
        return [
            [
                'principal' => true,
                'formato' => 'RETA',
                'medida' => '100X50',
                'n_facas' => 12,
                'puxada_cm' => 5.0,
                'largura_cm' => 10.0,
                'faca_nova' => true,
                'valor_faca' => 100,
                'prazo_faca_dias' => 3,
            ],
            [
                'principal' => false,
                'formato' => 'OVAL',
                'medida' => '40X40',
                'n_facas' => 40,
                'faca_nova' => false,
                'valor_faca' => 50,
                'prazo_faca_dias' => 7,
            ],
        ];
    }

    public function test_calcular_preview_sem_persistir(): void
    {
        Sanctum::actingAs($this->comercial);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/orcamentos/calcular', $this->payload());

        $res->assertOk();
        $this->assertEqualsWithDelta(2460.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
        $this->assertSame('RETIRAR', $res->json('data.frete.modo'));
        $this->assertFalse($res->json('data.faixas.0.frete_somavel'));
        $this->assertSame(0, Orcamento::query()->count());
    }

    public function test_crud_rascunho_calculado(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $this->payload());
        $create->assertCreated();
        $this->assertSame('CALCULADO', $create->json('data.status'));
        $this->assertTrue($create->json('data.editavel'));
        $this->assertMatchesRegularExpression('/^ORC-\d{4}-\d{5}$/', $create->json('data.codigo'));
        $id = $create->json('data.id');
        // ADR_ORC_ITENS fase 1: dual-write N=1 no detalhe; UI flat intacta.
        $this->assertCount(1, $create->json('data.itens'));
        $this->assertFalse($create->json('data.itens.0.legado'));
        $this->assertSame(1, OrcamentoItem::query()->where('orcamento_id', $id)->count());
        $this->assertSame(
            $create->json('data.input_snapshot.medida'),
            $create->json('data.itens.0.input_snapshot.medida'),
        );

        $list = $this->withHeaders($h)->getJson('/api/v1/orcamentos');
        $list->assertOk();
        $this->assertCount(1, $list->json('data'));
        $this->assertArrayNotHasKey('itens', $list->json('data.0'));

        $show = $this->withHeaders($h)->getJson('/api/v1/orcamentos/'.$id);
        $show->assertOk();
        $this->assertEqualsWithDelta(2460.0, (float) $show->json('data.result_snapshot.faixas.0.valor_etiqueta'), 0.01);
        $this->assertCount(1, $show->json('data.itens'));

        $updPayload = $this->payload();
        $updPayload['modelos'] = 8;
        $updPayload['modelos_composicao'] = array_map(
            static fn (int $i) => [
                'ordem' => $i + 1,
                'nome' => 'Arte '.($i + 1),
                'percentual' => 12.5,
            ],
            range(0, 7)
        );
        // 8 × 12.5 = 100
        $update = $this->withHeaders($h)->putJson('/api/v1/orcamentos/'.$id, $updPayload);
        $update->assertOk();
        $this->assertSame(2, $update->json('data.versao'));
        $this->assertSame('CALCULADO', $update->json('data.status'));
        $this->assertSame(8, $update->json('data.input_snapshot.modelos'));
        $this->assertCount(8, $update->json('data.input_snapshot.modelos_composicao'));
        $this->assertSame('Arte 1', $update->json('data.input_snapshot.modelos_composicao.0.nome'));
        $this->assertSame(8, $update->json('data.itens.0.input_snapshot.modelos'));
        $this->assertSame(1, OrcamentoItem::query()->where('orcamento_id', $id)->count());

        $del = $this->withHeaders($h)->deleteJson('/api/v1/orcamentos/'.$id);
        $del->assertOk();
        $this->assertSame(0, Orcamento::query()->count());
        $this->assertSame(1, Orcamento::withTrashed()->count());
        $this->assertSame('CANCELADO', Orcamento::withTrashed()->first()->status);

        $livro = $this->withHeaders($h)->getJson('/api/v1/orcamentos');
        $livro->assertOk();
        $this->assertCount(0, $livro->json('data'));

        $cancelados = $this->withHeaders($h)->getJson('/api/v1/orcamentos?status=CANCELADO');
        $cancelados->assertOk();
        $this->assertCount(1, $cancelados->json('data'));
        $this->assertSame('CANCELADO', $cancelados->json('data.0.status'));
        $this->assertFalse($cancelados->json('data.0.editavel'));
        $this->assertSame($id, $cancelados->json('data.0.id'));

        $showCancelado = $this->withHeaders($h)->getJson('/api/v1/orcamentos/'.$id);
        $showCancelado->assertOk();
        $this->assertSame('CANCELADO', $showCancelado->json('data.status'));
        $this->assertFalse($showCancelado->json('data.editavel'));
        $this->assertFalse($showCancelado->json('data.enviavel'));

        $this->withHeaders($h)->getJson('/api/v1/orcamentos/'.$id.'/proposta-comercial')->assertOk();
        $this->withHeaders($h)->putJson('/api/v1/orcamentos/'.$id, $updPayload)->assertNotFound();
        $this->withHeaders($h)->deleteJson('/api/v1/orcamentos/'.$id)->assertNotFound();
        $this->withHeaders($h)->postJson('/api/v1/orcamentos/'.$id.'/duplicar')->assertNotFound();
    }

    public function test_duplicar_aprovado_cria_orcamento_novo_e_preserva_o_original(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $payload = $this->payload();
        $payload['observacao'] = 'Repetir com o mesmo desenho';
        $payload['modelos'] = 2;
        $payload['modelos_composicao'] = [
            ['ordem' => 1, 'nome' => 'Frente', 'percentual' => 60, 'valor_arte' => 10, 'tintas' => ['Ciano']],
            ['ordem' => 2, 'nome' => 'Verso', 'percentual' => 40, 'valor_arte' => 0, 'tintas' => ['Preto']],
        ];
        $payload['modo_entrega'] = 'RETIRAR';

        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $payload);
        $create->assertCreated();
        $id = (int) $create->json('data.id');
        $codigo = (string) $create->json('data.codigo');

        $orc = Orcamento::query()->findOrFail($id);
        $snap = $orc->input_snapshot;
        $snap['modelos_composicao'][0]['decisao'] = 'APROVADO';
        $snap['modelos_composicao'][0]['decidido_em'] = '2026-10-01T12:00:00Z';
        $orc->input_snapshot = $snap;
        $orc->status = Orcamento::STATUS_APROVADO;
        $orc->financeiro_status = 'AGUARDA_ADIANTAMENTO';
        $orc->aceite_faixa_index = 0;
        $orc->aceite_nome_cliente = 'Cliente Teste';
        $orc->versao = 3;
        $orc->save();

        $item = OrcamentoItem::query()->where('orcamento_id', $id)->firstOrFail();
        $itemSnap = $item->input_snapshot;
        $itemSnap['modelos_composicao'][0]['decisao'] = 'APROVADO';
        $itemSnap['modelos_composicao'][0]['decidido_em'] = '2026-10-01T12:00:00Z';
        $item->input_snapshot = $itemSnap;
        $item->aceite_faixa_index = 0;
        $item->save();

        $antes = Orcamento::query()->findOrFail($id)->only([
            'codigo', 'versao', 'status', 'financeiro_status', 'aceite_faixa_index', 'aceite_nome_cliente', 'input_snapshot',
        ]);

        $dup = $this->withHeaders($h)->postJson('/api/v1/orcamentos/'.$id.'/duplicar');
        $dup->assertCreated();
        $novoId = (int) $dup->json('data.id');

        $this->assertNotSame($id, $novoId);
        $this->assertNotSame($codigo, $dup->json('data.codigo'));
        $this->assertSame('CALCULADO', $dup->json('data.status'));
        $this->assertSame(1, $dup->json('data.versao'));
        $this->assertTrue($dup->json('data.editavel'));
        $this->assertSame($codigo, $dup->json('data.copiado_de.codigo'));
        $this->assertSame($id, $dup->json('data.copiado_de.id'));
        $this->assertSame($this->parceiro->id, $dup->json('data.parceiro_id'));
        $this->assertSame('Repetir com o mesmo desenho', $dup->json('data.observacao'));
        $this->assertSame($payload['medida'], $dup->json('data.input_snapshot.medida'));
        $this->assertSame('Frente', $dup->json('data.input_snapshot.modelos_composicao.0.nome'));
        $this->assertSame('Ciano', $dup->json('data.input_snapshot.modelos_composicao.0.tintas.0'));
        $this->assertArrayNotHasKey('decisao', $dup->json('data.input_snapshot.modelos_composicao.0'));
        $this->assertArrayNotHasKey('decidido_em', $dup->json('data.input_snapshot.modelos_composicao.0'));
        $this->assertNull($dup->json('data.aceite_faixa_index'));
        $this->assertNull($dup->json('data.financeiro_status'));
        $this->assertNull($dup->json('data.pedido'));
        $this->assertEqualsWithDelta(
            (float) $create->json('data.result_snapshot.faixas.0.valor_etiqueta'),
            (float) $dup->json('data.result_snapshot.faixas.0.valor_etiqueta'),
            0.01,
        );

        $origem = Orcamento::query()->findOrFail($id);
        $this->assertSame($antes, $origem->only([
            'codigo', 'versao', 'status', 'financeiro_status', 'aceite_faixa_index', 'aceite_nome_cliente', 'input_snapshot',
        ]));
        $this->assertSame(0, $item->fresh()->aceite_faixa_index);
        $this->assertSame('APROVADO', $item->fresh()->input_snapshot['modelos_composicao'][0]['decisao']);
        $this->assertSame(2, Orcamento::query()->count());

        $this->assertTrue(
            AuditLog::query()
                ->where('acao', 'DUPLICAR')
                ->where('entidade', 'Orcamento')
                ->where('entidade_id', $id)
                ->where('para->novo_id', $novoId)
                ->exists()
        );
    }

    public function test_duplicar_recusa_status_que_nao_e_aprovado_e_consulta(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $id = (int) $this->withHeaders($h)->postJson('/api/v1/orcamentos', $this->payload())->json('data.id');

        $this->withHeaders($h)->postJson('/api/v1/orcamentos/'.$id.'/duplicar')->assertStatus(422);
        $this->assertSame(1, Orcamento::query()->count());

        Orcamento::query()->whereKey($id)->update(['status' => Orcamento::STATUS_ENVIADO]);
        $this->withHeaders($h)->postJson('/api/v1/orcamentos/'.$id.'/duplicar')->assertStatus(422);

        Orcamento::query()->whereKey($id)->update(['status' => Orcamento::STATUS_APROVADO]);
        Sanctum::actingAs($this->consulta);
        $this->withHeaders($h)->postJson('/api/v1/orcamentos/'.$id.'/duplicar')->assertForbidden();
        $this->assertSame(1, Orcamento::query()->count());
    }

    public function test_duplicar_nao_cruza_empresa(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $outroParceiro = Parceiro::query()->where('empresa_id', $this->outraEmpresa->id)->firstOrFail();
        $alheio = Orcamento::query()->create([
            'empresa_id' => $this->outraEmpresa->id,
            'ano' => 2026,
            'numero' => 1,
            'codigo' => 'ORC-2026-00001',
            'versao' => 1,
            'parceiro_id' => $outroParceiro->id,
            'cliente_nome' => 'OUTRO',
            'status' => Orcamento::STATUS_APROVADO,
            'input_snapshot' => ['medida' => '10X10'],
        ]);

        $this->withHeaders($h)->postJson('/api/v1/orcamentos/'.$alheio->id.'/duplicar')->assertNotFound();
        $this->assertSame(0, Orcamento::query()->where('empresa_id', $this->empresa->id)->count());
        $this->assertSame(Orcamento::STATUS_APROVADO, $alheio->fresh()->status);
    }

    public function test_duplicar_aprovado_multi_item_copia_posicoes(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $payload = array_merge($this->headerPayload(), [
            'itens' => [
                array_merge($this->jobPayload(), ['rotulo' => 'Posição A']),
                array_merge($this->jobPayload(), [
                    'rotulo' => 'Posição B',
                    'medida' => '60X40',
                    'largura_cm' => 62,
                ]),
            ],
        ]);
        $id = (int) $this->withHeaders($h)->postJson('/api/v1/orcamentos', $payload)->json('data.id');
        Orcamento::query()->whereKey($id)->update(['status' => Orcamento::STATUS_APROVADO]);

        $dup = $this->withHeaders($h)->postJson('/api/v1/orcamentos/'.$id.'/duplicar');
        $dup->assertCreated();
        $this->assertSame('Posição A', $dup->json('data.itens.0.rotulo'));
        $this->assertSame('60X40', $dup->json('data.itens.1.input_snapshot.medida'));
        $this->assertSame(2, $dup->json('data.result_snapshot.totais.n_itens'));
        $this->assertSame(Orcamento::STATUS_APROVADO, Orcamento::query()->findOrFail($id)->status);
    }

    public function test_duplicar_aprovado_preserva_sku_papel_do_snapshot(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $grupo = ProdutoGrupo::query()->create([
            'codigo' => 'MP-FLM',
            'nome' => 'Filmes',
            'familia' => 'MP',
            'natureza' => 'COMPRA',
            'tipo_item_sped' => '01',
            'situacao' => 'ATIVO',
        ]);
        $papel = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MP-FLM-DUP',
            'familia' => 'MP',
            'grupo_id' => $grupo->id,
            'descricao_fiscal' => 'BOPP BRILHO AUTOADESIVO COLACRIL BXT',
            'descricao_comercial' => 'BOPP BRILHO AUTOADESIVO COLACRIL BXT',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
        ]);
        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $papel->id,
            'qtde' => '100',
            'unidade' => 'M2',
            'custo_medio' => '1',
        ]);
        OrcCatalogoPapel::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $papel->id,
            'nome' => 'SKU-'.$papel->codigo,
            'grupo_id' => $grupo->id,
            'preco_m2' => 7.2,
            'ativo' => true,
            'ordem' => 0,
        ]);

        $payload = $this->payload();
        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $payload);
        $create->assertCreated();
        $id = (int) $create->json('data.id');

        $orc = Orcamento::query()->findOrFail($id);
        $snap = $orc->input_snapshot;
        // Nome legado fora do catálogo — só o SKU amarra o preço (caso nuvem ORC-42).
        $snap['papel'] = 'BOPP BRILHO AUTOADESIVO COLACRIL BXT';
        $snap['papel_tarifa'] = null;
        $snap['papel_produto_id'] = $papel->id;
        $snap['papel_produto_codigo'] = $papel->codigo;
        $orc->input_snapshot = $snap;
        $orc->status = Orcamento::STATUS_APROVADO;
        $orc->save();

        $item = OrcamentoItem::query()->where('orcamento_id', $id)->firstOrFail();
        $itemSnap = $item->input_snapshot;
        $itemSnap['papel'] = $snap['papel'];
        $itemSnap['papel_tarifa'] = null;
        $itemSnap['papel_produto_id'] = $papel->id;
        $itemSnap['papel_produto_codigo'] = $papel->codigo;
        $item->input_snapshot = $itemSnap;
        $item->save();

        $dup = $this->withHeaders($h)->postJson('/api/v1/orcamentos/'.$id.'/duplicar');
        $dup->assertCreated();
        $this->assertSame($papel->id, (int) $dup->json('data.input_snapshot.papel_produto_id'));
        $this->assertSame(Orcamento::STATUS_APROVADO, Orcamento::query()->findOrFail($id)->status);
    }

    public function test_duplicar_recusa_aprovado_sem_caracteristicas_comerciais(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        // Stub tipo ensaio PED: APROVADO com snapshot mínimo (sem SKU/faixas).
        $stub = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => 99199,
            'codigo' => 'ORC-2026-STUB',
            'versao' => 1,
            'parceiro_id' => $this->parceiro->id,
            'cliente_nome' => $this->parceiro->razao_social,
            'status' => Orcamento::STATUS_APROVADO,
            'input_snapshot' => [
                'necessidade' => 'REVENDA',
                'modo_entrega' => 'RETIRAR',
                'forma_pagamento' => 'PIX',
                'condicao_pagamento' => '28 DDL',
            ],
            'result_snapshot' => [],
            'prazo_entrega_dias' => 5,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 0,
        ]);

        $dup = $this->withHeaders($h)->postJson('/api/v1/orcamentos/'.$stub->id.'/duplicar');
        $dup->assertStatus(422);
        $dup->assertJsonPath(
            'errors.orcamento.0',
            'Este orçamento aprovado não tem características comerciais completas para copiar. O aprovado permanece intacto.',
        );
        $this->assertArrayHasKey('produto_id', $dup->json('errors'));
        $this->assertSame(1, Orcamento::query()->count());
        $this->assertSame(Orcamento::STATUS_APROVADO, $stub->fresh()->status);
    }

    public function test_bloqueia_edicao_apos_enviado(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $id = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $this->payload())->json('data.id');
        Orcamento::query()->whereKey($id)->update(['status' => Orcamento::STATUS_ENVIADO]);

        $update = $this->withHeaders($h)->putJson('/api/v1/orcamentos/'.$id, $this->payload());
        $update->assertStatus(422);

        $delete = $this->withHeaders($h)->deleteJson('/api/v1/orcamentos/'.$id);
        $delete->assertStatus(422);
    }

    public function test_parceiro_obrigatorio_e_escopo_empresa(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $bad = $this->payload();
        unset($bad['parceiro_id']);
        $this->withHeaders($h)->postJson('/api/v1/orcamentos', $bad)->assertStatus(422);

        $cross = $this->payload();
        $cross['parceiro_id'] = Parceiro::query()
            ->where('empresa_id', $this->outraEmpresa->id)
            ->value('id');
        $this->withHeaders($h)->postJson('/api/v1/orcamentos', $cross)->assertStatus(422);
    }

    public function test_rbac_consulta_nao_escreve(): void
    {
        Sanctum::actingAs($this->consulta);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)->getJson('/api/v1/orcamentos/catalogo')->assertOk();
        $this->withHeaders($h)->postJson('/api/v1/orcamentos', $this->payload())->assertForbidden();
    }

    public function test_orcamento_com_prospect_e_faca_nova(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $prospect = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-00077',
            'razao_social' => 'Prospect Alpha',
            'is_prospect' => true,
            'situacao' => 'ATIVO',
            'municipio' => 'Betim',
            'uf' => 'MG',
            'whatsapp' => '31988887777',
        ]);

        $payload = $this->payload();
        $payload['parceiro_id'] = $prospect->id;
        $payload['faca_nova'] = true;
        $payload['formato_faca'] = 'OVAL';
        $payload['valor_faca_nova'] = 800;
        $payload['prazo_faca_dias'] = 10;

        $res = $this->withHeaders($h)->postJson('/api/v1/orcamentos/calcular', $payload);
        $res->assertOk();
        $this->assertTrue($res->json('data.faca_nova'));
        $this->assertEqualsWithDelta(800.0, (float) $res->json('data.valor_faca_nova'), 0.01);
        $this->assertSame(10, $res->json('data.prazo_faca_dias'));
        // motor BRAHVA intacto
        $this->assertEqualsWithDelta(2460.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
        $this->assertEqualsWithDelta(3796.0, (float) $res->json('data.faixas.0.valor_total_com_faca'), 0.01);

        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $payload);
        $create->assertCreated();
        $this->assertTrue($create->json('data.parceiro.is_prospect'));
        $this->assertTrue($create->json('data.input_snapshot.faca_nova'));
        $this->assertEqualsWithDelta(800.0, (float) $create->json('data.input_snapshot.valor_faca_nova'), 0.01);
        $this->assertIsArray($create->json('data.input_snapshot.facas'));
        $this->assertCount(1, $create->json('data.input_snapshot.facas'));
    }

    public function test_etiqueta_rejeita_duas_facas_na_escrita(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $payload = $this->payload();
        $payload['facas'] = $this->duasFacasPayload();

        $this->withHeaders($h)
            ->postJson('/api/v1/orcamentos/calcular', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['facas']);

        $this->withHeaders($h)
            ->postJson('/api/v1/orcamentos', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['facas']);
    }

    public function test_legado_com_extras_salva_sem_crescer(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $uma = $this->duasFacasPayload()[0];
        $payload = $this->payload();
        $payload['facas'] = [$uma];
        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $payload);
        $create->assertCreated();
        $id = (int) $create->json('data.id');

        $orc = Orcamento::query()->with('itens')->findOrFail($id);
        $input = is_array($orc->input_snapshot) ? $orc->input_snapshot : [];
        $input['facas'] = $this->duasFacasPayload();
        $orc->input_snapshot = $input;
        $orc->save();
        $item = $orc->itens->first();
        $this->assertNotNull($item);
        $itemIn = is_array($item->input_snapshot) ? $item->input_snapshot : [];
        $itemIn['facas'] = $input['facas'];
        $item->input_snapshot = $itemIn;
        $item->save();

        $keep = $this->payload();
        $keep['facas'] = $this->duasFacasPayload();
        $ok = $this->withHeaders($h)->putJson('/api/v1/orcamentos/'.$id, $keep);
        $ok->assertOk();
        $this->assertCount(2, $ok->json('data.input_snapshot.facas'));

        $grow = $this->payload();
        $grow['facas'] = array_merge($this->duasFacasPayload(), [[
            'principal' => false,
            'formato' => 'CIRCULO',
            'medida' => '20X20',
            'valor_faca' => 10,
        ]]);
        $this->withHeaders($h)
            ->putJson('/api/v1/orcamentos/'.$id, $grow)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['facas']);
    }

    public function test_snapshot_condicoes_comerciais_no_input(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->parceiro->update([
            'condicao_pagamento' => '28 DDL',
            'forma_pagamento' => 'PIX',
        ]);

        $payload = $this->payload();
        $payload['condicao_pagamento'] = '14/28/42';
        $payload['forma_pagamento'] = 'Boleto';

        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $payload);
        $create->assertCreated();
        $this->assertSame('14/28/42', $create->json('data.input_snapshot.condicao_pagamento'));
        $this->assertSame('Boleto', $create->json('data.input_snapshot.forma_pagamento'));
        // motor de preço intacto
        $this->assertEqualsWithDelta(2460.0, (float) $create->json('data.result_snapshot.faixas.0.valor_etiqueta'), 0.01);
    }

    public function test_modelos_composicao_persiste_e_nao_altera_preco(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $payload = $this->payload();
        $payload['modelos'] = 2;
        $payload['modelos_composicao'] = [
            ['nome' => 'maçã verde', 'percentual' => 30, 'tintas' => ['Pantone 354', 'Preto']],
            ['nome' => 'abacate', 'percentual' => 70],
        ];

        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $payload);
        $create->assertCreated();
        $comp = $create->json('data.input_snapshot.modelos_composicao');
        $this->assertCount(2, $comp);
        $this->assertSame('maçã verde', $comp[0]['nome']);
        $this->assertEqualsWithDelta(30.0, (float) $comp[0]['percentual'], 0.01);
        $this->assertSame('abacate', $comp[1]['nome']);
        $this->assertEqualsWithDelta(70.0, (float) $comp[1]['percentual'], 0.01);
        $this->assertEqualsWithDelta(0.0, (float) ($comp[0]['valor_arte'] ?? 0), 0.01);
        $this->assertSame(['Pantone 354', 'Preto'], $comp[0]['tintas']);
        $this->assertSame([], $comp[1]['tintas']);
        // Preço com 2 modelos (não 7 do fixture) — só garante persistência + cálculo OK
        $this->assertIsNumeric($create->json('data.result_snapshot.faixas.0.valor_etiqueta'));

        $bad = $this->payload();
        $bad['modelos'] = 2;
        $bad['modelos_composicao'] = [
            ['nome' => 'a', 'percentual' => 40],
            ['nome' => 'b', 'percentual' => 40],
        ];
        $this->withHeaders($h)->postJson('/api/v1/orcamentos', $bad)->assertStatus(422);
    }

    public function test_valor_arte_por_modelo_soma_no_total_sem_alterar_motor(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $base = $this->payload();
        $base['modelos'] = 2;
        $base['modelos_composicao'] = [
            ['nome' => 'maçã verde', 'percentual' => 30, 'valor_arte' => 0],
            ['nome' => 'abacate', 'percentual' => 70, 'valor_arte' => 0],
        ];
        $semArte = $this->withHeaders($h)->postJson('/api/v1/orcamentos/calcular', $base);
        $semArte->assertOk();
        $valorMotor = (float) $semArte->json('data.faixas.0.valor_total');
        $etiqueta = (float) $semArte->json('data.faixas.0.valor_etiqueta');

        $comArte = $base;
        $comArte['modelos_composicao'] = [
            ['nome' => 'maçã verde', 'percentual' => 30, 'valor_arte' => 150],
            ['nome' => 'abacate', 'percentual' => 70, 'valor_arte' => 50],
        ];
        $res = $this->withHeaders($h)->postJson('/api/v1/orcamentos/calcular', $comArte);
        $res->assertOk();
        $this->assertEqualsWithDelta(200.0, (float) $res->json('data.valor_artes'), 0.01);
        $this->assertEqualsWithDelta($etiqueta, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
        $this->assertEqualsWithDelta($valorMotor, (float) $res->json('data.faixas.0.valor_total'), 0.01);
        $this->assertEqualsWithDelta(
            $valorMotor + 200.0,
            (float) $res->json('data.faixas.0.valor_total_com_faca'),
            0.01
        );
        $this->assertEqualsWithDelta(
            $valorMotor + 200.0,
            (float) $res->json('data.faixas.0.valor_total_proposta'),
            0.01
        );

        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $comArte);
        $create->assertCreated();
        $comp = $create->json('data.input_snapshot.modelos_composicao');
        $this->assertEqualsWithDelta(150.0, (float) $comp[0]['valor_arte'], 0.01);
        $this->assertEqualsWithDelta(50.0, (float) $comp[1]['valor_arte'], 0.01);
        $this->assertEqualsWithDelta(200.0, (float) $create->json('data.result_snapshot.valor_artes'), 0.01);
    }

    public function test_faca_posicao_persiste_no_snapshot_sem_alterar_preco(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $payload = $this->payload();
        $payload['faca_posicao'] = 'CIMA';

        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $payload);
        $create->assertCreated();
        $this->assertSame('CIMA', $create->json('data.input_snapshot.faca_posicao'));
        $this->assertEqualsWithDelta(2460.0, (float) $create->json('data.result_snapshot.faixas.0.valor_etiqueta'), 0.01);

        $this->withHeaders($h)
            ->postJson('/api/v1/orcamentos', array_merge($payload, ['faca_posicao' => 'INVALIDO']))
            ->assertStatus(422);
    }

    public function test_saida_etiqueta_persiste_no_snapshot_sem_alterar_preco(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $payload = $this->payload();
        $payload['saida_etiqueta'] = 'DEITADA';

        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $payload);
        $create->assertCreated();
        $this->assertSame('DEITADA', $create->json('data.input_snapshot.saida_etiqueta'));
        $this->assertEqualsWithDelta(2460.0, (float) $create->json('data.result_snapshot.faixas.0.valor_etiqueta'), 0.01);

        $this->withHeaders($h)
            ->postJson('/api/v1/orcamentos', array_merge($payload, ['saida_etiqueta' => 'INVALIDO']))
            ->assertStatus(422);

        foreach (['ESQUERDA', 'DIREITA', 'PE'] as $codigo) {
            $ok = $this->withHeaders($h)
                ->postJson('/api/v1/orcamentos', array_merge($payload, ['saida_etiqueta' => $codigo]));
            $ok->assertCreated();
            $this->assertSame($codigo, $ok->json('data.input_snapshot.saida_etiqueta'));
        }
    }

    public function test_multi_item_create_dois_jobs_flat_espelha_item1(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $payload = array_merge($this->headerPayload(), [
            'itens' => [
                array_merge($this->jobPayload(), ['rotulo' => 'Posição A']),
                array_merge($this->jobPayload(), [
                    'rotulo' => 'Posição B',
                    'medida' => '60X40',
                    'largura_cm' => 62,
                ]),
            ],
        ]);

        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $payload);
        $create->assertCreated();
        $id = $create->json('data.id');

        $this->assertSame($create->json('data.input_snapshot.medida'), $create->json('data.itens.0.input_snapshot.medida'));
        $this->assertSame('Posição A', $create->json('data.itens.0.rotulo'));
        $this->assertSame('60X40', $create->json('data.itens.1.input_snapshot.medida'));
        $this->assertSame(2, OrcamentoItem::query()->where('orcamento_id', $id)->count());
        $this->assertSame(2, $create->json('data.result_snapshot.totais.n_itens'));
        $this->assertGreaterThan(
            (float) $create->json('data.result_snapshot.faixas.0.valor_total_proposta'),
            (float) $create->json('data.result_snapshot.totais.soma_primeira_faixa_proposta'),
        );

        $calc = $this->withHeaders($h)->postJson('/api/v1/orcamentos/calcular', $payload);
        $calc->assertOk();
        $this->assertCount(2, $calc->json('data.itens'));
        $this->assertSame(2, $calc->json('data.totais.n_itens'));
        $this->assertGreaterThan(0, (float) $calc->json('data.totais.soma_primeira_faixa_proposta'));
        $this->assertEqualsWithDelta(
            (float) $calc->json('data.itens.0.result.faixas.0.valor_total_proposta')
                + (float) $calc->json('data.itens.1.result.faixas.0.valor_total_proposta'),
            (float) $calc->json('data.totais.soma_primeira_faixa_proposta'),
            0.02,
        );
    }

    public function test_caixa_escolhida_troca_a_medida_e_preserva_preco_e_quantidade(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $base = $this->withHeaders($h)->postJson('/api/v1/orcamentos/calcular', $this->payload());
        $base->assertOk();
        $preco = $base->json('data.faixas.0.valor_etiqueta');
        $this->assertSame(0, $base->json('data.faixas.0.qtde_caixas'));
        $this->assertEquals(0, $base->json('data.faixas.0.valor_caixa'));
        $this->assertNull($base->json('data.faixas.0.caixa_medida'));

        $escolhida = $this->payload();
        $escolhida['caixa_medida'] = '250x200x200';
        $res = $this->withHeaders($h)->postJson('/api/v1/orcamentos/calcular', $escolhida);
        $res->assertOk();
        $this->assertNull($res->json('data.faixas.0.caixa_medida'));
        $this->assertEquals($preco, $res->json('data.faixas.0.valor_etiqueta'));
        $this->assertSame(0, $res->json('data.faixas.0.qtde_caixas'));
        $this->assertEquals(0, $res->json('data.faixas.0.valor_caixa'));

        $ruim = $this->payload();
        $ruim['caixa_medida'] = 'caixa';
        $this->withHeaders($h)->postJson('/api/v1/orcamentos/calcular', $ruim)->assertStatus(422);
    }

    public function test_caixas_rolo_lista_as_que_acomodam_a_face(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        $this->caixa('EMB-CX-002', '250', '200', '200');
        $this->caixa('EMB-CX-007', '500', '300', '300');
        Produto::query()->create([
            'empresa_id' => $this->outraEmpresa->id,
            'codigo' => 'EMB-CX-009',
            'familia' => 'EMB',
            'descricao_fiscal' => 'CAIXA DE OUTRA EMPRESA',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'atributos' => ['comp_mm' => '540', 'larg_mm' => '405', 'alt_mm' => '335'],
        ]);

        $res = $this->withHeaders($h)->getJson('/api/v1/orcamentos/caixas-rolo?largura_cm=30');
        $res->assertOk();
        $this->assertSame('300', $res->json('data.largura_mm'));
        $linhas = collect($res->json('data.caixas'));
        $this->assertCount(2, $linhas);
        $this->assertFalse($linhas->firstWhere('codigo', 'EMB-CX-002')['cabe']);
        $this->assertTrue($linhas->firstWhere('codigo', 'EMB-CX-007')['cabe']);
    }

    private function caixa(string $codigo, string $comp, string $larg, string $alt): void
    {
        Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => $codigo,
            'familia' => 'EMB',
            'descricao_fiscal' => 'CAIXA '.$codigo,
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'atributos' => ['comp_mm' => $comp, 'larg_mm' => $larg, 'alt_mm' => $alt],
        ]);
    }

    /** @return array<string, mixed> */
    private function headerPayload(): array
    {
        return [
            'parceiro_id' => $this->parceiro->id,
            'prazo_entrega_dias' => 12,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
            'tipo_operacao' => 'INDUSTRIALIZACAO',
        ];
    }

    /** @return array<string, mixed> */
    private function jobPayload(array $overrides = []): array
    {
        $p = $this->payload();
        foreach (OrcamentoItens::HEADER_KEYS as $key) {
            unset($p[$key]);
        }

        return array_merge($p, $overrides);
    }
}
