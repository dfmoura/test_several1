<?php

namespace Tests\Unit;

use App\Services\Financeiro\CondicaoPagamentoParser;
use PHPUnit\Framework\TestCase;

class CondicaoPagamentoParserTest extends TestCase
{
    private CondicaoPagamentoParser $parser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->parser = new CondicaoPagamentoParser;
    }

    public function test_a_vista(): void
    {
        $p = $this->parser->parse('À vista');
        $this->assertCount(1, $p);
        $this->assertSame(0, $p[0]['dias']);
        $this->assertFalse($p[0]['sinal']);
    }

    public function test_n_ddl(): void
    {
        $p = $this->parser->parse('28 DDL');
        $this->assertCount(1, $p);
        $this->assertSame(28, $p[0]['dias']);
    }

    public function test_parcelas_iguais(): void
    {
        $p = $this->parser->parse('14/28/42');
        $this->assertCount(3, $p);
        $this->assertSame([14, 28, 42], array_column($p, 'dias'));
    }

    public function test_sinal_mais_saldo(): void
    {
        $p = $this->parser->parse('50% sinal + 50% 28 DDL');
        $this->assertCount(2, $p);
        $this->assertTrue($p[0]['sinal']);
        $this->assertSame(0, $p[0]['dias']);
        $this->assertFalse($p[1]['sinal']);
        $this->assertSame(28, $p[1]['dias']);

        $apos = $this->parser->aposAdiantamento($p, true);
        $this->assertCount(1, $apos);
        $this->assertSame(28, $apos[0]['dias']);
        $this->assertSame('1.00000000', $apos[0]['peso']);
    }

    public function test_sinal_sem_adiantamento_mantem_duas_parcelas(): void
    {
        $p = $this->parser->parse('50% sinal + 50% 28 DDL');
        $apos = $this->parser->aposAdiantamento($p, false);
        $this->assertCount(2, $apos);
    }

    public function test_ratear_ultima_parcela_absorve_arredondamento(): void
    {
        $p = $this->parser->parse('14/28/42');
        $linhas = $this->parser->ratear('100.00', $p, new \DateTimeImmutable('2026-08-13'));
        $this->assertCount(3, $linhas);
        $soma = '0.00';
        foreach ($linhas as $l) {
            $soma = bcadd($soma, $l['valor'], 2);
        }
        $this->assertSame('100.00', $soma);
        $this->assertSame('2026-08-27', $linhas[0]['vencimento']);
        $this->assertSame('2026-09-10', $linhas[1]['vencimento']);
        $this->assertSame('2026-09-24', $linhas[2]['vencimento']);
    }

    public function test_vazio_vira_28_ddl(): void
    {
        $p = $this->parser->parse(null);
        $this->assertSame(28, $p[0]['dias']);
    }
}
