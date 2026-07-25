# Modelo de dados (ER resumido)

```mermaid
erDiagram
  User ||--o{ Orcamento : cria
  User ||--o{ AuditLog : registra
  Cliente ||--o{ Orcamento : referencia
  Orcamento ||--o{ Orcamento : versiona

  User {
    string id
    string email
    string role
  }
  Cliente {
    string id
    string nome
  }
  Orcamento {
    int numero
    int versao
    enum status
    json inputSnapshot
    json resultSnapshot
  }
  Papel {
    string nome
    decimal precoM2
  }
  Acabamento {
    string nome
    decimal precoM2
    decimal perdaM2
  }
  Faca {
    string tamanho
    string formato
    decimal puxada
    decimal z
  }
  AuditLog {
    string entityType
    string field
    json oldValue
    json newValue
  }
```

## Princípios

- **Snapshots** no orçamento: preços e resultado congelados na versão enviada (imutabilidade comercial).
- **Cadastros vivos** alimentam só novos cálculos.
- **AuditLog** obrigatório em mudança de preço.
- **Lookups** (caixas, tarifas) normalizados para o motor puro receber `CatalogLookups`.
