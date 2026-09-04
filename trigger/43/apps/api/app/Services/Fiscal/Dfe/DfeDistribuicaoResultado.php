<?php

namespace App\Services\Fiscal\Dfe;

/**
 * Resposta de uma consulta distNSU ao Ambiente Nacional.
 */
final class DfeDistribuicaoResultado
{
    /**
     * @param  list<DfeDocZip>  $documentos
     */
    public function __construct(
        public readonly string $cStat,
        public readonly string $xMotivo,
        public readonly string $ultNsu,
        public readonly string $maxNsu,
        public readonly array $documentos,
    ) {}

    public function temDocumentos(): bool
    {
        return $this->cStat === '138' && $this->documentos !== [];
    }

    /** cStat de sucesso do DF-e: 137 (vazio) ou 138 (com docs). */
    public function ok(): bool
    {
        return $this->cStat === '137' || $this->cStat === '138';
    }

    public function rejeitado(): bool
    {
        return ! $this->ok() && $this->cStat !== '';
    }

    public function esgotado(): bool
    {
        if ($this->cStat === '137') {
            return true;
        }

        // Só considera “em dia” com NSUs iguais após lote 138 bem-sucedido.
        return $this->cStat === '138'
            && $this->ultNsu !== ''
            && $this->maxNsu !== ''
            && $this->ultNsu === $this->maxNsu;
    }

    public function consumoIndevido(): bool
    {
        return $this->cStat === '656';
    }
}
