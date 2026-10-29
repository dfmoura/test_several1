<?php

declare(strict_types=1);

namespace App\Domain\Demanda;

use App\Models\Demanda;
use App\Models\Proposta;
use Illuminate\Http\Request;

/**
 * Valores iniciais do formulário operacional de proposta.
 * Prioridade: old() → proposta anterior → semente a partir da demanda.
 */
final class PropostaRascunho
{
    /**
     * @return array{
     *   objetivo: string,
     *   contexto: string,
     *   descricao_funcional: string,
     *   requisitos: string,
     *   criterios_aceite: string,
     *   premissas: string,
     *   restricoes: string,
     *   incluso: string,
     *   nao_incluso: string,
     *   prazo_dias_uteis: string,
     *   horas_estimadas: string,
     *   valor: string,
     *   observacao: string,
     *   etapas: list<array{ordem: int, titulo: string, resultado: string, aceite: string}>
     * }
     */
    public static function para(Demanda $demanda, Request $request): array
    {
        $base = self::daDemanda($demanda);
        $anterior = $demanda->propostas->sortByDesc('versao')->first();
        if ($anterior instanceof Proposta) {
            $base = array_merge($base, self::daProposta($anterior));
        }

        $campos = [
            'objetivo', 'contexto', 'descricao_funcional', 'requisitos', 'criterios_aceite',
            'premissas', 'restricoes', 'incluso', 'nao_incluso', 'prazo_dias_uteis',
            'horas_estimadas', 'valor', 'observacao',
        ];
        foreach ($campos as $campo) {
            if ($request->old($campo) !== null) {
                $base[$campo] = (string) $request->old($campo);
            }
        }
        if ($request->old('etapas') !== null) {
            try {
                $base['etapas'] = PropostaEtapas::normalizar($request->old('etapas'));
            } catch (\Throwable) {
                $base['etapas'] = is_array($request->old('etapas')) ? [] : $base['etapas'];
            }
        }
        if ($base['etapas'] === []) {
            $base['etapas'] = [['ordem' => 1, 'titulo' => '', 'resultado' => '', 'aceite' => '']];
        }

        return $base;
    }

    /**
     * Completa campos internos omitidos no formulário enxuto, sem inventar preço.
     *
     * @param  array<string, mixed>  $dados
     * @return array<string, mixed>
     */
    public static function completar(Demanda $demanda, array $dados): array
    {
        $descricao = trim((string) $dados['descricao_funcional']);
        $objetivo = trim((string) ($dados['objetivo'] ?? ''));
        $contexto = trim((string) ($dados['contexto'] ?? ''));
        $requisitos = trim((string) ($dados['requisitos'] ?? ''));
        $premissas = trim((string) ($dados['premissas'] ?? ''));
        $restricoes = trim((string) ($dados['restricoes'] ?? ''));

        return [
            'objetivo' => $objetivo !== '' ? $objetivo : mb_substr($descricao, 0, 400),
            'contexto' => $contexto !== '' ? $contexto : 'Conforme a demanda '.$demanda->codigo.' e a conversa registrada.',
            'descricao_funcional' => $descricao,
            'requisitos' => $requisitos !== '' ? $requisitos : $descricao,
            'criterios_aceite' => trim((string) $dados['criterios_aceite']),
            'premissas' => $premissas !== '' ? $premissas : 'Premissas alinhadas no pedido e na conversa.',
            'restricoes' => $restricoes !== '' ? $restricoes : 'Sem restrições além do que está em não incluso.',
            'incluso' => trim((string) $dados['incluso']),
            'nao_incluso' => trim((string) $dados['nao_incluso']),
            'prazo_dias_uteis' => (int) $dados['prazo_dias_uteis'],
            'horas_estimadas' => isset($dados['horas_estimadas']) && $dados['horas_estimadas'] !== '' && $dados['horas_estimadas'] !== null
                ? (int) $dados['horas_estimadas']
                : null,
            'valor_centavos' => (int) $dados['valor_centavos'],
            'observacao' => filled($dados['observacao'] ?? null) ? trim((string) $dados['observacao']) : null,
            'etapas' => PropostaEtapas::normalizar($dados['etapas'] ?? []),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function daDemanda(Demanda $demanda): array
    {
        $descricao = trim((string) $demanda->descricao);

        return [
            'objetivo' => trim((string) ($demanda->objetivo ?: $descricao)),
            'contexto' => '',
            'descricao_funcional' => $descricao,
            'requisitos' => '',
            'criterios_aceite' => '',
            'premissas' => '',
            'restricoes' => '',
            'incluso' => '',
            'nao_incluso' => '',
            'prazo_dias_uteis' => '',
            'horas_estimadas' => '',
            'valor' => '',
            'observacao' => '',
            'etapas' => [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function daProposta(Proposta $proposta): array
    {
        $etapas = is_array($proposta->etapas) ? PropostaEtapas::normalizar($proposta->etapas) : [];

        return [
            'objetivo' => (string) $proposta->objetivo,
            'contexto' => (string) $proposta->contexto,
            'descricao_funcional' => (string) $proposta->descricao_funcional,
            'requisitos' => (string) $proposta->requisitos,
            'criterios_aceite' => (string) $proposta->criterios_aceite,
            'premissas' => (string) $proposta->premissas,
            'restricoes' => (string) $proposta->restricoes,
            'incluso' => (string) $proposta->incluso,
            'nao_incluso' => (string) $proposta->nao_incluso,
            'prazo_dias_uteis' => (string) $proposta->prazo_dias_uteis,
            'horas_estimadas' => $proposta->horas_estimadas !== null ? (string) $proposta->horas_estimadas : '',
            'valor' => number_format(((int) $proposta->valor_centavos) / 100, 2, ',', '.'),
            'observacao' => (string) ($proposta->observacao ?? ''),
            'etapas' => $etapas,
        ];
    }
}
