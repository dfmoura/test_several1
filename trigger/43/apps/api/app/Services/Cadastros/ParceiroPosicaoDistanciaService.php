<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Services\Consulta\GeoEnderecoService;
use App\Services\Consulta\OpenRouteServiceClient;
use App\Support\PadraoDecimal;
use Illuminate\Validation\ValidationException;

/**
 * Lista / ação humana: geocodifica o endereço fiscal do PAR e grava km de carro EMP→PAR.
 * Mesma cadeia do formulário (geo → rota); na lista o commit é imediato.
 */
class ParceiroPosicaoDistanciaService
{
    public function __construct(
        private readonly GeoEnderecoService $geoEnderecoService,
        private readonly OpenRouteServiceClient $openRouteServiceClient,
        private readonly ParceiroService $parceiroService,
    ) {}

    /**
     * @return array{parceiro: Parceiro, erro: string|null}
     */
    public function atualizarFiscal(Empresa $empresa, Parceiro $parceiro): array
    {
        if ((int) $parceiro->empresa_id !== (int) $empresa->id) {
            abort(404);
        }

        $logradouro = trim((string) ($parceiro->logradouro ?? ''));
        $numero = trim((string) ($parceiro->numero ?? ''));
        $municipio = trim((string) ($parceiro->municipio ?? ''));
        $uf = strtoupper(trim((string) ($parceiro->uf ?? '')));
        $cepDigits = preg_replace('/\D/', '', (string) ($parceiro->cep ?? '')) ?? '';

        $temEndereco = $logradouro !== '' && $municipio !== '' && strlen($uf) === 2;
        $cepOk = strlen($cepDigits) === 8;
        $pontoExistente = $this->temPonto($parceiro->latitude, $parceiro->longitude);

        if (! $temEndereco && ! $cepOk && ! $pontoExistente) {
            throw ValidationException::withMessages([
                'endereco' => ['Informe o endereço do parceiro (logradouro, município e UF) ou um CEP.'],
            ]);
        }

        $lat = null;
        $lng = null;
        $erro = null;

        if ($temEndereco || $cepOk) {
            $geo = $this->geoEnderecoService->resolver(
                $logradouro,
                $numero,
                $municipio,
                $uf,
                $cepOk ? $cepDigits : null,
            );
            if ($geo['latitude'] && $geo['longitude']) {
                $lat = (string) $geo['latitude'];
                $lng = (string) $geo['longitude'];
            } else {
                $erro = $geo['erro']
                    ?? (! empty($geo['sem_ponto']) ? 'sem_ponto' : 'sem_destino');
            }
        }

        if ($lat === null || $lng === null) {
            if ($pontoExistente) {
                $lat = (string) $parceiro->latitude;
                $lng = (string) $parceiro->longitude;
                $erro = null;
            } else {
                throw ValidationException::withMessages([
                    'posicao' => [$this->mensagemErro($erro ?? 'sem_destino')],
                ]);
            }
        }

        $this->pausaEntreProvedores();

        $distanciaKm = null;
        $distanciaFonte = null;

        if (! $this->openRouteServiceClient->empresaTemOrigem($empresa)) {
            $erro = 'sem_origem';
        } else {
            $rota = $this->openRouteServiceClient->drivingCarKm(
                (string) $empresa->origem_latitude,
                (string) $empresa->origem_longitude,
                $lat,
                $lng,
            );
            $distanciaKm = $rota['distancia_km'];
            $distanciaFonte = $rota['fonte'];
            if ($rota['erro'] !== null) {
                $erro = $rota['erro'];
            }

            // 0 km / mesmo ponto não é rota de carro — grava B, limpa km.
            if ($distanciaFonte === OpenRouteServiceClient::FONTE_MESMO_PONTO
                || $this->kmEhZero($distanciaKm)) {
                $distanciaKm = null;
                $distanciaFonte = null;
                $erro = $erro ?? 'geo_impreciso';
            }
        }

        $payload = [
            'latitude' => $lat,
            'longitude' => $lng,
            'distancia_km' => $distanciaKm,
            'distancia_fonte' => $distanciaFonte,
            'distancia_calculada_em' => $distanciaKm !== null ? now()->toIso8601String() : null,
        ];

        $fresh = $this->parceiroService->update($parceiro, $payload);

        return [
            'parceiro' => $fresh,
            'erro' => $erro,
        ];
    }

    private function temPonto(mixed $lat, mixed $lng): bool
    {
        return $lat !== null && $lat !== '' && $lng !== null && $lng !== '';
    }

    private function kmEhZero(mixed $km): bool
    {
        if ($km === null || $km === '') {
            return false;
        }
        try {
            $canon = PadraoDecimal::parse((string) $km);
        } catch (\InvalidArgumentException) {
            return false;
        }

        return bccomp($canon, '0', PadraoDecimal::SCALE_DISTANCE) === 0;
    }

    /** Cadência Tipo A: pausa entre Nominatim/geo e ORS no mesmo clique humano. */
    private function pausaEntreProvedores(): void
    {
        if (app()->runningUnitTests()) {
            return;
        }
        usleep(800_000);
    }

    private function mensagemErro(string $codigo): string
    {
        return match ($codigo) {
            'sem_origem' => 'Cadastre a origem operacional da empresa (aba Operação).',
            'sem_ponto' => 'Este CEP não tem ponto geográfico.',
            'sem_destino' => 'Não foi possível pesquisar o ponto deste endereço.',
            'cota' => 'Cota temporária do serviço de rota. Tente de novo em instantes.',
            'chave_ausente', 'chave_invalida' => 'Serviço de rota indisponível.',
            'geo_impreciso' => 'CEP impreciso — não é distância de carro.',
            'sem_rota' => 'Não há rota de carro até este ponto.',
            default => 'Consulta de posição indisponível.',
        };
    }
}
