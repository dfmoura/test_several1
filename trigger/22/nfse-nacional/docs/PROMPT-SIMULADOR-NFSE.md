# PROMPT — Simulador e Pré-Emissor NFS-e Nacional

> **Tipo:** documento-mestre de engenharia (estilo prompt)  
> **Uso:** orientar humanos, agentes de IA e PRs neste monorepo  
> **Escopo:** simulador fiscal completo + emissão opcional em homologação/produção  
> **Referência fiscal:** [`DEFINICAO-IMPOSTOS-NFSE.txt`](./DEFINICAO-IMPOSTOS-NFSE.txt)

---

## 0. Prompt executivo (cole no início de qualquer tarefa)

```text
Você está evoluindo o monorepo nfse-nacional para um SIMULADOR FISCAL + PRÉ-EMISSOR NFS-e Nacional.

OBJETIVO
- Preparar uma NFS-e correta (dados, tributos, XML DPS) para qualquer CNPJ prestador.
- Enriquecer cadastros via APIs públicas (CNPJ, CEP, IBGE, LC 116, NBS).
- Calcular impostos com motor de regras determinístico e rastreável.
- Validar localmente e, quando houver certificado A1, validar em homologação (tpAmb=2).
- NUNCA emitir em produção por padrão.

ARQUITETURA
- Hexagonal (Ports & Adapters) — ver ADR-001.
- Domínio puro em @nfse/domain (sem HTTP, sem DB, sem XML).
- Casos de uso em @nfse/application.
- Adapters externos em @nfse/gov-client e novos adapters de enriquecimento.
- XML/assinatura em @nfse/xml.
- APIs em services/nfse-api; UI em services/nfse-web.

REGRAS DE OURO
1. Toda decisão fiscal deve ter origem rastreável (api | regra | manual | default).
2. Não inventar alíquota, código municipal ou retenção — marcar pendência.
3. IM nunca vem de API pública (prestador: .env; tomador: input manual).
4. Separar "dados de entrada", "cenário fiscal simulado" e "resultado calculado".
5. Testes unitários no domínio; testes de contrato nos adapters; golden XML nos builders.
6. Mudança mínima: reutilizar EmitirNfseInput e módulos tributacao-* existentes.

ANTES DE CODAR
- Ler DEFINICAO-IMPOSTOS-NFSE.txt para a regra de negócio.
- Identificar se a mudança é domínio, adapter, caso de uso ou API.
- Definir quais pendências o simulador deve expor ao usuário.
```

---

## 1. Visão do produto

### 1.1 Problema

Emitir NFS-e exige dezenas de decisões fiscais encadeadas (regime, serviço, local, ISS, retenções, transparência). Erros só aparecem tarde — na rejeição da SEFIN ou em autuação.

### 1.2 Solução

Um **simulador de teto** que:

1. Coleta e enriquece dados de múltiplas fontes
2. Aplica o processo fiscal completo (documentado em TXT)
3. Produz payload/XML **pronto para emitir**
4. Lista **pendências explícitas** (o que falta, o que é estimativa)
5. Opcionalmente submete em **homologação** com certificado A1 para validação oficial

### 1.3 Modos de operação

| Modo | Certificado | Ambiente | Uso |
|------|-------------|----------|-----|
| `SIMULACAO_LOCAL` | Não | — | Cálculo + XML + validação local |
| `HOMOLOGACAO` | A1 e-CNPJ | `tpAmb=2` | Validação real SEFIN sem efeito fiscal |
| `PRODUCAO` | A1 e-CNPJ | `tpAmb=1` | Bloqueado por feature flag; exige confirmação explícita |

**Padrão do sistema:** `SIMULACAO_LOCAL`. Produção nunca é default.

---

## 2. Princípios de arquitetura

### 2.1 Hexagonal (obrigatório)

```
                    ┌─────────────────────────────────────┐
  HTTP/UI ─────────►│         @nfse/application          │
  CLI/worker ──────►│   (casos de uso / orquestração)    │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │           @nfse/domain               │
                    │  entidades, VOs, motor fiscal, regras│
                    └──────────────┬──────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
  @nfse/gov-client          @nfse/enrichment*          @nfse/xml
  SEFIN, ADN, CNPJ           CEP, IBGE, params           DPS, assinatura
```

\* pacote ou módulo novo recomendado — ver seção 4.

### 2.2 Regras de dependência

| Camada | Pode importar | Não pode importar |
|--------|---------------|-------------------|
| `domain` | `shared` | `application`, `gov-client`, `xml`, `api`, `web` |
| `application` | `domain`, ports | Fastify, React, detalhes HTTP |
| `gov-client` / adapters | `domain`, `shared` | `application` |
| `xml` | `domain`, `shared` | `application` |
| `services/*` | pacotes internos | lógica fiscal inline |

### 2.3 ADRs existentes (respeitar)

- **ADR-001:** Hexagonal — manter domínio testável sem rede
- **ADR-002:** Single CNPJ/cert — simulador multi-CNPJ via input, não multi-tenant no DB (por ora)
- **ADR-003:** DANFSe local — preview PDF sem depender do governo

---

## 3. Modelo de domínio (estrutura de dados)

### 3.1 Separação em 5 agregados

Não misturar cadastro, operação, cenário simulado e resultado.

```
SimulacaoNfse
├── ambiente: AmbienteExecucao
├── prestador: PrestadorContext
├── tomador: TomadorContext
├── operacao: OperacaoServico
├── cenarioFiscal: CenarioFiscal          ← inputs de faixa/teto SN
├── tributacaoCalculada: TributacaoResult ← output do motor
├── emissao: EmitirNfseInput              ← contrato existente (bridge p/ emissor)
├── pendencias: PendenciaFiscal[]
├── rastreabilidade: CampoProveniencia[]
└── validacao: ResultadoValidacao
```

### 3.2 `PrestadorContext`

```typescript
// Conceitual — implementar em @nfse/domain
interface PrestadorContext {
  cnpj: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  inscricaoMunicipal?: string;        // SEMPRE manual (.env ou input)
  endereco?: Endereco;
  optanteSimples?: boolean;           // fonte: API CNPJ
  opSimpNac?: '1' | '2' | '3';
  regApTribSN?: '1' | '2' | '3';
  regEspTrib?: '0' | '1' | '2' | '3' | '4' | '5' | '6';
  cnaePrincipal?: string;
  situacaoCadastral?: string;
  fonteCadastro?: string;
}
```

### 3.3 `TomadorContext`

```typescript
interface TomadorContext {
  tipo: 'PF' | 'PJ';
  cpfCnpj: string;
  razaoSocial?: string;
  inscricaoMunicipal?: string;        // manual
  endereco?: Endereco;
  indicadores?: {
    orgaoPublico?: boolean;
    retencaoProvavel?: boolean;       // derivado por regra + heurística
  };
}
```

### 3.4 `OperacaoServico`

```typescript
interface OperacaoServico {
  descricao: string;
  valorServico: number;
  dataCompetencia: string;             // YYYY-MM-DD
  codigoTribNac: string;               // 6 dígitos
  codigoNbs?: string;                  // 9 dígitos
  codigoTribMun?: string;
  codigoMunicipioPrestacao: string;    // IBGE 7
  codigoMunicipioIncidencia: string;
  codigoPaisPrestacao?: string;         // BACEN, default 105
  descontoIncondicionado?: number;
  descontoCondicionado?: number;
  valorDeducoes?: number;
  valorRecebidoIntermediario?: number;
}
```

### 3.5 `CenarioFiscal` (simulação de faixa/teto)

Campos que **não vêm de API pública confiável** — usuário informa ou sistema estima com disclaimer.

```typescript
interface CenarioFiscal {
  modo: 'automatico' | 'manual' | 'otimista' | 'pessimista';

  // Simples Nacional
  rbt12?: number;                      // receita bruta 12 meses
  anexoSimples?: 'I' | 'II' | 'III' | 'IV' | 'V';
  faixaSimples?: number;                // 1..6
  fatorR?: number;
  aliquotaEfetivaSn?: number;          // → pTotTribSN
  tetoMei?: number;
  sublimiteIssMunicipio?: number;

  // Retenções
  forcarRetencaoIss?: boolean;
  forcarRetencaoFederal?: boolean;
  aplicarValorMinimoRetencao?: boolean; // R$ 10,00

  // Overrides conscientes
  overrides?: Partial<{
    tribISSQN: '1' | '2' | '3' | '4';
    tpRetISSQN: '1' | '2' | '3';
    tpRetPisCofins: string;
    aliquotaIss: number;
  }>;
}
```

### 3.6 `TributacaoResult` (output do motor)

```typescript
interface TributacaoResult {
  iss: {
    tribISSQN: string;
    tpRetISSQN: string;
    tipoImunidade?: string;
    pAliq?: number;
    vBC: number;
    vISSQN?: number;
  };
  federal: {
    tpRetPisCofins: string;
    vRetIRRF?: number;
    vRetCP?: number;
    vRetCSLL?: number;
    vPis?: number;
    vCofins?: number;
  };
  transparencia: {
    modo: 'valores' | 'percentuais' | 'aliquota_sn';
    pTotTribSN?: number;
    percentuais?: { fed: number; est: number; mun: number };
    valores?: { fed: number; est: number; mun: number };
  };
  totais: {
    valorServico: number;
    valorLiquido: number;
    totalRetencoes: number;
  };
}
```

### 3.7 `PendenciaFiscal` e rastreabilidade

```typescript
type OrigemCampo = 'api_cnpj' | 'api_cep' | 'api_ibge' | 'api_municipal'
  | 'catalogo_lc116' | 'catalogo_nbs' | 'regra_motor' | 'default_sistema' | 'input_usuario';

type SeveridadePendencia = 'bloqueante' | 'alerta' | 'informativo';

interface PendenciaFiscal {
  codigo: string;           // ex.: IM_PRESTADOR_AUSENTE
  severidade: SeveridadePendencia;
  mensagem: string;
  campo?: string;
  sugestao?: string;
}

interface CampoProveniencia {
  campo: string;
  valor: unknown;
  origem: OrigemCampo;
  confianca: 'alta' | 'media' | 'baixa';
  consultadoEm?: string;
  fonte?: string;
}
```

### 3.8 Bridge com o emissor existente

O contrato `EmitirNfseInput` (**já existe** em `@nfse/domain`) é o **DTO de emissão**. O simulador produz esse objeto ao final:

```
SimulacaoNfse → mapper → EmitirNfseInput → NfseService.emitir()
```

Não criar um segundo contrato de emissão paralelo.

---

## 4. Organização de pacotes (evolução do monorepo)

### 4.1 Estrutura atual (manter)

```
packages/
  nfse-domain/          # regras puras + motor fiscal
  nfse-application/     # casos de uso
  nfse-gov-client/      # SEFIN, ADN, CNPJ
  nfse-xml/             # builders, parser, assinatura
  nfse-shared/          # erros, utils

services/
  nfse-api/             # REST
  nfse-web/             # UI
  nfse-danfse/          # PDF preview
  nfse-worker/          # filas (futuro)
  nfse-sync/            # ADN sync
```

### 4.2 Adições recomendadas

```
packages/
  nfse-enrichment/              # NOVO — ports CEP, IBGE, merge cadastral
    src/
      ports.ts                  # ICepGateway, IIbgeGateway, IParametrosMunicipaisGateway
      adapters/
        viacep.ts
        brasilapi-cep.ts
        ibge-municipio.ts       # mover de gov-client se fizer sentido
      composite-cep-client.ts

  nfse-domain/src/
    simulador/                  # NOVO — motor e orquestração fiscal
      motor-fiscal.ts
      calculadora-iss.ts        # evoluir CalculadoraIss existente
      calculadora-retencoes.ts
      calculadora-simples.ts    # faixas, teto MEI, alíquota efetiva
      resolvedor-servico.ts     # sugere cTribNac/NBS por CNAE+texto
      gerador-pendencias.ts
      simulacao-nfse.ts         # aggregate root

services/
  nfse-simulator/               # OPCIONAL — CLI ou API dedicada /v1/simular
```

**Critério:** se a lógica é regra fiscal → `domain`. Se é HTTP para terceiro → `adapter`. Se orquestra → `application`.

---

## 5. Ports (interfaces) — contratos de integração

### 5.1 Cadastro

| Port | Responsabilidade | Adapters |
|------|------------------|----------|
| `ICadastroConsultaGateway` | CNPJ → dados Receita | BrasilAPI, ReceitaWS, cache, composite |
| `ICepGateway` | CEP → logradouro | ViaCEP, BrasilAPI, OpenCEP |
| `IIbgeGateway` | código IBGE → nome UF/município | IBGE local/API |
| `IParametrosMunicipaisGateway` | alíquotas, convênio, cTribMun | SEFIN params, cache DB, mock |

### 5.2 Catálogos (locais)

| Port | Fonte |
|------|-------|
| `ITributacaoNacionalCatalog` | LC 116 — já em `tributacao-nacional-catalog` |
| `INbsCatalog` | ANEXO B — já em `nbs` |

### 5.3 Governo (certificado A1)

| Port | Responsabilidade |
|------|------------------|
| `ISefinGateway` | enviar DPS, consultar status |
| `IAdnGateway` | distribuição DFe |
| `ICertificadoProvider` | mTLS + assinatura XML |

### 5.4 Política de fallback

```
1. Tentar adapter primário
2. Tentar adapter secundário (composite)
3. Se falhar → pendência + permitir input manual
4. Nunca preencher silenciosamente com valor inventado
```

---

## 6. Pipeline do simulador (caso de uso)

### 6.1 `SimularNfseUseCase` — fluxo determinístico

```
ENTRADA: cnpjPrestador, tomador, operacao, cenarioFiscal?, ambiente?

 1. RESOLVER_PRESTADOR
    - merge(.env, API CNPJ, input)
    - derivar opSimpNac default

 2. ENRIQUECER_TOMADOR
    - se PJ: API CNPJ
    - se CEP informado: API CEP → cruzar IBGE

 3. CLASSIFICAR_SERVICO
    - validar/normalizar cTribNac (6 dígitos)
    - validar cNBS na base
    - sugerir código por CNAE + descrição (se ausente)

 4. RESOLVER_LOCAL_INCIDENCIA
    - aplicar regras LC 116 (prestação vs exceções)
    - consultar parametrização municipal

 5. APLICAR_CENARIO_FISCAL
    - calcular alíquota efetiva SN (faixa/teto) se modo simulação
    - aplicar overrides explícitos

 6. CALCULAR_TRIBUTOS
    - ISS: vBC, vISSQN, tpRetISSQN
    - Federal: IRRF, INSS, PIS/COFINS/CSLL
    - Transparência: totTrib
    - vLiq

 7. GERAR_PENDENCIAS
    - IM ausente, alíquota incerta, código municipal obrigatório etc.

 8. MONTAR_EmitirNfseInput
    - bridge para emissor

 9. VALIDAR_LOCAL
    - ValidadorRegrasNegocio existente
    - build DPS XML (sem assinar)

10. [OPCIONAL] VALIDAR_HOMOLOG
    - assinar + enviar tpAmb=2
    - registrar retorno SEFIN

SAÍDA: SimulacaoNfse
```

### 6.2 Ordem das decisões fiscais

Seguir **rigorosamente** a ordem documentada em `DEFINICAO-IMPOSTOS-NFSE.txt` (seções 3–12). O motor fiscal deve ser implementação dessa especificação, não o inverso.

---

## 7. APIs REST (contrato sugerido)

### 7.1 Novos endpoints (simulador)

```yaml
POST /v1/simular
  body: SimularNfseRequest
  response: SimulacaoNfseResponse
  # Nunca persiste NFS-e; não exige certificado

POST /v1/simular/homolog
  body: SimularNfseRequest
  response: SimulacaoNfseResponse + resultadoSefin
  # Exige certificado configurado; tpAmb=2 forçado

GET  /v1/cadastro/cnpj/{cnpj}          # já existe
GET  /v1/cadastro/cep/{cep}            # novo
GET  /v1/cadastro/tributacao-nacional  # já existe
GET  /v1/cadastro/nbs                  # já existe
GET  /v1/parametros/municipio/{ibge}   # já existe — evoluir adapter real

POST /v1/nfse                          # emissão real — já existe
```

### 7.2 `SimularNfseRequest` (shape)

```json
{
  "ambiente": "SIMULACAO_LOCAL",
  "prestador": { "cnpj": "00000000000000", "inscricaoMunicipal": "12345" },
  "tomador": { "tipo": "PJ", "cpfCnpj": "...", "endereco": { "cep": "38400313" } },
  "operacao": {
    "descricao": "...",
    "valorServico": 1000.0,
    "dataCompetencia": "2026-07-01",
    "codigoTribNac": "170202",
    "codigoNbs": "118064000",
    "codigoMunicipioPrestacao": "3170206",
    "codigoMunicipioIncidencia": "3170206"
  },
  "cenarioFiscal": {
    "modo": "manual",
    "rbt12": 180000,
    "anexoSimples": "III",
    "aliquotaEfetivaSn": 6.0
  }
}
```

### 7.3 `SimulacaoNfseResponse` (shape)

```json
{
  "status": "pronta" ,
  "statusDetalhe": "pronta_com_alertas",
  "pendencias": [
    { "codigo": "ALIQUOTA_ISS_ESTIMADA", "severidade": "alerta", "mensagem": "..." }
  ],
  "tributacao": { },
  "emitirNfseInput": { },
  "xmlDpsPreview": "...",
  "proveniencia": [ ],
  "podeEmitirHomolog": true,
  "podeEmitirProducao": false
}
```

---

## 8. UI — wizard recomendado (nfse-web)

| Passo | Tela | Ações automáticas |
|-------|------|-------------------|
| 1 | Prestador | CNPJ → API Receita; IM manual |
| 2 | Tomador | CPF/CNPJ → API; CEP → endereço |
| 3 | Serviço | busca LC 116 + NBS; local prestação |
| 4 | Cenário fiscal | RBT12, anexo, faixa, alíquota SN; presets MEI/ME/EPP |
| 5 | Tributos | painel calculado + toggles de simulação |
| 6 | Pendências | bloqueantes vs alertas; botão resolver |
| 7 | Preview | XML + DANFSe PDF + resumo vLiq |
| 8 | Homolog | enviar teste (se certificado) |

**UX:** sempre mostrar badge de origem do dado (`API`, `Regra`, `Manual`, `Estimativa`).

---

## 9. Motor fiscal — regras de implementação

### 9.1 ISS

```
vBC = max(0, vServ - vDed - vDescIncond)
vISSQN = round(vBC * pAliq / 100, 2)

Informar pAliq/vBC/vISSQN apenas se tribISSQN=1 E política do regApTribSN exigir
```

### 9.2 Valor líquido

```
vLiq = vServ - retencoesFederais - (ISS se tpRetISSQN in (2,3))
```

### 9.3 Retenções federais

- Respeitar valor mínimo R$ 10,00 por tributo
- Optante SN: regra de não retenção PIS/COFINS/CSLL (com exceções documentadas)
- `tpRetPisCofins` deve refletir o conjunto efetivamente retido

### 9.4 Simples Nacional (simulação de faixa)

Implementar tabela de faixas por anexo como **dados versionados** (JSON em `domain/data/`), não hardcoded espalhado.

```
entrada: rbt12, anexo, fatorR (opcional)
saída: faixa, aliquotaNominal, aliquotaEfetiva, parcelaDeducao
disclaimer: "estimativa — confirmar com PGDAS-D"
```

### 9.5 Pendências obrigatórias a detectar

| Código | Severidade |
|--------|------------|
| `IM_PRESTADOR_AUSENTE` | alerta/bloqueante conforme município |
| `CNPJ_INATIVO` | bloqueante |
| `CODIGO_NBS_INVALIDO` | bloqueante |
| `CODIGO_TRIB_NAC_INVALIDO` | bloqueante |
| `ALIQUOTA_ISS_INDEFINIDA` | alerta |
| `C_TRIB_MUN_OBRIGATORIO` | bloqueante |
| `REG_AP_TRIB_SN_AUSENTE` | bloqueante (se optante SN) |
| `ALIQUOTA_SN_ESTIMADA` | informativo |
| `RETENCAO_INCERTA` | alerta |
| `CERTIFICADO_AUSENTE_HOMOLOG` | informativo |

---

## 10. Certificado A1 — política para simulação

### 10.1 Configuração

```env
NFSE_CNPJ=...
NFSE_CERTIFICADO_PATH=...   # ou secret base64
NFSE_AMBIENTE=homologacao    # default seguro
NFSE_ALLOW_PRODUCAO=false    # trava explícita
```

### 10.2 O que o certificado potencializa

- Validação SEFIN real (homologação)
- Parametrização municipal autêntica
- Assinatura XML idêntica à produção
- Feedback de rejeição oficial para calibrar o motor

### 10.3 O que o certificado NÃO resolve

- RBT12 / PGDAS-D → continua como `CenarioFiscal` manual ou integração contábil futura
- IM do prestador → continua manual

---

## 11. Padrões de engenharia

### 11.1 Código

- TypeScript strict; sem `any` em domínio
- Funções puras no motor fiscal
- Erros de negócio: `ValidationError` (`@nfse/shared`)
- Erros de governo: `GovError` com código/mensagem SEFIN
- Formatação monetária: 2 casas decimais, `round half up` para ISS
- Datas: competência `YYYY-MM-DD`; emissão com timezone BR

### 11.2 Testes

| Tipo | O quê | Onde |
|------|-------|------|
| Unitário | motor fiscal, calculadoras, pendências | `nfse-domain` |
| Golden | XML DPS gerado | `nfse-xml` |
| Contrato | adapters CNPJ/CEP com fixtures | `nfse-enrichment`, `gov-client` |
| Integração | simular → homolog (mock ou real) | `nfse-api` |
| E2E | wizard UI feliz + pendências | `nfse-web` |

Cenários de teste mínimos: MEI, ME/EPP SN, não optante, exportação, imunidade, retenção ISS, retenção federal, valor abaixo R$ 10.

### 11.3 Observabilidade

- `correlationId` em toda simulação
- Log estruturado: `fase`, `cnpj`, `pendencias`, `duracaoMs`
- Não logar certificado nem XML com PII desnecessária

### 11.4 Cache

| Dado | TTL sugerido |
|------|--------------|
| CNPJ | 24h |
| CEP | 7 dias |
| IBGE município | 30 dias |
| Parâmetros municipais | 1h–24h (conforme API) |
| Catálogos LC116/NBS | versão do pacote |

---

## 12. Roadmap por fases

### Fase 1 — Simulador local (MVP)

- [ ] Agregado `SimulacaoNfse` + `SimularNfseUseCase`
- [ ] Motor fiscal ISS + vLiq + totTrib modo `aliquota_sn`
- [ ] Endpoint `POST /v1/simular`
- [ ] Pendências básicas
- [ ] UI wizard passos 1–5

### Fase 2 — Enriquecimento completo

- [ ] Adapter CEP (ViaCEP + fallback)
- [ ] Sugestão cTribNac/NBS por CNAE
- [ ] Parametrização municipal real (adapter)
- [ ] Proveniência por campo na UI

### Fase 3 — Cenários fiscais

- [ ] Calculadora Simples (faixas, MEI, Fator R)
- [ ] Calculadora retenções federais
- [ ] Presets de cenário (otimista/pessimista)
- [ ] Comparador de cenários lado a lado

### Fase 4 — Homologação com A1

- [ ] `POST /v1/simular/homolog`
- [ ] Trava anti-produção
- [ ] Relatório rejeição SEFIN → pendência automática

### Fase 5 — Produção (opcional)

- [ ] Feature flag + confirmação dupla
- [ ] Auditoria completa
- [ ] Idempotência (já existe no emissor)

---

## 13. Checklist de PR (copiar em toda revisão)

```markdown
- [ ] Regra fiscal está em @nfse/domain, não na rota HTTP
- [ ] Adapter novo implementa port existente ou novo port documentado
- [ ] Nenhum dado fiscal inventado sem pendência
- [ ] IM não preenchida por API
- [ ] Testes unitários para regra nova
- [ ] DEFINICAO-IMPOSTOS-NFSE.txt atualizado se mudou processo
- [ ] Simulação continua funcionando sem certificado
- [ ] tpAmb=1 não é acionado sem flag explícita
- [ ] EmitirNfseInput continua compatível com NfseService.emitir()
```

---

## 14. Anti-patterns (não fazer)

1. **Monólito fiscal na rota Fastify** — validação e cálculo no handler
2. **Duplicar enums** de tributação fora de `tributacao-*.ts`
3. **Usar alíquota fixa 5%** como default silencioso para todos os municípios
4. **Emitir em produção** a partir do endpoint de simulação
5. **Confundir preview XML** com NFS-e autorizada
6. **Buscar IM em API de CNPJ** — não existe na Receita
7. **Ignorar regApTribSN** para optante SN
8. **Calcular vLiq descontando ISS** quando `tpRetISSQN=1`

---

## 15. Referências internas

| Documento | Conteúdo |
|-----------|----------|
| [`DEFINICAO-IMPOSTOS-NFSE.txt`](./DEFINICAO-IMPOSTOS-NFSE.txt) | Processo fiscal completo |
| [`adr/001-hexagonal-architecture.md`](./adr/001-hexagonal-architecture.md) | Arquitetura |
| [`adr/002-single-cnpj-cert.md`](./adr/002-single-cnpj-cert.md) | Certificado |
| [`openapi/internal-api.yaml`](./openapi/internal-api.yaml) | Contrato REST atual |
| [`example/`](./example/) | XMLs reais de referência |

---

## 16. Prompt de tarefa (template para issues/agentes)

```text
TAREFA: [descreva em uma linha]

CONTEXTO
- Modo alvo: SIMULACAO_LOCAL | HOMOLOGACAO
- Pacote(s): @nfse/domain | @nfse/application | ...
- Seção do processo fiscal: DEFINICAO-IMPOSTOS-NFSE.txt §X

REQUISITOS
1. ...
2. ...

RESTRIÇÕES
- Não alterar comportamento de produção
- Manter compatibilidade com EmitirNfseInput
- Expor pendências para campos incertos

ENTREGÁVEIS
- [ ] código + testes
- [ ] endpoint/UI (se aplicável)
- [ ] atualização deste doc (se mudou arquitetura)

CRITÉRIO DE PRONTO
- Simulação retorna tributacao + pendencias + emitirNfseInput
- Testes passando: pnpm test --filter @nfse/domain
```

---

*Documento vivo — atualizar quando novas ADRs ou endpoints forem criados.*
