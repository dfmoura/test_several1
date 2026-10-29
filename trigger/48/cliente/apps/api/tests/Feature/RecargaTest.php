<?php

namespace Tests\Feature;

use App\Models\CobrancaPix;
use Tests\Concerns\CriaEmpresa;

class RecargaTest extends AreaTestCase
{
    use CriaEmpresa;

    public function test_recarga_igual_a_ativacao_e_recusada(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo();

        $this->entrarComo($usuario, $empresa)
            ->get(route('conta.recarga'))
            ->assertOk()
            ->assertSee('Recargas devem ser superiores a R$ 1.000,00');

        $this->from(route('conta.recarga'))
            ->post(route('conta.recarga.emitir'), [
                '_token' => session()->token(),
                'valor' => '1.000,00',
            ])
            ->assertRedirect(route('conta.recarga'))
            ->assertSessionHas('erro', 'A recarga deve ser superior a R$ 1.000,00.');

        $this->assertSame(0, CobrancaPix::query()->where('empresa_id', $empresa->id)->where('finalidade', 'RECARGA')->count());
    }

    public function test_recarga_acima_da_ativacao_emite_pix(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo();

        $this->entrarComo($usuario, $empresa)
            ->get(route('conta.recarga'))
            ->assertOk();

        $resposta = $this->from(route('conta.recarga'))
            ->post(route('conta.recarga.emitir'), [
                '_token' => session()->token(),
                'valor' => '1.000,01',
            ]);

        $cobranca = CobrancaPix::query()
            ->where('empresa_id', $empresa->id)
            ->where('finalidade', 'RECARGA')
            ->where('status', 'ATIVA')
            ->first();

        $this->assertNotNull($cobranca);
        $this->assertSame(100001, (int) $cobranca->valor_centavos);
        $resposta->assertRedirect(route('pix.mostrar', $cobranca->txid));
    }
}
