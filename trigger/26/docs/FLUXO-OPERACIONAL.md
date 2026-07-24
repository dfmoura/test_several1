# Fluxo operacional — passo a passo

Fluxo canônico do sistema (sem NFS-e e sem importações).

```
Orçamento → Pedido → OS → NF-e/Cobrança → Entrega → Confirmação → Recebimento
                 ↘ Estoque/Compras (paralelo)
```

## 1. Cadastro de cliente

1. Informar CNPJ → consulta API pública → preenche razão, fantasia, endereço base.  
2. Ajustar dados comerciais: vendedor, condição de pagamento padrão, limite.  
3. Cadastrar **endereços de entrega** (N). CEP incompleto → ViaCEP/BrasilAPI.  

**Saída:** `Customer` + `Address[]`.

## 2. Orçamento

1. Selecionar cliente e vendedor.  
2. Spec técnica: medida/faca, cores, papel, acabamento, tubete, máquina, imposto, comissão.  
3. Engine calcula faixas (10k/20k/40k/60k ou qtds livres).  
4. Revisar margem; enviar PDF ao cliente.  
5. Status → `enviado`.  

**Aprovado:** status `aprovado` + escolha da faixa/quantidade.  
**Reprovado/expirado:** encerra sem pedido.

## 3. Pedido

1. Gera `SalesOrder` a partir do orçamento (preço **congelado**).  
2. Define endereço de entrega e `payment_terms`.  
3. Calcula `expected_receipt_date` (previsão de recebimento do cliente).  
4. Alerta de ciclo de caixa se compras futuras tiverem vencimento pior que o recebimento.

## 4. Ordem de serviço

1. PCP gera OS da(s) linha(s).  
2. Sistema calcula insumos previstos (papel m²+perdas, tinta, tubete, caixa…).  
3. Ao **liberar**:
   - reserva estoque; ou  
   - sugere compra se faltar.  
4. Execução: `em_execucao` → `concluida` (consome reserva).  

## 5. Compras (quando necessário)

1. `PurchaseOrder` para fornecedor.  
2. `payment_due_date` sugerido ≥ recebimento esperado do pedido de venda (+ folga).  
3. `GoodsReceipt` → sobe estoque → gera `Payable`.  
4. Pagamento ao fornecedor é **manual no banco**; baixa no sistema com comprovante/ref.

## 6. Faturamento

1. OS concluída (ou override gerente) → `Invoice`.  
2. Emite **NF-e saída** via hub (Focus ou outro atrás do adapter).  
3. Emite **cobrança Inter** (boleto/bolepix/pix) com vencimento = condição do pedido.  
4. Gera `Receivable` vinculado.

## 7. Entrega

1. Cria `Shipment` com volumes/endereço snapshot.  
2. Expedição → trânsito.  
3. Confirmação de entrega (nome/data; evidência opcional).  
4. Validação interna (`validated=true`).  
5. Pedido → `entregue` / `encerrado` conforme política.

## 8. Recebimento

1. Webhook Inter `paga` → baixa automática do título; ou  
2. Baixa manual (pagamento identificado no extrato/banco).  

## Checklist diário sugerido (gestão básica)

| Papel | Olha |
|-------|------|
| Vendas | Orçamentos enviados sem resposta / a vencer |
| PCP | OS liberadas e fila do dia |
| Estoque | Itens abaixo do mínimo / reservas |
| Financeiro | AR a vencer hoje/semana; AP a pagar; alertas de ciclo de caixa |
| Faturamento | Pedidos concluídos sem NF-e/cobrança |

## O que não fazer neste momento

- Emitir NFS-e  
- Fluxo de importação / DI  
- Pagamento automático a fornecedor via API (só controle + baixa manual)
