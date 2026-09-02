<?php

namespace Tests\Unit;

use App\Support\UrlArtePublica;
use PHPUnit\Framework\TestCase;

class UrlArtePublicaTest extends TestCase
{
    public function test_normalize_aceita_https_e_http(): void
    {
        $this->assertSame(
            'https://cdn.exemplo.com/arte.pdf',
            UrlArtePublica::normalize('  https://cdn.exemplo.com/arte.pdf  ')
        );
        $this->assertSame(
            'http://files.local/prova.png',
            UrlArtePublica::normalize('http://files.local/prova.png')
        );
    }

    public function test_normalize_rejeita_esquemas_perigosos_e_vazio(): void
    {
        $this->assertNull(UrlArtePublica::normalize(null));
        $this->assertNull(UrlArtePublica::normalize(''));
        $this->assertNull(UrlArtePublica::normalize('javascript:alert(1)'));
        $this->assertNull(UrlArtePublica::normalize('data:text/html,<script>'));
        $this->assertNull(UrlArtePublica::normalize('ftp://files.example/arte.pdf'));
    }
}
