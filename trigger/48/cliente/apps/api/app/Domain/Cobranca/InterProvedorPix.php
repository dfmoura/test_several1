<?php

declare(strict_types=1);

namespace App\Domain\Cobranca;

use App\Domain\RegraNegocio;
use App\Models\CobrancaPix;
use App\Models\Parametro;
use App\Suporte\Dinheiro;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class InterProvedorPix implements ProvedorPix
{
    public function criar(CobrancaPix $cobranca): string
    {
        $minutos = Parametro::inteiro('EXPIRACAO_PIX_MINUTOS');
        $resposta = $this->http()->put($this->base().'/pix/v2/cob/'.$cobranca->txid, [
            'calendario' => ['expiracao' => $minutos * 60],
            'valor' => ['original' => number_format($cobranca->valor_centavos / 100, 2, '.', '')],
            'chave' => $this->chave(),
            'solicitacaoPagador' => match ($cobranca->finalidade) {
                'ATIVACAO' => 'Ativação da área do cliente Trigger',
                'RECARGA' => 'Recarga de saldo Trigger',
                default => 'Complemento da fatura Trigger',
            },
        ]);
        if (! $resposta->successful()) {
            throw new RegraNegocio('Não foi possível emitir o PIX no Banco Inter.');
        }
        $copia = (string) $resposta->json('pixCopiaECola');
        if ($copia === '') {
            throw new RegraNegocio('O Banco Inter não devolveu o código PIX.');
        }

        return $copia;
    }

    public function consultar(CobrancaPix $cobranca): ResultadoConsulta
    {
        $resposta = $this->http()->get($this->base().'/pix/v2/cob/'.$cobranca->txid);
        if (! $resposta->successful()) {
            throw new RegraNegocio('Não foi possível consultar o PIX no Banco Inter.');
        }
        $statusBanco = (string) $resposta->json('status');
        $lista = $resposta->json('pix');
        $pix = is_array($lista) ? ($lista[0] ?? null) : null;
        $endToEnd = is_array($pix) ? ($pix['endToEndId'] ?? null) : null;
        $valor = is_array($pix) && isset($pix['valor']) ? Dinheiro::centavosDePix((string) $pix['valor']) : null;
        $status = match ($statusBanco) {
            'CONCLUIDA' => 'PAGA',
            'REMOVIDA_PELO_USUARIO_RECEBEDOR', 'REMOVIDA_PELO_PSP' => 'CANCELADA',
            default => 'ATIVA',
        };

        return new ResultadoConsulta($status, $endToEnd, $valor);
    }

    public function cancelar(CobrancaPix $cobranca): void
    {
        $resposta = $this->http()->patch($this->base().'/pix/v2/cob/'.$cobranca->txid, [
            'status' => 'REMOVIDA_PELO_USUARIO_RECEBEDOR',
        ]);
        if (! $resposta->successful()) {
            throw new RegraNegocio('Não foi possível cancelar o PIX no Banco Inter.');
        }
    }

    private function http(): \Illuminate\Http\Client\PendingRequest
    {
        $cert = (string) config('pix.inter.cert');
        $key = (string) config('pix.inter.key');
        if ($cert === '' || $key === '' || ! is_file($cert) || ! is_file($key)) {
            throw new RegraNegocio('Certificado do Banco Inter não está configurado nesta máquina.');
        }

        return Http::withOptions(['cert' => $cert, 'ssl_key' => $key])
            ->withToken($this->token())
            ->acceptJson()
            ->timeout(20);
    }

    private function token(): string
    {
        return Cache::remember('pix.inter.token', 240, function () {
            $cert = (string) config('pix.inter.cert');
            $key = (string) config('pix.inter.key');
            $resposta = Http::withOptions(['cert' => $cert, 'ssl_key' => $key])
                ->asForm()
                ->timeout(20)
                ->post((string) config('pix.inter.token_url'), [
                    'client_id' => config('pix.inter.client_id'),
                    'client_secret' => config('pix.inter.client_secret'),
                    'grant_type' => 'client_credentials',
                    'scope' => 'cob.write cob.read',
                ]);
            if (! $resposta->successful()) {
                throw new RegraNegocio('Não foi possível autenticar no Banco Inter.');
            }

            return (string) $resposta->json('access_token');
        });
    }

    private function base(): string
    {
        return rtrim((string) config('pix.inter.base_url'), '/');
    }

    private function chave(): string
    {
        $chave = (string) config('pix.inter.chave');
        if ($chave === '') {
            throw new RegraNegocio('A chave PIX da Trigger não está configurada.');
        }

        return $chave;
    }
}
