<?php

namespace Tests\Feature;

use App\Domain\Demanda\DemandaService;
use App\Models\Aprovacao;
use App\Models\Marco;
use App\Models\Proposta;
use Tests\Concerns\CriaEmpresa;

class OperacaoPropostaTest extends AreaTestCase
{
    use CriaEmpresa;

    public function test_formulario_enxuto_e_herda_pedido(): void
    {
        config([
            'assistencia.habilitada' => false,
            'assistencia.url' => '',
            'assistencia.api_key' => '',
        ]);
        [$empresa, $usuario] = $this->empresaComSaldo();
        $demanda = app(DemandaService::class)->abrir($empresa, $usuario, $this->pedido());

        $this->actingAs($this->operador(), 'operacao')
            ->withSession(['autenticado_em_operacao' => now()->timestamp])
            ->get(route('operacao.demanda', $demanda->codigo))
            ->assertOk()
            ->assertSee('O que será entregue')
            ->assertSee('Plano de entrega')
            ->assertSee('Campos internos (opcional)')
            ->assertSee('Precisamos filtrar por período.')
            ->assertDontSee('Desdobrar com assistência');
    }

    public function test_envia_proposta_com_etapas_e_campos_opcionais(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo();
        $demanda = app(DemandaService::class)->abrir($empresa, $usuario, $this->pedido());

        $this->actingAs($this->operador(), 'operacao')
            ->withSession(['autenticado_em_operacao' => now()->timestamp])
            ->post(route('operacao.propor', $demanda->codigo), [
                '_token' => csrf_token(),
                'descricao_funcional' => 'Relatório com filtro por período e exportação.',
                'incluso' => 'Relatório e filtro.',
                'nao_incluso' => 'Carga histórica.',
                'criterios_aceite' => 'Arquivo abre no período pedido.',
                'prazo_dias_uteis' => 10,
                'valor' => '1.500,00',
                'etapas' => [
                    ['titulo' => 'Modelo e filtro', 'resultado' => 'Consulta ok', 'aceite' => 'Filtro responde'],
                    ['titulo' => 'Exportação', 'resultado' => 'CSV gerado', 'aceite' => 'Arquivo abre'],
                ],
            ])
            ->assertRedirect();

        $proposta = Proposta::query()->where('demanda_id', $demanda->id)->first();
        $this->assertNotNull($proposta);
        $this->assertSame('VIGENTE', $proposta->status);
        $this->assertSame(150000, (int) $proposta->valor_centavos);
        $this->assertCount(2, $proposta->planoEtapas());
        $this->assertSame('Modelo e filtro', $proposta->planoEtapas()[0]['titulo']);
        $this->assertStringContainsString('Conforme a demanda', (string) $proposta->contexto);
        $this->assertSame('Relatório com filtro por período e exportação.', $proposta->requisitos);

        $this->entrarComo($usuario, $empresa)
            ->get(route('demandas.mostrar', $demanda->codigo))
            ->assertOk()
            ->assertSee('Plano de entrega')
            ->assertSee('Modelo e filtro')
            ->assertSee('Exportação');
    }

    public function test_aprovacao_congela_etapas_e_execucao_registra_marco(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo(150000);
        $demanda = app(DemandaService::class)->abrir($empresa, $usuario, $this->pedido());
        $proposta = app(DemandaService::class)->propor($demanda, $this->operador()->id, [
            'objetivo' => 'Entregar o relatório',
            'contexto' => 'Cliente opera o sistema',
            'descricao_funcional' => 'Filtro e exportação',
            'requisitos' => 'Período obrigatório',
            'criterios_aceite' => 'Arquivo abre',
            'premissas' => 'Base existe',
            'restricoes' => 'Sem app',
            'incluso' => 'Relatório',
            'nao_incluso' => 'Histórico',
            'prazo_dias_uteis' => 10,
            'horas_estimadas' => 8,
            'valor_centavos' => 150000,
            'observacao' => null,
            'etapas' => [
                ['ordem' => 1, 'titulo' => 'Filtro', 'resultado' => 'Consulta', 'aceite' => 'Ok'],
                ['ordem' => 2, 'titulo' => 'Exportação', 'resultado' => 'CSV', 'aceite' => 'Abre'],
            ],
        ]);

        app(DemandaService::class)->aprovar($demanda->fresh(), $usuario, '127.0.0.1');
        $aprovacao = Aprovacao::query()->where('proposta_id', $proposta->id)->first();
        $this->assertSame('Filtro', $aprovacao->escopo_snapshot['etapas'][0]['titulo']);

        app(DemandaService::class)->iniciarExecucao($demanda->fresh(), $this->operador()->id);
        $this->assertTrue(
            Marco::query()
                ->where('demanda_id', $demanda->id)
                ->where('texto', 'like', 'Plano de entrega:%')
                ->exists()
        );
    }

    public function test_desdobrar_proxy_quando_assistencia_ligada(): void
    {
        config([
            'assistencia.habilitada' => true,
            'assistencia.url' => 'http://assistencia.test',
            'assistencia.api_key' => 'chave-teste',
        ]);
        $this->mock(\App\Domain\Demanda\AssistenciaClient::class, function ($mock) {
            $mock->shouldReceive('ativa')->andReturn(true);
            $mock->shouldReceive('desdobrarProposta')->once()->andReturn([
                'descricao_funcional' => 'App de recarga com NFC e Pix.',
                'incluso' => 'Android e iOS.',
                'nao_incluso' => 'Hardware do posto.',
                'criterios_aceite' => 'Recarga libera após pagamento.',
                'etapas' => [
                    ['ordem' => 1, 'titulo' => 'NFC', 'resultado' => 'Aproxime', 'aceite' => 'Lê tag'],
                    ['ordem' => 2, 'titulo' => 'Pagamento', 'resultado' => 'Pix', 'aceite' => 'Libera'],
                ],
            ]);
        });
        [$empresa, $usuario] = $this->empresaComSaldo();
        $demanda = app(DemandaService::class)->abrir($empresa, $usuario, $this->pedido());

        $this->actingAs($this->operador(), 'operacao')
            ->withSession(['autenticado_em_operacao' => now()->timestamp])
            ->post('/operacao/demandas/'.$demanda->codigo.'/desdobrar', [
                '_token' => session()->token(),
            ])
            ->assertOk()
            ->assertJsonPath('etapas.0.titulo', 'NFC')
            ->assertJsonPath('incluso', 'Android e iOS.');
    }

    /**
     * @return array<string, mixed>
     */
    private function pedido(): array
    {
        return [
            'titulo' => 'Relatório de vendas',
            'descricao' => 'Precisamos filtrar por período.',
            'objetivo' => 'Fechar o mês sem planilha',
            'sistema_atual' => 'ERP atual',
            'tipo' => 'relatorio',
            'prioridade' => 'normal',
            'prazo_desejado' => now()->addDays(20)->toDateString(),
            'contato_tecnico' => 'Ana, ana@example.test',
            'observacoes' => null,
        ];
    }
}
