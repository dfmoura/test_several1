<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProspectRapidoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $comercial;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('orcamento.ler', 'web');
        Permission::findOrCreate('orcamento.escrever', 'web');
        Permission::findOrCreate('parceiro.ler', 'web');

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-PR1',
            'razao_social' => 'Empresa Prospect',
            'nome_fantasia' => 'PR',
            'cnpj' => '00000000000353',
            'situacao' => 'ATIVA',
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-PR1',
            'name' => 'Comercial Prospect',
            'email' => 'comercial.prospect@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['orcamento.ler', 'orcamento.escrever', 'parceiro.ler']);
        $this->comercial->empresas()->attach($this->empresa->id);
    }

    public function test_cria_prospect_minimo_sem_papel_cliente(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $res = $this->withHeaders($h)->postJson('/api/v1/parceiros/prospect-rapido', [
            'nome' => 'Padaria do João',
            'whatsapp' => '31999998888',
            'municipio' => 'Belo Horizonte',
            'uf' => 'MG',
        ]);

        $res->assertCreated();
        $this->assertTrue($res->json('data.is_prospect'));
        $this->assertFalse($res->json('data.papel_cliente'));
        $this->assertSame('Padaria do João', $res->json('data.razao_social'));
        $this->assertSame('MG', $res->json('data.uf'));
        $this->assertMatchesRegularExpression('/^PAR-\d{5}$/', $res->json('data.codigo'));
    }

    public function test_antiduplicidade_retorna_409_e_forcar_cria(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-00009',
            'razao_social' => 'Padaria do João',
            'whatsapp' => '31999998888',
            'is_prospect' => true,
            'situacao' => 'ATIVO',
        ]);

        $dup = $this->withHeaders($h)->postJson('/api/v1/parceiros/prospect-rapido', [
            'nome' => 'Padaria do João',
            'whatsapp' => '31999998888',
            'municipio' => 'Contagem',
            'uf' => 'MG',
        ]);
        $dup->assertStatus(409);
        $this->assertNotEmpty($dup->json('candidatos'));

        $force = $this->withHeaders($h)->postJson('/api/v1/parceiros/prospect-rapido', [
            'nome' => 'Padaria do João Ltda',
            'whatsapp' => '31999998888',
            'municipio' => 'Contagem',
            'uf' => 'MG',
            'forcar' => true,
        ]);
        $force->assertCreated();
        $this->assertSame(2, Parceiro::query()->where('empresa_id', $this->empresa->id)->count());
    }

    public function test_lista_orcavel_inclui_prospect(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-00010',
            'razao_social' => 'Cliente OK',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);
        Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-00011',
            'razao_social' => 'Prospect OK',
            'is_prospect' => true,
            'situacao' => 'ATIVO',
        ]);
        Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-00012',
            'razao_social' => 'Só fornecedor',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
        ]);

        $res = $this->withHeaders($h)->getJson('/api/v1/parceiros?papel=orcavel');
        $res->assertOk();
        $nomes = collect($res->json('data'))->pluck('razao_social')->all();
        $this->assertContains('Cliente OK', $nomes);
        $this->assertContains('Prospect OK', $nomes);
        $this->assertNotContains('Só fornecedor', $nomes);
    }

    public function test_exige_contato(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)->postJson('/api/v1/parceiros/prospect-rapido', [
            'nome' => 'Sem contato',
            'municipio' => 'BH',
            'uf' => 'MG',
        ])->assertStatus(422);
    }

    public function test_nao_colide_com_codigo_explicito_do_seed(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        // Cenário real: seed cria PAR-00010 e deixa sequência em 10 (ou atrasada).
        Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-00010',
            'razao_social' => 'CLIENTE EXEMPLO LTDA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);
        \App\Models\CodigoSequence::query()->create([
            'empresa_id' => $this->empresa->id,
            'prefixo' => 'PAR',
            'proximo' => 10,
        ]);

        $res = $this->withHeaders($h)->postJson('/api/v1/parceiros/prospect-rapido', [
            'nome' => 'camilo',
            'whatsapp' => '(34)98888-3512',
            'email' => 'camilo@novo.com',
            'municipio' => 'uberlandia',
            'uf' => 'MG',
        ]);

        $res->assertCreated();
        $this->assertSame('PAR-00011', $res->json('data.codigo'));
    }

    public function test_persiste_endereco_origem_e_whatsapp_so_digitos(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $res = $this->withHeaders($h)->postJson('/api/v1/parceiros/prospect-rapido', [
            'nome' => 'Padaria Centro',
            'whatsapp' => '(34) 98888-3512',
            'cep' => '38400-123',
            'logradouro' => 'Rua das Flores',
            'numero' => '100',
            'complemento' => 'Loja 2',
            'bairro' => 'Centro',
            'municipio' => 'Uberlândia',
            'uf' => 'MG',
            'ibge' => '3170206',
            'origem_lead' => 'WhatsApp',
        ]);

        $res->assertCreated();
        $this->assertSame('34988883512', $res->json('data.whatsapp'));
        $this->assertSame('38400123', $res->json('data.cep'));
        $this->assertSame('Rua das Flores', $res->json('data.logradouro'));
        $this->assertSame('100', $res->json('data.numero'));
        $this->assertSame('Loja 2', $res->json('data.complemento'));
        $this->assertSame('Centro', $res->json('data.bairro'));
        $this->assertSame('Uberlândia', $res->json('data.municipio'));
        $this->assertSame('3170206', $res->json('data.ibge'));
        $this->assertSame('WhatsApp', $res->json('data.origem_lead'));
    }

    public function test_origem_lead_invalida_retorna_422(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)->postJson('/api/v1/parceiros/prospect-rapido', [
            'nome' => 'Lead ruim',
            'whatsapp' => '31999998888',
            'municipio' => 'BH',
            'uf' => 'MG',
            'origem_lead' => 'panfleto-na-porta',
        ])->assertStatus(422);
    }
}
