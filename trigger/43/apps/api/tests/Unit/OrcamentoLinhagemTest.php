<?php

namespace Tests\Unit;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\OrcamentoItem;
use App\Models\Parceiro;
use App\Support\OrcamentoLinhagem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrcamentoLinhagemTest extends TestCase
{
    use RefreshDatabase;

    public function test_fingerprint_igual_para_mesma_spec_e_ignora_prazo(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-LIN',
            'razao_social' => 'Empresa Linhagem',
            'nome_fantasia' => 'Lin',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
        ]);
        $parceiro = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-LIN1',
            'razao_social' => 'Cliente Lin',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);

        $base = [
            'necessidade' => 'PRODUCAO',
            'tipo_operacao' => 'INDUSTRIALIZACAO',
            'medida' => '100X50',
            'largura_cm' => 10,
            'puxada_cm' => 5,
            'cores' => 4,
            'papel' => 'BOPP',
            'acabamento' => 'Verniz',
            'faixas' => [['quantidade' => 10000, 'comissao_pct' => 5]],
        ];

        $a = Orcamento::query()->create([
            'empresa_id' => $empresa->id,
            'ano' => 2026,
            'numero' => 1,
            'codigo' => 'ORC-2026-00001',
            'versao' => 1,
            'linhagem' => Orcamento::LINHAGEM_NOVO,
            'parceiro_id' => $parceiro->id,
            'cliente_nome' => 'A',
            'status' => Orcamento::STATUS_CALCULADO,
            'input_snapshot' => array_merge($base, ['prazo_entrega_dias' => 12]),
            'result_snapshot' => [],
            'prazo_entrega_dias' => 12,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);
        OrcamentoItem::query()->create([
            'empresa_id' => $empresa->id,
            'orcamento_id' => $a->id,
            'ordem' => 1,
            'input_snapshot' => $base,
            'result_snapshot' => [],
        ]);

        $b = Orcamento::query()->create([
            'empresa_id' => $empresa->id,
            'ano' => 2026,
            'numero' => 2,
            'codigo' => 'ORC-2026-00002',
            'versao' => 1,
            'linhagem' => Orcamento::LINHAGEM_REPETICAO,
            'parceiro_id' => $parceiro->id,
            'cliente_nome' => 'A',
            'status' => Orcamento::STATUS_CALCULADO,
            'input_snapshot' => array_merge($base, ['prazo_entrega_dias' => 30, 'observacao' => 'x']),
            'result_snapshot' => [],
            'prazo_entrega_dias' => 30,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);
        OrcamentoItem::query()->create([
            'empresa_id' => $empresa->id,
            'orcamento_id' => $b->id,
            'ordem' => 1,
            'input_snapshot' => $base,
            'result_snapshot' => [],
        ]);

        $this->assertTrue(OrcamentoLinhagem::mesmoFingerprint($a->fresh('itens'), $b->fresh('itens')));

        $bItem = $b->itens()->firstOrFail();
        $snap = $bItem->input_snapshot;
        $snap['cores'] = 5;
        $bItem->input_snapshot = $snap;
        $bItem->save();

        $this->assertFalse(OrcamentoLinhagem::mesmoFingerprint($a->fresh('itens'), $b->fresh('itens')));
    }
}
