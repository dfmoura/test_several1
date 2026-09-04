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

    public function esgotado(): bool
    {
        return $this->cStat === '137'
            || ($this->ultNsu !== '' && $this->maxNsu !== '' && $this->ultNsu === $this->maxNsu);
    }

    public function consumoIndevido(): bool
    {
        return $this->cStat === '656';
    }
}
