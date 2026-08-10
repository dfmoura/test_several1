<?php

namespace App\Services\Comercial;

use App\Models\Orcamento;
use App\Models\OrcamentoLinkAprovacao;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Aceite do cliente via link (ADR_ORC_LINK_APROVACAO / estudo 32).
 * Sem PED, crédito ou WhatsApp nesta entrega.
 */
class OrcamentoAprovacaoService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OrcamentoService $orcamentoService,
    ) {}

    /**
     * Gera (ou reusa) link e marca ENVIADO. Retorno pronto para Ctrl+C.
     *
     * @return array{url: string, token: string, mensagem: string, expira_em: string, reutilizado: bool, orcamento: array<string, mixed>}
     */
    public function enviarParaAprovacao(Orcamento $orcamento, ?string $destinoEnvio = null): array
    {
        if (! $orcamento->isEnviavel()) {
            throw ValidationException::withMessages([
                'status' => [
                    'Só orçamentos em preparação (calculado), rejeitados ou já enviados (lembrete) podem gerar o link.',
                ],
            ]);
        }

        $orcamento->loadMissing('empresa');
        if ($orcamento->empresa) {
            app()->instance('empresa', $orcamento->empresa);
        }

        $dias = max(1, (int) $orcamento->validade_dias);
        $agora = now();
        $expiraEm = $agora->copy()->addDays($dias);
        $reutilizado = false;

        $link = DB::transaction(function () use ($orcamento, $destinoEnvio, $agora, $expiraEm, &$reutilizado) {
            $orcamento->refresh();
            $existente = OrcamentoLinkAprovacao::query()
                ->where('orcamento_id', $orcamento->id)
                ->lockForUpdate()
                ->first();

            if (
                $existente
                && $existente->ativo
                && $existente->usado_em === null
                && $existente->expira_em !== null
                && $existente->expira_em->isFuture()
                && $orcamento->aguardandoCliente()
            ) {
                $existente->fill([
                    'enviado_em' => $agora,
                    'canal_envio' => 'MANUAL',
                    'destino_envio' => $destinoEnvio ?? $existente->destino_envio,
                ]);
                $existente->save();
                $reutilizado = true;
                $link = $existente;
            } else {
                $token = $this->novoToken();
                if ($existente) {
                    $existente->fill([
                        'token' => $token,
                        'ativo' => true,
                        'expira_em' => $expiraEm,
                        'enviado_em' => $agora,
                        'canal_envio' => 'MANUAL',
                        'destino_envio' => $destinoEnvio,
                        'visualizacoes' => 0,
                        'usado_em' => null,
                    ]);
                    $existente->save();
                    $link = $existente;
                } else {
                    $link = OrcamentoLinkAprovacao::query()->create([
                        'orcamento_id' => $orcamento->id,
                        'token' => $token,
                        'ativo' => true,
                        'expira_em' => $expiraEm,
                        'enviado_em' => $agora,
                        'canal_envio' => 'MANUAL',
                        'destino_envio' => $destinoEnvio,
                        'visualizacoes' => 0,
                    ]);
                }
            }

            $before = ['status' => $orcamento->status];
            $lembrete = $orcamento->aguardandoCliente();

            $orcamento->fill([
                'status' => $lembrete ? $orcamento->status : Orcamento::STATUS_ENVIADO,
                'enviado_em' => $orcamento->enviado_em ?? $agora,
            ]);

            if (! $lembrete) {
                $orcamento->fill([
                    'status' => Orcamento::STATUS_ENVIADO,
                    'visualizado_em' => null,
                    'decidido_em' => null,
                    'canal_aprovacao' => null,
                    'aceite_nome_cliente' => null,
                    'aceite_faixa_index' => null,
                    'aceite_ip' => null,
                    'aceite_user_agent' => null,
                    'motivo_decisao' => null,
                ]);
            }

            $orcamento->save();

            $this->audit->log('ENVIAR_APROVACAO', 'Orcamento', $orcamento->id, $before, [
                'status' => $orcamento->status,
                'token_suffix' => substr($link->token, -8),
                'expira_em' => $link->expira_em?->toIso8601String(),
                'reutilizado' => $reutilizado,
                'lembrete' => $lembrete,
            ]);

            return $link;
        });

        $url = $this->publicUrl($link->token);
        $orcamento = $orcamento->fresh(['parceiro', 'empresa', 'linkAprovacao']);

        return [
            'url' => $url,
            'token' => $link->token,
            'mensagem' => $this->mensagemPadrao($orcamento, $url, $link->expira_em?->toDateString()),
            'expira_em' => $link->expira_em?->toIso8601String(),
            'reutilizado' => $reutilizado,
            'orcamento' => $this->orcamentoService->show($orcamento),
        ];
    }

    /**
     * Proposta comercial para o cliente. Link inativo/usado → indisponível.
     *
     * @return array<string, mixed>
     */
    public function propostaPublica(string $token): array
    {
        $link = $this->findLinkOrFail($token);

        if (! $link->ativo || $link->usado_em !== null) {
            throw new HttpException(410, 'Esta proposta não está mais disponível.');
        }

        $orcamento = $link->orcamento;
        if ($orcamento === null || $orcamento->trashed()) {
            throw new HttpException(404, 'Proposta não encontrada.');
        }

        if (in_array($orcamento->status, [Orcamento::STATUS_APROVADO, Orcamento::STATUS_REPROVADO], true)) {
            throw new HttpException(410, 'Esta proposta não está mais disponível.');
        }

        $vencido = $link->expira_em === null || $link->expira_em->isPast();

        if (! $vencido && $orcamento->aguardandoCliente()) {
            DB::transaction(function () use ($link, $orcamento) {
                $link->increment('visualizacoes');
                if ($orcamento->status === Orcamento::STATUS_ENVIADO) {
                    $orcamento->status = Orcamento::STATUS_VISUALIZADO;
                    $orcamento->visualizado_em = $orcamento->visualizado_em ?? now();
                    $orcamento->save();
                }
            });
            $orcamento->refresh();
        }

        return $this->dtoComercial($orcamento->fresh(['empresa']), $link->fresh(), $vencido);
    }

    /**
     * @param  array{acao: string, faixa_index?: int, nome_cliente?: string, motivo?: string|null}  $data
     * @return array<string, mixed>
     */
    public function decidirPeloLink(string $token, array $data, ?string $ip, ?string $userAgent): array
    {
        $acao = strtoupper((string) ($data['acao'] ?? ''));
        if (! in_array($acao, ['APROVAR', 'RECUSAR'], true)) {
            throw ValidationException::withMessages([
                'acao' => ['Informe APROVAR ou RECUSAR.'],
            ]);
        }

        $link = $this->findLinkOrFail($token);

        if (! $link->ativo || $link->usado_em !== null) {
            throw new HttpException(410, 'Esta proposta não está mais disponível.');
        }

        if ($link->expira_em === null || $link->expira_em->isPast()) {
            throw new HttpException(410, 'Proposta vencida — solicite atualização ao vendedor.');
        }

        $orcamento = $link->orcamento;
        if ($orcamento === null || $orcamento->trashed()) {
            throw new HttpException(404, 'Proposta não encontrada.');
        }

        if ($orcamento->empresa) {
            app()->instance('empresa', $orcamento->empresa);
        }

        if (in_array($orcamento->status, [Orcamento::STATUS_APROVADO, Orcamento::STATUS_REPROVADO], true)) {
            throw new HttpException(409, 'Proposta já decidida.');
        }

        if (! $orcamento->aguardandoCliente()) {
            throw new HttpException(409, 'Orçamento não está aguardando aprovação do cliente.');
        }

        if ($acao === 'APROVAR') {
            return $this->aprovar($orcamento, $link, $data, $ip, $userAgent);
        }

        return $this->recusar($orcamento, $link, $data, $ip, $userAgent);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function aprovar(
        Orcamento $orcamento,
        OrcamentoLinkAprovacao $link,
        array $data,
        ?string $ip,
        ?string $userAgent,
    ): array {
        $nome = trim((string) ($data['nome_cliente'] ?? ''));
        if (mb_strlen($nome) < 2) {
            throw ValidationException::withMessages([
                'nome_cliente' => ['Informe seu nome para confirmar o aceite.'],
            ]);
        }

        $faixaIndex = (int) ($data['faixa_index'] ?? -1);
        $faixas = $orcamento->result_snapshot['faixas'] ?? [];
        if (! is_array($faixas) || ! array_key_exists($faixaIndex, $faixas)) {
            throw ValidationException::withMessages([
                'faixa_index' => ['Selecione a quantidade que deseja aprovar.'],
            ]);
        }

        $agora = now();
        DB::transaction(function () use ($orcamento, $link, $nome, $faixaIndex, $data, $ip, $userAgent, $agora) {
            $before = ['status' => $orcamento->status];
            $orcamento->fill([
                'status' => Orcamento::STATUS_APROVADO,
                'decidido_em' => $agora,
                'canal_aprovacao' => Orcamento::CANAL_LINK,
                'aceite_nome_cliente' => $nome,
                'aceite_faixa_index' => $faixaIndex,
                'aceite_ip' => $ip,
                'aceite_user_agent' => $userAgent ? mb_substr($userAgent, 0, 512) : null,
                'motivo_decisao' => isset($data['motivo']) ? (trim((string) $data['motivo']) ?: null) : null,
            ]);
            $orcamento->save();

            $link->fill([
                'ativo' => false,
                'usado_em' => $agora,
            ]);
            $link->save();

            $this->audit->log('APROVAR_LINK_CLIENTE', 'Orcamento', $orcamento->id, $before, [
                'status' => Orcamento::STATUS_APROVADO,
                'faixa_index' => $faixaIndex,
                'nome' => $nome,
            ]);
        });

        return [
            'ok' => true,
            'status' => Orcamento::STATUS_APROVADO,
            'codigo' => $orcamento->codigo,
            'mensagem' => 'Proposta aprovada. Em breve a equipe dará andamento.',
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function recusar(
        Orcamento $orcamento,
        OrcamentoLinkAprovacao $link,
        array $data,
        ?string $ip,
        ?string $userAgent,
    ): array {
        $motivo = isset($data['motivo']) ? trim((string) $data['motivo']) : '';
        $agora = now();

        DB::transaction(function () use ($orcamento, $link, $motivo, $ip, $userAgent, $agora) {
            $before = ['status' => $orcamento->status];
            $orcamento->fill([
                'status' => Orcamento::STATUS_REPROVADO,
                'decidido_em' => $agora,
                'canal_aprovacao' => Orcamento::CANAL_LINK,
                'motivo_decisao' => $motivo !== '' ? $motivo : 'Recusado pelo cliente no link',
                'aceite_ip' => $ip,
                'aceite_user_agent' => $userAgent ? mb_substr($userAgent, 0, 512) : null,
                'aceite_nome_cliente' => null,
                'aceite_faixa_index' => null,
            ]);
            $orcamento->save();

            $link->fill([
                'ativo' => false,
                'usado_em' => $agora,
            ]);
            $link->save();

            $this->audit->log('RECUSAR_LINK_CLIENTE', 'Orcamento', $orcamento->id, $before, [
                'status' => Orcamento::STATUS_REPROVADO,
                'motivo' => $orcamento->motivo_decisao,
            ]);
        });

        return [
            'ok' => true,
            'status' => Orcamento::STATUS_REPROVADO,
            'codigo' => $orcamento->codigo,
            'mensagem' => 'Proposta recusada. O comercial poderá revisar e enviar novamente.',
        ];
    }

    private function findLinkOrFail(string $token): OrcamentoLinkAprovacao
    {
        $token = trim($token);
        if ($token === '' || strlen($token) < 20) {
            throw new HttpException(404, 'Link inválido.');
        }

        $link = OrcamentoLinkAprovacao::query()
            ->with(['orcamento.empresa'])
            ->where('token', $token)
            ->first();

        if ($link === null) {
            throw new HttpException(404, 'Link inválido ou revogado.');
        }

        return $link;
    }

    private function novoToken(): string
    {
        // 48 bytes → 64 chars base64url — impossível adivinhar.
        return rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
    }

    private function publicUrl(string $token): string
    {
        $base = rtrim((string) config('erp.orcamento_public_base_url'), '/');
        if ($base === '') {
            $base = rtrim((string) config('app.url'), '/');
        }

        return $base.'/p/'.$token;
    }

    private function mensagemPadrao(Orcamento $orcamento, string $url, ?string $validadeYmd): string
    {
        $empresa = $orcamento->empresa;
        $nomeEmpresa = $empresa?->nome_fantasia ?: ($empresa?->razao_social ?: 'RLP Etiquetas');
        $validade = $validadeYmd
            ? \Carbon\Carbon::parse($validadeYmd)->format('d/m/Y')
            : '—';

        return "Olá! Segue a proposta {$orcamento->codigo} v{$orcamento->versao} da {$nomeEmpresa}:\n"
            ."{$url}\n"
            ."Válida até {$validade}. Para aprovar, abra o link e confirme.\n"
            .'Qualquer dúvida, estou à disposição.';
    }

    /**
     * @return array<string, mixed>
     */
    private function dtoComercial(Orcamento $orcamento, OrcamentoLinkAprovacao $link, bool $vencido): array
    {
        $input = is_array($orcamento->input_snapshot) ? $orcamento->input_snapshot : [];
        $result = is_array($orcamento->result_snapshot) ? $orcamento->result_snapshot : [];
        $empresa = $orcamento->empresa;
        $facaNova = (bool) ($result['faca_nova'] ?? $input['faca_nova'] ?? false);
        $valorFaca = (float) ($result['valor_faca_nova'] ?? $input['valor_faca_nova'] ?? 0);

        $faixas = [];
        foreach (($result['faixas'] ?? []) as $idx => $fx) {
            if (! is_array($fx)) {
                continue;
            }
            $qtd = (int) ($fx['quantidade'] ?? 0);
            $valorTotal = (float) ($fx['valor_total'] ?? 0);
            $valorEtiqueta = (float) ($fx['valor_etiqueta'] ?? 0);
            $rolos = (float) ($fx['rolos'] ?? 0);
            $totalComFaca = $facaNova
                ? (float) ($fx['valor_total_com_faca'] ?? ($valorTotal + $valorFaca))
                : $valorTotal;

            $faixas[] = [
                'index' => (int) $idx,
                'quantidade' => $qtd,
                'valor_total' => round($totalComFaca, 2),
                'valor_unitario' => $qtd > 0 ? round($valorEtiqueta / $qtd, 6) : null,
                'valor_etiqueta' => round($valorEtiqueta, 2),
                'valor_rolo' => $rolos > 0 ? round($valorTotal / $rolos, 2) : null,
                'rolos' => $rolos > 0 ? (int) round($rolos) : null,
                'valor_matriz' => round((float) ($fx['valor_matriz'] ?? 0), 2),
                'valor_faca_nova' => $facaNova ? round((float) ($fx['valor_faca_nova'] ?? $valorFaca), 2) : 0,
            ];
        }

        return [
            'codigo' => $orcamento->codigo,
            'versao' => $orcamento->versao,
            'status' => $orcamento->status,
            'vencido' => $vencido,
            'disponivel' => ! $vencido && $link->ativo && $link->usado_em === null,
            'expira_em' => $link->expira_em?->toIso8601String(),
            'cliente_nome' => $orcamento->cliente_nome,
            'empresa' => [
                'nome_fantasia' => $empresa?->nome_fantasia,
                'razao_social' => $empresa?->razao_social,
                'cnpj' => $empresa?->cnpj,
                'telefone' => $empresa?->telefone,
                'email' => $empresa?->email,
                'municipio' => $empresa?->municipio,
                'uf' => $empresa?->uf,
            ],
            'descricao' => [
                'medida' => $input['medida'] ?? null,
                'papel' => $input['papel'] ?? null,
                'acabamento' => $input['acabamento'] ?? null,
                'cores' => $input['cores'] ?? null,
                'etiq_por_rolo' => $input['etiq_por_rolo'] ?? null,
                'largura_cm' => $input['largura_cm'] ?? null,
                'puxada_cm' => $input['puxada_cm'] ?? null,
                'formato_faca' => $input['formato_faca'] ?? null,
                'faca_nova' => $facaNova,
            ],
            'prazo_entrega_dias' => $orcamento->prazo_entrega_dias,
            'validade_dias' => $orcamento->validade_dias,
            'tolerancia_qtd_pct' => (float) $orcamento->tolerancia_qtd_pct,
            'cobra_matriz' => (bool) $orcamento->cobra_matriz,
            'valor_matriz' => (float) $orcamento->valor_matriz,
            'matriz_nota' => $orcamento->cobra_matriz ? 'Cobrado somente no 1º pedido deste modelo.' : null,
            'faixas' => $faixas,
            // Observação interna do ORC NÃO vai para o cliente (pode ter margem/custo).
            'observacao_comercial' => null,
        ];
    }
}
