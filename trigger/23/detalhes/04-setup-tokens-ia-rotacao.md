# Prompt · Setup · Tokens de IA com rotação automática

## Contexto do projeto

O app terá features que chamam provedores de IA (ex.: análise de preço em Propostas abertas). Tokens não podem ficar no frontend nem hardcoded. Só **admin** gerencia credenciais.

## Objetivo

No **Setup**, permitir cadastrar **um ou mais** tokens/provedores de IA. O sistema escolhe dinamicamente qual usar e **alterna automaticamente** se o atual falhar (cota, 401, timeout), para maximizar disponibilidade.

## Requisitos funcionais

1. Seção no Setup: **Provedores de IA**
   - cadastrar: nome amigável, provedor (ex.: openai, gemini, anthropic, genérico OpenAI-compatible), base URL opcional, modelo padrão, API key/token, ordem de prioridade, ativo/inativo
   - editar, desativar, remover
   - nunca exibir a key completa de volta (mascarar; permitir “trocar key”)
2. **Rotação automática** na camada de serviço:
   - ordenar por prioridade entre ativos
   - tentar o primeiro; em falha recuperável → próximo
   - registrar qual provedor atendeu cada chamada
   - se todos falharem → erro claro para a feature chamadora
3. Teste rápido no Setup: botão **“Testar conexão”** por provedor (ping mínimo).
4. Apenas admin acessa esta seção e as APIs.

## Requisitos técnicos

- Tabela isolada `ia_provedor` (ou similar)
- Keys criptografadas em repouso se viável no SQLite (no mínimo: nunca logar a key; variáveis de env como fallback opcional)
- Interface interna tipo:

```text
IAClient.chat(messages, *, purpose="analise_preco") -> resultado + provedor_usado
```

- Features (análise de preço, etc.) **só** usam essa interface
- Constantes de retry/timeout configuráveis
- Testes: falha no 1º provedor → sucesso no 2º; todos falham → erro

## Política de custo (produto)

- AWS Free Tier ≠ API de IA grátis
- Documentar no Setup um aviso: uso consome crédito do provedor externo

## Fora de escopo

- Billing interno por usuário
- Fine-tuning / embeddings avançados
- Proxy pago de terceiros

## Critérios de aceite

- Dois provedores ativos: se o primeiro falha, o segundo atende sem o usuário escolher
- Key não aparece em texto pleno na UI após salvar
- Feature de análise de preço funciona sem conhecer detalhes do provedor
