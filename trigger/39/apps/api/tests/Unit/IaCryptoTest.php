<?php

namespace Tests\Unit;

use App\Services\Ia\IaCrypto;
use Tests\TestCase;

class IaCryptoTest extends TestCase
{
    public function test_criptografia_roundtrip_e_mascara(): void
    {
        $crypto = app(IaCrypto::class);
        $plain = 'sk-test-chave-secreta-123456';

        $token = $crypto->criptografar($plain);
        $mask = $crypto->mascarar($plain);

        $this->assertNotSame($plain, $token);
        $this->assertStringNotContainsString($plain, $token);
        $this->assertStringNotContainsString($plain, $mask);
        $this->assertSame($plain, $crypto->descriptografar($token));
        $this->assertStringStartsWith('sk-t', $mask);
        $this->assertStringEndsWith('3456', $mask);
    }

    public function test_mascara_curta(): void
    {
        $crypto = app(IaCrypto::class);
        $this->assertSame('••••89', $crypto->mascarar('12345689'));
    }
}
