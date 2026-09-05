<?php

namespace App\Services\Compras;

use App\Models\DfeDocumento;
use App\Models\Empresa;
use App\Models\Parceiro;
use App\Services\Cadastros\ParceiroXmlImportService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Indicador de fornecedor na caixa DF-e + cadastro via XML do cofre.
 * Reusa ParceiroXmlImportService (preview/commit) — sem segundo escritor.
 */
class DfeFornecedorCadastroService
{
    public const STATUS_CADASTRADO = 'cadastrado';

    public const STATUS_SEM_PAPEL = 'sem_papel';

    public const STATUS_NAO_CADASTRADO = 'nao_cadastrado';

    public const STATUS_PF = 'pf';

    public const STATUS_SEM_CNPJ = 'sem_cnpj';

    public function __construct(
        private readonly ParceiroXmlImportService $xmlImport,
    ) {}

    /**
     * Lookup em lote dos CNPJs emitentes presentes na página (só banco local).
     *
     * @param  list<DfeDocumento>  $docs
     * @return array<string, array{status: string, parceiro_id: ?int, codigo: ?string, razao_social: ?string}>
     */
    public function mapaPorCnpj(Empresa $empresa, array $docs): array
    {
        $cnpjs = [];
        foreach ($docs as $doc) {
            $digits = $this->digitsOrNull($doc->emit_cnpj);
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
            ->get(['id', 'codigo', 'razao_social', 'cnpj_cpf', 'papel_fornecedor']);

        $map = [];
        foreach ($parceiros as $parceiro) {
            $cnpj = $this->digitsOrNull($parceiro->cnpj_cpf);
            if ($cnpj === null) {
                continue;
            }
            $map[$cnpj] = [
                'status' => $parceiro->papel_fornecedor
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
     * @return array{status: string, parceiro_id: ?int, codigo: ?string, razao_social: ?string, pode_cadastrar: bool}
     */
    public function resolverFornecedor(DfeDocumento $doc, array $mapa): array
    {
        $digits = $this->digitsOrNull($doc->emit_cnpj);

        if ($digits === null || $digits === '') {
            return $this->fornecedorOut(self::STATUS_SEM_CNPJ, null, false);
        }

        if (strlen($digits) === 11) {
            return $this->fornecedorOut(self::STATUS_PF, null, false);
        }

        if (strlen($digits) !== 14) {
            return $this->fornecedorOut(self::STATUS_SEM_CNPJ, null, false);
        }

        $hit = $mapa[$digits] ?? null;
        if ($hit === null) {
            return $this->fornecedorOut(
                self::STATUS_NAO_CADASTRADO,
                null,
                $doc->temXml(),
            );
        }

        $pode = $hit['status'] === self::STATUS_SEM_PAPEL && $doc->temXml();

        return [
            'status' => $hit['status'],
            'parceiro_id' => $hit['parceiro_id'],
            'codigo' => $hit['codigo'],
            'razao_social' => $hit['razao_social'],
            'pode_cadastrar' => $pode,
        ];
    }

    /**
     * Simula cadastro do emitente a partir do XML oficial já no cofre.
     *
     * @return array<string, mixed>
     */
    public function preview(Empresa $empresa, DfeDocumento $doc): array
    {
        $this->assertMesmaEmpresa($empresa, $doc);
        $xml = $this->lerXmlCofre($doc);
        $fileName = $this->nomeArquivo($doc);

        return $this->xmlImport->previewOne($empresa, $xml, $fileName, 1);
    }

    /**
     * Confirma cadastro/papel reexecutando o preview no XML do cofre (não confia no payload do cliente).
     *
     * @return array<string, mixed>
     */
    public function commit(Empresa $empresa, DfeDocumento $doc): array
    {
        $this->assertMesmaEmpresa($empresa, $doc);
        $xml = $this->lerXmlCofre($doc);
        $fileName = $this->nomeArquivo($doc);

        $row = $this->xmlImport->previewOne($empresa, $xml, $fileName, 1);
        $acao = (string) ($row['acao'] ?? '');

        if (! in_array($acao, ['criar', 'adicionar_papel'], true)) {
            $msg = match ($acao) {
                'nenhuma' => 'Emitente já está cadastrado como fornecedor nesta empresa.',
                default => 'Não é possível cadastrar o fornecedor a partir deste XML'
                    .(isset($row['errors'][0]) ? ': '.$row['errors'][0] : '.'),
            };
            throw ValidationException::withMessages(['fornecedor' => [$msg]]);
        }

        $commit = $this->xmlImport->commit($empresa, [[
            'line' => 1,
            'acao' => $acao,
            'parceiro_id' => $row['parceiro_id'] ?? ($row['data']['parceiro_id'] ?? null),
            'data' => is_array($row['data'] ?? null) ? $row['data'] : [],
        ]]);

        $falhas = (int) ($commit['falhas'] ?? 0);
        if ($falhas > 0) {
            $err = $commit['rows'][0]['errors'][0] ?? 'Falha ao gravar o fornecedor.';
            throw ValidationException::withMessages(['fornecedor' => [$err]]);
        }

        return $commit;
    }

    private function lerXmlCofre(DfeDocumento $doc): string
    {
        if (! $doc->temXml() || ! filled($doc->xml_path)) {
            throw ValidationException::withMessages([
                'fornecedor' => ['XML completo ainda não está na caixa. Use Buscar XML antes de cadastrar o fornecedor.'],
            ]);
        }

        $disk = Storage::disk((string) config('erp.dfe.xml_disk', 'local'));
        if (! $disk->exists($doc->xml_path)) {
            throw ValidationException::withMessages([
                'fornecedor' => ['Arquivo XML não encontrado no cofre. Tente Buscar XML novamente.'],
            ]);
        }

        $xml = $disk->get($doc->xml_path);
        if (! is_string($xml) || trim($xml) === '') {
            throw ValidationException::withMessages([
                'fornecedor' => ['XML do cofre está vazio ou ilegível.'],
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
     * @return array{status: string, parceiro_id: ?int, codigo: ?string, razao_social: ?string, pode_cadastrar: bool}
     */
    private function fornecedorOut(string $status, ?array $hit, bool $podeCadastrar): array
    {
        return [
            'status' => $status,
            'parceiro_id' => $hit['parceiro_id'] ?? null,
            'codigo' => $hit['codigo'] ?? null,
            'razao_social' => $hit['razao_social'] ?? null,
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
