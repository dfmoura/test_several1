<?php

namespace App\Services\Compras;

use App\Models\DfeDocumento;
use App\Models\Empresa;
use App\Models\Parceiro;
use App\Services\Cadastros\ParceiroXmlImportService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Indicador de transportador na caixa DF-e + cadastro via XML do cofre.
 * Reusa ParceiroXmlImportService (preview/commit transportadora) — sem segundo escritor.
 */
class DfeTransportadorCadastroService
{
    public const STATUS_CADASTRADO = 'cadastrado';

    public const STATUS_SEM_PAPEL = 'sem_papel';

    public const STATUS_NAO_CADASTRADO = 'nao_cadastrado';

    public const STATUS_PF = 'pf';

    public const STATUS_SEM_CNPJ = 'sem_cnpj';

    public const STATUS_AUSENTE = 'ausente';

    public const STATUS_SEM_XML = 'sem_xml';

    public function __construct(
        private readonly ParceiroXmlImportService $xmlImport,
        private readonly DfeTransporteMetaService $transporteMeta,
    ) {}

    /**
     * Lookup em lote dos CNPJs de transportador presentes na página (só banco local).
     *
     * @param  list<DfeDocumento>  $docs
     * @return array<string, array{status: string, parceiro_id: ?int, codigo: ?string, razao_social: ?string}>
     */
    public function mapaPorCnpj(Empresa $empresa, array $docs): array
    {
        $cnpjs = [];
        foreach ($docs as $doc) {
            $digits = $this->digitsOrNull($doc->transp_cnpj);
            if ($digits !== null && strlen($digits) === 14) {
                $cnpjs[$digits] = true;
            }
        }

        if ($cnpjs === []) {
            return [];
        }

        $keys = array_keys($cnpjs);
        $parceiros = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('cnpj_cpf', $keys)
            ->get(['id', 'codigo', 'razao_social', 'cnpj_cpf', 'papel_transportadora']);

        $map = [];
        foreach ($parceiros as $parceiro) {
            $cnpj = $this->digitsOrNull($parceiro->cnpj_cpf);
            if ($cnpj === null) {
                continue;
            }
            $map[$cnpj] = [
                'status' => $parceiro->papel_transportadora
                    ? self::STATUS_CADASTRADO
                    : self::STATUS_SEM_PAPEL,
                'parceiro_id' => $parceiro->id,
                'codigo' => $parceiro->codigo,
                'razao_social' => $parceiro->razao_social,
            ];
        }

        return $map;
    }

    /**
     * @param  array<string, array{status: string, parceiro_id: ?int, codigo: ?string, razao_social: ?string}>  $mapa
     * @return array{
     *   status: string,
     *   parceiro_id: ?int,
     *   codigo: ?string,
     *   razao_social: ?string,
     *   nome_xml: ?string,
     *   cnpj: ?string,
     *   pode_cadastrar: bool
     * }
     */
    public function resolver(DfeDocumento $doc, array $mapa): array
    {
        if (! $doc->temXml()) {
            return $this->out(self::STATUS_SEM_XML, null, null, null, false);
        }

        if (! $doc->transp_extraido) {
            return $this->out(self::STATUS_SEM_XML, null, null, null, false);
        }

        $digits = $this->digitsOrNull($doc->transp_cnpj);
        $nomeXml = $doc->transp_nome;

        if (($digits === null || $digits === '') && ($nomeXml === null || $nomeXml === '')) {
            return $this->out(self::STATUS_AUSENTE, null, null, null, false);
        }

        if ($digits === null || $digits === '') {
            return $this->out(self::STATUS_SEM_CNPJ, null, $nomeXml, null, false);
        }

        if (strlen($digits) === 11) {
            return $this->out(self::STATUS_PF, null, $nomeXml, $digits, false);
        }

        if (strlen($digits) !== 14) {
            return $this->out(self::STATUS_SEM_CNPJ, null, $nomeXml, $digits, false);
        }

        $hit = $mapa[$digits] ?? null;
        if ($hit === null) {
            return $this->out(
                self::STATUS_NAO_CADASTRADO,
                null,
                $nomeXml,
                $digits,
                true,
            );
        }

        $pode = $hit['status'] === self::STATUS_SEM_PAPEL;

        return [
            'status' => $hit['status'],
            'parceiro_id' => $hit['parceiro_id'],
            'codigo' => $hit['codigo'],
            'razao_social' => $hit['razao_social'],
            'nome_xml' => $nomeXml,
            'cnpj' => $digits,
            'pode_cadastrar' => $pode,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function preview(Empresa $empresa, DfeDocumento $doc): array
    {
        $this->assertMesmaEmpresa($empresa, $doc);
        $this->garantirMeta($doc);
        $xml = $this->lerXmlCofre($doc);
        $fileName = $this->nomeArquivo($doc);

        return $this->xmlImport->previewTransportadoraOne($empresa, $xml, $fileName, 1);
    }

    /**
     * @return array<string, mixed>
     */
    public function commit(Empresa $empresa, DfeDocumento $doc): array
    {
        $this->assertMesmaEmpresa($empresa, $doc);
        $this->garantirMeta($doc);
        $xml = $this->lerXmlCofre($doc);
        $fileName = $this->nomeArquivo($doc);

        $row = $this->xmlImport->previewTransportadoraOne($empresa, $xml, $fileName, 1);
        $acao = (string) ($row['acao'] ?? '');

        if (! in_array($acao, ['criar', 'adicionar_papel_transportadora'], true)) {
            $msg = match ($acao) {
                'nenhuma' => 'Transportador já está cadastrado como transportadora nesta empresa.',
                default => 'Não é possível cadastrar o transportador a partir deste XML'
                    .(isset($row['errors'][0]) ? ': '.$row['errors'][0] : '.'),
            };
            throw ValidationException::withMessages(['transportador' => [$msg]]);
        }

        $commit = $this->xmlImport->commit($empresa, [[
            'line' => 1,
            'acao' => $acao,
            'parceiro_id' => $row['parceiro_id'] ?? ($row['data']['parceiro_id'] ?? null),
            'data' => is_array($row['data'] ?? null) ? $row['data'] : [],
        ]]);

        $falhas = (int) ($commit['falhas'] ?? 0);
        if ($falhas > 0) {
            $err = $commit['rows'][0]['errors'][0] ?? 'Falha ao gravar o transportador.';
            throw ValidationException::withMessages(['transportador' => [$err]]);
        }

        return $commit;
    }

    private function garantirMeta(DfeDocumento $doc): void
    {
        if ($doc->transp_extraido || ! $doc->temXml()) {
            return;
        }
        $this->transporteMeta->hidratarEmLote([$doc]);
        $doc->refresh();
    }

    private function lerXmlCofre(DfeDocumento $doc): string
    {
        if (! $doc->temXml() || ! filled($doc->xml_path)) {
            throw ValidationException::withMessages([
                'transportador' => ['XML completo ainda não está na caixa. Use Buscar XML antes de cadastrar o transportador.'],
            ]);
        }

        $disk = Storage::disk((string) config('erp.dfe.xml_disk', 'local'));
        if (! $disk->exists($doc->xml_path)) {
            throw ValidationException::withMessages([
                'transportador' => ['Arquivo XML não encontrado no cofre. Tente Buscar XML novamente.'],
            ]);
        }

        $xml = $disk->get($doc->xml_path);
        if (! is_string($xml) || trim($xml) === '') {
            throw ValidationException::withMessages([
                'transportador' => ['XML do cofre está vazio ou ilegível.'],
            ]);
        }

        return $xml;
    }

    private function nomeArquivo(DfeDocumento $doc): string
    {
        $chave = preg_replace('/\D/', '', (string) ($doc->chave ?? '')) ?: null;
        if ($chave !== null && strlen($chave) === 44) {
            return 'NFe-'.$chave.'.xml';
        }

        return 'NFe-dfe-'.$doc->id.'.xml';
    }

    private function assertMesmaEmpresa(Empresa $empresa, DfeDocumento $doc): void
    {
        if ($doc->empresa_id !== $empresa->id) {
            abort(404);
        }
    }

    /**
     * @return array{
     *   status: string,
     *   parceiro_id: ?int,
     *   codigo: ?string,
     *   razao_social: ?string,
     *   nome_xml: ?string,
     *   cnpj: ?string,
     *   pode_cadastrar: bool
     * }
     */
    private function out(
        string $status,
        ?array $hit,
        ?string $nomeXml,
        ?string $cnpj,
        bool $podeCadastrar,
    ): array {
        return [
            'status' => $status,
            'parceiro_id' => $hit['parceiro_id'] ?? null,
            'codigo' => $hit['codigo'] ?? null,
            'razao_social' => $hit['razao_social'] ?? null,
            'nome_xml' => $nomeXml,
            'cnpj' => $cnpj,
            'pode_cadastrar' => $podeCadastrar,
        ];
    }

    private function digitsOrNull(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $digits = preg_replace('/\D+/', '', $value);

        return $digits !== '' ? $digits : null;
    }
}
