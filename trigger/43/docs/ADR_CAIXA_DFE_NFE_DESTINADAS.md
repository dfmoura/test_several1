# ADR — Caixa DF-e (NF-e destinadas ao CNPJ da EMP)

**Status:** Aceito  
**Data:** 2026-09-04  
**Norma:** `ADR_ENTRADA_XML_ASSIST.md` · `ADR_ENTRADA_XML_ESPELHO.md` · `ADR_COMPRAS_ATE_ESTOQUE.md` · `ADR_CERTIFICADO_A1_EMPRESA.md` · `ADR_EMISSAO_NFE_NFSE.md` · `MAPA_FLUXO_POS_ORC.md` · `ADR_IMPLANTACAO_ACEITE.md` · `MODELO_INSTALACAO_MULTI_EMPRESA.md`  
**Preserva:** OC → assist XML → `receber()` · Focus só na **saída** · isolamento `empresa_id` · cofre A1 sem exfiltração

---

## Contexto

A entrada operacional já opera com **upload manual** do XML na OC (assist + humano + `receber()` + espelho). Falta o elo **fisco → ERP**: notas emitidas **contra** o CNPJ da EMP.

O hub Focus **não** é dono do domínio de entrada (ADRs de compras). O cofre A1 por EMP já existe na nuvem (identidade / self-service). Este ADR abre a **caixa estacionária de NF-e destinadas** via **NFeDistribuicaoDFe** (Ambiente Nacional), autenticada com o A1 do cofre — **sem Focus**.

---

## Decisão

```
Compras → Caixa DF-e (estacionária, gate F5_DFE_CX)
  → UI lê só o banco local (leve)
  → “Atualizar” / job enfileira sync DF-e (A1 cofre, nuvem)
  → lotes + NSU + backoff; 1ª hidratação = ano corrente (progressiva)
  → humano escolhe documento
  → amarra (opcional) a OC ABERTA/PARCIAL
  → assist XML existente → receber() → MOV + TIT + nfe_entrada
```

| Escolha | Motivo |
|---------|--------|
| **Área estacionária** (não “puxar só na OC”) | Arquivo operacional do que o fisco disponibilizou; amarração sob escolha |
| **DF-e AN com A1 do cofre** | Canal correto para documentos **destinados**; sem hub Focus |
| **Sync assíncrono / NSU** | UI e request do usuário nunca esperam SEFAZ; delta barato após 1ª carga |
| **1ª carga = ano atual, em fatias** | Escopo de UX + meta de hidratação; sem dump monstro |
| **Amarrar só o que quiser** | Resto fica na caixa (consulta/arquivo); sem entrada sem OC |
| **Reusar assist + `receber()`** | Zero segundo escritor de saldo; humano no loop intacto |
| **Gate `F5_DFE_CX` (onda 5)** | Novo item; **não** redefine `F5_NFE_ENT` (XML na OC continua) |
| **Só homolog/prod + A1 apto** | Local mantém upload manual; bate com A1 só na nuvem |
| **Emissão Focus intocada** | Saída ≠ entrada; cofre ≠ emissor de NF de venda |

### Canal técnico

- Serviço: **NFeDistribuicaoDFe** (Ambiente Nacional).  
- Autorizador estadual (ex. SEFAZ-MG) **não** é o endpoint de download de destinadas.  
- Manifestação do destinatário (ciência / confirmação) entra na fatia posterior da mesma capacidade — não na 1ª UI.

### Performance (obrigatório)

1. Proibido consultar DF-e no login, no boot, no Painel ou no GET da lista.  
2. Lista = metadados locais; XML sob demanda / ao amarrar.  
3. Uma EMP por job; lotes pequenos; backoff em rate limit / indisponibilidade.  
4. Cursor NSU por EMP; após a 1ª hidratação, só delta.  
5. Anos anteriores: sob demanda, mesma fila — não na abertura padrão.

### Superfície

- Menu: **Compras** → caixa (nome estável na UI; rota sob `/compras/…`).  
- Não painel/cockpit; não hub fiscal genérico de administração.  
- Pré-requisitos de implantação aceitos na EMP: `F0_A1` · `F5_COMPRAS` · `F5_NFE_ENT`.  
- Upload manual na OC permanece plano B eterno.

### Modelo (diretriz)

Persistência por `empresa_id`: NSU/cursor, chave, resumo (emitente, valores, datas), status de vínculo OC, XML privado quando baixado. Chave 44 única por EMP no domínio de entrada (alinhado ao espelho). Sem misturar com `documento_fiscal_saidas` / Focus.

---

## Implantação (ordem travada)

| Fatia | Entrega | Código BL |
|-------|---------|-----------|
| A — Norma | Este ADR + backlog + mapa/continuidade | BL-089 **Feito** |
| B — Caixa local | Modelo + API leitura + UI estacionária + `F5_DFE_CX` | BL-090 **Feito** |
| C — Sync leve | Adaptador DF-e + job/fila + 1ª hidratação ano atual | BL-091 **Feito** |
| D — Amarrar OC | “Usar nesta OC” → assist existente | BL-092 **Feito** |
| E — Manifestação + delta | Ciência/busca XML + sync periódico | BL-093 **Feito** |

Aceite dual em `/implantacao` (`F5_DFE_CX`) **somente** após a fatia D estável no piloto nuvem.

Piloto: **uma EMP**, homolog primeiro; validar amarrar + `receber()` + espelho iguais ao fluxo manual; só então job periódico e produção.

---

## Emenda — cofre A1

O A1 da EMP passa a ter **dois usos** explícitos (sem abrir emissão própria):

1. **Identidade** — self-service / envio de proposta (`ADR_ATIVACAO_EMPRESA`).  
2. **Assinatura DF-e de entrada** — caixa de destinadas (este ADR).

Emissão oficial de NF-e/NFS-e de **saída** permanece no hub Focus (`ADR_EMISSAO_NFE_NFSE.md`). Proibições do cofre (sem GET do PFX, sem plaintext, `hasEmpresaAccess`) permanecem.

---

## Fora de escopo

- Download / entrada via Focus  
- Entrada sem OC · auto-receber no pull  
- Escrituração / SPED / livro oficial  
- Cancelamento Focus / CCe / emissão própria SOAP  
- Hub rastreio, comissões, fluxo de caixa no menu  
- Sync no Painel ou no boot da instalação

---

## Proibido

1. Auto-receber ou lançar saldo no sync DF-e.  
2. Segundo writer de saldo paralelo a `receber()`.  
3. Usar Focus como dono do download de entrada.  
4. Tratar o cofre A1 como autorização de emissão de saída.  
5. Bloquear a UI / API operacional à espera do fisco.  
6. Promover menu sem gate `F5_DFE_CX` e sem A1 apto em nuvem.  
7. Entrada sem OC “porque o XML já está na caixa”.  
8. Misturar EMP (`empresa_id` do contexto) ou confiar só no header.

Alterar este ADR exige alinhamento explícito às ADRs de compras/estoque/A1 e ao estudo 32.
