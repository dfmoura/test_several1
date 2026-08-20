<?php

namespace Database\Seeders;

use App\Services\Consulta\FiscalCatalogService;
use Illuminate\Database\Seeder;

class FiscalCatalogSeeder extends Seeder
{
    public function run(): void
    {
        app(FiscalCatalogService::class)->seedCatalog();
    }
}
