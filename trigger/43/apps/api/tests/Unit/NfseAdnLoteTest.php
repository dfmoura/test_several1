<?php

namespace Tests\Unit;

use App\Services\Compras\NfseAdnLote;
use PHPUnit\Framework\TestCase;

class NfseAdnLoteTest extends TestCase
{
    public function test_404_sem_documento_e_caixa_vazia(): void
    {
        $lote = new NfseAdnLote;
        $body = json_encode([
            'StatusProcessamento' => 'NENHUM_DOCUMENTO_LOCALIZADO',
            'Erros' => [[
                'Codigo' => 'E0000',
                'Descricao' => 'Nenhum documento localizado',
            ]],
        ], JSON_UNESCAPED_UNICODE);

        $this->assertTrue($lote->vazioOficial(404, (string) $body));
        $this->assertFalse($lote->vazioOficial(404, '{"StatusProcessamento":"REJEICAO"}'));
        $this->assertFalse($lote->vazioOficial(500, (string) $body));

        $lido = $lote->interpretar(json_decode((string) $body, true), '0');
        $this->assertSame([], $lido['documentos']);
        $this->assertTrue($lido['vazio']);
        $this->assertSame('0', $lido['max_nsu']);
    }
}
