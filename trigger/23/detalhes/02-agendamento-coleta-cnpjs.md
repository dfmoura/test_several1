# Prompt · Agendamento de coleta + cadeia CNPJs pendentes

## Contexto do projeto

Já existem:
- coleta unificada (`POST /api/coleta` / hub em `app/coleta_hub.py`)
- job de CNPJs pendentes em vencedores (`app/compras/job_pendentes_cnpj.py` e tela CNPJs vencedores)
- página **Setup** para configurações do sistema

## Objetivo

Permitir agendar a coleta para rodar de madrugada e, **ao finalizar com sucesso**, disparar automaticamente o processamento dos **CNPJs pendentes** (vencedores), em sequência. A configuração deve ser editável na tela **Setup** (não depender só de cron manual na VM).

## Requisitos funcionais

1. No **Setup**, seção **Agendamento**:
   - ligar/desligar
   - horário diário (ex.: 02:00), fuso America/Sao_Paulo
   - opções do que entra na cadeia:
     - [x] Coleta unificada (com parâmetros salvos: fontes, ano, unidades, fases, datasets — reutilizar defaults sensatos da tela Coleta)
     - [x] Após sucesso da coleta → job CNPJs pendentes
     - [x] Ao final da cadeia → buscar preços de mercado (IA), **item a item**, somente **Tipo = Material** em Propostas abertas que **ainda não** têm análise com `status=ok` (reutilizar `executar_busca_mercado` — mesma rotina do botão; opt-in, desligado por padrão; não reprocessa os já analisados)
   - status da última execução (início, fim, ok/erro, resumo curto)
2. **Cadeia obrigatória quando etapas ativas:**
   1. roda coleta (se marcada)
   2. se coleta OK (ou coleta omitida) → roda CNPJs (se marcada)
   3. se etapas anteriores OK → roda preços de mercado Materiais (se marcada)
   4. se coleta falhar → **não** roda CNPJs nem mercado; registra erro
3. Execução também manual no Setup: botão “Rodar agora (cadeia)”.
4. Apenas **admin** configura e dispara.
5. Evitar sobreposição: se já houver job rodando, não iniciar outro (lock/flag).
6. Busca de mercado: um item por vez; só pendentes (sem análise OK); falha em um item não interrompe a fila; tokens/rotação do Setup.

## Requisitos técnicos

- Agendador **interno ao app** (ex.: APScheduler / loop asyncio / thread com sleep), lendo config do SQLite
- Persistir config em tabela isolada (ex.: `agendamento_config`, `agendamento_execucao`)
- Reutilizar endpoints/funções já existentes de coleta e de job CNPJ — não duplicar lógica de negócio
- Logs claros no status (mesmo espírito do painel de status da Coleta)
- Robustez: app reiniciou → reagenda conforme config salva

## Alternativa operacional (documentar no README, não substituir o Setup)

Na VM AWS ainda pode existir cron de backup chamando um endpoint interno autenticado; a fonte da verdade da config continua sendo o Setup.

## Fora de escopo

- Crontab só no SO sem UI
- Filas Redis/Celery
- Múltiplos horários por semana (pode deixar extensível; v1 = diário)

## Critérios de aceite

- Com agendamento ligado às 02:00, a cadeia dispara sozinha
- CNPJs só rodam depois da coleta bem-sucedida
- Setup mostra última execução e permite desligar
- Segundo disparo simultâneo é recusado
