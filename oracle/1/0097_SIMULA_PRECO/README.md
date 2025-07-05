# Price Simulation View and Queries

This project contains a comprehensive price simulation system with a parameterized view and various query examples.

## Files Overview

### 1. `view_simula_preco.sql`
Contains the main view `V_SIMULA_PRECO` that encapsulates the complex price simulation logic from `base3.sql`. The view includes:

- **Parameters**: Uses default values for period (`P_PERIODO`) and company (`P_EMPRESA`)
- **CTEs**: All the complex Common Table Expressions from the original query
- **Calculations**: Price tables, margins, costs, and various scenarios (current, -15%, -65%)
- **Structure**: Maintains the same UNION ALL structure as the original query

### 2. `selects_from_view.sql`
Contains 15 different SELECT statements that demonstrate how to use the `V_SIMULA_PRECO` view:

1. **Basic query** - Get all data from the view
2. **High margin products** - Products with margin > 20%
3. **Brand summary** - Summary by brand (MARCA)
4. **Low margin products** - Products with margin < 10%
5. **Price comparison** - Compare current price with 15% discount scenario
6. **High volume products** - Products with AD_QTDVOLLT > 100
7. **Price table summary** - Summary by price table (CODTAB)
8. **Margin range** - Products with margin between 15% and 25%
9. **High brand weight** - Products with POND_MARCA > 0.1
10. **All scenarios summary** - Summary of current, -15%, -65% scenarios
11. **Cost comparison** - Products with current cost higher than period cost
12. **Ticket comparison** - Products with objective ticket higher than last 12 months
13. **Weighted averages** - Summary by brand with weighted averages
14. **High margin and volume** - Products with high margin and high volume
15. **Price table analysis** - Summary of price tables with margin analysis

### 3. `dynamic_view_usage.sql`
Shows how to create parameterized versions of the view using different approaches:

- **Package-based parameters** - Using a package to store parameters
- **Parameterized view** - `V_SIMULA_PRECO_PARAM` that uses package parameters
- **Functions and procedures** - Wrapper functions to use the view with parameters
- **Multi-period analysis** - Procedures to compare different periods
- **Session-based usage** - How to use the view with different parameters in a session

## Usage Instructions

### Basic Usage
```sql
-- Use the view with default parameters
SELECT * FROM V_SIMULA_PRECO;

-- Use specific queries from selects_from_view.sql
SELECT CODTAB, NOMETAB, CODPROD, DESCRPROD, MARCA, PRECO_TAB, MARGEM
FROM V_SIMULA_PRECO
WHERE MARGEM > 20 AND CODPROD IS NOT NULL
ORDER BY MARGEM DESC;
```

### Parameterized Usage
```sql
-- Set parameters for a specific period and company
EXEC SIMULA_PRECO_PARAMS.SET_PARAMS(TO_DATE('2024-03-31', 'YYYY-MM-DD'), 2);

-- Query the parameterized view
SELECT * FROM V_SIMULA_PRECO_PARAM;
```

### Key Features

1. **Maintains Original Logic**: The view preserves all the complex business logic from the original query
2. **Parameter Support**: Can be used with different periods and companies
3. **Multiple Scenarios**: Includes current prices and discount scenarios (-15%, -65%)
4. **Comprehensive Data**: Includes costs, margins, ticket medians, and brand weights
5. **Flexible Queries**: Multiple example queries for different analysis needs

### View Columns

The view returns the following columns:
- `CODTAB`, `NOMETAB` - Price table information
- `CODPROD`, `DESCRPROD` - Product information
- `MARCA` - Brand
- `AD_QTDVOLLT`, `POND_MARCA` - Volume and brand weight
- `DTVIGOR` - Validity date
- `CUSTO_SATIS`, `CUSTO_SATIS_ATU` - Current and period costs
- `PRECO_TAB` - Table price
- `MARGEM` - Current margin
- `PRECO_TAB_MENOS15`, `MARGEM_MENOS15` - 15% discount scenario
- `PRECO_TAB_MENOS65`, `MARGEM_MENOS65` - 65% discount scenario
- `TICKET_MEDIO_OBJETIVO`, `TICKET_MEDIO_ULT_12_M`, `TICKET_MEDIO_SAFRA` - Ticket medians

### Notes

- The view uses default parameters that can be modified in the `PARAMS` CTE
- For dynamic parameter usage, use the package-based approach in `dynamic_view_usage.sql`
- All queries filter out summary rows (where `CODPROD IS NULL`) when needed
- The view maintains the same performance characteristics as the original query 