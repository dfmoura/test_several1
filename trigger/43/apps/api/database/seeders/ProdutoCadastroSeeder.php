<?php

namespace Database\Seeders;

use App\Models\Empresa;
use App\Services\Cadastros\ProdutoCadastroService;
use Illuminate\Database\Seeder;

/**
 * Famílias fiscais Camada A (estudo 32 LISTAGEM_PRODUTOS_CADASTRO).
 * Idempotente — seguro reexecutar em EMP-00001.
 */
class ProdutoCadastroSeeder extends Seeder
{
    public function run(): void
    {
        $empresa = Empresa::query()->where('codigo', 'EMP-00001')->first();
        if (! $empresa) {
            $this->command?->warn('EMP-00001 não encontrada — ProdutoCadastroSeeder ignorado.');

            return;
        }

        $result = app(ProdutoCadastroService::class)->seedForEmpresa($empresa, incluirDemosVenda: true);

        $this->command?->info(sprintf(
            'Produtos Camada A: %d famílias + %d demos · sequences=%d',
            $result['familias'],
            $result['demos'],
            $result['sequences']
        ));
    }
}
