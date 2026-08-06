<?php

namespace Tests\Unit;

use App\Services\Relatorio\RelatorioCatalogo;
use App\Services\Relatorio\RelatorioProgramaValidator;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class RelatorioProgramaValidatorTest extends TestCase
{
    private RelatorioProgramaValidator $validator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->validator = new RelatorioProgramaValidator(new RelatorioCatalogo);
    }

    public function test_aceita_programa_valido(): void
    {
        $out = $this->validator->validate([
            'titulo' => 'Teste',
            'fonte' => 'parceiros',
            'colunas' => ['codigo', 'razao_social'],
            'filtros' => [['campo' => 'situacao', 'op' => 'eq', 'valor' => 'ATIVO']],
            'ordenacao' => [['campo' => 'codigo', 'dir' => 'asc']],
            'limite' => 50,
            'totais' => [],
        ], []);

        $this->assertSame('parceiros', $out['fonte']);
        $this->assertSame(['codigo', 'razao_social'], $out['colunas']);
        $this->assertSame(50, $out['limite']);
    }

    public function test_rejeita_fonte_desconhecida(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->validator->validate([
            'fonte' => 'pedidos',
            'colunas' => ['codigo'],
        ], []);
    }

    public function test_rejeita_campo_fora_da_allowlist(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->validator->validate([
            'fonte' => 'produtos',
            'colunas' => ['codigo', 'senha_admin'],
        ], []);
    }

    public function test_credito_exige_flag(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->validator->validate([
            'fonte' => 'parceiros',
            'colunas' => ['codigo', 'limite_credito'],
        ], ['incluir_credito' => false]);
    }

    public function test_facas_com_desenho(): void
    {
        $out = $this->validator->validate([
            'titulo' => 'Mapa de facas',
            'fonte' => 'facas',
            'colunas' => ['desenho', 'medida', 'formato', 'maquina_catalogo'],
            'filtros' => [['campo' => 'completa', 'op' => 'eq', 'valor' => true]],
            'limite' => 500,
        ], []);

        $this->assertSame(60, $out['limite']);
    }
}
