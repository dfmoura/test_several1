# NFe de entrada (homologação)

A tela **Compras → Pedidos de compra** gera o XML **sob demanda** a partir dos itens reais do PC:

- Quantidades e códigos do pedido selecionado
- **Chave única a cada geração** (não conflita com “XML já importado”)
- Destinatário = CNPJ da empresa

Arquivos estáticos abaixo ficam só como referência histórica.

| Arquivo | Uso |
|---|---|
| *(gerado na UI)* | **Preferencial** — botão **Gerar XML fresco** |
| `pedido-compra-2-banca-dinei.xml` | Snapshot PC #2 (chave fixa — só 1 import) |
| `pedido-compra-bopp-coldstamp.xml` | Snapshot PC #1 |
| `pedido-compra-so-papel.xml` | Só papel |
| `exemplo-compra-homolog.xml` | Genérico antigo |

## Fluxo

1. `/compras` → aba **Pedidos de compra** → selecione o PC  
2. **Gerar XML fresco** → confira itens no comentário do XML  
3. **Importar NFe neste pedido**  
4. Aba **Entradas NFe** → **Lançar estoque**

> NFS-e / NF-e em `../nfse` e `../nfe` são de **saída**, não de entrada.
