<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Relatorio;
use App\Models\RelatorioExecucao;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Retenção operacional R6 (impacto computacional §8).
 */
class RelatorioPurgarTest extends TestCase
{
    use RefreshDatabase;

    public function test_purga_pdf_antigo_e_mantem_linha(): void
    {
        Storage::fake('local');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-PUR',
            'razao_social' => 'Purge Co',
            'nome_fantasia' => 'Purge',
            'cnpj' => '00000000000612',
            'situacao' => 'ATIVA',
        ]);
        $user = User::factory()->create();

        Storage::disk('local')->put('relatorios/velho.pdf', '%PDF-fake');
        Storage::disk('local')->put('relatorios/novo.pdf', '%PDF-fake');

        $velho = Relatorio::query()->create([
            'empresa_id' => $empresa->id,
            'ano' => 2025,
            'numero' => 1,
            'codigo' => 'REL-2025-00001',
            'titulo' => 'Velho',
            'prompt' => 'teste',
            'orientacao' => Relatorio::ORIENTACAO_RETRATO,
            'status' => Relatorio::STATUS_CONCLUIDO,
            'programa_json' => ['fonte' => 'orcamentos', 'colunas' => ['codigo']],
            'contexto_flags' => [],
            'arquivo_path' => 'relatorios/velho.pdf',
            'criado_por' => $user->id,
        ]);
        Relatorio::query()->whereKey($velho->id)->update([
            'created_at' => now()->subDays(200),
            'updated_at' => now()->subDays(200),
        ]);

        $novo = Relatorio::query()->create([
            'empresa_id' => $empresa->id,
            'ano' => 2026,
            'numero' => 2,
            'codigo' => 'REL-2026-00002',
            'titulo' => 'Novo',
            'prompt' => 'teste',
            'orientacao' => Relatorio::ORIENTACAO_RETRATO,
            'status' => Relatorio::STATUS_CONCLUIDO,
            'programa_json' => ['fonte' => 'orcamentos', 'colunas' => ['codigo']],
            'contexto_flags' => [],
            'arquivo_path' => 'relatorios/novo.pdf',
            'criado_por' => $user->id,
        ]);

        RelatorioExecucao::query()->create([
            'empresa_id' => $empresa->id,
            'relatorio_id' => $velho->id,
            'usuario_id' => $user->id,
            'etapa' => 'render',
            'sucesso' => true,
            'memory_peak_mb' => 42,
            'created_at' => now()->subDays(100),
        ]);
        RelatorioExecucao::query()->create([
            'empresa_id' => $empresa->id,
            'relatorio_id' => $novo->id,
            'usuario_id' => $user->id,
            'etapa' => 'render',
            'sucesso' => true,
            'memory_peak_mb' => 40,
            'created_at' => now()->subDays(10),
        ]);

        $this->artisan('relatorios:purgar')
            ->assertSuccessful();

        $velho->refresh();
        $novo->refresh();

        $this->assertNull($velho->arquivo_path);
        $this->assertSame(Relatorio::STATUS_CONCLUIDO, $velho->status);
        $this->assertSame('relatorios/novo.pdf', $novo->arquivo_path);
        Storage::disk('local')->assertMissing('relatorios/velho.pdf');
        Storage::disk('local')->assertExists('relatorios/novo.pdf');

        $this->assertSame(1, RelatorioExecucao::query()->count());
        $this->assertTrue(RelatorioExecucao::query()->where('relatorio_id', $novo->id)->exists());
    }

    public function test_dry_run_nao_altera(): void
    {
        Storage::fake('local');
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-DR',
            'razao_social' => 'Dry',
            'nome_fantasia' => 'Dry',
            'cnpj' => '00000000000709',
            'situacao' => 'ATIVA',
        ]);
        $user = User::factory()->create();
        Storage::disk('local')->put('relatorios/x.pdf', 'x');

        $r = Relatorio::query()->create([
            'empresa_id' => $empresa->id,
            'ano' => 2025,
            'numero' => 9,
            'codigo' => 'REL-2025-00009',
            'titulo' => 'X',
            'prompt' => 't',
            'orientacao' => Relatorio::ORIENTACAO_RETRATO,
            'status' => Relatorio::STATUS_CONCLUIDO,
            'arquivo_path' => 'relatorios/x.pdf',
            'criado_por' => $user->id,
        ]);
        Relatorio::query()->whereKey($r->id)->update(['created_at' => now()->subDays(400)]);

        $this->artisan('relatorios:purgar', ['--dry-run' => true])->assertSuccessful();

        $r->refresh();
        $this->assertSame('relatorios/x.pdf', $r->arquivo_path);
        Storage::disk('local')->assertExists('relatorios/x.pdf');
    }
}
