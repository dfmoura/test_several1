<?php

namespace Tests\Feature;

use App\Models\DfeDocumento;
use App\Models\Empresa;
use App\Services\Compras\DfeImportXmlLocalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DfeImportXmlLocalTest extends TestCase
{
    use RefreshDatabase;

    public function test_importa_xml_para_caixa_com_cofre(): void
    {
        config(['erp.stage' => 'local']);
        Storage::fake((string) config('erp.dfe.xml_disk', 'local'));

        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_colacril_udi.xml'));
        $this->assertNotFalse($xml);

        $extractor = app(\App\Services\Fiscal\NfeCompraExtractor::class);
        $compra = $extractor->extractCompra($xml);
        $dest = preg_replace('/\D/', '', (string) ($compra['dest_cnpj'] ?? ''));

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-IMP1',
            'razao_social' => 'Import DF-e',
            'nome_fantasia' => 'IMP',
            'cnpj' => $dest,
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $dir = sys_get_temp_dir().'/dfe-import-'.uniqid('', true);
        mkdir($dir);
        $arquivo = $dir.'/nota.xml';
        file_put_contents($arquivo, $xml);

        try {
            $out = app(DfeImportXmlLocalService::class)->importarPasta($empresa, $dir);
        } finally {
            @unlink($arquivo);
            @rmdir($dir);
        }

        $this->assertSame(1, $out['criados']);
        $this->assertSame(0, $out['atualizados']);
        $this->assertSame([], $out['erros']);

        $doc = DfeDocumento::query()->where('empresa_id', $empresa->id)->first();
        $this->assertNotNull($doc);
        $this->assertSame($compra['chave_nfe'], $doc->chave);
        $this->assertSame(DfeDocumento::SITUACAO_DISPONIVEL, $doc->situacao);
        $this->assertTrue($doc->temXml());
        Storage::disk((string) config('erp.dfe.xml_disk', 'local'))->assertExists($doc->xml_path);

        // Idempotente
        $dir2 = sys_get_temp_dir().'/dfe-import-'.uniqid('', true);
        mkdir($dir2);
        file_put_contents($dir2.'/nota.xml', $xml);
        try {
            $out2 = app(DfeImportXmlLocalService::class)->importarPasta($empresa, $dir2);
        } finally {
            @unlink($dir2.'/nota.xml');
            @rmdir($dir2);
        }
        $this->assertSame(0, $out2['criados']);
        $this->assertSame(1, $out2['atualizados']);
        $this->assertSame(1, DfeDocumento::query()->where('empresa_id', $empresa->id)->count());
    }

    public function test_recusa_destinatario_diferente_da_emp(): void
    {
        config(['erp.stage' => 'local']);
        Storage::fake((string) config('erp.dfe.xml_disk', 'local'));

        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_colacril_udi.xml'));
        $this->assertNotFalse($xml);

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-IMP2',
            'razao_social' => 'Outra EMP',
            'nome_fantasia' => 'OUT',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $dir = sys_get_temp_dir().'/dfe-import-'.uniqid('', true);
        mkdir($dir);
        file_put_contents($dir.'/nota.xml', $xml);

        try {
            $out = app(DfeImportXmlLocalService::class)->importarPasta($empresa, $dir);
        } finally {
            @unlink($dir.'/nota.xml');
            @rmdir($dir);
        }

        $this->assertSame(0, $out['criados']);
        $this->assertCount(1, $out['erros']);
        $this->assertStringContainsString('≠ CNPJ da EMP', $out['erros'][0]['motivo']);
    }
}
