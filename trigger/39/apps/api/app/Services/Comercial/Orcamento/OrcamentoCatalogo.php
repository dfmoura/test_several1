<?php

namespace App\Services\Comercial\Orcamento;

/**
 * Catálogo de preços do motor ORC — port fiel de trigger/36 catalog.py.
 */
final class OrcamentoCatalogo
{
    /** @var list<string> */
    public const MAQUINAS_CANONICAS = ['BETA', '160', '250', 'ETIRAMA', 'BATIDA', 'MODULAR'];

    /** @var array<string, string> */
    public const MAQUINA_ALIASES_DEFAULT = [
        'BETA / 160  / 250 / ETIRAMA' => 'BETA',
        'BETA / 160 / 250 / ETIRAMA' => 'BETA',
        'BETAFLEX' => 'BETA',
        'REFLEXO' => '160',
        'REFLEXO 160' => '160',
        'REFLEXO 250' => '250',
        'MODULAR SPX' => 'MODULAR',
    ];

    /** @var array<string, int> */
    private const ROLOS_POR_CAIXA_DEFAULT = [
        '1"' => 20,
        '3"' => 12,
    ];

    /** @var array<string, array{caixa_id: ?int, medida: ?string}> */
    private const CAIXA_PADRAO_DEFAULT = [
        '1"' => ['caixa_id' => 2, 'medida' => '250x200x200'],
        '3"' => ['caixa_id' => 6, 'medida' => '500x300x300'],
    ];

    /** @param array<string, float> $papel */
    public function __construct(
        public array $papel = [],
        public float $tintaFaixaM2 = 30.0,
        public float $tintaAte30PorCor = 10.0,
        public float $tintaAcimaM2 = 0.4,
        /** @var array<string, float> */
        public array $acabamentos = [],
        /** @var array<string, float> */
        public array $perdaAcabamento = [],
        /** @var array<string, float> */
        public array $perdaPapelAcertoMl = [],
        /** @var array<string, float> */
        public array $perdaPapel03 = [],
        public float $perdaPapelF6 = 180.0,
        /** @var array<string, float> */
        public array $tubete = [],
        /** @var array<string, float> */
        public array $horaParadaH = [],
        /** @var array<string, array<string, float>> */
        public array $horaMaquina = [],
        /** @var list<string> */
        public array $maquinas = [],
        /** @var list<string> */
        public array $maquinasRodaServico = [],
        /** @var array<string, string> */
        public array $maquinaAliases = [],
        public float $matrizCm2 = 0.28,
        public float $precoCaixa = 7.0,
        public float $setupHoras = 1.0,
        public float $limiteMetragemBobina = 1000.0,
        public float $ceilingEtiqueta = 10.0,
        /** @var array<string, array<string, mixed>> */
        public array $caixaEmpacotamento = [],
        public string $rebobinacaoNome = 'REBOBINAÇÃO',
    ) {
        if ($this->maquinas === []) {
            $this->maquinas = self::MAQUINAS_CANONICAS;
        }
        if ($this->maquinasRodaServico === []) {
            $this->maquinasRodaServico = self::MAQUINAS_CANONICAS;
        }
        if ($this->maquinaAliases === []) {
            $this->maquinaAliases = self::MAQUINA_ALIASES_DEFAULT;
        }
    }

    public static function load(?string $path = null): self
    {
        $path ??= resource_path('data/orcamento/catalog_oficial.json');
        $raw = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

        $tinta = is_array($raw['tinta'] ?? null) ? $raw['tinta'] : [];
        $perda03 = [];
        foreach ($raw['perda_papel_0_3'] ?? [] as $k => $v) {
            $perda03[(string) $k] = (float) $v;
        }

        $papel = [];
        foreach ($raw['papel'] as $k => $v) {
            $papel[self::norm((string) $k)] = (float) $v;
        }

        $acabamentos = [];
        foreach ($raw['acabamentos'] as $k => $v) {
            $acabamentos[self::norm((string) $k)] = (float) $v;
        }

        $perdaAcab = [];
        foreach ($raw['perda_acabamento'] as $k => $v) {
            $perdaAcab[self::norm((string) $k)] = (float) $v;
        }

        $tubete = [];
        foreach ($raw['tubete'] as $k => $v) {
            $tubete[self::norm((string) $k)] = (float) $v;
        }

        $horaParada = [];
        foreach ($raw['hora_parada_h'] ?? [] as $k => $v) {
            $horaParada[self::norm((string) $k)] = (float) $v;
        }

        $horaMaquina = [];
        foreach ($raw['hora_maquina'] as $m => $rates) {
            $bloco = [];
            foreach ($rates as $c => $t) {
                $bloco[(string) $c] = (float) $t;
            }
            $horaMaquina[self::norm((string) $m)] = $bloco;
        }

        $aliases = array_merge(
            self::MAQUINA_ALIASES_DEFAULT,
            is_array($raw['maquina_aliases'] ?? null) ? $raw['maquina_aliases'] : [],
            is_array($raw['maquina_origem_mapa'] ?? null) ? $raw['maquina_origem_mapa'] : [],
        );
        $maquinaAliases = [];
        foreach ($aliases as $k => $v) {
            $maquinaAliases[self::norm((string) $k)] = trim((string) $v);
        }

        $caixaEmp = [];
        foreach ($raw['caixa_empacotamento'] ?? [] as $k => $v) {
            $caixaEmp[self::norm((string) $k)] = is_array($v) ? $v : [];
        }

        $maquinasRaw = $raw['maquinas'] ?? $raw['maquinas_roda_servico'] ?? self::MAQUINAS_CANONICAS;

        return new self(
            papel: $papel,
            tintaFaixaM2: (float) ($tinta['faixa_m2'] ?? $raw['tinta_faixa_m2'] ?? 30),
            tintaAte30PorCor: (float) ($tinta['valor_ate_30_por_cor'] ?? $raw['tinta_ate_30_por_cor'] ?? 10),
            tintaAcimaM2: (float) ($tinta['valor_acima_m2'] ?? $raw['tinta_acima_m2'] ?? 0.4),
            acabamentos: $acabamentos,
            perdaAcabamento: $perdaAcab,
            perdaPapelAcertoMl: self::loadCoresMl($raw['perda_papel_acerto_ml'] ?? []),
            perdaPapel03: $perda03,
            perdaPapelF6: (float) ($raw['perda_papel_f6'] ?? 180),
            tubete: $tubete,
            horaParadaH: $horaParada,
            horaMaquina: $horaMaquina,
            maquinas: array_map(static fn ($x) => trim((string) $x), $maquinasRaw),
            maquinasRodaServico: array_map(
                static fn ($x) => trim((string) $x),
                $raw['maquinas_roda_servico'] ?? self::MAQUINAS_CANONICAS
            ),
            maquinaAliases: $maquinaAliases,
            matrizCm2: (float) ($raw['matriz_cm2'] ?? 0.28),
            precoCaixa: (float) ($raw['preco_caixa'] ?? 7),
            setupHoras: (float) ($raw['setup_horas'] ?? 1),
            limiteMetragemBobina: (float) ($raw['limite_metragem_bobina'] ?? 1000),
            ceilingEtiqueta: (float) ($raw['ceiling_etiqueta'] ?? 10),
            caixaEmpacotamento: $caixaEmp,
        );
    }

    /**
     * @param  array<string, mixed>|null  $overrides
     */
    public function withOverrides(?array $overrides): self
    {
        $cat = clone $this;
        // Clone é shallow — copiar arrays mutáveis.
        $cat->papel = $this->papel;
        $cat->acabamentos = $this->acabamentos;

        if (! $overrides) {
            return $cat;
        }

        if (isset($overrides['papel']) && is_array($overrides['papel'])) {
            $cat->papel = $this->papel;
            foreach ($overrides['papel'] as $k => $v) {
                if ($v !== null) {
                    $cat->papel[self::norm((string) $k)] = (float) $v;
                }
            }
        }
        if (array_key_exists('tinta_acima_m2', $overrides) && $overrides['tinta_acima_m2'] !== null) {
            $cat->tintaAcimaM2 = (float) $overrides['tinta_acima_m2'];
        }
        if (array_key_exists('preco_caixa', $overrides) && $overrides['preco_caixa'] !== null) {
            $cat->precoCaixa = (float) $overrides['preco_caixa'];
        }
        if (array_key_exists('matriz_cm2', $overrides) && $overrides['matriz_cm2'] !== null) {
            $cat->matrizCm2 = (float) $overrides['matriz_cm2'];
        }
        if (isset($overrides['acabamentos']) && is_array($overrides['acabamentos'])) {
            $cat->acabamentos = $this->acabamentos;
            foreach ($overrides['acabamentos'] as $k => $v) {
                if ($v !== null) {
                    $cat->acabamentos[self::norm((string) $k)] = (float) $v;
                }
            }
        }

        return $cat;
    }

    public function precoPapel(string $nome): float
    {
        return (float) $this->lookup($this->papel, $nome);
    }

    public function precoAcabamento(string $nome): float
    {
        return (float) $this->lookup($this->acabamentos, $nome);
    }

    public function perdaAcab(string $nome): float
    {
        return (float) $this->lookup($this->perdaAcabamento, $nome);
    }

    public function perdaPapelAcertoMetros(mixed $cores): float
    {
        if ($cores === null) {
            return 0.0;
        }
        if (is_string($cores)) {
            $k = strtoupper(trim($cores));
        } elseif (is_float($cores) && $cores == (int) $cores) {
            $k = (string) (int) $cores;
        } else {
            $k = trim((string) $cores);
        }
        if (in_array($k, ['0', '0.0', ''], true)) {
            return 0.0;
        }
        if (! array_key_exists($k, $this->perdaPapelAcertoMl)) {
            throw new \InvalidArgumentException("Cores sem PERDA DE PAPEL ACERTO: {$k}");
        }

        return (float) $this->perdaPapelAcertoMl[$k];
    }

    public function precoTubete(string $tamanho): float
    {
        $t = self::norm($tamanho);
        if (in_array($t, ['1" 1/2', '1"1/2', '1.5"'], true)) {
            $t = '1"';
        }

        return (float) $this->lookup($this->tubete, $t);
    }

    public function horaParada(string $tipo): float
    {
        if ($tipo === '') {
            return 0.0;
        }

        return (float) $this->lookup($this->horaParadaH, $tipo);
    }

    public function taxaHoraMaquina(string $maquina, mixed $cores): float
    {
        $bloco = $this->lookupMaquina($maquina);
        $key = trim((string) $cores);
        if (! array_key_exists($key, $bloco)) {
            if (is_numeric($key)) {
                $key = (string) (int) (float) $key;
            }
        }
        if (! array_key_exists($key, $bloco)) {
            throw new \InvalidArgumentException("cores={$key} não encontrado em HORA MÁQUINA para {$maquina}");
        }

        return (float) $bloco[$key];
    }

    /** @return array<string, mixed> */
    public function empacotamentoTubete(string $tubete): array
    {
        $t = self::normTubete($tubete);
        $emp = $this->caixaEmpacotamento[$t] ?? $this->caixaEmpacotamento[self::norm($tubete)] ?? null;
        if (is_array($emp)) {
            return $emp;
        }
        $padrao = self::CAIXA_PADRAO_DEFAULT[$t] ?? ['caixa_id' => null, 'medida' => null];

        return [
            'caixa_id' => $padrao['caixa_id'],
            'medida' => $padrao['medida'],
            'rolos_por_caixa' => self::ROLOS_POR_CAIXA_DEFAULT[$t] ?? 12,
        ];
    }

    public function rolosPorCaixa(string $tubete): int
    {
        $emp = $this->empacotamentoTubete($tubete);
        $cap = (int) ($emp['rolos_por_caixa'] ?? self::ROLOS_POR_CAIXA_DEFAULT[self::normTubete($tubete)] ?? 12);
        if ($cap <= 0) {
            throw new \InvalidArgumentException("rolos_por_caixa inválido para tubete {$tubete}");
        }

        return $cap;
    }

    public function medidaCaixaPreferida(string $tubete): ?string
    {
        $med = $this->empacotamentoTubete($tubete)['medida'] ?? null;

        return $med !== null && $med !== '' ? (string) $med : null;
    }

    public function qtdeCaixas(string $tubete, float $rolos): int
    {
        if ($rolos <= 0) {
            return 0;
        }
        $cap = $this->rolosPorCaixa($tubete);

        return (int) ceil($rolos / $cap);
    }

    public function precoRebobinacao(): float
    {
        return (float) $this->lookup($this->acabamentos, $this->rebobinacaoNome);
    }

    public function normalizarMaquina(string $maquina): string
    {
        $n = self::norm($maquina);
        if ($n === '') {
            throw new \InvalidArgumentException('Máquina vazia');
        }
        if (array_key_exists($n, $this->horaMaquina)) {
            return $n;
        }
        foreach ($this->horaMaquina as $k => $_) {
            if (strcasecmp(self::norm($k), $n) === 0) {
                return $k;
            }
        }
        foreach ($this->maquinaAliases as $alias => $canon) {
            if (strcasecmp(self::norm($alias), $n) === 0) {
                return $canon;
            }
        }
        $nu = strtoupper($n);
        if (isset($this->maquinaAliases[$nu])) {
            return $this->maquinaAliases[$nu];
        }
        if (str_contains($nu, 'MODULAR')) {
            return 'MODULAR';
        }
        if (str_contains($nu, 'BATIDA')) {
            return 'BATIDA';
        }
        if (str_contains($nu, 'ETIRAMA') || $nu === 'ETI') {
            return 'ETIRAMA';
        }
        if (str_contains($nu, 'BETAFLEX') || $nu === 'BETA') {
            return 'BETA';
        }
        if (str_contains($nu, '250')) {
            return '250';
        }
        if (str_contains($nu, '160') || $nu === 'REFLEXO') {
            return '160';
        }
        throw new \InvalidArgumentException("Máquina não encontrada: {$maquina}");
    }

    /** @return array{papeis: list<string>, acabamentos: list<string>, tubetes: list<string>, maquinas: list<string>, maquinas_roda_servico: list<string>, tipos_troca_produto: list<string>, imposto_pct_default: float} */
    public function metaForUi(): array
    {
        return [
            'papeis' => array_keys($this->papel),
            'acabamentos' => array_values(array_filter(
                array_keys($this->acabamentos),
                fn (string $k) => $k !== $this->rebobinacaoNome
            )),
            'tubetes' => array_keys($this->tubete),
            'maquinas' => $this->maquinas,
            'maquinas_roda_servico' => $this->maquinasRodaServico,
            'tipos_troca_produto' => array_keys($this->horaParadaH),
            'imposto_pct_default' => 16.0,
        ];
    }

    public static function norm(string $s): string
    {
        return preg_replace('/\s+/u', ' ', trim($s)) ?? trim($s);
    }

    public static function normTubete(string $tubete): string
    {
        $t = self::norm($tubete);
        if (in_array($t, ['1" 1/2', '1"1/2'], true)) {
            return '1"';
        }

        return $t;
    }

    /**
     * @param  array<string|int, mixed>  $raw
     * @return array<string, float>
     */
    private static function loadCoresMl(array $raw): array
    {
        $out = [];
        foreach ($raw as $k => $v) {
            $key = strtoupper(trim((string) $k));
            if ($key !== '4V') {
                if (is_numeric($key)) {
                    $key = (string) (int) (float) $key;
                }
            }
            $out[$key] = (float) $v;
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $table
     */
    private function lookup(array $table, string $nome): mixed
    {
        $n = self::norm($nome);
        if (array_key_exists($n, $table)) {
            return $table[$n];
        }
        foreach ($table as $k => $v) {
            if (strcasecmp(self::norm((string) $k), $n) === 0) {
                return $v;
            }
        }
        throw new \InvalidArgumentException("Não encontrado no catálogo: {$nome}");
    }

    /** @return array<string, float> */
    private function lookupMaquina(string $maquina): array
    {
        $key = $this->normalizarMaquina($maquina);
        if (! array_key_exists($key, $this->horaMaquina)) {
            throw new \InvalidArgumentException("Máquina sem tabela HORA MÁQUINA: {$maquina} → {$key}");
        }

        return $this->horaMaquina[$key];
    }
}
