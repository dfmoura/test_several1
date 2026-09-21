<?php

namespace App\Services\Comercial;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\OrcamentoLinkAprovacao;
use App\Support\ArteModeloUrl;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Arte visual por modelo (SVG/PNG…) — EMP-scoped, fora do motor.
 * Auth: stream com Sanctum. Público: stream amarrado ao token da proposta.
 */
final class OrcArteModeloService
{
    public const MAX_KB = 2048;

    /** @var array<string, string> */
    private const MIME_EXT = [
        'image/svg+xml' => 'svg',
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/webp' => 'webp',
    ];

    /**
     * @return array{arte_url: string, preview_url: string}
     */
    public function store(Empresa $empresa, UploadedFile $file): array
    {
        $mime = (string) ($file->getMimeType() ?: '');
        $ext = self::MIME_EXT[$mime] ?? null;
        if ($ext === null) {
            $guess = strtolower((string) $file->getClientOriginalExtension());
            if (in_array($guess, ArteModeloUrl::EXTENSIONS, true)) {
                $ext = $guess === 'jpeg' ? 'jpg' : $guess;
            }
        }
        if ($ext === null) {
            throw ValidationException::withMessages([
                'file' => ['Envie SVG, PNG, JPG ou WebP.'],
            ]);
        }

        $uuid = (string) Str::uuid();
        $arquivo = $uuid.'.'.$ext;
        $path = $this->diskPath($empresa->id, $arquivo);
        $contents = file_get_contents($file->getRealPath());
        if ($contents === false || $contents === '') {
            throw ValidationException::withMessages([
                'file' => ['Não foi possível ler o arquivo.'],
            ]);
        }

        if ($ext === 'svg' && $this->svgLooksUnsafe($contents)) {
            throw ValidationException::withMessages([
                'file' => ['SVG inválido ou com conteúdo não permitido.'],
            ]);
        }

        $disk = Storage::disk('local');
        $disk->put($path, $contents);
        $this->ensureReadable($empresa->id, $arquivo);

        $ref = ArteModeloUrl::makeInternalRef((int) $empresa->id, $arquivo);

        return [
            'arte_url' => $ref,
            // Path autenticado — o SPA carrega via Bearer → blob (img não envia token).
            'preview_url' => $this->authStreamPath($ref),
        ];
    }

    /**
     * Path relativo /api/v1/... para fetch autenticado no SPA.
     */
    public function authStreamPath(?string $arteUrl): ?string
    {
        $arteUrl = ArteModeloUrl::normalize($arteUrl);
        if ($arteUrl === null) {
            return null;
        }
        if (! ArteModeloUrl::isInternalRef($arteUrl)) {
            return $arteUrl;
        }
        $parsed = ArteModeloUrl::parseInternal($arteUrl);
        if ($parsed === null) {
            return null;
        }

        return sprintf(
            '/api/v1/orc-arte-modelos/%d/%s',
            $parsed['empresa_id'],
            $parsed['arquivo']
        );
    }

    /**
     * Path público amarrado ao token da proposta (img src sem login).
     */
    public function publicStreamPath(?string $arteUrl, string $token): ?string
    {
        $arteUrl = ArteModeloUrl::normalize($arteUrl);
        if ($arteUrl === null) {
            return null;
        }
        if (! ArteModeloUrl::isInternalRef($arteUrl)) {
            return $arteUrl;
        }
        $parsed = ArteModeloUrl::parseInternal($arteUrl);
        if ($parsed === null) {
            return null;
        }

        return sprintf(
            '/api/v1/publico/orcamentos/%s/arte/%d/%s',
            rawurlencode($token),
            $parsed['empresa_id'],
            $parsed['arquivo']
        );
    }

    /**
     * URL para o DTO comercial: público com token, senão ref interna (SPA resolve com Bearer).
     */
    public function dtoArteUrl(?string $arteUrl, ?string $token): ?string
    {
        $arteUrl = ArteModeloUrl::normalize($arteUrl);
        if ($arteUrl === null) {
            return null;
        }
        if ($token !== null && $token !== '') {
            return $this->publicStreamPath($arteUrl, $token);
        }

        return $arteUrl;
    }

    public function streamForEmpresa(Empresa $empresa, int $empresaId, string $arquivo): StreamedResponse
    {
        if ((int) $empresa->id !== $empresaId) {
            abort(404);
        }

        return $this->stream($empresaId, $arquivo);
    }

    public function streamForPropostaToken(string $token, int $empresaId, string $arquivo): StreamedResponse
    {
        $token = trim($token);
        if ($token === '' || strlen($token) < 20) {
            throw new HttpException(404, 'Proposta não encontrada.');
        }

        $link = OrcamentoLinkAprovacao::query()
            ->with(['orcamento.itens'])
            ->where('token', $token)
            ->first();
        if ($link === null || $link->orcamento === null || $link->orcamento->trashed()) {
            abort(404);
        }

        $orcamento = $link->orcamento;
        if ((int) $orcamento->empresa_id !== $empresaId) {
            abort(404);
        }

        $ref = ArteModeloUrl::makeInternalRef($empresaId, strtolower($arquivo));
        if (! $this->orcamentoReferenciaArte($orcamento, $ref)) {
            abort(404);
        }

        return $this->stream($empresaId, $arquivo);
    }

    public function stream(int $empresaId, string $arquivo): StreamedResponse
    {
        $arquivo = strtolower($arquivo);
        $parsed = ArteModeloUrl::parseInternal(
            ArteModeloUrl::makeInternalRef($empresaId, $arquivo)
        );
        if ($parsed === null) {
            abort(404);
        }

        $path = $this->diskPath($empresaId, $arquivo);
        $disk = Storage::disk('local');
        if (! $disk->exists($path)) {
            abort(404);
        }

        $mime = $this->mimeForArquivo($arquivo);

        return $disk->response($path, $arquivo, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    public function diskPath(int $empresaId, string $arquivo): string
    {
        return sprintf('orc-artes/%d/%s', $empresaId, strtolower($arquivo));
    }

    public function orcamentoReferenciaArte(Orcamento $orcamento, string $ref): bool
    {
        $input = is_array($orcamento->input_snapshot) ? $orcamento->input_snapshot : [];
        if ($this->composicaoTemArte($input['modelos_composicao'] ?? null, $ref)) {
            return true;
        }
        $itens = $input['itens'] ?? null;
        if (is_array($itens)) {
            foreach ($itens as $item) {
                if (! is_array($item)) {
                    continue;
                }
                if ($this->composicaoTemArte($item['modelos_composicao'] ?? null, $ref)) {
                    return true;
                }
            }
        }
        // Itens persistidos (ADR_ORC_ITENS)
        $orcamento->loadMissing('itens');
        foreach ($orcamento->itens as $item) {
            $snap = is_array($item->input_snapshot) ? $item->input_snapshot : [];
            if ($this->composicaoTemArte($snap['modelos_composicao'] ?? null, $ref)) {
                return true;
            }
        }

        return false;
    }

    private function composicaoTemArte(mixed $raw, string $ref): bool
    {
        if (! is_array($raw)) {
            return false;
        }
        foreach ($raw as $row) {
            if (! is_array($row)) {
                continue;
            }
            $got = ArteModeloUrl::normalize($row['arte_url'] ?? null);
            if ($got !== null && strcasecmp($got, $ref) === 0) {
                return true;
            }
        }

        return false;
    }

    private function ensureReadable(int $empresaId, string $arquivo): void
    {
        $root = Storage::disk('local')->path('');
        $dir = rtrim($root, '/').'/orc-artes/'.$empresaId;
        $file = $dir.'/'.strtolower($arquivo);
        if (is_dir(dirname($dir))) {
            @chmod(dirname($dir), 0755);
        }
        if (is_dir($dir)) {
            @chmod($dir, 0755);
        }
        if (is_file($file)) {
            @chmod($file, 0644);
        }
    }

    private function mimeForArquivo(string $arquivo): string
    {
        $ext = strtolower(pathinfo($arquivo, PATHINFO_EXTENSION));

        return match ($ext) {
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            default => 'application/octet-stream',
        };
    }

    private function svgLooksUnsafe(string $svg): bool
    {
        $lower = strtolower($svg);
        foreach (['<script', 'javascript:', 'onload=', 'onerror=', '<foreignobject', 'data:text/html'] as $bad) {
            if (str_contains($lower, $bad)) {
                return true;
            }
        }

        return ! str_contains($lower, '<svg');
    }
}
