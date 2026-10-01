<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueMovimento;
use App\Models\NfseTomada;
use App\Models\Parceiro;
use App\Models\User;
use App\Services\Consulta\BrasilApiClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class NfsePrestadorCadastroTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['compras.ler', 'compras.escrever', 'parceiro.ler', 'parceiro.escrever'] as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-NFSEP',
            'razao_social' => 'Empresa tomadora',
            'nome_fantasia' => 'Tomadora',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-NFSEP',
            'name' => 'Compras NFS-e',
            'email' => 'nfse-prest@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo([
            'compras.ler', 'compras.escrever',
            'parceiro.ler', 'parceiro.escrever',
        ]);
        $this->user->empresas()->attach($this->empresa->id);

        $brasil = $this->createMock(BrasilApiClient::class);
        $brasil->method('getCnpj')->willReturn([
            'razao_social' => 'ESCRITORIO ALFA LTDA',
            'nome_fantasia' => 'ALFA',
            'logradouro' => 'RUA DAS FLORES',
            'numero' => '100',
            'bairro' => 'CENTRO',
            'municipio' => 'BELO HORIZONTE',
            'uf' => 'MG',
            'cep' => '30130000',
            'ibge' => '3106200',
            'telefone' => '3130000000',
            'regime_sugerido' => 'PRESUMIDO',
            'cnae' => '6920601',
        ]);
        $brasil->method('getCep')->willReturn([
            'ibge' => '3106200',
            'localidade' => 'Belo Horizonte',
            'uf' => 'MG',
        ]);
        $this->app->instance(BrasilApiClient::class, $brasil);
    }

    public function test_lista_indica_cadastro_filtra_ano_e_cnpj_mascarado(): void
    {
        Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-ALFA',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '34661762000150',
            'razao_social' => 'ESCRITORIO ALFA LTDA',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        $this->nota('1', '34661762000150', 'ESCRITORIO ALFA LTDA', '2026-03-01', true);
        $this->nota('2', '11222333000181', 'Beta Servicos', '2024-01-10', true);
        $this->nota('3', '12345678901', 'Pessoa Fisica', '2026-02-01', false);
        NfseTomada::query()->create([
            'empresa_id' => $this->empresa->id,
            'nsu' => '4',
            'tipo_documento' => 'NFSE',
            'numero' => '4',
            'emit_cnpj' => '11222333000181',
            'emit_nome' => 'Sem data',
            'situacao' => NfseTomada::SITUACAO_CAIXA,
            'data_emissao' => null,
        ]);

        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $lista = $this->withHeaders($h)->getJson('/api/v1/nfse-tomadas?situacao=NA_CAIXA')->assertOk();
        $porNsu = collect($lista->json('data'))->keyBy('nsu');
        $this->assertSame('cadastrado', $porNsu['1']['prestador']['status']);
        $this->assertSame('PAR-ALFA', $porNsu['1']['prestador']['codigo']);
        $this->assertFalse($porNsu['1']['prestador']['pode_cadastrar']);
        $this->assertSame('nao_cadastrado', $porNsu['2']['prestador']['status']);
        $this->assertTrue($porNsu['2']['prestador']['pode_cadastrar']);
        $this->assertSame('pf', $porNsu['3']['prestador']['status']);
        $this->assertFalse($porNsu['3']['prestador']['pode_cadastrar']);

        $ano = $this->withHeaders($h)->getJson('/api/v1/nfse-tomadas?situacao=NA_CAIXA&ano=2026')->assertOk();
        $this->assertEqualsCanonicalizing(['1', '3'], collect($ano->json('data'))->pluck('nsu')->all());

        $busca = $this->withHeaders($h)
            ->getJson('/api/v1/nfse-tomadas?situacao=NA_CAIXA&q='.urlencode('34.661.762/0001-50'))
            ->assertOk();
        $this->assertCount(1, $busca->json('data'));
        $this->assertSame('1', $busca->json('data.0.nsu'));
    }

    public function test_preview_e_commit_criam_fornecedor_de_servico(): void
    {
        $nota = $this->nota('10', '34661762000150', 'Escritorio Alfa Ltda', '2026-04-01', true);
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)
            ->postJson("/api/v1/nfse-tomadas/{$nota->id}/prestador/preview")
            ->assertOk()
            ->assertJsonPath('data.row.acao', 'criar')
            ->assertJsonPath('data.row.status', 'ok')
            ->assertJsonPath('data.row.data.tipo_fornecimento', 'SERVICO');

        $this->assertSame(0, Parceiro::query()->where('empresa_id', $this->empresa->id)->count());

        $commit = $this->withHeaders($h)
            ->postJson("/api/v1/nfse-tomadas/{$nota->id}/prestador/commit")
            ->assertOk()
            ->assertJsonPath('data.commit.criados', 1)
            ->assertJsonPath('data.nota.prestador.status', 'cadastrado');
        $this->assertNotSame('', (string) $commit->json('data.nota.parceiro_sugerido.codigo'));

        $parceiro = Parceiro::query()->where('empresa_id', $this->empresa->id)->where('cnpj_cpf', '34661762000150')->first();
        $this->assertNotNull($parceiro);
        $this->assertTrue((bool) $parceiro->papel_fornecedor);
        $this->assertSame('SERVICO', $parceiro->tipo_fornecimento);
        $this->assertNull($parceiro->cfop_entrada_padrao);
        $this->assertSame(0, EstoqueMovimento::query()->count());
        $this->assertSame(NfseTomada::SITUACAO_CAIXA, $nota->fresh()?->situacao);
    }

    public function test_commit_adiciona_papel_fornecedor(): void
    {
        $existente = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-CLI',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '34661762000150',
            'razao_social' => 'ESCRITORIO ALFA LTDA',
            'papel_cliente' => true,
            'papel_fornecedor' => false,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);
        $nota = $this->nota('11', '34661762000150', 'ESCRITORIO ALFA LTDA', '2026-04-02', true);
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)
            ->getJson('/api/v1/nfse-tomadas/'.$nota->id)
            ->assertOk()
            ->assertJsonPath('data.prestador.status', 'sem_papel')
            ->assertJsonPath('data.parceiro_sugerido', null);

        $this->withHeaders($h)
            ->postJson("/api/v1/nfse-tomadas/{$nota->id}/prestador/commit")
            ->assertOk()
            ->assertJsonPath('data.nota.prestador.status', 'cadastrado')
            ->assertJsonPath('data.nota.parceiro_sugerido.id', $existente->id);

        $existente->refresh();
        $this->assertTrue((bool) $existente->papel_fornecedor);
        $this->assertSame('SERVICO', $existente->tipo_fornecimento);
    }

    public function test_preview_exige_permissao_e_empresa(): void
    {
        $nota = $this->nota('12', '34661762000150', 'ESCRITORIO ALFA LTDA', '2026-04-03', true);
        $leitura = User::query()->create([
            'codigo' => 'USR-NFSEL',
            'name' => 'So leitura',
            'email' => 'nfse-ler@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $leitura->givePermissionTo(['compras.ler']);
        $leitura->empresas()->attach($this->empresa->id);
        Sanctum::actingAs($leitura);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson("/api/v1/nfse-tomadas/{$nota->id}/prestador/preview")
            ->assertForbidden();

        $outra = Empresa::query()->create([
            'codigo' => 'EMP-NFSEO',
            'razao_social' => 'Outra',
            'nome_fantasia' => 'Outra',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);
        $this->user->empresas()->attach($outra->id);
        Sanctum::actingAs($this->user);
        $this->withHeader('X-Empresa-Id', (string) $outra->id)
            ->postJson("/api/v1/nfse-tomadas/{$nota->id}/prestador/preview")
            ->assertNotFound();
    }

    private function nota(string $nsu, string $cnpj, string $nome, string $data, bool $comXml): NfseTomada
    {
        return NfseTomada::query()->create([
            'empresa_id' => $this->empresa->id,
            'nsu' => $nsu,
            'tipo_documento' => 'NFSE',
            'numero' => $nsu,
            'data_emissao' => $data,
            'emit_cnpj' => $cnpj,
            'emit_nome' => $nome,
            'valor_total' => '150.00',
            'situacao' => NfseTomada::SITUACAO_CAIXA,
            'xml' => $comXml ? $this->xml($cnpj, $nome) : null,
        ]);
    }

    private function xml(string $cnpj, string $nome): string
    {
        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">
  <infNFSe Id="NFS{$cnpj}00000000000000000000000001">
    <emit>
      <CNPJ>{$cnpj}</CNPJ>
      <xNome>{$nome}</xNome>
      <enderNac>
        <xLgr>Rua das Flores</xLgr>
        <nro>100</nro>
        <xBairro>Centro</xBairro>
        <cMun>3106200</cMun>
        <UF>MG</UF>
        <CEP>30130000</CEP>
      </enderNac>
    </emit>
    <DPS><infDPS>
      <prest><CNPJ>{$cnpj}</CNPJ></prest>
      <toma><CNPJ>01423183000110</CNPJ></toma>
    </infDPS></DPS>
  </infNFSe>
</NFSe>
XML;
    }
}
