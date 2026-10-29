# Documento oficial do projeto

## Observatório Social Brasil — Plataforma nacional de monitoramento de compras públicas

| Campo | Valor |
|-------|-------|
| Versão | 1.0 |
| Data | 2026-10-21 |
| Status | Documento fundacional (especificação oficial) |
| Pasta | `trigger/50` |
| Sistema de referência (implementação já existente) | `trigger/23` — Observatório de Licitações (Compras.gov + Power BI) |
| Fontes conceituais nesta pasta | `IDEIA_ESBOCO.txt`, `DIAGRAMA-RELACIONAMENTO-API-COMPRAS-GOV.txt` |

Este documento é a **especificação oficial** do novo sistema. Consolida a temática organizacional (matriz / filiais / municípios / UASGs), o modelo de integração com a API Dados Abertos do Compras.gov.br e a estratégia de APIs acessórias gratuitas (CNPJ e CEP) com failover para não depender de um único provedor.

---

## 1. Objetivo

Construir uma plataforma para o **Observatório Social Brasil** monitorar compras públicas de forma **centralizada e multiunidade**, com:

- cadastro de **organização → matriz → filiais**;
- usuários e papéis com isolamento por unidade;
- municípios (código IBGE) e seleção de **UASGs** por filial;
- parâmetros de coleta herdados (global → matriz → filial);
- coleta **centralizada** na API oficial Compras.gov / PNCP (Lei 14.133);
- base única de dados públicos, com **visibilidade por escopo** (não duplicar o mesmo processo para cada filial);
- enriquecimento de **CNPJ** e **CEP/endereço** via APIs públicas gratuitas, com **cadeia de fallback**.

O produto resultante generaliza o que o `trigger/23` já prova em escala municipal (Uberlândia), elevando o desenho para **várias filiais e municípios** sem perder a disciplina operacional do Free Tier.

---

## 2. Relação com o sistema de referência (`trigger/23`)

O `trigger/23` permanece a **referência de implementação**: stack, padrões de coleta, health, backup, auth, Setup, enriquecimento de CNPJ e orquestração.

| Dimensão | `trigger/23` (referência) | Este projeto (`trigger/50`) |
|----------|---------------------------|-----------------------------|
| Escopo | Um município / um “órgão raiz” + UASGs locais | Várias filiais, vários municípios, várias UASGs |
| Organização | Implícita (Observatório local) | Explícita: organização → matriz → filiais |
| Fontes | Compras.gov + CSVs Power BI/PMU | **Compras.gov como único núcleo na v1**; Power BI/portais locais **fora do produto** (não portar) |
| Coleta | Orquestrador + fases (`07`, itens, resultados, `05`, `10`…) | Mesmo espírito, com **planejador central** consolidando necessidades de todas as filiais |
| Auth | Admin / consulta (tetos) | Admin geral + perfis matriz/filial |
| Persistência | SQLite (`data/licitacoes.db`) | Mesmo padrão na v1; evoluir só se carga exigir |
| Deploy | Docker + Free Tier (AWS/OCI) | Idem |
| CNPJ público | Cadeia BrasilAPI → Minha Receita → CNPJá → Pública CNPJ.ws | **Reutilizar e formalizar** a mesma cadeia |
| CEP / endereço | Campos derivados do payload CNPJ | **Camada dedicada CEP** com cadeia própria de APIs gratuitas |

### 2.1. Stack alvo (herdada do 23)

- **Backend:** FastAPI + SQLAlchemy + SQLite
- **HTTP externo:** `httpx` (retries, backoff, User-Agent)
- **Frontend:** estático em `app/static/` (deploy único)
- **Container:** Docker Compose; health em `GET /api/health`
- **Operação:** scripts de verify / backup / restore; agendamento interno ao app
- **Princípios:** sem overengineering na v1 (sem filas Redis/Celery, sem microserviços, sem Cognito/RDS obrigatório)

### 2.2. O que se reaproveita do 23

- Cliente e normalizadores Compras.gov / PNCP (módulos 05, 07, 01, 02, 03, 04, 10)
- Padrão de fases de coleta e checkpoint de itens
- Job de CNPJs pendentes + cache por dias
- Setup (configuração, agendamento, tokens de IA se houver)
- Disciplina: healthcheck, backup SQLite, testes de proteção de contrato de API

### 2.3. O que é novo neste projeto

- Modelo multi-tenant organizacional (matriz/filiais)
- Escopo territorial por `codigoMunicipioIbge` + `FILIAL_UASG`
- Configuração herdada e exceções autorizadas
- Planejador que **deduplica** consultas quando duas filiais pedem a mesma UASG/módulo
- Camada formal de **APIs acessórias CEP + CNPJ** (seção 8)

---

## 3. Visão da arquitetura

```text
                         SISTEMA
                            |
              +-------------+-------------+
              |                           |
              v                           v
     ADMINISTRADOR GERAL          ORGANIZAÇÃO
                                          |
                                          v
                                        MATRIZ
                  +-----------------------+----------------------+
                  |                       |                      |
                  v                       v                      v
           CONFIGURAÇÕES            CADASTRO DE             USUÁRIOS
             PADRÃO                  FILIAIS
                                          |
                         +----------------+----------------+
                         |                                 |
                         v                                 v
                      FILIAL A                          FILIAL N
                         |
                         v
                  MUNICÍPIO(S)  [IBGE]
                         |
                         v
                 CATÁLOGO CENTRAL DE UASGs  ←── API Compras.gov [05]
                         |
                         v
                   FILIAL_UASG + PARÂMETROS
                         |
                         v
                PLANEJADOR CENTRAL DE COLETA
                         |
         +---------------+---------------+
         |               |               |
         v               v               v
   Compras.gov      APIs CNPJ        APIs CEP
   (01–05,07,10…)   (cadeia)         (cadeia)
         |               |               |
         +-------+-------+-------+-------+
                 v
          BASE CENTRAL DE DADOS
                 |
                 v
        CONSULTAS POR ESCOPO (matriz / filial)
```

Cinco componentes lógicos:

1. **Gestão organizacional** — organização, matriz, filiais, usuários, papéis  
2. **Gestão territorial** — municípios IBGE, catálogo UASG/órgão, vínculos filial↔UASG  
3. **Gestão de configurações** — global / matriz / filial, herança e histórico  
4. **Integração e coleta** — Compras.gov + enriquecimento CNPJ/CEP  
5. **Dados e consultas** — base central + controle de acesso por escopo  

---

## 4. Estrutura organizacional e usuários

### 4.1. Hierarquia

```text
SISTEMA
   |
   +-- ADMINISTRADOR GERAL
   |
   +-- ORGANIZAÇÃO
          |
          +-- MATRIZ
          |     +-- Usuários da matriz
          |     +-- Configurações padrão de monitoramento
          |
          +-- FILIAL 01 … N
                +-- Usuários da filial
                +-- Municípios monitorados
                +-- UASGs selecionadas
                +-- Parâmetros de coleta (herdados / exceção)
```

### 4.2. Papéis (proposta inicial)

| Perfil | Responsabilidade |
|--------|------------------|
| Administrador geral | Plataforma, organizações, limites globais de API |
| Administrador da matriz | Filiais, municípios, UASGs, parâmetros padrão |
| Gestor da matriz | Acompanha operações autorizadas |
| Gestor da filial | Opera a filial dentro das permissões |
| Analista da filial | Consulta e analisa dados do escopo |
| Auditor / consulta | Leitura sem administrar configuração |

Regras:

- identidade de usuário separada do vínculo com unidade (`USUARIO` × `USUARIO_UNIDADE`);
- autorização **sempre no servidor**;
- filial não altera livremente UASG/parâmetros sem permissão da matriz;
- desativar usuário bloqueia acesso sem apagar auditoria.

---

## 5. Municípios, órgãos e UASGs

### 5.1. Município

Chave oficial: **`codigoMunicipioIbge`**.  
Uma filial pode monitorar **um ou vários** municípios (`FILIAL_MUNICIPIO`).

### 5.2. Catálogo central (não por filial)

- **ORGAO** — `codigoOrgao`, CNPJ, esfera, poder  
- **UASG** — `codigoUasg`, vínculo com órgão, município IBGE, UF  

A UASG **existe independentemente** da filial. O monitoramento é `FILIAL_UASG`.

### 5.3. Fluxo de configuração da filial

1. Cadastrar filial (CNPJ enriquecido via APIs públicas — §8)  
2. Associar município(s) IBGE  
3. Listar UASGs do catálogo relacionadas ao município (API 05 / sync)  
4. Selecionar UASGs a monitorar  
5. Definir módulos e parâmetros (herança da matriz)  
6. Validar e ativar → entra no planejador central  

A associação município↔UASG deve ser **auditável** e baseada em dados oficiais — não presumida.

---

## 6. Integração Compras.gov / PNCP

### 6.1. Fonte oficial

- Swagger: https://dadosabertos.compras.gov.br/swagger-ui/index.html  
- Base: `https://dadosabertos.compras.gov.br`  
- Detalhamento de relacionamentos: `DIAGRAMA-RELACIONAMENTO-API-COMPRAS-GOV.txt` (esta pasta)

### 6.2. Camadas lógicas da API

| Camada | Módulos | Papel |
|--------|---------|--------|
| Referência (master data) | 05 UASG, 01 CATMAT, 02 CATSER, 10 Fornecedor | Quem compra / o que é / quem vende |
| Planejamento | 04 PGC | O que se planeja comprar |
| Execução | 07 Contratações (Lei 14.133) + itens + resultados | Fonte autoritativa de execução |
| Evidência | 03 Pesquisa de preço | Benchmark de mercado |

### 6.3. Ciclo de vida (resumo)

```text
UASG (05)
  → PGC (04) + item de catálogo (01/02)
    → CONTRATAÇÃO PNCP (07)
      → ITENS → RESULTADOS (fornecedor homologado = niFornecedor)
        ↔ FORNECEDOR (10)
        ↔ PESQUISA DE PREÇO (03)
```

### 6.4. Chaves de integração (join keys)

| Campo | Uso |
|-------|-----|
| `codigoUasg` / `unidadeOrgaoCodigoUnidade` | Eixo operacional |
| `codigoOrgao` / `cnpjCpfOrgao` | Órgão |
| `codigoMunicipioIbge` | Filtro geográfico |
| `codigoItemCatalogo` | CATMAT/CATSER em PGC, itens, preços |
| `idCompra` / `idCompraItem` | Transação 07 ↔ 03 |
| `numeroControlePNCP` | Chave de negócio PNCP |
| `niFornecedor` | Fornecedor homologado (normalizar 11/14 dígitos) |

### 6.5. Ordem de carga recomendada

0. UASG/órgão, catálogos, fornecedor (sob demanda)  
1. PGC (se habilitado)  
2. Contratações → itens → resultados  
3. Pesquisa de preço (depende de catálogo; opcional cruzar com 07)

### 6.6. Modalidades (cuidado operacional)

A API expõe **dois códigos** no mesmo registro:

| Campo | Domínio | Uso no sistema |
|-------|---------|----------------|
| `modalidadeIdPncp` | 1–14 (PNCP) | referência / código PNCP |
| `codigoModalidade` | domínio Compras.gov | filtro e coleta |
| `modalidadeNome` | rótulo oficial | descrição |

Não usar a tabela PNCP (1–14) como valor de `codigoModalidade`.

### 6.7. Coleta centralizada

```text
Configs globais → matriz → filiais
  → municípios → UASGs → parâmetros
    → PLANEJADOR (consolida pedidos iguais)
      → API oficial (paginação + rate limit)
        → validação → normalização → UPSERT
          → distribuição lógica por escopo
```

Regras:

- se duas filiais pedem a mesma UASG/módulo/período → **uma consulta**;
- re-sync não corrompe campos manuais locais;
- retirada de UASG **encerra vínculo**, não apaga histórico;
- cada execução e cada HTTP relevantes geram trilha (`EXECUCAO_COLETA` / `REQUISICAO_COLETA`).

---

## 7. Modelo de dados (visão oficial)

### 7.1. Organizacional

```text
ORGANIZACAO ──< UNIDADE_ORGANIZACIONAL (matriz|filial)
USUARIO ──< USUARIO_UNIDADE >── UNIDADE_ORGANIZACIONAL
```

### 7.2. Territorial / monitoramento

```text
MUNICIPIO (IBGE)
FILIAL_MUNICIPIO
ORGAO ──< UASG
FILIAL_UASG
```

### 7.3. Configuração

```text
PARAMETRO_COLETA
CONFIGURACAO_COLETA (escopo: global|matriz|filial)
CONFIGURACAO_COLETA_PARAMETRO
HISTORICO_CONFIGURACAO
```

Precedência: **global → matriz → filial (só se autorizada)**.

### 7.4. Compras públicas (espelho da API)

```text
ORGAO → UASG → CONTRATACAO_PNCP
                    ├── ITENS → CATÁLOGO (MAT/SERV)
                    ├── RESULTADOS → FORNECEDOR
                    └── (opcional) CONTRATOS / atas
PGC ──► item de catálogo
PESQUISA_PRECO ──► item / UASG / compra / fornecedor (quando a fonte informar)
```

Identificadores externos (`idCompra`, `numeroControlePNCP`, `niFornecedor`, etc.) são preservados para rastreabilidade. Detalhe de campos e endpoints: ver diagrama na raiz desta pasta e o comportamento já validado no `trigger/23`.

### 7.5. Enriquecimento local (CNPJ / CEP)

```text
FORNECEDOR / UNIDADE (filial, matriz, órgão raiz)
  ├── cnpj_dados_json, fonte_cnpj, cnpj_enriquecido_em
  ├── razao_social, nome_fantasia, porte, CNAE, QSA, situacao_cadastral
  └── endereco: cep, logradouro, numero, bairro, municipio, uf, ibge
        └── cep_dados_json, fonte_cep, cep_enriquecido_em  (quando CEP resolvido à parte)
```

---

## 8. APIs acessórias gratuitas — CNPJ e CEP

As APIs federais de compras **não substituem** o detalhamento cadastral completo de pessoa jurídica nem a normalização postal. O sistema usa **APIs públicas gratuitas** em **cadeia de fallback**: a próxima fonte só é chamada se a anterior falhar (timeout, 429, 5xx, payload inválido).

Objetivos:

- complementar razão social, QSA, CNAE, porte, situação e endereço;
- preencher/validar CEP e localidade (incluindo código IBGE quando a fonte fornecer);
- **não barrar** a operação por limite de um único provedor;
- cachear resultados (ex.: 30 dias, configurável) e registrar `fonte_*` usada.

### 8.1. CNPJ — cadeia oficial (alinhada ao `trigger/23`)

Ordem padrão (configurável por env):

| # | Provedor | Endpoint base (referência) | Observação |
|---|----------|----------------------------|------------|
| 1 | **BrasilAPI** | `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` | Preferencial; payload estável |
| 2 | **Minha Receita** | `https://minhareceita.org/{cnpj}` | Fallback gratuito |
| 3 | **CNPJá Open** | `https://open.cnpja.com/office/{cnpj}` | Fallback; adaptar schema |
| 4 | **Pública CNPJ.ws** | `https://publica.cnpj.ws/cnpj/{cnpj}` | Último recurso da cadeia |

Uso típico:

- cadastro de organização / matriz / filial / órgão raiz;
- enriquecimento de fornecedores vencedores (job de pendentes após coleta);
- pré-visualização no Setup sem persistir, depois confirmar e gravar.

Variáveis sugeridas (espelho do 23):

```text
CNPJ_PUBLICO_BRASILAPI_URL
CNPJ_PUBLICO_MINHARECEITA_URL
CNPJ_PUBLICO_CNPJA_URL
CNPJ_PUBLICO_PUBLICA_URL
CNPJ_PUBLICO_CACHE_DIAS=30
CNPJ_PUBLICO_HTTP_TIMEOUT_SEC=25
CNPJ_PUBLICO_LOTE_INTERVALO_SEC=3
CNPJ_PUBLICO_LOTE_BACKOFF_SEC=30
```

### 8.2. CEP — cadeia oficial (nova camada dedicada)

Ordem padrão recomendada (todas gratuitas; múltiplas fontes para rate limit):

| # | Provedor | Endpoint base (referência) | Observação |
|---|----------|----------------------------|------------|
| 1 | **BrasilAPI** | `https://brasilapi.com.br/api/cep/v2/{cep}` | Preferencial; costuma trazer IBGE |
| 2 | **ViaCEP** | `https://viacep.com.br/ws/{cep}/json/` | Amplamente usada; grátis |
| 3 | **AwesomeAPI CEP** | `https://cep.awesomeapi.com.br/json/{cep}` | Fallback adicional |
| 4 | **OpenCEP** | `https://opencep.com/v1/{cep}` | Último recurso da cadeia |

Uso típico:

- normalizar endereço vindo do CNPJ quando o CEP existir mas faltar IBGE/bairro/logradouro;
- cadastro manual de endereço de filial / unidade;
- validação de localidade antes de filtrar UASGs por município.

Variáveis sugeridas:

```text
CEP_PUBLICO_BRASILAPI_URL=https://brasilapi.com.br/api/cep/v2
CEP_PUBLICO_VIACEP_URL=https://viacep.com.br/ws
CEP_PUBLICO_AWESOMEAPI_URL=https://cep.awesomeapi.com.br/json
CEP_PUBLICO_OPENCEP_URL=https://opencep.com/v1
CEP_PUBLICO_CACHE_DIAS=90
CEP_PUBLICO_HTTP_TIMEOUT_SEC=15
CEP_PUBLICO_LOTE_INTERVALO_SEC=1
CEP_PUBLICO_LOTE_BACKOFF_SEC=20
```

### 8.3. Política comum das cadeias (CNPJ e CEP)

1. **Normalizar** entrada (somente dígitos; CNPJ 14 / CEP 8).  
2. Consultar **cache local** antes de qualquer HTTP.  
3. Percorrer a cadeia; em 429/502/503 aplicar backoff e tentar a **próxima** fonte.  
4. Adaptar payloads heterogêneos para um **DTO interno único**.  
5. Persistir blob bruto (`*_dados_json`) + `fonte_*` + timestamp.  
6. Em lote: intervalo entre chamadas + teto por execução (não esgotar cotas).  
7. Falha total da cadeia → registrar pendência; **não** abortar a coleta Compras.gov.  
8. Nunca gravar tokens/segredos em log (estas APIs são públicas, mas o padrão vale para o restante do sistema).

```text
entrada (CNPJ ou CEP)
   → cache hit? → retorna
   → fonte 1 → ok? → adapta → grava → retorna
   → fonte 2 → …
   → fonte N → …
   → marca pendente / erro transitório
```

### 8.4. Complementaridade Compras.gov × APIs acessórias

| Necessidade | Fonte principal | Complemento |
|-------------|-----------------|-------------|
| Contratações, itens, resultados | Compras.gov 07 | — |
| Cadastro fornecedor (módulo 10) | Compras.gov 10 | CNPJ público (QSA, CNAE detalhado) |
| Endereço / IBGE da PJ | Payload CNPJ público | CEP público se incompleto |
| Município da filial | IBGE / cadastro | CEP para validar logradouro |
| Órgão raiz / Setup | CNPJ público | CEP opcional |

---

## 9. Segurança, auditoria e governança

- Permissões verificadas no servidor em toda operação sensível.  
- Isolamento: filial não vê dados de outra; matriz vê conforme papel.  
- Auditoria mínima: filiais, municípios, UASGs, parâmetros, coletas, falhas, permissões.  
- Rastreabilidade dos dados coletados: fonte, id original, endpoint, datas, id da execução.  
- Credenciais de IA (se houver) criptografadas em repouso — padrão Setup do 23.

---

## 10. Plano de implantação por fases

| Fase | Entrega |
|------|---------|
| 1 | Organização, matriz, filiais, usuários, papéis, histórico |
| 2 | Municípios IBGE, sync UASG/órgão, `FILIAL_UASG` |
| 3 | Configurações global/matriz/filial, herança, validação |
| 4 | Integração Compras.gov (05 → 07 → itens/resultados → 01/02/10) |
| 5 | Motor de coleta central (paginação, incremental, dedupe, reprocessamento) |
| 6 | Cadeias CNPJ + CEP, job de pendentes, cache |
| 7 | Consultas por escopo, indicadores operacionais |
| 8 | Expansão analítica (preços, fornecedores, alertas) — após estabilizar coleta |

Critério de cada fase: testes + health verdes, no espírito do baseline do `trigger/23`.

---

## 11. Decisões oficiais (baseline)

| Decisão | Posição oficial |
|---------|-----------------|
| Filial com vários municípios? | Sim |
| Mesma UASG em várias filiais? | Sim, se a matriz autorizar |
| Coleta por filial batendo na API? | Não; planejador central |
| Duplicar contratação por filial? | Não; base central + escopo |
| Apagar histórico ao remover UASG? | Não automaticamente |
| Associação município–UASG presumida? | Não; só com base oficial auditável |
| APIs CNPJ/CEP? | Obrigatórias como enriquecimento; cadeia multi-fonte |
| Stack v1? | A do `trigger/23` (FastAPI + SQLite + Docker) |

---

## 12. Entregáveis desta pasta

| Arquivo | Papel |
|---------|--------|
| `DOCUMENTO-OFICIAL-PROJETO.md` | **Este documento** — especificação oficial de domínio |
| `PLANO-MESTRE-EXECUCAO-E-INFRAESTRUTURA.md` | Execução ponta a ponta, infra AWS Lightsail, fases, DoD e runbook |
| `IDEIA_ESBOCO.txt` | Memória conceitual expandida (origem da temática) |
| `DIAGRAMA-RELACIONAMENTO-API-COMPRAS-GOV.txt` | Modelo ER / joins / endpoints Compras.gov |

Implementação de código e `README` operacional seguirão o estilo do `trigger/23` quando a Fase 0/1 for iniciada — guiada pelo plano-mestre.

---

## 13. Síntese

> Separar **quem administra**, **o que se monitora**, **como se coleta** e **quem consulta**.

A matriz define política e escopo. As filiais operam municípios e UASGs autorizados. O motor central consulta o Compras.gov uma vez por necessidade consolidada. CNPJ e CEP entram como **camadas acessórias gratuitas com failover**, para enriquecer cadastros sem travar a plataforma em limite de um único provedor. O `trigger/23` é a prova de conceito técnica a reutilizar e generalizar.

---

*Documento gerado em 2026-10-21. Baseado em `IDEIA_ESBOCO.txt`, `DIAGRAMA-RELACIONAMENTO-API-COMPRAS-GOV.txt` e no sistema em produção/local `trigger/23`.*
