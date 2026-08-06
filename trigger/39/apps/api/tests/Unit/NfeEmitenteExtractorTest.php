<?php

namespace Tests\Unit;

use App\Services\Audit\AuditLogger;
use App\Services\Cadastros\ParceiroService;
use App\Services\Cadastros\ParceiroXmlImportService;
use App\Services\Consulta\BrasilApiClient;
use App\Services\Fiscal\NfeEmitenteExtractor;
use Tests\TestCase;

class NfeEmitenteExtractorTest extends TestCase
{
    public function test_extracts_emitente_from_fedrigoni_fixture(): void
    {
        $path = dirname(__DIR__).'/fixtures/nfe_fedrigoni.xml';
        $this->assertFileExists($path);

        $extractor = new NfeEmitenteExtractor;
        $result = $extractor->extract((string) file_get_contents($path));

        $this->assertSame('55', $result['modelo']);
        $this->assertSame('35260434661762000150550010000910561813102533', $result['chave_nfe']);
        $this->assertSame('34661762000150', $result['emit']['cnpj_cpf']);
        $this->assertSame('PJ', $result['emit']['tipo_pessoa']);
        $this->assertStringContainsString('FEDRIGONI', (string) $result['emit']['razao_social']);
        $this->assertSame('JUNDIAI', $result['emit']['municipio']);
        $this->assertSame('SP', $result['emit']['uf']);
        $this->assertSame('13213180', $result['emit']['cep']);
        $this->assertSame('3525904', $result['emit']['ibge']);
        $this->assertSame('407783468112', $result['emit']['ie']);
        $this->assertSame('01423183000110', $result['dest_cnpj']);
        $this->assertSame('6101', $result['cfop_entrada_sugerido']);
        $this->assertNotNull($result['transportadora']);
        $this->assertSame('20290751000105', $result['transportadora']['cnpj']);
    }

    public function test_rejects_empty_xml(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        (new NfeEmitenteExtractor)->extract('   ');
    }

    public function test_address_confrontation_detects_material_cep_divergence(): void
    {
        $service = $this->xmlServiceWithoutDeps();
        $warnings = $service->confrontAddresses(
            ['cep' => '13213180', 'uf' => 'SP', 'municipio' => 'JUNDIAI', 'logradouro' => 'R ANTONIO', 'numero' => '105', 'ibge' => '3525904'],
            ['cep' => '01001000', 'uf' => 'SP', 'municipio' => 'SAO PAULO', 'logradouro' => 'PRACA DA SE', 'numero' => '1', 'ibge' => '3550308'],
        );

        $this->assertNotEmpty($warnings);
        $this->assertTrue(collect($warnings)->contains(fn ($w) => str_contains($w, 'CEP')));
    }

    public function test_address_confrontation_allows_street_abbreviations(): void
    {
        $service = $this->xmlServiceWithoutDeps();
        $warnings = $service->confrontAddresses(
            [
                'cep' => '13213180',
                'uf' => 'SP',
                'municipio' => 'Jundiai',
                'logradouro' => 'R ANTONIO OVIDIO RODRIGUES',
                'numero' => '105',
                'ibge' => '3525904',
            ],
            [
                'cep' => '13213180',
                'uf' => 'SP',
                'municipio' => 'Jundiaí',
                'logradouro' => 'Rua Antonio Ovidio Rodrigues',
                'numero' => '105',
                'ibge' => '3525904',
            ],
        );

        $this->assertSame([], $warnings);
    }

    private function xmlServiceWithoutDeps(): ParceiroXmlImportService
    {
        return new ParceiroXmlImportService(
            new NfeEmitenteExtractor,
            $this->createMock(ParceiroService::class),
            $this->createMock(BrasilApiClient::class),
            $this->createMock(AuditLogger::class),
        );
    }
}
