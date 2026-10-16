<?php

namespace App\Services\Estoque;

use App\Models\CodigoSequence;
use App\Models\Empresa;
use App\Models\EstoqueEndereco;
use App\Models\EstoqueLote;
use App\Models\EstoqueSaldo;
use App\Models\Produto;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Locais do almoxarifado — ADR_CADASTRO_INSUMO_VOLUME (emenda 2026-10-16).
 * Cada local é um número L00000001, sequencial por EMP. Sem prateleira.
 * O semente cria L00000001–L00000072 se faltarem e não apaga local criado depois.
 * Número inativado permanece inativo.
 * QR impresso com o prefixo antigo P######## (mesmo número) ainda resolve.
 */
class EstoqueEnderecoService
{
    /**
     * Garante o conjunto inicial e alinha rótulo antigo (P ou malha) para L########.
     * Não reativa número que o operador inativou. Local além dos 72 permanece como está.
     *
     * @return array{criados: int, existentes: int, renomeados: int, desativados: int, total: int}
     */
    public function seedGabarito(Empresa $empresa): array
    {
        $criados = 0;
        $existentes = 0;
        $renomeados = 0;
        $desativados = 0;

        DB::transaction(function () use ($empresa, &$criados, &$existentes, &$renomeados, &$desativados) {
            $alinhados = $this->alinharPrefixoLegado($empresa);
            $renomeados += $alinhados['renomeados'];
            $desativados += $alinhados['desativados'];

            for ($n = 1; $n <= EstoqueEndereco::LOCAIS_INICIAIS; $n++) {
                $r = $this->garantirNumero($empresa, $n);
                $criados += $r['criados'];
                $existentes += $r['existentes'];
            }

            $livres = $this->alinharCodigosLivres($empresa);
            $renomeados += $livres['renomeados'];
            $this->sincronizarSequencia($empresa);
        });

        return [
            'criados' => $criados,
            'existentes' => $existentes,
            'renomeados' => $renomeados,
            'desativados' => $desativados,
            'total' => EstoqueEndereco::LOCAIS_INICIAIS,
        ];
    }

    /**
     * Próximo local da empresa. O operador não escolhe número.
     *
     * @param  array{largura_m?: string|null, profundidade_m?: string|null, altura_m?: string|null}  $input
     */
    public function cadastrar(Empresa $empresa, array $input): EstoqueEndereco
    {
        return DB::transaction(function () use ($empresa, $input) {
            return EstoqueEndereco::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $this->proximoCodigoRotulo($empresa),
                'prateleira' => null,
                'coluna' => null,
                'vao' => null,
                'largura_m' => $this->medida($input['largura_m'] ?? null, EstoqueEndereco::LARGURA_M),
                'profundidade_m' => $this->medida($input['profundidade_m'] ?? null, EstoqueEndereco::PROFUNDIDADE_M),
                'altura_m' => $this->medida($input['altura_m'] ?? null, EstoqueEndereco::ALTURA_M),
                'ativo' => true,
            ]);
        });
    }

    /**
     * Lugar fora da malha (Garagem, em cima das estantes). Reusa o mesmo nome na EMP.
     */
    public function garantirNome(Empresa $empresa, string $nome): EstoqueEndereco
    {
        $nome = trim((string) preg_replace('/\s+/u', ' ', $nome));
        if (mb_strlen($nome) < 2) {
            throw ValidationException::withMessages([
                'nome' => ['Dê um nome ao local (mínimo 2 caracteres).'],
            ]);
        }
        if (mb_strlen($nome) > 80) {
            throw ValidationException::withMessages([
                'nome' => ['Nome do local até 80 caracteres.'],
            ]);
        }

        return DB::transaction(function () use ($empresa, $nome) {
            $existente = EstoqueEndereco::query()
                ->where('empresa_id', $empresa->id)
                ->whereRaw('LOWER(nome) = ?', [mb_strtolower($nome)])
                ->lockForUpdate()
                ->first();

            if ($existente !== null) {
                if (! $existente->ativo) {
                    $existente->ativo = true;
                    $existente->save();
                }

                return $existente;
            }

            return EstoqueEndereco::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $this->proximoCodigoRotulo($empresa),
                'nome' => $nome,
                'prateleira' => null,
                'coluna' => null,
                'vao' => null,
                'largura_m' => EstoqueEndereco::LARGURA_M,
                'profundidade_m' => EstoqueEndereco::PROFUNDIDADE_M,
                'altura_m' => EstoqueEndereco::ALTURA_M,
                'ativo' => true,
            ]);
        });
    }

    /**
     * Um local para a quantidade inteira do SKU sem volume. Não gera MOV.
     *
     * @return array{produto_id: int, local: ?array{id: int, codigo: string, nome: ?string}}
     */
    public function colocarSaldo(Empresa $empresa, int $produtoId, ?int $enderecoId, ?string $nome): array
    {
        $produto = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->whereKey($produtoId)
            ->first();
        if ($produto === null) {
            throw ValidationException::withMessages([
                'produto_id' => ['Produto não encontrado nesta empresa.'],
            ]);
        }
        if ($produto->controla_lote) {
            throw ValidationException::withMessages([
                'produto_id' => ['Este item tem volume. O local de cada volume fica em Guardar.'],
            ]);
        }

        $endereco = $this->resolverLocalDoSaldo($empresa, $enderecoId, $nome);

        $saldo = EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->first();

        if ($saldo === null) {
            throw ValidationException::withMessages([
                'produto_id' => ['Este item ainda não tem saldo. Receba antes de marcar o local.'],
            ]);
        }

        $saldo->endereco_id = $endereco?->id;
        $saldo->save();

        $saldo->load('endereco:id,codigo,nome');

        return [
            'produto_id' => (int) $produto->id,
            'local' => $saldo->endereco?->resumo(),
        ];
    }

    private function resolverLocalDoSaldo(Empresa $empresa, ?int $enderecoId, ?string $nome): ?EstoqueEndereco
    {
        if ($enderecoId !== null && $enderecoId > 0) {
            $end = EstoqueEndereco::query()
                ->where('empresa_id', $empresa->id)
                ->where('ativo', true)
                ->whereKey($enderecoId)
                ->first();
            if ($end === null) {
                throw ValidationException::withMessages([
                    'endereco_id' => ['Local inválido ou inativo nesta empresa.'],
                ]);
            }

            return $end;
        }

        $texto = trim((string) $nome);
        if ($texto === '') {
            return null;
        }

        $numero = EstoqueEndereco::numeroSequencial($texto, true);
        if ($numero !== null) {
            $texto = EstoqueEndereco::codigoSequencialDe($numero);
        }

        $porCodigo = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('ativo', true)
            ->where('codigo', $texto)
            ->first();
        if ($porCodigo !== null) {
            return $porCodigo;
        }

        return $this->garantirNome($empresa, $texto);
    }

    /**
     * Medidas e ativo. Posição e código não mudam — a etiqueta colada continua válida.
     *
     * @param  array{ativo?: bool, largura_m?: string|null, profundidade_m?: string|null, altura_m?: string|null}  $input
     */
    public function atualizar(Empresa $empresa, int $id, array $input): EstoqueEndereco
    {
        $row = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->whereKey($id)
            ->first();

        if ($row === null) {
            abort(404);
        }

        if (array_key_exists('ativo', $input)) {
            $row->ativo = (bool) $input['ativo'];
        }

        foreach (['largura_m', 'profundidade_m', 'altura_m'] as $campo) {
            if (! array_key_exists($campo, $input) || $input[$campo] === null || $input[$campo] === '') {
                continue;
            }
            $row->{$campo} = $this->medida($input[$campo], (string) $row->{$campo});
        }

        $row->save();

        return $row;
    }

    /**
     * P00000001 no mesmo número vira L00000001. Se o L já existe, o volume muda de id e o P sai.
     *
     * @return array{renomeados: int, desativados: int}
     */
    private function alinharPrefixoLegado(Empresa $empresa): array
    {
        $renomeados = 0;
        $desativados = 0;

        $rows = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($rows as $row) {
            $codigo = (string) $row->codigo;
            if (! str_starts_with($codigo, EstoqueEndereco::PREFIXO_ROTULO_LEGADO)) {
                $this->limparMalha($row);
                $row->save();

                continue;
            }

            $numero = EstoqueEndereco::numeroSequencial($codigo, true);
            if ($numero === null) {
                $this->limparMalha($row);
                $row->save();

                continue;
            }

            $alvo = EstoqueEndereco::codigoSequencialDe($numero);
            $outro = EstoqueEndereco::query()
                ->where('empresa_id', $empresa->id)
                ->where('codigo', $alvo)
                ->where('id', '!=', $row->id)
                ->first();

            if ($outro !== null) {
                $this->fundirVinculos($empresa, (int) $row->id, (int) $outro->id);
                $row->codigo = 'LEG-'.$row->id;
                $row->ativo = false;
                $this->limparMalha($row);
                $row->save();
                $desativados++;

                continue;
            }

            $row->codigo = $alvo;
            $this->limparMalha($row);
            $row->save();
            $renomeados++;
        }

        return [
            'renomeados' => $renomeados,
            'desativados' => $desativados,
        ];
    }

    /**
     * @return array{criados: int, existentes: int}
     */
    private function garantirNumero(Empresa $empresa, int $numero): array
    {
        $codigo = EstoqueEndereco::codigoSequencialDe($numero);
        $row = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', $codigo)
            ->lockForUpdate()
            ->first();

        if ($row === null) {
            EstoqueEndereco::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'prateleira' => null,
                'coluna' => null,
                'vao' => null,
                'largura_m' => EstoqueEndereco::LARGURA_M,
                'profundidade_m' => EstoqueEndereco::PROFUNDIDADE_M,
                'altura_m' => EstoqueEndereco::ALTURA_M,
                'ativo' => true,
            ]);

            return ['criados' => 1, 'existentes' => 0];
        }

        $this->limparMalha($row);
        $row->save();

        return ['criados' => 0, 'existentes' => 1];
    }

    /**
     * Código que não é L######## (malha antiga, nome solto no código) recebe o próximo número.
     * Local já inativo com código de fusão (LEG-) fica quieto.
     *
     * @return array{renomeados: int}
     */
    private function alinharCodigosLivres(Empresa $empresa): array
    {
        $renomeados = 0;
        $rows = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($rows as $row) {
            $codigo = (string) $row->codigo;
            if (EstoqueEndereco::isCodigoSequencial($codigo) || str_starts_with($codigo, 'LEG-')) {
                $this->limparMalha($row);
                $row->save();

                continue;
            }

            $row->codigo = $this->proximoCodigoRotulo($empresa);
            $this->limparMalha($row);
            $row->save();
            $renomeados++;
        }

        return ['renomeados' => $renomeados];
    }

    private function limparMalha(EstoqueEndereco $row): void
    {
        $row->prateleira = null;
        $row->coluna = null;
        $row->vao = null;
    }

    private function fundirVinculos(Empresa $empresa, int $deEnderecoId, int $paraEnderecoId): void
    {
        EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->where('endereco_id', $deEnderecoId)
            ->update(['endereco_id' => $paraEnderecoId]);

        EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->where('endereco_id', $deEnderecoId)
            ->update(['endereco_id' => $paraEnderecoId]);
    }

    private function sincronizarSequencia(Empresa $empresa): void
    {
        $proximo = $this->maxCodigoSequencialExistente($empresa) + 1;
        $row = CodigoSequence::query()
            ->where('empresa_id', $empresa->id)
            ->where('prefixo', EstoqueEndereco::SEQ_PREFIXO)
            ->lockForUpdate()
            ->first();

        if ($row === null) {
            CodigoSequence::query()->create([
                'empresa_id' => $empresa->id,
                'prefixo' => EstoqueEndereco::SEQ_PREFIXO,
                'proximo' => $proximo,
            ]);

            return;
        }

        if ((int) $row->proximo < $proximo) {
            $row->update(['proximo' => $proximo]);
        }
    }

    private function proximoCodigoRotulo(Empresa $empresa): string
    {
        $n = DB::transaction(function () use ($empresa) {
            $row = CodigoSequence::query()
                ->where('empresa_id', $empresa->id)
                ->where('prefixo', EstoqueEndereco::SEQ_PREFIXO)
                ->lockForUpdate()
                ->first();

            $floor = $this->maxCodigoSequencialExistente($empresa) + 1;

            if ($row === null) {
                $current = max(1, $floor);
                CodigoSequence::query()->create([
                    'empresa_id' => $empresa->id,
                    'prefixo' => EstoqueEndereco::SEQ_PREFIXO,
                    'proximo' => $current + 1,
                ]);

                return $current;
            }

            $current = max((int) $row->proximo, $floor);
            $row->update(['proximo' => $current + 1]);

            return $current;
        });

        return EstoqueEndereco::codigoSequencialDe($n);
    }

    private function maxCodigoSequencialExistente(Empresa $empresa): int
    {
        $codes = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where(function ($q) {
                $q->where('codigo', 'like', EstoqueEndereco::PREFIXO_ROTULO.'%')
                    ->orWhere('codigo', 'like', EstoqueEndereco::PREFIXO_ROTULO_LEGADO.'%');
            })
            ->pluck('codigo');

        $max = 0;
        foreach ($codes as $codigo) {
            $n = EstoqueEndereco::numeroSequencial((string) $codigo, true);
            if ($n !== null && $n > $max) {
                $max = $n;
            }
        }

        return $max;
    }

    private function medida(mixed $valor, string $padrao): string
    {
        if ($valor === null || $valor === '') {
            return $padrao;
        }

        $texto = is_string($valor) ? trim($valor) : (string) $valor;
        if (! is_numeric($texto)) {
            throw ValidationException::withMessages([
                'largura_m' => ['Medida do local inválida.'],
            ]);
        }

        return number_format((float) $texto, 3, '.', '');
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, bool $somenteAtivos = true): array
    {
        $q = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->orderBy('codigo');

        if ($somenteAtivos) {
            $q->where('ativo', true);
        }

        return $q->get()->map(fn (EstoqueEndereco $e) => $this->toOut($e))->all();
    }

    /**
     * Mapa de ocupação dos locais (WMS leve) — só leitura agregada.
     * Célula = endereço; volumes com qtde > 0. Não altera saldo/MOV.
     *
     * @return array{
     *   locais: list<array<string, mixed>>,
     *   resumo: array{total_locais: int, ocupados: int, vazios: int, volumes_guardados: int, volumes_sem_local: int, skus_distintos: int}
     * }
     */
    public function mapaOcupacao(Empresa $empresa, ?int $produtoId = null): array
    {
        $locais = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('ativo', true)
            ->orderBy('codigo')
            ->get();

        $aggQuery = EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->whereNotNull('endereco_id')
            ->where('qtde', '>', 0);

        if ($produtoId !== null && $produtoId > 0) {
            $aggQuery->where('produto_id', $produtoId);
        }

        /** @var array<int, object{endereco_id: int, volumes_count: int|string, skus_count: int|string}> $porEndereco */
        $porEndereco = $aggQuery
            ->selectRaw('endereco_id, COUNT(*) as volumes_count, COUNT(DISTINCT produto_id) as skus_count')
            ->groupBy('endereco_id')
            ->get()
            ->keyBy(fn ($row) => (int) $row->endereco_id)
            ->all();

        $semLocalQuery = EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->whereNull('endereco_id')
            ->where('qtde', '>', 0);

        if ($produtoId !== null && $produtoId > 0) {
            $semLocalQuery->where('produto_id', $produtoId);
        }

        $volumesSemLocal = (int) $semLocalQuery->count();

        $ids = $locais->map(fn (EstoqueEndereco $end) => (int) $end->id)->all();
        $saldosQuery = EstoqueSaldo::query()
            ->with('produto:id,codigo,descricao_comercial,descricao_fiscal,controla_lote')
            ->where('empresa_id', $empresa->id)
            ->whereIn('endereco_id', $ids === [] ? [0] : $ids)
            ->where('qtde', '>', 0);
        if ($produtoId !== null && $produtoId > 0) {
            $saldosQuery->where('produto_id', $produtoId);
        }
        $saldosPorLocal = $ids === []
            ? collect()
            : $saldosQuery->get()->groupBy(fn (EstoqueSaldo $s) => (int) $s->endereco_id);

        $out = [];
        $nomeados = [];
        $ocupados = 0;
        $volumesGuardados = 0;

        foreach ($locais as $end) {
            $row = $porEndereco[(int) $end->id] ?? null;
            $volumes = $row !== null ? (int) $row->volumes_count : 0;
            $skus = $row !== null ? (int) $row->skus_count : 0;
            $pilhas = [];
            foreach ($saldosPorLocal->get((int) $end->id, collect()) as $saldo) {
                if ($saldo->produto?->controla_lote) {
                    continue;
                }
                $pilhas[] = [
                    'produto_id' => (int) $saldo->produto_id,
                    'codigo' => (string) ($saldo->produto?->codigo ?? ''),
                    'descricao' => (string) ($saldo->produto?->descricao_comercial ?: $saldo->produto?->descricao_fiscal ?: ''),
                    'qtde' => (string) $saldo->qtde,
                    'unidade' => (string) $saldo->unidade,
                ];
            }
            if ($produtoId !== null && $produtoId > 0 && $volumes === 0 && $pilhas === []) {
                continue;
            }
            if ($volumes > 0 || $pilhas !== []) {
                $ocupados++;
                $volumesGuardados += $volumes;
            }
            $cell = $this->toOut($end);
            $cell['volumes_count'] = $volumes;
            $cell['skus_count'] = $skus;
            $cell['itens'] = $pilhas;
            $out[] = $cell;
            if (trim((string) $end->nome) !== '') {
                $nomeados[] = $cell;
            }
        }

        if ($produtoId !== null && $produtoId > 0) {
            $skusDistintos = $volumesGuardados > 0 || $volumesSemLocal > 0 ? 1 : 0;
        } else {
            $skusDistintos = (int) EstoqueLote::query()
                ->where('empresa_id', $empresa->id)
                ->whereNotNull('endereco_id')
                ->where('qtde', '>', 0)
                ->distinct()
                ->count('produto_id');
        }

        return [
            'locais' => $out,
            'nomeados' => $nomeados,
            'resumo' => [
                'total_locais' => count($out),
                'ocupados' => $ocupados,
                'vazios' => count($out) - $ocupados,
                'volumes_guardados' => $volumesGuardados,
                'volumes_sem_local' => $volumesSemLocal,
                'skus_distintos' => $skusDistintos,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(EstoqueEndereco $e): array
    {
        return [
            'id' => $e->id,
            'codigo' => $e->codigo,
            'nome' => $e->nome,
            'largura_m' => (string) $e->largura_m,
            'profundidade_m' => (string) $e->profundidade_m,
            'altura_m' => (string) $e->altura_m,
            'ativo' => (bool) $e->ativo,
            'qr_payload' => $e->qrPayload(),
        ];
    }

    /**
     * Resolve payload END:{empresa_id}:{id}:{codigo} — valida EMP e código.
     * Aceita o rótulo L######## e o prefixo antigo P######## do mesmo número.
     */
    public function resolverPorQr(Empresa $empresa, string $payload): EstoqueEndereco
    {
        $payload = trim($payload);
        if (! preg_match('/^END:(\d+):(\d+):([A-Za-z0-9\-]+)$/', $payload, $m)) {
            throw ValidationException::withMessages([
                'endereco_qr' => ['QR de local inválido. Esperado END:{empresa}:{id}:{codigo}.'],
            ]);
        }

        $empId = (int) $m[1];
        $endId = (int) $m[2];
        $codigo = $m[3];

        if ($empId !== (int) $empresa->id) {
            throw ValidationException::withMessages([
                'endereco_qr' => ['QR de local de outra empresa.'],
            ]);
        }

        $end = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $endId)
            ->where('ativo', true)
            ->first();

        if ($end === null || ! $this->codigoCompativel($end, $codigo)) {
            throw ValidationException::withMessages([
                'endereco_qr' => ['Local não encontrado ou QR adulterado.'],
            ]);
        }

        return $end;
    }

    private function codigoCompativel(EstoqueEndereco $end, string $codigo): bool
    {
        if (strcasecmp((string) $end->codigo, $codigo) === 0) {
            return true;
        }

        $atual = EstoqueEndereco::numeroSequencial((string) $end->codigo, true);
        $lido = EstoqueEndereco::numeroSequencial($codigo, true);

        return $atual !== null && $lido !== null && $atual === $lido;
    }
}
