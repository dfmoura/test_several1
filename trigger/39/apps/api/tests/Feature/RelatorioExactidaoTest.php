<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Services\Relatorio\RelatorioProgramaCompiler;
use App\Services\Relatorio\RelatorioProgramaValidator;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Correções de exatidão E1–E7 (Fase 0) — novos testes; RelatorioTest intacto.
 */
class RelatorioExactidaoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private RelatorioProgramaCompiler $compiler;

    private RelatorioProgramaValidator $validator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-EX1',
            'razao_social' => 'Empresa Exatidão',
            'nome_fantasia' => 'Exact',
            'cnpj' => '00000000000515',
            'situacao' => 'ATIVA',
        ]);
        $this->compiler = app(RelatorioProgramaCompiler::class);
        $this->validator = app(RelatorioProgramaValidator::class);

        $pA = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-A',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Zebra Cliente',
            'situacao' => 'ATIVO',
            'papel_cliente' => true,
            'is_prospect' => false,
        ]);
        $pB = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-B',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Alpha Cliente',
            'situacao' => 'ATIVO',
            'papel_cliente' => true,
            'is_prospect' => false,
        ]);

        $this->seedOrcamento($pA, 'ORC-2026-00001', 100.0, '2026-07-15 10:00:00');
        $this->seedOrcamento($pB, 'ORC-2026-00002', 500.0, '2026-07-20 10:00:00');
        $this->seedOrcamento($pA, 'ORC-2026-00003', 300.0, '2026-07-31 18:30:00');
        $this->seedOrcamento($pB, 'ORC-2026-00004', 50.0, '2026-08-01 09:00:00');
    }

    public function test_e1_ordenacao_por_total_no_banco(): void
    {
        $ds = $this->compiler->execute($this->empresa->id, [
            'titulo' => 'Top por valor',
            'fonte' => 'orcamentos',
            'colunas' => ['codigo', 'total'],
            'filtros' => [],
            'ordenacao' => [['campo' => 'total', 'dir' => 'desc']],
            'limite' => 2,
            'totais' => [],
        ], []);

        $this->assertSame('ORC-2026-00002', $ds['rows'][0]['codigo']);
        $this->assertEqualsWithDelta(500.0, (float) $ds['rows'][0]['total'], 0.01);
        $this->assertSame('ORC-2026-00003', $ds['rows'][1]['codigo']);
    }

    public function test_e1_ordenacao_por_parceiro_nome(): void
    {
        $ds = $this->compiler->execute($this->empresa->id, [
            'titulo' => 'Por cliente',
            'fonte' => 'orcamentos',
            'colunas' => ['codigo', 'parceiro_nome'],
            'filtros' => [],
            'ordenacao' => [['campo' => 'parceiro_nome', 'dir' => 'asc']],
            'limite' => 10,
            'totais' => [],
        ], []);

        $this->assertSame('Alpha Cliente', $ds['rows'][0]['parceiro_nome']);
    }

    public function test_e3_truncamento_declarado(): void
    {
        $ds = $this->compiler->execute($this->empresa->id, [
            'titulo' => 'Recorte',
            'fonte' => 'orcamentos',
            'colunas' => ['codigo'],
            'filtros' => [],
            'ordenacao' => [],
            'limite' => 2,
            'totais' => [],
        ], []);

        $this->assertCount(2, $ds['rows']);
        $this->assertSame(4, $ds['total_disponivel']);
        $this->assertTrue($ds['truncado']);
    }

    public function test_e2_e6_totais_sobre_universo_mesmo_sem_coluna(): void
    {
        $ds = $this->compiler->execute($this->empresa->id, [
            'titulo' => 'Soma',
            'fonte' => 'orcamentos',
            'colunas' => ['codigo'],
            'filtros' => [],
            'ordenacao' => [],
            'limite' => 1,
            'totais' => [['campo' => 'total', 'fn' => 'sum']],
        ], []);

        // 100+500+300+50 = 950 — não a soma da página (1 linha).
        $this->assertEqualsWithDelta(950.0, (float) $ds['totais']['total'], 0.01);
    }

    public function test_e4_filtro_mes_inclui_ultimo_dia(): void
    {
        $spec = $this->validator->validate([
            'titulo' => 'Julho',
            'fonte' => 'orcamentos',
            'colunas' => ['codigo', 'created_at'],
            'filtros' => [[
                'campo' => 'created_at',
                'op' => 'between',
                'valor' => ['2026-07-01', '2026-07-31'],
            ]],
            'ordenacao' => [],
            'limite' => 50,
            'totais' => [],
        ], []);

        $ds = $this->compiler->execute($this->empresa->id, $spec, []);
        $codigos = array_column($ds['rows'], 'codigo');
        $this->assertContains('ORC-2026-00003', $codigos);
        $this->assertNotContains('ORC-2026-00004', $codigos);
        $this->assertCount(3, $ds['rows']);
    }

    public function test_e5_count_distinct(): void
    {
        $ds = $this->compiler->execute($this->empresa->id, [
            'titulo' => 'Clientes',
            'fonte' => 'orcamentos',
            'colunas' => ['codigo'],
            'filtros' => [],
            'ordenacao' => [],
            'limite' => 50,
            'totais' => [['campo' => 'parceiro_nome', 'fn' => 'count_distinct']],
        ], []);

        $this->assertEqualsWithDelta(2.0, (float) $ds['totais']['parceiro_nome'], 0.01);
    }

    public function test_e7_facas_ordena_antes_do_limite(): void
    {
        $ds = $this->compiler->execute($this->empresa->id, [
            'titulo' => 'Facas top',
            'fonte' => 'facas',
            'colunas' => ['id', 'repeticao', 'formato'],
            'filtros' => [],
            'ordenacao' => [['campo' => 'repeticao', 'dir' => 'desc']],
            'limite' => 5,
            'totais' => [],
        ], []);

        $this->assertLessThanOrEqual(5, count($ds['rows']));
        $this->assertGreaterThanOrEqual(1, count($ds['rows']));
        $this->assertTrue($ds['total_disponivel'] >= count($ds['rows']));
        if ($ds['total_disponivel'] > 5) {
            $this->assertTrue($ds['truncado']);
            $this->assertCount(5, $ds['rows']);
        }
        // O maior valor de repetição do recorte deve estar na 1ª linha.
        $reps = array_map(fn ($r) => is_numeric($r['repeticao'] ?? null) ? (float) $r['repeticao'] : null, $ds['rows']);
        $reps = array_values(array_filter($reps, fn ($v) => $v !== null));
        if (count($reps) >= 2) {
            $this->assertSame(max($reps), $reps[0]);
        }
    }

    /** R4 — teto por células: 10 colunas × limite 1000 pediria 10k células → corta para 800. */
    public function test_r4_teto_por_celulas_reduz_limite(): void
    {
        $colunas = [
            'codigo', 'status', 'cliente_nome', 'parceiro_codigo', 'parceiro_nome',
            'versao', 'total', 'prazo_entrega_dias', 'validade_dias', 'created_at',
        ];
        $this->assertCount(10, $colunas);

        $spec = $this->validator->validate([
            'titulo' => 'Muitas colunas',
            'fonte' => 'orcamentos',
            'colunas' => $colunas,
            'filtros' => [],
            'ordenacao' => [],
            'limite' => 1000,
            'totais' => [],
        ], []);

        $esperado = intdiv((int) config('erp.relatorio_celulas_max', 8000), 10);
        $this->assertSame($esperado, $spec['limite']);
        $this->assertSame(800, $spec['limite']);
        $this->assertLessThanOrEqual(8000, $spec['limite'] * count($colunas));
    }

    private function seedOrcamento(Parceiro $p, string $codigo, float $valor, string $createdAt): void
    {
        $parts = explode('-', $codigo);
        $o = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => (int) end($parts),
            'codigo' => $codigo,
            'versao' => 1,
            'parceiro_id' => $p->id,
            'cliente_nome' => $p->razao_social,
            'status' => Orcamento::STATUS_CALCULADO,
            'input_snapshot' => [],
            'result_snapshot' => ['faixas' => [['valor_etiqueta' => $valor]]],
            'valor_primeira_faixa' => $valor,
            'chave_matriz' => null,
            'cobra_matriz' => false,
            'valor_matriz' => 0,
            'prazo_entrega_dias' => 12,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);
        // created_at não é fillable — grava direto para controlar o filtro de período.
        Orcamento::query()->whereKey($o->id)->update([
            'created_at' => Carbon::parse($createdAt, 'America/Sao_Paulo'),
            'updated_at' => Carbon::parse($createdAt, 'America/Sao_Paulo'),
        ]);
    }
}
