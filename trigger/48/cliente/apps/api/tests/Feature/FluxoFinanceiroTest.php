<?php

namespace Tests\Feature;

use App\Domain\Cobranca\BaixaPix;
use App\Domain\Demanda\DemandaService;
use App\Domain\RegraNegocio;
use App\Domain\Rotina\RotinaDiaria;
use App\Models\CobrancaPix;
use App\Models\Demanda;
use App\Models\Empresa;
use App\Models\Fatura;
use App\Models\MovimentoSaldo;
use App\Models\Proposta;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;
use Tests\Concerns\CriaEmpresa;

class FluxoFinanceiroTest extends AreaTestCase
{
    use CriaEmpresa;

    public function test_conta_sem_pix_nao_abre_demanda(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo(0);
        $empresa->status = 'AGUARDA_PIX';
        $empresa->save();

        $this->expectException(RegraNegocio::class);
        app(DemandaService::class)->abrir($empresa, $usuario, $this->pedido());
    }

    public function test_aprovar_nao_liquida_e_a_apresentacao_cobra_a_diferenca(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo(50000);
        $demanda = $this->ateAprovada($empresa, $usuario, 150000);

        $this->assertSame('APROVADA', $demanda->fresh()->status);
        $this->assertNull($demanda->fatura);
        $this->assertSame(0, $empresa->carteira->fresh()->disponivel_centavos);
        $this->assertSame(50000, $empresa->carteira->fresh()->reservado_centavos);
        $this->assertSame(0, Fatura::query()->count());

        $operador = $this->operador();
        app(DemandaService::class)->iniciarExecucao($demanda, $operador->id);
        $fatura = app(DemandaService::class)->apresentar($demanda, $operador->id, 'Entrega pronta para validar.');

        $this->assertSame('ABERTA', $fatura->status);
        $this->assertSame('APRESENTADA', $demanda->fresh()->status);
        $this->assertSame(100000, $fatura->complemento_centavos);
        $this->assertSame(50000, $empresa->carteira->fresh()->reservado_centavos);

        $pix = CobrancaPix::query()->where('fatura_id', $fatura->id)->where('status', 'ATIVA')->first();
        $this->assertNotNull($pix);
        $this->assertSame(100000, $pix->valor_centavos);

        app(BaixaPix::class)->confirmar($pix->txid, 'E2ECOMPLEMENTO123456789012345678', 100000);
        app(BaixaPix::class)->confirmar($pix->txid, 'E2ECOMPLEMENTO123456789012345678', 100000);

        $empresa->carteira->refresh();
        $this->assertSame('CONCLUIDA', $demanda->fresh()->status);
        $this->assertSame('LIQUIDADA', $fatura->fresh()->status);
        $this->assertSame(0, $empresa->carteira->disponivel_centavos);
        $this->assertSame(0, $empresa->carteira->reservado_centavos);
        $this->assertSame(150000, $empresa->carteira->consumido_centavos);
        $this->assertSame(1, MovimentoSaldo::query()->where('tipo', 'CREDITO_COMPLEMENTO')->count());
    }

    public function test_recusa_da_trigger_devolve_e_a_terceira_do_cliente_consome(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo(50000);
        $demanda = app(DemandaService::class)->abrir($empresa, $usuario, $this->pedido());
        app(DemandaService::class)->recusarTrigger($demanda, $this->operador()->id, 'Fora do que a Trigger executa agora.');
        $this->assertSame(50000, $empresa->carteira->fresh()->disponivel_centavos);
        $this->assertSame('RECUSADA_TRIGGER', $demanda->fresh()->status);

        foreach ([1, 2] as $vez) {
            $aberta = app(DemandaService::class)->abrir($empresa->fresh(), $usuario, $this->pedido());
            $this->propor($aberta, 80000);
            app(DemandaService::class)->recusarCliente($aberta, $usuario, 'O escopo ainda não atende o que precisamos.');
            $this->assertSame('RECUSADA_CLIENTE', $aberta->fresh()->status);
        }
        $this->assertSame(50000, $empresa->carteira->fresh()->disponivel_centavos);

        $terceira = app(DemandaService::class)->abrir($empresa->fresh(), $usuario, $this->pedido());
        $this->propor($terceira, 80000);
        app(DemandaService::class)->recusarCliente($terceira, $usuario, 'Ainda não é o escopo que queremos contratar.');
        $this->assertSame(0, $empresa->carteira->fresh()->disponivel_centavos);
        $this->assertSame(50000, $empresa->carteira->fresh()->consumido_centavos);
        $this->assertTrue(
            MovimentoSaldo::query()->where('observacao', 'ANALISE_NAO_CONTRATADA')->exists()
        );
    }

    public function test_proposta_vencida_devolve_a_reserva(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo(50000);
        $demanda = app(DemandaService::class)->abrir($empresa, $usuario, $this->pedido());
        $proposta = $this->propor($demanda, 90000);
        $proposta->valida_ate = now()->subMinute();
        $proposta->save();

        app(RotinaDiaria::class)->executar();

        $this->assertSame('EXPIRADA', $demanda->fresh()->status);
        $this->assertSame(50000, $empresa->carteira->fresh()->disponivel_centavos);
    }

    public function test_webhook_credita_uma_vez_e_o_driver_falso_nao_aceita_aviso(): void
    {
        [$empresa] = $this->empresaComSaldo(0);
        $cobranca = CobrancaPix::query()->create([
            'empresa_id' => $empresa->id,
            'finalidade' => 'RECARGA',
            'txid' => 'txidlocal'.Str::lower(Str::random(16)),
            'valor_centavos' => 50000,
            'status' => 'ATIVA',
            'expira_em' => now()->addHour(),
            'payload_copia_cola' => 'payload',
            'criada_em' => now(),
        ]);

        $this->postJson('/webhooks/inter/pix', $this->aviso($cobranca->txid))->assertNotFound();

        config(['pix.driver' => 'inter']);
        $corpo = $this->aviso($cobranca->txid);
        $this->postJson('/webhooks/inter/pix', $corpo)->assertNoContent();
        $this->postJson('/webhooks/inter/pix', $corpo)->assertNoContent();
        $this->postJson('/webhooks/inter/pix', $corpo, ['X-Inter-Entrega' => 'segunda-entrega'])->assertNoContent();

        $this->assertSame(50000, $empresa->carteira->fresh()->disponivel_centavos);
        $this->assertSame(1, MovimentoSaldo::query()->where('empresa_id', $empresa->id)->where('tipo', 'CREDITO_PIX')->count());
    }

    public function test_movimento_de_saldo_nao_pode_ser_alterado(): void
    {
        [$empresa] = $this->empresaComSaldo(50000);
        $movimento = MovimentoSaldo::query()->where('empresa_id', $empresa->id)->first();
        $this->expectException(QueryException::class);
        $movimento->update(['valor_centavos' => 1]);
    }

    private function ateAprovada(Empresa $empresa, $usuario, int $valor): Demanda
    {
        $demanda = app(DemandaService::class)->abrir($empresa, $usuario, $this->pedido());
        $this->propor($demanda, $valor);
        app(DemandaService::class)->aprovar($demanda, $usuario, '127.0.0.1');

        return $demanda->fresh();
    }

    private function propor(Demanda $demanda, int $valor): Proposta
    {
        return app(DemandaService::class)->propor($demanda, $this->operador()->id, [
            'objetivo' => 'Entregar o relatório',
            'contexto' => 'O cliente já opera o sistema',
            'descricao_funcional' => 'Filtro por período e exportação',
            'requisitos' => 'Período obrigatório',
            'criterios_aceite' => 'O arquivo abre no período pedido',
            'premissas' => 'A base já existe',
            'restricoes' => 'Sem aplicativo novo',
            'incluso' => 'O relatório e o filtro',
            'nao_incluso' => 'Carga histórica',
            'prazo_dias_uteis' => 10,
            'horas_estimadas' => 20,
            'valor_centavos' => $valor,
            'observacao' => null,
        ]);
    }

    private function pedido(): array
    {
        return [
            'titulo' => 'Relatório de vendas',
            'descricao' => 'Precisamos filtrar por período.',
            'objetivo' => 'Fechar o mês sem planilha',
            'sistema_atual' => 'ERP atual',
            'tipo' => 'relatorio',
            'prioridade' => 'normal',
            'prazo_desejado' => now()->addDays(20)->toDateString(),
            'contato_tecnico' => 'Ana, ana@example.test',
            'observacoes' => null,
        ];
    }

    private function aviso(string $txid): array
    {
        return ['pix' => [[
            'txid' => $txid,
            'endToEndId' => 'E2EWEBHOOK123456789012345678901',
            'valor' => '500.00',
        ]]];
    }
}
