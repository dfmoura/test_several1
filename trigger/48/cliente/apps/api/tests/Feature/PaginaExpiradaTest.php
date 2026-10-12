<?php

namespace Tests\Feature;

class PaginaExpiradaTest extends AreaTestCase
{
    public function test_envio_sem_token_volta_ao_login_com_aviso(): void
    {
        $this->from(route('entrar'))
            ->post(route('entrar'), [
                'email' => 'diogo.moura@triggerti.com',
                'senha' => 'senha-local-123',
            ])
            ->assertRedirect(route('entrar'))
            ->assertSessionHas('erro', 'A página expirou. Tente novamente.');
    }

    public function test_envio_sem_origem_cai_no_login_da_area(): void
    {
        $this->post(route('operacao.entrar'), [
            'email' => 'operacao@triggerti.com',
            'senha' => 'senha-operacao-local',
        ])->assertRedirect(route('operacao.entrar'));
    }
}
