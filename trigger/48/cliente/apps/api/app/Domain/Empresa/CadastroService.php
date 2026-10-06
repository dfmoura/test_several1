<?php

declare(strict_types=1);

namespace App\Domain\Empresa;

use App\Domain\Auditoria\AuditoriaService;
use App\Domain\Carteira\CarteiraService;
use App\Domain\Cobranca\CobrancaService;
use App\Domain\RegraNegocio;
use App\Models\CobrancaPix;
use App\Models\Empresa;
use App\Models\Usuario;
use App\Models\Vinculo;
use App\Suporte\CpfProtegido;
use App\Suporte\Documento;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CadastroService
{
    public function __construct(
        private ConsultaCnpj $consulta,
        private CarteiraService $carteira,
        private CobrancaService $cobrancas,
        private AuditoriaService $auditoria,
    ) {}

    public function consultar(string $cnpj): DadosReceita
    {
        $digitos = Documento::soDigitos($cnpj);
        if (! Documento::cnpjValido($digitos)) {
            throw new RegraNegocio('CNPJ inválido. Confira os dígitos.');
        }
        $dados = $this->consulta->consultar($digitos);
        if (! $dados->ativa || $dados->razaoSocial === '') {
            throw new RegraNegocio('Este CNPJ está '.$dados->situacao.'. Só empresas ativas podem se cadastrar.');
        }
        $empresa = Empresa::query()->where('cnpj', $digitos)->first();
        if ($empresa && ! $this->podeReabrir($empresa)) {
            throw new RegraNegocio('Esta empresa já possui cadastro. Entre ou recupere a senha.');
        }

        return $dados;
    }

    /**
     * @param  array<string, mixed>  $dados
     * @return array{empresa: Empresa, usuario: Usuario, cobranca: CobrancaPix}
     */
    public function concluir(DadosReceita $receita, array $dados, string $ip): array
    {
        if (! Documento::cpfValido($dados['cpf'])) {
            throw new RegraNegocio('CPF inválido. Confira os dígitos.');
        }

        return DB::transaction(function () use ($receita, $dados, $ip) {
            $empresa = Empresa::query()->where('cnpj', $receita->cnpj)->lockForUpdate()->first();
            if ($empresa && ! $this->podeReabrir($empresa)) {
                throw new RegraNegocio('Esta empresa já possui cadastro. Entre ou recupere a senha.');
            }
            if (Usuario::query()->where('email', mb_strtolower($dados['email']))->exists()) {
                throw new RegraNegocio('Este e-mail já possui cadastro. Entre ou recupere a senha.');
            }
            $cpf = CpfProtegido::guardar($dados['cpf']);
            if (Usuario::query()->where('cpf_hash', $cpf['cpf_hash'])->exists()) {
                throw new RegraNegocio('Este CPF já está vinculado a uma conta.');
            }

            if (! $empresa) {
                $empresa = new Empresa(['cnpj' => $receita->cnpj]);
            }
            $empresa->fill([
                'razao_social' => $receita->razaoSocial,
                'nome_fantasia' => $receita->nomeFantasia,
                'situacao_cadastral' => $receita->situacao,
                'dados_receita' => $receita->bruto,
                'status' => 'AGUARDA_PIX',
                'motivo' => null,
                'criada_em' => now(),
            ]);
            $empresa->save();
            $this->carteira->garantir($empresa->id);

            $usuario = Usuario::query()->create([
                'nome' => $dados['nome'],
                'email' => mb_strtolower($dados['email']),
                'telefone' => Documento::soDigitos($dados['telefone']),
                'senha_hash' => Hash::make($dados['senha']),
                'criado_em' => now(),
                ...$cpf,
            ]);
            Vinculo::query()->create([
                'usuario_id' => $usuario->id,
                'empresa_id' => $empresa->id,
                'papel' => 'TITULAR',
                'status' => 'ATIVO',
                'aceite_em' => now(),
                'aceite_ip' => $ip,
                'criado_em' => now(),
            ]);
            $this->auditoria->registrar('empresa_cadastrada', 'empresas', $empresa->id, $empresa->id, null, [
                'cnpj' => $empresa->cnpj,
            ], 'CLIENTE', $usuario->id);

            $cobranca = $this->cobrancas->emitir(
                $empresa->id,
                'ATIVACAO',
                \App\Models\Parametro::inteiro('ATIVACAO_CENTAVOS'),
            );

            return compact('empresa', 'usuario', 'cobranca');
        });
    }

    public function podeReabrir(Empresa $empresa): bool
    {
        if ($empresa->status !== 'EXPIRADA') {
            return false;
        }

        return ! CobrancaPix::query()
            ->where('empresa_id', $empresa->id)
            ->where('status', 'PAGA')
            ->exists();
    }
}
