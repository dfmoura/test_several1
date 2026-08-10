<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\Produto;
use App\Models\ProdutoGrupo;
use Illuminate\Support\Str;

/**
 * Sugere descrição fiscal (NF-e/SPED) e comercial (catálogo/operação)
 * a partir do grupo canônico + texto livre opcional.
 *
 * Domínio (trigger/32): fiscal curta e estável; comercial mais rica;
 * marca/apelido não substitui descrição; PA = poucas famílias fiscais.
 * Nunca altera NCM/CFOP/código — só textos. Origem v1 = regra (sem IA).
 */
class ProdutoDescricaoSugeridor
{
    private const MAX_LEN = 255;

    private const SIMILARIDADE_MIN = 62.0;

    private const SIMILARES_LIMITE = 5;

    /** Apelidos / lixo que o estudo manda higienizar. */
    private const BLOQUEIOS = [
        'ruim',
        'lixo',
        'teste',
        'xxx',
        '????',
        'pantone ????',
    ];

    /**
     * @param  array{
     *   grupo_id?: int|string|null,
     *   texto_livre?: ?string,
     *   largura_mm?: ?string,
     *   comprimento_m?: ?string,
     *   produto_id?: int|string|null
     * }  $input
     * @return array{
     *   descricao_fiscal: string,
     *   descricao_comercial: string,
     *   origem: string,
     *   racional: string,
     *   avisos: list<string>,
     *   similares: list<array{id: int, codigo: string, descricao_fiscal: string, similaridade: float}>
     * }
     */
    public function sugerir(Empresa $empresa, array $input): array
    {
        $grupoId = (int) ($input['grupo_id'] ?? 0);
        if ($grupoId <= 0) {
            throw new \InvalidArgumentException('Informe o grupo canônico do produto.');
        }

        $grupo = ProdutoGrupo::query()->find($grupoId);
        if (! $grupo) {
            throw new \InvalidArgumentException('Grupo de produto não encontrado.');
        }

        $texto = $this->limparTextoLivre((string) ($input['texto_livre'] ?? ''));
        $textoNorm = $this->norm($texto);
        $avisos = [];

        if ($texto !== '' && $this->contemBloqueio($textoNorm)) {
            $avisos[] = 'Texto livre contém termo inválido para cadastro (apelido/pejorativo). Removido da sugestão.';
            $texto = $this->removerBloqueios($texto);
            $textoNorm = $this->norm($texto);
        }

        $largura = $this->num($input['largura_mm'] ?? null);
        $comprimento = $this->num($input['comprimento_m'] ?? null);

        [$fiscal, $comercial, $racional, $extraAvisos] = $this->montarPorGrupo(
            $grupo,
            $texto,
            $textoNorm,
            $largura,
            $comprimento
        );
        $avisos = array_values(array_unique(array_merge($avisos, $extraAvisos)));

        $fiscal = $this->finalizar($fiscal, upper: true);
        $comercial = $this->finalizar($comercial, upper: false);

        if ($fiscal === '') {
            throw new \InvalidArgumentException('Não foi possível sugerir descrição fiscal para este grupo.');
        }

        if ($comercial === '') {
            $comercial = $this->finalizar($fiscal, upper: false);
        }

        $excluirId = isset($input['produto_id']) && $input['produto_id'] !== '' && $input['produto_id'] !== null
            ? (int) $input['produto_id']
            : null;

        $similares = $this->buscarSimilares($empresa, $grupo->id, $fiscal, $excluirId);
        if ($similares !== []) {
            $avisos[] = 'Há produto(s) parecido(s) no mesmo grupo — confira antes de criar duplicata.';
        }

        return [
            'descricao_fiscal' => $fiscal,
            'descricao_comercial' => $comercial,
            'origem' => 'regra',
            'racional' => $racional,
            'avisos' => $avisos,
            'similares' => $similares,
        ];
    }

    /**
     * @return array{0: string, 1: string, 2: string, 3: list<string>}
     */
    private function montarPorGrupo(
        ProdutoGrupo $grupo,
        string $texto,
        string $textoNorm,
        ?float $largura,
        ?float $comprimento
    ): array {
        $codigo = strtoupper((string) $grupo->codigo);
        $avisos = [];

        return match (true) {
            $codigo === 'PA-ETQ' => $this->paEtq($texto, $textoNorm, $avisos),
            $codigo === 'PA-BOB' => $this->paBob($texto, $textoNorm, $largura, $comprimento, $avisos),
            $codigo === 'MP-PAP' => $this->mpPap($texto, $textoNorm, $avisos),
            $codigo === 'MP-FLM' => $this->mpFlm($texto, $textoNorm, $largura, $avisos),
            $codigo === 'MP-TEC' => $this->mpTec($texto, $textoNorm, $avisos),
            $codigo === 'MP-LAM' => $this->genericoGrupo('FILME LAMINACAO', $texto, $textoNorm, 'Laminação — confirmar NCM na NF do fornecedor.', $avisos),
            $codigo === 'MP-CLD' => $this->genericoGrupo('FOLHA COLD / HOT STAMPING', $texto, $textoNorm, 'Cold/hot foil — origem frequentemente importada.', $avisos),
            $codigo === 'MP-TIN' => $this->mpTin($texto, $textoNorm, $avisos),
            $codigo === 'MP-ADF' => $this->genericoGrupo('FITA DUPLA FACE', $texto, $textoNorm, 'Dupla face produtiva — NCM conforme largura.', $avisos),
            $codigo === 'MP-RET' => $this->genericoGrupo('RETALHO / SOBRA DE BOBINA', $texto, $textoNorm, 'Retalho herda NCM do material de origem.', $avisos),
            $codigo === 'EMB-TUB' => $this->embTub($texto, $textoNorm, $avisos),
            $codigo === 'EMB-CX' => $this->genericoGrupo('CAIXA DE PAPELAO', $texto, $textoNorm, 'Embalagem de acondicionamento (SPED 02).', $avisos),
            $codigo === 'REV-RIB' => $this->revRib($texto, $textoNorm, $avisos),
            $codigo === 'SVC' => $this->svc($texto, $textoNorm, $avisos),
            $codigo === 'FAC' => $this->fac($texto, $textoNorm, $largura, $avisos),
            default => $this->fallbackGrupo($grupo, $texto, $textoNorm, $avisos),
        };
    }

    /**
     * @param  list<string>  $avisos
     * @return array{0: string, 1: string, 2: string, 3: list<string>}
     */
    private function paEtq(string $texto, string $textoNorm, array $avisos): array
    {
        $fiscal = 'ETIQUETAS';
        $linha = 'genérica';

        if ($this->hasAny($textoNorm, ['bopp', 'filme', 'plastico', 'polipropileno', 'metalizado'])) {
            $fiscal = 'ETIQUETAS BOPP';
            $linha = 'filme plástico (NCM tip. 3919.10.90)';
        } elseif ($this->hasAny($textoNorm, ['termico', 'thermal', 'direct thermal'])) {
            $fiscal = 'ETIQUETAS TERMICAS';
            $linha = 'papel térmico autoadesivo (NCM tip. 4811.41.90)';
        } elseif ($this->hasAny($textoNorm, ['textil', 'cetim', 'resinado', 'emborrachado', 'tecido'])) {
            $fiscal = 'ETIQUETAS TEXTEIS';
            $linha = 'têxtil — NCM de saída a confirmar com contador';
            $avisos[] = 'NCM de etiquetas têxteis ainda pendente no domínio — validar com o contador.';
        } elseif ($this->hasAny($textoNorm, ['tag', 'cartao', 'cartão'])) {
            $fiscal = 'TAG / CARTAO IMPRESSO';
            $linha = 'tag/cartão sem adesivo — NCM a confirmar';
        } elseif ($this->hasAny($textoNorm, ['couche', 'couché', 'papel', 'fosco', 'adesivo', 'autoadesivo'])) {
            $fiscal = 'ETIQUETAS PAPEL AUTOADESIVO';
            $linha = 'papel autoadesivo (NCM tip. 4811.41.90)';
        } elseif ($texto !== '') {
            // Texto sem keyword forte: fiscal permanece estável; detalhe vai ao comercial.
            $fiscal = 'ETIQUETAS';
            $linha = 'família fiscal genérica (refine com BOPP / papel / térmica no texto livre)';
            $avisos[] = 'Sem material claro no texto — fiscal genérico. Prefira indicar BOPP, papel ou térmica.';
        } else {
            $fiscal = 'ETIQUETAS PAPEL AUTOADESIVO';
            $linha = 'default go-live papel (alternar para BOPP no texto livre se for filme)';
        }

        $comercial = $texto !== ''
            ? $this->enriquecerComercial($fiscal, $texto)
            : $fiscal.' | {MATERIAL} | {MEDIDA} | {CORES} | {ACABAMENTO} | {ETIQ_POR_ROLO} etiq/rolo';

        if ($texto === '') {
            $avisos[] = 'Descrição comercial com placeholders para o futuro ORC/PED — edite se preferir texto curto agora.';
        }

        if ($this->temMarcaIsolada($textoNorm) && ! $this->hasAny($textoNorm, ['bopp', 'papel', 'termico', 'etiqueta'])) {
            $avisos[] = 'Marca sozinha não descreve o item — use material/tipo na fiscal (estudo 32).';
        }

        return [
            $fiscal,
            $comercial,
            "PA-ETQ: fiscal de família estável ({$linha}); detalhe comercial fora do SKU eterno.",
            $avisos,
        ];
    }

    /**
     * @param  list<string>  $avisos
     * @return array{0: string, 1: string, 2: string, 3: list<string>}
     */
    private function paBob(string $texto, string $textoNorm, ?float $largura, ?float $comprimento, array $avisos): array
    {
        $fiscal = 'BOBINA BOPP';
        if ($this->hasAny($textoNorm, ['papel', 'couche', 'termico'])) {
            $fiscal = 'BOBINA PAPEL AUTOADESIVO';
        }

        $comercial = $texto !== '' ? $this->enriquecerComercial($fiscal, $texto) : $fiscal;
        $comercial = $this->anexarDimensoes($comercial, $largura, $comprimento);

        if ($largura !== null && $largura <= 200) {
            $avisos[] = 'Largura ≤ 20 cm costuma ser etiqueta acabada (PA-ETQ), não bobina larga (PA-BOB).';
        }

        return [$fiscal, $comercial, 'PA-BOB: bobina/material faturado (> 20 cm tipicamente).', $avisos];
    }

    /**
     * @param  list<string>  $avisos
     * @return array{0: string, 1: string, 2: string, 3: list<string>}
     */
    private function mpPap(string $texto, string $textoNorm, array $avisos): array
    {
        if ($this->hasAny($textoNorm, ['tag', 'cartao'])) {
            $fiscal = 'PAPEL TAG / CARTAO';
        } elseif ($this->hasAny($textoNorm, ['termico', 'thermal'])) {
            $fiscal = 'PAPEL TERMICO AUTOADESIVO BOBINA';
        } elseif ($this->hasAny($textoNorm, ['fosco'])) {
            $fiscal = 'PAPEL FOSCO AUTOADESIVO BOBINA';
        } elseif ($this->hasAny($textoNorm, ['couche', 'couché'])) {
            $fiscal = 'PAPEL COUCHE AUTOADESIVO BOBINA';
        } else {
            $fiscal = 'PAPEL AUTOADESIVO BOBINA';
        }

        $comercial = $texto !== '' ? $this->enriquecerComercial($fiscal, $texto) : $fiscal;
        $marca = $this->extrairMarca($textoNorm);
        if ($marca !== null && ! str_contains($this->norm($comercial), $marca)) {
            $comercial = trim($comercial.' '.$this->prettyMarca($marca));
            $avisos[] = 'Marca encaminhada à descrição comercial (não substitui a fiscal).';
        }

        return [$fiscal, $comercial, 'MP-PAP: material de compra — fiscal genérica do substrato; marca no comercial.', $avisos];
    }

    /**
     * @param  list<string>  $avisos
     * @return array{0: string, 1: string, 2: string, 3: list<string>}
     */
    private function mpFlm(string $texto, string $textoNorm, ?float $largura, array $avisos): array
    {
        $acab = '';
        if ($this->hasAny($textoNorm, ['fosco'])) {
            $acab = ' FOSCO';
        } elseif ($this->hasAny($textoNorm, ['brilho', 'brilhante'])) {
            $acab = ' BRILHO';
        } elseif ($this->hasAny($textoNorm, ['transp', 'transparente'])) {
            $acab = ' TRANSPARENTE';
        } elseif ($this->hasAny($textoNorm, ['metalizado'])) {
            $acab = ' METALIZADO';
        }

        $fiscal = 'FILME BOPP AUTOADESIVO'.$acab.' BOBINA';
        $comercial = $texto !== '' ? $this->enriquecerComercial($fiscal, $texto) : $fiscal;
        if ($largura !== null) {
            $comercial = $this->anexarDimensoes($comercial, $largura, null);
        }

        return [$fiscal, $comercial, 'MP-FLM: filme BOPP de compra; marca no comercial se informada.', $avisos];
    }

    /**
     * @param  list<string>  $avisos
     * @return array{0: string, 1: string, 2: string, 3: list<string>}
     */
    private function mpTec(string $texto, string $textoNorm, array $avisos): array
    {
        $fiscal = 'TECIDO PARA ETIQUETA TEXTIL';
        if ($this->hasAny($textoNorm, ['cetim'])) {
            $fiscal = 'TECIDO CETIM PARA ETIQUETA';
        } elseif ($this->hasAny($textoNorm, ['resinado'])) {
            $fiscal = 'TECIDO RESINADO PARA ETIQUETA';
        } elseif ($this->hasAny($textoNorm, ['emborrachado'])) {
            $fiscal = 'TECIDO EMBORRACHADO PARA ETIQUETA';
        }

        $avisos[] = 'NCM de MP-TEC a confirmar na NF do fornecedor — não inventar.';
        $comercial = $texto !== '' ? $this->enriquecerComercial($fiscal, $texto) : $fiscal;

        return [$fiscal, $comercial, 'MP-TEC: tecido — classificação fiscal pendente no domínio.', $avisos];
    }

    /**
     * @param  list<string>  $avisos
     * @return array{0: string, 1: string, 2: string, 3: list<string>}
     */
    private function mpTin(string $texto, string $textoNorm, array $avisos): array
    {
        if ($this->hasAny($textoNorm, ['verniz'])) {
            $fiscal = 'VERNIZ PARA IMPRESSAO';
            $avisos[] = 'Verniz não é NCM 3215 — classificar pela NF/FISPQ.';
        } elseif ($this->hasAny($textoNorm, ['diluente'])) {
            $fiscal = 'DILUENTE';
        } elseif ($this->hasAny($textoNorm, ['preta', 'preto', 'black'])) {
            $fiscal = 'TINTA PRETA PARA IMPRESSAO';
        } else {
            $fiscal = 'TINTA PARA IMPRESSAO';
        }

        $comercial = $texto !== '' ? $this->enriquecerComercial($fiscal, $texto) : $fiscal;

        return [$fiscal, $comercial, 'MP-TIN: tinta/verniz — cuidado com NCM (pretas vs demais vs verniz).', $avisos];
    }

    /**
     * @param  list<string>  $avisos
     * @return array{0: string, 1: string, 2: string, 3: list<string>}
     */
    private function embTub(string $texto, string $textoNorm, array $avisos): array
    {
        $fiscal = 'TUBETE';
        if (preg_match('/\b(\d{1,3})\s*(mm|pol|")?\b/u', $textoNorm, $m)) {
            $fiscal = 'TUBETE '.$m[1].(isset($m[2]) && $m[2] !== '' ? ' '.strtoupper($m[2] === '"' ? 'POL' : $m[2]) : ' MM');
        }

        $comercial = $texto !== '' ? $this->enriquecerComercial($fiscal, $texto) : $fiscal;

        return [$fiscal, $comercial, 'EMB-TUB: núcleo da bobina (SPED 02).', $avisos];
    }

    /**
     * @param  list<string>  $avisos
     * @return array{0: string, 1: string, 2: string, 3: list<string>}
     */
    private function revRib(string $texto, string $textoNorm, array $avisos): array
    {
        $tipo = 'CERA';
        if ($this->hasAny($textoNorm, ['resina', 'resin'])) {
            $tipo = 'RESINA';
        } elseif ($this->hasAny($textoNorm, ['mista', 'wax/resin', 'cera/resina', 'wax resin'])) {
            $tipo = 'CERA/RESINA';
        }

        $dim = null;
        if (preg_match('/(\d{2,4})\s*[x×]\s*(\d{2,4})/u', $textoNorm, $m)) {
            $dim = $m[1].'x'.$m[2];
        }

        $fiscal = 'RIBBON '.$tipo.($dim ? ' '.$dim : '');
        $comercial = $texto !== '' ? $this->enriquecerComercial($fiscal, $texto) : $fiscal;

        // Em ribbon, marca do fabricante é usual no mercado — pode ir no comercial.
        $marca = $this->extrairMarca($textoNorm);
        if ($marca !== null && ! str_contains($this->norm($comercial), $marca)) {
            $comercial = trim($comercial.' '.$this->prettyMarca($marca));
        }

        return [$fiscal, $comercial, 'REV-RIB: mesmo SKU compra/venda; tipo + medida na fiscal.', $avisos];
    }

    /**
     * @param  list<string>  $avisos
     * @return array{0: string, 1: string, 2: string, 3: list<string>}
     */
    private function svc(string $texto, string $textoNorm, array $avisos): array
    {
        if ($this->hasAny($textoNorm, ['rebobin'])) {
            $fiscal = 'REBOBINACAO DE BOBINA';
        } elseif ($this->hasAny($textoNorm, ['acerto'])) {
            $fiscal = 'ACERTO DE BOBINA';
        } elseif ($this->hasAny($textoNorm, ['corte'])) {
            $fiscal = 'SERVICO DE CORTE';
        } else {
            $fiscal = 'REBOBINACAO / ACERTO DE BOBINA';
        }

        $avisos[] = 'SVC: confirmar com contador NF-e vs NFS-e antes de emissão automática.';
        $comercial = $texto !== '' ? $this->enriquecerComercial($fiscal, $texto) : $fiscal;

        return [$fiscal, $comercial, 'SVC: serviço avulso — fiscal estável; detalhe no comercial.', $avisos];
    }

    /**
     * @param  list<string>  $avisos
     * @return array{0: string, 1: string, 2: string, 3: list<string>}
     */
    private function fac(string $texto, string $textoNorm, ?float $largura, array $avisos): array
    {
        $fiscal = 'FACA / MATRIZ';
        if (preg_match('/(\d{2,4})\s*[x×]\s*(\d{2,4})/u', $textoNorm, $m)) {
            $fiscal = 'FACA '.$m[1].'x'.$m[2].' MM';
        } elseif ($largura !== null) {
            $fiscal = 'FACA '.rtrim(rtrim(number_format($largura, 2, ',', ''), '0'), ',').' MM';
        }

        $comercial = $texto !== '' ? $this->enriquecerComercial($fiscal, $texto) : $fiscal;
        $avisos[] = 'FAC é ferramental (1º pedido) — não transformar em SKU de etiqueta recorrente.';

        return [$fiscal, $comercial, 'FAC: ferramental reutilizável.', $avisos];
    }

    /**
     * @param  list<string>  $avisos
     * @return array{0: string, 1: string, 2: string, 3: list<string>}
     */
    private function genericoGrupo(
        string $fiscalBase,
        string $texto,
        string $textoNorm,
        string $racional,
        array $avisos
    ): array {
        $comercial = $texto !== '' ? $this->enriquecerComercial($fiscalBase, $texto) : $fiscalBase;

        return [$fiscalBase, $comercial, $racional, $avisos];
    }

    /**
     * @param  list<string>  $avisos
     * @return array{0: string, 1: string, 2: string, 3: list<string>}
     */
    private function fallbackGrupo(ProdutoGrupo $grupo, string $texto, string $textoNorm, array $avisos): array
    {
        $base = mb_strtoupper(Str::ascii((string) $grupo->nome), 'UTF-8');
        $base = trim(preg_replace('/\s+/', ' ', $base) ?? $base);
        $comercial = $texto !== '' ? $this->enriquecerComercial($base, $texto) : $base;

        return [$base, $comercial, 'Sugestão a partir do nome do grupo '.$grupo->codigo.'.', $avisos];
    }

    private function enriquecerComercial(string $fiscal, string $texto): string
    {
        $t = trim(preg_replace('/\s+/', ' ', $texto) ?? $texto);
        if ($t === '') {
            return $fiscal;
        }

        $normFiscal = $this->norm($fiscal);
        $normTexto = $this->norm($t);
        if ($normTexto === $normFiscal || str_starts_with($normTexto, $normFiscal)) {
            return $t;
        }

        // Evita "ETIQUETAS BOPP ETIQUETAS BOPP fosco"
        if (str_contains($normTexto, $normFiscal)) {
            return $t;
        }

        return trim($fiscal.' — '.$t);
    }

    private function anexarDimensoes(string $desc, ?float $largura, ?float $comprimento): string
    {
        $parts = [];
        if ($largura !== null) {
            $parts[] = $this->fmtNum($largura).' mm';
        }
        if ($comprimento !== null) {
            $parts[] = $this->fmtNum($comprimento).' m';
        }
        if ($parts === []) {
            return $desc;
        }
        $sufixo = implode(' x ', $parts);
        if (str_contains($this->norm($desc), $this->norm($sufixo))) {
            return $desc;
        }

        return trim($desc.' '.$sufixo);
    }

    private function finalizar(string $texto, bool $upper): string
    {
        $t = trim(preg_replace('/\s+/u', ' ', $texto) ?? $texto);
        $t = trim($t, " \t\n\r\0\x0B-|");
        if ($upper) {
            $t = mb_strtoupper($t, 'UTF-8');
            // Dimensões no padrão do cadastro RLP: 110x300 (x minúsculo).
            $t = preg_replace('/(\d)X(\d)/u', '$1x$2', $t) ?? $t;
        }
        if (mb_strlen($t) > self::MAX_LEN) {
            $t = mb_substr($t, 0, self::MAX_LEN);
        }

        return $t;
    }

    private function limparTextoLivre(string $texto): string
    {
        $t = trim(preg_replace('/\s+/u', ' ', $texto) ?? $texto);
        if (mb_strlen($t) > 500) {
            $t = mb_substr($t, 0, 500);
        }

        return $t;
    }

    private function norm(string $s): string
    {
        return mb_strtolower(Str::ascii($s), 'UTF-8');
    }

    /** @param  list<string>  $needles */
    private function hasAny(string $haystackNorm, array $needles): bool
    {
        foreach ($needles as $n) {
            if ($n !== '' && str_contains($haystackNorm, $this->norm($n))) {
                return true;
            }
        }

        return false;
    }

    private function contemBloqueio(string $textoNorm): bool
    {
        foreach (self::BLOQUEIOS as $b) {
            if (str_contains($textoNorm, $b)) {
                return true;
            }
        }

        return false;
    }

    private function removerBloqueios(string $texto): string
    {
        $t = $texto;
        foreach (self::BLOQUEIOS as $b) {
            $t = preg_replace('/'.preg_quote($b, '/').'/iu', ' ', $t) ?? $t;
        }

        return trim(preg_replace('/\s+/u', ' ', $t) ?? $t);
    }

    private function temMarcaIsolada(string $textoNorm): bool
    {
        return $this->extrairMarca($textoNorm) !== null
            && ! $this->hasAny($textoNorm, ['bopp', 'papel', 'couche', 'termico', 'ribbon', 'etiqueta', 'filme', 'tinta']);
    }

    private function extrairMarca(string $textoNorm): ?string
    {
        $marcas = [
            'fasson', 'colacril', 'vertex', 'ritrama', 'todaytec', 'armorkote',
            'upm', 'avery', 'lintec', 'fever',
        ];
        foreach ($marcas as $m) {
            if (str_contains($textoNorm, $m)) {
                return $m;
            }
        }

        return null;
    }

    private function prettyMarca(string $marcaNorm): string
    {
        return match ($marcaNorm) {
            'fasson' => 'Fasson',
            'colacril' => 'Colacril',
            'vertex' => 'Vertex',
            'ritrama' => 'Ritrama',
            'todaytec' => 'Todaytec',
            'armorkote' => 'ArmorKote',
            'upm' => 'UPM',
            'avery' => 'Avery',
            'lintec' => 'Lintec',
            default => ucfirst($marcaNorm),
        };
    }

    private function num(mixed $v): ?float
    {
        if ($v === null || $v === '') {
            return null;
        }
        if (is_numeric($v)) {
            return (float) $v;
        }
        $s = str_replace([' ', ','], ['', '.'], (string) $v);
        if (! is_numeric($s)) {
            return null;
        }

        return (float) $s;
    }

    private function fmtNum(float $n): string
    {
        if (abs($n - round($n)) < 0.00001) {
            return (string) (int) round($n);
        }

        return rtrim(rtrim(number_format($n, 2, ',', ''), '0'), ',');
    }

    /**
     * @return list<array{id: int, codigo: string, descricao_fiscal: string, similaridade: float}>
     */
    private function buscarSimilares(Empresa $empresa, int $grupoId, string $fiscal, ?int $excluirId): array
    {
        $query = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('grupo_id', $grupoId)
            ->where('situacao', '!=', 'INATIVO')
            ->orderByDesc('id')
            ->limit(80);

        if ($excluirId) {
            $query->where('id', '!=', $excluirId);
        }

        $candidatos = $query->get(['id', 'codigo', 'descricao_fiscal']);
        $out = [];
        $alvo = $this->norm($fiscal);

        foreach ($candidatos as $p) {
            $outro = $this->norm((string) $p->descricao_fiscal);
            if ($outro === '') {
                continue;
            }
            similar_text($alvo, $outro, $pct);
            if ($pct < self::SIMILARIDADE_MIN) {
                continue;
            }
            $out[] = [
                'id' => (int) $p->id,
                'codigo' => (string) $p->codigo,
                'descricao_fiscal' => (string) $p->descricao_fiscal,
                'similaridade' => round($pct, 1),
            ];
        }

        usort($out, fn ($a, $b) => $b['similaridade'] <=> $a['similaridade']);

        return array_slice($out, 0, self::SIMILARES_LIMITE);
    }
}
