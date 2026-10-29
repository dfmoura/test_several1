<?php

namespace Tests\Feature;

use App\Domain\Cobranca\CobrancaService;
use App\Models\Parametro;
use Tests\Concerns\CriaEmpresa;

class PixAtivacaoTest extends AreaTestCase
{
    use CriaEmpresa;

    public function test_pagina_pix_mostra_qr_svg_inline(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo(0);
        $empresa->status = 'AGUARDA_PIX';
        $empresa->save();

        $cobranca = app(CobrancaService::class)->emitir(
            $empresa->id,
            'ATIVACAO',
            Parametro::inteiro('ATIVACAO_CENTAVOS'),
        );

        $this->entrarComo($usuario, $empresa)
            ->get(route('pix.mostrar', $cobranca->txid))
            ->assertOk()
            ->assertSee('aguardando o banco', false)
            ->assertSee('<svg', false)
            ->assertDontSee('data:image/svg+xml', false)
            ->assertSee('R$ 1.000,00');
    }

    public function test_inicio_leva_ao_pix_de_ativacao(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo(0);
        $empresa->status = 'AGUARDA_PIX';
        $empresa->save();

        $cobranca = app(CobrancaService::class)->emitir(
            $empresa->id,
            'ATIVACAO',
            Parametro::inteiro('ATIVACAO_CENTAVOS'),
        );

        $this->entrarComo($usuario, $empresa)
            ->get(route('inicio'))
            ->assertOk()
            ->assertSee('Falta o PIX de ativação.')
            ->assertSee('Pagar PIX de ativação')
            ->assertSee(route('pix.mostrar', $cobranca->txid), false);
    }
}
