<?php

namespace App\Http\Controllers;

class LegalController extends Controller
{
    public function termos()
    {
        return view('legal.termos');
    }

    public function privacidade()
    {
        return view('legal.privacidade');
    }
}
