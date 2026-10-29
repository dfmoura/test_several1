@extends('layouts.cliente')
@section('titulo', 'Conta')
@section('conteudo')
  <header class="pagehead">
    <div>
      <p class="kicker">Conta</p>
      <h1>{{ $empresa->razao_social }}</h1>
      <p class="meta">{{ \App\Suporte\Rotulos::statusEmpresa($empresa->status) }}</p>
    </div>
    @if($empresa->status === 'ATIVA')
      <a class="btn" href="{{ route('conta.recarga') }}">Adicionar saldo</a>
    @elseif($pixAtivacao)
      <a class="btn" href="{{ route('pix.mostrar', $pixAtivacao->txid) }}">Pagar PIX de ativação</a>
    @endif
  </header>

  @if($empresa->status === 'AGUARDA_PIX' && $pixAtivacao)
    <div class="flash flash-aviso" role="status">
      A conta só libera demandas depois do PIX de ativação (@reais($pixAtivacao->valor_centavos)).
      <a href="{{ route('pix.mostrar', $pixAtivacao->txid) }}">Abrir QR Code</a>
    </div>
  @endif

  <section class="card">
    <div class="pagehead pagehead-inline">
      <div>
        <h2 class="h-secao">Empresa na Receita Federal</h2>
        <p class="muted">
          Snapshot público do CNPJ
          @if($receita->atualizadaEm)
            · atualizado em {{ $receita->atualizadaEm->format('d/m/Y') }}
          @endif
        </p>
      </div>
      @if($podeGerirConta)
        @if($podeAtualizarReceita)
          <form method="post" action="{{ route('conta.receita') }}">
            @csrf
            <button type="submit" class="btn-ghost">Atualizar dados da Receita</button>
          </form>
        @else
          <p class="muted atualizar-bloqueado" title="No máximo uma consulta por mês">
            Nova atualização em {{ $proximaAtualizacaoReceita->format('d/m/Y') }}
          </p>
        @endif
      @endif
    </div>
    <dl class="facts">
      <div><dt>CNPJ</dt><dd>{{ \App\Suporte\Documento::formatarCnpj($empresa->cnpj) }}</dd></div>
      <div><dt>Situação cadastral</dt><dd>{{ $receita->situacao }}</dd></div>
      @if($receita->dataSituacao)
        <div><dt>Data da situação</dt><dd>{{ $receita->dataSituacao }}</dd></div>
      @endif
      <div class="span-2"><dt>Razão social</dt><dd>{{ $receita->razaoSocial }}</dd></div>
      @if($receita->nomeFantasia)
        <div class="span-2"><dt>Nome fantasia</dt><dd>{{ $receita->nomeFantasia }}</dd></div>
      @endif
      @if($receita->naturezaJuridica)
        <div class="span-2"><dt>Natureza jurídica</dt><dd>{{ $receita->naturezaJuridica }}</dd></div>
      @endif
      @if($receita->porte)
        <div><dt>Porte</dt><dd>{{ $receita->porte }}</dd></div>
      @endif
      @if($receita->capitalSocial)
        <div><dt>Capital social</dt><dd>{{ $receita->capitalSocial }}</dd></div>
      @endif
      @if($receita->cnaePrincipal)
        <div class="span-2"><dt>CNAE principal</dt><dd>{{ $receita->cnaePrincipal }}</dd></div>
      @endif
      @if($receita->cnaesSecundarios !== [])
        <div class="span-2">
          <dt>CNAEs secundários</dt>
          <dd>
            <ul class="lista-simples">
              @foreach($receita->cnaesSecundarios as $cnae)
                <li>{{ $cnae }}</li>
              @endforeach
            </ul>
          </dd>
        </div>
      @endif
      @if($receita->endereco)
        <div class="span-2"><dt>Endereço</dt><dd>{{ $receita->endereco }}</dd></div>
      @endif
      @if($receita->telefone)
        <div><dt>Telefone (Receita)</dt><dd>{{ $receita->telefone }}</dd></div>
      @endif
      @if($receita->emailPublico)
        <div><dt>E-mail (Receita)</dt><dd>{{ $receita->emailPublico }}</dd></div>
      @endif
    </dl>
  </section>

  <section class="card depois">
    <h2 class="h-secao">Quadro societário (QSA)</h2>
    <p class="muted">Dados públicos. Documentos dos sócios aparecem mascarados. Isto não substitui o responsável da conta.</p>
    @if($receita->qsa === [])
      <p class="muted">{{ $receita->qsaDisponivel ? 'Nenhum sócio informado nesta consulta.' : 'QSA ainda não disponível neste snapshot. Atualize os dados da Receita quando o intervalo permitir.' }}</p>
    @else
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Qualificação</th>
              <th>Documento</th>
              <th>Entrada</th>
            </tr>
          </thead>
          <tbody>
            @foreach($receita->qsa as $socio)
              <tr>
                <td>{{ $socio['nome'] }}</td>
                <td>{{ $socio['qualificacao'] }}</td>
                <td>{{ $socio['documento'] }}</td>
                <td>{{ $socio['entrada'] ?? '—' }}</td>
              </tr>
            @endforeach
          </tbody>
        </table>
      </div>
    @endif
    @if($receita->qsa !== [])
      @if($receita->cpfResponsavelNoQsa)
        <p class="muted selo-qsa">O CPF do responsável da conta aparece no QSA público.</p>
      @else
        <p class="muted selo-qsa">O CPF do responsável não aparece no QSA público — comum quando há procurador. Isto não bloqueia o uso da conta.</p>
      @endif
    @endif
  </section>

  <section class="card depois">
    <h2 class="h-secao">Responsável da conta</h2>
    <p class="muted">Cadastro contratual na Trigger. Independente do QSA.</p>
    <dl class="facts">
      <div><dt>Nome</dt><dd>{{ auth('web')->user()->nome }}</dd></div>
      <div><dt>CPF</dt><dd>{{ $cpfMascarado }}</dd></div>
      <div class="span-2"><dt>E-mail</dt><dd>{{ auth('web')->user()->email }}</dd></div>
    </dl>
  </section>
@endsection
