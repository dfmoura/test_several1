<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PlatformRbac;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CriarOperadorPlataforma extends Command
{
    protected $signature = 'plataforma:criar-operador
                            {email : E-mail do operador TRIGGER}
                            {--name= : Nome de exibição}
                            {--password= : Senha (omitir gera uma temporária)}';

    protected $description = 'Cria ou promove um usuário PLATAFORMA sem EMP (console TRIGGER)';

    public function handle(CodigoGenerator $codigos, AuditLogger $audit): int
    {
        PlatformRbac::ensure();

        $email = strtolower(trim((string) $this->argument('email')));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('E-mail inválido.');

            return self::FAILURE;
        }

        $name = trim((string) ($this->option('name') ?: 'Operação TRIGGER'));
        $plain = (string) $this->option('password');
        $generated = false;
        if ($plain === '') {
            $plain = Str::password(20);
            $generated = true;
        }

        $user = User::withTrashed()->where('email', $email)->first();

        if ($user !== null) {
            if ($user->trashed()) {
                $this->error('Este e-mail pertence a um usuário excluído. Restaure manualmente ou use outro e-mail.');

                return self::FAILURE;
            }
            if ($user->empresas()->exists() || $user->contaAtivacao()->exists()) {
                $this->error('Este e-mail já é uma conta FLEXORC. Não converta pagador em operador.');

                return self::FAILURE;
            }
        }

        DB::transaction(function () use ($user, $email, $name, $plain, $codigos) {
            if ($user === null) {
                $user = User::query()->create([
                    'name' => $name,
                    'email' => $email,
                    'password' => $plain,
                    'codigo' => $codigos->nextCode(null, 'USR'),
                    'ativo' => true,
                ]);
            } else {
                $user->name = $name;
                $user->password = $plain;
                $user->ativo = true;
                $user->empresa_default_id = null;
                $user->save();
            }

            $user->syncRoles([PlatformRbac::ROLE]);
            $user->empresas()->detach();
        });

        $fresh = User::query()->where('email', $email)->firstOrFail();
        $audit->log('PLATAFORMA_OPERADOR_PROVISIONADO', 'usuario', $fresh->id, null, [
            'email' => $fresh->email,
            'codigo' => $fresh->codigo,
        ]);

        $this->info("Operador pronto: {$fresh->codigo} · {$fresh->email}");
        $this->line('Console: /plataforma  (sem empresas vinculadas)');
        if ($generated) {
            $this->warn("Senha temporária: {$plain}");
        }

        return self::SUCCESS;
    }
}
