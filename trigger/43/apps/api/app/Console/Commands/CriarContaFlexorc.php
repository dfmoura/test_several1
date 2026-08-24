<?php

namespace App\Console\Commands;

use App\Services\Plataforma\ConsolePlataformaService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

/**
 * Provisiona a conta master FLEXORC (USR + ADMIN + conta_ativacoes) sem alta pública.
 * O administrador master cria os demais usuários em /usuarios e entrega as credenciais.
 * Opcional: --cortesia-dias bonifica período free (mesmo motor do console /plataforma).
 */
class CriarContaFlexorc extends Command
{
    protected $signature = 'plataforma:criar-conta
                            {email : E-mail do administrador master}
                            {--name= : Nome de exibição}
                            {--password= : Senha (omitir gera uma temporária)}
                            {--cortesia-dias=0 : Dias de período cortesia (bonificação TRIGGER)}
                            {--cortesia-motivo= : Motivo interno da cortesia}';

    protected $description = 'Cria conta FLEXORC master (ADMIN) sem cadastro público no login';

    public function handle(ConsolePlataformaService $console): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('E-mail inválido.');

            return self::FAILURE;
        }

        $name = trim((string) ($this->option('name') ?: 'Administrador'));
        $password = (string) $this->option('password');
        $dias = max(0, (int) $this->option('cortesia-dias'));
        $motivo = trim((string) $this->option('cortesia-motivo'));

        try {
            $out = $console->provisionarConta([
                'name' => $name,
                'email' => $email,
                'password' => $password !== '' ? $password : null,
                'cortesia_dias' => $dias > 0 ? $dias : null,
                'cortesia_motivo' => $motivo !== '' ? $motivo : null,
            ]);
        } catch (ValidationException $e) {
            foreach ($e->errors() as $msgs) {
                foreach ($msgs as $msg) {
                    $this->error($msg);
                }
            }

            return self::FAILURE;
        }

        $user = $out['conta']->user;
        $this->info("Conta master pronta: {$user->codigo} · {$user->email}");
        if ($out['conta']->cortesia_ate !== null) {
            $this->info('Cortesia até '.$out['conta']->cortesia_ate->timezone(config('app.timezone'))->format('d/m/Y'));
        }
        $this->line('Login: /login  ·  Usuários da conta: /usuarios (perfil ADMIN)');
        $this->comment('Passe e-mail e senha ao usuário fora do canal público — ele só acessa.');
        if ($out['senha_temporaria'] !== null) {
            $this->warn("Senha temporária: {$out['senha_temporaria']}");
        }

        return self::SUCCESS;
    }
}
