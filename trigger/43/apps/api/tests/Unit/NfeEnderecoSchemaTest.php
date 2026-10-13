<?php

namespace Tests\Unit;

use App\Services\Fiscal\NfeEnderecoSchema;
use PHPUnit\Framework\TestCase;

class NfeEnderecoSchemaTest extends TestCase
{
    public function test_rua_vazia_nao_vira_sn(): void
    {
        $raw = [
            'logradouro' => '',
            'numero' => '',
            'bairro' => '',
            'municipio' => '',
            'uf' => '',
            'cep' => '',
            'ibge' => '',
        ];

        $this->assertNull(NfeEnderecoSchema::paraXml($raw));
        $pendencias = NfeEnderecoSchema::pendencias($raw);
        $this->assertSame([
            'Logradouro',
            'Número',
            'Bairro',
            'Município',
            'UF',
            'CEP (8 dígitos)',
            'Código IBGE do município (7 dígitos)',
        ], $pendencias);
        $this->assertStringContainsString('Logradouro', NfeEnderecoSchema::mensagemBloqueio($raw, 'destinatário'));
    }

    public function test_endereco_completo_sem_numero_aceita_sn(): void
    {
        $xml = NfeEnderecoSchema::paraXml($this->completo(['numero' => '']));

        $this->assertNotNull($xml);
        $this->assertSame('S/N', $xml['numero']);
        $this->assertSame([], NfeEnderecoSchema::pendencias($this->completo(['numero' => null])));
    }

    public function test_logradouro_de_um_caractere_e_uf_invalida_sao_pendencia(): void
    {
        $pendencias = NfeEnderecoSchema::pendencias($this->completo([
            'logradouro' => 'R',
            'uf' => 'XX',
        ]));

        $this->assertContains('Logradouro', $pendencias);
        $this->assertContains('UF', $pendencias);
        $this->assertNotContains('Número', $pendencias);
        $this->assertNull(NfeEnderecoSchema::paraXml($this->completo([
            'logradouro' => 'R',
            'uf' => 'XX',
        ])));
    }

    public function test_trunca_texto_e_nao_inventa_cep(): void
    {
        $longo = str_repeat('A', 80);
        $xml = NfeEnderecoSchema::paraXml($this->completo([
            'logradouro' => $longo,
            'bairro' => $longo,
            'municipio' => $longo,
            'complemento' => $longo,
            'numero' => $longo,
        ]));

        $this->assertNotNull($xml);
        $this->assertSame(60, mb_strlen($xml['logradouro']));
        $this->assertSame(60, mb_strlen($xml['bairro']));
        $this->assertSame(60, mb_strlen($xml['municipio']));
        $this->assertSame(60, mb_strlen((string) $xml['complemento']));
        $this->assertSame(60, mb_strlen($xml['numero']));
        $this->assertSame('38400000', $xml['cep']);
        $this->assertSame('3170206', $xml['ibge']);

        $this->assertNull(NfeEnderecoSchema::paraXml($this->completo(['cep' => '3840000'])));
        $this->assertContains(
            'CEP (8 dígitos)',
            NfeEnderecoSchema::pendencias($this->completo(['cep' => '3840000']))
        );
    }

    /**
     * @param  array<string, mixed>  $override
     * @return array<string, mixed>
     */
    private function completo(array $override = []): array
    {
        return array_merge([
            'logradouro' => 'Rua Cliente',
            'numero' => '10',
            'complemento' => '',
            'bairro' => 'Centro',
            'municipio' => 'Uberlandia',
            'uf' => 'mg',
            'cep' => '38400-000',
            'ibge' => '3170206',
        ], $override);
    }
}
