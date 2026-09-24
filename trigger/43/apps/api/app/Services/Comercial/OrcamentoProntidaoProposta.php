<?php

namespace App\Services\Comercial;

use App\Models\Orcamento;
use App\Models\OrcamentoItem;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Services\Comercial\Orcamento\OrcamentoFreteEstimadoService;
use App\Support\FacasComposicao;
use App\Support\SaidaEtiqueta;
use App\Support\TipoOperacaoSaida;
use Illuminate\Validation\ValidationException;

/**
 * Prontidão comercial do documento ORC para enviar proposta (aprovação).
 *
 * Camada leve: snapshot persistido, sem recalcular. Rascunho/cálculo continuam livres.
 * Frete, transportadora, vendedor, observação e fiscal ficam de fora (donos nas ADRs).
 * Lembrete (já enviado) não reaplica este gate.
 *
 * Norma: emenda ADR_ORC_LINK_APROVACAO.
 */
class OrcamentoProntidaoProposta
{
    /**
     * @return array{
     *   apto: bool,
     *   orcamento_id: int|null,
     *   pendencias: list<string>,
     *   bloqueios: array<string, list<string>>
     * }
     */
    public static function evaluate(Orcamento $orcamento): array
    {
        $bloqueios = [];
        $pendencias = [];

        $input = is_array($orcamento->input_snapshot) ? $orcamento->input_snapshot : [];

        if ((int) $orcamento->prazo_entrega_dias < 1) {
            $pendencias[] = 'Prazo de entrega';
            $bloqueios['prazo_entrega_dias'] = [
                'Informe o prazo de entrega (em dias) antes de enviar a proposta.',
            ];
        }

        if ((int) $orcamento->validade_dias < 1) {
            $pendencias[] = 'Validade da proposta';
            $bloqueios['validade_dias'] = [
                'Informe a validade da proposta (em dias) antes de enviar.',
            ];
        }

        if (self::vazio($input['condicao_pagamento'] ?? null)) {
            $pendencias[] = 'Condição de pagamento';
            $bloqueios['condicao_pagamento'] = [
                'Informe a condição de pagamento da proposta (ex.: 28 DDL).',
            ];
        }

        if (self::vazio($input['forma_pagamento'] ?? null)) {
            $pendencias[] = 'Forma de pagamento';
            $bloqueios['forma_pagamento'] = [
                'Informe a forma de pagamento da proposta (PIX, boleto, transferência ou cartão).',
            ];
        }

        $headerTipo = TipoOperacaoSaida::fromInput(
            $input['tipo_operacao'] ?? $input['necessidade'] ?? null
        );
        if ($headerTipo === TipoOperacaoSaida::CESSAO_BEM) {
            $pendencias[] = 'Tipo de operação';
            $bloqueios['tipo_operacao'] = [
                'Cessão de equipamento não é orçamento comercial. Cadastre no patrimônio.',
            ];
        }

        $jobs = self::jobs($orcamento);
        $multi = count($jobs) > 1;
        $tipos = [];

        foreach ($jobs as $job) {
            $ordem = (int) $job['ordem'];
            $jobInput = $job['input'];
            $jobResult = $job['result'];
            $tipo = TipoOperacaoSaida::fromInput(
                $jobInput['tipo_operacao'] ?? $jobInput['necessidade'] ?? $headerTipo
            );
            $tipos[] = $tipo;

            if ($tipo === TipoOperacaoSaida::CESSAO_BEM && ! isset($bloqueios['tipo_operacao'])) {
                $pendencias[] = 'Tipo de operação';
                $bloqueios['tipo_operacao'] = [
                    'Cessão de equipamento não é orçamento comercial. Cadastre no patrimônio.',
                ];
            }

            if (! self::temFaixaComercial($jobResult)) {
                $rotulo = $ordem > 1 ? 'Posição '.$ordem : 'Faixas comerciais';
                $chave = $ordem > 1 ? 'itens.'.$ordem : 'faixas';
                $pendencias[] = $rotulo;
                $bloqueios[$chave] = [
                    $ordem > 1
                        ? 'A posição '.$ordem.' está sem quantidade ou valor. Edite e calcule de novo.'
                        : 'Calcule o orçamento com ao menos uma quantidade e um valor maiores que zero.',
                ];
            }

            self::aplicarEtiqueta($jobInput, $ordem, $multi, $pendencias, $bloqueios);
        }

        $tiposUnicos = array_values(array_unique(array_filter(
            $tipos,
            static fn (string $t) => $t !== TipoOperacaoSaida::CESSAO_BEM
        )));
        if (count($tiposUnicos) > 1) {
            $pendencias[] = 'Tipo de operação';
            $bloqueios['tipo_operacao'] = [
                'A proposta precisa ser homogênea (produção ou serviço). Edite e calcule de novo.',
            ];
        }

        self::aplicarRevenda($orcamento, $jobs, $pendencias, $bloqueios);

        return [
            'apto' => $bloqueios === [],
            'orcamento_id' => $orcamento->id,
            'pendencias' => array_values(array_unique($pendencias)),
            'bloqueios' => $bloqueios,
        ];
    }

    /**
     * @return array{
     *   apto: bool,
     *   orcamento_id: int|null,
     *   pendencias: list<string>,
     *   bloqueios: array<string, list<string>>
     * }
     */
    public static function dto(Orcamento $orcamento): array
    {
        return self::evaluate($orcamento);
    }

    /**
     * 1º envio / reenvio após recusa. Lembrete (já na rua) não reaplica.
     */
    public static function deveAplicar(Orcamento $orcamento): bool
    {
        return in_array($orcamento->status, [
            Orcamento::STATUS_CALCULADO,
            Orcamento::STATUS_REPROVADO,
        ], true);
    }

    /**
     * Gate duro do envio da proposta (documento).
     *
     * @throws ValidationException
     */
    public static function assertPronto(Orcamento $orcamento): void
    {
        if (! self::deveAplicar($orcamento)) {
            return;
        }

        $eval = self::evaluate($orcamento);
        if ($eval['apto']) {
            return;
        }

        throw ValidationException::withMessages($eval['bloqueios']);
    }

    /**
     * @return list<array{ordem: int, input: array<string, mixed>, result: array<string, mixed>}>
     */
    private static function jobs(Orcamento $orcamento): array
    {
        if (! $orcamento->relationLoaded('itens')) {
            if ($orcamento->getKey()) {
                $orcamento->loadMissing('itens');
            } else {
                $orcamento->setRelation('itens', $orcamento->newCollection());
            }
        }
        $itens = $orcamento->itens
            ->sortBy('ordem')
            ->values();

        if ($itens->isNotEmpty()) {
            return $itens->map(static function (OrcamentoItem $item): array {
                return [
                    'ordem' => (int) $item->ordem,
                    'input' => is_array($item->input_snapshot) ? $item->input_snapshot : [],
                    'result' => is_array($item->result_snapshot) ? $item->result_snapshot : [],
                ];
            })->all();
        }

        return [[
            'ordem' => 1,
            'input' => is_array($orcamento->input_snapshot) ? $orcamento->input_snapshot : [],
            'result' => is_array($orcamento->result_snapshot) ? $orcamento->result_snapshot : [],
        ]];
    }

    /**
     * @param  array<string, mixed>  $result
     */
    private static function temFaixaComercial(array $result): bool
    {
        $faixas = $result['faixas'] ?? null;
        if (! is_array($faixas) || $faixas === []) {
            return false;
        }

        foreach ($faixas as $fx) {
            if (! is_array($fx)) {
                continue;
            }
            $qtd = (float) ($fx['quantidade'] ?? 0);
            if ($qtd <= 0) {
                continue;
            }
            if (self::valorFaixa($fx) > 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $fx
     */
    private static function valorFaixa(array $fx): float
    {
        $proposta = (float) OrcamentoFreteEstimadoService::totalPropostaFaixa($fx);
        if ($proposta > 0) {
            return $proposta;
        }

        foreach (['valor_etiqueta', 'total'] as $chave) {
            if (isset($fx[$chave]) && (float) $fx[$chave] > 0) {
                return (float) $fx[$chave];
            }
        }

        return 0.0;
    }

    /**
     * Perfil industrialização (etiqueta): faca declarada + spec + saída da bobina.
     * Serviço e revenda não entram. Cálculo continua livre — só o envio trava.
     *
     * @param  array<string, mixed>  $input
     * @param  list<string>  $pendencias
     * @param  array<string, list<string>>  $bloqueios
     */
    private static function aplicarEtiqueta(
        array $input,
        int $ordem,
        bool $multi,
        array &$pendencias,
        array &$bloqueios,
    ): void {
        $tipo = TipoOperacaoSaida::fromInput($input['tipo_operacao'] ?? $input['necessidade'] ?? null);
        if ($tipo !== TipoOperacaoSaida::INDUSTRIALIZACAO) {
            return;
        }
        if (PedidoItem::isRevenda($input['necessidade'] ?? null)) {
            return;
        }

        $faltando = [];
        if (self::vazio($input['medida'] ?? null)) {
            $faltando[] = 'medida';
        }
        if (! self::numeroPositivo($input['largura_cm'] ?? null)) {
            $faltando[] = 'largura';
        }
        if (! self::numeroPositivo($input['puxada_cm'] ?? null)) {
            $faltando[] = 'puxada';
        }
        if (! self::coresInformadas($input['cores'] ?? null)) {
            $faltando[] = 'cores';
        }
        if (self::vazio($input['papel'] ?? null)) {
            $faltando[] = 'papel';
        }
        if (self::vazio($input['acabamento'] ?? null)) {
            $faltando[] = 'acabamento';
        }
        if ((int) ($input['modelos'] ?? 0) < 1) {
            $faltando[] = 'modelos';
        }
        if ((int) ($input['colunas'] ?? 0) < 1) {
            $faltando[] = 'colunas';
        }
        if ((int) ($input['etiq_por_rolo'] ?? 0) < 1) {
            $faltando[] = 'etiquetas por rolo';
        }
        if (self::vazio($input['tubete'] ?? null)) {
            $faltando[] = 'tubete';
        }
        if (self::vazio($input['maquina'] ?? null)) {
            $faltando[] = 'máquina';
        }
        if ($faltando !== []) {
            $rotulo = $multi ? 'Especificação posição '.$ordem : 'Especificação da etiqueta';
            $pendencias[] = $rotulo;
            $bloqueios[self::chaveJob($ordem, 'especificacao', $multi)] = [
                'Falta na etiqueta: '.implode(', ', $faltando).'. Edite e calcule de novo.',
            ];
        }

        if (! FacasComposicao::temFacaDeclarada($input)) {
            $rotulo = $multi ? 'Faca posição '.$ordem : 'Faca';
            $pendencias[] = $rotulo;
            $bloqueios[self::chaveJob($ordem, 'facas', $multi)] = [
                'Informe a faca desta posição (mapa ou faca nova) antes de enviar a proposta.',
            ];
        }

        $saida = strtoupper(trim((string) ($input['saida_etiqueta'] ?? '')));
        if (! in_array($saida, SaidaEtiqueta::CODIGOS, true)) {
            $rotulo = $multi ? 'Saída posição '.$ordem : 'Saída da etiqueta';
            $pendencias[] = $rotulo;
            $bloqueios[self::chaveJob($ordem, 'saida_etiqueta', $multi)] = [
                'Informe o sentido de saída da etiqueta na bobina (esquerda, direita, deitada ou de pé).',
            ];
        }
    }

    private static function chaveJob(int $ordem, string $campo, bool $multi): string
    {
        return $multi ? 'itens.'.$ordem.'.'.$campo : $campo;
    }

    private static function numeroPositivo(mixed $value): bool
    {
        if ($value === null || $value === '') {
            return false;
        }

        return is_numeric($value) && (float) $value > 0;
    }

    private static function coresInformadas(mixed $cores): bool
    {
        if ($cores === null || $cores === '') {
            return false;
        }
        if (is_numeric($cores)) {
            return (float) $cores >= 1;
        }

        return trim((string) $cores) !== '';
    }

    /**
     * @param  list<array{ordem: int, input: array<string, mixed>, result: array<string, mixed>}>  $jobs
     * @param  list<string>  $pendencias
     * @param  array<string, list<string>>  $bloqueios
     */
    private static function aplicarRevenda(
        Orcamento $orcamento,
        array $jobs,
        array &$pendencias,
        array &$bloqueios,
    ): void {
        $ids = [];
        foreach ($jobs as $job) {
            if (! PedidoItem::isRevenda($job['input']['necessidade'] ?? null)) {
                continue;
            }
            $pid = (int) ($job['input']['produto_id'] ?? 0);
            if ($pid > 0) {
                $ids[$pid] = $pid;
            }
        }

        $produtos = [];
        if ($ids !== [] && $orcamento->empresa_id) {
            $produtos = Produto::query()
                ->where('empresa_id', $orcamento->empresa_id)
                ->whereIn('id', array_values($ids))
                ->get()
                ->keyBy('id');
        }

        foreach ($jobs as $job) {
            if (! PedidoItem::isRevenda($job['input']['necessidade'] ?? null)) {
                continue;
            }

            $ordem = (int) $job['ordem'];
            $chave = $ordem > 1 ? 'itens.'.$ordem.'.produto_id' : 'produto_id';
            $pid = (int) ($job['input']['produto_id'] ?? 0);
            if ($pid < 1) {
                $pendencias[] = 'SKU de revenda';
                $bloqueios[$chave] = [
                    'Selecione o produto de revenda desta posição antes de enviar.',
                ];

                continue;
            }

            $produto = $produtos[$pid] ?? null;
            if ($produto === null) {
                $pendencias[] = 'SKU de revenda';
                $bloqueios[$chave] = [
                    'O produto de revenda desta posição não foi encontrado na empresa. Edite e calcule de novo.',
                ];

                continue;
            }

            if (strtoupper((string) $produto->familia) !== 'REV') {
                $pendencias[] = 'SKU de revenda';
                $bloqueios[$chave] = [
                    'Só SKU de família REV entra como item de revenda. Edite e calcule de novo.',
                ];

                continue;
            }

            if (strtoupper((string) $produto->situacao) !== 'ATIVO') {
                $pendencias[] = 'SKU de revenda';
                $bloqueios[$chave] = [
                    'O produto de revenda está inativo. Regularize o SKU ou troque o item antes de enviar.',
                ];
            }
        }
    }

    private static function vazio(mixed $value): bool
    {
        return trim((string) ($value ?? '')) === '';
    }
}
