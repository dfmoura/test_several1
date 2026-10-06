<?php

declare(strict_types=1);

namespace App\Domain\Empresa;

use App\Domain\RegraNegocio;
use Illuminate\Support\Facades\Http;

class BrasilApiConsultaCnpj implements ConsultaCnpj
{
    public function consultar(string $cnpj): DadosReceita
    {
        try {
            $resposta = Http::timeout(8)
                ->acceptJson()
                ->get('https://brasilapi.com.br/api/cnpj/v1/'.$cnpj);
        } catch (\Throwable) {
            throw new RegraNegocio('Não foi possível consultar o CNPJ agora. Tente de novo em instantes.');
        }

        if ($resposta->status() === 404) {
            throw new RegraNegocio('CNPJ não encontrado na Receita Federal.');
        }
        if (! $resposta->successful()) {
            throw new RegraNegocio('A consulta do CNPJ falhou. Tente de novo em instantes.');
        }

        $dados = $resposta->json();
        $situacao = mb_strtoupper((string) ($dados['descricao_situacao_cadastral'] ?? ''));
        $codigo = (int) ($dados['situacao_cadastral'] ?? 0);
        $morta = in_array($codigo, [1, 3, 4, 8], true)
            || str_contains($situacao, 'BAIXADA')
            || str_contains($situacao, 'INAPTA')
            || str_contains($situacao, 'SUSPENSA')
            || str_contains($situacao, 'NULA');

        return new DadosReceita(
            cnpj: $cnpj,
            razaoSocial: (string) ($dados['razao_social'] ?? ''),
            nomeFantasia: ($dados['nome_fantasia'] ?? '') !== '' ? (string) $dados['nome_fantasia'] : null,
            situacao: $situacao !== '' ? $situacao : 'DESCONHECIDA',
            ativa: ! $morta && ($codigo === 2 || str_contains($situacao, 'ATIVA')),
            bruto: is_array($dados) ? $dados : [],
        );
    }
}
