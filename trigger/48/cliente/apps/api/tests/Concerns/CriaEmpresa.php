<?php

namespace Tests\Concerns;

use App\Domain\Carteira\CarteiraService;
use App\Models\Empresa;
use App\Models\Usuario;
use App\Models\UsuarioTrigger;
use App\Models\Vinculo;
use App\Suporte\CpfProtegido;
use Illuminate\Support\Facades\Hash;

trait CriaEmpresa
{
    private int $sequenciaEmpresa = 1;

    /**
     * @return array{0: Empresa, 1: Usuario}
     */
    protected function empresaComSaldo(int $centavos = 50000): array
    {
        $n = $this->sequenciaEmpresa++;
        $empresa = Empresa::query()->create([
            'cnpj' => str_pad((string) $n, 14, '1', STR_PAD_LEFT),
            'razao_social' => 'Empresa '.$n.' Ltda',
            'nome_fantasia' => 'Empresa '.$n,
            'situacao_cadastral' => 'ATIVA',
            'dados_receita' => ['teste' => true],
            'status' => 'ATIVA',
            'criada_em' => now(),
        ]);
        $cpf = CpfProtegido::guardar(str_pad((string) (52998224700 + $n), 11, '0', STR_PAD_LEFT));
        $usuario = Usuario::query()->create([
            'nome' => 'Responsável '.$n,
            'email' => "responsavel{$n}@example.test",
            'telefone' => '11999990000',
            'senha_hash' => Hash::make('senha-segura-1'),
            'criado_em' => now(),
            ...$cpf,
        ]);
        Vinculo::query()->create([
            'usuario_id' => $usuario->id,
            'empresa_id' => $empresa->id,
            'papel' => 'TITULAR',
            'status' => 'ATIVO',
            'aceite_em' => now(),
            'aceite_ip' => '127.0.0.1',
            'criado_em' => now(),
        ]);
        if ($centavos > 0) {
            app(CarteiraService::class)->movimentar(
                $empresa->id,
                'CREDITO_PIX',
                'credito',
                $centavos,
                'teste:credito:'.$empresa->id,
                ['observacao' => 'ATIVACAO', 'ator_tipo' => 'SISTEMA'],
            );
        } else {
            app(CarteiraService::class)->garantir($empresa->id);
        }

        return [$empresa->fresh('carteira'), $usuario];
    }

    protected function operador(): UsuarioTrigger
    {
        return UsuarioTrigger::query()->firstOrFail();
    }

    protected function entrarComo(Usuario $usuario, Empresa $empresa): self
    {
        return $this->actingAs($usuario, 'web')->withSession([
            'empresa_id' => $empresa->id,
            'papel' => 'TITULAR',
            'autenticado_em_web' => now()->timestamp,
        ]);
    }
}
