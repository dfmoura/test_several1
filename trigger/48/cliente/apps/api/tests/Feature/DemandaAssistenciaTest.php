<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\Concerns\CriaEmpresa;

class DemandaAssistenciaTest extends AreaTestCase
{
    use CriaEmpresa;

    public function test_botao_ausente_quando_desligada(): void
    {
        config([
            'assistencia.habilitada' => false,
            'assistencia.url' => '',
            'assistencia.api_key' => '',
        ]);
        [$empresa, $usuario] = $this->empresaComSaldo();

        $this->entrarComo($usuario, $empresa)
            ->get(route('demandas.criar'))
            ->assertOk()
            ->assertDontSee('Formular com assistência');
    }

    public function test_botao_aparece_quando_ligada(): void
    {
        config([
            'assistencia.habilitada' => true,
            'assistencia.url' => 'http://assistencia.test',
            'assistencia.api_key' => 'chave-teste',
        ]);
        [$empresa, $usuario] = $this->empresaComSaldo();

        $this->entrarComo($usuario, $empresa)
            ->get(route('demandas.criar'))
            ->assertOk()
            ->assertSee('Formular com assistência');
    }

    public function test_abrir_proxy_para_o_servico(): void
    {
        config([
            'assistencia.habilitada' => true,
            'assistencia.url' => 'http://assistencia.test',
            'assistencia.api_key' => 'chave-teste',
        ]);
        Http::fake([
            'http://assistencia.test/v1/sessions' => Http::response([
                'session_id' => 'asst_abc',
                'reply' => 'Vamos formular juntos.',
            ], 200),
        ]);
        [$empresa, $usuario] = $this->empresaComSaldo();

        $this->entrarComo($usuario, $empresa)
            ->post(route('demandas.assistencia.abrir'), [
                '_token' => session()->token(),
            ])
            ->assertOk()
            ->assertJson([
                'session_id' => 'asst_abc',
                'reply' => 'Vamos formular juntos.',
            ]);

        Http::assertSent(fn ($request) => $request->url() === 'http://assistencia.test/v1/sessions'
            && $request->hasHeader('X-API-Key', 'chave-teste'));
    }

    public function test_finalizar_devolve_descricao_sem_criar_demanda(): void
    {
        config([
            'assistencia.habilitada' => true,
            'assistencia.url' => 'http://assistencia.test',
            'assistencia.api_key' => 'chave-teste',
        ]);
        Http::fake([
            'http://assistencia.test/v1/sessions/asst_abc/compose' => Http::response([
                'session_id' => 'asst_abc',
                'descricao' => "Fechamento do mês\nSai em planilha; precisa sair do ERP.",
            ], 200),
        ]);
        [$empresa, $usuario] = $this->empresaComSaldo();

        $this->entrarComo($usuario, $empresa)
            ->post(route('demandas.assistencia.finalizar'), [
                '_token' => session()->token(),
                'session_id' => 'asst_abc',
            ])
            ->assertOk()
            ->assertJsonPath('descricao', "Fechamento do mês\nSai em planilha; precisa sair do ERP.");

        $this->assertDatabaseCount('demandas', 0);
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/compose'));
    }

    public function test_desligada_responde_503(): void
    {
        config([
            'assistencia.habilitada' => false,
            'assistencia.url' => '',
            'assistencia.api_key' => '',
        ]);
        [$empresa, $usuario] = $this->empresaComSaldo();

        $this->entrarComo($usuario, $empresa)
            ->post(route('demandas.assistencia.abrir'), [
                '_token' => session()->token(),
            ])
            ->assertStatus(503)
            ->assertJsonStructure(['erro']);
    }
}
