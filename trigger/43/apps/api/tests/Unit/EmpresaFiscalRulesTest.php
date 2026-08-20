<?php

namespace Tests\Unit;

use App\Services\Cadastros\EmpresaFiscalRules;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class EmpresaFiscalRulesTest extends TestCase
{
    public function test_default_crt_from_regime(): void
    {
        $this->assertSame(1, EmpresaFiscalRules::defaultCrtForRegime('SIMPLES_NACIONAL'));
        $this->assertSame(4, EmpresaFiscalRules::defaultCrtForRegime('MEI'));
        $this->assertSame(3, EmpresaFiscalRules::defaultCrtForRegime('LUCRO_PRESUMIDO'));
        $this->assertSame(3, EmpresaFiscalRules::defaultCrtForRegime('LUCRO_REAL'));
        $this->assertSame(3, EmpresaFiscalRules::defaultCrtForRegime('PRESUMIDO'));
        $this->assertSame(3, EmpresaFiscalRules::defaultCrtForRegime('REAL'));
    }

    public function test_sync_derives_crt_when_absent(): void
    {
        $synced = EmpresaFiscalRules::syncCrt(['regime' => 'SIMPLES_NACIONAL']);
        $this->assertSame('SIMPLES_NACIONAL', $synced['regime']);
        $this->assertSame(1, $synced['crt']);

        $synced = EmpresaFiscalRules::syncCrt(['regime' => 'LUCRO_REAL']);
        $this->assertSame(3, $synced['crt']);
    }

    public function test_preserves_crt_sublimite_when_regime_stays_simples(): void
    {
        $synced = EmpresaFiscalRules::syncCrt(
            ['regime' => 'SIMPLES_NACIONAL'],
            ['regime' => 'SIMPLES_NACIONAL', 'crt' => 2],
        );

        $this->assertSame(2, $synced['crt']);
    }

    public function test_rejects_crt_incompatible_with_regime(): void
    {
        $this->expectException(ValidationException::class);

        EmpresaFiscalRules::syncCrt([
            'regime' => 'LUCRO_REAL',
            'crt' => 1,
        ]);
    }

    public function test_allows_crt_2_only_for_simples(): void
    {
        $synced = EmpresaFiscalRules::syncCrt([
            'regime' => 'SIMPLES_NACIONAL',
            'crt' => 2,
        ]);
        $this->assertSame(2, $synced['crt']);

        $this->assertSame([1, 2], EmpresaFiscalRules::allowedCrtsForRegime('SIMPLES_NACIONAL'));
        $this->assertSame([3], EmpresaFiscalRules::allowedCrtsForRegime('LUCRO_PRESUMIDO'));
        $this->assertSame([4], EmpresaFiscalRules::allowedCrtsForRegime('MEI'));
    }

    public function test_validates_cnpj_check_digits(): void
    {
        $this->assertTrue(EmpresaFiscalRules::isValidCnpj('01423183000110'));
        $this->assertFalse(EmpresaFiscalRules::isValidCnpj('01423183000111'));
        $this->assertFalse(EmpresaFiscalRules::isValidCnpj('00000000000000'));
        $this->assertFalse(EmpresaFiscalRules::isValidCnpj('123'));
    }

    public function test_emitente_completo_com_ie_ok_fica_apto(): void
    {
        $result = EmpresaFiscalRules::evaluate([
            'cnpj' => '01423183000110',
            'razao_social' => 'RLP ETIQUETAS AUTO ADESIVOS LTDA',
            'ie' => '7023251210034',
            'ie_status' => 'OK',
            'regime' => 'SIMPLES_NACIONAL',
            'crt' => 1,
            'cnae' => '1813099',
            'logradouro' => 'AVENIDA MARCOS DE FREITAS COSTA',
            'numero' => '385',
            'bairro' => 'Daniel Fonseca',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400328',
            'ibge' => '3170206',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
        ]);

        $this->assertTrue($result['completo']);
        $this->assertTrue($result['apto_emissao_nfe']);
        $this->assertTrue($result['apto_emissao_nfse']);
        $this->assertSame([], $result['pendencias']);
        $this->assertSame([], $result['pendencias_emissao']);
    }

    public function test_emitente_completo_sem_ie_ok_bloqueia_emissao(): void
    {
        $result = EmpresaFiscalRules::evaluate([
            'cnpj' => '01423183000110',
            'razao_social' => 'RLP ETIQUETAS AUTO ADESIVOS LTDA',
            'ie' => '7023251210034',
            'ie_status' => 'NAO_VERIFICADA',
            'regime' => 'SIMPLES_NACIONAL',
            'crt' => 1,
            'cnae' => '1813099',
            'logradouro' => 'AVENIDA MARCOS DE FREITAS COSTA',
            'numero' => '385',
            'bairro' => 'Daniel Fonseca',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400328',
            'ibge' => '3170206',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
        ]);

        $this->assertTrue($result['completo']);
        $this->assertFalse($result['apto_emissao_nfe']);
        $this->assertNotEmpty($result['pendencias_emissao']);
    }

    public function test_venda_desligada_bloqueia_emissao(): void
    {
        $result = EmpresaFiscalRules::evaluate([
            'cnpj' => '01423183000110',
            'razao_social' => 'RLP',
            'ie' => '7023251210034',
            'ie_status' => 'OK',
            'regime' => 'SIMPLES_NACIONAL',
            'crt' => 1,
            'cnae' => '1813099',
            'logradouro' => 'Rua A',
            'numero' => '1',
            'bairro' => 'Centro',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400328',
            'ibge' => '3170206',
            'situacao' => 'ATIVA',
            'venda_ativa' => false,
        ]);

        $this->assertTrue($result['completo']);
        $this->assertFalse($result['apto_emissao_nfe']);
    }

    public function test_im_nao_e_obrigatoria_por_padrao_nem_para_nfse(): void
    {
        $base = [
            'cnpj' => '01423183000110',
            'razao_social' => 'RLP',
            'ie' => '7023251210034',
            'ie_status' => 'OK',
            'regime' => 'SIMPLES_NACIONAL',
            'crt' => 1,
            'cnae' => '1813099',
            'logradouro' => 'Rua A',
            'numero' => '1',
            'bairro' => 'Centro',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400328',
            'ibge' => '3170206',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
        ];

        $semIm = EmpresaFiscalRules::evaluate($base);
        $this->assertTrue($semIm['apto_emissao_nfe']);
        $this->assertTrue($semIm['apto_emissao_nfse']);
        $this->assertSame([], $semIm['pendencias_nfse']);

        $exige = EmpresaFiscalRules::evaluate($base + ['im_obrigatoria_nfse' => true]);
        $this->assertTrue($exige['apto_emissao_nfe']);
        $this->assertFalse($exige['apto_emissao_nfse']);
        $this->assertNotEmpty($exige['pendencias_nfse']);

        $comIm = EmpresaFiscalRules::evaluate($base + [
            'im_obrigatoria_nfse' => true,
            'im' => '123456',
        ]);
        $this->assertTrue($comIm['apto_emissao_nfse']);
    }
}
