<?php

declare(strict_types=1);

namespace App\Http\Controllers\Operacao;

use App\Domain\Demanda\AssistenciaClient;
use App\Domain\RegraNegocio;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class AssistenciaController extends Controller
{
    public function mostrar(AssistenciaClient $client): View
    {
        $llm = null;
        $erro = null;
        if ($client->configurado()) {
            try {
                $llm = $client->obterLlm();
            } catch (RegraNegocio $e) {
                $erro = $e->getMessage();
            }
        } else {
            $erro = 'Defina ASSISTENCIA_URL e ASSISTENCIA_API_KEY no ambiente da área do cliente.';
        }

        return view('operacao.assistencia', [
            'llm' => $llm,
            'erroServico' => $erro,
            'clienteHabilitada' => (bool) config('assistencia.habilitada'),
            'configurado' => $client->configurado(),
        ]);
    }

    public function salvar(Request $request, AssistenciaClient $client): RedirectResponse
    {
        $dados = $request->validate([
            'mode' => ['required', 'in:mock,openai'],
            'model' => ['required', 'string', 'max:200'],
            'base_url' => ['required', 'string', 'max:500'],
            'api_key' => ['nullable', 'string', 'max:512'],
        ], [
            'required' => 'Preencha :attribute.',
            'in' => 'Escolha um provedor válido.',
        ], [
            'mode' => 'o provedor',
            'model' => 'o modelo',
            'base_url' => 'a URL base',
            'api_key' => 'o token',
        ]);

        $payload = [
            'mode' => $dados['mode'],
            'model' => trim($dados['model']),
            'base_url' => trim($dados['base_url']),
        ];
        if (filled($dados['api_key'] ?? null)) {
            $payload['api_key'] = trim((string) $dados['api_key']);
        }

        try {
            $client->salvarLlm($payload);
        } catch (RegraNegocio $e) {
            return back()->withInput()->with('erro', $e->getMessage());
        }

        return redirect()->route('operacao.assistencia')->with('ok', 'Configuração da assistência salva.');
    }

    public function testar(AssistenciaClient $client): RedirectResponse
    {
        try {
            $resultado = $client->testarLlm();
        } catch (RegraNegocio $e) {
            return back()->with('erro', $e->getMessage());
        }

        if (! ($resultado['ok'] ?? false)) {
            return back()->with('erro', (string) ($resultado['detail'] ?? 'Teste falhou.'));
        }

        return back()->with('ok', (string) ($resultado['detail'] ?? 'Teste ok.'));
    }
}
