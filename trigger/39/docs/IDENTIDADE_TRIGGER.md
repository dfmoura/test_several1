# Identidade TRIGGER × produto × licenciado — padrão canônico (trigger/39)

Norma de produto para o **FLEXOERP** (licenciado RLP). Alinha o modelo **ecossistema × nó/produto** do site (`trigger/12`) ao app **licenciado** (não é landing da TRIGGER).

O mesmo padrão vale para qualquer instalação no esqueleto: só mudam nome do produto e assets do licenciado — não a hierarquia.

**Princípio:** a TRIGGER é **identificada de forma permanente e discreta** — nunca como herói do ambiente do cliente, nunca apagada.

**Instalação × EMP × stage:** [`MODELO_INSTALACAO_MULTI_EMPRESA.md`](MODELO_INSTALACAO_MULTI_EMPRESA.md).

---

## 1. Quatro camadas (não misturar)

| Camada | Quem é (neste repo) | Onde aparece | Papel |
|--------|---------------------|--------------|--------|
| **Fornecedor / IP** | TRIGGER Data Intelligence | Atribuição fixa (login, rodapé do shell, PDF, ficha), favicon, título do browser | Marca da plataforma — sempre presente, nunca dominante |
| **Produto** | FLEXOERP (`brand.licensee.productName`) | Título de tela, sidebar, login, `<title>` | Nome do sistema licenciado |
| **Licenciado** | RLP (`brand.licensee`) | Logo herói (login, sidebar) + “Licenciado para” | Identidade operacional do dia a dia |
| **Empresa ativa** | EMP-0000x | Header (`X-Empresa-Id`) | Contexto multi-empresa — **não** é marca |

```
TRIGGER  →  produto (FLEXOERP)  →  licenciado (RLP)  →  EMP-00001 / EMP-00002 / …
```

Genérico (outro contrato): `TRIGGER → FLEXOERP → Empresa X → EMP-X / EMP-Y / EMP-Z` (mesmo produto, outro licenciado/instalação).

Teste do herói (adaptado de `trigger/12`): *se remover a logo TRIGGER, o primeiro viewport ainda é claramente do licenciado.* Se o primeiro viewport puder ser de qualquer fornecedor sem a atribuição, a TRIGGER está apagada demais.

Teste da EMP: *se trocar só a EMP ativa, a marca do licenciado e o nome do produto não mudam.* EMP não compete com branding.

---

## 2. Nomes canônicos

| Uso | Forma | Exemplo |
|-----|--------|---------|
| Marca curta (UI alt, PDF texto) | `TRIGGER` | alt da logo; “Powered by TRIGGER” |
| Marca completa (acessibilidade, docs) | `TRIGGER Data Intelligence` | `alt` preferencial da logo |
| Razão social (só jurídico/privacidade) | `TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA` | não na UI do ERP |
| Site | `https://www.triggerti.com` | único destino dos links de atribuição |
| Produto licenciado (UI) | `FLEXOERP` | título de tela, header, login |
| Label de licença | `Licenciado para` | acima da logo do cliente no login |
| Empresa operacional | `EMP-0000x` / razão social da EMP | só no seletor / header de contexto |

Cores da plataforma (já no CSS/`brand.ts`): navy `#1a3568` · verde `#7cb518`.

---

## 3. Fórmula de atribuição por superfície

Uma superfície → uma fórmula. Não misturar no mesmo bloco.

| Superfície | Fórmula canônica | Componente / config |
|------------|------------------|---------------------|
| Nome do produto (sidebar + login) | `{produto}` + byline **por Trigger Data Intelligence** | `TriggerByline` |
| Login (painel esquerdo) | marca + **Desenvolvido por** + **TRIGGER Data Intelligence** (link; tipografia do corpo, sem display gritante) | `TriggerAttribution` `variant="interactive"` |
| Rodapé da sidebar | idem | `BrandBar` |
| Ficha impressa HTML | **Powered by** + marca + **TRIGGER** (mesmo peso do rodapé) | `TriggerAttribution` `variant="print"` |
| Favicon / aba | marca TRIGGER (PNG 32 + SVG) | `index.html` |
| `<title>` | `{produto} · TRIGGER` | ex.: `FLEXOERP · TRIGGER` |

### Por que duas fórmulas (não uma só)?

- **Desenvolvido por** — UI interativa em PT-BR; leitura natural; link comercial.
- **Powered by TRIGGER** — documentos/PDF: padrão internacional de rodapé, curto, texto estável mesmo sem imagem.

Proibido:

- Colocar logo TRIGGER como herói do login ou do shell (competir com o licenciado).
- Remover a atribuição dessas superfícies “para limpar a tela”.
- Inventar variantes (“Feito por”, “by Trigger TI”, “Trigger Technology”) fora desta tabela.
- Usar logo do licenciado no favicon (IP da plataforma; troca de cliente = `branding/cliente/*`, não o favicon TRIGGER).
- Tratar EMP ativa como marca ou substituir o herói do licenciado ao trocar de EMP.

---

## 4. Assets

```
branding/
  cliente/logo-rlp.png          ← só o licenciado (troca white-label)
  trigger/
    logo-trigger.png            ← atribuição UI/ficha (wordmark/logo)
    logo-trigger-mark.png       ← marca isolada (uso futuro / favicon fonte)
    logo-trigger-header.png     ← alinhado ao site (uso futuro)
    favicon-32-light.png        ← fonte; espelhado em apps/web/public/
apps/web/public/
  favicon-32-light.png
  favicon.svg                   ← marca navy (não o SVG roxo do Vite)
```

Fonte única no front: `apps/web/src/lib/brand.ts`.  
Fonte única no back (PDF/strings): `config/erp.php` → chave `brand`.

---

## 5. Troca de cliente / produto (white-label)

Sem fork do código e **sem** mudar o paradigma multi-empresa:

1. Substituir `branding/cliente/*` (+ cópia em `apps/web/public/branding/cliente/` se o deploy não montar o volume).
2. Ajustar seeds / `logo_path` da EMP (EMP ≠ logo do licenciado, salvo coincidência operacional).
3. Atualizar `brand.licensee` em `brand.ts` (`shortName`, `productName`, `logoAlt`, etc.) — ou futuro config remoto.
4. **Não** remover nem alterar a camada TRIGGER (`brand.vendor` / `erp.brand`).
5. Outro **contrato** = outra **instalação** — ver modelo de instalação.

---

## 6. Checklist de aceite (identidade)

- [ ] Login: herói do licenciado (“Licenciado para”) + rodapé “Desenvolvido por” TRIGGER clicável  
- [ ] Shell: logo do licenciado no topo da sidebar + BrandBar no rodapé  
- [ ] Nome do **produto** visível e distinto da EMP ativa  
- [ ] Ficha PAR: rodapé “Powered by” + logo TRIGGER  
- [ ] PDF relatório: texto “Powered by TRIGGER”  
- [ ] Favicon = marca TRIGGER (navy), não Vite/roxo  
- [ ] Título da aba contém `TRIGGER` sem deslocar o nome do produto  
- [ ] Trocar EMP no header **não** troca marca do licenciado nem atribuição TRIGGER  

Referência de ecossistema (site): `../12/site/README.md` (modelo ecossistema × nós).  
Referência de deploy: `LIGHTSAIL_E_FUTURO.md` § Identidade.  
Referência de IP / repositório público: [`ADR_LICENCIAMENTO_E_IP.md`](ADR_LICENCIAMENTO_E_IP.md) · [`../LICENSE`](../LICENSE).
