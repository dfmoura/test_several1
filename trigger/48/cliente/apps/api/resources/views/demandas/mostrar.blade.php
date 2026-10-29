@extends('layouts.cliente')
@section('titulo', $demanda->codigo)
@section('conteudo')
  @php
    $aceiteAberto = $aceite && ! $vigente && in_array($demanda->status, ['APROVADA', 'EM_EXECUCAO', 'AGUARDANDO_VALIDACAO'], true);
  @endphp
  <header class="pagehead">
    <div>
      <p class="kicker">{{ $demanda->codigo }}</p>
      <h1>{{ $demanda->titulo }}</h1>
    </div>
    <p>
      <span class="badge">{{ \App\Suporte\Rotulos::statusDemanda($demanda->status) }}</span>
      @if($demanda->aguardando_cliente)<span class="badge">aguardando você</span>@endif
    </p>
  </header>

  <div class="etapa{{ ($vigente || $aceiteAberto) ? ' etapa-ampla' : '' }}">
    @if($vigente)
      <div class="proposta-layout">
        <section class="card foco">
          <p class="kicker">Nesta etapa</p>
          <h2>Proposta v{{ $vigente->versao }}</h2>
          <p class="money">@reais($vigente->valor_centavos)</p>
          <p>{{ $vigente->prazo_dias_uteis }} dias úteis · válida até {{ $vigente->valida_ate?->timezone('America/Sao_Paulo')->format('d/m/Y') }}</p>
          <dl class="facts">
            <div class="span-2"><dt>Escopo</dt><dd class="prose">{{ $vigente->descricao_funcional }}</dd></div>
            <div class="span-2"><dt>Incluso.</dt><dd>{{ $vigente->incluso }}</dd></div>
            <div class="span-2"><dt>Não incluso.</dt><dd>{{ $vigente->nao_incluso }}</dd></div>
            <div class="span-2"><dt>Aceite.</dt><dd>{{ $vigente->criterios_aceite }}</dd></div>
          </dl>
          @if(count($vigente->planoEtapas()))
            <h3 class="plano-titulo">Plano de entrega</h3>
            <ol class="plano-lista">
              @foreach($vigente->planoEtapas() as $etapa)
                <li>
                  <strong>{{ $etapa['titulo'] }}</strong>
                  @if(!empty($etapa['resultado']))
                    <span class="muted">{{ $etapa['resultado'] }}</span>
                  @endif
                  @if(!empty($etapa['aceite']))
                    <span class="muted">Pronta quando: {{ $etapa['aceite'] }}</span>
                  @endif
                </li>
              @endforeach
            </ol>
          @endif
        </section>

        <aside class="card proposta-lado">
          <p class="kicker">Cobertura</p>
          <h2>Saldo para a liquidação</h2>
          <div class="metrics metrics-2">
            <section>
              <p class="kicker">Reservado</p>
              <p class="money">@reais($reserva)</p>
            </section>
            <section>
              <p class="kicker">Disponível</p>
              <p class="money">@reais($disponivel)</p>
            </section>
          </div>
          <p class="muted">Aprovar fixa o contrato. Na validação da entrega, abatemos o saldo e cobramos a diferença por PIX.</p>
          @if($falta > 0)
            <div class="flash flash-aviso" role="status">Com o saldo de hoje, na liquidação faltaria @reais($falta).</div>
            <p class="muted">Você pode <a href="{{ route('conta.recarga') }}">completar o saldo agora</a> ou pagar a diferença na validação.</p>
          @else
            <p class="muted">Com o saldo de hoje, a liquidação não pediria PIX complementar.</p>
          @endif
          <div class="proposta-acoes">
            <form method="post" action="{{ route('demandas.aprovar', $demanda->codigo) }}">
              @csrf
              <button class="btn" type="submit">Aprovar proposta</button>
            </form>
            <details class="fold inset">
              <summary>Recusar proposta</summary>
              <div class="fold-body">
                <form method="post" action="{{ route('demandas.recusar', $demanda->codigo) }}">
                  @csrf
                  <label for="motivo">Motivo da recusa</label>
                  <textarea id="motivo" name="motivo" required minlength="10" rows="3"></textarea>
                  <p class="muted">As duas primeiras recusas em 90 dias devolvem o saldo. A terceira converte o ticket em remuneração da análise.</p>
                  <button class="btn-danger" type="submit">Recusar proposta</button>
                </form>
              </div>
            </details>
          </div>
        </aside>
      </div>
    @elseif($aceiteAberto)
      <div class="proposta-layout">
        <section class="card foco">
          <p class="kicker">Contrato</p>
          <h2>Escopo aprovado</h2>
          <p class="money">@reais($aceite['valor_centavos'])</p>
          <p>{{ $aceite['prazo_dias_uteis'] }} dias úteis</p>
          <dl class="facts">
            <div class="span-2"><dt>Escopo</dt><dd class="prose">{{ $aceite['descricao_funcional'] }}</dd></div>
            <div class="span-2"><dt>Incluso.</dt><dd>{{ $aceite['incluso'] }}</dd></div>
            <div class="span-2"><dt>Não incluso.</dt><dd>{{ $aceite['nao_incluso'] }}</dd></div>
            <div class="span-2"><dt>Aceite.</dt><dd>{{ $aceite['criterios_aceite'] }}</dd></div>
          </dl>
          @if(!empty($aceite['etapas']) && is_array($aceite['etapas']))
            <h3 class="plano-titulo">Plano de entrega</h3>
            <ol class="plano-lista">
              @foreach($aceite['etapas'] as $etapa)
                <li>
                  <strong>{{ $etapa['titulo'] ?? '' }}</strong>
                  @if(!empty($etapa['resultado']))
                    <span class="muted">{{ $etapa['resultado'] }}</span>
                  @endif
                  @if(!empty($etapa['aceite']))
                    <span class="muted">Pronta quando: {{ $etapa['aceite'] }}</span>
                  @endif
                </li>
              @endforeach
            </ol>
          @endif
        </section>

        <aside class="card proposta-lado">
          <p class="kicker">Andamento</p>
          <h2>{{ \App\Suporte\Rotulos::statusDemanda($demanda->status) }}</h2>
          <div class="metrics metrics-2">
            <section>
              <p class="kicker">Reservado</p>
              <p class="money">@reais($reserva)</p>
            </section>
            <section>
              <p class="kicker">Disponível</p>
              <p class="money">@reais($disponivel)</p>
            </section>
          </div>

          @if($demanda->status === 'AGUARDANDO_VALIDACAO')
            <p>{{ $demanda->apresentacao?->resumo }}</p>
            <p class="muted">Valide até {{ $demanda->validacao_ate?->timezone('America/Sao_Paulo')->format('d/m/Y H:i') }}. Sem resposta até lá, a entrega é aceita e o saldo é abatido.</p>
            <p class="muted">Ao validar, abatemos o saldo. Com o saldo de hoje, falta @reais($faltaValidacao) por PIX.</p>
            <div class="proposta-acoes">
              <form method="post" action="{{ route('demandas.validar', $demanda->codigo) }}">
                @csrf
                <label for="confirmar_entrega">Digite {{ \App\Suporte\Dinheiro::reais($aceite['valor_centavos'] ?? 0) }} para validar</label>
                <input id="confirmar_entrega" name="confirmar_valor" required inputmode="decimal" value="{{ old('confirmar_valor') }}">
                @error('confirmar_valor')
                  <p class="flash flash-aviso" role="alert">{{ $message }}</p>
                @enderror
                <p><button class="btn" type="submit">Validar entrega</button></p>
              </form>
              @if((int) $demanda->ajustes_usados < 1)
                <details class="fold inset">
                  <summary>Pedir ajuste</summary>
                  <div class="fold-body">
                    <form method="post" action="{{ route('demandas.ajuste', $demanda->codigo) }}">
                      @csrf
                      <label for="motivo_ajuste">Pedir um ajuste no escopo aprovado</label>
                      <textarea id="motivo_ajuste" name="motivo" required minlength="10" rows="3"></textarea>
                      <p class="muted">Uma rodada. O saldo não é abatido. A Trigger apresenta de novo e o prazo de validação recomeça.</p>
                      <button class="btn-ghost" type="submit">Pedir ajuste</button>
                    </form>
                  </div>
                </details>
              @else
                <p class="muted">O ajuste deste escopo já foi usado.</p>
              @endif
            </div>
          @else
            <p class="muted">A aprovação não marca a fatura como paga. O saldo é abatido quando você valida a entrega.</p>
            @if($demanda->status === 'APROVADA')
              <p class="muted">A Trigger inicia a execução em seguida.</p>
            @else
              <p class="muted">A Trigger está executando o escopo aprovado.</p>
            @endif
            @if($demanda->aguardando_cliente)
              <p>A Trigger pediu uma resposta. Ela está na conversa.</p>
            @endif
          @endif
        </aside>
      </div>
    @else
    <section class="card foco">
      <p class="kicker">Nesta etapa</p>
      @if($demanda->status === 'RASCUNHO')
        <h2>Pedido</h2>
        @include('demandas._pedido')
        <div class="row">
          <form method="post" action="{{ route('demandas.enviar', $demanda->codigo) }}">@csrf<button type="submit">Enviar demanda</button></form>
          <form method="post" action="{{ route('demandas.descartar', $demanda->codigo) }}">@csrf<button class="btn-ghost" type="submit">Descartar rascunho</button></form>
        </div>
      @elseif($demanda->apresentacao)
        @if($pix)
          <h2>Pagar a diferença</h2>
        @elseif($demanda->status === 'CONCLUIDA')
          <h2>Concluída</h2>
        @else
          <h2>Apresentação</h2>
        @endif
        <p>{{ $demanda->apresentacao->resumo }}</p>
        @if($demanda->fatura)
          <p>Fatura @reais($demanda->fatura->valor_centavos) · {{ $demanda->fatura->status === 'LIQUIDADA' ? 'liquidada' : 'em aberto' }}</p>
          <p><a href="{{ route('faturas.pdf', $demanda->fatura->id) }}">Baixar PDF</a></p>
          @if($pix)
            <p><a class="btn" href="{{ route('pix.mostrar', $pix->txid) }}">Pagar diferença @reais($pix->valor_centavos)</a></p>
          @endif
        @endif
      @elseif($demanda->status === 'EM_ANALISE')
        <h2>Em análise</h2>
        <p>A Trigger está analisando o pedido. A próxima etapa é a proposta.</p>
        @if($demanda->aguardando_cliente)
          <p>A Trigger pediu uma resposta. Ela está na conversa.</p>
        @endif
      @else
        <h2>{{ \App\Suporte\Rotulos::statusDemanda($demanda->status) }}</h2>
        @if($eventos->last()?->motivo)
          <p>{{ $eventos->last()->motivo }}</p>
        @endif
      @endif
    </section>
    @endif

    @if($demanda->status !== 'RASCUNHO')
      <details class="fold">
        <summary>Pedido</summary>
        <div class="fold-body">
          @include('demandas._pedido')
          <dl class="facts">
            <div><dt>Reservado</dt><dd>@reais($reserva)</dd></div>
            <div><dt>Disponível na carteira</dt><dd>@reais($disponivel)</dd></div>
          </dl>
        </div>
      </details>
    @endif

    @if($aceite && ! $vigente && ! $aceiteAberto)
      <details class="fold">
        <summary>Escopo aprovado</summary>
        <div class="fold-body">
          <p class="money">@reais($aceite['valor_centavos'])</p>
          <p>{{ $aceite['prazo_dias_uteis'] }} dias úteis</p>
          <dl class="facts">
            <div class="span-2"><dt>Escopo</dt><dd class="prose">{{ $aceite['descricao_funcional'] }}</dd></div>
            <div class="span-2"><dt>Incluso.</dt><dd>{{ $aceite['incluso'] }}</dd></div>
            <div class="span-2"><dt>Não incluso.</dt><dd>{{ $aceite['nao_incluso'] }}</dd></div>
            <div class="span-2"><dt>Aceite.</dt><dd>{{ $aceite['criterios_aceite'] }}</dd></div>
          </dl>
          @if(!empty($aceite['etapas']) && is_array($aceite['etapas']))
            <h3 class="plano-titulo">Plano de entrega</h3>
            <ol class="plano-lista">
              @foreach($aceite['etapas'] as $etapa)
                <li>
                  <strong>{{ $etapa['titulo'] ?? '' }}</strong>
                  @if(!empty($etapa['resultado']))
                    <span class="muted">{{ $etapa['resultado'] }}</span>
                  @endif
                  @if(!empty($etapa['aceite']))
                    <span class="muted">Pronta quando: {{ $etapa['aceite'] }}</span>
                  @endif
                </li>
              @endforeach
            </ol>
          @endif
        </div>
      </details>
    @endif

    <details class="fold">
      <summary>Linha do tempo</summary>
      <div class="fold-body">
        <ol class="timeline">
          @foreach($eventos as $evento)
            <li>{{ $evento->em?->timezone('America/Sao_Paulo')->format('d/m/Y H:i') }} — {{ \App\Suporte\Rotulos::statusDemanda($evento->para_status) }}@if($evento->motivo) · {{ $evento->motivo }}@endif</li>
          @endforeach
          @foreach($marcos as $marco)
            <li>{{ $marco->criado_em?->timezone('America/Sao_Paulo')->format('d/m/Y H:i') }} — {{ $marco->texto }}</li>
          @endforeach
        </ol>
      </div>
    </details>

    @if($mensagens->isNotEmpty() || (! $demanda->terminal() && $demanda->status !== 'RASCUNHO'))
      <details class="fold" @if($demanda->aguardando_cliente) open @endif>
        <summary>Mensagens{{ $mensagens->isNotEmpty() ? ' · '.$mensagens->count() : '' }}</summary>
        <div class="fold-body">
          @foreach($mensagens as $mensagem)
            <article class="msg">
              <strong>{{ $mensagem->autor_tipo === 'CLIENTE' ? 'Você' : 'Trigger' }}</strong>
              <span class="muted">{{ $mensagem->criada_em?->timezone('America/Sao_Paulo')->format('d/m/Y H:i') }}</span>
              <p>{{ $mensagem->corpo }}</p>
            </article>
          @endforeach
          @if(! $demanda->terminal() && $demanda->status !== 'RASCUNHO')
            <form class="composer" method="post" action="{{ route('demandas.mensagem', $demanda->codigo) }}" enctype="multipart/form-data">
              @csrf
              <label for="corpo">Escrever para a Trigger</label>
              <textarea id="corpo" name="corpo" required rows="3"></textarea>
              <label for="anexo">Anexo</label>
              <input id="anexo" name="anexo" type="file">
              <p><button type="submit">Enviar</button></p>
            </form>
          @endif
        </div>
      </details>
    @endif

    @if($demanda->anexos->isNotEmpty())
      <details class="fold">
        <summary>Arquivos</summary>
        <div class="fold-body">
          <ul>
            @foreach($demanda->anexos as $anexo)
              <li>
                @if($anexo->pacote && optional($demanda->fatura)->status !== 'LIQUIDADA')
                  {{ $anexo->nome_original }} — libera quando a fatura liquidar
                @else
                  <a href="{{ route('anexos.baixar', [$demanda->codigo, $anexo->id]) }}">{{ $anexo->nome_original }}</a>
                @endif
              </li>
            @endforeach
          </ul>
        </div>
      </details>
    @endif
  </div>
@endsection
