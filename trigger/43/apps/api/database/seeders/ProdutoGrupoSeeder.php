<?php

namespace Database\Seeders;

use App\Services\Cadastros\ProdutoGrupoService;
use Illuminate\Database\Seeder;

class ProdutoGrupoSeeder extends Seeder
{
    public function run(): void
    {
        $service = app(ProdutoGrupoService::class);
        $service->seedCatalog();
        $service->backfillProdutos();
    }
}
