<?php

namespace App\Services\Cadastros;

use App\Models\ProdutoGrupo;
use App\Support\UnidadesMedida;

/**
 * Sugere família/grupo/unidades a partir de uma linha de NF-e de entrada.
 *
 * Norma: ADR_CADASTRO_INSUMO_VOLUME · ADR_ENTRADA_XML_ASSIST · estudo canvas flexo.
 * Não cria SKU — só proposta para o humano confirmar.
 */
final class ProdutoNfeItemSugestor
{
    /** cProd genéricos que não devem virar âncora de de-para. */
    private const CPROD_GENERICOS = ['RETORNO', '3', '0', '1', '2', 'X', 'XX', 'SERVICO', 'SERVIÇO'];

    /**
     * @param  array{
     *   c_prod?: ?string,
     *   x_prod?: ?string,
     *   ncm?: ?string,
     *   u_com?: ?string,
     *   origem?: int|string|null
     * }  $item
     * @return array{
     *   familia: string,
     *   grupo: string,
     *   ncm: ?string,
     *   unidade_comercial: string,
     *   unidade_interna: string,
     *   fator_conversao: string,
     *   descricao_fiscal: string,
     *   descricao_comercial: string,
     *   origem: ?int,
     *   programa_compra: ?string,
     *   confianca: string,
     *   motivo: string,
     *   cprod_generico: bool,
     *   depara_recomendado: bool,
     *   warnings: list<string>
     * }
     */
    public function sugerir(array $item): array
    {
        $cProd = trim((string) ($item['c_prod'] ?? ''));
        $xProd = trim((string) ($item['x_prod'] ?? ''));
        $ncm = preg_replace('/\D/', '', (string) ($item['ncm'] ?? '')) ?? '';
        if (strlen($ncm) > 8) {
            $ncm = substr($ncm, 0, 8);
        }
        $uComRaw = trim((string) ($item['u_com'] ?? ''));
        $uCom = $this->normalizarUnidade($uComRaw);
        $xUpper = mb_strtoupper($xProd);
        $warnings = [];

        [$familia, $grupo, $confianca, $motivo] = $this->classificar($ncm, $xUpper, $uCom);

        $grupoModel = ProdutoGrupo::query()->where('codigo', $grupo)->first();
        if ($grupoModel) {
            $familia = $grupoModel->familia;
        }

        if ($uCom === '') {
            $uCom = $grupoModel?->unidade_comercial_padrao
                ? strtoupper((string) $grupoModel->unidade_comercial_padrao)
                : 'UN';
            $warnings[] = 'Unidade da NF ausente ou não oficial — usando padrão do grupo '.$grupo.'.';
        } elseif ($uComRaw !== '' && $this->normalizarUnidade($uComRaw) !== strtoupper(str_replace('²', '2', $uComRaw))) {
            $warnings[] = 'Unidade NF "'.$uComRaw.'" mapeada para '.$uCom.' (catálogo oficial).';
        }

        $uInt = $grupoModel?->unidade_interna_padrao
            ? strtoupper((string) $grupoModel->unidade_interna_padrao)
            : $uCom;

        // Substrato Exact típico: NF em M2 → estoque M2 (ADR volume).
        if (in_array($grupo, ['MP-PAP', 'MP-FLM'], true) && $uCom === 'M2') {
            $uInt = 'M2';
        }

        // Preferir a unidade da NF nos dois lados (fator 1). Conversão KG↔M2 exige gramatura humana.
        if ($uCom !== '' && UnidadesMedida::isOfficial($uCom) && $uCom !== $uInt) {
            if (in_array($uCom, ['KG', 'G'], true) && in_array($grupo, ['MP-PAP', 'MP-FLM'], true)) {
                $warnings[] = 'NF em '.$uCom.' — estoque inicial na mesma unidade. Ajuste para M² depois com gramatura.';
            }
            $uInt = $uCom;
        }

        $descricaoFiscal = $this->descricaoFiscal($xProd, $cProd);
        $descricaoComercial = $descricaoFiscal;
        $programa = $this->extrairPrograma($xUpper);
        $cprodGenerico = $this->isCprodGenerico($cProd);
        $deparaRecomendado = $cProd !== '' && ! $cprodGenerico;

        if ($cprodGenerico) {
            $warnings[] = 'cProd genérico ('.$cProd.') — não use como âncora de de-para; cadastre pela descrição/medida/job.';
            $deparaRecomendado = false;
        }

        if ($ncm === '' && $grupoModel?->ncm_padrao) {
            $ncm = (string) $grupoModel->ncm_padrao;
            $warnings[] = 'NCM ausente na linha — sugerido padrão do grupo '.$grupo.'.';
        }

        $origem = null;
        if (array_key_exists('origem', $item) && $item['origem'] !== null && $item['origem'] !== '') {
            $origem = (int) $item['origem'];
            if ($origem < 0 || $origem > 8) {
                $origem = null;
            }
        }

        return [
            'familia' => $familia,
            'grupo' => $grupo,
            'ncm' => $ncm !== '' ? $ncm : null,
            'unidade_comercial' => $uCom,
            'unidade_interna' => $uInt,
            'fator_conversao' => '1',
            'descricao_fiscal' => $descricaoFiscal,
            'descricao_comercial' => $descricaoComercial,
            'origem' => $origem,
            'programa_compra' => $programa,
            'confianca' => $confianca,
            'motivo' => $motivo,
            'cprod_generico' => $cprodGenerico,
            'depara_recomendado' => $deparaRecomendado,
            'warnings' => $warnings,
        ];
    }

    public function isCprodGenerico(string $cProd): bool
    {
        $c = mb_strtoupper(trim($cProd));
        if ($c === '') {
            return true;
        }

        return in_array($c, self::CPROD_GENERICOS, true);
    }

    /**
     * @return array{0: string, 1: string, 2: string, 3: string}
     */
    private function classificar(string $ncm, string $xUpper, string $uCom): array
    {
        // Palavras-chave têm prioridade sobre NCM ambíguo (3919 = filme OU fita).
        if ($this->containsAny($xUpper, ['RIBBON', 'AXR1', 'AWR1', 'APR1', 'TODAYTEC', 'ARMOR'])) {
            return ['REV', 'REV-RIB', 'ALTA', 'palavra-chave ribbon'];
        }
        if ($this->containsAny($xUpper, ['TUBETE', 'TUBET'])) {
            return ['EMB', 'EMB-TUB', 'ALTA', 'palavra-chave tubete'];
        }
        if ($this->containsAny($xUpper, ['FACA', 'CILINDRO', 'AMOLACAO', 'AMOLAÇÃO', 'PORTA CLICHE', 'PORTA CLICHÉ'])) {
            return ['FAC', 'FAC', 'ALTA', 'palavra-chave ferramental'];
        }
        if ($this->containsAny($xUpper, ['NYLOFLEX', 'CLICHE', 'CLICHÉ', 'CHAPA'])) {
            return ['FAC', 'FAC', 'MEDIA', 'palavra-chave clichê'];
        }
        if ($this->containsAny($xUpper, ['DUPLA FACE', 'SOFTPRINT', 'FLEXO PRINT', 'FITA MONTAGEM'])) {
            return ['MP', 'MP-ADF', 'ALTA', 'palavra-chave fita montagem'];
        }
        if ($this->containsAny($xUpper, ['FOIL', 'HOT STAMP', 'COLD FOIL', 'GREENFOIL'])) {
            return ['MP', 'MP-CLD', 'ALTA', 'palavra-chave foil'];
        }
        if ($this->containsAny($xUpper, ['TINTA', 'VERNIZ', 'FLEXOCURE', 'ETISTAR', 'DILUENTE', 'REDUTOR', 'FLOTADOR', 'CLEANER'])) {
            return ['MP', 'MP-TIN', 'ALTA', 'palavra-chave tinta/auxiliar'];
        }
        if ($this->containsAny($xUpper, ['LUVA', 'DETERGENTE', 'ALCOOL', 'ÁLCOOL', 'CANETA', 'EPI'])) {
            return ['MP', 'MP-TIN', 'BAIXA', 'consumo/EPI — revisar grupo (não é substrato)'];
        }

        if (strlen($ncm) >= 4) {
            $p4 = substr($ncm, 0, 4);
            $map = [
                '4811' => ['MP', 'MP-PAP', 'ALTA', 'NCM papel autoadesivo'],
                '4810' => ['MP', 'MP-PAP', 'MEDIA', 'NCM papel/tag'],
                '3919' => ['MP', 'MP-FLM', 'ALTA', 'NCM filme autoadesivo'],
                '3920' => ['MP', 'MP-LAM', 'MEDIA', 'NCM filme/laminação'],
                '3215' => ['MP', 'MP-TIN', 'ALTA', 'NCM tinta'],
                '3212' => ['MP', 'MP-CLD', 'ALTA', 'NCM foil/folha'],
                '3402' => ['MP', 'MP-TIN', 'MEDIA', 'NCM auxiliar limpeza'],
                '9612' => ['REV', 'REV-RIB', 'ALTA', 'NCM ribbon'],
                '4822' => ['EMB', 'EMB-TUB', 'ALTA', 'NCM tubete'],
                '4819' => ['EMB', 'EMB-CX', 'ALTA', 'NCM caixa'],
                '3701' => ['FAC', 'FAC', 'ALTA', 'NCM clichê/chapa'],
                '8443' => ['FAC', 'FAC', 'MEDIA', 'NCM partes máquina'],
                '8208' => ['FAC', 'FAC', 'MEDIA', 'NCM facas/lâminas'],
            ];
            if (isset($map[$p4])) {
                return $map[$p4];
            }
        }

        if ($uCom === 'M2') {
            return ['MP', 'MP-PAP', 'BAIXA', 'unidade M² sem NCM claro — conferir papel vs filme'];
        }
        if ($uCom === 'KG') {
            return ['MP', 'MP-TIN', 'BAIXA', 'unidade KG sem NCM claro — conferir tinta vs substrato'];
        }

        return ['MP', 'MP-PAP', 'BAIXA', 'sem sinal forte — humano escolhe o grupo'];
    }

    private function normalizarUnidade(string $u): string
    {
        $u = strtoupper(trim(str_replace('²', '2', $u)));
        if ($u === '') {
            return '';
        }

        $aliases = [
            'PC' => 'UN',
            'PÇ' => 'UN',
            'PÇ.' => 'UN',
            'PT' => 'UN',
            'PR' => 'UN',
            'BB' => 'RL',
            'BT' => 'UN',
            'RLS' => 'RL',
            'ROLO' => 'RL',
            'PACOTE' => 'PCT',
            'PCTE' => 'PCT',
        ];

        if (isset($aliases[$u])) {
            $u = $aliases[$u];
        }

        return UnidadesMedida::isOfficial($u) ? $u : '';
    }

    private function descricaoFiscal(string $xProd, string $cProd): string
    {
        $text = $xProd !== '' ? $xProd : ($cProd !== '' ? 'ITEM '.$cProd : 'PRODUTO NF');
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;
        $text = mb_substr(trim($text), 0, 255);

        return mb_strtoupper($text);
    }

    private function extrairPrograma(string $xUpper): ?string
    {
        if (preg_match('/EXACT\s*(\d{3,4})/', $xUpper, $m)) {
            return 'EXACT '.$m[1];
        }
        if (str_contains($xUpper, 'VERTEX 5030')) {
            return 'VERTEX 5030';
        }

        return null;
    }

    /**
     * @param  list<string>  $needles
     */
    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $n) {
            if ($n !== '' && str_contains($haystack, $n)) {
                return true;
            }
        }

        return false;
    }
}
