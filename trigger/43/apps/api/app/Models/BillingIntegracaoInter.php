<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Credenciais Inter da instalação (mensalidade conta → TRIGGER). Singleton lógico. */
class BillingIntegracaoInter extends Model
{
    protected $table = 'billing_integracao_inter';

    protected $fillable = [
        'operador',
        'client_id_cipher',
        'client_secret_cipher',
        'cert_pem_cipher',
        'key_pem_cipher',
        'ambiente',
        'webhook_secret_cipher',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
        ];
    }

    public function temCredenciais(): bool
    {
        return $this->ativo
            && filled($this->client_id_cipher)
            && filled($this->client_secret_cipher)
            && filled($this->cert_pem_cipher)
            && filled($this->key_pem_cipher);
    }

    public static function atual(): ?self
    {
        return self::query()->orderByDesc('id')->first();
    }
}
