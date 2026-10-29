<?php

namespace Database\Seeders;

use App\Domain\Carteira\CarteiraService;
use App\Domain\Empresa\BrasilApiConsultaCnpj;
use App\Models\Empresa;
use App\Models\Usuario;
use App\Models\Vinculo;
use App\Suporte\CpfProtegido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Conta local pronta para testar CNPJ/QSA e o botão de atualizar.
 * Só roda em APP_ENV=local.
 */
class DemoLocalSeeder extends Seeder
{
    public const EMAIL = 'diogo.moura@triggerti.com';

    public const SENHA = 'senha-local-123';

    public const CNPJ = '53369941000163';

    /** CPF válido de teste (não é dado produtivo). */
    public const CPF = '52998224725';

    public function run(): void
    {
        if (! app()->environment('local')) {
            return;
        }

        $receita = app(BrasilApiConsultaCnpj::class)->consultar(self::CNPJ);
        $empresa = Empresa::query()->where('cnpj', self::CNPJ)->first() ?? new Empresa(['cnpj' => self::CNPJ]);
        $empresa->fill([
            'razao_social' => $receita->razaoSocial,
            'nome_fantasia' => $receita->nomeFantasia ?: 'TRIGGER DATA INTELLIGENCE',
            'situacao_cadastral' => $receita->situacao,
            'dados_receita' => $receita->bruto,
            // Libera o botão «Atualizar dados da Receita» no teste local.
            'receita_atualizada_em' => now()->subDays(31),
            'status' => 'ATIVA',
            'motivo' => null,
            'criada_em' => $empresa->exists ? $empresa->criada_em : now(),
        ]);
        $empresa->save();

        app(CarteiraService::class)->garantir($empresa->id);
        $carteira = $empresa->carteira()->first();
        if ($carteira && (int) $carteira->disponivel_centavos < 100000) {
            app(CarteiraService::class)->movimentar(
                $empresa->id,
                'CREDITO_PIX',
                'credito',
                150000,
                'demo-local:ativacao:'.$empresa->id,
                ['observacao' => 'ATIVACAO', 'ator_tipo' => 'SISTEMA'],
            );
        }

        $cpf = CpfProtegido::guardar(self::CPF);
        $usuario = Usuario::query()->where('email', self::EMAIL)->first();
        $cpfEmUso = Usuario::query()
            ->where('cpf_hash', $cpf['cpf_hash'])
            ->when($usuario, fn ($q) => $q->where('id', '!=', $usuario->id))
            ->exists();
        if ($cpfEmUso) {
            $cpf = ['cpf_cifrado' => $usuario?->cpf_cifrado, 'cpf_hash' => $usuario?->cpf_hash];
        }
        if (! $usuario) {
            $usuario = Usuario::query()->create([
                'nome' => 'Diogo Ferreira Moura',
                'email' => self::EMAIL,
                'telefone' => '11999990000',
                'senha_hash' => Hash::make(self::SENHA),
                'criado_em' => now(),
                'cpf_cifrado' => $cpf['cpf_cifrado'],
                'cpf_hash' => $cpf['cpf_hash'],
            ]);
        } else {
            $usuario->fill([
                'nome' => 'Diogo Ferreira Moura',
                'telefone' => '11999990000',
                'senha_hash' => Hash::make(self::SENHA),
                'cpf_cifrado' => $cpf['cpf_cifrado'] ?? $usuario->cpf_cifrado,
                'cpf_hash' => $cpf['cpf_hash'] ?? $usuario->cpf_hash,
            ])->save();
        }

        Vinculo::query()->updateOrCreate(
            ['usuario_id' => $usuario->id, 'empresa_id' => $empresa->id],
            [
                'papel' => 'TITULAR',
                'status' => 'ATIVO',
                'aceite_em' => now(),
                'aceite_ip' => '127.0.0.1',
                'criado_em' => now(),
            ],
        );
    }
}
