<?php

namespace App\Services\Compras;

use App\Models\Empresa;
use App\Models\NfseTomada;
use App\Models\Parceiro;
use App\Services\Cadastros\ParceiroXmlImportService;
use App\Services\Fiscal\Nfse\NfsePrestadorExtractor;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/**
 * Indicador do prestador na caixa de NFS-e e cadastro como fornecedor de serviço.
 * Reusa o escritor de parceiro — sem segundo cadastro e sem o extrator da NF-e modelo 55.
 */
final class NfsePrestadorCadastroService
{
    public const STATUS_CADASTRADO = 'cadastrado';

    public const STATUS_SEM_PAPEL = 'sem_papel';

    public const STATUS_NAO_CADASTRADO = 'nao_cadastrado';

    public const STATUS_PF = 'pf';

    public const STATUS_SEM_CNPJ = 'sem_cnpj';

    public function __construct(
        private readonly ParceiroXmlImportService $xmlImport,
        private readonly NfsePrestadorExtractor $extractor,
    ) {}

    /**
     * @param  list<NfseTomada>  $notas
     * @return array<string, array{status: string, parceiro_id: ?int, codigo: ?string, razao_social: ?string}>
     */
    public function mapaPorCnpj(Empresa $empresa, array $notas): array
    {
        $cnpjs = [];
        foreach ($notas as $nota) {
            $digits = $this->digitsOrNull($nota->emit_cnpj);
            if ($digits !== null && strlen($digits) === 14) {
                $cnpjs[$digits] = true;
            }
        }
        if ($cnpjs === []) {
            return [];
        }

        $parceiros = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('cnpj_cpf', array_keys($cnpjs))
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
    public function resolver(NfseTomada $nota, array $mapa): array
    {
        $digits = $this->digitsOrNull($nota->emit_cnpj);
        if ($digits === null || $digits === '') {
            return $this->saida(self::STATUS_SEM_CNPJ, null, false);
        }
        if (strlen($digits) === 11) {
            return $this->saida(self::STATUS_PF, null, false);
        }
        if (strlen($digits) !== 14) {
            return $this->saida(self::STATUS_SEM_CNPJ, null, false);
        }

        $hit = $mapa[$digits] ?? null;
        if ($hit === null) {
            return $this->saida(self::STATUS_NAO_CADASTRADO, null, $this->temXml($nota));
        }

        $pode = $hit['status'] === self::STATUS_SEM_PAPEL && $this->temXml($nota);

        return [
            'status' => $hit['status'],
            'parceiro_id' => $hit['parceiro_id'],
            'codigo' => $hit['codigo'],
            'razao_social' => $hit['razao_social'],
            'pode_cadastrar' => $pode,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function preview(Empresa $empresa, NfseTomada $nota): array
    {
        $this->assertEmpresa($empresa, $nota);

        return $this->simular($empresa, $nota);
    }

    /**
     * @return array<string, mixed>
     */
    public function commit(Empresa $empresa, NfseTomada $nota): array
    {
        $this->assertEmpresa($empresa, $nota);
        $row = $this->simular($empresa, $nota);
        $acao = (string) ($row['acao'] ?? '');
        if (! in_array($acao, ['criar', 'adicionar_papel'], true)) {
            $msg = match ($acao) {
                'nenhuma' => 'Prestador já está cadastrado como fornecedor nesta empresa.',
                default => 'Não é possível cadastrar o prestador a partir desta NFS-e'
                    .(isset($row['errors'][0]) ? ': '.$row['errors'][0] : '.'),
            };
            throw ValidationException::withMessages(['prestador' => [$msg]]);
        }

        $commit = $this->xmlImport->commit($empresa, [[
            'line' => 1,
            'acao' => $acao,
            'parceiro_id' => $row['parceiro_id'] ?? ($row['data']['parceiro_id'] ?? null),
            'data' => is_array($row['data'] ?? null) ? $row['data'] : [],
        ]]);
        $falhas = (int) ($commit['falhas'] ?? 0);
        if ($falhas > 0) {
            $err = $commit['rows'][0]['errors'][0] ?? 'Falha ao gravar o prestador.';
            throw ValidationException::withMessages(['prestador' => [$err]]);
        }

        return $commit;
    }

    public function temXml(NfseTomada $nota): bool
    {
        $attrs = $nota->getAttributes();
        if (array_key_exists('tem_xml', $attrs)) {
            return (int) $attrs['tem_xml'] === 1;
        }

        return is_string($nota->xml) && trim($nota->xml) !== '';
    }

    /**
     * @return array<string, mixed>
     */
    private function simular(Empresa $empresa, NfseTomada $nota): array
    {
        if (! $this->temXml($nota)) {
            throw ValidationException::withMessages([
                'prestador' => ['XML da NFS-e ainda não está na caixa.'],
            ]);
        }

        try {
            $extracted = $this->extractor->extrair((string) $nota->xml);
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages(['prestador' => [$e->getMessage()]]);
        }

        $emit = is_array($extracted['emit'] ?? null) ? $extracted['emit'] : [];
        $razao = is_string($emit['razao_social'] ?? null) ? trim($emit['razao_social']) : '';
        if ($razao === '') {
            $nome = trim((string) $nota->emit_nome);
            if ($nome !== '') {
                $emit['razao_social'] = $nome;
                $extracted['emit'] = $emit;
            }
        }

        return $this->xmlImport->previewExtracted(
            $empresa,
            $extracted,
            $this->nomeArquivo($nota),
            1,
            [],
            'SERVICO',
        );
    }

    private function nomeArquivo(NfseTomada $nota): string
    {
        $chave = preg_replace('/\D/', '', (string) ($nota->chave ?? '')) ?: '';
        if (strlen($chave) === 50) {
            return 'NFSe-'.$chave.'.xml';
        }

        return 'NFSe-'.$nota->id.'.xml';
    }

    private function assertEmpresa(Empresa $empresa, NfseTomada $nota): void
    {
        if ($nota->empresa_id !== $empresa->id) {
            abort(404);
        }
    }

    /**
     * @param  array{status: string, parceiro_id: ?int, codigo: ?string, razao_social: ?string}|null  $hit
     * @return array{status: string, parceiro_id: ?int, codigo: ?string, razao_social: ?string, pode_cadastrar: bool}
     */
    private function saida(string $status, ?array $hit, bool $podeCadastrar): array
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
