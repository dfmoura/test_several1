<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Services\Cadastros\CondicaoPagamentoSugestaoService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotente — lista canônica de sugestões em todas as EMPs (deploy existente).
 */
class EnsureCondicaoPagamentoSugestoes extends Command
{
    protected $signature = 'condicao-pagamento:ensure-sugestoes';

    protected $description = 'Semeia sugestões canônicas de condição de pagamento em cada empresa';

    public function handle(CondicaoPagamentoSugestaoService $service): int
    {
        if (! Schema::hasTable('condicao_pagamento_sugestoes')) {
            $this->error('Tabela condicao_pagamento_sugestoes ausente — rode as migrations primeiro.');

            return self::FAILURE;
        }

        $totalCriados = 0;
        $empresas = Empresa::query()->orderBy('id')->get(['id', 'codigo']);

        foreach ($empresas as $empresa) {
            $result = $service->seedCanonicos($empresa);
            $totalCriados += $result['criados'];
            $this->line("{$empresa->codigo}: +{$result['criados']} (total {$result['total']})");
        }

        $this->info("Concluído — {$totalCriados} sugestão(ões) criadas nesta execução.");

        return self::SUCCESS;
    }
}
