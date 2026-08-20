<?php

namespace App\Services\Consulta;

/**
 * Ponto geográfico de um endereço brasileiro.
 *
 * Cadeia: Nominatim (rua + número + município + UF) → BrasilAPI CEP v2.
 * CEP é último recurso (centroide). Falha de provedor não lança.
 */
class GeoEnderecoService
{
    public function __construct(
        private readonly NominatimClient $nominatimClient,
        private readonly BrasilApiClient $brasilApiClient,
    ) {}

    /**
     * @return array{
     *     latitude: string|null,
     *     longitude: string|null,
     *     fonte: string|null,
     *     cache_hit: bool,
     *     sem_ponto: bool,
     *     erro: string|null
     * }
     */
    public function resolver(
        string $logradouro,
        string $numero,
        string $municipio,
        string $uf,
        ?string $cep = null,
    ): array {
        $nom = $this->nominatimClient->searchEndereco($logradouro, $numero, $municipio, $uf);
        if ($nom['latitude'] && $nom['longitude']) {
            return $nom;
        }

        $digits = preg_replace('/\D/', '', (string) $cep) ?? '';
        if (strlen($digits) !== 8) {
            return $nom;
        }

        try {
            return $this->brasilApiClient->getCepGeo($digits);
        } catch (\InvalidArgumentException) {
            return $nom;
        }
    }
}
