# ADR — Matriz de aceite de implantação

**Status:** Aceito · **Data:** 2026-08-24  
**Norma:** `ADR_FATIA_COMERCIAL_SAAS.md` · `ADR_ATIVACAO_EMPRESA.md` · `MODELO_INSTALACAO_MULTI_EMPRESA.md`  
**Identidade:** `IDENTIDADE_TRIGGER.md`

## Contexto

A implantação precisa de visibilidade do que já opera e do que falta, com aceite explícito de **desenvolvimento** e do **cliente (key user)**. O cockpit `/ativacao` cobre “próximo passo”; não substitui uma matriz formal de go-live. O fluxo de negócio completo (pedido → produção → faturamento → expedição) existe no motor; nesta pasta a superfície canônica é FLEXORC (até orçamento + sinal).

## Decisão

| Escolha | Motivo |
|---------|--------|
| Tela **Implantação** em Administração (`/implantacao`) | Fora do menu comercial do dia a dia; não polui o Painel (`ADR_PAINEL_COCKPIT`) |
| Catálogo versionado em código (`ImplantacaoCatalogo`) | Produto TRIGGER define capacidades; cliente não inventa linhas no dia 1 |
| Aceite dual por item (`status_dev` × `status_cliente`) na EMP ativa | Um item só está **Aceito** com as duas OKs; auditoria (quem/quando/obs) |
| Evidência automática opcional (não substitui aceite) | Apoio visual a partir do domínio já existente (EMP, A1, PAR, ORC…) |
| Itens marcados `flexorc` vs `erp` | Honestidade de superfície: FLEXORC agora · ERP completo (esqueleto / FLEXOERP) no mapa |
| Ondas 0–6 + concomitância declarada | Prazo aberto; cadência por critério de saída, não Gantt rígido |
| Permissões `implantacao.ler` / `validar_dev` / `validar_cliente` | ADMIN valida ambos; CONSULTA só lê |
| Isolamento `empresa_id` + `hasEmpresaAccess` | Mesmo modelo multi-EMP; 403 sem vínculo |

```
TRIGGER → FLEXORC (instalação)
  └── Conta → EMP ativa
        /ativacao     = próximos passos (self-service)
        /implantacao  = matriz de aceite (go-live)
```

## Fora de escopo

- Kanban / gestão de projeto / prazos prometidos no código
- Promover PED/OP/estoque/NF no menu FLEXORC
- Substituir ou fundir com `/ativacao`
- Aceite automático só por evidência (sem carimbo humano)
- Dois licenciados na mesma instalação

## Consequências

- `GET /api/v1/implantacao` — matriz da EMP do contexto + resumo + evidências
- `PATCH /api/v1/implantacao/{codigo}` — atualiza um eixo (`dev` \| `cliente`)
- Persistência: `implantacao_aceites` (unique empresa_id + codigo)
- UI: tabela por onda; “Já operamos até” / “Próximo elo” na cadeia principal
- Regressão: `ImplantacaoAceiteTest` (+ isolamento multi-EMP nos casos de aceite)
