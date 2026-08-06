<?php

namespace App\Services\Relatorio;

/**
 * Catálogo allowlist de fontes/campos que a IA pode usar no programa de relatório.
 * Nunca expor SQL bruto — só metadados tipados.
 */
class RelatorioCatalogo
{
    public const LIMITE_MAX = 1000;

    public const LIMITE_PADRAO = 500;

    /**
     * Teto de células renderizadas (linhas × colunas) estimado antes do DomPDF.
     * Protege contra 1.000×10 e combinações futuras com agrupamento/gráfico.
     * Ver impacto computacional §4 Fase 3 / §8-R4.
     */
    public const CELULAS_MAX = 8000;

    /** DomPDF estoura memória com SVG em tabelas grandes — teto seguro. */
    public const LIMITE_FACAS_COM_DESENHO = 60;

    public const LIMITE_FACAS = 200;

    /** Limite de linhas compatível com CELULAS_MAX dado o nº de colunas. */
    public static function limitePorCelulas(int $nColunas): int
    {
        $cols = max(1, $nColunas);
        $max = (int) config('erp.relatorio_celulas_max', self::CELULAS_MAX);

        return max(1, intdiv(max(1, $max), $cols));
    }

    /** @var list<string> */
    public const OPS = ['eq', 'neq', 'in', 'like', 'gte', 'lte', 'gt', 'lt', 'between'];

    /**
     * @return array{
     *   fontes: array<string, array<string, mixed>>,
     *   ops: list<string>,
     *   limite_max: int,
     *   limite_padrao: int
     * }
     */
    public function forFlags(array $flags): array
    {
        $incluirCredito = (bool) ($flags['incluir_credito'] ?? false);

        return [
            'fontes' => [
                'orcamentos' => [
                    'descricao' => 'Orçamentos comerciais da empresa (propostas de preço — NÃO é faturamento/NF).',
                    'sinonimos' => ['orçamento', 'orcamento', 'proposta', 'cotação', 'cotacao'],
                    'perguntas_exemplo' => [
                        'Orçamentos calculados do mês passado, com código, cliente, valor e data, do maior valor para o menor',
                        'Liste os orçamentos com status CALCULADO criados nos últimos 30 dias',
                        'Top 10 orçamentos por valor da 1ª faixa',
                    ],
                    'campos' => [
                        'codigo' => ['tipo' => 'string', 'label' => 'Código', 'ordenavel' => true, 'filtravel' => true],
                        'status' => [
                            'tipo' => 'string',
                            'label' => 'Status',
                            'valores' => ['RASCUNHO', 'CALCULADO', 'ENVIADO', 'APROVADO', 'REPROVADO', 'VENCIDO', 'CANCELADO'],
                            'ordenavel' => true,
                            'filtravel' => true,
                        ],
                        'parceiro_codigo' => ['tipo' => 'string', 'label' => 'Código do parceiro', 'ordenavel' => true, 'filtravel' => true, 'sinonimos' => ['cliente código']],
                        'parceiro_nome' => [
                            'tipo' => 'string',
                            'label' => 'Nome do cliente/parceiro',
                            'ordenavel' => true,
                            'filtravel' => true,
                            'sinonimos' => ['cliente', 'razão social', 'razao social'],
                        ],
                        'cliente_nome' => ['tipo' => 'string', 'label' => 'Nome no orçamento', 'ordenavel' => true, 'filtravel' => true],
                        'versao' => ['tipo' => 'integer', 'label' => 'Versão', 'ordenavel' => true, 'filtravel' => true, 'agregavel' => true],
                        'total' => [
                            'tipo' => 'number',
                            'label' => 'Valor 1ª faixa',
                            'descricao' => 'Valor unitário da etiqueta na primeira faixa de quantidade. NÃO é faturamento nem receita realizada; é preço de proposta.',
                            'sinonimos' => ['valor', 'preço', 'preco', 'valor do orçamento', 'valor etiqueta'],
                            'nao_confundir_com' => ['faturamento', 'receita', 'valor total do pedido'],
                            'formato' => 'moeda',
                            'agregavel' => true,
                            'ordenavel' => true,
                            'filtravel' => true,
                        ],
                        'prazo_entrega_dias' => ['tipo' => 'integer', 'label' => 'Prazo entrega (dias)', 'ordenavel' => true, 'filtravel' => true, 'agregavel' => true],
                        'validade_dias' => ['tipo' => 'integer', 'label' => 'Validade (dias)', 'ordenavel' => true, 'filtravel' => true, 'agregavel' => true],
                        'observacao' => ['tipo' => 'string', 'label' => 'Observação', 'filtravel' => true, 'ordenavel' => false],
                        'created_at' => ['tipo' => 'datetime', 'label' => 'Criado em', 'filtravel' => true, 'ordenavel' => true, 'formato' => 'data_hora'],
                        'updated_at' => ['tipo' => 'datetime', 'label' => 'Atualizado em', 'filtravel' => true, 'ordenavel' => true, 'formato' => 'data_hora'],
                    ],
                ],
                'parceiros' => [
                    'descricao' => 'Parceiros (clientes, fornecedores, prospects, colaboradores…).',
                    'sinonimos' => ['cliente', 'fornecedor', 'prospect', 'cadastro'],
                    'perguntas_exemplo' => [
                        'Liste parceiros ativos com papel cliente, código, razão social e UF',
                        'Prospects criados nos últimos 90 dias',
                    ],
                    'campos' => array_merge([
                        'codigo' => ['tipo' => 'string', 'label' => 'Código', 'ordenavel' => true, 'filtravel' => true],
                        'razao_social' => ['tipo' => 'string', 'label' => 'Razão social', 'ordenavel' => true, 'filtravel' => true, 'sinonimos' => ['nome', 'cliente']],
                        'nome_fantasia' => ['tipo' => 'string', 'label' => 'Nome fantasia', 'ordenavel' => true, 'filtravel' => true],
                        'cnpj_cpf' => ['tipo' => 'string', 'label' => 'CNPJ/CPF', 'filtravel' => true, 'ordenavel' => false],
                        'situacao' => ['tipo' => 'string', 'label' => 'Situação', 'ordenavel' => true, 'filtravel' => true],
                        'is_prospect' => ['tipo' => 'boolean', 'label' => 'É prospect', 'filtravel' => true, 'ordenavel' => true],
                        'papel_cliente' => ['tipo' => 'boolean', 'label' => 'Papel cliente', 'filtravel' => true, 'ordenavel' => true],
                        'papel_fornecedor' => ['tipo' => 'boolean', 'label' => 'Papel fornecedor', 'filtravel' => true, 'ordenavel' => true],
                        'municipio' => ['tipo' => 'string', 'label' => 'Município', 'ordenavel' => true, 'filtravel' => true],
                        'uf' => ['tipo' => 'string', 'label' => 'UF', 'ordenavel' => true, 'filtravel' => true],
                        'email' => ['tipo' => 'string', 'label' => 'E-mail', 'filtravel' => true, 'ordenavel' => false],
                        'whatsapp' => ['tipo' => 'string', 'label' => 'WhatsApp', 'filtravel' => true, 'ordenavel' => false],
                        'telefone' => ['tipo' => 'string', 'label' => 'Telefone', 'filtravel' => true, 'ordenavel' => false],
                        'created_at' => ['tipo' => 'datetime', 'label' => 'Criado em', 'filtravel' => true, 'ordenavel' => true],
                    ], $incluirCredito ? [
                        'limite_credito' => ['tipo' => 'number', 'label' => 'Limite de crédito', 'agregavel' => true, 'sensivel' => true, 'formato' => 'moeda', 'ordenavel' => true, 'filtravel' => true],
                        'credito_utilizado' => ['tipo' => 'number', 'label' => 'Crédito utilizado', 'agregavel' => true, 'sensivel' => true, 'formato' => 'moeda', 'ordenavel' => true, 'filtravel' => true],
                    ] : []),
                ],
                'produtos' => [
                    'descricao' => 'Produtos por família (MP, EMB, REV, PA, SVC, FAC).',
                    'sinonimos' => ['produto', 'item', 'sku', 'material'],
                    'perguntas_exemplo' => [
                        'Produtos da família PA ativos com código, descrição e preço tabela',
                        'Liste matérias-primas (MP) ordenadas por descrição',
                    ],
                    'campos' => [
                        'codigo' => ['tipo' => 'string', 'label' => 'Código', 'ordenavel' => true, 'filtravel' => true],
                        'descricao_comercial' => ['tipo' => 'string', 'label' => 'Descrição comercial', 'ordenavel' => true, 'filtravel' => true, 'sinonimos' => ['nome', 'descrição']],
                        'descricao_fiscal' => ['tipo' => 'string', 'label' => 'Descrição fiscal', 'ordenavel' => true, 'filtravel' => true],
                        'familia' => ['tipo' => 'string', 'label' => 'Família', 'valores' => ['MP', 'EMB', 'REV', 'PA', 'SVC', 'FAC'], 'ordenavel' => true, 'filtravel' => true],
                        'grupo' => ['tipo' => 'string', 'label' => 'Grupo', 'ordenavel' => true, 'filtravel' => true],
                        'ncm' => ['tipo' => 'string', 'label' => 'NCM', 'filtravel' => true, 'ordenavel' => false],
                        'cst_cbs' => ['tipo' => 'string', 'label' => 'CST CBS', 'filtravel' => true, 'ordenavel' => false],
                        'cclass_trib' => ['tipo' => 'string', 'label' => 'cClassTrib', 'filtravel' => true, 'ordenavel' => false],
                        'aliquota_cbs' => ['tipo' => 'number', 'label' => 'Alíquota CBS (%)', 'agregavel' => true, 'formato' => 'percentual', 'ordenavel' => true, 'filtravel' => true],
                        'unidade_comercial' => ['tipo' => 'string', 'label' => 'Unidade', 'filtravel' => true, 'ordenavel' => true],
                        'preco_tabela' => ['tipo' => 'number', 'label' => 'Preço tabela', 'agregavel' => true, 'formato' => 'moeda', 'ordenavel' => true, 'filtravel' => true],
                        'estoque_minimo' => ['tipo' => 'number', 'label' => 'Estoque mínimo', 'agregavel' => true, 'ordenavel' => true, 'filtravel' => true],
                        'lead_time_dias' => ['tipo' => 'integer', 'label' => 'Lead time (dias)', 'agregavel' => true, 'ordenavel' => true, 'filtravel' => true],
                        'situacao' => ['tipo' => 'string', 'label' => 'Situação', 'ordenavel' => true, 'filtravel' => true],
                        'created_at' => ['tipo' => 'datetime', 'label' => 'Criado em', 'filtravel' => true, 'ordenavel' => true],
                    ],
                ],
                'facas' => [
                    'descricao' => 'Mapa oficial de facas (mesmo catálogo do orçamento / FacaPicker). Para o polígono/shape do formato, inclua a coluna "desenho". Com desenho o limite máximo é '.self::LIMITE_FACAS_COM_DESENHO.' linhas (use filtros por formato/máquina se precisar focar). Sem desenho, até '.self::LIMITE_FACAS.'.',
                    'sinonimos' => ['faca', 'mapa de facas', 'formato', 'polígono', 'shape'],
                    'perguntas_exemplo' => [
                        'Mapa de facas com desenho, formato retangular, até 40 linhas',
                        'As 20 facas de maior repetição, com medida, formato e máquina',
                    ],
                    'campos' => [
                        'desenho' => ['tipo' => 'svg', 'label' => 'Desenho', 'ordenavel' => false, 'filtravel' => false],
                        'id' => ['tipo' => 'integer', 'label' => 'ID', 'ordenavel' => true, 'filtravel' => true],
                        'medida' => ['tipo' => 'string', 'label' => 'Medida', 'ordenavel' => true, 'filtravel' => true],
                        'formato' => ['tipo' => 'string', 'label' => 'Formato', 'ordenavel' => true, 'filtravel' => true],
                        'maquina_catalogo' => ['tipo' => 'string', 'label' => 'Máquina', 'ordenavel' => true, 'filtravel' => true],
                        'maquina_origem' => ['tipo' => 'string', 'label' => 'Máquina origem', 'ordenavel' => true, 'filtravel' => true],
                        'puxada' => ['tipo' => 'number', 'label' => 'Puxada', 'agregavel' => true, 'ordenavel' => true, 'filtravel' => true],
                        'z' => ['tipo' => 'number', 'label' => 'Z', 'agregavel' => true, 'ordenavel' => true, 'filtravel' => true],
                        'repeticao' => ['tipo' => 'number', 'label' => 'Repetição (REP)', 'agregavel' => true, 'ordenavel' => true, 'filtravel' => true],
                        'n_facas' => ['tipo' => 'integer', 'label' => 'N facas', 'agregavel' => true, 'ordenavel' => true, 'filtravel' => true],
                        'largura_faca' => ['tipo' => 'number', 'label' => 'Largura', 'agregavel' => true, 'ordenavel' => true, 'filtravel' => true],
                        'cilindro' => ['tipo' => 'string', 'label' => 'Cilindro', 'ordenavel' => true, 'filtravel' => true],
                        'fornecedor' => ['tipo' => 'string', 'label' => 'Fornecedor', 'ordenavel' => true, 'filtravel' => true],
                        'conjugada' => ['tipo' => 'string', 'label' => 'Conjugada', 'ordenavel' => true, 'filtravel' => true],
                        'completa' => ['tipo' => 'boolean', 'label' => 'Completa', 'ordenavel' => true, 'filtravel' => true],
                        'label' => ['tipo' => 'string', 'label' => 'Resumo', 'ordenavel' => true, 'filtravel' => true],
                    ],
                ],
            ],
            'ops' => self::OPS,
            'limite_max' => self::LIMITE_MAX,
            'limite_padrao' => self::LIMITE_PADRAO,
        ];
    }

    /**
     * Catálogo compacto: 1–2 fontes plausíveis pelo prompt + só nomes das demais.
     *
     * @return array{catalogo: array<string, mixed>, fontes_selecionadas: list<string>, completo: bool}
     */
    public function compactoParaPrompt(string $prompt, array $flags): array
    {
        $full = $this->forFlags($flags);
        $promptNorm = $this->normalizeKey($prompt);
        $scores = [];

        foreach ($full['fontes'] as $id => $def) {
            $score = 0;
            $tokens = array_merge(
                [$id],
                $def['sinonimos'] ?? [],
                [mb_strtolower((string) ($def['descricao'] ?? ''))]
            );
            foreach ($tokens as $tok) {
                $t = $this->normalizeKey((string) $tok);
                if ($t !== '' && str_contains($promptNorm, $t)) {
                    $score += 3;
                }
            }
            foreach ($def['campos'] ?? [] as $campo => $meta) {
                if (str_contains($promptNorm, $this->normalizeKey($campo))) {
                    $score += 1;
                }
                foreach ($meta['sinonimos'] ?? [] as $sin) {
                    if (str_contains($promptNorm, $this->normalizeKey((string) $sin))) {
                        $score += 2;
                    }
                }
            }
            $scores[$id] = $score;
        }

        arsort($scores);
        $top = array_keys(array_filter($scores, fn ($s) => $s > 0));
        $completo = $top === [];
        $selecionadas = $completo ? array_keys($full['fontes']) : array_slice($top, 0, 2);

        $compacto = [
            'ops' => $full['ops'],
            'limite_max' => $full['limite_max'],
            'limite_padrao' => $full['limite_padrao'],
            'fontes' => [],
            'outras_fontes' => [],
        ];

        foreach ($full['fontes'] as $id => $def) {
            if (in_array($id, $selecionadas, true)) {
                $compacto['fontes'][$id] = $def;
            } else {
                $compacto['outras_fontes'][] = [
                    'id' => $id,
                    'descricao' => $def['descricao'],
                    'sinonimos' => $def['sinonimos'] ?? [],
                ];
            }
        }

        return [
            'catalogo' => $compacto,
            'fontes_selecionadas' => $selecionadas,
            'completo' => $completo,
        ];
    }

    /** Resumo para a API / UI. */
    public function publicMeta(array $flags = []): array
    {
        $full = $this->forFlags($flags);
        $fontes = [];
        foreach ($full['fontes'] as $key => $def) {
            $fontes[] = [
                'id' => $key,
                'descricao' => $def['descricao'],
                'perguntas_exemplo' => $def['perguntas_exemplo'] ?? [],
                'campos' => collect($def['campos'])->map(fn ($meta, $campo) => [
                    'id' => $campo,
                    'label' => $meta['label'],
                    'tipo' => $meta['tipo'],
                    'agregavel' => (bool) ($meta['agregavel'] ?? false),
                    'ordenavel' => (bool) ($meta['ordenavel'] ?? true),
                    'sensivel' => (bool) ($meta['sensivel'] ?? false),
                    'formato' => $meta['formato'] ?? null,
                ])->values()->all(),
            ];
        }

        return [
            'fontes' => $fontes,
            'ops' => $full['ops'],
            'limite_max' => $full['limite_max'],
            'limite_padrao' => $full['limite_padrao'],
            'orientacoes' => ['retrato', 'paisagem'],
            'planejar_disponivel' => function_exists('config')
                ? (bool) config('erp.relatorio_ia_planejar_endpoint', true)
                : true,
        ];
    }

    public function normalizeKey(string $value): string
    {
        $v = mb_strtolower(trim($value));
        $v = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $v) ?: $v;
        $v = preg_replace('/[^a-z0-9]+/', '', $v) ?? $v;

        return $v;
    }

    /**
     * Mapeia nome livre / sinônimo para campo canônico da fonte.
     */
    public function resolverCampo(string $fonte, string $candidato, array $flags): ?string
    {
        $campos = $this->forFlags($flags)['fontes'][$fonte]['campos'] ?? null;
        if (! is_array($campos)) {
            return null;
        }
        if (isset($campos[$candidato])) {
            return $candidato;
        }

        $norm = $this->normalizeKey($candidato);
        foreach ($campos as $id => $meta) {
            if ($this->normalizeKey($id) === $norm) {
                return $id;
            }
            if ($this->normalizeKey((string) ($meta['label'] ?? '')) === $norm) {
                return $id;
            }
            foreach ($meta['sinonimos'] ?? [] as $sin) {
                if ($this->normalizeKey((string) $sin) === $norm) {
                    return $id;
                }
            }
        }

        // Similaridade alta (≥ 0.9)
        $best = null;
        $bestScore = 0.0;
        foreach (array_keys($campos) as $id) {
            similar_text($norm, $this->normalizeKey($id), $pct);
            $score = $pct / 100;
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $id;
            }
        }

        return $bestScore >= 0.9 ? $best : null;
    }
}
