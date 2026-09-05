<?php

namespace Tests\Feature;

use App\Models\DfeDocumento;
use App\Models\Empresa;
use App\Models\EmpresaCertificadoA1;
use App\Models\NaturezaGerencial;
use App\Models\OrdemCompra;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\User;
use App\Services\Cadastros\EmpresaCertificadoCrypto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class DfeAmarrarXmlTest extends TestCase
{
    use RefreshDatabase;

    private string $senha = 'SenhaA1-Dfe!';

    public function test_buscar_xml_amarrar_e_preview_na_oc(): void
    {
        config(['erp.stage' => 'homolog', 'erp.dfe.driver' => 'fake']);

        foreach ([
            'compras.ler', 'compras.escrever',
            'estoque.ler', 'estoque.escrever',
            'financeiro.ler', 'financeiro.escrever',
        ] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-DFEA1',
            'razao_social' => 'Empresa Amarrar',
            'nome_fantasia' => 'Amarrar',
            'cnpj' => '01423183000110',
            'uf' => 'MG',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        NaturezaGerencial::query()->create([
            'codigo' => '5.06',
            'codigo_exibicao' => 'NAT-5.06',
            'grupo' => 5,
            'nivel' => 2,
            'parent_id' => null,
            'nome' => 'Pagamento a fornecedor de estoque',
            'aceita_lancamento' => true,
            'ativo' => true,
            'ordenacao' => 506,
        ]);

        $fornecedor = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-DFEA1',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '12345678000199',
            'razao_social' => 'Fornecedor Fake DF-e',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        $produto = Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'MP-FAKE-1',
            'familia' => 'MP',
            'grupo' => 'MP-GER',
            'descricao_fiscal' => 'Insumo fake',
            'ncm' => '39201099',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'custo_medio' => '0',
            'situacao' => 'ATIVO',
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-DFEA1',
            'name' => 'Compras Amarrar',
            'email' => 'dfe-amarrar@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo([
            'compras.ler', 'compras.escrever',
            'estoque.ler', 'estoque.escrever',
            'financeiro.ler', 'financeiro.escrever',
        ]);
        $user->empresas()->attach([$empresa->id]);
        $this->gravarA1($empresa);

        Sanctum::actingAs($user);
        $h = ['X-Empresa-Id' => (string) $empresa->id];

        $this->withHeaders($h)->postJson('/api/v1/dfe-sync')->assertOk();

        $doc = DfeDocumento::query()->where('empresa_id', $empresa->id)->first();
        $this->assertNotNull($doc);
        $this->assertFalse($doc->temXml());

        $this->withHeaders($h)
            ->postJson("/api/v1/dfe-documentos/{$doc->id}/buscar-xml")
            ->assertOk()
            ->assertJsonPath('data.enfileirado', true);

        $doc->refresh();
        $this->assertTrue($doc->temXml());
        $this->assertSame(DfeDocumento::SITUACAO_DISPONIVEL, $doc->situacao);

        $chave = preg_replace('/\D/', '', (string) $doc->chave) ?: '';
        $download = $this->withHeaders($h)
            ->get("/api/v1/dfe-documentos/{$doc->id}/xml")
            ->assertOk();
        $this->assertStringContainsString('application/xml', (string) $download->headers->get('Content-Type'));
        $this->assertStringContainsString('NFe-', (string) $download->headers->get('Content-Disposition'));
        if (strlen($chave) === 44) {
            $this->assertStringContainsString($chave, (string) $download->headers->get('Content-Disposition'));
        }
        $this->assertNotEmpty($download->streamedContent());

        $oc = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $produto->id,
                        'qtde_pedida' => '10.0000',
                        'valor_unitario' => '25.075000',
                    ],
                ],
            ])
            ->assertCreated();

        $ocId = (int) $oc->json('data.id');

        $this->withHeaders($h)
            ->postJson("/api/v1/dfe-documentos/{$doc->id}/amarrar", [
                'ordem_compra_id' => $ocId,
            ])
            ->assertOk()
            ->assertJsonPath('data.situacao', 'AMARRADA')
            ->assertJsonPath('data.ordem_compra.id', $ocId);

        $preview = $this->withHeaders($h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/receber/xml/preview-dfe", [
                'dfe_documento_id' => $doc->id,
            ])
            ->assertOk();

        $this->assertNotEmpty($preview->json('data.xml'));
        $this->assertNotEmpty($preview->json('data.preview.linhas'));
        $this->assertSame('AMARRADA', $preview->json('data.documento.situacao'));

        $this->withHeaders($h)
            ->postJson("/api/v1/dfe-documentos/{$doc->id}/sem-interesse")
            ->assertOk()
            ->assertJsonPath('data.situacao', 'SEM_INTERESSE');

        // OC cancelada não recebe amarrar de outro doc
        $doc2 = DfeDocumento::query()->create([
            'empresa_id' => $empresa->id,
            'nsu' => '000000000000099',
            'chave' => str_repeat('9', 44),
            'situacao' => DfeDocumento::SITUACAO_DISPONIVEL,
            'xml_path' => $doc->xml_path,
            'xml_sha256' => $doc->xml_sha256,
            'data_emissao' => now()->toDateString(),
        ]);

        OrdemCompra::query()->whereKey($ocId)->update(['status' => OrdemCompra::STATUS_CANCELADA]);

        $this->withHeaders($h)
            ->postJson("/api/v1/dfe-documentos/{$doc2->id}/amarrar", [
                'ordem_compra_id' => $ocId,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ordem_compra_id']);
    }

    public function test_comando_delta_so_enfileira_na_nuvem(): void
    {
        config(['erp.stage' => 'local', 'erp.dfe.driver' => 'fake']);
        $this->artisan('dfe:sync-delta')
            ->expectsOutputToContain('não permite DF-e')
            ->assertSuccessful();
    }

    private function gravarA1(Empresa $empresa): void
    {
        $crypto = app(EmpresaCertificadoCrypto::class);
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        $this->assertNotFalse($key);
        $csr = openssl_csr_new(
            ['countryName' => 'BR', 'organizationName' => 'T', 'commonName' => 'T:01.423.183/0001-10'],
            $key,
            ['digest_alg' => 'sha256'],
        );
        $this->assertNotFalse($csr);
        $cert = openssl_csr_sign($csr, null, $key, 365, ['digest_alg' => 'sha256'], time());
        $this->assertNotFalse($cert);
        $exported = '';
        $this->assertTrue(openssl_pkcs12_export($cert, $exported, $key, $this->senha));

        EmpresaCertificadoA1::query()->create([
            'empresa_id' => $empresa->id,
            'pfx_cipher' => $crypto->criptografarBinario($exported),
            'senha_cipher' => $crypto->criptografarSenha($this->senha),
            'arquivo_nome' => 'a1.pfx',
            'tamanho_bytes' => strlen($exported),
            'cnpj_certificado' => '01423183000110',
            'valido_de' => now()->subMonth(),
            'valido_ate' => now()->addYear(),
            'fingerprint_sha256' => hash('sha256', $exported),
            'uploaded_at' => now(),
        ]);
    }
}
