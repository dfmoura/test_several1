<?php

namespace Tests\Feature;

use App\Models\DfeDocumento;
use App\Models\Empresa;
use App\Models\EmpresaCertificadoA1;
use App\Models\User;
use App\Services\Cadastros\EmpresaCertificadoCrypto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class DfeSyncTest extends TestCase
{
    use RefreshDatabase;

    private string $senha = 'SenhaA1-Dfe!';

    public function test_local_recusa_enfileirar_sync(): void
    {
        config(['erp.stage' => 'local', 'erp.dfe.driver' => 'fake']);
        [$empresa, $user] = $this->empresaCompras();

        Sanctum::actingAs($user);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/dfe-sync')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['sync']);
    }

    public function test_homolog_sem_a1_recusa(): void
    {
        config(['erp.stage' => 'homolog', 'erp.dfe.driver' => 'fake']);
        [$empresa, $user] = $this->empresaCompras();

        Sanctum::actingAs($user);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/dfe-sync')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['sync']);
    }

    public function test_homolog_com_a1_fake_preenche_caixa_sem_travar_lista(): void
    {
        config(['erp.stage' => 'homolog', 'erp.dfe.driver' => 'fake']);
        [$empresa, $user] = $this->empresaCompras();
        $this->gravarA1Apto($empresa);

        Sanctum::actingAs($user);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/dfe-documentos')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.sync.pode_sincronizar', true);

        // QUEUE_CONNECTION=sync → job roda no dispatch; request só enfileira logicamente.
        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/dfe-sync')
            ->assertOk()
            ->assertJsonPath('data.enfileirado', true);

        $this->assertGreaterThanOrEqual(
            1,
            DfeDocumento::query()->where('empresa_id', $empresa->id)->count()
        );

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/dfe-documentos')
            ->assertOk()
            ->assertJsonPath('data.0.emit_nome', 'Fornecedor Fake DF-e')
            ->assertJsonPath('meta.sync.sync_status', 'IDLE');
    }

    public function test_consulta_sem_escrever_nao_enfileira(): void
    {
        config(['erp.stage' => 'homolog', 'erp.dfe.driver' => 'fake']);
        Permission::findOrCreate('compras.ler', 'web');
        Permission::findOrCreate('compras.escrever', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-DFES3',
            'razao_social' => 'Só leitura',
            'nome_fantasia' => 'SR',
            'cnpj' => '11222333000181',
            'uf' => 'MG',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);
        $user = User::query()->create([
            'codigo' => 'USR-DFES3',
            'name' => 'Leitor',
            'email' => 'dfe-ler@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['compras.ler']);
        $user->empresas()->attach([$empresa->id]);
        $this->gravarA1Apto($empresa);

        Sanctum::actingAs($user);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/dfe-sync')
            ->assertForbidden();
    }

    /**
     * @return array{0: Empresa, 1: User}
     */
    private function empresaCompras(): array
    {
        Permission::findOrCreate('compras.ler', 'web');
        Permission::findOrCreate('compras.escrever', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-DFES1',
            'razao_social' => 'Empresa Sync DF-e',
            'nome_fantasia' => 'DFES',
            'cnpj' => '11222333000181',
            'uf' => 'MG',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-DFES1',
            'name' => 'Compras Sync',
            'email' => 'dfe-sync@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['compras.ler', 'compras.escrever']);
        $user->empresas()->attach([$empresa->id]);

        return [$empresa, $user];
    }

    private function gravarA1Apto(Empresa $empresa): void
    {
        $crypto = app(EmpresaCertificadoCrypto::class);
        $pfx = $this->gerarPfxBytes($this->senha, '11.222.333/0001-81');

        EmpresaCertificadoA1::query()->create([
            'empresa_id' => $empresa->id,
            'pfx_cipher' => $crypto->criptografarBinario($pfx),
            'senha_cipher' => $crypto->criptografarSenha($this->senha),
            'arquivo_nome' => 'dfe-teste.pfx',
            'tamanho_bytes' => strlen($pfx),
            'subject_cn' => 'Empresa Sync:11.222.333/0001-81',
            'cnpj_certificado' => '11222333000181',
            'valido_de' => now()->subMonth(),
            'valido_ate' => now()->addYear(),
            'fingerprint_sha256' => hash('sha256', $pfx),
            'uploaded_at' => now(),
        ]);
    }

    private function gerarPfxBytes(string $senha, string $cnpjNoCn): string
    {
        $key = openssl_pkey_new([
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);
        $this->assertNotFalse($key);

        $csr = openssl_csr_new(
            [
                'countryName' => 'BR',
                'organizationName' => 'Empresa Sync DF-e',
                'commonName' => 'Empresa Sync:'.$cnpjNoCn,
            ],
            $key,
            ['digest_alg' => 'sha256'],
        );
        $this->assertNotFalse($csr);

        $cert = openssl_csr_sign($csr, null, $key, 365, ['digest_alg' => 'sha256'], time());
        $this->assertNotFalse($cert);

        $exported = '';
        $ok = openssl_pkcs12_export($cert, $exported, $key, $senha);
        $this->assertTrue($ok && $exported !== '');

        return $exported;
    }
}
