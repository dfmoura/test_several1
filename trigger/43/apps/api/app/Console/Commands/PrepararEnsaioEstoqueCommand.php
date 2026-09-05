<?php

namespace App\Console\Commands;

use App\Models\DfeDocumento;
use App\Models\Empresa;
use App\Models\ImplantacaoAceite;
use App\Models\NaturezaGerencial;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\User;
use App\Services\Compras\DfeAmarrarService;
use App\Services\Compras\OrdemCompraService;
use App\Support\ImplantacaoCatalogo;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/**
 * Prepara laboratório local para ensaio de estoque do zero:
 * estoque_ativo, SKU da amostra, fornecedor DF-e, OC ABERTA, DF-e com XML amarrada, gates F5.
 * Só ERP_STAGE=local. Não lança saldo — humano confirma receber() na UI.
 */
class PrepararEnsaioEstoqueCommand extends Command
{
    protected $signature = 'erp:preparar-ensaio-estoque
                            {--empresa=EMP-00001 : Código da EMP}
                            {--sem-amarrar : Só deixa DF-e DISPONIVEL (você amarra na UI)}
                            {--dry-run : Só reporta o que faria}';

    protected $description = 'Monta cenário local pronto para testar entrada OC/DF-e → receber() com estoque zerado';

    private const EMIT_CNPJ = '12345678000199';

    private const SKU = 'MP-LARG-320';

    private const GATES_F5 = [
        'F5_COMPRAS',
        'F5_PRODUTOS',
        'F5_NFE_ENT',
        'F5_DFE_CX',
        'F5_LAYOUT',
        'F5_AJUSTE',
    ];

    public function handle(OrdemCompraService $ocs, DfeAmarrarService $amarrar): int
    {
        if (strtolower((string) config('erp.stage', 'local')) !== 'local') {
            $this->error('Só permitido com ERP_STAGE=local.');

            return self::FAILURE;
        }

        $codigoEmp = (string) $this->option('empresa');
        $empresa = Empresa::query()->where('codigo', $codigoEmp)->first();
        if ($empresa === null) {
            $this->error("Empresa {$codigoEmp} não encontrada.");

            return self::FAILURE;
        }

        $dry = (bool) $this->option('dry-run');
        $this->info("Ensaio estoque · {$empresa->codigo} #{$empresa->id}".($dry ? ' · DRY-RUN' : ''));

        if ($dry) {
            $this->line('· ativaria estoque_ativo');
            $this->line('· garantiria SKU '.self::SKU.' + fornecedor '.self::EMIT_CNPJ);
            $this->line('· rodaria dfe:amostra-local + criaria OC ABERTA');
            $this->line('· aceitaria gates F5 (compras/estoque/DF-e)');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($empresa) {
            if (! $empresa->estoque_ativo) {
                $empresa->estoque_ativo = true;
                $empresa->save();
                $this->line('· estoque_ativo → true');
            } else {
                $this->line('· estoque_ativo já true');
            }

            $this->ensureNatureza506();
            $this->ensureProduto($empresa);
            $this->ensureFornecedor($empresa);
            $this->ensureGatesF5($empresa);
        });

        Artisan::call('dfe:amostra-local', ['--empresa' => (string) $empresa->id]);
        $this->output->write(Artisan::output());

        $empresa->refresh();
        $fornecedor = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->where('cnpj_cpf', self::EMIT_CNPJ)
            ->where('papel_fornecedor', true)
            ->firstOrFail();
        $produto = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', self::SKU)
            ->firstOrFail();

        $ocOut = $ocs->create($empresa, [
            'fornecedor_id' => $fornecedor->id,
            'origem' => 'DIRETA',
            'urgente' => false,
            'observacao' => 'Ensaio lab — entrada DF-e/OC (estoque zerado)',
            'itens' => [[
                'produto_id' => $produto->id,
                'qtde_pedida' => '10.0000',
                'unidade' => 'KG',
                'valor_unitario' => '25.075000',
            ]],
        ]);
        $this->line("· OC {$ocOut['codigo']} ABERTA · item ".self::SKU.' × 10 KG');

        $doc = DfeDocumento::query()
            ->where('empresa_id', $empresa->id)
            ->where('emit_cnpj', self::EMIT_CNPJ)
            ->orderByDesc('id')
            ->first();

        if ($doc === null || ! $doc->temXml()) {
            $this->error('DF-e amostra sem XML — abortando amarrar.');

            return self::FAILURE;
        }

        $ocModel = \App\Models\OrdemCompra::query()->findOrFail((int) $ocOut['id']);

        if (! $this->option('sem-amarrar')) {
            $amarrar->amarrar($empresa, $doc, $ocModel);
            $this->line("· DF-e #{$doc->id} AMARRADA → {$ocOut['codigo']}");
        } else {
            $this->line("· DF-e #{$doc->id} DISPONIVEL (amarrar na UI)");
        }

        $saldos = (int) DB::table('estoque_saldos')->where('empresa_id', $empresa->id)->where('qtde', '>', 0)->count();
        $this->newLine();
        $this->info('Pronto para testar.');
        $this->table(['item', 'valor'], [
            ['URL', 'http://localhost:8043'],
            ['EMP', $empresa->codigo],
            ['Login', 'conta admin da instalação (ADMIN_EMAIL / ADMIN_PASSWORD no .env)'],
            ['Operador (SoD AJU)', 'altair@retaetiquetas.com.br (escrever) + admin (aprovar)'],
            ['OC', $ocOut['codigo'].' · ABERTA'],
            ['DF-e', '#'.$doc->id.' · '.($this->option('sem-amarrar') ? 'DISPONIVEL' : 'AMARRADA')],
            ['SKU', self::SKU],
            ['Saldos > 0', (string) $saldos.' (deve ser 0 antes do receber)'],
            ['Caminho UI', 'Compras → Ordens → '.$ocOut['codigo'].' → conferir XML → Receber'],
            ['Alt. UI', 'Compras → NF-e destinadas → abrir doc → ir à OC'],
        ]);

        return self::SUCCESS;
    }

    private function ensureNatureza506(): void
    {
        $nat = NaturezaGerencial::query()->where('codigo', '5.06')->first();
        if ($nat === null) {
            NaturezaGerencial::query()->create([
                'codigo' => '5.06',
                'codigo_exibicao' => 'NAT-5.06',
                'grupo' => 5,
                'nivel' => 2,
                'parent_id' => null,
                'nome' => 'Pagamento a fornecedor de estoque',
                'aceita_lancamento' => true,
                'ativo' => true,
                'ordenacao' => 506,
            ]);
            $this->line('· natureza 5.06 criada');

            return;
        }

        $dirty = false;
        if (! $nat->ativo) {
            $nat->ativo = true;
            $dirty = true;
        }
        if (! $nat->aceita_lancamento) {
            $nat->aceita_lancamento = true;
            $dirty = true;
        }
        if ($dirty) {
            $nat->save();
            $this->line('· natureza 5.06 reativada');
        } else {
            $this->line('· natureza 5.06 ok');
        }
    }

    private function ensureProduto(Empresa $empresa): void
    {
        $p = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', self::SKU)
            ->first();

        if ($p !== null) {
            if ($p->situacao !== 'ATIVO') {
                $p->situacao = 'ATIVO';
                $p->save();
            }
            $this->line('· produto '.self::SKU.' ok');

            return;
        }

        Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => self::SKU,
            'familia' => 'MP',
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'Papel adesivo largura 320mm (ensaio lab)',
            'ncm' => '39199090',
            'unidade_comercial' => 'KG',
            'unidade_interna' => 'KG',
            'fator_conversao' => '1',
            'custo_medio' => '0',
            'situacao' => 'ATIVO',
            'controla_lote' => true,
        ]);
        $this->line('· produto '.self::SKU.' criado');
    }

    private function ensureFornecedor(Empresa $empresa): void
    {
        $f = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->where('cnpj_cpf', self::EMIT_CNPJ)
            ->first();

        if ($f !== null) {
            $f->papel_fornecedor = true;
            $f->situacao = 'ATIVO';
            $f->cadastro_fiscal_completo = true;
            $f->razao_social = $f->razao_social ?: 'Fornecedor Amostra Local';
            $f->save();
            $this->line("· fornecedor {$f->codigo} ok (CNPJ amostra)");

            return;
        }

        $seq = DB::table('codigo_sequences')
            ->where('empresa_id', $empresa->id)
            ->where('prefixo', 'PAR')
            ->lockForUpdate()
            ->first();
        $next = $seq ? (int) $seq->proximo : 1;
        $codigo = sprintf('PAR-%05d', $next);
        if ($seq) {
            DB::table('codigo_sequences')->where('id', $seq->id)->update(['proximo' => $next + 1]);
        }

        Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => self::EMIT_CNPJ,
            'razao_social' => 'Fornecedor Amostra Local',
            'nome_fantasia' => 'Amostra DF-e',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);
        $this->line("· fornecedor {$codigo} criado (CNPJ amostra)");
    }

    private function ensureGatesF5(Empresa $empresa): void
    {
        $user = User::query()
            ->where('ativo', true)
            ->where('empresa_default_id', $empresa->id)
            ->orderBy('id')
            ->first()
            ?? User::query()->where('ativo', true)->orderBy('id')->first();

        foreach (self::GATES_F5 as $codigo) {
            $row = ImplantacaoAceite::query()->firstOrNew([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
            ]);
            $row->status_dev = ImplantacaoCatalogo::STATUS_OK;
            $row->status_cliente = ImplantacaoCatalogo::STATUS_OK;
            $row->validado_dev_por = $user?->id;
            $row->validado_cliente_por = $user?->id;
            $row->validado_dev_em = now();
            $row->validado_cliente_em = now();
            $row->obs_dev = $row->obs_dev ?: 'Ensaio lab estoque';
            $row->obs_cliente = $row->obs_cliente ?: 'Ensaio lab estoque';
            $row->save();
        }
        $this->line('· gates F5 (compras/produtos/NF-e/DF-e/layout/ajuste) aceitos');
    }
}
