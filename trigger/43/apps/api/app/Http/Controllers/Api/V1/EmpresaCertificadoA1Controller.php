<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Services\Cadastros\EmpresaCertificadoA1Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmpresaCertificadoA1Controller extends Controller
{
    public function __construct(private readonly EmpresaCertificadoA1Service $service) {}

    public function show(Request $request, Empresa $empresa): JsonResponse
    {
        $this->authorizeEmpresa($request, $empresa);

        $status = $this->service->status($empresa);

        return response()->json([
            'data' => $status ?? [
                'cadastrado' => false,
                'apto_operacao' => false,
                'alerta' => true,
                'alerta_nivel' => 'urgent',
                'pendencias' => ['Certificado A1 (.pfx/.p12) desta empresa'],
                'aviso_cofre' => 'Nenhum certificado A1 no cofre desta empresa. Envie um arquivo .pfx/.p12 com a senha. O conteúdo é cifrado em repouso; a API nunca devolve o PFX nem a senha.',
            ],
        ]);
    }

    public function store(Request $request, Empresa $empresa): JsonResponse
    {
        $this->authorizeGerir($request, $empresa);

        $request->validate([
            'arquivo' => ['required', 'file', 'max:2048'],
            'senha' => ['required', 'string', 'max:256'],
        ]);

        /** @var \Illuminate\Http\UploadedFile $arquivo */
        $arquivo = $request->file('arquivo');
        $out = $this->service->armazenar(
            $empresa,
            $arquivo,
            (string) $request->input('senha'),
            $request->user(),
        );

        return response()->json(['data' => $out], 201);
    }

    public function destroy(Request $request, Empresa $empresa): JsonResponse
    {
        $this->authorizeGerir($request, $empresa);

        $this->service->remover($empresa);

        return response()->json([
            'data' => [
                'cadastrado' => false,
                'message' => 'Certificado A1 removido do cofre.',
            ],
        ]);
    }

    private function authorizeEmpresa(Request $request, Empresa $empresa): void
    {
        if (! $request->user()->hasEmpresaAccess($empresa->id)) {
            abort(403);
        }
    }

    private function authorizeGerir(Request $request, Empresa $empresa): void
    {
        $this->authorizeEmpresa($request, $empresa);
        if (! $request->user()->can('empresas.gerir')) {
            abort(403, 'Permissão negada.');
        }
    }
}
