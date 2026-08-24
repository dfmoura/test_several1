<?php

namespace App\Support;

/** Nome do produto na UI/API — fonte única alinhada a config/erp.php e brand.ts. */
final class ProductBrand
{
    public static function name(): string
    {
        return (string) config('erp.brand.licensee_product', 'FLEXOERP');
    }
}
