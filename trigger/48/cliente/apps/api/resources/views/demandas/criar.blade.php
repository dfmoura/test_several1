@extends('layouts.cliente')
@section('titulo', 'Nova demanda')
@section('conteudo')
  <h1>Nova demanda</h1>
  <p class="muted">Ao enviar, reservamos o ticket de abertura. O valor do projeto só existe depois da proposta.</p>
  <form class="card" method="post" action="{{ route('demandas.salvar') }}" enctype="multipart/form-data">
    @csrf
    <label for="titulo">Título</label>
    <input id="titulo" name="titulo" required value="{{ old('titulo') }}">
    <label for="sistema_atual">Sistema ou processo atual</label>
    <input id="sistema_atual" name="sistema_atual" required value="{{ old('sistema_atual') }}">
    <label for="objetivo">Objetivo</label>
    <textarea id="objetivo" name="objetivo" required>{{ old('objetivo') }}</textarea>
    <label for="descricao">O que precisa evoluir</label>
    <textarea id="descricao" name="descricao" required>{{ old('descricao') }}</textarea>
    <label for="tipo">Tipo</label>
    <select id="tipo" name="tipo" required>
      @foreach(\App\Suporte\Rotulos::TIPOS_DEMANDA as $valor => $rotulo)
        <option value="{{ $valor }}" @selected(old('tipo') === $valor)>{{ $rotulo }}</option>
      @endforeach
    </select>
    <label for="prioridade">Prioridade</label>
    <select id="prioridade" name="prioridade" required>
      @foreach(\App\Suporte\Rotulos::PRIORIDADES as $valor => $rotulo)
        <option value="{{ $valor }}" @selected(old('prioridade', 'normal') === $valor)>{{ $rotulo }}</option>
      @endforeach
    </select>
    <label for="prazo_desejado">Prazo desejado</label>
    <input id="prazo_desejado" name="prazo_desejado" type="date" value="{{ old('prazo_desejado') }}">
    <label for="contato_tecnico">Contato técnico</label>
    <input id="contato_tecnico" name="contato_tecnico" required value="{{ old('contato_tecnico') }}">
    <label for="observacoes">Observações</label>
    <textarea id="observacoes" name="observacoes">{{ old('observacoes') }}</textarea>
    <label for="anexos">Anexos</label>
    <input id="anexos" name="anexos[]" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.zip">
    <p class="row" style="margin-top:1rem">
      <button type="submit">Enviar demanda</button>
      <button class="btn-ghost" type="submit" name="rascunho" value="1">Salvar rascunho</button>
    </p>
  </form>
@endsection
