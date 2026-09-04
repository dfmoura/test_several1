<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\EmpresaCertificadoA1;
use RuntimeException;

/**
 * Materializa o A1 do cofre em arquivo temporário (0600) para mTLS DF-e.
 * Sempre chamar liberar() no finally — nunca logar senha/PFX.
 */
final class EmpresaCertificadoA1Materializer
{
    public function __construct(
        private readonly EmpresaCertificadoCrypto $crypto,
        private readonly EmpresaCertificadoA1Service $a1,
    ) {}

    /**
     * @return array{path: string, senha: string, row_id: int}
     */
    public function materializar(Empresa $empresa): array
    {
        if (! $this->a1->aptoParaOperar($empresa)) {
            throw new RuntimeException('Certificado A1 desta empresa não está apto para DF-e.');
        }

        $row = EmpresaCertificadoA1::query()
            ->where('empresa_id', $empresa->id)
            ->first();
        if ($row === null || ! $row->pfx_cipher || ! $row->senha_cipher) {
            throw new RuntimeException('Cofre A1 vazio para esta empresa.');
        }

        $bytes = $this->crypto->descriptografarBinario($row->pfx_cipher);
        $senha = $this->crypto->descriptografarSenha($row->senha_cipher);

        $dir = sys_get_temp_dir().'/dfe_a1_'.$empresa->id.'_'.bin2hex(random_bytes(8));
        if (! mkdir($dir, 0700, true) && ! is_dir($dir)) {
            unset($bytes, $senha);
            throw new RuntimeException('Não foi possível criar diretório temporário do A1.');
        }
        $path = $dir.'/cert.pfx';
        if (file_put_contents($path, $bytes) === false) {
            @unlink($path);
            @rmdir($dir);
            unset($bytes, $senha);
            throw new RuntimeException('Não foi possível gravar A1 temporário.');
        }
        @chmod($path, 0600);
        unset($bytes);

        return [
            'path' => $path,
            'senha' => $senha,
            'row_id' => (int) $row->id,
        ];
    }

    /**
     * @param  array{path?: string, senha?: string}|null  $material
     */
    public function liberar(?array $material): void
    {
        if ($material === null) {
            return;
        }
        $path = $material['path'] ?? null;
        if (is_string($path) && $path !== '' && is_file($path)) {
            @unlink($path);
            $dir = dirname($path);
            if (is_dir($dir) && str_contains($dir, 'dfe_a1_')) {
                @rmdir($dir);
            }
        }
        if (isset($material['senha'])) {
            $material['senha'] = '';
        }
    }
}
