<?php

namespace Database\Seeders;

use App\Models\PapelPermissao;
use App\Models\Parametro;
use App\Models\UsuarioTrigger;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $parametros = [
            'ATIVACAO_CENTAVOS' => '50000',
            'TICKET_ABERTURA' => '50000',
            'VALIDADE_PROPOSTA_DIAS' => '10',
            'EXPIRACAO_PIX_MINUTOS' => '60',
            'RECUSAS_SEM_CUSTO' => '2',
            'JANELA_RECUSA_DIAS' => '90',
            'DIAS_PARA_BLOQUEIO' => '5',
            'RASCUNHO_CONTA_DIAS' => '7',
            'SALDO_MINIMO_CENTAVOS' => '100000',
            'SESSAO_ABSOLUTA_MINUTOS' => '480',
        ];
        foreach ($parametros as $chave => $valor) {
            Parametro::query()->updateOrCreate(['chave' => $chave], ['valor' => $valor, 'atualizado_em' => now()]);
        }

        $permissoes = [
            'TITULAR' => ['saldo.ver', 'demanda.abrir', 'demanda.ver', 'demanda.aprovar', 'extrato.ver', 'usuario.gerir'],
            'ADMIN' => ['saldo.ver', 'demanda.abrir', 'demanda.ver', 'demanda.aprovar', 'extrato.ver', 'usuario.gerir'],
            'USUARIO' => ['demanda.abrir', 'demanda.ver'],
        ];
        foreach ($permissoes as $papel => $codigos) {
            foreach ($codigos as $codigo) {
                PapelPermissao::query()->firstOrCreate(['papel' => $papel, 'permissao' => $codigo]);
            }
        }

        $email = (string) env('OPERADOR_EMAIL', 'operacao@triggerti.com');
        $senha = (string) env('OPERADOR_PASSWORD', '');
        if ($senha === '') {
            return;
        }
        if (app()->environment('production') && ($senha === 'troque-esta-senha-local' || strlen($senha) < 12)) {
            throw new \RuntimeException('Defina OPERADOR_PASSWORD com pelo menos 12 caracteres antes de semear a produção.');
        }
        UsuarioTrigger::query()->firstOrCreate(
            ['email' => mb_strtolower($email)],
            [
                'nome' => 'Operação Trigger',
                'senha_hash' => Hash::make($senha),
                'ativo' => true,
                'criado_em' => now(),
            ],
        );
    }
}
