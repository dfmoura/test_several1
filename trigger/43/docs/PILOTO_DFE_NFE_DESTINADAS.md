# Piloto — Caixa DF-e (NF-e destinadas)

**Norma:** `ADR_CAIXA_DFE_NFE_DESTINADAS.md` (emenda go-live)  
**Virada de stage:** `DEPLOY_LOCAL_AWS.md` · `make promote-prod`  
**Gate:** `F5_DFE_CX` (1 EMP piloto)

Objetivo: colocar a caixa em produção **sem estragar** estoque, fila ou o AN (sem martelar sync).

---

## Pré-voo

- [ ] Artefato de deploy inclui o **fix do envelope SOAP** (sem `htmlspecialchars` em `nfeDadosMsg`)
- [ ] `ERP_STAGE` alinhado ao AN desejado (`production` para notas reais; homolog = integração, lista costuma vazia)
- [ ] **Não** misturar URL/`tpAmb` de outro ambiente
- [ ] A1 da EMP piloto **apto**; `APP_KEY` preservada se dados cifrados já existem
- [ ] Containers `app` + **`queue`** saudáveis; `failed_jobs` limpo se residual
- [ ] Gate `F5_DFE_CX` aceito **só** na EMP piloto (pré-reqs `F0_A1` · `F5_COMPRAS` · `F5_NFE_ENT`)
- [ ] Plano B lembrado: upload XML na OC

Se a instalação ainda está em homolog e o piloto precisa de NF reais: virar stage com o script oficial **antes** do clique de sync — não “apontar AN prod no app homolog”.

---

## Um clique (não martelar)

1. Hard refresh em **Compras → NF-e destinadas**
2. **Um** clique em **Atualizar do fisco**
3. Esperar IDLE (poll da própria tela)
4. Anotar: `sync_mensagem`, NSU, contagem de docs

| Resultado | Ação |
|-----------|------|
| Docs na caixa ou `137` / “Nenhum documento…” | Seguir para prova de valor |
| Consumo indevido / cooldown (~60 min) | **Parar**. Aguardar mensagem liberar. Não reclicar |
| RUNNING eterno / failed_jobs | Stop ops (fila/binding) — não é “falta de NF” |

---

## Prova de valor (pass)

Escolher **uma** NF destinada:

1. Se sem XML completo → **Buscar XML** (se falhar: upload na OC e registrar gap)
2. **Amarrar** a OC ABERTA/PARCIAL → assist existente
3. Conferência humana → **`receber()`**
4. Conferir MOV / espelho / TIT iguais ao fluxo manual

**Pass:** prova acima OK (ou gap XML + plano B documentado) **e** UI estável.  
**Fail:** auto-estoque, EMP cruzada, regressão SOAP, 656 por clique excessivo.

---

## Ampliação

Só após pass do piloto:

- [ ] Liberar `F5_DFE_CX` para outras EMPs do **mesmo** licenciado
- [ ] Confirmar job delta diário (06:15) sem spam manual
- [ ] Expectativa de produto: caixa + humano + plano B — não “baixa sozinha tudo sempre”

---

## O que não fazer

- Martelar **Atualizar** (reinicia 656)
- Consultar AN produção com app em homolog “só para ver nota”
- Desligar upload na OC
- Entrada sem OC / auto-receber no sync
