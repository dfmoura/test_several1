<?php

namespace Tests\Unit;

use App\Services\Audit\AuditLogger;
use App\Services\Cadastros\ParceiroImportService;
use App\Services\Cadastros\ParceiroService;
use App\Services\Consulta\BrasilApiClient;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ParceiroImportServiceTest extends TestCase
{
    private ParceiroImportService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ParceiroImportService(
            $this->createMock(ParceiroService::class),
            $this->createMock(AuditLogger::class),
            $this->createMock(BrasilApiClient::class),
        );
    }

    public function test_detects_semicolon_delimiter(): void
    {
        $this->assertSame(';', $this->service->detectDelimiter('razao_social;cnpj_cpf;papeis'));
        $this->assertSame(',', $this->service->detectDelimiter('razao_social,cnpj_cpf,papeis'));
    }

    public function test_normalizes_headers_and_aliases(): void
    {
        $this->assertSame('razao_social', $this->service->normalizeHeader('Razão Social'));
        $this->assertSame('cnpj_cpf', $this->service->normalizeHeader('CNPJ'));
        $this->assertSame('cnpj_cpf', $this->service->normalizeHeader('documento'));
        $this->assertSame('papeis', $this->service->normalizeHeader('papel'));
        $this->assertSame('municipio', $this->service->normalizeHeader('cidade'));
        $this->assertSame('ie', $this->service->normalizeHeader('inscricao_estadual'));
    }

    public function test_parse_boolean(): void
    {
        $this->assertTrue($this->service->parseBoolean('sim'));
        $this->assertTrue($this->service->parseBoolean('1'));
        $this->assertTrue($this->service->parseBoolean('true'));
        $this->assertFalse($this->service->parseBoolean('não'));
        $this->assertFalse($this->service->parseBoolean('0'));
        $this->assertNull($this->service->parseBoolean(''));
        $this->assertNull($this->service->parseBoolean('talvez'));
    }

    public function test_map_raw_row_skips_empty_values(): void
    {
        $mapped = $this->service->mapRawRow([
            'Razao Social' => 'Acme LTDA',
            'CNPJ' => '11222333000181',
            'email' => '',
            'papel_cliente' => '1',
        ]);

        $this->assertSame('Acme LTDA', $mapped['razao_social']);
        $this->assertSame('11222333000181', $mapped['cnpj_cpf']);
        $this->assertSame('1', $mapped['papel_cliente']);
        $this->assertArrayNotHasKey('email', $mapped);
    }

    public function test_template_csv_contains_required_headers_and_bom(): void
    {
        $csv = $this->service->templateCsv();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $this->assertStringContainsString('cnpj_cpf', $csv);
        $this->assertStringContainsString('papeis', $csv);
        $this->assertStringContainsString('11222333000181', $csv);
        $this->assertStringNotContainsString('logradouro', $csv);
        $this->assertStringNotContainsString('nome_fantasia', $csv);
        $this->assertStringNotContainsString('municipio', $csv);
    }

    public function test_enrich_from_cnpj_fills_empty_fields_only(): void
    {
        $brasil = $this->createMock(BrasilApiClient::class);
        $brasil->method('getCnpj')->willReturn([
            'razao_social' => 'API RAZAO LTDA',
            'nome_fantasia' => 'API Fantasia',
            'logradouro' => 'Rua API',
            'numero' => '100',
            'bairro' => 'Centro',
            'municipio' => 'São Paulo',
            'uf' => 'SP',
            'cep' => '01001000',
            'ibge' => '3550308',
            'telefone' => '1133334444',
            'email' => 'api@exemplo.com',
            'regime_sugerido' => 'SIMPLES_NACIONAL',
        ]);

        $service = new ParceiroImportService(
            $this->createMock(ParceiroService::class),
            $this->createMock(AuditLogger::class),
            $brasil,
        );

        $result = $service->enrichFromCnpjApi([
            'cnpj_cpf' => '11222333000181',
            'razao_social' => '',
            'papeis' => 'cliente',
        ]);

        $this->assertSame('atualizado', $result['status']);
        $this->assertSame('API RAZAO LTDA', $result['payload']['razao_social']);
        $this->assertSame('SP', $result['payload']['uf']);
        $this->assertContains('razao_social', $result['filled']);
        $this->assertContains('logradouro', $result['filled']);
    }

    public function test_enrich_preserves_csv_overrides(): void
    {
        $brasil = $this->createMock(BrasilApiClient::class);
        $brasil->method('getCnpj')->willReturn([
            'razao_social' => 'API RAZAO LTDA',
            'municipio' => 'São Paulo',
            'uf' => 'SP',
        ]);

        $service = new ParceiroImportService(
            $this->createMock(ParceiroService::class),
            $this->createMock(AuditLogger::class),
            $brasil,
        );

        $result = $service->enrichFromCnpjApi([
            'cnpj_cpf' => '11222333000181',
            'razao_social' => 'Nome do CSV',
        ]);

        $this->assertSame('Nome do CSV', $result['payload']['razao_social']);
        $this->assertSame('São Paulo', $result['payload']['municipio']);
        $this->assertNotContains('razao_social', $result['filled']);
        $this->assertContains('municipio', $result['filled']);
    }

    public function test_parse_csv_file_reads_rows_with_semicolon(): void
    {
        $content = "razao_social;cnpj_cpf;papeis\n"
            ."Parceiro A;11222333000181;cliente\n"
            ."Parceiro B;99888777000166;fornecedor\n";

        $file = UploadedFile::fake()->createWithContent('parceiros.csv', $content);
        $rows = $this->service->parseCsvFile($file);

        $this->assertCount(2, $rows);
        $this->assertSame(2, $rows[0]['line']);
        $this->assertSame('Parceiro A', $rows[0]['raw']['razao_social']);
        $this->assertSame('cliente', $rows[0]['raw']['papeis']);
        $this->assertSame(3, $rows[1]['line']);
        $this->assertSame('Parceiro B', $rows[1]['raw']['razao_social']);
    }

    public function test_parse_csv_skips_blank_lines_and_supports_bom(): void
    {
        $content = "\xEF\xBB\xBFrazao_social;papeis\n"
            ."Acme;cliente\n"
            ."\n"
            ."Beta;fornecedor\n";

        $file = UploadedFile::fake()->createWithContent('parceiros.csv', $content);
        $rows = $this->service->parseCsvFile($file);

        $this->assertCount(2, $rows);
        $this->assertSame('Acme', $rows[0]['raw']['razao_social']);
        $this->assertSame('Beta', $rows[1]['raw']['razao_social']);
    }

    public function test_parse_csv_rejects_missing_identity_headers(): void
    {
        $this->expectException(ValidationException::class);

        $file = UploadedFile::fake()->createWithContent(
            'parceiros.csv',
            "nome_fantasia;papeis\nX;cliente\n"
        );
        $this->service->parseCsvFile($file);
    }
}
