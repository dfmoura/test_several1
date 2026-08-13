# Modelo de instalação × multi-empresa × ambientes

Norma de produto do **FLEXOERP** (`trigger/39`, licenciado RLP). Aplica-se a **qualquer instalação** no mesmo esqueleto (outro licenciado = nova instalação).

Separa camadas que **não** devem ser misturadas na conversa, no contrato, no deploy nem na UX.

**Identidade / marca:** [`IDENTIDADE_TRIGGER.md`](IDENTIDADE_TRIGGER.md) · **Deploy:** [`DEPLOY_LOCAL_AWS.md`](DEPLOY_LOCAL_AWS.md) · **Lightsail:** [`LIGHTSAIL_E_FUTURO.md`](LIGHTSAIL_E_FUTURO.md).

---

## 0. Frase canônica (alinhar qualquer reunião)

> **TRIGGER** fornece o **FLEXOERP**; o **licenciado** é o cliente sob contrato (ex.: RLP); **X, Y e Z** são **empresas operacionais (EMP)** dentro da **instalação** dele — não outros clientes e não outros stages.

---

## 1. Quatro camadas de produto + instalação (não misturar)

| Camada | Pergunta | Quem é (neste repo) | Exemplo genérico | Dono |
|--------|----------|---------------------|------------------|------|
| **TRIGGER** | Quem fornece / detém o IP? | TRIGGER Data Intelligence | mesma | TRIGGER |
| **Produto** | Qual sistema está licenciado? | FLEXOERP | FLEXOERP (mesmo nome) | TRIGGER (obra) + contrato |
| **Licenciado** | Quem tem o contrato? | RLP Etiquetas | Empresa X | Comercial / jurídico |
| **Empresa (EMP)** | Qual CNPJ/livro estou operando? | EMP-00001, EMP-00002 | EMP-X, EMP-Y, EMP-Z | Usuário (com vínculo) |

À parte (infra, não “outra empresa”):

| Camada | Pergunta | Dono |
|--------|----------|------|
| **Instalação** | Onde o sistema roda? (1 stack / 1 Lightsail de produção) | TI / TRIGGER |
| **Ambiente (stage)** | É lab, aceite ou negócio real? (`local` / `homolog` / `production`) | TI |

```
TRIGGER (fornecedor / IP / plataforma)
 └── Produto licenciado          →  FLEXOERP
      └── Licenciado             →  RLP      (ou Empresa X noutro contrato)
           └── 1 instalação      →  1 stack Docker / 1 Lightsail de produção
                ├── EMP-00001    →  operação plena (típico)
                ├── EMP-00002    →  flags de negócio (ex. venda/estoque off até liberar)
                └── EMP-…        →  grupo cresce = nova EMP, não nova nuvem
```

| É | Não é |
|---|--------|
| 1 licenciado · 1 instalação · **N empresas** no mesmo ERP | SaaS multi-tenant (vários **clientes/contratos** na mesma nuvem) |
| Isolamento **lógico** por `empresa_id` + `empresa_user` | 1 VM / 1 banco por CNPJ no dia 1 |
| Ambientes local → homolog → prod = **mundos de dados separados** | “Outra empresa” = outro stage |
| Outro **cliente**/contrato = **nova instalação** | Nova EMP no banco de outro licenciado |

Virada homolog → produção = **mesmo artefato**; só `.env` + DNS/TLS (`ERP_STAGE`).

---

## 2. Glossário (vocabulário travado)

Usar estes termos em docs, ADRs, regras Cursor, backlog e conversa com o cliente. Evita “tenant”, “cliente” e “ambiente” no sentido errado.

| Dizer | Significa | Não dizer assim |
|-------|-----------|-----------------|
| **TRIGGER** | Fornecedor, IP, atribuição discreta | “o tenant”, “a marca da EMP” |
| **Produto** | Nome do sistema na UI (**FLEXOERP**) | “a empresa”, “o cliente” |
| **Licenciado** | Parte do contrato / white-label herói | “tenant SaaS”, “uma das EMPs” |
| **Instalação** | Um deploy (stack) daquele licenciado | “ambiente” (reserve para stage) |
| **Empresa / EMP** | CNPJ/livro operacional no ERP | “cliente”, “marca”, “outro produto” |
| **Ambiente / stage** | `local` · `homolog` · `production` | “outra empresa”, “outro licenciado” |
| **Cliente** (comercial) | Só no sentido de **licenciado** / contrato | Não usar para EMP-X/Y/Z |

---

## 3. Ambientes (não confundir com EMP)

| Stage | Uso | Dados | Quem mexe na infra |
|-------|-----|-------|--------------------|
| `local` | Desenvolver / validar | Seed / lab | Dev |
| `homolog` | Aceite pré-go-live | Teste | TI + key users |
| `production` | Negócio real | Reais | TI sobe; usuário **só** opera a UI |

EMP-00001 em homolog **não** é a EMP-00001 de produção — são bancos/instalações distintas.

---

## 4. Papéis

| Papel | Faz | Não faz |
|-------|-----|---------|
| **TRIGGER / TI** | Subir stack, TLS, firewall, snapshot, dump, restore, `.env.aws` | Operar OC/ORC no lugar do usuário |
| **Admin do licenciado** | Usuários ↔ EMPs, parâmetros, perfis, contas CFIN | Abrir MySQL na internet, editar Docker no dia a dia |
| **Usuário operacional** | Trabalhar na **EMP ativa** (ORC, OC, estoque, financeiro conforme RBAC) | Acessar EMP sem vínculo; misturar livros |
| **Cliente externo** (ORC) | Aceitar ORC em `/p/{token}` | Login no ERP |

---

## 5. Isolamento de dados

### Mecânica (código)

1. Login Sanctum → lista de EMPs do usuário (`empresa_user`).
2. UI grava EMP ativa e envia `X-Empresa-Id` em toda API autenticada.
3. Middleware `SetEmpresaContext`: resolve EMP (header → default → pivot `padrao`) e **recusa** se `!hasEmpresaAccess` (403).
4. Domínio operacional (estoque, OC, ORC, TIT, Focus, parâmetros, etc.) filtra por `empresa_id` do contexto.

### O que é por EMP × compartilhado na instalação

| Escopo | Exemplos |
|--------|----------|
| **Por empresa** | Estoque/MOV, OC, TIT/BX, ORC, contas CFIN, hub Focus, parâmetros EMP, flags venda/estoque |
| **Do usuário** | Credencial, perfis RBAC/SoD, lista de EMPs permitidas, EMP padrão |
| **Da instalação** | Branding do **licenciado** + atribuição **TRIGGER**, nome do **produto**, base de usuários daquele deploy |
| **Fora do monólito** | Relatórios “livres” / vibe coding — APIs read-only; sem SQL livre no MySQL |

**Segurança de negócio:** header não autoriza EMP alheia.  
**Segurança de servidor:** só 80/443, MySQL sem publish, `APP_DEBUG=false`, `SEED_ON_BOOT=false` em homolog/prod — ver deploy.

---

## 6. UX — “fácil para o usuário”

1. Login → EMP padrão (ou a única).
2. Header sempre mostra **Empresa ativa**; se N>1 → seletor + aviso ao trocar; telas remountam no novo contexto.
3. Painel explica o escopo e flags venda/estoque da EMP ativa.
4. Tudo na tela/gravação = **só** da EMP ativa.
5. **Perfil** limita *ações* (ex.: compras ≠ financeiro); **EMP** limita *dados*.
6. Zero Docker / AWS / `ERP_STAGE` na UI operacional.
7. Hierarquia visual: **licenciado** herói · **produto** nomeado · **TRIGGER** atribuição discreta · **EMP** só contexto — ver [`IDENTIDADE_TRIGGER.md`](IDENTIDADE_TRIGGER.md).
8. Empresa ativa **não** é marca.

---

## 7. Checklist de aceite — multi-empresa + go-live

Usar em **homolog** e de novo após virada de **produção**. Smoke técnico de infra: [`DEPLOY_LOCAL_AWS.md`](DEPLOY_LOCAL_AWS.md).

### A — Instalação / stage

- [ ] `/api/v1/health` → `stage` esperado (`homolog` ou `production`), `debug: false`
- [ ] MySQL **não** responde em IP público:3306
- [ ] Snapshot automático + (ideal) dump lógico com destino fora do disco único
- [ ] Logos do licenciado + atribuição TRIGGER no login; nome do produto coerente

### B — Multi-empresa (produto)

Automatizado: `apps/api/tests/Feature/MultiEmpresaAceiteTest.php` (`php vendor/bin/phpunit --filter MultiEmpresaAceiteTest`).

- [ ] Existem EMP-00001 e EMP-00002 (ou as oficiais do contrato); flags de EMP-00002 coerentes (ex. venda/estoque off)
- [x] Usuário com **1** EMP: entra no contexto padrão; `/empresas` lista só a dela *(teste)*
- [x] Usuário com **2+** EMPs: troca de contexto via `X-Empresa-Id` *(teste)*; seletor no header = UX manual
- [x] Usuário **sem** vínculo a EMP-B: API com `X-Empresa-Id` de B → **403** *(teste)*
- [x] Cadastro feito em EMP-A **não** aparece nas listagens de EMP-B *(parceiros — teste)*
- [x] Contas financeiras estão **por EMP**, não globais *(teste)*; hub Focus = `FiscalHubTest::test_escopo_por_empresa`

### C — Perfis e operação mínima

- [ ] Login admin + ao menos um perfil operacional (ex. comercial / compras)
- [ ] SoD: perfil de compras **não** executa BX financeiro (e vice-versa), se aplicável
- [ ] Parceiro ou produto (cadastro rápido)
- [ ] ORC + link público `/p/{token}`
- [ ] OC → receber → TIT (e BX se perfil financeiro) **na EMP ativa**

### D — Key user (linguagem de negócio)

- [ ] Sei qual EMP estou usando olhando o header
- [ ] Sei que homolog ≠ produção (dados de teste não são o livro real)
- [ ] Entendo que EMP-Y é outra empresa **do mesmo grupo/licenciado**, não “outro sistema”
- [ ] Não preciso de acesso ao servidor para o dia a dia

---

## 8. Anti-padrões

- Tratar “subir Lightsail” como se resolvesse multi-empresa ou UX.
- Uma VM por CNPJ sem ADR novo e necessidade real de isolamento físico/compliance.
- Publicar MySQL/API no host AWS “para facilitar”.
- Deixar `APP_DEBUG=true` ou seed on boot em produção.
- Query de domínio operacional **sem** `empresa_id` do contexto.
- Confiar só no header do browser sem checar `hasEmpresaAccess`.
- White-label dinâmico por tenant/API (fora de escopo; branding = arquivos do licenciado).
- Misturar **licenciado** com **EMP** (EMP não é marca; licenciado não é um dos livros).
- Colocar **dois licenciados/contratos** na mesma instalação.
- Chamar EMP de “cliente” ou stage de “outra empresa”.

---

## 9. Evolução (sem reescrever o modelo)

| Gatilho | Próximo passo típico |
|---------|----------------------|
| HA / backup formal | MySQL → RDS; dump off-box (já previsto em Lightsail) |
| Mais carga | Separar worker; não “uma máquina por EMP” |
| Outro **cliente** (outro contrato) | **Nova instalação** / novo licenciamento — não nova EMP no banco deste licenciado |
| Novo **licenciado** do FLEXOERP | Mesmo produto; branding + seeds do contrato — sem fork de paradigma |
| Compliance exige isolamento físico | ADR novo; avaliar schema/DB por EMP ou stack dedicada |

Se a tarefa exigir violar a §1 → parar e abrir ADR.
