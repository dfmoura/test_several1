<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Models\User;
use App\Services\Estoque\EstoqueViradaCatalogData;
use App\Services\Estoque\EstoqueViradaService;
use Illuminate\Console\Command;

/**
 * Popula saldo de abertura (virada) via AJU A03 — estudo 32.
 * Idempotente: não sobrescreve saldo existente.
 */
class SeedEstoqueViradaCommand extends Command
{
    protected $signature = 'erp:seed-estoque-virada
                            {--empresa=EMP-00001 : Código da empresa (instalação)}
                            {--solicitante= : E-mail quem solicita (estoque.escrever); default: 1º não-admin com estoque.escrever}
                            {--aprovador= : E-mail quem aprova (estoque.aprovar); default: admin}
                            {--incluir-demos : Inclui ribbons sintéticos (REV) para teste}
                            {--sem-minimos : Não grava estoque_minimo do catálogo}
                            {--dry-run : Só simula; não cria AJU/MOV/saldo}';

    protected $description = 'Virada Camada A via AJU A03 (consolidado 32 + tintas operacionais) — sem editar saldo direto';

    public function handle(EstoqueViradaService $service): int
    {
        $codigoEmp = (string) $this->option('empresa');
        $empresa = Empresa::query()->where('codigo', $codigoEmp)->first();

        if (! $empresa) {
            $this->error("Empresa {$codigoEmp} não encontrada.");

            return self::FAILURE;
        }

        $aprovador = $this->resolveAprovador();
        if (! $aprovador) {
            return self::FAILURE;
        }

        $solicitante = $this->resolveSolicitante($aprovador);
        if (! $solicitante) {
            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $incluirDemos = (bool) $this->option('incluir-demos');

        $this->info(sprintf(
            'Virada estoque · %s · fonte=%s · solicitante=%s · aprovador=%s%s%s',
            $codigoEmp,
            EstoqueViradaCatalogData::FONTE,
            $solicitante->email,
            $aprovador->email,
            $incluirDemos ? ' · +demos' : '',
            $dryRun ? ' · DRY-RUN' : ''
        ));

        $result = $service->popular($empresa, $solicitante, $aprovador, [
            'incluir_demos' => $incluirDemos,
            'set_minimos' => ! $this->option('sem-minimos'),
            'dry_run' => $dryRun,
        ]);

        foreach ($result['itens'] as $item) {
            $acao = $item['acao'];
            $codigo = $item['codigo'];
            $lotesInfo = isset($item['lotes']) ? sprintf(' · %d lote(s)', (int) $item['lotes']) : '';
            $line = match ($acao) {
                'aplicado' => sprintf(
                    '  ✓ %s → %s %s · %s / %s%s%s',
                    $codigo,
                    $item['qtde'],
                    $item['unidade'] ?? '',
                    $item['ajuste'] ?? '-',
                    $item['movimento'] ?? '-',
                    $lotesInfo,
                    ($item['fonte'] ?? '') === 'backfill_lotes' ? ' · backfill' : ''
                ),
                'dry_run' => sprintf('  · %s → %s %s (dry-run)', $codigo, $item['qtde'], $item['unidade'] ?? ''),
                'pulado' => sprintf('  – %s pulado: %s', $codigo, $item['motivo'] ?? ''),
                'faltando' => sprintf('  ? %s faltando: %s', $codigo, $item['motivo'] ?? ''),
                'erro' => sprintf('  ✗ %s erro: %s', $codigo, $item['motivo'] ?? ''),
                default => sprintf('  · %s %s', $codigo, $acao),
            };
            $this->line($line);
        }

        $this->newLine();
        $this->info(sprintf(
            'Resumo · aplicados=%d · pulados=%d · faltando=%d · erros=%d',
            $result['aplicados'],
            $result['pulados'],
            $result['faltando'],
            $result['erros']
        ));

        return $result['erros'] > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function resolveAprovador(): ?User
    {
        $email = $this->option('aprovador')
            ?: (string) config('erp.admin_email', 'admin@rlp.com.br');

        $user = User::query()->where('email', $email)->where('ativo', true)->first();
        if (! $user) {
            $this->error("Aprovador não encontrado: {$email}");

            return null;
        }

        if (! $user->can('estoque.aprovar')) {
            $this->error("{$email} sem permissão estoque.aprovar.");

            return null;
        }

        return $user;
    }

    private function resolveSolicitante(User $aprovador): ?User
    {
        $emailOpt = $this->option('solicitante');
        if ($emailOpt) {
            $user = User::query()->where('email', $emailOpt)->where('ativo', true)->first();
            if (! $user) {
                $this->error("Solicitante não encontrado: {$emailOpt}");

                return null;
            }
            if ((int) $user->id === (int) $aprovador->id) {
                $this->error('Solicitante não pode ser o mesmo aprovador (SoD).');

                return null;
            }
            if (! $user->can('estoque.escrever')) {
                $this->error("{$emailOpt} sem permissão estoque.escrever.");

                return null;
            }

            return $user;
        }

        $candidato = User::query()
            ->where('ativo', true)
            ->where('id', '!=', $aprovador->id)
            ->orderBy('id')
            ->get()
            ->first(fn (User $u) => $u->can('estoque.escrever'));

        if (! $candidato) {
            $this->error('Nenhum solicitante com estoque.escrever distinto do aprovador.');
            $this->line('Informe --solicitante=email ou garanta um usuário operacional (ex.: compras).');

            return null;
        }

        return $candidato;
    }
}
