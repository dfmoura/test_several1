<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmpresaCertificadoA1 extends Model
{
    protected $table = 'empresa_certificados_a1';

    protected $fillable = [
        'empresa_id',
        'pfx_cipher',
        'senha_cipher',
        'arquivo_nome',
        'tamanho_bytes',
        'subject_cn',
        'issuer_cn',
        'serial',
        'fingerprint_sha256',
        'cnpj_certificado',
        'valido_de',
        'valido_ate',
        'uploaded_by',
        'uploaded_at',
    ];

    protected $hidden = [
        'pfx_cipher',
        'senha_cipher',
    ];

    protected function casts(): array
    {
        return [
            'tamanho_bytes' => 'integer',
            'valido_de' => 'datetime',
            'valido_ate' => 'datetime',
            'uploaded_at' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function estaVigente(?\DateTimeInterface $agora = null): bool
    {
        $now = $agora ?? now();
        if ($this->valido_de && $now->lt($this->valido_de)) {
            return false;
        }
        if ($this->valido_ate && $now->greaterThan($this->valido_ate)) {
            return false;
        }

        return (bool) $this->pfx_cipher;
    }

    /**
     * Identidade operacional da EMP: vigente e CNPJ do A1 = CNPJ cadastrado.
     * Sem CNPJ extraído do certificado não prova a empresa.
     */
    public function aptoParaEmpresa(Empresa $empresa): bool
    {
        return $this->estaVigente() && $this->cnpjBateCom($empresa);
    }

    public function cnpjBateCom(Empresa $empresa): bool
    {
        $emp = preg_replace('/\D/', '', (string) $empresa->cnpj) ?? '';
        $cert = preg_replace('/\D/', '', (string) $this->cnpj_certificado) ?? '';

        return $emp !== '' && $cert !== '' && $emp === $cert;
    }

    public function statusVigencia(?\DateTimeInterface $agora = null): string
    {
        $now = $agora ?? now();
        if ($this->valido_de && $now->lt($this->valido_de)) {
            return 'AINDA_NAO_VALIDO';
        }
        if ($this->valido_ate && $now->greaterThan($this->valido_ate)) {
            return 'VENCIDO';
        }
        $dias = $this->diasParaVencer($now);
        $janela = max(1, (int) config('erp.certificado_a1.alerta_dias', 30));
        if ($dias !== null && $dias <= $janela) {
            return 'A_VENCER';
        }

        return 'VIGENTE';
    }

    public function diasParaVencer(?\DateTimeInterface $agora = null): ?int
    {
        if (! $this->valido_ate) {
            return null;
        }
        $now = \Illuminate\Support\Carbon::parse($agora ?? now())->startOfDay();
        $ate = $this->valido_ate->copy()->startOfDay();

        return (int) $now->diffInDays($ate, false);
    }
}
