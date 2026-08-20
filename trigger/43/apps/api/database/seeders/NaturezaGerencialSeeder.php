<?php

namespace Database\Seeders;

use App\Services\Cadastros\NaturezaGerencialService;
use Illuminate\Database\Seeder;

class NaturezaGerencialSeeder extends Seeder
{
    public function run(): void
    {
        app(NaturezaGerencialService::class)->seedCatalog();
    }
}
