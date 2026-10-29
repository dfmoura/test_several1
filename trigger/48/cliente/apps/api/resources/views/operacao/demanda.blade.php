@extends('layouts.operacao')
@section('titulo', $demanda->codigo)
@section('conteudo')
  <header class="pagehead">
    <div>
      <p class="kicker">{{ $demanda->empresa->razao_social }} · disponível @reais($demanda->empresa->carteira->disponivel_centavos) · reservado nesta demanda @reais($reserva)</p>
      <h1>{{ $demanda->codigo }} · {{ $demanda->titulo }}</h1>
    </div>
    <span class="badge">{{ \App\Suporte\Rotulos::statusDemanda($demanda->status) }}</span>
  </header>
  <section class="card">
    @if(filled($demanda->sistema_atual))
      <p><strong>Sistema.</strong> {{ $demanda->sistema_atual }}</p>
    @endif
    @if($demanda->objetivoAparte())
      <p><strong>O que precisa ficar pronto.</strong></p>
      <p class="prose">{{ $demanda->objetivo }}</p>
    @endif
    <p class="prose">{{ $demanda->descricao }}</p>
    <h2>Acessos</h2>
    @if(filled($demanda->acessos))
      <pre class="segredo">{{ $demanda->acessos }}</pre>
    @else
      <p class="muted">Nenhum acesso informado.</p>
    @endif
    <p class="muted">{{ $demanda->contato_tecnico }}@if($demanda->prazo_desejado) · prazo desejado {{ $demanda->prazo_desejado->format('d/m/Y') }}@endif</p>
  </section>
  <div class="grid grid-ops depois">
    <section class="card">
      <h2>Conversa</h2>
      @foreach($mensagens as $mensagem)
        <article class="msg">
          <strong>{{ $mensagem->visibilidade === 'INTERNA' ? 'Nota interna' : ($mensagem->autor_tipo === 'CLIENTE' ? 'Cliente' : 'Trigger') }}</strong>
          <p>{{ $mensagem->corpo }}</p>
        </article>
      @endforeach
      <form class="composer" method="post" action="{{ route('operacao.mensagens', $demanda->codigo) }}" enctype="multipart/form-data">
        @csrf
        <label for="corpo">Mensagem</label>
        <textarea id="corpo" name="corpo" required rows="3"></textarea>
        <label><input type="checkbox" name="interna" value="1"> Nota interna (o cliente não vê)</label>
        <label><input type="checkbox" name="aguardar" value="1"> Aguardando o cliente</label>
        <input type="file" name="anexo">
        <p><button type="submit">Registrar</button></p>
      </form>
    </section>
    <section class="card desk">
      @if(in_array($demanda->status, ['EM_ANALISE','PROPOSTA_ENVIADA'], true))
        <h2>Nova versão de proposta</h2>
        <p class="hint">O cliente aprova escopo, plano de entrega, prazo e valor. Campos internos ficam recolhidos.</p>
        <form method="post" action="{{ route('operacao.propor', $demanda->codigo) }}"
              x-data="propostaOperacao(@js([
                'desdobrar' => route('operacao.desdobrar', $demanda->codigo),
                'csrf' => csrf_token(),
                'assistencia' => (bool) ($assistenciaAtiva ?? false),
                'etapas' => $rascunho['etapas'] ?? [],
                'campos' => [
                  'descricao_funcional' => $rascunho['descricao_funcional'] ?? '',
                  'incluso' => $rascunho['incluso'] ?? '',
                  'nao_incluso' => $rascunho['nao_incluso'] ?? '',
                  'criterios_aceite' => $rascunho['criterios_aceite'] ?? '',
                ],
              ]))">
          @csrf
          @if($assistenciaAtiva ?? false)
            <p class="assistencia-acao row">
              <button type="button" class="btn-ghost" @click="desdobrar()" :disabled="ocupado"
                      x-text="ocupado ? 'Desdobrando…' : 'Desdobrar com assistência'"></button>
            </p>
            <p class="assistencia-erro" x-show="erro" x-text="erro"></p>
          @endif
          <div class="fields">
            <div class="field span-2 alto">
              <label for="descricao_funcional">O que será entregue</label>
              <textarea id="descricao_funcional" name="descricao_funcional" required rows="4" x-model="campos.descricao_funcional">{{ $rascunho['descricao_funcional'] }}</textarea>
            </div>
            <div class="field span-2">
              <label for="incluso">Incluso</label>
              <textarea id="incluso" name="incluso" required rows="2" x-model="campos.incluso">{{ $rascunho['incluso'] }}</textarea>
            </div>
            <div class="field span-2">
              <label for="nao_incluso">Não incluso</label>
              <textarea id="nao_incluso" name="nao_incluso" required rows="2" x-model="campos.nao_incluso">{{ $rascunho['nao_incluso'] }}</textarea>
            </div>
            <div class="field span-2">
              <label for="criterios_aceite">Como sabem que está pronto</label>
              <textarea id="criterios_aceite" name="criterios_aceite" required rows="2" x-model="campos.criterios_aceite">{{ $rascunho['criterios_aceite'] }}</textarea>
            </div>
          </div>

          <div class="plano-etapas">
            <div class="plano-cabecalho">
              <div>
                <h3>Plano de entrega</h3>
                <p class="hint">Etapas de valor para o cliente aprovar. Demandas pequenas podem ter uma só.</p>
              </div>
              <button type="button" class="btn-ghost" @click="adicionarEtapa()" :disabled="etapas.length >= 8">Adicionar etapa</button>
            </div>
            <template x-for="(etapa, indice) in etapas" :key="indice">
              <div class="etapa-item">
                <p class="etapa-ordem" x-text="'Etapa ' + (indice + 1)"></p>
                <label :for="'etapa_titulo_' + indice">Título</label>
                <input :id="'etapa_titulo_' + indice" type="text" maxlength="160"
                       :name="'etapas[' + indice + '][titulo]'" x-model="etapa.titulo"
                       placeholder="Ex.: Pagamento no posto">
                <label :for="'etapa_resultado_' + indice">O que fica pronto</label>
                <textarea :id="'etapa_resultado_' + indice" rows="2" maxlength="800"
                          :name="'etapas[' + indice + '][resultado]'" x-model="etapa.resultado"
                          placeholder="Resultado observável nesta etapa"></textarea>
                <label :for="'etapa_aceite_' + indice">Pronta quando</label>
                <textarea :id="'etapa_aceite_' + indice" rows="2" maxlength="800"
                          :name="'etapas[' + indice + '][aceite]'" x-model="etapa.aceite"
                          placeholder="Critério de aceite da etapa"></textarea>
                <p class="row" x-show="etapas.length > 1">
                  <button type="button" class="btn-ghost" @click="removerEtapa(indice)">Remover etapa</button>
                </p>
              </div>
            </template>
          </div>

          <div class="nums">
            <div>
              <label for="prazo_dias_uteis">Prazo em dias úteis</label>
              <input id="prazo_dias_uteis" name="prazo_dias_uteis" type="number" min="1" max="365" required value="{{ $rascunho['prazo_dias_uteis'] }}">
            </div>
            <div>
              <label for="valor">Valor</label>
              <input id="valor" name="valor" required placeholder="4.500,00" value="{{ $rascunho['valor'] }}">
            </div>
            <div>
              <label for="horas_estimadas">Horas (interno)</label>
              <input id="horas_estimadas" name="horas_estimadas" type="number" min="1" max="5000" value="{{ $rascunho['horas_estimadas'] }}">
            </div>
          </div>

          <details class="fold inset">
            <summary>Campos internos (opcional)</summary>
            <div class="fold-body fields">
              <div class="field span-2">
                <label for="objetivo">Objetivo</label>
                <textarea id="objetivo" name="objetivo" rows="2">{{ $rascunho['objetivo'] }}</textarea>
              </div>
              <div class="field">
                <label for="contexto">Contexto</label>
                <textarea id="contexto" name="contexto" rows="2">{{ $rascunho['contexto'] }}</textarea>
              </div>
              <div class="field">
                <label for="premissas">Premissas</label>
                <textarea id="premissas" name="premissas" rows="2">{{ $rascunho['premissas'] }}</textarea>
              </div>
              <div class="field span-2">
                <label for="requisitos">Requisitos detalhados</label>
                <textarea id="requisitos" name="requisitos" rows="2">{{ $rascunho['requisitos'] }}</textarea>
              </div>
              <div class="field span-2">
                <label for="restricoes">Restrições</label>
                <textarea id="restricoes" name="restricoes" rows="2">{{ $rascunho['restricoes'] }}</textarea>
              </div>
              <div class="field span-2">
                <label for="observacao">Observação interna</label>
                <textarea id="observacao" name="observacao" rows="2">{{ $rascunho['observacao'] }}</textarea>
              </div>
            </div>
          </details>

          <p><button type="submit" :disabled="ocupado">Enviar proposta</button></p>
        </form>
        <form method="post" action="{{ route('operacao.recusar', $demanda->codigo) }}">
          @csrf
          <label for="motivo">Recusar a demanda</label>
          <textarea id="motivo" name="motivo" required minlength="10" rows="2"></textarea>
          <button class="btn-danger" type="submit">Recusar e devolver reserva</button>
        </form>
      @endif
      @if($demanda->status === 'APROVADA')
        <form method="post" action="{{ route('operacao.executar', $demanda->codigo) }}">@csrf<button type="submit">Iniciar execução</button></form>
      @endif
      @if(in_array($demanda->status, ['APROVADA','EM_EXECUCAO'], true))
        <form method="post" action="{{ route('operacao.marco', $demanda->codigo) }}">
          @csrf
          <label for="texto">Marco</label>
          <input id="texto" name="texto" required>
          <label><input type="checkbox" name="visivel" value="1" checked> Visível ao cliente</label>
          <p><button class="btn-ghost" type="submit">Registrar marco</button></p>
        </form>
      @endif
      @if(in_array($demanda->status, ['APROVADA','EM_EXECUCAO','AGUARDANDO_VALIDACAO'], true))
        <form method="post" action="{{ route('operacao.cancelar', $demanda->codigo) }}">
          @csrf
          <label for="motivo_cancel">Cancelar depois da aprovação</label>
          <textarea id="motivo_cancel" name="motivo" required minlength="10" rows="2"></textarea>
          <label><input type="radio" name="consumir" value="devolver" required> Devolver o ticket</label>
          <label><input type="radio" name="consumir" value="consumir"> Consumir o ticket</label>
          <p><button class="btn-danger" type="submit">Cancelar demanda</button></p>
        </form>
      @endif
      @if($demanda->status === 'EM_EXECUCAO')
        <form method="post" action="{{ route('operacao.apresentar', $demanda->codigo) }}" enctype="multipart/form-data">
          @csrf
          <label for="resumo">Resumo da entrega</label>
          <textarea id="resumo" name="resumo" required rows="3"></textarea>
          <label for="pacote">Pacote (libera após a liquidação)</label>
          <input id="pacote" name="pacote[]" type="file" multiple>
          <p><button type="submit">Apresentar para validação</button></p>
        </form>
      @endif
      @if($demanda->status === 'AGUARDANDO_VALIDACAO')
        <h2>Aguardando validação</h2>
        <p>{{ $demanda->apresentacao?->resumo }}</p>
        <p>O cliente valida até {{ $demanda->validacao_ate?->timezone('America/Sao_Paulo')->format('d/m/Y H:i') }}. O saldo ainda não foi abatido.</p>
        @if((int) $demanda->ajustes_usados >= 1)
          <p class="muted">O ajuste deste escopo já foi usado.</p>
        @endif
      @endif
      @foreach($demanda->propostas as $proposta)
        <p>Proposta v{{ $proposta->versao }} · @reais($proposta->valor_centavos) · {{ $proposta->status }}@if(count($proposta->planoEtapas())) · {{ count($proposta->planoEtapas()) }} etapa(s)@endif</p>
      @endforeach
      @if($demanda->fatura)
        <p>Fatura @reais($demanda->fatura->valor_centavos) · {{ $demanda->fatura->status }} · complemento @reais($demanda->fatura->complemento_centavos)</p>
      @endif
    </section>
  </div>

  @if(in_array($demanda->status, ['EM_ANALISE','PROPOSTA_ENVIADA'], true))
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/dist/cdn.min.js"></script>
    <script>
      function propostaOperacao(cfg) {
        const etapasIniciais = Array.isArray(cfg.etapas) && cfg.etapas.length
          ? cfg.etapas.map((e) => ({
              titulo: e.titulo || '',
              resultado: e.resultado || '',
              aceite: e.aceite || '',
            }))
          : [{ titulo: '', resultado: '', aceite: '' }];
        return {
          desdobrarUrl: cfg.desdobrar,
          csrf: cfg.csrf,
          assistencia: !!cfg.assistencia,
          ocupado: false,
          erro: '',
          campos: Object.assign({
            descricao_funcional: '',
            incluso: '',
            nao_incluso: '',
            criterios_aceite: '',
          }, cfg.campos || {}),
          etapas: etapasIniciais,
          adicionarEtapa() {
            if (this.etapas.length >= 8) return;
            this.etapas.push({ titulo: '', resultado: '', aceite: '' });
          },
          removerEtapa(indice) {
            if (this.etapas.length <= 1) return;
            this.etapas.splice(indice, 1);
          },
          async desdobrar() {
            if (!this.assistencia || this.ocupado) return;
            this.ocupado = true;
            this.erro = '';
            try {
              const r = await fetch(this.desdobrarUrl, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'X-CSRF-TOKEN': this.csrf,
                  'X-Requested-With': 'XMLHttpRequest',
                },
              });
              const j = await r.json();
              if (!r.ok) {
                this.erro = j.erro || 'Não foi possível desdobrar a demanda.';
                return;
              }
              if (j.descricao_funcional) this.campos.descricao_funcional = j.descricao_funcional;
              if (j.incluso) this.campos.incluso = j.incluso;
              if (j.nao_incluso) this.campos.nao_incluso = j.nao_incluso;
              if (j.criterios_aceite) this.campos.criterios_aceite = j.criterios_aceite;
              if (Array.isArray(j.etapas) && j.etapas.length) {
                this.etapas = j.etapas.map((e) => ({
                  titulo: e.titulo || '',
                  resultado: e.resultado || '',
                  aceite: e.aceite || '',
                }));
              }
            } catch (e) {
              this.erro = 'A assistência está indisponível agora.';
            } finally {
              this.ocupado = false;
            }
          },
        };
      }
    </script>
  @endif
@endsection
