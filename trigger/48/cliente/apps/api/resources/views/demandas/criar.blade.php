@extends('layouts.cliente')
@section('titulo', 'Nova demanda')
@section('conteudo')
  <form class="card pedido" method="post" action="{{ route('demandas.salvar') }}" enctype="multipart/form-data">
    @csrf
    <p class="kicker">Abertura</p>
    <h1>Nova demanda</h1>
    <p class="lede">Descreva o que precisa ficar pronto. Ao enviar, reservamos o ticket de abertura. O valor do projeto só existe depois da proposta.</p>

    <fieldset>
      <legend>Pedido</legend>
      <div class="pedido-meta">
        <div class="span-2">
          <label for="titulo">Título</label>
          <input id="titulo" name="titulo" required maxlength="160" value="{{ old('titulo') }}" placeholder="Ex.: Fechamento mensal no ERP">
        </div>
        <div class="span-2">
          <label for="sistema_atual">Sistema ou processo atual</label>
          <input id="sistema_atual" name="sistema_atual" required maxlength="200" value="{{ old('sistema_atual') }}" placeholder="Ex.: ERP da contabilidade, planilha, painel interno">
        </div>
        <div>
          <label for="tipo">Tipo</label>
          <select id="tipo" name="tipo" required>
            @foreach(\App\Suporte\Rotulos::TIPOS_DEMANDA as $valor => $rotulo)
              <option value="{{ $valor }}" @selected(old('tipo') === $valor)>{{ $rotulo }}</option>
            @endforeach
          </select>
        </div>
        <div>
          <label for="prioridade">Prioridade</label>
          <select id="prioridade" name="prioridade" required>
            @foreach(\App\Suporte\Rotulos::PRIORIDADES as $valor => $rotulo)
              <option value="{{ $valor }}" @selected(old('prioridade', 'normal') === $valor)>{{ $rotulo }}</option>
            @endforeach
          </select>
        </div>
        <div>
          <label for="prazo_desejado">Prazo desejado</label>
          <input id="prazo_desejado" name="prazo_desejado" type="date" value="{{ old('prazo_desejado') }}">
        </div>
        <div>
          <label for="contato_tecnico">Contato técnico</label>
          <input id="contato_tecnico" name="contato_tecnico" required maxlength="160" value="{{ old('contato_tecnico') }}" placeholder="Nome e e-mail ou telefone">
        </div>
      </div>
    </fieldset>

    <fieldset class="brief">
      <legend>O que precisa</legend>
      <p class="hint" id="dica-demanda">Descreva a demanda e o que de fato precisa ficar pronto: o que acontece hoje, onde trava e como a entrega será reconhecida.</p>
      <label for="descricao">Descrição da demanda</label>
      <textarea id="descricao" name="descricao" required maxlength="5000" rows="12" aria-describedby="dica-demanda" placeholder="O que acontece hoje, o que está faltando e o que a Trigger deve entregar.">{{ old('descricao') }}</textarea>
      <label for="objetivo">O que de fato precisa ficar pronto</label>
      <textarea id="objetivo" name="objetivo" class="curto" required maxlength="2000" rows="3" placeholder="O resultado concreto. Ex.: o fechamento do mês sai do ERP, sem planilha.">{{ old('objetivo') }}</textarea>
    </fieldset>

    <fieldset>
      <legend>Acessos e senhas</legend>
      <p class="hint" id="dica-acessos">Opcional. Informe endereço, usuário e senha só se a execução depender de entrar em um sistema. O texto fica cifrado. Quem executa a demanda é quem vê.</p>
      <label for="acessos">Como entrar</label>
      <textarea id="acessos" name="acessos" class="segredo-campo" maxlength="4000" rows="6" autocomplete="off" spellcheck="false" aria-describedby="dica-acessos" placeholder="Endereço&#10;Usuário&#10;Senha&#10;VPN ou observação, se precisar">{{ old('acessos') }}</textarea>
    </fieldset>

    <fieldset>
      <legend>Arquivos</legend>
      <p class="hint" id="dica-arquivos">Opcional. Arraste um ou mais arquivos, ou clique para escolher. PDF, PNG, JPG, WEBP, TXT ou ZIP. Até 5 arquivos, 10 MB cada.</p>
      <div class="drop" id="zona-arquivos">
        <label class="drop-hit" for="anexos">
          <strong>Arraste os arquivos aqui</strong>
          <span>ou clique para escolher</span>
        </label>
        <input id="anexos" name="anexos[]" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.zip,application/pdf,image/png,image/jpeg,image/webp,text/plain,application/zip" aria-describedby="dica-arquivos">
        <ul class="drop-list" id="lista-arquivos"></ul>
      </div>
      <p class="hint" id="aviso-arquivos" role="status"></p>
      @if($errors->has('anexos') || $errors->has('anexos.*'))
        <p class="hint">Escolha os arquivos de novo.</p>
      @endif
    </fieldset>

    <p class="row pedido-acoes">
      <button type="submit">Enviar demanda</button>
      <button class="btn-ghost" type="submit" name="rascunho" value="1">Salvar rascunho</button>
    </p>
  </form>
  <script>
    (function () {
      var zona = document.getElementById('zona-arquivos');
      var input = document.getElementById('anexos');
      var lista = document.getElementById('lista-arquivos');
      var aviso = document.getElementById('aviso-arquivos');
      if (!zona || !input || !lista || typeof DataTransfer === 'undefined') return;

      var aceitos = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'zip'];
      var teto = 5;
      var bytes = 10 * 1024 * 1024;
      var dt = new DataTransfer();
      var aplicando = false;

      function extensao(nome) {
        var partes = String(nome).toLowerCase().split('.');
        return partes.length > 1 ? partes.pop() : '';
      }

      function tamanho(n) {
        if (n < 1024) return n + ' B';
        if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
        return (n / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
      }

      function render() {
        lista.replaceChildren();
        Array.from(dt.files).forEach(function (arquivo, indice) {
          var item = document.createElement('li');
          var nome = document.createElement('span');
          nome.textContent = arquivo.name + ' · ' + tamanho(arquivo.size);
          var remover = document.createElement('button');
          remover.type = 'button';
          remover.className = 'btn-ghost btn-mini';
          remover.textContent = 'Remover';
          remover.addEventListener('click', function () {
            dt.items.remove(indice);
            sincronizar();
          });
          item.append(nome, remover);
          lista.appendChild(item);
        });
      }

      function sincronizar() {
        aplicando = true;
        input.files = dt.files;
        aplicando = false;
        render();
      }

      function jaTem(arquivo) {
        return Array.from(dt.files).some(function (atual) {
          return atual.name === arquivo.name && atual.size === arquivo.size && atual.lastModified === arquivo.lastModified;
        });
      }

      function adicionar(arquivos) {
        var rejeitados = [];
        Array.from(arquivos).forEach(function (arquivo) {
          if (jaTem(arquivo)) return;
          if (dt.files.length >= teto) {
            rejeitados.push('No máximo 5 arquivos.');
            return;
          }
          if (aceitos.indexOf(extensao(arquivo.name)) === -1) {
            rejeitados.push(arquivo.name + ' não é um formato aceito.');
            return;
          }
          if (arquivo.size > bytes) {
            rejeitados.push(arquivo.name + ' passa de 10 MB.');
            return;
          }
          dt.items.add(arquivo);
        });
        aviso.textContent = rejeitados.filter(function (msg, i, arr) { return arr.indexOf(msg) === i; }).join(' ');
        sincronizar();
      }

      input.addEventListener('change', function () {
        if (aplicando) return;
        adicionar(input.files);
      });

      ['dragenter', 'dragover'].forEach(function (evento) {
        zona.addEventListener(evento, function (e) {
          e.preventDefault();
          zona.classList.add('is-over');
        });
      });
      ['dragleave', 'drop'].forEach(function (evento) {
        zona.addEventListener(evento, function (e) {
          e.preventDefault();
          zona.classList.remove('is-over');
        });
      });
      zona.addEventListener('drop', function (e) {
        if (e.dataTransfer) adicionar(e.dataTransfer.files);
      });
    })();
  </script>
@endsection
