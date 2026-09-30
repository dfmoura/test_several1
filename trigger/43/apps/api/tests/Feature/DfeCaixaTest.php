<?php

namespace Tests\Feature;

use App\Models\DfeDocumento;
use App\Models\Empresa;
use App\Models\User;
use App\Support\ImplantacaoCatalogo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class DfeCaixaTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalogo_tem_f5_dfe_cx(): void
    {
        $this->assertTrue(ImplantacaoCatalogo::existe('F5_DFE_CX'));
        $item = ImplantacaoCatalogo::porCodigo()['F5_DFE_CX'];
        $this->assertSame('/compras/nfe-destinadas', $item['rota']);
        $this->assertSame(5, $item['onda']);
    }

    public function test_lista_local_isolamento_emp_e_filtro_ano(): void
    {
        Permission::findOrCreate('compras.ler', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-DFE1',
            'razao_social' => 'Empresa DF-e',
            'nome_fantasia' => 'DFE',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $outra = Empresa::query()->create([
            'codigo' => 'EMP-DFE2',
            'razao_social' => 'Outra DF-e',
            'nome_fantasia' => 'Outra',
            'cnpj' => '44555666000199',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-DFE1',
            'name' => 'Compras DFE',
            'email' => 'dfe@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['compras.ler']);
        $user->empresas()->attach([$empresa->id, $outra->id]);

        $anoAtual = (int) now()->year;

        DfeDocumento::query()->create([
            'empresa_id' => $empresa->id,
            'nsu' => '1',
            'chave' => str_repeat('1', 44),
            'numero' => '100',
            'emit_nome' => 'Fornecedor Alfa',
            'emit_cnpj' => '12345678000199',
            'data_emissao' => sprintf('%d-03-15', $anoAtual),
            'valor_total' => '1500.50',
            'situacao' => DfeDocumento::SITUACAO_DISPONIVEL,
        ]);

        DfeDocumento::query()->create([
            'empresa_id' => $empresa->id,
            'nsu' => '2',
            'chave' => str_repeat('2', 44),
            'numero' => '99',
            'emit_nome' => 'Fornecedor Antigo',
            'data_emissao' => sprintf('%d-06-01', $anoAtual - 1),
            'valor_total' => '10.00',
            'situacao' => DfeDocumento::SITUACAO_NOVA,
        ]);

        DfeDocumento::query()->create([
            'empresa_id' => $outra->id,
            'nsu' => '1',
            'chave' => str_repeat('3', 44),
            'numero' => '777',
            'emit_nome' => 'Outra EMP',
            'data_emissao' => sprintf('%d-01-10', $anoAtual),
            'situacao' => DfeDocumento::SITUACAO_DISPONIVEL,
        ]);

        DfeDocumento::query()->create([
            'empresa_id' => $empresa->id,
            'nsu' => '3',
            'chave' => str_repeat('4', 44),
            'numero' => '101',
            'emit_nome' => 'Sem Emissao',
            'data_emissao' => null,
            'situacao' => DfeDocumento::SITUACAO_NOVA,
        ]);

        Sanctum::actingAs($user);

        $lista = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/dfe-documentos')
            ->assertOk()
            ->assertJsonPath('meta.ano', $anoAtual)
            ->assertJsonPath('meta.sync.sync_status', 'IDLE')
            ->assertJsonCount(2, 'data');

        $porNome = collect($lista->json('data'))->keyBy('emit_nome');
        $this->assertTrue($porNome->has('Fornecedor Alfa'));
        $this->assertTrue($porNome->has('Sem Emissao'));
        $this->assertFalse($porNome->has('Fornecedor Antigo'));
        $this->assertFalse($porNome['Fornecedor Alfa']['tem_xml']);
        $this->assertSame('nao_cadastrado', $porNome['Fornecedor Alfa']['fornecedor']['status']);
        $this->assertArrayNotHasKey('xml_path', $porNome['Fornecedor Alfa']);

        $this->withHeader('X-Empresa-Id', (string) $outra->id)
            ->getJson('/api/v1/dfe-documentos')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.emit_nome', 'Outra EMP');

        $idAlfa = (int) $porNome['Fornecedor Alfa']['id'];

        $this->withHeader('X-Empresa-Id', (string) $outra->id)
            ->getJson("/api/v1/dfe-documentos/{$idAlfa}")
            ->assertNotFound();

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson("/api/v1/dfe-documentos/{$idAlfa}")
            ->assertOk()
            ->assertJsonPath('data.chave', str_repeat('1', 44));

        $anoAnterior = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/dfe-documentos?ano='.($anoAtual - 1))
            ->assertOk()
            ->assertJsonCount(2, 'data');
        $nomesAnoAnterior = collect($anoAnterior->json('data'))->pluck('emit_nome')->all();
        $this->assertContains('Fornecedor Antigo', $nomesAnoAnterior);
        $this->assertContains('Sem Emissao', $nomesAnoAnterior);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/dfe-sync')
            ->assertOk()
            ->assertJsonPath('data.total_documentos', 3)
            ->assertJsonPath('data.ano_alvo_hidratacao', $anoAtual);
    }

    public function test_sem_permissao_compras_retorna_403(): void
    {
        Permission::findOrCreate('compras.ler', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-DFE3',
            'razao_social' => 'Sem Perm',
            'nome_fantasia' => 'SP',
            'cnpj' => '99888777000166',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-DFE3',
            'name' => 'Sem Compras',
            'email' => 'sem@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->empresas()->attach([$empresa->id]);

        Sanctum::actingAs($user);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/dfe-documentos')
            ->assertForbidden();
    }
}
