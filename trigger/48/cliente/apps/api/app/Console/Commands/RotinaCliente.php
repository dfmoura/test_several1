<?php

namespace App\Console\Commands;

use App\Domain\Rotina\RotinaDiaria;
use Illuminate\Console\Command;

class RotinaCliente extends Command
{
    protected $signature = 'cliente:rotina';

    protected $description = 'Expira PIX, propostas e cadastros, concilia cobranças e bloqueia atraso.';

    public function handle(RotinaDiaria $rotina): int
    {
        $rotina->executar();
        $this->info('Rotina concluída.');

        return self::SUCCESS;
    }
}
