<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\NaturezaGerencial;
use App\Models\User;
use App\Services\Cadastros\NaturezaGerencialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class NaturezaGerencialTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $financeiro;

    private User $consulta;

    private User $comercial;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('natureza_gerencial.ler', 'web');
        Permission::findOrCreate('natureza_gerencial.escrever', 'web');

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-NAT1',
            'razao_social' => 'Empresa Naturezas',
            'nome_fantasia' => 'Nat',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
        ]);

        $this->financeiro = $this->makeUser('USR-NAT1', 'fin.nat@test.local');
        $this->financeiro->givePermissionTo(['natureza_gerencial.ler', 'natureza_gerencial.escrever']);

        $this->consulta = $this->makeUser('USR-NAT2', 'consulta.nat@test.local');
        $this->consulta->givePermissionTo('natureza_gerencial.ler');

        $this->comercial = $this->makeUser('USR-NAT3', 'com.nat@test.local');

        app(NaturezaGerencialService::class)->seedCatalog();
    }

    private function makeUser(string $codigo, string $email): User
    {
        $user = User::query()->create([
            'codigo' => $codigo,
            'name' => $codigo,
            'email' => $email,
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $user->empresas()->attach($this->empresa->id, ['padrao' => true]);

        return $user;
    }

    private function as(User $user)
    {
        Sanctum::actingAs($user);

        return $this->withHeader('X-Empresa-Id', (string) $this->empresa->id);
    }

    public function test_index_arvore_requer_permissao(): void
    {
        $this->as($this->comercial)
            ->getJson('/api/v1/naturezas-gerenciais')
            ->assertForbidden();

        $res = $this->as($this->consulta)
            ->getJson('/api/v1/naturezas-gerenciais')
            ->assertOk()
            ->json('data');

        $this->assertNotEmpty($res);
        $this->assertSame('1', $res[0]['codigo']);
        $this->assertArrayHasKey('children', $res[0]);
    }

    public function test_patch_nome_e_ativo_requer_escrever(): void
    {
        $n = NaturezaGerencial::query()->where('codigo', '1.01.01')->firstOrFail();

        $this->as($this->consulta)
            ->patchJson("/api/v1/naturezas-gerenciais/{$n->id}", ['nome' => 'X'])
            ->assertForbidden();

        $this->as($this->financeiro)
            ->patchJson("/api/v1/naturezas-gerenciais/{$n->id}", [
                'nome' => 'Venda PA etiquetas',
                'ativo' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.nome', 'Venda PA etiquetas')
            ->assertJsonPath('data.ativo', false)
            ->assertJsonPath('data.codigo', '1.01.01');
    }

    public function test_consulta_so_folhas_ativas(): void
    {
        $n = NaturezaGerencial::query()->where('codigo', '1.01.02')->firstOrFail();
        $n->update(['ativo' => false]);

        $data = $this->as($this->consulta)
            ->getJson('/api/v1/consulta/naturezas-gerenciais?grupo=1')
            ->assertOk()
            ->json('data');

        $codigos = collect($data)->pluck('codigo')->all();
        $this->assertContains('1.01.01', $codigos);
        $this->assertNotContains('1.01.02', $codigos);
        $this->assertNotContains('1', $codigos);
        $this->assertNotContains('1.01', $codigos);

        foreach ($data as $row) {
            $this->assertTrue($row['aceita_lancamento']);
            $this->assertTrue($row['ativo']);
            $this->assertSame(1, $row['grupo']);
        }
    }
}
