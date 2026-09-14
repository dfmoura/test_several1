<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\NfeEntrada;
use App\Models\OrdemCompra;
use App\Models\Parceiro;
use App\Models\User;
use App\Support\ImplantacaoCatalogo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class NfeEntradaConsultaTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalogo_f5_nfe_ent_aponta_consulta(): void
    {
        $this->assertTrue(ImplantacaoCatalogo::existe('F5_NFE_ENT'));
        $item = ImplantacaoCatalogo::porCodigo()['F5_NFE_ENT'];
        $this->assertSame('/compras/nfe-recebidas', $item['rota']);
    }

    public function test_lista_detalhe_xml_isolamento_emp(): void
    {
        Permission::findOrCreate('compras.ler', 'web');
        Storage::fake('local');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-NFR1',
            'razao_social' => 'Empresa NF Recebida',
            'nome_fantasia' => 'NFR',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $outra = Empresa::query()->create([
            'codigo' => 'EMP-NFR2',
            'razao_social' => 'Outra NF Recebida',
            'nome_fantasia' => 'Outra',
            'cnpj' => '44555666000199',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $fornecedor = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-NFR1',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '12345678000199',
            'razao_social' => 'Fornecedor Alfa',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
        ]);

        $oc = OrdemCompra::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'OC-NFR-1',
            'fornecedor_id' => $fornecedor->id,
            'status' => 'RECEBIDA',
            'origem' => 'DIRETA',
            'valor_total' => '1500.50',
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-NFR1',
            'name' => 'Compras NFR',
            'email' => 'nfr@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['compras.ler']);
        $user->empresas()->attach([$empresa->id, $outra->id]);

        $anoAtual = (int) now()->year;
        $chave = str_repeat('1', 44);
        $path = sprintf('nfe-entradas/%d/%s.xml', $empresa->id, $chave);
        Storage::disk('local')->put($path, '<?xml version="1.0"?><nfe>ok</nfe>');

        $entrada = NfeEntrada::query()->create([
            'empresa_id' => $empresa->id,
            'ordem_compra_id' => $oc->id,
            'fornecedor_id' => $fornecedor->id,
            'chave' => $chave,
            'modelo' => '55',
            'serie' => '1',
            'numero' => '100',
            'data_emissao' => sprintf('%d-03-15', $anoAtual),
            'nat_op' => 'Compra',
            'emit_cnpj' => '12345678000199',
            'emit_nome' => 'Fornecedor Alfa',
            'totais' => ['v_nf' => '1500.50'],
            'xml_path' => $path,
            'xml_sha256' => hash('sha256', '<?xml version="1.0"?><nfe>ok</nfe>'),
        ]);

        NfeEntrada::query()->create([
            'empresa_id' => $empresa->id,
            'chave' => str_repeat('2', 44),
            'modelo' => '55',
            'serie' => '1',
            'numero' => '99',
            'data_emissao' => sprintf('%d-06-01', $anoAtual - 1),
            'emit_nome' => 'Fornecedor Antigo',
            'totais' => ['v_nf' => '10.00'],
            'xml_path' => 'nfe-entradas/'.$empresa->id.'/antigo.xml',
            'xml_sha256' => hash('sha256', 'x'),
        ]);

        NfeEntrada::query()->create([
            'empresa_id' => $outra->id,
            'chave' => str_repeat('3', 44),
            'modelo' => '55',
            'numero' => '777',
            'data_emissao' => sprintf('%d-01-10', $anoAtual),
            'emit_nome' => 'Outra EMP',
            'totais' => ['v_nf' => '1.00'],
            'xml_path' => 'nfe-entradas/'.$outra->id.'/outra.xml',
            'xml_sha256' => hash('sha256', 'y'),
        ]);

        Sanctum::actingAs($user);

        $lista = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/nfe-entradas')
            ->assertOk()
            ->assertJsonPath('meta.ano', $anoAtual)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.emit_nome', 'Fornecedor Alfa')
            ->assertJsonPath('data.0.numero', '100')
            ->assertJsonPath('data.0.valor_nf', '1500.50')
            ->assertJsonPath('data.0.ordem_compra.codigo', 'OC-NFR-1')
            ->assertJsonPath('data.0.xml_armazenado', true);

        $this->assertArrayNotHasKey('xml_path', $lista->json('data.0'));
        $this->assertArrayNotHasKey('espelho', $lista->json('data.0'));

        $this->withHeader('X-Empresa-Id', (string) $outra->id)
            ->getJson('/api/v1/nfe-entradas')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.emit_nome', 'Outra EMP');

        $this->withHeader('X-Empresa-Id', (string) $outra->id)
            ->getJson('/api/v1/nfe-entradas/'.$entrada->id)
            ->assertNotFound();

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/nfe-entradas/'.$entrada->id)
            ->assertOk()
            ->assertJsonPath('data.chave', $chave)
            ->assertJsonPath('data.espelho.numero', '100')
            ->assertJsonPath('data.ordem_compra.codigo', 'OC-NFR-1');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/nfe-entradas?ano='.($anoAtual - 1))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.emit_nome', 'Fornecedor Antigo');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->get('/api/v1/nfe-entradas/'.$entrada->id.'/xml')
            ->assertOk()
            ->assertHeader('content-type', 'application/xml; charset=utf-8');
    }

    public function test_sem_permissao_compras_retorna_403(): void
    {
        Permission::findOrCreate('compras.ler', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-NFR3',
            'razao_social' => 'Sem Perm',
            'nome_fantasia' => 'SP',
            'cnpj' => '99888777000166',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-NFR3',
            'name' => 'Sem Perm',
            'email' => 'nfr3@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->empresas()->attach($empresa->id);

        Sanctum::actingAs($user);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/nfe-entradas')
            ->assertForbidden();
    }
}
