# FlexoFlow — Mapa do Fluxo de Processo (Flexografia)

Ferramenta visual para **entender e organizar** o fluxo de processo de uma empresa flexográfica.
Não é um sistema de gestão (ERP) — é um mapa interativo do processo, no padrão de swimlanes (raias por área), inspirado em BPMN.

## O fluxo mapeado

- **Comercial**: orçamento → aprovação do cliente → decisão de 1ª compra → pedido de venda
- **Financeiro**: cobrança de adiantamento de 50% (apenas na 1ª compra), faturamento (NF-e) com geração simultânea da cobrança (integral ou saldo restante), recebimento e baixa
- **Produção / PCP**: ordem de produção, produção flexográfica, produto acabado
- **Suprimentos / Estoque**: monitoramento dos níveis de estoque → requisição de compra → pedido(s) de compra → recebimento/conferência → estoque, saída de insumos para a OP (baixa) e entrada de sobras de volta no estoque
- **Expedição**: entrega ao cliente e confirmação de entrega (canhoto/comprovante)

## Funcionalidades

- Diagrama interativo com raias por área (zoom, pan, minimapa)
- Clique em qualquer etapa para ver **descrição, entradas, saídas e documentos**
- **Simulação animada** de 3 cenários: 1ª compra (com adiantamento de 50%), cliente recorrente e reposição de insumos
- **Navegação manual** pelas etapas da simulação com as setas **← →** do teclado (pausa o avanço automático; botão pausar/continuar na barra) e flag **"Acompanhar fluxo"** para o foco automático da câmera — vale para o play e para as setas, e a preferência fica salva no navegador
- Arraste os cartões para **reorganizar o fluxo** — o layout fica salvo no navegador (botão "Restaurar layout" volta ao padrão)

## Como rodar (Docker)

```bash
docker compose up -d --build
```

Acesse: <http://localhost:8090>

Para parar:

```bash
docker compose down
```

## Desenvolvimento local (opcional)

```bash
npm install
npm run dev   # http://localhost:5173
```

## Stack

- **React 19 + TypeScript + Vite** — SPA leve e rápida
- **React Flow (@xyflow/react)** — biblioteca padrão de mercado para diagramas de fluxo interativos
- **nginx (alpine)** — servidor estático em produção, build Docker multi-stage
