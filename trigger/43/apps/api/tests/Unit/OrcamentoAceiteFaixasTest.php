<?php

namespace Tests\Unit;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\OrcamentoItem;
use App\Models\Parceiro;
use App\Support\OrcamentoAceiteFaixas;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class OrcamentoAceiteFaixasTest extends TestCase
{
    use RefreshDatabase;

    public function test_n1_indice_documento_espelha_item_unico(): void
    {
        $orc = $this->orcComItens([
            $this->job(1, 'A', [100, 180]),
        ]);

        $out = OrcamentoAceiteFaixas::resolver($orc, ['faixa_index' => 1]);

        $this->assertSame(1, $out['header']);
        $this->assertSame([1 => 1], $out['por_ordem']);
    }

    public function test_n_maior_1_mapa_independente(): void
    {
        $orc = $this->orcComItens([
            $this->job(1, 'Frente', [100, 180]),
            $this->job(2, 'Verso', [90, 160]),
        ]);

        $out = OrcamentoAceiteFaixas::resolver($orc, [
            'faixas_itens' => [
                ['ordem' => 1, 'faixa_index' => 1],
                ['ordem' => 2, 'faixa_index' => 0],
            ],
        ]);

        $this->assertSame(1, $out['header']);
        $this->assertSame([1 => 1, 2 => 0], $out['por_ordem']);

        OrcamentoAceiteFaixas::persistir($orc, $out['por_ordem']);
        $orc->refresh()->load('itens');

        $this->assertSame(1, $orc->itens->firstWhere('ordem', 1)?->aceite_faixa_index);
        $this->assertSame(0, $orc->itens->firstWhere('ordem', 2)?->aceite_faixa_index);
        $this->assertSame('270.00', OrcamentoAceiteFaixas::valorBaseAdiantamento($orc, 1));
        $this->assertSame('1:1+2:0', OrcamentoAceiteFaixas::fingerprint($orc, 1));
    }

    public function test_n_maior_1_fallback_indice_documento(): void
    {
        $orc = $this->orcComItens([
            $this->job(1, 'A', [100, 180]),
            $this->job(2, 'B', [90]),
        ]);

        $out = OrcamentoAceiteFaixas::resolver($orc, ['faixa_index' => 1]);

        $this->assertSame(1, $out['header']);
        $this->assertSame([1 => 1, 2 => 0], $out['por_ordem']);
    }

    public function test_mapa_incompleto_rejeita(): void
    {
        $orc = $this->orcComItens([
            $this->job(1, 'A', [100]),
            $this->job(2, 'B', [90]),
        ]);

        $this->expectException(ValidationException::class);
        OrcamentoAceiteFaixas::resolver($orc, [
            'faixas_itens' => [['ordem' => 1, 'faixa_index' => 0]],
        ]);
    }

    public function test_indice_invalido_no_item_rejeita(): void
    {
        $orc = $this->orcComItens([
            $this->job(1, 'A', [100]),
            $this->job(2, 'B', [90]),
        ]);

        $this->expectException(ValidationException::class);
        OrcamentoAceiteFaixas::resolver($orc, [
            'faixas_itens' => [
                ['ordem' => 1, 'faixa_index' => 0],
                ['ordem' => 2, 'faixa_index' => 3],
            ],
        ]);
    }

    public function test_n1_fingerprint_permanece_indice(): void
    {
        $orc = $this->orcComItens([
            $this->job(1, 'A', [100, 180]),
        ]);
        $this->assertSame('1', OrcamentoAceiteFaixas::fingerprint($orc, 1));
    }

    /**
     * @param  list<array{ordem: int, rotulo: string, faixas: list<float>}>  $jobs
     */
    private function orcComItens(array $jobs): Orcamento
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-ACEITE',
            'razao_social' => 'EMP Aceite',
            'nome_fantasia' => 'Aceite',
            'cnpj' => '00000000000434',
            'situacao' => 'ATIVA',
        ]);
        $parceiro = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-ACEITE',
            'razao_social' => 'Cliente Aceite',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);

        $primeiro = $jobs[0];
        $orc = Orcamento::query()->create([
            'empresa_id' => $empresa->id,
            'ano' => 2026,
            'numero' => 9,
            'codigo' => 'ORC-2026-00009',
            'versao' => 1,
            'parceiro_id' => $parceiro->id,
            'cliente_nome' => $parceiro->razao_social,
            'status' => Orcamento::STATUS_ENVIADO,
            'input_snapshot' => ['medida' => '50x30'],
            'result_snapshot' => ['faixas' => $this->faixasSnap($primeiro['faixas'])],
        ]);

        foreach ($jobs as $job) {
            OrcamentoItem::query()->create([
                'empresa_id' => $empresa->id,
                'orcamento_id' => $orc->id,
                'ordem' => $job['ordem'],
                'rotulo' => $job['rotulo'],
                'input_snapshot' => ['medida' => $job['rotulo']],
                'result_snapshot' => ['faixas' => $this->faixasSnap($job['faixas'])],
            ]);
        }

        return $orc->fresh('itens');
    }

    /**
     * @param  list<float>  $totais
     * @return list<array<string, mixed>>
     */
    private function faixasSnap(array $totais): array
    {
        $out = [];
        foreach ($totais as $i => $total) {
            $out[] = [
                'quantidade' => ($i + 1) * 1000,
                'valor_total' => $total,
                'valor_total_proposta' => number_format($total, 2, '.', ''),
            ];
        }

        return $out;
    }

    /**
     * @param  int  $ordem
     * @param  string  $rotulo
     * @param  list<float>  $totais
     * @return array{ordem: int, rotulo: string, faixas: list<float>}
     */
    private function job(int $ordem, string $rotulo, array $totais): array
    {
        return ['ordem' => $ordem, 'rotulo' => $rotulo, 'faixas' => $totais];
    }
}
