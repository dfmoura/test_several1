<?php

namespace Tests;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Services\Financeiro\AdiantamentoService;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Testing\TestResponse;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        // `php artisan test` herda DB_*=mysql do Compose; phpunit.xml force
        // sozinho não basta — precisa setar ANTES do boot da Application.
        $this->forceTestingDatabaseEnv();

        parent::setUp();

        $connection = (string) config('database.default');
        $database = (string) config("database.connections.{$connection}.database");

        // Evita RefreshDatabase destruir o MySQL compartilhado do Docker Compose.
        if ($connection !== 'sqlite' || $database !== ':memory:') {
            throw new RuntimeException(
                "Testes devem usar sqlite :memory: (atual: {$connection} / {$database}). ".
                'Confira phpunit.xml (force="true") e Tests\\TestCase::forceTestingDatabaseEnv().'
            );
        }
    }

    /**
     * Marca o PAR como recorrente limpo (já fez serviço) — aceite sem sinal.
     * Política: ADR_ORC_ADIANTAMENTO_PIX.
     */
    protected function seedParceiroRecorrenteLimpo(Empresa $empresa, Parceiro $parceiro, int $numero = 99001): Pedido
    {
        $orc = Orcamento::query()->create([
            'empresa_id' => $empresa->id,
            'ano' => 2026,
            'numero' => $numero,
            'codigo' => 'ORC-2026-'.str_pad((string) $numero, 5, '0', STR_PAD_LEFT),
            'versao' => 1,
            'parceiro_id' => $parceiro->id,
            'cliente_nome' => $parceiro->razao_social,
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
            'input_snapshot' => [],
            'result_snapshot' => ['faixas' => []],
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);

        return Pedido::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PED-HIST-'.str_pad((string) $numero, 5, '0', STR_PAD_LEFT),
            'orcamento_id' => $orc->id,
            'parceiro_id' => $parceiro->id,
            'status' => Pedido::STATUS_ENCERRADO,
            'faixa_index' => 0,
            'tolerancia_qtd_pct' => '20',
            'prazo_entrega_dias' => 10,
            'snapshot' => ['input' => [], 'faixa' => []],
        ]);
    }

    /**
     * Completa identidade + endereço base do PAR para o gate de envio da proposta.
     * Norma: ParceiroProntidaoProposta / ADR_ORC_LINK_APROVACAO.
     *
     * @param  array<string, mixed>  $overrides
     */
    protected function completarParceiroParaProposta(Parceiro $parceiro, array $overrides = []): Parceiro
    {
        $parceiro->fill(array_merge([
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '60746948000112',
            'is_prospect' => false,
            'situacao' => 'ATIVO',
            'logradouro' => 'Rua Teste Comercial',
            'numero' => '100',
            'bairro' => 'Centro',
            'municipio' => 'Betim',
            'uf' => 'MG',
            'cep' => '32600000',
        ], $overrides));
        $parceiro->save();

        return $parceiro->fresh();
    }

    /**
     * Formaliza OC rascunho → ABERTA (ADR_OC_RASCUNHO_ENVIO) antes de receber/XML.
     *
     * @param  array<string, string>  $headers
     */
    protected function enviarOrdemCompra(array $headers, int $ocId): TestResponse
    {
        return $this->withHeaders($headers)
            ->postJson("/api/v1/ordens-compra/{$ocId}/enviar")
            ->assertOk()
            ->assertJsonPath('data.status', 'ABERTA');
    }

    private function forceTestingDatabaseEnv(): void
    {
        $vars = [
            'APP_ENV' => 'testing',
            // Chave fixa só para testes (não usar em produção).
            'APP_KEY' => 'base64:2fl+KtvkdphvQyEfm5L2sY8b3V8z0xqG1nN9pQwErAs=',
            'DB_CONNECTION' => 'sqlite',
            'DB_DATABASE' => ':memory:',
            'CACHE_STORE' => 'array',
            'QUEUE_CONNECTION' => 'sync',
            'SESSION_DRIVER' => 'array',
            'FISCAL_EMISSOR' => 'focus',
            'ERP_STAGE' => 'testing',
            'ASAAS_API_KEY' => '',
            'BILLING_PROVIDER' => 'mock',
            'MAIL_MAILER' => 'array',
            'ORDEM_COMPRA_EMAIL_AUTO' => 'true',
        ];

        foreach ($vars as $key => $value) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}
