<?php

namespace Tests\Feature;

use App\Models\Demanda;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CriaEmpresa;

class NovaDemandaTest extends AreaTestCase
{
    use CriaEmpresa;

    public function test_tela_separa_pedido_e_acessos(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo();

        $this->entrarComo($usuario, $empresa)
            ->get(route('demandas.criar'))
            ->assertOk()
            ->assertSee('Descrição da demanda')
            ->assertSee('Como entrar')
            ->assertDontSee('Arquivos')
            ->assertDontSee('Arraste os arquivos aqui')
            ->assertSee('name="descricao"', false)
            ->assertSee('name="acessos"', false)
            ->assertDontSee('name="anexos[]"', false)
            ->assertDontSee('name="titulo"', false)
            ->assertDontSee('name="objetivo"', false)
            ->assertDontSee('name="sistema_atual"', false)
            ->assertDontSee('name="tipo"', false)
            ->assertDontSee('name="prioridade"', false)
            ->assertDontSee('name="prazo_desejado"', false)
            ->assertDontSee('name="contato_tecnico"', false);
    }

    public function test_acessos_ficam_cifrados_e_abertura_sem_anexo(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo();
        $segredo = "https://erp.exemplo\nusuario: ana\nsenha: segredo-123";

        $this->entrarComo($usuario, $empresa)->get(route('demandas.criar'))->assertOk();

        $descricao = "Fechamento do mês\nO fechamento ainda sai em planilha.";
        $this->post(route('demandas.salvar'), [
            '_token' => session()->token(),
            'titulo' => 'Título enviado pelo cliente',
            'descricao' => $descricao,
            'objetivo' => 'O mês fecha no ERP, sem planilha.',
            'sistema_atual' => 'ERP atual',
            'tipo' => 'relatorio',
            'prioridade' => 'urgente',
            'contato_tecnico' => 'Ana, ana@example.test',
            'acessos' => $segredo,
        ])->assertRedirect();

        $demanda = Demanda::query()->firstOrFail();
        $this->assertSame('Fechamento do mês', $demanda->titulo);
        $this->assertSame($descricao, $demanda->descricao);
        $this->assertSame($descricao, $demanda->objetivo);
        $this->assertSame('', $demanda->sistema_atual);
        $this->assertSame('outro', $demanda->tipo);
        $this->assertSame('normal', $demanda->prioridade);
        $this->assertNull($demanda->prazo_desejado);
        $this->assertSame($usuario->nome.', '.$usuario->email, $demanda->contato_tecnico);
        $this->assertSame($segredo, $demanda->acessos);
        $this->assertStringNotContainsString('segredo-123', (string) DB::table('demandas')->value('acessos'));
        $this->assertSame(0, $demanda->anexos()->count());
    }

    public function test_acessos_em_branco_nao_grava_segredo(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo();

        $this->entrarComo($usuario, $empresa)->get(route('demandas.criar'))->assertOk();

        $this->post(route('demandas.salvar'), [
            '_token' => session()->token(),
            'descricao' => 'O filtro de período não permanece.',
            'acessos' => '   ',
        ])->assertRedirect();

        $this->assertNull(Demanda::query()->firstOrFail()->acessos);
    }

    public function test_titulo_usa_a_primeira_linha_ate_160(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo();
        $linha = str_repeat('ã', 180);

        $this->entrarComo($usuario, $empresa)->post(route('demandas.salvar'), [
            '_token' => session()->token(),
            'descricao' => $linha."\nresto da demanda",
        ])->assertRedirect();

        $this->assertSame(str_repeat('ã', 160), Demanda::query()->firstOrFail()->titulo);
    }
}
