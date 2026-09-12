<?php

namespace Tests\Unit;

use App\Models\Empresa;
use App\Models\ParametroEmpresa;
use App\Models\Produto;
use App\Support\BobinaAreaComercial;
use App\Support\OcReceberDivergencia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class OcReceberDivergenciaTest extends TestCase
{
    use RefreshDatabase;

    public function test_exige_desfecho_quando_ativa_e_politica_padrao(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-DIV1',
            'razao_social' => 'Divergência Teste',
            'nome_fantasia' => 'Div',
            'cnpj' => '11222333000182',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->assertSame(OcReceberDivergencia::POLITICA_EXIGIR, OcReceberDivergencia::politica($empresa));

        try {
            OcReceberDivergencia::assertAntesDeReceber($empresa, [
                'divergencia_ativa' => true,
            ]);
            $this->fail('Esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('divergencia_desfecho', $e->errors());
        }

        OcReceberDivergencia::assertAntesDeReceber($empresa, [
            'divergencia_ativa' => true,
            'divergencia_desfecho' => OcReceberDivergencia::DESFECHO_CONFORME_NF,
            'divergencia_obs' => 'Falta 1 bobina 30×1000',
        ]);

        $obs = OcReceberDivergencia::textoObservacaoMov([
            'divergencia_ativa' => true,
            'divergencia_desfecho' => OcReceberDivergencia::DESFECHO_CONFORME_NF,
            'divergencia_obs' => 'Falta 1 bobina 30×1000',
        ]);
        $this->assertStringContainsString('[Divergência volumes]', (string) $obs);
        $this->assertStringContainsString('Receber alinhado à NF', (string) $obs);
    }

    public function test_aguardar_fornecedor_sempre_bloqueia(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-DIV2',
            'razao_social' => 'Divergência Alerta',
            'nome_fantasia' => 'Div2',
            'cnpj' => '11222333000183',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);
        ParametroEmpresa::query()->create([
            'empresa_id' => $empresa->id,
            'chave' => OcReceberDivergencia::PARAM_POLITICA,
            'valor' => OcReceberDivergencia::POLITICA_ALERTA,
            'status' => 'APROVADO',
            'versao' => 1,
        ]);

        $this->expectException(ValidationException::class);
        OcReceberDivergencia::assertAntesDeReceber($empresa, [
            'divergencia_ativa' => false,
            'divergencia_desfecho' => OcReceberDivergencia::DESFECHO_AGUARDAR,
        ]);
    }

    public function test_bobina_area_converte_m2_para_kg(): void
    {
        $produto = new Produto([
            'codigo' => 'MP-PAP-002',
            'unidade_comercial' => 'KG',
            'unidade_interna' => 'M2',
            'fator_conversao' => '5.8800000000',
        ]);

        $qtde = BobinaAreaComercial::fromAreaM2($produto, '2040.0000');
        // 2040 / 5.88 ≈ 346.9388
        $this->assertSame('346.9388', $qtde);
    }
}
