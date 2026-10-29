# Plano-mestre de execução e infraestrutura

## Observatório Social Brasil — Plataforma nacional de monitoramento de compras públicas

| Campo | Valor |
|-------|-------|
| Versão | 1.0 |
| Data | 2026-10-21 |
| Status | **Documento de execução** — pronto para iniciar e conduzir o projeto até o go-live |
| Pasta | `trigger/50` |
| Complementa | `DOCUMENTO-OFICIAL-PROJETO.md` (especificação de negócio e domínio) |
| Referência técnica | `trigger/23` — Observatório de Licitações (Uberlândia) |
| Infraestrutura inicial | **AWS Lightsail** (decisão oficial) |

Este documento é o **guia operacional completo** do projeto: o que construir, como hospedar, em que ordem, com quais decisões técnicas fechadas e quais critérios marcam o fim de cada etapa até a entrega final.

> Princípio de condução: **recomendar e decidir o melhor caminho**. Quando houver trade-off, a decisão está registrada abaixo — não fica em aberto para a equipe “descobrir depois”.

---

## 0. Veredito executivo (ler primeiro)

| Dimensão | Decisão oficial |
|----------|-----------------|
| Produto | Plataforma multiunidade (organização → matriz → filiais) para monitorar compras públicas via Compras.gov / PNCP |
| Estratégia de construção | Generalizar o `trigger/23` (já validado), não reinventar a stack |
| Hospedagem v1 | **1 instância AWS Lightsail** + Docker Compose + Caddy (HTTPS) + SQLite em disco |
| Arquitetura v1 | **Monólito modular** (um serviço `app`), sem microserviços, sem filas, sem RDS |
| Frontend v1 | UI estática servida pelo mesmo container (separação lógica, deploy único) |
| Banco v1 | SQLite com backup diário; Postgres só se métricas justificarem |
| Segurança | Auth no app + HTTPS + firewall Lightsail; sem Cognito na v1 |
| Caminho de evolução | Lightsail → (se necessário) EC2/RDS/S3; nunca começar pelo desenho “enterprise” |
| Critério de sucesso | Filiais operando com dados oficiais, HTTPS estável, backup restaurável, health verde |

**Por que Lightsail e não EC2/EKS/ECS logo de início?**  
Custo previsível, firewall simples, IP estático, snapshots, DNS e certificados gerenciáveis por uma OSC com equipe enxuta. EKS/ECS/ALB/NAT Gateway queimam crédito e complexidade sem ganho na v1. Lightsail é o melhor ponto de partida; a porta de saída para EC2/RDS permanece documentada.

---

## 1. Visão do sistema (o que será entregue)

### 1.1. Problema

Observatórios sociais precisam acompanhar licitações e contratações públicas com dados oficiais, em múltiplos municípios e unidades (filiais), sem duplicar coleta nem depender de planilhas manuais.

### 1.2. Solução

Uma plataforma web centralizada que:

1. Administra **organização → matriz → filiais → usuários/papéis**
2. Associa **municípios (IBGE)** e **UASGs** por filial
3. Configura parâmetros de coleta com **herança** (global → matriz → filial)
4. Coleta de forma **centralizada e deduplicada** na API Dados Abertos do Compras.gov.br
5. Enriquece **CNPJ** e **CEP** com cadeias de APIs públicas (failover)
6. Expõe consultas e indicadores **por escopo** (matriz vê consolidado; filial vê o seu)

### 1.3. O que o usuário final experimenta

| Persona | Experiência principal |
|---------|----------------------|
| Admin geral | Provisiona organização, limites globais, saúde da plataforma |
| Admin / gestor matriz | Cadastra filiais, define municípios/UASGs, acompanha coletas |
| Gestor / analista filial | Consulta contratações, itens, fornecedores do seu escopo |
| Auditor | Leitura auditável, sem alterar configuração |

### 1.4. Fronteiras do produto (v1)

**Entra na v1**

- Multiunidade organizacional e auth por papéis  
- Sync UASG/órgão + coleta 07 (contratações → itens → resultados)  
- Enriquecimento CNPJ/CEP  
- Consultas por escopo + indicadores operacionais básicos  
- Deploy Lightsail com HTTPS, health, backup/restore  

**Fica fora da v1 (roadmap explícito)**

- Microserviços, Redis/Celery, Kubernetes  
- Power BI (proibido na v1; analytics nativos em `/api/consultas`)  
- Alertas avançados / IA analítica como dependência crítica  
- Multi-região AWS, CDN global, Cognito  

Detalhe de domínio, ER e APIs: ver `DOCUMENTO-OFICIAL-PROJETO.md` e `DIAGRAMA-RELACIONAMENTO-API-COMPRAS-GOV.txt`.

---

## 2. Arquitetura de software (decisão de engenharia)

### 2.1. Estilo arquitetural — monólito modular

```text
┌─────────────────────────────────────────────────────────────┐
│                    CONTAINER "app" (único)                  │
│  FastAPI  ·  SQLAlchemy  ·  SQLite  ·  agendador interno    │
│  frontend estático (app/static)                             │
│                                                             │
│  módulos lógicos:                                           │
│    org/  territorial/  config/  coleta/  compras/           │
│    enriquecimento/  auth/  consultas/  health/  backup/     │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              v                           v
     APIs externas                  Volume disco
     Compras.gov · CNPJ · CEP       data/*.db · backups
```

**Por que monólito modular?**  
Um processo, um healthcheck, um volume, um deploy. Adequado a Lightsail de 1–2 GB RAM. Separação por pastas/módulos permite extrair serviços depois — sem pagar o custo agora.

### 2.2. Stack oficial (herdada e fechada)

| Camada | Tecnologia | Motivo da escolha |
|--------|------------|-------------------|
| Linguagem | Python 3.11+ | Ecossistema do `trigger/23`, maturidade em HTTP/dados |
| API | FastAPI | Tipagem, OpenAPI, async com `httpx`, velocidade de entrega |
| ORM | SQLAlchemy 2.x | Portável SQLite→Postgres sem reescrever domínio |
| Banco v1 | **SQLite (WAL)** — ver §2.2.1 | Ideal na escala OSC + multi-tenant **em aplicação**; zero ops no Lightsail |
| HTTP cliente | httpx + retries/backoff | Rate limit e failover de APIs públicas |
| Frontend | HTML/CSS/JS estático no mesmo deploy | Sem build Node obrigatório; OSC mantém com pouco overhead |
| Container | Docker + Compose | Reprodutível local ↔ Lightsail |
| Reverse proxy / TLS | Caddy 2 | Let's Encrypt automático, config mínima |
| Testes | pytest + mocks HTTP | Contrato de API protegido (padrão 23) |

#### 2.2.1. SQLite é ideal para este multi-tenant? — decisão oficial

**Veredito:** sim para a **v1 e para o perfil real deste produto** (OSC, poucos escritores concorrentes, tenancy lógico). Não como dogma eterno: Postgres entra quando os gatilhos abaixo forem medidos — não “porque é multi-tenant”.

Multi-tenant aqui **não** significa “um banco por filial” nem isolamento no motor SQL. Significa:

- **uma base central** de dados públicos (contratações, UASGs, fornecedores);
- **escopo na aplicação** (`organizacao_id` / `unidade_id` / `FILIAL_UASG` nas consultas);
- coleta **serializada** pelo planejador (um escritor dominante).

Nesse desenho, o banco não precisa ser “multi-tenant-aware”. Precisa ser confiável, simples no Lightsail e portável via SQLAlchemy.

| Pergunta | Resposta |
|----------|----------|
| SQLite impede matriz/filiais/papéis? | **Não.** Tenancy é regra de autorização + filtros no servidor. |
| SQLite impede deduplicar coleta entre filiais? | **Não.** Favorece: uma base, um planejador. |
| SQLite é frágil com N usuários lendo? | **Não**, com WAL e leituras típicas de OSC (dezenas, não milhares simultâneos). |
| Onde SQLite dói? | Muitos **escritores** simultâneos, DB grande (ordem de dezenas de GB), várias réplicas do `app`, analytics pesado em cima do OLTP. |

**Por que não Postgres no dia 1**

- Custo/ops no Lightsail (processo extra ou RDS) sem ganho de produto na primeira entrega  
- O gargalo inicial é API Compras.gov + modelagem de escopo, não o motor SQL  
- SQLAlchemy 2.x já isola o dialeto: migrar schema depois é projeto controlado, não reescrita  

**Regras de modelagem obrigatórias (com SQLite ou Postgres)**

1. Toda tabela de configuração/escopo carrega chave de unidade/organização quando couber  
2. Dados públicos (contratação, item, UASG) **não** se duplicam por filial  
3. Visibilidade = join/`IN` em `FILIAL_UASG` (e equivalentes), **sempre no servidor**  
4. Coleta grava com lock lógico de job (uma execução ativa) — evita “database is locked” sob pico  
5. Índices em `codigoUasg`, `idCompra`, `niFornecedor`, FKs de escopo  

**Gatilhos objetivos para migrar para Postgres** (basta **um** sustentado)

| Gatilho | Limiar orientativo |
|---------|-------------------|
| Tamanho do DB | Sustentadamente **> ~8–10 GB** ou backup/restore inviável na janela da OSC |
| Concorrência de escrita | Timeouts/`database is locked` frequentes mesmo com WAL + coleta serial |
| Instâncias do app | Precisar de **2+** réplicas atrás de load balancer |
| Consultas analíticas | Relatórios pesados degradando a API operacional no mesmo arquivo |
| Requisito institucional | HA, PITR, ou política que exija SGBD gerenciado |

Até lá: **SQLite (WAL) é a escolha certa** — inclusive para a estrutura multiunidade.

**Rejeitado na v1 (e por quê)**

| Alternativa | Motivo da rejeição agora |
|-------------|--------------------------|
| NestJS / Go / Java | Reescreveria o capital técnico do 23 sem ganho de produto |
| React/Next separado | Dois deploys, CORS, mais RAM; separar só quando UX exigir SPA complexa |
| Postgres/RDS já no dia 1 | Multi-tenant **não exige** Postgres; custo + ops sem ganho na v1 |
| Um SQLite por filial | Pior: quebra dedupe, multiplica backup e inconsistência |
| Redis + Celery | Coleta cabe no agendador in-process; filas quando houver jobs longos paralelos |
| Traefik / Nginx complexo | Caddy cobre HTTPS com menos peças |
| Cognito / Auth0 | Auth de sessão no app já resolve papéis e tetos na escala OSC |

### 2.3. Princípios de engenharia (não negociáveis)

1. **Uma mudança por passo** → `verify` verde → próxima  
2. **Autorização sempre no servidor** (nunca só no front)  
3. **Base central + escopo** — não duplicar contratação por filial  
4. **Planejador deduplica** pedidos iguais de UASG/módulo/período  
5. **Falha de CNPJ/CEP não aborta** coleta Compras.gov  
6. **Rastreabilidade**: fonte, id original, endpoint, execução  
7. **Sem overengineering** até métrica ou requisito real exigir  

### 2.4. Modelo de dados — visão de execução

```text
ORGANIZACAO ──< UNIDADE (matriz|filial)
USUARIO ──< USUARIO_UNIDADE >── UNIDADE

MUNICIPIO(IBGE) · FILIAL_MUNICIPIO
ORGAO ──< UASG · FILIAL_UASG

CONFIGURACAO_COLETA (global|matriz|filial) + histórico

CONTRATACAO_PNCP ──< ITENS ──< RESULTADOS → FORNECEDOR
(+ PGC, CATMAT/CATSER, PESQUISA_PRECO conforme fase)

ENRIQUECIMENTO: cnpj_* / cep_* (json + fonte + timestamp)
EXECUCAO_COLETA / REQUISICAO_COLETA (auditoria operacional)
```

Precedência de config: **global → matriz → filial (se autorizada)**.

### 2.5. UX / UI — decisões de produto

| Decisão | Posição |
|---------|---------|
| Paradigma | Telas orientadas a tarefa (Setup → escopo → coleta → consulta), não “dashboard genérico” |
| Primeira sessão | Onboarding: organização/matriz → primeira filial → município → UASGs → ativar coleta |
| Feedback de coleta | Status claro (agendada / rodando / ok / falha parcial) com última execução |
| Escopo visual | Sempre visível o **escopo do login** (plataforma / consolidado matriz / filial) |
| Acessibilidade | Contraste WCAG AA, formulários com labels, tabelas navegáveis por teclado |
| Mobile | Consultas e status usáveis em viewport estreita; admin pesado prioriza desktop |
| Densidade | Dados tabulares com filtros; evitar cards decorativos e métricas falsas |

Não inventar “AI dashboard” na v1. Indicadores = fatos da base + status operacional.

### 2.5.1. Escopo e identidade — decisão oficial (substitui «Unidade Ativa»)

| Persona | Escopo após o login | UI |
|---------|---------------------|-----|
| Admin geral | Plataforma (vê tudo); filtro de visão **opcional** | Rótulo «Plataforma»; filtro só se quiser estreitar |
| Matriz | Consolidado da org (filiais descendentes no ACL) | Drill-down = filtro ⊆ ACL, não «virar» filial |
| Filial | União das filiais vinculadas | Seletor de filial só em Território/Config (tarefa) |

**Regras**

1. Autorização = `USUARIO_UNIDADE` + hierarquia **matriz → filiais** (servidor).  
2. «Filtro de visão» (sessão) **estreita**, nunca amplia.  
3. Setup territorial e config usam seletor **na página**, não switcher global de identidade.  
4. Coleta continua central e deduplicada por `FILIAL_UASG` — independente da UI.  
5. Associação usuário↔processo (monitoramento pessoal) é preferência futura, separada do ACL.

**Rejeitado:** «Unidade Ativa» como fonte de verdade de tenancy (padrão legado do `trigger/23`).

---

## 3. Arquitetura de infraestrutura (AWS Lightsail)

### 3.1. Topologia alvo — Fase Infra A (go-live)

```text
                    Internet
                        │
                        │  DNS A → IP estático Lightsail
                        v
              ┌─────────────────────┐
              │  AWS Lightsail VM   │
              │  Ubuntu LTS         │
              │  Firewall: 22/80/443│
              │                     │
              │  Docker Compose     │
              │   ┌─────┐  ┌─────┐  │
              │   │Caddy│─►│ app │  │
              │   │:80  │  │:8096│  │
              │   │:443 │  └──┬──┘  │
              │   └─────┘     │     │
              │               v     │
              │         disco/SSD   │
              │         ./data      │
              │         backups     │
              └─────────────────────┘
                        │
                        │ (opcional, pós go-live)
                        v
              Snapshot Lightsail + cópia backup p/ bucket S3
```

### 3.2. Dimensionamento recomendado (decisão)

| Item | Escolha oficial v1 | Justificativa |
|------|--------------------|---------------|
| Plano Lightsail | **$10–12/mês** (2 GB RAM / 1–2 vCPU / 60 GB SSD) ou o menor com **≥ 2 GB RAM** | 1 GB fica apertado com Docker + coleta; 2 GB é o sweet spot OSC |
| SO | Ubuntu 24.04 LTS | Suporte longo, docs abundantes |
| Região | A mais próxima dos usuários BR com Lightsail disponível (ex.: **sa-east-1** se ofertado; senão us-east-1) | Latência e conformidade prática |
| IP | IP estático Lightsail | DNS estável |
| Disco | SSD do plano + volume de dados no host (`./data`) | Snapshots cobrem a VM; backup app cobre o SQLite |
| SSH | Chave SSH; desabilitar login por senha | Baseline de segurança |
| Domínio | Domínio da organização (A → IP) | HTTPS com Let's Encrypt |

**Regra de custo:** evitar ALB, NAT Gateway, RDS, Elastic IPs avulsos fora do Lightsail, e instâncias ociosas. Lightsail já embute IP e firewall previsíveis.

### 3.3. Componentes na VM

| Componente | Função |
|------------|--------|
| Docker Engine + Compose plugin | Runtime |
| Serviço `app` | API + UI + agendador + coleta |
| Serviço `caddy` (profile `https`) | TLS + reverse proxy |
| Cron no host (ou timer systemd) | `backup_data.sh` diário + retenção |
| UFW / firewall Lightsail | Só 22 (admin), 80, 443 |

Porta do app no host em produção HTTPS: **não publicar 8096 publicamente**; só Caddy fala com a internet.

### 3.4. Rede e segurança

```text
Entrada permitida:
  22/tcp  → IPs administrativos (ideal: restringir) ou fail2ban
  80/tcp  → ACME + redirect HTTPS
  443/tcp → aplicação

Saída:
  443/tcp → Compras.gov, BrasilAPI, ViaCEP, demais fontes, Let's Encrypt
```

Controles de aplicação:

- Cookie de sessão com `Secure` em HTTPS  
- Uma sessão ativa por conta (padrão 23), se mantido  
- Rate limit / tetos de coleta configuráveis  
- Segredos só em env / arquivo não versionado (`.env`)  
- Logs sem tokens  

### 3.5. Persistência, backup e recuperação

| Artefato | Onde | Retenção mínima |
|----------|------|-----------------|
| `data/*.db` (+ WAL) | Disco da VM | Contínuo |
| Backup app (`backup_data.sh`) | `data/backups/` | 7–14 dias locais |
| Snapshot Lightsail | Console AWS | Semanal + antes de upgrade |
| Cópia offsite (recomendado pós go-live) | S3 com lifecycle | 30 dias |

**RTO/RPO alvo v1 (OSC):**  

- RPO ≤ 24 h (backup diário)  
- RTO ≤ 4 h (restore de snapshot ou `restore_data.sh` + `compose up`)

Teste de restore obrigatório antes do go-live (pelo menos uma vez).

### 3.6. Observabilidade enxuta (sem Grafana na v1)

| Sinal | Como |
|-------|------|
| Liveness/readiness | `GET /api/health` (inclui check de DB) |
| Compose | `healthcheck` no serviço `app` |
| Coleta | Tabelas `EXECUCAO_COLETA` + tela de status |
| Disco | Alerta manual / cron que falha se uso > 80% |
| Uptime externo | Opcional: UptimeRobot/Hetrix (gratuito) no `/api/health` |

Prometheus/Grafana: **só** se a operação diária mostrar necessidade.

### 3.7. Pipeline de deploy (decisão)

```text
Dev local (Docker)
    → git push (GitHub/GitLab)
        → na VM: git pull && docker compose --profile https up -d --build
            → curl -sI https://$DOMAIN/api/health
```

CI opcional na v1: GitHub Actions rodando **pytest** no PR (sem deploy automático). Deploy automático (CD) só depois do processo de backup/restore estar rotineiro.

### 3.8. Procedimento de provisionamento Lightsail (checklist)

1. Criar instância Ubuntu LTS, plano ≥ 2 GB, região escolhida  
2. Anexar IP estático; abrir 22/80/443 no firewall Lightsail  
3. SSH com chave; `apt update && apt upgrade`  
4. Instalar Docker + Compose (oficial Docker)  
5. Criar usuário de deploy (sem root no dia a dia)  
6. `git clone` do repositório; criar `.env` (DOMAIN, secrets)  
7. Apontar DNS A do domínio para o IP estático  
8. `docker compose --profile https up -d --build`  
9. Validar `https://$DOMAIN/api/health`  
10. Instalar cron de backup; rodar backup + restore de teste  
11. Snapshot Lightsail rotulado `pre-prod-ok`  

### 3.9. Evolução de infraestrutura (quando — e só quando)

| Gatilho observado | Próximo passo |
|-------------------|---------------|
| Disco > 70% sustentado ou DB > ~8–10 GB | Avaliar Postgres gerenciado **ou** disco maior Lightsail |
| Contenção de CPU/RAM na coleta | Plano Lightsail superior **ou** job de coleta em horário ocioso / lotes menores |
| Necessidade de HA / multi-AZ | Migrar app para EC2/ASG + RDS (projeto à parte) |
| Muitos assets estáticos / mapa pesado | CloudFront + S3 para estáticos (app continua na VM) |
| Compliance exige segregação | Conta AWS Organizations + políticas IAM; ainda pode ser Lightsail |

**Não migrar por moda.** Migrar por métrica.

---

## 4. Integrações externas

### 4.1. Núcleo — Compras.gov / PNCP

| Item | Valor |
|------|-------|
| Base | `https://dadosabertos.compras.gov.br` |
| Swagger | `/swagger-ui/index.html` |
| Ordem de carga | 05 (UASG) → 07 (contratações→itens→resultados) → 01/02/10 → 04/03 conforme fase |
| Cuidado | `codigoModalidade` ≠ `modalidadeIdPncp` |

Planejador central consolida necessidades de todas as filiais antes de bater na API.

### 4.2. Acessórias — CNPJ e CEP (cadeias oficiais)

**CNPJ:** BrasilAPI → Minha Receita → CNPJá Open → Pública CNPJ.ws  

**CEP:** BrasilAPI → ViaCEP → AwesomeAPI → OpenCEP  

Política: cache → cadeia → DTO interno → persistir fonte; falha total = pendência, não aborta coleta principal.

### 4.3. IA (opcional, não bloqueante)

Tokens no Setup, criptografados, rotacionáveis (padrão 23). Nenhuma feature crítica da v1 depende de IA.

---

## 5. Segurança, privacidade e governança

| Tema | Posição |
|------|---------|
| Dados | Públicos (compras abertas) + cadastros internos (usuários, configs) |
| Isolamento | Filial não vê outra; matriz conforme papel |
| Auditoria | Quem alterou filial/UASG/parâmetro; execuções de coleta |
| Credenciais | `.env` fora do Git; permissões 600 na VM |
| LGPD | Minimizar dados pessoais de usuários; base legal do cadastro institucional; sem expor CPF de usuários em logs |
| Patching | `unattended-upgrades` ou janela mensal de update + snapshot prévio |

---

## 6. Plano de execução ponta a ponta

Cada fase tem **entrada**, **saída mensurável** e **critério de aceite**. Não avançar sem aceite.

### Fase 0 — Fundação do repositório e disciplina (3–5 dias)

**Entrada:** este documento + `DOCUMENTO-OFICIAL-PROJETO.md` + acesso ao `trigger/23`.

**Trabalho:**

- Scaffold do projeto (layout espelhando 23: `app/`, `data/`, `scripts/`, `docker-compose.yml`, `Caddyfile`)  
- Health, verify, backup/restore mínimos  
- README operacional (run local + deploy Lightsail)  
- Decisões deste plano versionadas  

**Aceite:** `docker compose up` local + `/api/health` 200 + `verify.sh` verde.

---

### Fase 1 — Organização, usuários e papéis (1–2 semanas)

**Trabalho:** modelos ORGANIZACAO / UNIDADE / USUARIO / USUARIO_UNIDADE; auth; telas admin mínimas.

**Aceite:** admin geral cria matriz e filial; usuários com papéis distintos; isolamento verificado por teste.

---

### Fase 2 — Território e UASGs (1–2 semanas)

**Trabalho:** municípios IBGE; sync órgão/UASG (API 05); `FILIAL_MUNICIPIO` / `FILIAL_UASG`; histórico de vínculo.

**Aceite:** filial seleciona município → lista UASGs oficiais → ativa monitoramento sem apagar histórico ao desativar.

---

### Fase 3 — Configuração herdada (3–5 dias)

**Trabalho:** parâmetros global/matriz/filial; herança; exceções autorizadas; versionamento.

**Aceite:** alterar padrão da matriz reflete nas filiais sem exceção; filial autorizada sobrescreve só o permitido.

---

### Fase 4 — Integração Compras.gov núcleo (2–3 semanas)

**Trabalho:** cliente HTTP; normalizadores; carga 05→07→itens→resultados; chaves de join preservadas.

**Aceite:** para UASG de teste, contratações/itens/resultados persistidos e consultáveis; testes com mock HTTP.

---

### Fase 5 — Motor de coleta central (1–2 semanas)

**Trabalho:** planejador; paginação; incremental; dedupe entre filiais; `EXECUCAO_COLETA`; reprocessamento; agendamento.

**Aceite:** duas filiais com mesma UASG geram **uma** sequência de HTTP; falhas parciais registradas e recuperáveis.

---

### Fase 6 — CNPJ + CEP (3–5 dias)

**Trabalho:** cadeias, cache, job de pendentes, campos `fonte_*`.

**Aceite:** queda da fonte 1 usa fonte 2; coleta 07 segue se enriquecimento falhar.

---

### Fase 7 — Consultas, indicadores e UX de operação (1–2 semanas)

**Trabalho:** listagens/filtros por escopo; indicadores operacionais; status de coleta; polish do onboarding.

**Aceite:** matriz e filial veem apenas o autorizado; indicadores batem com contagens reais do banco.

---

### Fase 8 — Produção Lightsail e endurecimento (3–5 dias)

**Trabalho:** provisionar VM; DNS; HTTPS; backup cron; restore testado; snapshot; uptime check; runbook.

**Aceite (definição de “projeto v1 pronto”):**

- [x] Artefatos: health fase 8, `RUNBOOK.md`, `docker-compose.prod.yml`, `go_live_check.sh`, UI Operação  
- [x] Power BI ausente (`power_bi: false` no health/ops)  
- [ ] `https://<domínio>/api/health` verde (na VM)  
- [ ] Login e papéis em produção  
- [ ] Pelo menos 1 filial com coleta real concluída  
- [ ] Backup automático instalado e restore ensaiado  
- [ ] Snapshot Lightsail documentado  
- [ ] Runbook aplicado em incidente real ou ensaio documentado  

---

### Fase 9 — Estabilização e roadmap analítico (contínuo)

**Entregue agora (v1.0):** alertas configuráveis; comparativos nativos (UASG/modalidade); roadmap no app; fence anti-Power-BI no boot.

**Após 2–4 semanas estáveis na VM (ainda sem Power BI):**

- Pesquisa de preço (03), PGC (04)  
- Extensões por filial (portais/CSV locais) se necessário — **nunca** via Power BI  
- Avaliar Postgres se volume exigir  

---

## 7. Organização do trabalho (papel de especialistas)

| Frente | Responsável típico | Entrega |
|--------|--------------------|---------|
| Arquitetura / tech lead | Fecha ADRs e barreiras de overengineering | Este plano + revisões de PR críticas |
| Backend / dados | Domínio, coleta, schema, testes de contrato | Fases 1–6 |
| Frontend / UX | Fluxos Setup, escopo, consultas, estados vazios/erro | Fases 1, 2, 7 |
| DevOps / infra | Lightsail, TLS, backup, monitor mínimo | Fases 0 e 8 |
| Produto / domínio OSC | Prioriza UASGs, valida semântica de indicadores | Aceites de negócio |
| Segurança (leve) | Review de auth, secrets, firewall | Checklist pré go-live |

Time mínimo viável: **1 fullstack + 1 domínio OSC** (part-time), com revisão de arquitetura nos gates de fase.

---

## 8. Estrutura de repositório recomendada

```text
trigger/50/   (ou repositório dedicado derivado)
├── PLANO-MESTRE-EXECUCAO-E-INFRAESTRUTURA.md   ← este arquivo
├── DOCUMENTO-OFICIAL-PROJETO.md
├── DIAGRAMA-RELACIONAMENTO-API-COMPRAS-GOV.txt
├── IDEIA_ESBOCO.txt
├── README.md
├── docker-compose.yml
├── Caddyfile
├── Dockerfile
├── requirements.txt
├── .env.example
├── app/
│   ├── main.py
│   ├── health.py
│   ├── auth/
│   ├── org/
│   ├── territorial/
│   ├── config_coleta/
│   ├── coleta/
│   ├── compras/
│   ├── enriquecimento/   # cnpj + cep
│   ├── consultas/
│   └── static/
├── scripts/
│   ├── verify.sh
│   ├── backup_data.sh
│   ├── restore_data.sh
│   └── install_backup_cron.sh
├── data/                 # gitignored (db + backups)
└── tests/
```

---

## 9. Variáveis de ambiente essenciais

```text
# App
APP_PORT=8096
AUTH_COOKIE_SECURE=auto
AUTH_SESSION_IDLE_MINUTOS=30
AUTH_SESSION_DIAS=7

# HTTPS / Lightsail
DOMAIN=observatorio.exemplo.org
APP_HOST_PORT=          # vazio em produção com Caddy

# CNPJ
CNPJ_PUBLICO_CACHE_DIAS=30
CNPJ_PUBLICO_HTTP_TIMEOUT_SEC=25

# CEP
CEP_PUBLICO_CACHE_DIAS=90
CEP_PUBLICO_HTTP_TIMEOUT_SEC=15

# Coleta
COLETA_RATE_LIMIT_RPM=...   # calibrar em staging
COLETA_LOTE_INTERVALO_SEC=...
```

Valores de URL das cadeias CNPJ/CEP: ver documento oficial §8.

---

## 10. Critérios de qualidade (Definition of Done)

Uma fase só fecha se:

1. Testes automatizados da fatia passam  
2. `./scripts/verify.sh` verde  
3. Health responde com DB ok  
4. Nenhuma credencial commitada  
5. Comportamento de escopo/autorização coberto por pelo menos um teste  
6. README da fatia atualizado se houver novo procedimento operacional  

Go-live só com Fase 8 completa (checklist §6).

---

## 11. Riscos e mitigações

| Risco | Impacto | Mitigação oficial |
|-------|---------|-------------------|
| Rate limit Compras.gov / APIs públicas | Coleta incompleta | Backoff, dedupe, tetos, cadeia CNPJ/CEP |
| SQLite sob escrita concorrente | Lock / lentidão | WAL; coleta serializada; upgrade path Postgres documentado |
| VM única (SPOF) | Indisponibilidade | Snapshot + backup offsite; RTO aceito pela OSC |
| Escopo mal isolado | Vazamento entre filiais | Testes de autorização; review obrigatório em PRs de consulta |
| Overengineering precoce | Atraso / custo | Gate do tech lead; lista “rejeitado na v1” |
| DNS/HTTPS mal configurado | Sem acesso público | Checklist Fase 8; validar ACME antes de anunciar URL |

---

## 12. Runbook mínimo de produção (1 página operacional)

**Subir / atualizar**

```bash
cd /opt/observatorio   # caminho na VM
git pull
docker compose --profile https up -d --build
curl -sI "https://${DOMAIN}/api/health"
```

**Backup manual**

```bash
./scripts/backup_data.sh manual 14
```

**Restore**

```bash
docker compose --profile https down
./scripts/restore_data.sh data/backups/<arquivo>
docker compose --profile https up -d
```

**Incidente típico**

1. Health vermelho → logs `docker compose logs app --tail 200`  
2. Disco cheio → limpar backups antigos; não apagar `*.db` ativo  
3. Certificado → confirmar DNS A e portas 80/443; reiniciar Caddy  
4. Rollback → `git checkout <tag-estavel>` + rebuild; ou snapshot Lightsail  

---

## 13. Decisões oficiais consolidadas (ADR resumido)

| # | Decisão | Escolha |
|---|---------|---------|
| ADR-01 | Hospedagem inicial | AWS Lightsail (≥ 2 GB) |
| ADR-02 | Forma do sistema | Monólito modular em um container |
| ADR-03 | Stack | FastAPI + SQLAlchemy + SQLite (WAL) + Docker + Caddy |
| ADR-03b | Multi-tenant × banco | Tenancy na **aplicação** + base única; SQLite ideal na v1; Postgres só por gatilho (§2.2.1) |
| ADR-04 | Frontend | Estático no mesmo deploy |
| ADR-05 | Multi-tenant | Organização/matriz/filial + escopo em consulta |
| ADR-06 | Coleta | Planejador central com deduplicação |
| ADR-07 | Enriquecimento | Cadeias CNPJ e CEP com failover |
| ADR-08 | Auth | Sessão no app; sem Cognito na v1 |
| ADR-09 | Observabilidade | Health + logs + status de coleta; sem stack de métricas |
| ADR-10 | Evolução | Métricas disparam Postgres/EC2/S3 — não o calendário |

---

## 14. Relação com os outros documentos desta pasta

| Documento | Uso |
|-----------|-----|
| **Este arquivo** | Execução, infra Lightsail, fases, DoD, runbook |
| `DOCUMENTO-OFICIAL-PROJETO.md` | Spec de negócio, domínio, APIs acessórias |
| `DIAGRAMA-RELACIONAMENTO-API-COMPRAS-GOV.txt` | ER e joins da API federal |
| `IDEIA_ESBOCO.txt` | Memória conceitual expandida |

Em conflito pontual de implementação vs. ideia antiga: **prevalecem este plano + o documento oficial**.

---

## 15. Síntese

Começar **pequeno e correto** no Lightsail, com a stack que o `trigger/23` já provou, generalizada para matriz/filiais. Entregar valor em fases com aceite explícito. Só então crescer infraestrutura.

> **Melhor caminho:** Lightsail + monólito modular + SQLite + Caddy + planejador central + cadeias CNPJ/CEP — até o produto e as métricas pedirem o próximo degrau.

---

*Documento gerado em 2026-10-21. Pronto para iniciar a Fase 0.*
