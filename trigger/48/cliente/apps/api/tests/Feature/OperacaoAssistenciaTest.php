<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\Concerns\CriaEmpresa;

class OperacaoAssistenciaTest extends AreaTestCase
{
    use CriaEmpresa;

    public function test_tela_exige_operacao(): void
    {
        $this->get(route('operacao.assistencia'))->assertRedirect(route('operacao.entrar'));
    }

    public function test_operador_ve_formulario_e_salva(): void
    {
        config([
            'assistencia.habilitada' => true,
            'assistencia.url' => 'http://assistencia.test',
            'assistencia.api_key' => 'chave-teste',
        ]);
        Http::fake([
            'http://assistencia.test/v1/admin/llm' => Http::sequence()
                ->push([
                    'mode' => 'mock',
                    'model' => 'gpt-4o-mini',
                    'base_url' => 'https://api.openai.com/v1',
                    'api_key_set' => false,
                    'api_key_hint' => '',
                    'effective_mode' => 'mock',
                    'updated_at' => null,
                ], 200)
                ->push([
                    'mode' => 'openai',
                    'model' => 'gpt-4o-mini',
                    'base_url' => 'https://api.openai.com/v1',
                    'api_key_set' => true,
                    'api_key_hint' => '…1234',
                    'effective_mode' => 'openai',
                    'updated_at' => '2026-10-23T00:00:00+00:00',
                ], 200),
        ]);

        $this->actingAs($this->operador(), 'operacao')
            ->withSession(['autenticado_em_operacao' => now()->timestamp])
            ->get(route('operacao.assistencia'))
            ->assertOk()
            ->assertSee('Assistência à demanda')
            ->assertSee('Provedor');

        $this->actingAs($this->operador(), 'operacao')
            ->withSession(['autenticado_em_operacao' => now()->timestamp])
            ->post(route('operacao.assistencia.salvar'), [
                '_token' => session()->token(),
                'mode' => 'openai',
                'model' => 'gpt-4o-mini',
                'base_url' => 'https://api.openai.com/v1',
                'api_key' => 'sk-teste-1234',
            ])
            ->assertRedirect(route('operacao.assistencia'));

        Http::assertSent(function ($request) {
            return $request->method() === 'PUT'
                && $request->url() === 'http://assistencia.test/v1/admin/llm'
                && $request['api_key'] === 'sk-teste-1234';
        });
    }

    public function test_testar_conexao_mock(): void
    {
        config([
            'assistencia.url' => 'http://assistencia.test',
            'assistencia.api_key' => 'chave-teste',
        ]);
        Http::fake([
            'http://assistencia.test/v1/admin/llm/test' => Http::response([
                'ok' => true,
                'mode' => 'mock',
                'detail' => 'Motor mock ativo.',
            ], 200),
        ]);

        $this->actingAs($this->operador(), 'operacao')
            ->withSession(['autenticado_em_operacao' => now()->timestamp])
            ->post(route('operacao.assistencia.testar'), [
                '_token' => session()->token(),
            ])
            ->assertRedirect()
            ->assertSessionHas('ok');
    }
}
