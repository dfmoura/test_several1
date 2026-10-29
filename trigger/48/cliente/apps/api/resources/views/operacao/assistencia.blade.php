@extends('layouts.operacao')
@section('titulo', 'Assistência')
@section('conteudo')
  <header class="pagehead">
    <div>
      <p class="kicker">Configuração</p>
      <h1>Assistência à demanda</h1>
      <p class="lede">Provedor e token ficam no serviço de chat. O cliente só conversa; o segredo não aparece na área logada dele.</p>
    </div>
  </header>

  <section class="card form-narrow">
    <h2>Estado</h2>
    <p class="meta">
      Área do cliente:
      @if($clienteHabilitada)
        assistência ligada
      @else
        assistência desligada no .env (<code>ASSISTENCIA_HABILITADA</code>)
      @endif
    </p>
    @if($erroServico)
      <p class="flash flash-aviso" style="margin-top:.6rem">{{ $erroServico }}</p>
    @elseif($llm)
      <p class="meta">
        Motor efetivo: <strong>{{ $llm['effective_mode'] ?? $llm['mode'] }}</strong>
        · modelo {{ $llm['model'] ?? '—' }}
        @if(!empty($llm['api_key_set']))
          · token {{ $llm['api_key_hint'] ?? '••••' }}
        @else
          · sem token
        @endif
      </p>
    @endif
  </section>

  @if($configurado)
  <form class="card form-narrow depois" method="post" action="{{ route('operacao.assistencia.salvar') }}">
    @csrf
    <h2>Provedor</h2>
    <p class="hint">Mock para local. OpenAI-compatível para conversas reais (OpenAI ou proxy com a mesma API).</p>

    <label for="mode">Provedor</label>
    <select id="mode" name="mode" required>
      <option value="mock" @selected(old('mode', $llm['mode'] ?? 'mock') === 'mock')>Mock (local)</option>
      <option value="openai" @selected(old('mode', $llm['mode'] ?? '') === 'openai')>OpenAI-compatível</option>
    </select>

    <label for="model">Modelo</label>
    <input id="model" name="model" required maxlength="200" value="{{ old('model', $llm['model'] ?? 'gpt-4o-mini') }}">

    <label for="base_url">URL base</label>
    <input id="base_url" name="base_url" required maxlength="500" value="{{ old('base_url', $llm['base_url'] ?? 'https://api.openai.com/v1') }}">
    <p class="hint">Ex.: https://api.openai.com/v1</p>

    <label for="api_key">Token da API</label>
    @if(!empty($llm['api_key_set']))
      <p class="meta">Atual: {{ $llm['api_key_hint'] ?? '••••' }}. Deixe em branco para manter.</p>
    @endif
    <input id="api_key" name="api_key" type="password" maxlength="512" autocomplete="off" spellcheck="false" placeholder="Cole o token somente se for gravar ou trocar">

    <p class="row" style="margin-top:1rem">
      <button type="submit">Salvar</button>
    </p>
  </form>

  <form class="card form-narrow depois" method="post" action="{{ route('operacao.assistencia.testar') }}">
    @csrf
    <h2>Teste</h2>
    <p class="hint">Chama o serviço de chat com a configuração salva. Não altera demandas.</p>
    <p class="row"><button class="btn-ghost" type="submit">Testar conexão</button></p>
  </form>
  @endif
@endsection
