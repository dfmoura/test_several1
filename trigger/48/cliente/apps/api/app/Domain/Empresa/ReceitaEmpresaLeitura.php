<?php

declare(strict_types=1);

namespace App\Domain\Empresa;

use App\Models\Empresa;
use App\Suporte\Documento;
use Carbon\Carbon;

/**
 * Lê o snapshot público de dados_receita para a tela Conta.
 * Não altera responsável, saldo nem vínculo.
 */
final class ReceitaEmpresaLeitura
{
    /**
     * @param  array<string, mixed>  $bruto
     * @param  list<array{nome: string, qualificacao: string, documento: string, entrada: string|null}>  $qsa
     * @param  list<string>  $cnaesSecundarios
     */
    public function __construct(
        public string $razaoSocial,
        public ?string $nomeFantasia,
        public string $situacao,
        public ?string $dataSituacao,
        public ?string $naturezaJuridica,
        public ?string $porte,
        public ?string $cnaePrincipal,
        public array $cnaesSecundarios,
        public ?string $capitalSocial,
        public ?string $endereco,
        public ?string $telefone,
        public ?string $emailPublico,
        public array $qsa,
        public ?Carbon $atualizadaEm,
        public bool $cpfResponsavelNoQsa,
        public bool $qsaDisponivel,
    ) {}

    public static function de(Empresa $empresa, ?string $cpfResponsavelDigitos = null): self
    {
        $bruto = is_array($empresa->dados_receita) ? $empresa->dados_receita : [];
        $qsaBruto = $bruto['qsa'] ?? [];
        $qsa = [];
        $cpfNoQsa = false;
        $cpfResp = $cpfResponsavelDigitos !== null ? Documento::soDigitos($cpfResponsavelDigitos) : '';

        if (is_array($qsaBruto)) {
            foreach ($qsaBruto as $linha) {
                if (! is_array($linha)) {
                    continue;
                }
                $doc = Documento::soDigitos((string) ($linha['cnpj_cpf_do_socio'] ?? ''));
                if ($cpfResp !== '' && strlen($doc) === 11 && $doc === $cpfResp) {
                    $cpfNoQsa = true;
                }
                $entrada = self::dataBr($linha['data_entrada_sociedade'] ?? null);
                $qsa[] = [
                    'nome' => trim((string) ($linha['nome_socio'] ?? '')) ?: '—',
                    'qualificacao' => trim((string) ($linha['qualificacao_socio'] ?? '')) ?: '—',
                    'documento' => Documento::mascararDocumentoPublico($doc),
                    'entrada' => $entrada,
                ];
            }
        }

        $cnaeCodigo = $bruto['cnae_fiscal'] ?? null;
        $cnaeDesc = trim((string) ($bruto['cnae_fiscal_descricao'] ?? ''));
        $cnaePrincipal = null;
        if ($cnaeCodigo !== null && $cnaeCodigo !== '') {
            $cnaePrincipal = $cnaeDesc !== ''
                ? Documento::formatarCnae((string) $cnaeCodigo).' — '.$cnaeDesc
                : Documento::formatarCnae((string) $cnaeCodigo);
        } elseif ($cnaeDesc !== '') {
            $cnaePrincipal = $cnaeDesc;
        }

        $secundarios = [];
        $listaSec = $bruto['cnaes_secundarios'] ?? [];
        if (is_array($listaSec)) {
            foreach ($listaSec as $item) {
                if (! is_array($item)) {
                    continue;
                }
                $cod = $item['codigo'] ?? null;
                $desc = trim((string) ($item['descricao'] ?? ''));
                if ($cod === null && $desc === '') {
                    continue;
                }
                $secundarios[] = $cod !== null && $cod !== ''
                    ? (Documento::formatarCnae((string) $cod).($desc !== '' ? ' — '.$desc : ''))
                    : $desc;
            }
        }

        $situacao = trim((string) ($bruto['descricao_situacao_cadastral'] ?? $empresa->situacao_cadastral));
        if ($situacao === '') {
            $situacao = $empresa->situacao_cadastral;
        }

        return new self(
            razaoSocial: $empresa->razao_social,
            nomeFantasia: $empresa->nome_fantasia,
            situacao: mb_strtoupper($situacao),
            dataSituacao: self::dataBr($bruto['data_situacao_cadastral'] ?? null),
            naturezaJuridica: self::textoOuNulo($bruto['natureza_juridica'] ?? null),
            porte: self::textoOuNulo($bruto['descricao_porte'] ?? $bruto['porte'] ?? null),
            cnaePrincipal: $cnaePrincipal,
            cnaesSecundarios: $secundarios,
            capitalSocial: self::capital($bruto['capital_social'] ?? null),
            endereco: self::endereco($bruto),
            telefone: self::telefone($bruto),
            emailPublico: self::textoOuNulo($bruto['email'] ?? null),
            qsa: $qsa,
            atualizadaEm: $empresa->receita_atualizada_em ?? $empresa->criada_em,
            cpfResponsavelNoQsa: $cpfNoQsa,
            qsaDisponivel: $qsa !== [] || array_key_exists('qsa', $bruto),
        );
    }

    private static function textoOuNulo(mixed $valor): ?string
    {
        $t = trim((string) $valor);

        return $t !== '' ? $t : null;
    }

    private static function dataBr(mixed $valor): ?string
    {
        $t = trim((string) $valor);
        if ($t === '') {
            return null;
        }
        try {
            return Carbon::parse($t)->format('d/m/Y');
        } catch (\Throwable) {
            return $t;
        }
    }

    private static function capital(mixed $valor): ?string
    {
        if ($valor === null || $valor === '') {
            return null;
        }
        if (! is_numeric($valor)) {
            return (string) $valor;
        }

        return 'R$ '.number_format((float) $valor, 2, ',', '.');
    }

    /**
     * @param  array<string, mixed>  $bruto
     */
    private static function endereco(array $bruto): ?string
    {
        $tipo = trim((string) ($bruto['descricao_tipo_de_logradouro'] ?? ''));
        $log = trim((string) ($bruto['logradouro'] ?? ''));
        $num = trim((string) ($bruto['numero'] ?? ''));
        $comp = trim((string) ($bruto['complemento'] ?? ''));
        $bairro = trim((string) ($bruto['bairro'] ?? ''));
        $mun = trim((string) ($bruto['municipio'] ?? ''));
        $uf = trim((string) ($bruto['uf'] ?? ''));
        $cep = Documento::formatarCep((string) ($bruto['cep'] ?? ''));

        $rua = trim(($tipo !== '' ? $tipo.' ' : '').$log);
        if ($rua !== '' && $num !== '') {
            $rua .= ', '.$num;
        } elseif ($num !== '') {
            $rua = $num;
        }
        if ($comp !== '') {
            $rua = $rua !== '' ? $rua.' — '.$comp : $comp;
        }

        $partes = array_values(array_filter([$rua, $bairro, trim($mun.($uf !== '' ? '/'.$uf : '')), $cep !== '' ? 'CEP '.$cep : '']));

        return $partes !== [] ? implode(' · ', $partes) : null;
    }

    /**
     * @param  array<string, mixed>  $bruto
     */
    private static function telefone(array $bruto): ?string
    {
        $tels = [];
        foreach (['ddd_telefone_1', 'ddd_telefone_2'] as $chave) {
            $raw = Documento::soDigitos((string) ($bruto[$chave] ?? ''));
            if ($raw === '') {
                continue;
            }
            $tels[] = Documento::formatarTelefoneReceita($raw);
        }

        return $tels !== [] ? implode(' · ', $tels) : null;
    }
}
