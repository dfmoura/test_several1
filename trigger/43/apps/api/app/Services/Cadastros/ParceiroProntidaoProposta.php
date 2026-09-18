<?php

namespace App\Services\Cadastros;

use App\Models\Parceiro;
use Illuminate\Validation\ValidationException;

/**
 * Prontidão comercial do parceiro para enviar proposta (ORC → aprovação).
 *
 * Camada leve: identidade + endereço base. Não exige completude fiscal (IE, IBGE,
 * finalidade, e-mail XML) — isso permanece no gate de NF-e / faturamento.
 *
 * Norma: emenda ADR_ORC_LINK_APROVACAO.
 */
class ParceiroProntidaoProposta
{
    /**
     * @return array{
     *   apto: bool,
     *   parceiro_id: int|null,
     *   pendencias: list<string>,
     *   bloqueios: array<string, list<string>>
     * }
     */
    public static function evaluate(?Parceiro $parceiro): array
    {
        if ($parceiro === null) {
            return [
                'apto' => false,
                'parceiro_id' => null,
                'pendencias' => ['Parceiro do orçamento'],
                'bloqueios' => [
                    'parceiro_id' => ['Parceiro do orçamento não encontrado.'],
                ],
            ];
        }

        $bloqueios = [];
        $pendencias = [];

        $razao = trim((string) $parceiro->razao_social);
        if ($razao === '') {
            $pendencias[] = 'Razão social / nome';
            $bloqueios['razao_social'] = ['Informe a razão social / nome do cliente.'];
        }

        if ((bool) $parceiro->is_prospect) {
            $pendencias[] = 'Cadastro ainda é prospect';
            $bloqueios['is_prospect'] = [
                'Conclua o cadastro do cliente (deixe de ser prospect) antes de enviar a proposta.',
            ];
        }

        $situacao = mb_strtoupper(trim((string) ($parceiro->situacao ?? '')), 'UTF-8');
        if (in_array($situacao, ['INATIVO', 'BLOQUEADO'], true)) {
            $pendencias[] = 'Situação do cadastro';
            $bloqueios['situacao'] = [
                'Cliente '.$situacao.' não pode receber proposta. Regularize a situação no cadastro.',
            ];
        }

        $tipo = mb_strtoupper(trim((string) ($parceiro->tipo_pessoa ?? '')), 'UTF-8');
        if (! in_array($tipo, ['PJ', 'PF', 'ESTRANGEIRO'], true)) {
            $pendencias[] = 'Tipo de pessoa (PJ / PF / estrangeiro)';
            $bloqueios['tipo_pessoa'] = ['Informe se o cliente é PJ, PF ou estrangeiro.'];
            $tipo = '';
        }

        $doc = preg_replace('/\D/', '', (string) ($parceiro->cnpj_cpf ?? '')) ?: '';
        if ($tipo === 'PJ' && strlen($doc) !== 14) {
            $pendencias[] = 'CNPJ (14 dígitos)';
            $bloqueios['cnpj_cpf'] = ['Informe o CNPJ do cliente (14 dígitos).'];
        } elseif ($tipo === 'PF' && strlen($doc) !== 11) {
            $pendencias[] = 'CPF (11 dígitos)';
            $bloqueios['cnpj_cpf'] = ['Informe o CPF do cliente (11 dígitos).'];
        } elseif ($tipo === 'ESTRANGEIRO' && $doc === '' && trim((string) ($parceiro->nome_fantasia ?? '')) === '') {
            $pendencias[] = 'Identificação do estrangeiro';
            $bloqueios['cnpj_cpf'] = [
                'Informe documento ou nome de identificação do cliente estrangeiro.',
            ];
        }

        foreach ([
            'logradouro' => 'Logradouro',
            'numero' => 'Número',
            'bairro' => 'Bairro',
            'municipio' => 'Município',
        ] as $field => $label) {
            if (trim((string) ($parceiro->{$field} ?? '')) === '') {
                $pendencias[] = $label;
                $bloqueios[$field] = ["Informe {$label} do endereço do cliente."];
            }
        }

        $uf = trim((string) ($parceiro->uf ?? ''));
        if (strlen($uf) !== 2) {
            $pendencias[] = 'UF';
            $bloqueios['uf'] = ['Informe a UF do endereço do cliente.'];
        }

        $cep = preg_replace('/\D/', '', (string) ($parceiro->cep ?? '')) ?: '';
        if (strlen($cep) !== 8) {
            $pendencias[] = 'CEP (8 dígitos)';
            $bloqueios['cep'] = ['Informe o CEP do cliente (8 dígitos).'];
        }

        return [
            'apto' => $bloqueios === [],
            'parceiro_id' => $parceiro->id,
            'pendencias' => array_values(array_unique($pendencias)),
            'bloqueios' => $bloqueios,
        ];
    }

    /**
     * @return array{
     *   apto: bool,
     *   parceiro_id: int|null,
     *   pendencias: list<string>,
     *   bloqueios: array<string, list<string>>
     * }
     */
    public static function dto(?Parceiro $parceiro): array
    {
        return self::evaluate($parceiro);
    }

    /**
     * Gate duro do envio da proposta.
     *
     * @throws ValidationException
     */
    public static function assertPronto(?Parceiro $parceiro): void
    {
        $eval = self::evaluate($parceiro);
        if ($eval['apto']) {
            return;
        }

        throw ValidationException::withMessages($eval['bloqueios']);
    }
}
