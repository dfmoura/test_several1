@extends('layouts.cliente')
@section('titulo', $demanda->codigo)
@section('conteudo')
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

  <div class="etapa">
    <section class="card foco">
      <p class="kicker">Nesta etapa</p>
      @if($demanda->status === 'RASCUNHO')
        <h2>Pedido</h2>
        @include('demandas._pedido')
        <div class="row">
          <form method="post" action="{{ route('demandas.enviar', $demanda->codigo) }}">@csrf<button type="submit">Enviar demanda</button></form>
          <form method="post" action="{{ route('demandas.descartar', $demanda->codigo) }}">@csrf<button class="btn-ghost" type="submit">Descartar rascunho</button></form>
        </div>
      @elseif($vigente)
        <h2>Proposta v{{ $vigente->versao }}</h2>
        <p class="money">@reais($vigente->valor_centavos)</p>
        <p>{{ $vigente->prazo_dias_uteis }} dias úteis · válida até {{ $vigente->valida_ate?->timezone('America/Sao_Paulo')->format('d/m/Y') }}</p>
        <p>Na validação da entrega, abatemos o saldo e cobramos a diferença por PIX.</p>
        <p>Falta liquidar, com o saldo de hoje: @reais($falta)</p>
        <dl class="facts">
          <div><dt>Reservado</dt><dd>@reais($reserva)</dd></div>
          <div><dt>Disponível na carteira</dt><dd>@reais($disponivel)</dd></div>
          <div class="span-2"><dt>Escopo</dt><dd>{{ $vigente->descricao_funcional }}</dd></div>
          <div class="span-2"><dt>Incluso.</dt><dd>{{ $vigente->incluso }}</dd></div>
          <div class="span-2"><dt>Não incluso.</dt><dd>{{ $vigente->nao_incluso }}</dd></div>
          <div class="span-2"><dt>Aceite.</dt><dd>{{ $vigente->criterios_aceite }}</dd></div>
        </dl>
        <form method="post" action="{{ route('demandas.aprovar', $demanda->codigo) }}">
          @csrf
          <label for="confirmar_valor">Digite {{ \App\Suporte\Dinheiro::reais($vigente->valor_centavos) }} para aprovar</label>
          <input id="confirmar_valor" name="confirmar_valor" required inputmode="decimal">
          <p><button type="submit">Aprovar proposta</button></p>
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
      @elseif($demanda->status === 'AGUARDANDO_VALIDACAO')
        <h2>Entrega para validar</h2>
        <p>{{ $demanda->apresentacao?->resumo }}</p>
        @if($aceite)
          <p><strong>Critério de aceite.</strong> {{ $aceite['criterios_aceite'] }}</p>
        @endif
        <p>Valide até {{ $demanda->validacao_ate?->timezone('America/Sao_Paulo')->format('d/m/Y H:i') }}. Sem resposta até lá, a entrega é aceita e o saldo é abatido.</p>
        <p>Ao validar, abatemos o saldo. Com o saldo de hoje, falta @reais($faltaValidacao) por PIX.</p>
        <form method="post" action="{{ route('demandas.validar', $demanda->codigo) }}">
          @csrf
          <label for="confirmar_entrega">Digite {{ \App\Suporte\Dinheiro::reais($aceite['valor_centavos'] ?? 0) }} para validar</label>
          <input id="confirmar_entrega" name="confirmar_valor" required inputmode="decimal">
          <p><button type="submit">Validar entrega</button></p>
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
      @elseif(in_array($demanda->status, ['APROVADA', 'EM_EXECUCAO'], true))
        <h2>{{ \App\Suporte\Rotulos::statusDemanda($demanda->status) }}</h2>
        @if($aceite)
          <p class="money">@reais($aceite['valor_centavos'])</p>
          <p>{{ $aceite['prazo_dias_uteis'] }} dias úteis</p>
        @endif
        <p>A aprovação não marca a fatura como paga. O saldo é abatido quando você valida a entrega.</p>
        @if($demanda->aguardando_cliente)
          <p>A Trigger pediu uma resposta. Ela está na conversa.</p>
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

    @if($aceite && ! $vigente)
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
