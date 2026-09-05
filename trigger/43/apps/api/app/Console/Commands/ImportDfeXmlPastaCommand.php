<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Services\Compras\DfeImportXmlLocalService;
use Illuminate\Console\Command;

/**
 * Carrega XMLs oficiais (pasta) na caixa NF-e destinadas — só ERP_STAGE=local.
 * Não fala com SEFAZ. Idempotente por chave. Valida destinatário = CNPJ da EMP.
 */
class ImportDfeXmlPastaCommand extends Command
{
    protected $signature = 'dfe:importar-xml-pasta
                            {pasta : Caminho absoluto da pasta com *.xml}
                            {--empresa= : ID da EMP (default: primeira ATIVA)}
                            {--sem-validar-dest : Não exige destinatário = CNPJ da EMP}';

    protected $description = 'Importa XMLs NF-e para a caixa DF-e (somente stage local)';

    public function handle(DfeImportXmlLocalService $service): int
    {
        if (strtolower((string) config('erp.stage', 'local')) !== 'local') {
            $this->error('Comando só permitido com ERP_STAGE=local (não roda em homolog/production).');

            return self::FAILURE;
        }

        $empresa = $this->option('empresa')
            ? Empresa::query()->find((int) $this->option('empresa'))
            : Empresa::query()->where('situacao', 'ATIVA')->orderBy('id')->first();

        if ($empresa === null) {
            $this->error('Nenhuma EMP encontrada.');

            return self::FAILURE;
        }

        $pasta = (string) $this->argument('pasta');
        $this->info(sprintf(
            'EMP %d (%s · CNPJ %s) ← %s',
            $empresa->id,
            $empresa->codigo,
            preg_replace('/\D/', '', (string) $empresa->cnpj),
            $pasta,
        ));

        try {
            $out = $service->importarPasta(
                $empresa,
                $pasta,
                ! (bool) $this->option('sem-validar-dest'),
            );
        } catch (\InvalidArgumentException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->table(
            ['Criados', 'Atualizados', 'Ignorados', 'Erros'],
            [[$out['criados'], $out['atualizados'], $out['ignorados'], count($out['erros'])]],
        );

        foreach (array_slice($out['erros'], 0, 20) as $err) {
            $this->warn("  · {$err['arquivo']}: {$err['motivo']}");
        }
        if (count($out['erros']) > 20) {
            $this->warn('  … +'.(count($out['erros']) - 20).' erro(s)');
        }

        $this->line('Abra http://localhost:8043/compras/nfe-destinadas (filtro ano das notas).');
        $this->comment('Atualizar do fisco permanece bloqueado em ERP_STAGE=local (norma).');

        return count($out['erros']) > 0 && ($out['criados'] + $out['atualizados']) === 0
            ? self::FAILURE
            : self::SUCCESS;
    }
}
