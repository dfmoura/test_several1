<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\EmpresaCertificadoA1;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Cofre A1 por EMP: valida PKCS#12, cifra PFX+senha, expõe só metadados.
 * Sem endpoint de download do PFX (reduz exfiltração).
 */
class EmpresaCertificadoA1Service
{
    public const MAX_BYTES = 2 * 1024 * 1024;

    public const EXTENSOES = ['pfx', 'p12'];

    public function __construct(
        private readonly EmpresaCertificadoCrypto $crypto,
        private readonly AuditLogger $audit,
    ) {}

    /** @return array<string, mixed>|null */
    public function status(Empresa $empresa): ?array
    {
        $row = EmpresaCertificadoA1::query()
            ->where('empresa_id', $empresa->id)
            ->first();

        return $row ? $this->toOut($row, $empresa) : null;
    }

    public function armazenar(Empresa $empresa, UploadedFile $arquivo, string $senha, User $user): array
    {
        $this->validarArquivo($arquivo);
        $bytes = file_get_contents($arquivo->getRealPath() ?: $arquivo->getPathname());
        if ($bytes === false || $bytes === '') {
            throw ValidationException::withMessages([
                'arquivo' => ['Não foi possível ler o arquivo do certificado.'],
            ]);
        }

        if (strlen($bytes) > self::MAX_BYTES) {
            throw ValidationException::withMessages([
                'arquivo' => ['Certificado excede o limite de 2 MB.'],
            ]);
        }

        $meta = $this->lerPkcs12($bytes, $senha);
        $this->recusarCnpjSeExigido($empresa, $meta['cnpj_certificado']);
        $avisoCnpj = $this->avisoCnpj($empresa, $meta['cnpj_certificado']);

        $nome = $this->sanitizarNome($arquivo->getClientOriginalName());

        $row = DB::transaction(function () use ($empresa, $bytes, $senha, $meta, $nome, $user) {
            $existente = EmpresaCertificadoA1::query()
                ->where('empresa_id', $empresa->id)
                ->lockForUpdate()
                ->first();

            $payload = [
                'pfx_cipher' => $this->crypto->criptografarBinario($bytes),
                'senha_cipher' => $this->crypto->criptografarSenha($senha),
                'arquivo_nome' => $nome,
                'tamanho_bytes' => strlen($bytes),
                'subject_cn' => $meta['subject_cn'],
                'issuer_cn' => $meta['issuer_cn'],
                'serial' => $meta['serial'],
                'fingerprint_sha256' => $meta['fingerprint_sha256'],
                'cnpj_certificado' => $meta['cnpj_certificado'],
                'valido_de' => $meta['valido_de'],
                'valido_ate' => $meta['valido_ate'],
                'uploaded_by' => $user->id,
                'uploaded_at' => now(),
            ];

            if ($existente) {
                $existente->fill($payload)->save();

                return $existente->fresh();
            }

            return EmpresaCertificadoA1::query()->create([
                'empresa_id' => $empresa->id,
                ...$payload,
            ]);
        });

        // Zera referências locais (mitigação básica; GC do PHP).
        unset($bytes, $senha);

        $this->audit->log('UPSERT', 'empresa_certificado_a1', $row->id, null, [
            'empresa_id' => $empresa->id,
            'fingerprint_sha256' => $row->fingerprint_sha256,
            'valido_ate' => $row->valido_ate?->toIso8601String(),
            'subject_cn' => $row->subject_cn,
        ]);

        $out = $this->toOut($row, $empresa);
        if ($avisoCnpj !== null) {
            $out['aviso'] = $avisoCnpj;
        }

        return $out;
    }

    public function aptoParaOperar(Empresa $empresa): bool
    {
        $row = EmpresaCertificadoA1::query()
            ->where('empresa_id', $empresa->id)
            ->first();

        return $row !== null && $row->aptoParaEmpresa($empresa);
    }

    public function mensagemBloqueioOperacao(Empresa $empresa): string
    {
        $row = EmpresaCertificadoA1::query()
            ->where('empresa_id', $empresa->id)
            ->first();

        if ($row === null) {
            return 'Cadastre o certificado A1 desta empresa (arquivo .pfx/.p12 com o mesmo CNPJ) para enviar a proposta.';
        }
        if (! $row->estaVigente()) {
            return 'O certificado A1 desta empresa está vencido ou ainda não é válido. Substitua na ficha da empresa.';
        }
        if (! $row->cnpjBateCom($empresa)) {
            return 'O certificado A1 precisa ser o da empresa cadastrada: o CNPJ do arquivo deve ser o mesmo do cadastro.';
        }

        return 'Cadastre um certificado A1 válido desta empresa para enviar a proposta.';
    }

    public function hintCockpit(Empresa $empresa): string
    {
        $row = EmpresaCertificadoA1::query()
            ->where('empresa_id', $empresa->id)
            ->first();

        if ($row !== null && $row->aptoParaEmpresa($empresa)) {
            $status = $row->statusVigencia();
            if ($status === 'A_VENCER') {
                $dias = $row->diasParaVencer();
                $ate = $row->valido_ate?->format('d/m/Y');

                return $dias === 0
                    ? 'Vence hoje ('.$ate.') — substitua antes de bloquear o envio'
                    : ($dias === 1
                        ? 'Vence amanhã ('.$ate.') — substitua na ficha da empresa'
                        : 'Vence em '.$dias.' dias ('.$ate.') — substitua na ficha da empresa');
            }

            return 'Válido e com o CNPJ desta empresa';
        }

        if ($row === null) {
            return 'Arquivo .pfx/.p12 desta empresa — validade e CNPJ conferidos no cofre';
        }
        if (! $row->estaVigente()) {
            return 'Vencido ou fora da validade — substitua na ficha da empresa';
        }
        if (! $row->cnpjBateCom($empresa)) {
            return 'O CNPJ do certificado não é o desta empresa';
        }

        return 'Pendente — envie um A1 válido desta empresa';
    }

    /**
     * Metadados de alerta/pendência do A1 para /ativacao e banner (padrão cortesia/IE).
     * Detecção automática via valido_ate — sem cron para o gate; cron só ops opcional.
     *
     * @return array{
     *   pendente: bool,
     *   alerta: bool,
     *   alerta_nivel: 'info'|'warning'|'urgent'|null,
     *   status: ?string,
     *   dias_para_vencer: ?int,
     *   valido_ate: ?string,
     *   mensagem: ?string,
     *   pendencias: list<string>
     * }
     */
    public function alertaOperacao(Empresa $empresa): array
    {
        $row = EmpresaCertificadoA1::query()
            ->where('empresa_id', $empresa->id)
            ->first();

        if ($row === null) {
            return [
                'pendente' => true,
                'alerta' => true,
                'alerta_nivel' => 'urgent',
                'status' => null,
                'dias_para_vencer' => null,
                'valido_ate' => null,
                'mensagem' => 'Cadastre o certificado A1 desta empresa para liberar o envio da proposta.',
                'pendencias' => ['Certificado A1 (.pfx/.p12) desta empresa'],
            ];
        }

        $status = $row->statusVigencia();
        $dias = $row->diasParaVencer();
        $validoAte = $row->valido_ate?->toDateString();
        $apto = $row->aptoParaEmpresa($empresa);
        $pendencias = $this->pendenciasCadastro($row, $empresa, $status);

        if (! $apto) {
            return [
                'pendente' => true,
                'alerta' => true,
                'alerta_nivel' => 'urgent',
                'status' => $status,
                'dias_para_vencer' => $dias,
                'valido_ate' => $validoAte,
                'mensagem' => $this->mensagemBloqueioOperacao($empresa),
                'pendencias' => $pendencias,
            ];
        }

        if ($status === 'A_VENCER') {
            $nivel = ($dias !== null && $dias <= 7) ? 'urgent' : 'warning';
            $ateFmt = $row->valido_ate?->format('d/m/Y') ?? '—';
            $msg = match (true) {
                $dias === 0 => "O certificado A1 vence hoje ({$ateFmt}). Substitua para não bloquear o envio.",
                $dias === 1 => "O certificado A1 vence amanhã ({$ateFmt}). Substitua na ficha da empresa.",
                default => "O certificado A1 vence em {$dias} dia(s) ({$ateFmt}). Substitua antes do vencimento.",
            };

            return [
                'pendente' => false,
                'alerta' => true,
                'alerta_nivel' => $nivel,
                'status' => $status,
                'dias_para_vencer' => $dias,
                'valido_ate' => $validoAte,
                'mensagem' => $msg,
                'pendencias' => $pendencias,
            ];
        }

        return [
            'pendente' => false,
            'alerta' => false,
            'alerta_nivel' => null,
            'status' => $status,
            'dias_para_vencer' => $dias,
            'valido_ate' => $validoAte,
            'mensagem' => null,
            'pendencias' => [],
        ];
    }

    /**
     * @return list<string>
     */
    private function pendenciasCadastro(EmpresaCertificadoA1 $row, Empresa $empresa, string $status): array
    {
        $itens = [];
        if ($status === 'VENCIDO' || $status === 'AINDA_NAO_VALIDO') {
            $itens[] = $status === 'VENCIDO'
                ? 'Certificado A1 vencido — substitua o arquivo'
                : 'Certificado A1 ainda não válido — aguarde a vigência ou substitua';
        } elseif ($status === 'A_VENCER') {
            $dias = $row->diasParaVencer();
            $ate = $row->valido_ate?->format('d/m/Y') ?? '—';
            $itens[] = $dias === null
                ? "Certificado A1 a vencer ({$ate})"
                : "Certificado A1 a vencer em {$dias} dia(s) ({$ate})";
        }
        if (! $row->cnpjBateCom($empresa)) {
            $itens[] = 'CNPJ do certificado deve ser o mesmo do cadastro da empresa';
        }

        return $itens;
    }

    public function remover(Empresa $empresa): void
    {
        $row = EmpresaCertificadoA1::query()
            ->where('empresa_id', $empresa->id)
            ->first();

        if (! $row) {
            return;
        }

        $id = $row->id;
        $fp = $row->fingerprint_sha256;
        $row->delete();

        $this->audit->log('REMOVER', 'empresa_certificado_a1', $id, [
            'fingerprint_sha256' => $fp,
        ], null);
    }

    /**
     * @return array{
     *   subject_cn: ?string,
     *   issuer_cn: ?string,
     *   serial: ?string,
     *   fingerprint_sha256: string,
     *   cnpj_certificado: ?string,
     *   valido_de: ?\Illuminate\Support\Carbon,
     *   valido_ate: ?\Illuminate\Support\Carbon
     * }
     */
    private function lerPkcs12(string $bytes, string $senha): array
    {
        if (! function_exists('openssl_pkcs12_read')) {
            throw ValidationException::withMessages([
                'arquivo' => ['Extensão OpenSSL indisponível no servidor.'],
            ]);
        }

        $certs = [];
        while (openssl_error_string() !== false) {
            // fila residual do OpenSSL — só os erros desta leitura importam
        }
        $ok = @openssl_pkcs12_read($bytes, $certs, $senha);
        if (! $ok || empty($certs['cert'])) {
            throw ValidationException::withMessages($this->mensagensFalhaPkcs12());
        }

        $parsed = openssl_x509_parse($certs['cert']);
        if ($parsed === false) {
            throw ValidationException::withMessages([
                'arquivo' => ['Certificado A1 ilegível após abertura do PKCS#12.'],
            ]);
        }

        $fp = openssl_x509_fingerprint($certs['cert'], 'sha256', false);
        if (! is_string($fp) || $fp === '') {
            throw ValidationException::withMessages([
                'arquivo' => ['Não foi possível calcular a impressão digital do certificado.'],
            ]);
        }

        $subject = is_array($parsed['subject'] ?? null) ? $parsed['subject'] : [];
        $issuer = is_array($parsed['issuer'] ?? null) ? $parsed['issuer'] : [];

        $subjectCn = $this->cnDe($subject);
        $issuerCn = $this->cnDe($issuer);
        $serial = isset($parsed['serialNumberHex'])
            ? strtoupper((string) $parsed['serialNumberHex'])
            : (isset($parsed['serialNumber']) ? (string) $parsed['serialNumber'] : null);

        $tz = (string) config('app.timezone', 'UTC');
        $de = isset($parsed['validFrom_time_t'])
            ? \Illuminate\Support\Carbon::createFromTimestampUTC((int) $parsed['validFrom_time_t'])->timezone($tz)
            : null;
        $ate = isset($parsed['validTo_time_t'])
            ? \Illuminate\Support\Carbon::createFromTimestampUTC((int) $parsed['validTo_time_t'])->timezone($tz)
            : null;

        if ($ate && $ate->isPast()) {
            throw ValidationException::withMessages([
                'arquivo' => ['Este certificado A1 está vencido (válido até '.$ate->format('d/m/Y').').'],
            ]);
        }

        return [
            'subject_cn' => $subjectCn,
            'issuer_cn' => $issuerCn,
            'serial' => $serial,
            'fingerprint_sha256' => strtolower($fp),
            'cnpj_certificado' => $this->extrairCnpj($subject, $subjectCn)
                ?? $this->extrairCnpjDeTexto((string) ($parsed['name'] ?? '')),
            'valido_de' => $de,
            'valido_ate' => $ate,
        ];
    }

    /**
     * Mensagem de falha do PKCS#12 sem vazar dump do OpenSSL.
     *
     * @return array<string, list<string>>
     */
    private function mensagensFalhaPkcs12(): array
    {
        $blob = '';
        while (($msg = openssl_error_string()) !== false) {
            $blob .= ' '.$msg;
        }
        $blob = mb_strtolower($blob);

        if (str_contains($blob, 'mac verify') || str_contains($blob, 'pkcs12 mac')) {
            return [
                'senha' => ['Senha incorreta para este certificado A1.'],
                'arquivo' => ['Não foi possível abrir o arquivo com a senha informada.'],
            ];
        }

        if (
            str_contains($blob, 'unsupported')
            || str_contains($blob, 'legacy')
            || str_contains($blob, 'digital envelope routines')
            || str_contains($blob, 'evp_decrypt')
        ) {
            return [
                'arquivo' => ['Não foi possível abrir este A1 (formato PKCS#12 antigo). Confirme a senha; se persistir, o servidor precisa do provedor OpenSSL legacy.'],
                'senha' => ['Confira a senha do arquivo .pfx/.p12.'],
            ];
        }

        return [
            'senha' => ['Senha incorreta ou arquivo PKCS#12 inválido.'],
            'arquivo' => ['Não foi possível abrir o certificado A1 (.pfx/.p12).'],
        ];
    }

    private function validarArquivo(UploadedFile $arquivo): void
    {
        $ext = strtolower((string) $arquivo->getClientOriginalExtension());
        if (! in_array($ext, self::EXTENSOES, true)) {
            throw ValidationException::withMessages([
                'arquivo' => ['Envie um certificado A1 no formato .pfx ou .p12.'],
            ]);
        }

        if ($arquivo->getSize() !== null && $arquivo->getSize() > self::MAX_BYTES) {
            throw ValidationException::withMessages([
                'arquivo' => ['Certificado excede o limite de 2 MB.'],
            ]);
        }
    }

    private function sanitizarNome(?string $nome): string
    {
        $base = basename((string) $nome);
        $base = preg_replace('/[^\w.\- ()\[\]]+/u', '_', $base) ?? 'certificado.pfx';
        $base = trim($base);
        if ($base === '' || $base === '.' || $base === '..') {
            return 'certificado.pfx';
        }

        return mb_substr($base, 0, 255);
    }

    /** @param  array<string, mixed>  $dn */
    private function cnDe(array $dn): ?string
    {
        $cn = $dn['CN'] ?? $dn['commonName'] ?? null;
        if (is_array($cn)) {
            $cn = $cn[0] ?? null;
        }

        return is_string($cn) && $cn !== '' ? mb_substr($cn, 0, 255) : null;
    }

    /** @param  array<string, mixed>  $subject */
    private function extrairCnpj(array $subject, ?string $subjectCn): ?string
    {
        $candidatos = [];
        foreach (['CN', 'serialNumber', 'organizationIdentifier', 'OU', 'O'] as $key) {
            $v = $subject[$key] ?? null;
            if (is_array($v)) {
                foreach ($v as $item) {
                    if (is_string($item)) {
                        $candidatos[] = $item;
                    }
                }
            } elseif (is_string($v)) {
                $candidatos[] = $v;
            }
        }
        if ($subjectCn) {
            $candidatos[] = $subjectCn;
        }
        foreach ($subject as $v) {
            if (is_string($v)) {
                $candidatos[] = $v;
            } elseif (is_array($v)) {
                foreach ($v as $item) {
                    if (is_string($item)) {
                        $candidatos[] = $item;
                    }
                }
            }
        }

        foreach ($candidatos as $texto) {
            $achado = $this->extrairCnpjDeTexto($texto);
            if ($achado !== null) {
                return $achado;
            }
        }

        return null;
    }

    private function extrairCnpjDeTexto(string $texto): ?string
    {
        if (preg_match('/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/', $texto, $m)) {
            $digits = preg_replace('/\D/', '', $m[1]) ?? '';
            if (strlen($digits) === 14) {
                return $digits;
            }
        }
        $only = preg_replace('/\D/', '', $texto) ?? '';
        if (strlen($only) === 14) {
            return $only;
        }

        return null;
    }

    private function exigeCnpjIdenticoNoUpload(): bool
    {
        return (bool) config('erp.certificado_a1.exige_cnpj_identico', false);
    }

    private function recusarCnpjSeExigido(Empresa $empresa, ?string $cnpjCert): void
    {
        if (! $this->exigeCnpjIdenticoNoUpload()) {
            return;
        }

        $emp = preg_replace('/\D/', '', (string) $empresa->cnpj) ?? '';
        $cert = preg_replace('/\D/', '', (string) $cnpjCert) ?? '';

        if ($emp === '') {
            throw ValidationException::withMessages([
                'arquivo' => ['Cadastre o CNPJ da empresa antes de enviar o certificado A1.'],
            ]);
        }
        if ($cert === '') {
            throw ValidationException::withMessages([
                'arquivo' => ['Não foi possível identificar o CNPJ no certificado A1. Use o A1 da empresa cadastrada.'],
            ]);
        }
        if ($emp !== $cert) {
            throw ValidationException::withMessages([
                'arquivo' => [$this->avisoCnpj($empresa, $cnpjCert) ?? 'O CNPJ do certificado difere do CNPJ da empresa.'],
            ]);
        }
    }

    private function avisoCnpj(Empresa $empresa, ?string $cnpjCert): ?string
    {
        $emp = preg_replace('/\D/', '', (string) $empresa->cnpj) ?? '';
        if ($emp === '' || $cnpjCert === null || $cnpjCert === '') {
            return null;
        }
        if ($emp === $cnpjCert) {
            return null;
        }

        return 'O CNPJ do certificado ('.$this->maskCnpj($cnpjCert).') difere do CNPJ da empresa ('.$this->maskCnpj($emp).'). Confira se o A1 é o correto para esta EMP.';
    }

    private function maskCnpj(string $digits): string
    {
        $d = preg_replace('/\D/', '', $digits) ?? '';
        if (strlen($d) !== 14) {
            return $digits;
        }

        return substr($d, 0, 2).'.'.substr($d, 2, 3).'.'.substr($d, 5, 3).'/'.substr($d, 8, 4).'-'.substr($d, 12, 2);
    }

    /** @return array<string, mixed> */
    private function toOut(EmpresaCertificadoA1 $row, Empresa $empresa): array
    {
        $dias = $row->diasParaVencer();
        $status = $row->statusVigencia();
        $pendencias = $this->pendenciasCadastro($row, $empresa, $status);
        $alerta = $this->alertaOperacao($empresa);

        return [
            'cadastrado' => true,
            'arquivo_nome' => $row->arquivo_nome,
            'tamanho_bytes' => $row->tamanho_bytes,
            'subject_cn' => $row->subject_cn,
            'issuer_cn' => $row->issuer_cn,
            'serial' => $row->serial,
            'fingerprint_sha256' => $row->fingerprint_sha256,
            'cnpj_certificado' => $row->cnpj_certificado,
            'cnpj_bate_com_empresa' => $row->cnpjBateCom($empresa),
            'apto_operacao' => $row->aptoParaEmpresa($empresa),
            'valido_de' => $row->valido_de?->toIso8601String(),
            'valido_ate' => $row->valido_ate?->toIso8601String(),
            'dias_para_vencer' => $dias,
            'status' => $status,
            'alerta' => $alerta['alerta'],
            'alerta_nivel' => $alerta['alerta_nivel'],
            'pendencias' => $pendencias,
            'uploaded_at' => $row->uploaded_at?->toIso8601String(),
            'uploaded_by' => $row->uploaded_by,
            'tem_senha' => true,
            'aviso_cofre' => 'O arquivo e a senha ficam cifrados no servidor (APP_KEY). A API nunca devolve o PFX nem a senha. Emissão de NF-e/NFS-e continua pelo hub Focus quando configurado.',
        ];
    }
}
