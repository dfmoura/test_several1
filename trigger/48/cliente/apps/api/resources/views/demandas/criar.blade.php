@extends('layouts.cliente')
@section('titulo', 'Nova demanda')
@section('conteudo')
  <form class="card pedido" method="post" action="{{ route('demandas.salvar') }}"
        @if($assistenciaAtiva ?? false)
          x-data="assistenciaDemanda(@js([
            'abrir' => route('demandas.assistencia.abrir'),
            'mensagem' => route('demandas.assistencia.mensagem'),
            'finalizar' => route('demandas.assistencia.finalizar'),
            'csrf' => csrf_token(),
            'descricao' => old('descricao', ''),
          ]))"
        @endif
  >
    @csrf
    <header class="pagehead">
      <div>
        <p class="kicker">Abertura</p>
        <h1>Nova demanda</h1>
        <p class="lede">Descreva o que precisa ficar pronto. Ao enviar, reservamos o ticket de abertura. O valor do projeto só existe depois da proposta.</p>
      </div>
    </header>

    <div class="pedido-layout">
    <fieldset class="brief">
      <legend id="rotulo-descricao">Descrição da demanda</legend>
      <p class="hint" id="dica-demanda">O que acontece hoje, onde trava e o que a Trigger deve entregar.</p>
      @if($assistenciaAtiva ?? false)
        <p class="assistencia-acao">
          <button type="button" class="btn-ghost" @click="abrirOverlay()" :disabled="ocupado"
                  x-text="sessionId ? 'Continuar assistência' : 'Formular com assistência'"></button>
        </p>
        <textarea id="descricao" name="descricao" required maxlength="5000" rows="12" aria-labelledby="rotulo-descricao" aria-describedby="dica-demanda" placeholder="Ex.: o fechamento do mês ainda sai em planilha. Precisa sair do ERP, sem retrabalho." x-model="descricao"></textarea>
      @else
        <textarea id="descricao" name="descricao" required maxlength="5000" rows="12" aria-labelledby="rotulo-descricao" aria-describedby="dica-demanda" placeholder="Ex.: o fechamento do mês ainda sai em planilha. Precisa sair do ERP, sem retrabalho.">{{ old('descricao') }}</textarea>
      @endif
    </fieldset>

    <fieldset class="pedido-lado">
      <legend id="rotulo-acessos">Como entrar</legend>
      <p class="hint" id="dica-acessos">Opcional. Informe endereço, usuário e senha só se a execução depender de entrar em um sistema. O texto fica cifrado. Quem executa a demanda é quem vê.</p>
      <textarea id="acessos" name="acessos" class="segredo-campo" maxlength="4000" rows="12" autocomplete="off" spellcheck="false" aria-labelledby="rotulo-acessos" aria-describedby="dica-acessos" placeholder="Endereço&#10;Usuário&#10;Senha&#10;VPN ou observação, se precisar">{{ old('acessos') }}</textarea>
    </fieldset>
    </div>

    <p class="row pedido-acoes">
      <button type="submit">Enviar demanda</button>
      <button class="btn-ghost" type="submit" name="rascunho" value="1">Salvar rascunho</button>
    </p>

    @if($assistenciaAtiva ?? false)
    <div class="assistencia-overlay" x-show="aberto" x-cloak role="dialog" aria-modal="true" aria-labelledby="assistencia-titulo"
         @keydown.escape.window="fecharOverlay()">
      <div class="assistencia-backdrop" @click="fecharOverlay()"></div>
      <div class="assistencia-painel" @click.stop>
        <header class="assistencia-cabecalho">
          <div>
            <p class="kicker">Assistência</p>
            <h2 id="assistencia-titulo">Formular a demanda</h2>
            <p class="hint">Pode aplicar no formulário e voltar depois — o histórico permanece. Acessos ficam só no campo ao lado.</p>
          </div>
          <button type="button" class="btn-ghost" @click="fecharOverlay()" :disabled="ocupado">Fechar</button>
        </header>

        <div class="assistencia-mensagens" x-ref="lista" aria-live="polite">
          <template x-for="(m, i) in mensagens" :key="i">
            <div class="assistencia-balao" :class="m.papel">
              <p x-text="m.texto"></p>
            </div>
          </template>
        </div>

        <p class="assistencia-erro" x-show="erro" x-text="erro"></p>

        <div class="assistencia-composer">
          <label class="sr-only" for="assistencia-entrada">Sua mensagem</label>
          <textarea id="assistencia-entrada" rows="3" maxlength="4000" x-model="rascunho"
                    :disabled="ocupado || !sessionId"
                    @keydown.enter.meta.prevent="enviar()"
                    placeholder="Responda em poucas frases."></textarea>
          <div class="row">
            <button type="button" @click="enviar()" :disabled="ocupado || !rascunho.trim()">Enviar</button>
            <button type="button" class="btn-ghost" @click="usarNoFormulario()" :disabled="ocupado || !sessionId">Usar no formulário</button>
            <button type="button" class="btn-ghost" @click="novaConversa()" :disabled="ocupado || !sessionId">Nova conversa</button>
          </div>
        </div>
      </div>
    </div>
    @endif
  </form>

  @if($assistenciaAtiva ?? false)
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/dist/cdn.min.js"></script>
    <script>
      function assistenciaDemanda(cfg) {
        return {
          abrirUrl: cfg.abrir,
          mensagemUrl: cfg.mensagem,
          finalizarUrl: cfg.finalizar,
          csrf: cfg.csrf,
          aberto: false,
          ocupado: false,
          sessionId: null,
          mensagens: [],
          rascunho: '',
          erro: '',
          descricao: cfg.descricao || '',
          async abrirOverlay() {
            this.erro = '';
            this.aberto = true;
            if (this.sessionId) {
              this.$nextTick(() => this.rolar());
              return;
            }
            await this.iniciarSessao();
          },
          async iniciarSessao() {
            this.ocupado = true;
            try {
              const dados = await this.post(this.abrirUrl, {});
              this.sessionId = dados.session_id;
              this.mensagens = [{ papel: 'assistente', texto: dados.reply }];
              this.rascunho = '';
              this.$nextTick(() => this.rolar());
            } catch (e) {
              this.erro = e.message || 'Não foi possível abrir a assistência.';
            } finally {
              this.ocupado = false;
            }
          },
          fecharOverlay() {
            if (this.ocupado) return;
            this.aberto = false;
          },
          async novaConversa() {
            if (this.ocupado) return;
            if (!window.confirm('Começar uma conversa nova? O histórico atual desta assistência será descartado.')) {
              return;
            }
            this.sessionId = null;
            this.mensagens = [];
            this.rascunho = '';
            this.erro = '';
            await this.iniciarSessao();
          },
          async enviar() {
            const texto = this.rascunho.trim();
            if (!texto || !this.sessionId) return;
            this.erro = '';
            this.mensagens.push({ papel: 'cliente', texto });
            this.rascunho = '';
            this.ocupado = true;
            this.$nextTick(() => this.rolar());
            try {
              const dados = await this.post(this.mensagemUrl, {
                session_id: this.sessionId,
                message: texto,
              });
              this.mensagens.push({ papel: 'assistente', texto: dados.reply });
              this.$nextTick(() => this.rolar());
            } catch (e) {
              this.erro = e.message || 'A mensagem não foi enviada.';
            } finally {
              this.ocupado = false;
            }
          },
          async usarNoFormulario() {
            if (!this.sessionId) return;
            this.erro = '';
            this.ocupado = true;
            try {
              const dados = await this.post(this.finalizarUrl, { session_id: this.sessionId });
              this.descricao = dados.descricao;
              this.aberto = false;
              this.$nextTick(() => document.getElementById('descricao')?.focus());
            } catch (e) {
              this.erro = e.message || 'Não foi possível montar a descrição.';
            } finally {
              this.ocupado = false;
            }
          },
          rolar() {
            const el = this.$refs.lista;
            if (el) el.scrollTop = el.scrollHeight;
          },
          async post(url, body) {
            const r = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': this.csrf,
                'X-Requested-With': 'XMLHttpRequest',
              },
              body: JSON.stringify(body),
              credentials: 'same-origin',
            });
            const dados = await r.json().catch(() => ({}));
            if (!r.ok) {
              throw new Error(dados.erro || dados.message || 'Falha na assistência.');
            }
            return dados;
          },
        };
      }
    </script>
  @endif
@endsection
