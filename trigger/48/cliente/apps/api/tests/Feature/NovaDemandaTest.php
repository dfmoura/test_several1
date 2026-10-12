<?php

namespace Tests\Feature;

use App\Models\Demanda;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CriaEmpresa;

class NovaDemandaTest extends AreaTestCase
{
    use CriaEmpresa;

    public function test_tela_separa_pedido_acessos_e_arquivos(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo();

        $this->entrarComo($usuario, $empresa)
            ->get(route('demandas.criar'))
            ->assertOk()
            ->assertSee('Descrição da demanda')
            ->assertSee('Como entrar')
            ->assertSee('Arquivos')
            ->assertSee('Arraste os arquivos aqui')
            ->assertSee('name="descricao"', false)
            ->assertSee('name="acessos"', false)
            ->assertSee('name="anexos[]"', false)
            ->assertDontSee('name="titulo"', false)
            ->assertDontSee('name="objetivo"', false)
            ->assertDontSee('name="sistema_atual"', false)
            ->assertDontSee('name="tipo"', false)
            ->assertDontSee('name="prioridade"', false)
            ->assertDontSee('name="prazo_desejado"', false)
            ->assertDontSee('name="contato_tecnico"', false);
    }

    public function test_acessos_ficam_cifrados_e_anexo_e_gravado(): void
    {
        Storage::fake('anexos');
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
            'anexos' => [UploadedFile::fake()->image('tela.png')],
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
        $this->assertSame(1, $demanda->anexos()->count());
        $this->assertSame('tela.png', $demanda->anexos()->first()->nome_original);
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
