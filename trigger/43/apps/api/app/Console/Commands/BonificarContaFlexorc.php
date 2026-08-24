<?php

namespace App\Console\Commands;

use App\Models\ContaAtivacao;
use App\Models\User;
use App\Services\Plataforma\ConsolePlataformaService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

/**
 * Bonifica (ou revoga) período cortesia de uma conta FLEXORC.
 */
class BonificarContaFlexorc extends Command
{
    protected $signature = 'plataforma:bonificar-conta
                            {email : E-mail do master da conta}
                            {--dias= : Dias a conceder (soma se já houver cortesia vigente)}
                            {--ate= : Data final (Y-m-d) — alternativa a --dias}
                            {--motivo= : Motivo interno}
                            {--encerrar : Encerra a cortesia hoje (histórico permanece)}
                            {--revogar : Remove a cortesia vigente}';

    protected $description = 'Concede, estende ou revoga período cortesia (bonificação) de uma conta FLEXORC';

    public function handle(ConsolePlataformaService $console): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        $user = User::query()->where('email', $email)->first();
        if ($user === null) {
            $this->error('Usuário não encontrado.');

            return self::FAILURE;
        }

        $conta = ContaAtivacao::query()->where('user_id', $user->id)->first();
        if ($conta === null) {
            $this->error('Esta conta não tem mensalidade FLEXORC (conta_ativacoes).');

            return self::FAILURE;
        }

        $payload = [
            'motivo' => trim((string) $this->option('motivo')) ?: null,
            'encerrar' => (bool) $this->option('encerrar'),
            'revogar' => (bool) $this->option('revogar'),
        ];
        if ($this->option('dias') !== null && $this->option('dias') !== '') {
            $payload['dias'] = (int) $this->option('dias');
        }
        if ($this->option('ate') !== null && trim((string) $this->option('ate')) !== '') {
            $payload['ate'] = trim((string) $this->option('ate'));
        }

        try {
            $atualizado = $console->bonificarConta($conta, $payload);
        } catch (ValidationException $e) {
            foreach ($e->errors() as $msgs) {
                foreach ($msgs as $msg) {
                    $this->error($msg);
                }
            }

            return self::FAILURE;
        }

        if ($payload['revogar']) {
            $this->info("Cortesia revogada: {$user->codigo} · {$user->email}");

            return self::SUCCESS;
        }

        if ($payload['encerrar']) {
            $this->info("Cortesia encerrada: {$user->codigo} · {$user->email}");
            $this->line('Histórico preservado. Mensalidade autenticada no ASAAS permanece.');

            return self::SUCCESS;
        }

        $this->info("Cortesia até {$atualizado->cortesia_ate?->timezone(config('app.timezone'))->format('d/m/Y')}");
        $this->line("Conta {$user->codigo} · {$user->email}");

        return self::SUCCESS;
    }
}
