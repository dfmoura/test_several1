<?php

namespace App\Http;

use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;

class Qr
{
    public static function svg(string $conteudo): string
    {
        $opcoes = new QROptions([
            'outputType' => QRCode::OUTPUT_MARKUP_SVG,
            'scale' => 6,
            'svgAddXmlHeader' => false,
        ]);

        return (new QRCode($opcoes))->render($conteudo);
    }
}
