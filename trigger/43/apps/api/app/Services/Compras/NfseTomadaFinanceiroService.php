<?php

namespace App\Services\Compras;

use App\Models\Empresa;
use App\Models\NaturezaGerencial;
use App\Models\NfseTomada;
use App\Models\Parceiro;
use App\Models\Titulo;
use App\Services\Codigo\CodigoGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Conferência da NFS-e tomada → títulos a pagar. Não escreve estoque.
 */
final class NfseTomadaFinanceiroService
{
    public const ORIGEM = 'NFSE_TOMADA';

    /** @var list<string> */
    private const NATUREZAS_BLOQUEADAS = ['5.06', '3.05.06', '3.01.05'];

    public function __construct(
        private readonly CodigoGenerator $codigos,
    ) {}

    /**
     * @param  array{natureza_id: int, parceiro_id: int, vencimento?: string, valor?: string|float, parcelas?: list<array{vencimento: string, valor: string|float}>}  $data
     * @return array{nota: NfseTomada, titulos: list<Titulo>, aviso: ?string}
     */
    public function lancar(Empresa $empresa, NfseTomada $nota, array $data): array
    {
        $this->assertEmpresa($empresa, $nota);
        if ($nota->situacao === NfseTomada::SITUACAO_VINCULADA) {
            return [
                'nota' => $nota->load('titulos'),
                'titulos' => $nota->titulos->all(),
                'aviso' => null,
            ];
        }
        if ($nota->situacao !== NfseTomada::SITUACAO_CAIXA || $nota->tipo_documento !== 'NFSE') {
            throw ValidationException::withMessages([
                'nota' => ['Só uma NFS-e na caixa, ainda sem vínculo, gera contas a pagar.'],
            ]);
        }

        $parceiro = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', (int) $data['parceiro_id'])
            ->first();
        if ($parceiro === null) {
            throw ValidationException::withMessages([
                'parceiro_id' => ['Prestador inválido para esta empresa.'],
            ]);
        }
        $natureza = $this->natureza((int) $data['natureza_id']);
        $parcelas = $this->parcelas($nota, $data);

        $aviso = null;
        if ($nota->valor_total !== null) {
            $soma = '0.00';
            foreach ($parcelas as $p) {
                $soma = bcadd($soma, $p['valor'], 2);
            }
            if (bccomp($soma, (string) $nota->valor_total, 2) !== 0) {
                $aviso = 'A soma das parcelas difere do valor da nota. O contas a pagar segue o que você confirmou.';
            }
        }

        $titulos = DB::transaction(function () use ($empresa, $nota, $parceiro, $natureza, $parcelas) {
            $locked = NfseTomada::query()->where('id', $nota->id)->lockForUpdate()->firstOrFail();
            if ($locked->situacao === NfseTomada::SITUACAO_VINCULADA) {
                return $locked->titulos()->get()->all();
            }
            $criados = [];
            $ano = (int) now()->year;
            $i = 0;
            foreach ($parcelas as $p) {
                $i++;
                $criados[] = Titulo::query()->create([
                    'empresa_id' => $empresa->id,
                    'codigo' => $this->codigos->nextCode($empresa->id, 'TIT-'.$ano, 5),
                    'tipo' => Titulo::TIPO_PAGAR,
                    'parceiro_id' => $parceiro->id,
                    'natureza_id' => $natureza->id,
                    'nfse_tomada_id' => $locked->id,
                    'origem' => self::ORIGEM,
                    'documento' => $this->documento($locked, $i),
                    'parcela' => $i,
                    'emissao' => optional($locked->data_emissao)?->toDateString() ?? now()->toDateString(),
                    'vencimento' => $p['vencimento'],
                    'valor' => $p['valor'],
                    'saldo' => $p['valor'],
                    'status' => Titulo::STATUS_ABERTO,
                    'observacao' => 'NFS-e tomada '.($locked->numero ?: $locked->chave),
                ]);
            }
            $locked->situacao = NfseTomada::SITUACAO_VINCULADA;
            $locked->parceiro_id = $parceiro->id;
            $locked->vinculado_em = now();
            $locked->save();

            return $criados;
        });

        return [
            'nota' => $nota->fresh(['titulos']) ?? $nota,
            'titulos' => $titulos,
            'aviso' => $aviso,
        ];
    }

    public function desfazer(Empresa $empresa, NfseTomada $nota): NfseTomada
    {
        $this->assertEmpresa($empresa, $nota);
        if ($nota->situacao !== NfseTomada::SITUACAO_VINCULADA) {
            throw ValidationException::withMessages([
                'nota' => ['Esta nota não está vinculada.'],
            ]);
        }

        DB::transaction(function () use ($nota) {
            $locked = NfseTomada::query()->where('id', $nota->id)->lockForUpdate()->firstOrFail();
            $titulos = $locked->titulos()->lockForUpdate()->get();
            foreach ($titulos as $titulo) {
                if ($titulo->status !== Titulo::STATUS_ABERTO || bccomp((string) $titulo->saldo, (string) $titulo->valor, 2) !== 0) {
                    throw ValidationException::withMessages([
                        'nota' => ['Há título baixado ou parcial. O vínculo permanece.'],
                    ]);
                }
                if ($titulo->baixas()->exists()) {
                    throw ValidationException::withMessages([
                        'nota' => ['Há baixa neste título. O vínculo permanece.'],
                    ]);
                }
            }
            foreach ($titulos as $titulo) {
                $titulo->status = Titulo::STATUS_CANCELADO;
                $titulo->saldo = '0.00';
                $titulo->save();
            }
            $locked->situacao = NfseTomada::SITUACAO_CAIXA;
            $locked->vinculado_em = null;
            $locked->save();
        });

        return $nota->fresh(['titulos']) ?? $nota;
    }

    private function natureza(int $id): NaturezaGerencial
    {
        $natureza = NaturezaGerencial::query()->where('id', $id)->where('ativo', true)->first();
        if ($natureza === null || ! $natureza->aceita_lancamento) {
            throw ValidationException::withMessages([
                'natureza_id' => ['Escolha uma natureza gerencial que aceita lançamento.'],
            ]);
        }
        if (! in_array((int) $natureza->grupo, [2, 3], true) || in_array($natureza->codigo, self::NATUREZAS_BLOQUEADAS, true)) {
            throw ValidationException::withMessages([
                'natureza_id' => ['Serviço tomado usa custo ou despesa operacional. Compra de estoque, uso e consumo e comissão ficam nos seus fluxos.'],
            ]);
        }

        return $natureza;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return list<array{vencimento: string, valor: string}>
     */
    private function parcelas(NfseTomada $nota, array $data): array
    {
        $parcelas = $data['parcelas'] ?? [];
        if (is_array($parcelas) && $parcelas !== []) {
            $out = [];
            foreach ($parcelas as $p) {
                if (! is_array($p)) {
                    continue;
                }
                $valor = number_format((float) ($p['valor'] ?? 0), 2, '.', '');
                $venc = (string) ($p['vencimento'] ?? '');
                if ($venc === '' || bccomp($valor, '0', 2) !== 1) {
                    throw ValidationException::withMessages([
                        'parcelas' => ['Cada parcela precisa de vencimento e valor maior que zero.'],
                    ]);
                }
                $out[] = ['vencimento' => $venc, 'valor' => $valor];
            }
            if ($out === []) {
                throw ValidationException::withMessages([
                    'parcelas' => ['Informe ao menos uma parcela.'],
                ]);
            }

            return $out;
        }

        $venc = (string) ($data['vencimento'] ?? '');
        if ($venc === '') {
            throw ValidationException::withMessages([
                'vencimento' => ['Informe o vencimento.'],
            ]);
        }
        $valorBruto = $data['valor'] ?? $nota->valor_total;
        $valor = number_format((float) $valorBruto, 2, '.', '');
        if (bccomp($valor, '0', 2) !== 1) {
            throw ValidationException::withMessages([
                'valor' => ['Informe o valor a pagar.'],
            ]);
        }

        return [['vencimento' => $venc, 'valor' => $valor]];
    }

    private function documento(NfseTomada $nota, int $parcela): string
    {
        $num = $nota->numero ?: substr((string) $nota->chave, -8);

        return mb_substr('NFS/'.$num.'-'.$parcela, 0, 40);
    }

    private function assertEmpresa(Empresa $empresa, NfseTomada $nota): void
    {
        if ($nota->empresa_id !== $empresa->id) {
            abort(404);
        }
    }
}
