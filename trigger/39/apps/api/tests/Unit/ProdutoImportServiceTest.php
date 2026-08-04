<?php

namespace Tests\Unit;

use App\Services\Audit\AuditLogger;
use App\Services\Cadastros\ProdutoGrupoService;
use App\Services\Cadastros\ProdutoImportService;
use App\Services\Cadastros\ProdutoService;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ProdutoImportServiceTest extends TestCase
{
    private ProdutoImportService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ProdutoImportService(
            $this->createMock(ProdutoService::class),
            $this->createMock(ProdutoGrupoService::class),
            $this->createMock(AuditLogger::class),
        );
    }

    public function test_detects_semicolon_delimiter(): void
    {
        $this->assertSame(';', $this->service->detectDelimiter('familia;grupo;descricao_fiscal'));
        $this->assertSame(',', $this->service->detectDelimiter('familia,grupo,descricao_fiscal'));
    }

    public function test_normalizes_headers_and_aliases(): void
    {
        $this->assertSame('descricao_fiscal', $this->service->normalizeHeader('Descrição'));
        $this->assertSame('descricao_fiscal', $this->service->normalizeHeader('desc_fiscal'));
        $this->assertSame('unidade_comercial', $this->service->normalizeHeader('unidade'));
        $this->assertSame('largura_mm', $this->service->normalizeHeader('largura'));
        $this->assertSame('grupo_estoque', $this->service->normalizeHeader('GG'));
        $this->assertSame('fornecedor_sigla', $this->service->normalizeHeader('fornecedor'));
    }

    public function test_map_raw_row_skips_empty_values(): void
    {
        $mapped = $this->service->mapRawRow([
            'familia' => 'MP',
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'Papel',
            'ncm' => '',
        ]);

        $this->assertSame('MP', $mapped['familia']);
        $this->assertSame('MP-PAP', $mapped['grupo']);
        $this->assertArrayNotHasKey('ncm', $mapped);
    }

    public function test_template_csv_contains_required_headers_and_bom(): void
    {
        $csv = $this->service->templateCsv();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $this->assertStringContainsString('familia', $csv);
        $this->assertStringContainsString('grupo', $csv);
        $this->assertStringContainsString('descricao_fiscal', $csv);
        $this->assertStringContainsString('MP-PAP', $csv);
        $this->assertStringContainsString('largura_mm', $csv);
        $this->assertStringNotContainsString('custo_medio', $csv);
    }

    public function test_parse_csv_file_reads_rows_with_semicolon(): void
    {
        $content = "familia;grupo;descricao_fiscal\n"
            ."MP;MP-PAP;Papel A\n"
            ."PA;PA-ETQ;Etiqueta B\n";

        $file = UploadedFile::fake()->createWithContent('produtos.csv', $content);
        $rows = $this->service->parseCsvFile($file);

        $this->assertCount(2, $rows);
        $this->assertSame(2, $rows[0]['line']);
        $this->assertSame('MP', $rows[0]['raw']['familia']);
        $this->assertSame('MP-PAP', $rows[0]['raw']['grupo']);
        $this->assertSame(3, $rows[1]['line']);
        $this->assertSame('PA', $rows[1]['raw']['familia']);
    }

    public function test_parse_csv_skips_blank_lines_and_supports_bom(): void
    {
        $content = "\xEF\xBB\xBFfamilia;grupo;descricao_fiscal\n"
            ."MP;MP-PAP;A\n"
            ."\n"
            ."PA;PA-ETQ;B\n";

        $file = UploadedFile::fake()->createWithContent('produtos.csv', $content);
        $rows = $this->service->parseCsvFile($file);

        $this->assertCount(2, $rows);
        $this->assertSame('A', $rows[0]['raw']['descricao_fiscal']);
        $this->assertSame('B', $rows[1]['raw']['descricao_fiscal']);
    }

    public function test_parse_csv_rejects_missing_identity_headers(): void
    {
        $this->expectException(ValidationException::class);

        $file = UploadedFile::fake()->createWithContent(
            'produtos.csv',
            "codigo;ncm\nX;48114190\n"
        );
        $this->service->parseCsvFile($file);
    }
}
