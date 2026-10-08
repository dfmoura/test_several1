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
            ->assertSee('O que precisa')
            ->assertSee('Acessos e senhas')
            ->assertSee('Arraste os arquivos aqui')
            ->assertSee('name="acessos"', false)
            ->assertSee('name="anexos[]"', false);
    }

    public function test_acessos_ficam_cifrados_e_anexo_e_gravado(): void
    {
        Storage::fake('anexos');
        [$empresa, $usuario] = $this->empresaComSaldo();
        $segredo = "https://erp.exemplo\nusuario: ana\nsenha: segredo-123";

        $this->entrarComo($usuario, $empresa)->get(route('demandas.criar'))->assertOk();

        $this->post(route('demandas.salvar'), [
            '_token' => session()->token(),
            'titulo' => 'Fechamento do mês',
            'descricao' => 'O fechamento ainda sai em planilha.',
            'objetivo' => 'O mês fecha no ERP, sem planilha.',
            'sistema_atual' => 'ERP atual',
            'tipo' => 'relatorio',
            'prioridade' => 'normal',
            'contato_tecnico' => 'Ana, ana@example.test',
            'acessos' => $segredo,
            'anexos' => [UploadedFile::fake()->image('tela.png')],
        ])->assertRedirect();

        $demanda = Demanda::query()->firstOrFail();
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
            'titulo' => 'Ajuste de tela',
            'descricao' => 'O filtro de período não permanece.',
            'objetivo' => 'O filtro fica salvo.',
            'sistema_atual' => 'Painel',
            'tipo' => 'melhoria',
            'prioridade' => 'normal',
            'contato_tecnico' => 'Ana',
            'acessos' => '   ',
        ])->assertRedirect();

        $this->assertNull(Demanda::query()->firstOrFail()->acessos);
    }
}
