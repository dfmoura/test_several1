<?php

namespace Tests\Feature;

use App\Domain\Demanda\DemandaService;
use App\Models\Mensagem;
use Tests\Concerns\CriaEmpresa;

class IsolamentoTest extends AreaTestCase
{
    use CriaEmpresa;

    public function test_cliente_nao_ve_demanda_nem_nota_interna_de_outra_empresa(): void
    {
        [$empresaA, $usuarioA] = $this->empresaComSaldo();
        [$empresaB, $usuarioB] = $this->empresaComSaldo();
        $demanda = app(DemandaService::class)->abrir($empresaA, $usuarioA, [
            'titulo' => 'Demanda sigilosa',
            'descricao' => 'Texto que a empresa B não pode ler.',
            'objetivo' => 'Isolar',
            'sistema_atual' => 'Sistema A',
            'tipo' => 'melhoria',
            'prioridade' => 'baixa',
            'prazo_desejado' => null,
            'contato_tecnico' => 'Equipe A',
            'observacoes' => null,
        ]);
        Mensagem::query()->create([
            'demanda_id' => $demanda->id,
            'autor_tipo' => 'TRIGGER',
            'autor_id' => $this->operador()->id,
            'visibilidade' => 'INTERNA',
            'corpo' => 'nota-interna-que-nao-pode-vazar',
            'criada_em' => now(),
        ]);

        $this->entrarComo($usuarioB, $empresaB)
            ->get('/demandas/'.$demanda->codigo)
            ->assertNotFound();

        $this->entrarComo($usuarioA, $empresaA)
            ->get('/demandas/'.$demanda->codigo)
            ->assertOk()
            ->assertSee('Demanda sigilosa')
            ->assertDontSee('nota-interna-que-nao-pode-vazar');

        $this->actingAs($this->operador(), 'operacao')
            ->withSession(['autenticado_em_operacao' => now()->timestamp])
            ->get('/operacao/demandas/'.$demanda->codigo)
            ->assertOk()
            ->assertSee('nota-interna-que-nao-pode-vazar');
    }
}
