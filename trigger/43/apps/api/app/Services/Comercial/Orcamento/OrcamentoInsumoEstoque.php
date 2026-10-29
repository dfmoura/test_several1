<?php

namespace App\Services\Comercial\Orcamento;

use App\Models\Empresa;
use App\Models\EstoqueSaldo;
use App\Models\Produto;
use App\Support\CaixaMedida;
use App\Support\PadraoDecimal;
use Illuminate\Validation\ValidationException;

/**
 * Papel e acabamento do ORC saem do cadastro com saldo.
 * Tubete no ORC é só polegada (1" / 1" 1/2 / 3") — ADR_CADASTRO_INSUMO_VOLUME.
 * A tarifa R$/m² continua no catálogo ORC — o nome do produto casa a linha.
 */
final class OrcamentoInsumoEstoque
{
    /** @var list<string> */
    public const GRUPOS_PAPEL = ['MP-PAP', 'MP-FLM'];

    /** @var list<string> */
    public const GRUPOS_ACABAMENTO = ['MP-LAM', 'MP-CLD'];

    /** @var list<string> */
    public const COMPLEMENTOS = ['VERNIZ', 'COLA'];

    /**
     * @return list<array<string, mixed>>
     */
    public function buscar(Empresa $empresa, string $slot, ?string $q, ?int $incluirId = null): array
    {
        $termo = trim((string) $q);
        $query = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('situacao', 'ATIVO')
            ->with('grupoCatalogo:id,codigo,nome');

        if ($slot === 'papel') {
            $query->where('familia', 'MP')
                ->whereHas('grupoCatalogo', fn ($g) => $g->whereIn('codigo', self::GRUPOS_PAPEL));
        } elseif ($slot === 'acabamento') {
            $query->where('familia', 'MP')
                ->whereHas('grupoCatalogo', fn ($g) => $g->whereIn('codigo', self::GRUPOS_ACABAMENTO));
        } elseif ($slot === 'tubete') {
            $query->where('familia', 'EMB')
                ->where(function ($g) {
                    $g->where('codigo', 'like', '%TUBETE%')
                        ->orWhere('descricao_fiscal', 'like', '%TUBETE%')
                        ->orWhere('descricao_comercial', 'like', '%TUBETE%');
                });
        } elseif ($slot === 'caixa') {
            $query->where('familia', 'EMB')
                ->where(function ($g) {
                    $g->where('codigo', 'like', 'EMB-CX%')
                        ->orWhere('descricao_fiscal', 'like', '%CAIXA%')
                        ->orWhere('descricao_comercial', 'like', '%CAIXA%')
                        ->orWhereHas('grupoCatalogo', fn ($grupo) => $grupo->where('codigo', 'EMB-CX'));
                });
        } else {
            return [];
        }

        $comSaldo = $this->idsComSaldo($empresa);
        $incluirId = $incluirId !== null && $incluirId > 0 ? $incluirId : null;
        $query->where(function ($g) use ($comSaldo, $incluirId) {
            if ($comSaldo === []) {
                $g->whereRaw('1 = 0');
            } else {
                $g->whereIn('id', $comSaldo);
            }
            if ($incluirId !== null) {
                $g->orWhere('id', $incluirId);
            }
        });

        if ($termo !== '') {
            $query->where(function ($g) use ($termo) {
                $g->where('codigo', 'like', '%'.$termo.'%')
                    ->orWhere('descricao_fiscal', 'like', '%'.$termo.'%')
                    ->orWhere('descricao_comercial', 'like', '%'.$termo.'%');
            });
        }

        $rows = $query->orderBy('codigo')->limit(30)->get();
        $saldos = $this->saldosDe($empresa, $rows->pluck('id')->all());
        $cat = OrcamentoCatalogo::load(null, $empresa->id);

        return $rows->map(function (Produto $p) use ($slot, $saldos, $cat) {
            $desc = trim((string) ($p->descricao_comercial ?: $p->descricao_fiscal));
            $grupo = (string) ($p->grupoCatalogo?->codigo ?? '');
            $tarifa = match ($slot) {
                'papel' => $this->casarPapel($desc, array_keys($cat->papel)),
                'acabamento' => $this->casarAcabamentoBase($grupo, $desc, array_keys($cat->acabamentos)),
                'tubete' => self::polegada($p->codigo.' '.$desc),
                'caixa' => CaixaMedida::rotulo(is_array($p->atributos) ? $p->atributos : null),
                default => null,
            };

            return [
                'id' => (int) $p->id,
                'codigo' => (string) $p->codigo,
                'descricao' => $desc,
                'unidade' => strtoupper((string) ($p->unidade_interna ?: $p->unidade_comercial ?: 'UN')) ?: 'UN',
                'saldo' => $saldos[(int) $p->id] ?? '0',
                'grupo' => $grupo,
                'tarifa' => $tarifa,
            ];
        })->all();
    }

    /**
     * Grava SKU + tarifa no input do motor. Sem produto_id, o texto legado segue no catálogo.
     *
     * @param  array<string, mixed>  $data
     * @param  list<int>  $idsJaGravados  SKU já salvo neste orçamento: pode permanecer com saldo zerado
     * @return array<string, mixed>
     */
    public function aplicar(Empresa $empresa, array $data, array $idsJaGravados = []): array
    {
        $admin = app(OrcamentoCatalogoAdminService::class);
        if ((int) ($data['papel_produto_id'] ?? 0) > 0) {
            $admin->garantirPapeisSku($empresa->id);
        }
        if ((int) ($data['acabamento_produto_id'] ?? 0) > 0) {
            $admin->garantirAcabamentosSku($empresa->id);
        }
        $cat = OrcamentoCatalogo::load(null, $empresa->id);

        $papelId = (int) ($data['papel_produto_id'] ?? 0);
        if ($papelId > 0) {
            $produto = $this->exigirProduto($empresa, $papelId, 'papel', $idsJaGravados);
            $desc = $this->descricao($produto);
            $data['papel'] = $desc;
            $data['papel_produto_id'] = (int) $produto->id;
            $data['papel_produto_codigo'] = (string) $produto->codigo;
            if (array_key_exists((int) $produto->id, $cat->papelPorProduto)) {
                if ($cat->papelPorProduto[(int) $produto->id] === null) {
                    throw ValidationException::withMessages([
                        'papel' => ['Este papel ainda não tem preço no catálogo ORC. Informe o R$/m² na aba Papel.'],
                    ]);
                }
                $data['papel_tarifa'] = null;
            } else {
                $tarifa = $this->casarPapel($desc, array_keys($cat->papel));
                if ($tarifa === null) {
                    throw ValidationException::withMessages([
                        'papel' => ['Este papel não casa com nenhuma tarifa do catálogo ORC. Ajuste o nome do produto ou a tarifa.'],
                    ]);
                }
                $data['papel_tarifa'] = $tarifa;
            }
        }

        $acabId = (int) ($data['acabamento_produto_id'] ?? 0);
        $comp = $this->complemento($data['acabamento_complemento'] ?? null);
        if ($acabId > 0 || $comp !== '') {
            $data = $this->aplicarAcabamento($empresa, $data, $cat, $acabId, $comp, $idsJaGravados);
        }

        // ORC não amarra SKU físico EMB-TUB. Polegada canônica alimenta preço/caixas;
        // peça e baixa ficam para chão / ajuste manual.
        $tubeteRaw = trim((string) ($data['tubete'] ?? ''));
        if ($tubeteRaw !== '') {
            $data['tubete'] = self::polegada($tubeteRaw) ?? $tubeteRaw;
        }
        $data['tubete_produto_id'] = null;
        $data['tubete_produto_codigo'] = null;
        $data['tubete_rotulo'] = null;

        return $data;
    }

    public static function polegada(string $texto): ?string
    {
        $t = mb_strtoupper(trim($texto), 'UTF-8');
        $t = str_replace(['”', '“', '″', '′'], '"', $t);
        $t = strtr($t, ['Á' => 'A', 'À' => 'A', 'Ã' => 'A', 'Â' => 'A', 'É' => 'E', 'Ê' => 'E']);
        if (preg_match('/1\s*["\']?\s*1\s*\/\s*2|1\s*1\/2|1[,.]5/', $t) === 1) {
            return '1" 1/2';
        }
        if (preg_match('/(^|[^0-9])3\s*("|POLEG|POL\b)/', $t) === 1) {
            return '3"';
        }
        if (preg_match('/(^|[^0-9])1\s*("|POLEG|POL\b)/', $t) === 1) {
            return '1"';
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<int>  $idsJaGravados
     * @return array<string, mixed>
     */
    private function aplicarAcabamento(Empresa $empresa, array $data, OrcamentoCatalogo $cat, int $acabId, string $comp, array $idsJaGravados): array
    {
        $nomes = array_keys($cat->acabamentos);
        if ($acabId < 1) {
            if ($comp === 'COLA') {
                throw ValidationException::withMessages([
                    'acabamento' => ['Cola acompanha um filme de laminação ou cold. Verniz pode ir sozinho.'],
                ]);
            }
            if ($comp === 'VERNIZ') {
                $data['acabamento'] = 'VERNIZ';
                $data['acabamento_tarifa'] = 'VERNIZ';
                $data['acabamento_tarifa_composta'] = false;
                $data['acabamento_complemento'] = 'VERNIZ';
                $data['acabamento_produto_id'] = null;
                $data['acabamento_produto_codigo'] = null;
            }

            return $data;
        }

        $produto = $this->exigirProduto($empresa, $acabId, 'acabamento', $idsJaGravados);
        $desc = $this->descricao($produto);
        $grupo = (string) ($produto->grupoCatalogo?->codigo ?? '');
        $sku = $cat->acabamentoPorProduto[(int) $produto->id] ?? null;
        if (is_array($sku) && $sku['grupo'] !== 'MP-CLD' && $sku['preco'] === null) {
            throw ValidationException::withMessages([
                'acabamento' => ['Este acabamento ainda não tem preço no catálogo ORC. Informe o R$/m² na aba Acabamento.'],
            ]);
        }
        $combinado = $comp !== ''
            ? $this->casarAcabamentoCombinado($grupo, $desc, $comp, $nomes)
            : null;
        if ($comp === 'COLA' && $combinado === null) {
            throw ValidationException::withMessages([
                'acabamento' => ['Cola neste filme ainda não tem preço no catálogo ORC. Cold com cola já tem.'],
            ]);
        }
        $base = $combinado ?? $this->casarAcabamentoBase($grupo, $desc, $nomes);
        if ($base === null) {
            $msg = $grupo === 'MP-CLD' && $comp === ''
                ? 'Cold em estoque pede verniz ou cola — o catálogo não tem tarifa de cold sozinho.'
                : 'Este acabamento não casa com uma tarifa do catálogo ORC (brilho, fosco, verniz ou cola).';
            throw ValidationException::withMessages(['acabamento' => [$msg]]);
        }

        $data['acabamento'] = $this->rotuloAcabamento($desc, $comp);
        $data['acabamento_tarifa'] = $base;
        $data['acabamento_tarifa_composta'] = $combinado !== null;
        $data['acabamento_complemento'] = $comp !== '' ? $comp : null;
        $data['acabamento_produto_id'] = (int) $produto->id;
        $data['acabamento_produto_codigo'] = (string) $produto->codigo;

        return $data;
    }

    private function rotuloAcabamento(string $desc, string $comp): string
    {
        if ($comp === '') {
            return $desc;
        }

        return $desc.' + '.$comp;
    }

    private function complemento(mixed $raw): string
    {
        $c = mb_strtoupper(trim((string) $raw), 'UTF-8');

        return in_array($c, self::COMPLEMENTOS, true) ? $c : '';
    }

    /**
     * @param  list<int>  $idsJaGravados
     */
    private function exigirProduto(Empresa $empresa, int $id, string $slot, array $idsJaGravados = []): Produto
    {
        $produto = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->whereKey($id)
            ->where('situacao', 'ATIVO')
            ->with('grupoCatalogo:id,codigo')
            ->first();
        $campo = $slot === 'papel' ? 'papel' : ($slot === 'tubete' ? 'tubete' : 'acabamento');
        if ($produto === null || ! $this->slotAceita($produto, $slot)) {
            throw ValidationException::withMessages([
                $campo => ['Produto inválido para este campo.'],
            ]);
        }
        $saldo = $this->saldosDe($empresa, [$produto->id])[(int) $produto->id] ?? '0';
        $jaGravado = in_array((int) $produto->id, $idsJaGravados, true);
        if (! $jaGravado && bccomp($saldo, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                $campo => ['Este produto não tem saldo disponível.'],
            ]);
        }

        return $produto;
    }

    private function slotAceita(Produto $produto, string $slot): bool
    {
        $grupo = (string) ($produto->grupoCatalogo?->codigo ?? '');
        if ($slot === 'papel') {
            return $produto->familia === 'MP' && in_array($grupo, self::GRUPOS_PAPEL, true);
        }
        if ($slot === 'acabamento') {
            return $produto->familia === 'MP' && in_array($grupo, self::GRUPOS_ACABAMENTO, true);
        }
        if ($slot === 'tubete') {
            if ($produto->familia !== 'EMB') {
                return false;
            }
            $hay = mb_strtoupper($produto->codigo.' '.$produto->descricao_fiscal.' '.$produto->descricao_comercial, 'UTF-8');

            return str_contains($hay, 'TUBETE');
        }

        return false;
    }

    private function descricao(Produto $produto): string
    {
        return trim((string) ($produto->descricao_comercial ?: $produto->descricao_fiscal));
    }

    /**
     * @param  list<int>  $ids
     * @return array<int, string>
     */
    private function saldosDe(Empresa $empresa, array $ids): array
    {
        if ($ids === []) {
            return [];
        }
        $out = [];
        $rows = EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('produto_id', $ids)
            ->groupBy('produto_id')
            ->selectRaw('produto_id, SUM(qtde) as saldo')
            ->get();
        foreach ($rows as $row) {
            $out[(int) $row->produto_id] = PadraoDecimal::roundHalfUp((string) $row->saldo, PadraoDecimal::SCALE_QTY);
        }

        return $out;
    }

    /**
     * @return list<int>
     */
    private function idsComSaldo(Empresa $empresa): array
    {
        return EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->groupBy('produto_id')
            ->havingRaw('SUM(qtde) > 0')
            ->pluck('produto_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * Uma tarifa só quando o nome do SKU casa por completo com exatamente uma linha.
     * Dois casamentos (BOPP BRILHO e BOPP BRILHO BXT) não escolhem preço sozinhos.
     *
     * @param  list<string>  $nomes
     */
    public function tarifaPapelUnica(string $descricao, array $nomes): ?string
    {
        $hay = $this->tokens($descricao);
        $hits = [];
        foreach ($nomes as $nome) {
            $tokens = $this->tokens($nome);
            if (count($tokens) < 2) {
                continue;
            }
            $ok = true;
            foreach ($tokens as $t) {
                if (! in_array($t, $hay, true)) {
                    $ok = false;
                    break;
                }
            }
            if ($ok) {
                $hits[] = $nome;
            }
        }

        return count($hits) === 1 ? $hits[0] : null;
    }

    /**
     * @param  list<string>  $nomes
     */
    public function tarifaAcabamentoBaseUnica(string $grupo, string $descricao, array $nomes): ?string
    {
        $pool = [];
        foreach ($this->nomesFamilia($grupo, $nomes) as $nome) {
            $f = $this->fold($nome);
            if (str_contains($f, 'VERNIZ') || str_contains($f, 'COLA')) {
                continue;
            }
            $pool[] = $nome;
        }
        $hay = $this->tokens($descricao);
        $hits = [];
        foreach ($pool as $nome) {
            $miss = false;
            foreach ($this->tokens($nome) as $t) {
                if (in_array($t, ['STAMP', 'LAMINACAO', 'COLD'], true)) {
                    continue;
                }
                if (! in_array($t, $hay, true)) {
                    $miss = true;
                    break;
                }
            }
            if (! $miss) {
                $hits[] = $nome;
            }
        }

        return count($hits) === 1 ? $hits[0] : null;
    }

    /**
     * @param  list<string>  $nomes
     */
    private function casarPapel(string $descricao, array $nomes): ?string
    {
        $hay = $this->tokens($descricao);
        $best = null;
        $bestScore = 0;
        foreach ($nomes as $nome) {
            $tokens = $this->tokens($nome);
            if (count($tokens) < 2) {
                continue;
            }
            $hit = 0;
            foreach ($tokens as $t) {
                if (in_array($t, $hay, true)) {
                    $hit++;
                }
            }
            if ($hit < count($tokens)) {
                continue;
            }
            $score = $hit * 10 + mb_strlen($this->fold($nome));
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $nome;
            }
        }

        return $best;
    }

    /**
     * @param  list<string>  $nomes
     */
    private function casarAcabamentoBase(string $grupo, string $descricao, array $nomes): ?string
    {
        $pool = [];
        foreach ($this->nomesFamilia($grupo, $nomes) as $nome) {
            $f = $this->fold($nome);
            if (str_contains($f, 'VERNIZ') || str_contains($f, 'COLA')) {
                continue;
            }
            $pool[] = $nome;
        }

        return $this->melhor($pool, $descricao);
    }

    /**
     * @param  list<string>  $nomes
     */
    private function casarAcabamentoCombinado(string $grupo, string $descricao, string $comp, array $nomes): ?string
    {
        $pool = [];
        foreach ($this->nomesFamilia($grupo, $nomes) as $nome) {
            if (str_contains($this->fold($nome), $comp)) {
                $pool[] = $nome;
            }
        }

        return $this->melhor($pool, $descricao.' '.$comp);
    }

    /**
     * @param  list<string>  $nomes
     * @return list<string>
     */
    private function nomesFamilia(string $grupo, array $nomes): array
    {
        $out = [];
        foreach ($nomes as $nome) {
            if (preg_match('/^sem\s/i', $nome) === 1) {
                continue;
            }
            $f = $this->fold($nome);
            if ($f === 'REBOBINACAO' || $f === 'VERNIZ') {
                continue;
            }
            if ($grupo === 'MP-CLD' && str_contains($f, 'COLD')) {
                $out[] = $nome;
            }
            if ($grupo === 'MP-LAM' && str_contains($f, 'LAMINA')) {
                $out[] = $nome;
            }
        }

        return $out;
    }

    /**
     * @param  list<string>  $nomes
     */
    private function melhor(array $nomes, string $descricao): ?string
    {
        $hay = $this->tokens($descricao);
        $best = null;
        $bestScore = -1;
        foreach ($nomes as $nome) {
            $score = 0;
            $miss = false;
            foreach ($this->tokens($nome) as $t) {
                if (in_array($t, ['STAMP', 'LAMINACAO', 'COLD'], true)) {
                    continue;
                }
                if (in_array($t, $hay, true)) {
                    $score += 10 + strlen($t);
                } else {
                    $miss = true;
                }
            }
            if ($miss) {
                continue;
            }
            $score += mb_strlen($this->fold($nome));
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $nome;
            }
        }

        return $best;
    }

    /**
     * @return list<string>
     */
    private function tokens(string $text): array
    {
        $parts = preg_split('/[^A-Z0-9]+/', $this->fold($text)) ?: [];
        $out = [];
        foreach ($parts as $p) {
            if ($p === '' || strlen($p) < 2) {
                continue;
            }
            $out[$p] = $p;
        }

        return array_values($out);
    }

    private function fold(string $text): string
    {
        $t = mb_strtoupper(trim($text), 'UTF-8');

        return strtr($t, [
            'Á' => 'A', 'À' => 'A', 'Â' => 'A', 'Ã' => 'A',
            'É' => 'E', 'Ê' => 'E',
            'Í' => 'I',
            'Ó' => 'O', 'Ô' => 'O', 'Õ' => 'O',
            'Ú' => 'U',
            'Ç' => 'C',
        ]);
    }
}
