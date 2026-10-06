<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>@yield('titulo', 'Operação') · Trigger</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{{ asset('css/app.css') }}">
</head>
<body>
  <a class="skip" href="#conteudo">Ir para o conteúdo</a>
  <div class="shell">
    <header class="top">
      <div class="top-inner">
        <a class="brand" href="{{ route('operacao.fila') }}">
          <img src="{{ asset('img/logo-trigger-header.png') }}" alt="Trigger Data Intelligence" width="117" height="48">
          <span>Operação<small>equipe Trigger</small></span>
        </a>
        <nav class="nav" aria-label="Operação">
          <a href="{{ route('operacao.fila') }}">Fila</a>
          <a href="{{ route('operacao.empresas') }}">Empresas</a>
          <a href="{{ route('operacao.auditoria') }}">Auditoria</a>
          @if(($avisosOperacao ?? 0) > 0)<span class="badge">{{ $avisosOperacao }} novo(s)</span>@endif
          <form method="post" action="{{ route('operacao.sair') }}">@csrf<button class="linkish" type="submit">Sair</button></form>
        </nav>
      </div>
    </header>
    <main id="conteudo">
      @include('partials.flash')
      @yield('conteudo')
    </main>
  </div>
</body>
</html>
