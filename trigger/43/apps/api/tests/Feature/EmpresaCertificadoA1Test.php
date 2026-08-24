<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EmpresaCertificadoA1;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class EmpresaCertificadoA1Test extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $admin;

    private User $semAcesso;

    private string $senha = 'SenhaA1-Teste!';

    private string $pfxPath;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('empresas.gerir', 'web');

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-A101',
            'razao_social' => 'Empresa A1 LTDA',
            'nome_fantasia' => 'A1',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $outra = Empresa::query()->create([
            'codigo' => 'EMP-A102',
            'razao_social' => 'Outra EMP',
            'cnpj' => '34028316000103',
            'situacao' => 'ATIVA',
        ]);

        $this->admin = User::query()->create([
            'codigo' => 'USR-A101',
            'name' => 'Admin A1',
            'email' => 'a1-admin@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->admin->givePermissionTo('empresas.gerir');
        $this->admin->empresas()->attach([$this->empresa->id]);

        $this->semAcesso = User::query()->create([
            'codigo' => 'USR-A102',
            'name' => 'Sem acesso A1',
            'email' => 'a1-out@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $outra->id,
        ]);
        $this->semAcesso->givePermissionTo('empresas.gerir');
        $this->semAcesso->empresas()->attach([$outra->id]);

        $this->pfxPath = $this->gerarPfxTemporario($this->senha);
    }

    protected function tearDown(): void
    {
        if (isset($this->pfxPath) && is_file($this->pfxPath)) {
            @unlink($this->pfxPath);
        }
        parent::tearDown();
    }

    public function test_status_vazio_e_upload_cifrado_sem_devolver_segredos(): void
    {
        Sanctum::actingAs($this->admin);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson("/api/v1/empresas/{$this->empresa->id}/certificado-a1")
            ->assertOk()
            ->assertJsonPath('data.cadastrado', false);

        $upload = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->post(
                "/api/v1/empresas/{$this->empresa->id}/certificado-a1",
                [
                    'arquivo' => new UploadedFile($this->pfxPath, 'empresa-a1.pfx', 'application/x-pkcs12', null, true),
                    'senha' => $this->senha,
                ],
                ['Accept' => 'application/json'],
            );

        $upload->assertCreated()
            ->assertJsonPath('data.cadastrado', true)
            ->assertJsonPath('data.status', 'VIGENTE')
            ->assertJsonMissingPath('data.pfx_cipher')
            ->assertJsonMissingPath('data.senha_cipher')
            ->assertJsonMissingPath('data.senha');

        $json = $upload->json('data');
        $this->assertNotEmpty($json['fingerprint_sha256']);
        $this->assertNotEmpty($json['subject_cn']);
        $this->assertTrue($json['tem_senha']);
        $this->assertTrue($json['cnpj_bate_com_empresa']);
        $this->assertTrue($json['apto_operacao']);

        $row = EmpresaCertificadoA1::query()->where('empresa_id', $this->empresa->id)->first();
        $this->assertNotNull($row);
        $this->assertNotSame($this->senha, $row->senha_cipher);
        $plainSenha = Crypt::decryptString($row->senha_cipher);
        $this->assertSame($this->senha, $plainSenha);

        $show = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson("/api/v1/empresas/{$this->empresa->id}/certificado-a1")
            ->assertOk()
            ->assertJsonPath('data.cadastrado', true)
            ->json('data');

        $this->assertArrayNotHasKey('pfx_cipher', $show);
        $this->assertArrayNotHasKey('senha', $show);
        $this->assertSame($json['fingerprint_sha256'], $show['fingerprint_sha256']);
    }

    public function test_senha_errada_e_isolamento_entre_empresas(): void
    {
        Sanctum::actingAs($this->admin);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->post(
                "/api/v1/empresas/{$this->empresa->id}/certificado-a1",
                [
                    'arquivo' => new UploadedFile($this->pfxPath, 'empresa-a1.pfx', 'application/x-pkcs12', null, true),
                    'senha' => 'senha-errada',
                ],
                ['Accept' => 'application/json'],
            )
            ->assertStatus(422);

        Sanctum::actingAs($this->semAcesso);

        $this->withHeader('X-Empresa-Id', (string) $this->semAcesso->empresa_default_id)
            ->getJson("/api/v1/empresas/{$this->empresa->id}/certificado-a1")
            ->assertForbidden();

        $this->withHeader('X-Empresa-Id', (string) $this->semAcesso->empresa_default_id)
            ->post(
                "/api/v1/empresas/{$this->empresa->id}/certificado-a1",
                [
                    'arquivo' => new UploadedFile($this->pfxPath, 'empresa-a1.pfx', 'application/x-pkcs12', null, true),
                    'senha' => $this->senha,
                ],
                ['Accept' => 'application/json'],
            )
            ->assertForbidden();
    }

    public function test_remover_limpa_cofre(): void
    {
        Sanctum::actingAs($this->admin);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->post(
                "/api/v1/empresas/{$this->empresa->id}/certificado-a1",
                [
                    'arquivo' => new UploadedFile($this->pfxPath, 'empresa-a1.pfx', 'application/x-pkcs12', null, true),
                    'senha' => $this->senha,
                ],
                ['Accept' => 'application/json'],
            )
            ->assertCreated();

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->deleteJson("/api/v1/empresas/{$this->empresa->id}/certificado-a1")
            ->assertOk()
            ->assertJsonPath('data.cadastrado', false);

        $this->assertSame(0, EmpresaCertificadoA1::query()->where('empresa_id', $this->empresa->id)->count());
    }

    public function test_cnpj_divergente_avisa_e_nao_e_apto(): void
    {
        Sanctum::actingAs($this->admin);
        $outraPfx = $this->gerarPfxTemporario($this->senha, '34.028.316/0001-03');

        try {
            $upload = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
                ->post(
                    "/api/v1/empresas/{$this->empresa->id}/certificado-a1",
                    [
                        'arquivo' => new UploadedFile($outraPfx, 'outro.pfx', 'application/x-pkcs12', null, true),
                        'senha' => $this->senha,
                    ],
                    ['Accept' => 'application/json'],
                );

            $upload->assertCreated()
                ->assertJsonPath('data.cadastrado', true)
                ->assertJsonPath('data.cnpj_bate_com_empresa', false)
                ->assertJsonPath('data.apto_operacao', false);
            $this->assertNotEmpty($upload->json('data.aviso'));
        } finally {
            @unlink($outraPfx);
            @rmdir(dirname($outraPfx));
        }
    }

    public function test_producao_recusa_cnpj_divergente_no_upload(): void
    {
        config(['erp.certificado_a1.exige_cnpj_identico' => true]);
        Sanctum::actingAs($this->admin);
        $outraPfx = $this->gerarPfxTemporario($this->senha, '34.028.316/0001-03');

        try {
            $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
                ->post(
                    "/api/v1/empresas/{$this->empresa->id}/certificado-a1",
                    [
                        'arquivo' => new UploadedFile($outraPfx, 'outro.pfx', 'application/x-pkcs12', null, true),
                        'senha' => $this->senha,
                    ],
                    ['Accept' => 'application/json'],
                )
                ->assertStatus(422)
                ->assertJsonValidationErrors(['arquivo']);
        } finally {
            @unlink($outraPfx);
            @rmdir(dirname($outraPfx));
        }
    }

    public function test_certificado_vencido_nao_e_apto(): void
    {
        EmpresaCertificadoA1::query()->create([
            'empresa_id' => $this->empresa->id,
            'pfx_cipher' => 'cipher-teste',
            'senha_cipher' => 'cipher-teste',
            'arquivo_nome' => 'vencido.pfx',
            'tamanho_bytes' => 12,
            'cnpj_certificado' => '11222333000181',
            'valido_de' => now()->subYears(2),
            'valido_ate' => now()->subDay(),
            'fingerprint_sha256' => hash('sha256', 'a1-vencido'),
            'uploaded_at' => now()->subYear(),
        ]);

        Sanctum::actingAs($this->admin);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson("/api/v1/empresas/{$this->empresa->id}/certificado-a1")
            ->assertOk()
            ->assertJsonPath('data.cadastrado', true)
            ->assertJsonPath('data.status', 'VENCIDO')
            ->assertJsonPath('data.apto_operacao', false)
            ->assertJsonPath('data.alerta', true)
            ->assertJsonPath('data.alerta_nivel', 'urgent');
        $this->assertNotEmpty(
            $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
                ->getJson("/api/v1/empresas/{$this->empresa->id}/certificado-a1")
                ->json('data.pendencias')
        );
    }

    public function test_certificado_a_vencer_detecta_validade_automaticamente(): void
    {
        config(['erp.certificado_a1.alerta_dias' => 30]);

        EmpresaCertificadoA1::query()->create([
            'empresa_id' => $this->empresa->id,
            'pfx_cipher' => 'cipher-teste',
            'senha_cipher' => 'cipher-teste',
            'arquivo_nome' => 'a-vencer.pfx',
            'tamanho_bytes' => 12,
            'cnpj_certificado' => '11222333000181',
            'valido_de' => now()->subMonth(),
            'valido_ate' => now()->addDays(10),
            'fingerprint_sha256' => hash('sha256', 'a1-a-vencer'),
            'uploaded_at' => now()->subMonth(),
        ]);

        Sanctum::actingAs($this->admin);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson("/api/v1/empresas/{$this->empresa->id}/certificado-a1")
            ->assertOk()
            ->assertJsonPath('data.status', 'A_VENCER')
            ->assertJsonPath('data.apto_operacao', true)
            ->assertJsonPath('data.alerta', true)
            ->assertJsonPath('data.alerta_nivel', 'warning')
            ->json('data');

        $this->assertSame(10, $res['dias_para_vencer']);
        $this->assertNotEmpty($res['pendencias']);
        $this->assertStringContainsString('a vencer', mb_strtolower($res['pendencias'][0]));
    }

    private function gerarPfxTemporario(string $senha, string $cnpjNoCn = '11.222.333/0001-81'): string
    {
        $dir = sys_get_temp_dir().'/flexorc_a1_'.uniqid('', true);
        mkdir($dir, 0700, true);
        $pfx = $dir.'/cert.pfx';

        $key = openssl_pkey_new([
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);
        $this->assertNotFalse($key, 'Falha ao gerar chave RSA de teste.');

        $csr = openssl_csr_new(
            [
                'commonName' => 'Empresa A1 Teste:'.$cnpjNoCn,
                'countryName' => 'BR',
                'organizationName' => 'Empresa A1 LTDA',
            ],
            $key,
            ['digest_alg' => 'sha256'],
        );
        $this->assertNotFalse($csr, 'Falha ao gerar CSR de teste.');

        $cert = openssl_csr_sign($csr, null, $key, 365, ['digest_alg' => 'sha256'], time());
        $this->assertNotFalse($cert, 'Falha ao assinar certificado de teste.');

        $exported = '';
        $ok = openssl_pkcs12_export($cert, $exported, $key, $senha);
        $this->assertTrue($ok && $exported !== '', 'Falha ao exportar PKCS#12 de teste.');

        file_put_contents($pfx, $exported);
        $this->assertFileExists($pfx);

        return $pfx;
    }
}
