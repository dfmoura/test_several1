<?php

namespace App\Console\Commands;

use App\Models\EmpresaCertificadoA1;
use Illuminate\Console\Command;

/**
 * Ops: EMPs com A1 a vencer ou vencido (detecção por valido_ate).
 * Agendado diariamente — não envia e-mail; lista para console / logs.
 */
class AvisarCertificadoA1 extends Command
{
    protected $signature = 'plataforma:avisar-certificado-a1
                            {--dias= : Janela A_VENCER (default: config erp.certificado_a1.alerta_dias)}';

    protected $description = 'Lista empresas com certificado A1 a vencer ou vencido';

    public function handle(): int
    {
        $limite = $this->option('dias') !== null
            ? max(1, (int) $this->option('dias'))
            : max(1, (int) config('erp.certificado_a1.alerta_dias', 30));

        $hoje = now();
        $ate = $hoje->copy()->addDays($limite);

        $rows = EmpresaCertificadoA1::query()
            ->with('empresa:id,codigo,razao_social,cnpj')
            ->whereNotNull('valido_ate')
            ->where('valido_ate', '<=', $ate)
            ->orderBy('valido_ate')
            ->get();

        if ($rows->isEmpty()) {
            $this->info("Nenhum certificado A1 a vencer em até {$limite} dia(s) nem vencido.");

            return self::SUCCESS;
        }

        $this->warn($rows->count().' certificado(s) A1 exigem atenção:');
        $this->table(
            ['EMP', 'Razão', 'Validade', 'Dias', 'Status'],
            $rows->map(function (EmpresaCertificadoA1 $c) use ($hoje) {
                $dias = $c->diasParaVencer($hoje);
                $status = $c->statusVigencia($hoje);

                return [
                    $c->empresa?->codigo ?? ('#'.$c->empresa_id),
                    mb_substr((string) ($c->empresa?->razao_social ?? '—'), 0, 40),
                    $c->valido_ate?->format('d/m/Y') ?? '—',
                    $dias === null ? '—' : (string) $dias,
                    $status,
                ];
            })->all(),
        );

        return self::SUCCESS;
    }
}
