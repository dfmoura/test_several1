<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Services\Cadastros\ProdutoCadastroService;
use Illuminate\Console\Command;

/**
 * Reaplica o catálogo Camada A (89 famílias) sem db:seed completo.
 * Idempotente por (empresa_id, codigo). Não zera custo_medio já gravado.
 */
class SeedProdutosCadastroCommand extends Command
{
    protected $signature = 'erp:seed-produtos-cadastro
                            {--empresa=EMP-00001 : Código da empresa (instalação)}
                            {--sem-demos : Não incluir PA-ETQ-001 / SVC-001}';

    protected $description = 'Cadastra/atualiza Camada A (89 famílias) + Exact Avery + demos; tenta de-para se fornecedor existir';

    public function handle(ProdutoCadastroService $service): int
    {
        $codigo = (string) $this->option('empresa');
        $empresa = Empresa::query()->where('codigo', $codigo)->first();

        if (! $empresa) {
            $this->error("Empresa {$codigo} não encontrada.");

            return self::FAILURE;
        }

        $result = $service->seedForEmpresa(
            $empresa,
            incluirDemosVenda: ! $this->option('sem-demos')
        );

        $this->info(sprintf(
            'OK · %s · famílias=%d · exact=%d · demos=%d · sequences=%d · depara=%d',
            $codigo,
            $result['familias'],
            $result['exact'] ?? 0,
            $result['demos'],
            $result['sequences'],
            $result['depara'] ?? 0
        ));

        return self::SUCCESS;
    }
}
