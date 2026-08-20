<?php

namespace App\Services\Cadastros;

use App\Models\CodigoSequence;
use App\Models\Empresa;
use App\Models\Produto;
use App\Models\ProdutoGrupo;
use App\Support\ProdutoLotePolitica;
use Illuminate\Support\Facades\DB;

/**
 * Seed idempotente das famílias fiscais (Camada A) do estudo 32.
 *
 * Não passa por ProdutoService::create (evita gerar código automático e
 * defaults de dual KG→M2 sem atributos). Grava direto com updateOrCreate
 * por (empresa_id, codigo) — reexecutável sem duplicar.
 */
class ProdutoCadastroService
{
    public function __construct(
        private readonly ProdutoGrupoService $produtoGrupoService,
    ) {}

    /**
     * @return array{familias: int, demos: int, sequences: int}
     */
    public function seedForEmpresa(Empresa $empresa, bool $incluirDemosVenda = true): array
    {
        $this->produtoGrupoService->seedCatalog();

        $grupoIds = ProdutoGrupo::query()->pluck('id', 'codigo');

        return DB::transaction(function () use ($empresa, $incluirDemosVenda, $grupoIds) {
            $familias = 0;
            foreach (ProdutoCadastroCatalogData::familias() as $row) {
                $this->upsertFamilia($empresa, $row, $grupoIds);
                $familias++;
            }

            $demos = 0;
            if ($incluirDemosVenda) {
                foreach (ProdutoCadastroCatalogData::demosVenda() as $row) {
                    $this->upsertDemo($empresa, $row, $grupoIds);
                    $demos++;
                }
            }

            $sequences = $this->syncCodigoSequences($empresa);

            return [
                'familias' => $familias,
                'demos' => $demos,
                'sequences' => $sequences,
            ];
        });
    }

    /**
     * @param  array{
     *   codigo: string,
     *   familia: string,
     *   grupo: string,
     *   descricao_fiscal: string,
     *   ncm: ?string,
     *   tipo_item_sped: string,
     *   unidade_comercial: string,
     *   grupo_estoque: string,
     *   ncm_situacao: string,
     *   listagem_grupo: string
     * }  $row
     * @param  \Illuminate\Support\Collection<string, int>  $grupoIds
     */
    private function upsertFamilia(Empresa $empresa, array $row, $grupoIds): void
    {
        $grupoCodigo = $row['grupo'];
        $un = strtoupper($row['unidade_comercial']);

        $cfopEntrada = match ($row['familia']) {
            'REV' => '2102',
            default => '2101',
        };

        $lote = ProdutoLotePolitica::paraGrupo($grupoCodigo);

        $payload = [
            'familia' => $row['familia'],
            'grupo' => $grupoCodigo,
            'grupo_id' => $grupoIds[$grupoCodigo] ?? null,
            'descricao_fiscal' => $row['descricao_fiscal'],
            'ncm' => $row['ncm'],
            'cest' => null,
            // origem: NÃO gravar aqui — default schema 0 na criação; na 1ª NF copiar do XML
            // (estudo: não padronizar origem por comodidade). Flag em atributos.
            'tipo_item_sped' => $row['tipo_item_sped'],
            'unidade_comercial' => $un,
            'unidade_interna' => $un,
            'fator_conversao' => '1',
            'cfop_entrada_padrao' => $cfopEntrada,
            'cfop_saida_padrao' => $row['familia'] === 'REV' ? '5102' : null,
            'csosn' => $row['familia'] === 'REV' ? '102' : null,
            'gtin' => 'SEM GTIN',
            'custo_medio' => '0',
            'controla_lote' => $lote['controla_lote'],
            'controla_validade' => $lote['controla_validade'],
            'prazo_validade_dias' => $lote['prazo_validade_dias'],
            'situacao' => 'ATIVO',
            'atributos' => [
                'camada_cadastro' => 'A',
                'grupo_estoque' => $row['grupo_estoque'],
                'ncm_situacao' => $row['ncm_situacao'],
                'listagem_grupo' => $row['listagem_grupo'],
                'origem_pendente_xml' => true,
                'fonte_catalogo' => ProdutoCadastroCatalogData::FONTE,
            ],
        ];

        $this->upsertProduto($empresa, $row['codigo'], $payload);
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  \Illuminate\Support\Collection<string, int>  $grupoIds
     */
    private function upsertDemo(Empresa $empresa, array $row, $grupoIds): void
    {
        $grupoCodigo = $row['grupo'];
        $lote = ProdutoLotePolitica::paraGrupo($grupoCodigo);
        $atributos = [];
        if (! empty($row['grupo_estoque'])) {
            $atributos['grupo_estoque'] = $row['grupo_estoque'];
        }
        $atributos['camada_cadastro'] = 'DEMO';

        $this->upsertProduto($empresa, $row['codigo'], [
            'familia' => $row['familia'],
            'grupo' => $grupoCodigo,
            'grupo_id' => $grupoIds[$grupoCodigo] ?? null,
            'descricao_fiscal' => $row['descricao_fiscal'],
            'descricao_comercial' => $row['descricao_comercial'] ?? null,
            'ncm' => $row['ncm'],
            'tipo_item_sped' => $row['tipo_item_sped'],
            'unidade_comercial' => $row['unidade_comercial'],
            'unidade_interna' => $row['unidade_interna'],
            'fator_conversao' => $row['fator_conversao'],
            'csosn' => $row['csosn'] ?? null,
            'cfop_saida_padrao' => $row['cfop_saida_padrao'] ?? null,
            'preco_tabela' => $row['preco_tabela'] ?? null,
            'custo_medio' => '0',
            'gtin' => $row['familia'] === 'PA' ? 'SEM GTIN' : null,
            'controla_lote' => $lote['controla_lote'],
            'controla_validade' => $lote['controla_validade'],
            'prazo_validade_dias' => $lote['prazo_validade_dias'],
            'situacao' => 'ATIVO',
            'atributos' => $atributos,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function upsertProduto(Empresa $empresa, string $codigo, array $payload): void
    {
        $existing = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', $codigo)
            ->first();

        if ($existing) {
            unset($payload['custo_medio']);
            $attrsNovos = is_array($payload['atributos'] ?? null) ? $payload['atributos'] : [];
            $attrsAtuais = is_array($existing->atributos) ? $existing->atributos : [];
            $origemResolvida = ! ($attrsAtuais['origem_pendente_xml'] ?? true);
            $payload['atributos'] = array_merge($attrsAtuais, $attrsNovos);
            if ($origemResolvida) {
                $payload['atributos']['origem_pendente_xml'] = false;
            }
        }

        Produto::query()->updateOrCreate(
            ['empresa_id' => $empresa->id, 'codigo' => $codigo],
            $payload
        );
    }

    /**
     * Avança CodigoSequence para max(sufixo)+1 por prefixo de grupo seedado.
     */
    private function syncCodigoSequences(Empresa $empresa): int
    {
        $prefixos = [];

        foreach (ProdutoCadastroCatalogData::familias() as $row) {
            $prefixos[$row['grupo']] = true;
        }
        foreach (ProdutoCadastroCatalogData::demosVenda() as $row) {
            $prefixos[$row['grupo']] = true;
        }

        $updated = 0;
        foreach (array_keys($prefixos) as $prefixo) {
            $max = Produto::query()
                ->where('empresa_id', $empresa->id)
                ->where('codigo', 'like', $prefixo.'-%')
                ->pluck('codigo')
                ->map(function (string $codigo) use ($prefixo): int {
                    $sufixo = substr($codigo, strlen($prefixo) + 1);

                    return ctype_digit($sufixo) ? (int) $sufixo : 0;
                })
                ->max() ?? 0;

            $proximo = $max + 1;
            CodigoSequence::query()->updateOrCreate(
                ['empresa_id' => $empresa->id, 'prefixo' => $prefixo],
                ['proximo' => $proximo]
            );
            $updated++;
        }

        return $updated;
    }
}
