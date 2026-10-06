<?php

declare(strict_types=1);

namespace App\Domain\Anexos;

use App\Domain\RegraNegocio;
use App\Models\Demanda;
use App\Models\DemandaAnexo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AnexosService
{
    public function guardar(Demanda $demanda, UploadedFile $arquivo, bool $pacote = false, ?int $mensagemId = null): DemandaAnexo
    {
        $tamanho = (int) $arquivo->getSize();
        $usado = (int) $demanda->anexos()->sum('tamanho');
        if ($usado + $tamanho > 20 * 1024 * 1024) {
            throw new RegraNegocio('Esta demanda atingiu o limite de 20 MB em anexos.');
        }
        $extensao = strtolower($arquivo->extension() ?: $arquivo->getClientOriginalExtension());
        $caminho = $demanda->id.'/'.Str::uuid()->toString().'.'.$extensao;
        Storage::disk('anexos')->put($caminho, (string) file_get_contents($arquivo->getRealPath()));

        return DemandaAnexo::query()->create([
            'demanda_id' => $demanda->id,
            'mensagem_id' => $mensagemId,
            'nome_original' => $this->nomeSeguro($arquivo->getClientOriginalName()),
            'caminho_interno' => $caminho,
            'tamanho' => $tamanho,
            'mime' => (string) $arquivo->getMimeType(),
            'pacote' => $pacote,
            'criado_em' => now(),
        ]);
    }

    private function nomeSeguro(string $nome): string
    {
        $base = basename(str_replace('\\', '/', $nome));
        $base = preg_replace('/[^\pL\pN\.\-_ ]/u', '', $base) ?: 'anexo';

        return mb_substr($base, 0, 180);
    }
}
