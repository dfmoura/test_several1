<?php

namespace Tests\Unit;

use App\Support\ListPeriodo;
use PHPUnit\Framework\TestCase;

class ListPeriodoTest extends TestCase
{
    public function test_filled_e_value(): void
    {
        $this->assertFalse(ListPeriodo::filled(null, null));
        $this->assertFalse(ListPeriodo::filled('', '  '));
        $this->assertTrue(ListPeriodo::filled('2026-10-01', null));
        $this->assertTrue(ListPeriodo::filled(null, '2026-10-31'));
        $this->assertSame('2026-10-01', ListPeriodo::value(' 2026-10-01 '));
        $this->assertNull(ListPeriodo::value(''));
    }
}
