<?php

namespace App\Services\Comercial\Orcamento;

use App\Models\OrcCatalogoAcabamento;
use App\Models\OrcCatalogoEstrutura;
use App\Models\OrcCatalogoMaquina;
use App\Models\OrcCatalogoPapel;
use App\Models\OrcCatalogoParametro;
use App\Models\OrcCatalogoTipoTroca;
use App\Support\CatalogoOrcEmpresa;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo de preços do motor ORC — port fiel de trigger/36 catalog.py.
 *
 * Fonte híbrida (estudo 32 / ADR_ORC_MOTOR_REGRAS): bases editáveis (papel,
 * acabamento, tipo troca, máquina G10) + escalares do motor (matriz, setup,
 * perdas, tinta, tubete…) vêm do banco quando populados; demais parâmetros e
 * fallback continuam em catalog_oficial.json.
 * Lookup inclui inativos (ORCs antigos); metaForUi só lista ativos.
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

    /** @var list<string>|null */
    private ?array $papeisAtivosUi = null;

    /** @var list<string>|null */
    private ?array $acabamentosAtivosUi = null;

    /** @var list<string>|null */
    private ?array $tiposTrocaAtivosUi = null;

    /** @var list<string>|null */
    private ?array $maquinasAtivasUi = null;

    /** @param array<string, float> $papel */
    public function __construct(
        public array $papel = [],
        public float $tintaFaixaM2 = 30.0,
        public float $tintaAte30PorCor = 10.0,
        public float $tintaAcimaM2 = 0.4,
        /**
         * Matriz TINTA (2) — rv4: faixa MTS × coluna de cor → R$/m².
         *
         * @var array{thresholds: list<float>, rates: array<string, list<float>>}|null
         */
        public ?array $tintaMatriz = null,
        /** @var array<string, float> fator m² (PERDA DE ACERTO col E) × larg/100 × modelos */
        public array $perdaTrocaM2Fator = [],
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
        public float $minutosTrocaBobina = 5.0,
        public float $ceilingEtiqueta = 10.0,
        /** Metros de acerto por faixa de cores (≥4V). */
        public float $perdaAcertoM4v = 250.0,
        public float $perdaAcertoM5 = 250.0,
        public float $perdaAcertoM6 = 260.0,
        public float $perdaAcertoM7 = 270.0,
        public float $perdaAcertoM8 = 280.0,
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

    public static function load(?string $path = null, ?int $empresaId = null): self
    {
        $cat = self::loadFromJson($path);

        return self::overlayFromDatabase($cat, $empresaId ?? CatalogoOrcEmpresa::id());
    }

    public static function loadFromJson(?string $path = null): self
    {
        $path ??= resource_path('data/orcamento/catalog_oficial.json');
        $raw = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

        $tinta = is_array($raw['tinta'] ?? null) ? $raw['tinta'] : [];
        $perda03 = [];
        foreach ($raw['perda_papel_0_3'] ?? [] as $k => $v) {
            $perda03[(string) $k] = (float) $v;
        }

        $perdaTroca = [];
        foreach ($raw['perda_troca_m2_fator'] ?? [] as $k => $v) {
            $perdaTroca[self::loadCoresKey((string) $k)] = (float) $v;
        }
        if ($perdaTroca === [] && is_array($raw['perda_papel_acerto_ml'] ?? null)) {
            foreach ($raw['perda_papel_acerto_ml'] as $k => $ml) {
                $key = self::loadCoresKey((string) $k);
                $perdaTroca[$key] = (float) $ml * 0.085;
            }
        }

        $tintaMatriz = null;
        if (is_array($raw['tinta_matriz'] ?? null)) {
            $tm = $raw['tinta_matriz'];
            $thresholds = array_map(static fn ($x) => (float) $x, $tm['thresholds'] ?? []);
            $rates = [];
            foreach ($tm['rates'] ?? [] as $col => $vals) {
                $rates[(string) $col] = array_map(static fn ($x) => (float) $x, $vals);
            }
            if ($thresholds !== [] && $rates !== []) {
                $tintaMatriz = ['thresholds' => $thresholds, 'rates' => $rates];
            }
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
            tintaMatriz: $tintaMatriz,
            perdaTrocaM2Fator: $perdaTroca,
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
            minutosTrocaBobina: (float) ($raw['minutos_troca_bobina'] ?? 5),
            ceilingEtiqueta: (float) ($raw['ceiling_etiqueta'] ?? 10),
            perdaAcertoM4v: (float) ($raw['perda_acerto_m_4v'] ?? 250),
            perdaAcertoM5: (float) ($raw['perda_acerto_m_5'] ?? 250),
            perdaAcertoM6: (float) ($raw['perda_acerto_m_6'] ?? 260),
            perdaAcertoM7: (float) ($raw['perda_acerto_m_7'] ?? 270),
            perdaAcertoM8: (float) ($raw['perda_acerto_m_8'] ?? 280),
            caixaEmpacotamento: $caixaEmp,
        );
    }

    /**
     * Sobrepõe as 4 bases + escalares quando o banco já foi semeado.
     * Tabelas vazias / ausentes → mantém JSON (testes e deploys sem seed).
     */
    public static function overlayFromDatabase(self $cat, ?int $empresaId = null): self
    {
        if (! Schema::hasTable('orc_catalogo_papeis')) {
            return $cat;
        }

        try {
            if (Schema::hasTable('orc_catalogo_parametros')) {
                self::applyParametrosOverlay($cat, $empresaId);
            }
            if (Schema::hasTable('orc_catalogo_estruturas')) {
                self::applyEstruturasOverlay($cat, $empresaId);
            }

            $papeisQ = CatalogoOrcEmpresa::apply(OrcCatalogoPapel::query(), $empresaId, true);
            if ($papeisQ->exists()) {
                $papel = [];
                /** @var list<string> $papeisAtivos */
                $papeisAtivos = [];
                foreach ($papeisQ->clone()->orderBy('ordem')->orderBy('nome')->get() as $row) {
                    $nome = self::norm($row->nome);
                    $papel[$nome] = (float) $row->preco_m2;
                    if ($row->ativo) {
                        $papeisAtivos[] = $nome;
                    }
                }
                $cat->papel = $papel;
                $cat->papeisAtivosUi = $papeisAtivos;
            }

            $acabQ = CatalogoOrcEmpresa::apply(OrcCatalogoAcabamento::query(), $empresaId, true);
            if ($acabQ->exists()) {
                $acab = [];
                $perda = [];
                /** @var list<string> $acabAtivos */
                $acabAtivos = [];
                foreach ($acabQ->clone()->orderBy('ordem')->orderBy('nome')->get() as $row) {
                    $nome = self::norm($row->nome);
                    $acab[$nome] = (float) $row->preco_m2;
                    $perda[$nome] = (float) $row->perda_m2;
                    if ($row->ativo) {
                        $acabAtivos[] = $nome;
                    }
                }
                $cat->acabamentos = $acab;
                $cat->perdaAcabamento = $perda;
                $cat->acabamentosAtivosUi = $acabAtivos;
            }

            $trocaQ = CatalogoOrcEmpresa::apply(OrcCatalogoTipoTroca::query(), $empresaId, true);
            if ($trocaQ->exists()) {
                $parada = [];
                /** @var list<string> $trocasAtivas */
                $trocasAtivas = [];
                foreach ($trocaQ->clone()->orderBy('ordem')->orderBy('tipo')->get() as $row) {
                    $tipo = self::norm($row->tipo);
                    $parada[$tipo] = (float) $row->tempo_h;
                    if ($row->ativo) {
                        $trocasAtivas[] = $tipo;
                    }
                }
                $cat->horaParadaH = $parada;
                $cat->tiposTrocaAtivosUi = $trocasAtivas;
            }

            $maqQ = CatalogoOrcEmpresa::apply(OrcCatalogoMaquina::query(), $empresaId, true);
            if ($maqQ->exists()) {
                $hora = [];
                /** @var list<string> $maquinasAtivas */
                $maquinasAtivas = [];
                $maqs = $maqQ->clone()
                    ->with('tarifas')
                    ->orderBy('ordem')
                    ->orderBy('nome')
                    ->get();
                foreach ($maqs as $maq) {
                    $nome = self::norm($maq->nome);
                    $bloco = [];
                    foreach ($maq->tarifas as $t) {
                        $bloco[trim((string) $t->cores)] = (float) $t->tarifa;
                    }
                    $hora[$nome] = $bloco;
                    if ($maq->ativo) {
                        $maquinasAtivas[] = $nome;
                    }
                }
                $cat->horaMaquina = $hora;
                // G10: lista canônica = máquinas ativas do cadastro.
                $cat->maquinas = $maquinasAtivas !== [] ? $maquinasAtivas : array_keys($hora);
                $cat->maquinasAtivasUi = $maquinasAtivas;
            }
        } catch (\Throwable) {
            // Em migração/teste parcial, não quebrar o motor — JSON segue válido.
            return $cat;
        }

        return $cat;
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
        $cat->tubete = $this->tubete;
        $cat->horaParadaH = $this->horaParadaH;
        $cat->horaMaquina = $this->horaMaquina;
        $cat->papeisAtivosUi = $this->papeisAtivosUi;
        $cat->acabamentosAtivosUi = $this->acabamentosAtivosUi;
        $cat->tiposTrocaAtivosUi = $this->tiposTrocaAtivosUi;
        $cat->maquinasAtivasUi = $this->maquinasAtivasUi;

        if (! $overrides) {
            return $cat;
        }

        if (isset($overrides['papel']) && is_array($overrides['papel'])) {
            foreach ($overrides['papel'] as $k => $v) {
                if ($v !== null && $v !== '') {
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
        if (array_key_exists('setup_horas', $overrides) && $overrides['setup_horas'] !== null) {
            $cat->setupHoras = (float) $overrides['setup_horas'];
        }
        if (array_key_exists('limite_metragem_bobina', $overrides) && $overrides['limite_metragem_bobina'] !== null) {
            $cat->limiteMetragemBobina = (float) $overrides['limite_metragem_bobina'];
        }
        if (array_key_exists('minutos_troca_bobina', $overrides) && $overrides['minutos_troca_bobina'] !== null) {
            $cat->minutosTrocaBobina = (float) $overrides['minutos_troca_bobina'];
        }
        if (array_key_exists('ceiling_etiqueta', $overrides) && $overrides['ceiling_etiqueta'] !== null) {
            $cat->ceilingEtiqueta = (float) $overrides['ceiling_etiqueta'];
        }
        if (array_key_exists('tinta_faixa_m2', $overrides) && $overrides['tinta_faixa_m2'] !== null) {
            $cat->tintaFaixaM2 = (float) $overrides['tinta_faixa_m2'];
        }
        if (array_key_exists('tinta_valor_ate_30_por_cor', $overrides) && $overrides['tinta_valor_ate_30_por_cor'] !== null) {
            $cat->tintaAte30PorCor = (float) $overrides['tinta_valor_ate_30_por_cor'];
        }
        if (isset($overrides['acabamentos']) && is_array($overrides['acabamentos'])) {
            foreach ($overrides['acabamentos'] as $k => $v) {
                if ($v !== null && $v !== '') {
                    $cat->acabamentos[self::norm((string) $k)] = (float) $v;
                }
            }
        }
        if (isset($overrides['tubete']) && is_array($overrides['tubete'])) {
            foreach ($overrides['tubete'] as $k => $v) {
                if ($v !== null && $v !== '') {
                    $cat->tubete[self::norm((string) $k)] = (float) $v;
                }
            }
        }
        if (isset($overrides['hora_parada_h']) && is_array($overrides['hora_parada_h'])) {
            foreach ($overrides['hora_parada_h'] as $k => $v) {
                if ($v !== null && $v !== '') {
                    $cat->horaParadaH[self::norm((string) $k)] = (float) $v;
                }
            }
        }
        if (isset($overrides['hora_maquina']) && is_array($overrides['hora_maquina'])) {
            foreach ($overrides['hora_maquina'] as $maq => $rates) {
                if (! is_array($rates)) {
                    continue;
                }
                try {
                    $maqKey = $cat->normalizarMaquina((string) $maq);
                } catch (\Throwable) {
                    $maqKey = self::norm((string) $maq);
                }
                $bloco = $cat->horaMaquina[$maqKey] ?? [];
                foreach ($rates as $c => $t) {
                    if ($t !== null && $t !== '') {
                        $bloco[(string) $c] = (float) $t;
                    }
                }
                $cat->horaMaquina[$maqKey] = $bloco;
            }
        }

        return $cat;
    }

    /**
     * Tarifas efetivas deste ORC (catálogo + overrides) para o item selecionado.
     * Fotografia auditável no catalog_snapshot — UI “Como chegou neste valor”.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function tarifasResolvidas(array $input): array
    {
        $papel = (string) ($input['papel'] ?? '');
        $acabamento = (string) ($input['acabamento'] ?? '');
        $maquina = (string) ($input['maquina'] ?? '');
        $cores = $input['cores'] ?? null;
        $tubete = (string) ($input['tubete'] ?? '');
        $tipoTroca = (string) ($input['tipo_troca_produto'] ?? 'SEM PARADA');
        $rebobNome = $this->rebobinacaoNome;

        $taxa = 0.0;
        try {
            $taxa = $maquina !== '' && $cores !== null && $cores !== ''
                ? $this->taxaHoraMaquina($maquina, $cores)
                : 0.0;
        } catch (\Throwable) {
            $taxa = 0.0;
        }

        return [
            'preco_papel' => $papel !== '' ? $this->precoPapel($papel) : null,
            'papel' => $papel !== '' ? $papel : null,
            'taxa_hora_maquina' => $taxa > 0 ? $taxa : null,
            'maquina' => $maquina !== '' ? $maquina : null,
            'cores' => $cores,
            'hora_parada_troca' => $tipoTroca !== '' ? $this->horaParada($tipoTroca) : null,
            'tipo_troca_produto' => $tipoTroca !== '' ? $tipoTroca : null,
            'minutos_troca_bobina' => $this->minutosTrocaBobina,
            'limite_metragem_bobina' => $this->limiteMetragemBobina,
            'tinta_faixa_m2' => $this->tintaFaixaM2,
            'tinta_valor_ate_30_por_cor' => $this->tintaAte30PorCor,
            'tinta_acima_m2' => $this->tintaAcimaM2,
            'preco_acabamento' => $acabamento !== '' ? $this->precoAcabamento($acabamento) : null,
            'acabamento' => $acabamento !== '' ? $acabamento : null,
            'preco_rebobinacao' => $this->precoRebobinacao(),
            'rebobinacao' => $rebobNome,
            'preco_tubete' => $tubete !== '' ? $this->precoTubete($tubete) : null,
            'tubete' => $tubete !== '' ? $tubete : null,
            'preco_caixa' => $this->precoCaixa,
        ];
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

    /** rv4: PERDA ACABAMENTO × (largura/100) × colunas (ORÇAMENTO K). */
    public function perdaAcabM2(string $nome, float $larguraCm, int $colunas): float
    {
        if ($this->perdaAcab($nome) <= 0.0) {
            return 0.0;
        }

        return $this->perdaAcab($nome) * ($larguraCm / 100.0) * max(0, $colunas);
    }

    public function perdaTrocaM2Fator(mixed $cores): float
    {
        $k = self::loadCoresKey($this->coresKeyRaw($cores));
        if (in_array($k, ['0', ''], true)) {
            return 0.0;
        }
        if (! array_key_exists($k, $this->perdaTrocaM2Fator)) {
            throw new \InvalidArgumentException("Cores sem PERDA DE ACERTO (troca): {$k}");
        }

        return (float) $this->perdaTrocaM2Fator[$k];
    }

    /**
     * rv4 TINTA (2): INDEX por faixa MTS × coluna de cor.
     */
    public function tintaMatrizRate(float $areaM2, mixed $cores): float
    {
        if ($this->tintaMatriz === null) {
            return $this->tintaAcimaM2;
        }
        $thresholds = $this->tintaMatriz['thresholds'];
        $rates = $this->tintaMatriz['rates'];
        if ($thresholds === []) {
            return $this->tintaAcimaM2;
        }

        $k = self::loadCoresKey($this->coresKeyRaw($cores));
        $col = ((int) $k) >= 4 || $k === '4V' ? '4' : $k;
        if (! isset($rates[$col])) {
            $col = '4';
        }
        $colRates = $rates[$col];

        $idx = count($thresholds) - 1;
        if ($areaM2 > 300.0) {
            $idx = count($thresholds) - 1;
        } else {
            for ($i = 0; $i < count($thresholds); $i++) {
                if ($areaM2 <= $thresholds[$i]) {
                    $idx = $i;
                    break;
                }
            }
        }

        return (float) ($colRates[$idx] ?? $this->tintaAcimaM2);
    }

    public function usaTintaMatriz(): bool
    {
        return $this->tintaMatriz !== null;
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

    /**
     * @return array{
     *   papeis: list<string>,
     *   acabamentos: list<string>,
     *   tubetes: list<string>,
     *   maquinas: list<string>,
     *   maquinas_roda_servico: list<string>,
     *   tipos_troca_produto: list<string>,
     *   imposto_pct_default: float,
     *   matriz_cm2: float
     * }
     */
    public function metaForUi(): array
    {
        $papeis = $this->papeisAtivosUi ?? array_keys($this->papel);
        $acabamentos = $this->acabamentosAtivosUi ?? array_keys($this->acabamentos);
        $tiposTroca = $this->tiposTrocaAtivosUi ?? array_keys($this->horaParadaH);
        $maquinas = $this->maquinasAtivasUi ?? $this->maquinas;

        return [
            'papeis' => array_values($papeis),
            'acabamentos' => array_values(array_filter(
                $acabamentos,
                fn (string $k) => $k !== $this->rebobinacaoNome
            )),
            'tubetes' => array_keys($this->tubete),
            'maquinas' => array_values($maquinas),
            'maquinas_roda_servico' => $this->maquinasRodaServico,
            'tipos_troca_produto' => array_values($tiposTroca),
            'imposto_pct_default' => 16.0,
            'matriz_cm2' => $this->matrizCm2,
            'setup_horas' => $this->setupHoras,
            'limite_metragem_bobina' => $this->limiteMetragemBobina,
            'minutos_troca_bobina' => $this->minutosTrocaBobina,
            'ceiling_etiqueta' => $this->ceilingEtiqueta,
            'preco_caixa' => $this->precoCaixa,
            'tinta_faixa_m2' => $this->tintaFaixaM2,
            'tinta_valor_ate_30_por_cor' => $this->tintaAte30PorCor,
            'tinta_valor_acima_m2' => $this->tintaAcimaM2,
            'motor_version' => OrcamentoMotorRegras::MOTOR_VERSION,
        ];
    }

    /**
     * Aplica escalares ativos de orc_catalogo_parametros sobre o catálogo JSON.
     */
    private static function applyParametrosOverlay(self $cat, ?int $empresaId): void
    {
        $rows = CatalogoOrcEmpresa::apply(OrcCatalogoParametro::query(), $empresaId, true)
            ->where('ativo', true)
            ->get()
            ->keyBy('chave');

        $val = static function (string $chave) use ($rows): ?float {
            $row = $rows->get($chave);
            if (! $row) {
                return null;
            }

            return (float) $row->valor;
        };

        if (($v = $val(OrcCatalogoParametro::CHAVE_MATRIZ_CM2)) !== null) {
            $cat->matrizCm2 = $v;
        }
        if (($v = $val(OrcCatalogoParametro::CHAVE_SETUP_HORAS)) !== null) {
            $cat->setupHoras = $v;
        }
        if (($v = $val(OrcCatalogoParametro::CHAVE_LIMITE_METRAGEM_BOBINA)) !== null) {
            $cat->limiteMetragemBobina = $v;
        }
        if (($v = $val(OrcCatalogoParametro::CHAVE_MINUTOS_TROCA_BOBINA)) !== null) {
            $cat->minutosTrocaBobina = $v;
        }
        if (($v = $val(OrcCatalogoParametro::CHAVE_CEILING_ETIQUETA)) !== null) {
            $cat->ceilingEtiqueta = $v;
        }
        if (($v = $val(OrcCatalogoParametro::CHAVE_PRECO_CAIXA)) !== null) {
            $cat->precoCaixa = $v;
        }
        if (($v = $val(OrcCatalogoParametro::CHAVE_TINTA_FAIXA_M2)) !== null) {
            $cat->tintaFaixaM2 = $v;
        }
        if (($v = $val(OrcCatalogoParametro::CHAVE_TINTA_ATE_30_POR_COR)) !== null) {
            $cat->tintaAte30PorCor = $v;
        }
        if (($v = $val(OrcCatalogoParametro::CHAVE_TINTA_ACIMA_M2)) !== null) {
            $cat->tintaAcimaM2 = $v;
        }
        if (($v = $val(OrcCatalogoParametro::CHAVE_PERDA_PAPEL_F6)) !== null) {
            $cat->perdaPapelF6 = $v;
        }
        if (($v = $val(OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_4V)) !== null) {
            $cat->perdaAcertoM4v = $v;
        }
        if (($v = $val(OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_5)) !== null) {
            $cat->perdaAcertoM5 = $v;
        }
        if (($v = $val(OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_6)) !== null) {
            $cat->perdaAcertoM6 = $v;
        }
        if (($v = $val(OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_7)) !== null) {
            $cat->perdaAcertoM7 = $v;
        }
        if (($v = $val(OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_8)) !== null) {
            $cat->perdaAcertoM8 = $v;
        }

        foreach ([
            '0' => OrcCatalogoParametro::CHAVE_PERDA_PAPEL_0,
            '1' => OrcCatalogoParametro::CHAVE_PERDA_PAPEL_1,
            '2' => OrcCatalogoParametro::CHAVE_PERDA_PAPEL_2,
            '3' => OrcCatalogoParametro::CHAVE_PERDA_PAPEL_3,
        ] as $k => $chave) {
            if (($v = $val($chave)) !== null) {
                $cat->perdaPapel03[$k] = $v;
            }
        }

        $tubeteMap = [
            '1"' => OrcCatalogoParametro::CHAVE_TUBETE_1,
            '1" 1/2' => OrcCatalogoParametro::CHAVE_TUBETE_1_5,
            '3"' => OrcCatalogoParametro::CHAVE_TUBETE_3,
        ];
        foreach ($tubeteMap as $nome => $chave) {
            if (($v = $val($chave)) !== null) {
                $cat->tubete[self::norm($nome)] = $v;
            }
        }
    }

    private static function applyEstruturasOverlay(self $cat, ?int $empresaId): void
    {
        $rows = CatalogoOrcEmpresa::apply(OrcCatalogoEstrutura::query(), $empresaId, true)
            ->get()
            ->keyBy('chave');

        $tm = $rows->get(OrcCatalogoEstrutura::CHAVE_TINTA_MATRIZ)?->payload;
        if (is_array($tm) && ($normalized = self::normalizeTintaMatrizPayload($tm)) !== null) {
            $cat->tintaMatriz = $normalized;
        }

        $pt = $rows->get(OrcCatalogoEstrutura::CHAVE_PERDA_TROCA_M2_FATOR)?->payload;
        if (is_array($pt) && ($fator = self::normalizePerdaTrocaPayload($pt)) !== []) {
            $cat->perdaTrocaM2Fator = $fator;
        }

        $ce = $rows->get(OrcCatalogoEstrutura::CHAVE_CAIXA_EMPACOTAMENTO)?->payload;
        if (is_array($ce) && ($emp = self::normalizeCaixaEmpacotamentoPayload($ce)) !== []) {
            $cat->caixaEmpacotamento = $emp;
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{thresholds: list<float>, rates: array<string, list<float>>}|null
     */
    public static function normalizeTintaMatrizPayload(array $payload): ?array
    {
        $thresholds = array_map(static fn ($x) => (float) $x, $payload['thresholds'] ?? []);
        $rates = [];
        foreach ($payload['rates'] ?? [] as $col => $vals) {
            if (! is_array($vals)) {
                continue;
            }
            $rates[(string) $col] = array_map(static fn ($x) => (float) $x, $vals);
        }
        if ($thresholds === [] || $rates === []) {
            return null;
        }
        foreach ($rates as $colRates) {
            if (count($colRates) !== count($thresholds)) {
                return null;
            }
        }

        return ['thresholds' => $thresholds, 'rates' => $rates];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, float>
     */
    public static function normalizePerdaTrocaPayload(array $payload): array
    {
        $out = [];
        foreach ($payload as $k => $v) {
            if (! is_numeric($v)) {
                continue;
            }
            $out[self::loadCoresKey((string) $k)] = (float) $v;
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, array<string, mixed>>
     */
    public static function normalizeCaixaEmpacotamentoPayload(array $payload): array
    {
        $out = [];
        foreach ($payload as $k => $v) {
            if (! is_array($v)) {
                continue;
            }
            $tubete = self::norm((string) $k);
            $rolos = (int) ($v['rolos_por_caixa'] ?? 0);
            if ($rolos < 1) {
                continue;
            }
            $out[$tubete] = [
                'caixa_id' => isset($v['caixa_id']) ? (int) $v['caixa_id'] : null,
                'medida' => isset($v['medida']) ? trim((string) $v['medida']) : '',
                'rolos_por_caixa' => $rolos,
            ];
        }

        return $out;
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

    private static function loadCoresKey(string $k): string
    {
        $key = strtoupper(trim($k));
        if ($key !== '4V' && is_numeric($key)) {
            return (string) (int) (float) $key;
        }

        return $key;
    }

    private function coresKeyRaw(mixed $cores): string
    {
        if ($cores === null) {
            return '';
        }
        if (is_string($cores)) {
            return strtoupper(trim($cores));
        }
        if (is_float($cores) && $cores == (int) $cores) {
            return (string) (int) $cores;
        }
        if (is_int($cores)) {
            return (string) $cores;
        }

        return trim((string) $cores);
    }

    /**
     * @param  array<string|int, mixed>  $raw
     * @return array<string, float>
     */
    private static function loadCoresMl(array $raw): array
    {
        $out = [];
        foreach ($raw as $k => $v) {
            $out[self::loadCoresKey((string) $k)] = (float) $v;
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
