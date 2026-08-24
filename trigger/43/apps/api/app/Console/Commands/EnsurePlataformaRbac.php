<?php

namespace App\Console\Commands;

use App\Support\PlatformRbac;
use Illuminate\Console\Command;

class EnsurePlataformaRbac extends Command
{
    protected $signature = 'plataforma:ensure-rbac';

    protected $description = 'Garante o papel PLATAFORMA e permissões plataforma.* (sem atribuir a ADMIN)';

    public function handle(): int
    {
        PlatformRbac::ensure();
        $this->info('Papel '.PlatformRbac::ROLE.' e permissões plataforma.* sincronizados.');

        return self::SUCCESS;
    }
}
