# RlpFlow — Mapa 3D do Processo (ERP RLP)

Ferramenta visual interativa para **entender o fluxo completo** do ERP RLP
(RLP Etiquetas Auto Adesivos). Inspirada no FlexoFlow (`trigger/30`), com
visual **estilo Obsidian / graph 3D** (raias, cards com profundidade, glow).

Não é o ERP — é o **mapa do processo** cobrindo a cadeia operacional e os
módulos de domínio documentados em `trigger/32`.

## O que está mapeado

### Cadeia principal (fluxo feliz)
- **Cadastros (M01)**: EMP / PAR / produtos / usuários RBAC
- **Comercial (M02)**: ORC → aceite (link) → crédito/sinal → **PED** (mestre)
- **Produção (M03)**: OP / OS → apontamento → conclusão (+ BEM preventivo)
- **Estoque (M04)**: MOV · saída MP · sobra/PA · revenda · REM
- **Compras (M07)**: monitor → COT → OC → XML/entrada
- **Fiscal + Financeiro (M05/M06)**: NF (Focus) + TIT → COB → BX
- **Expedição**: ENT → confirmação do cliente
- **Pós-venda (M08)**: RMA → CQ → DEV / reposição / crédito
- **Integrações + Gerencial (M09/M10)**: Focus · BankProvider · WhatsApp Meta · DRE/export

### Cenários simuláveis
1. Fluxo feliz — produção  
2. 1ª compra (com sinal)  
3. Item serviço (OS)  
4. Item revenda  
5. Reposição / compras  
6. Pós-venda RMA → DEV  

## Funcionalidades

- Diagrama interativo com raias por módulo (zoom, pan, minimapa)
- Clique em qualquer etapa: descrição, entradas, saídas, documentos/prefixos
- Simulação animada dos cenários + navegação **← →**
- Flag **Acompanhar** (foco da câmera) — preferência salva no navegador
- Arraste os cartões para reorganizar — layout salvo localmente

## Como rodar (Docker)

```bash
docker compose up -d --build
```

Acesse: <http://localhost:8034>

```bash
docker compose down
```

## Desenvolvimento local

```bash
npm install
npm run dev   # http://localhost:5173
```

## Stack

- React 19 + TypeScript + Vite
- React Flow (`@xyflow/react`)
- nginx alpine (Docker multi-stage)

## Fontes de domínio

Documentação em `../32/` (índice, domínio, SRS, manuais unitários do fluxo).
