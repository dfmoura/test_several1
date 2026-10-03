<?php

namespace App\Services\Comercial;

use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\ParceiroContato;

/**
 * Pessoa do cliente nas fichas do ORC (nome + função). Sem telefone, e-mail ou token.
 *
 * 1. Link de aprovação com destinatário — retrato de quem recebeu o documento.
 * 2. Sem link: mesma ordem do painel de envio (autorizado a aprovar, senão principal,
 *    senão contato legado). Espelha {@see OrcamentoAprovacaoService::listarDestinatarios}.
 * 3. Legado só com `contato_nome`. A razão social já é o título da empresa.
 */
class OrcamentoContatoFicha
{
    /**
     * @return array{nome: string, funcao: string|null}|null
     */
    public function resolver(Orcamento $orcamento): ?array
    {
        $orcamento->loadMissing('linkAprovacao');
        $link = $orcamento->linkAprovacao;
        $nomeLink = trim((string) ($link?->destino_nome ?? ''));
        if ($nomeLink !== '') {
            return $this->pessoa($nomeLink, $link?->destino_funcao);
        }

        return $this->doCadastro($orcamento);
    }

    /**
     * @return array{nome: string, funcao: string|null}|null
     */
    private function doCadastro(Orcamento $orcamento): ?array
    {
        if (! $orcamento->parceiro_id) {
            return null;
        }

        $parceiro = Parceiro::query()
            ->with(['contatos' => fn ($q) => $q
                ->orderByDesc('autorizado_aprovar')
                ->orderByDesc('principal')
                ->orderBy('ordem')
                ->orderBy('id')])
            ->find($orcamento->parceiro_id);

        if ($parceiro === null) {
            return null;
        }

        $elegiveis = [];
        foreach ($parceiro->contatos as $contato) {
            if (! $contato->autorizado_aprovar && ! $contato->principal) {
                continue;
            }
            if (! $this->temCanal($contato->whatsapp, $contato->email, $contato->telefone)) {
                continue;
            }
            $elegiveis[] = $contato;
        }

        $autorizados = array_values(array_filter(
            $elegiveis,
            static fn (ParceiroContato $c) => (bool) $c->autorizado_aprovar,
        ));
        $fila = $autorizados !== [] ? $autorizados : $elegiveis;

        foreach ($fila as $contato) {
            $pessoa = $this->pessoa($contato->nome, $contato->funcao);
            if ($pessoa !== null) {
                return $pessoa;
            }
        }

        if ($fila !== []) {
            return null;
        }

        if (! $this->temCanal($parceiro->whatsapp, $parceiro->email, $parceiro->telefone)) {
            return null;
        }

        return $this->pessoa($parceiro->contato_nome, $parceiro->contato_funcao);
    }

    /**
     * @return array{nome: string, funcao: string|null}|null
     */
    private function pessoa(mixed $nome, mixed $funcao): ?array
    {
        $nomeLimpo = trim((string) $nome);
        if ($nomeLimpo === '') {
            return null;
        }
        $funcaoLimpa = trim((string) $funcao);

        return [
            'nome' => $nomeLimpo,
            'funcao' => $funcaoLimpa !== '' ? $funcaoLimpa : null,
        ];
    }

    private function temCanal(?string $whatsapp, ?string $email, ?string $telefone): bool
    {
        $wa = preg_replace('/\D+/', '', (string) $whatsapp) ?: '';
        if (strlen($wa) >= 10) {
            return true;
        }
        $mail = trim((string) $email);
        if ($mail !== '' && filter_var($mail, FILTER_VALIDATE_EMAIL)) {
            return true;
        }
        $tel = preg_replace('/\D+/', '', (string) $telefone) ?: '';

        return strlen($tel) >= 10;
    }
}
