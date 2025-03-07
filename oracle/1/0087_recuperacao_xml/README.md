# Dashboard de Conferência Tributária

## Objetivo
O dashboard tem como objetivo consumir os dados dos XMLs importados (NF emitida por terceiros) e confrontá-los com o lançamento da mesma no Sankhya.

## Funcionalidades
- **Consumo de Dados**: 
  - Os dados dos XMLs importados serão consumidos e confrontados com os lançamentos no Sankhya.
  - Alguns dados já estão disponíveis nas tabelas relacionadas ao **"Portal de Importação de XML"**, mas alguns campos podem precisar ser extraídos diretamente do XML, armazenado em tabelas específicas no Sankhya OM.
  
- **Estrutura do Dashboard**:
  - O dashboard terá as mesmas colunas da planilha cedida por Thais Borges (atualmente com Raphael).
  - Será exibido em formato de tabela, com um registro para o XML importado e outro para a nota lançada no sistema, facilitando a conferência.

- **Filtros**:
  - Os filtros serão definidos em conjunto com Thais Borges.

## Material de Apoio
- Planilha cedida por Thais Borges, gerada via ODBC (eles possuem esse recurso).

---

# Observações Complementares

## Nota Fiscal Eletrônica (NF-e) no Brasil
A Nota Fiscal Eletrônica (NF-e) é um documento digital que registra operações comerciais, emitido e armazenado eletronicamente. O modelo mais comum é o **Modelo 55**, utilizado para a maioria das operações comerciais de circulação de mercadorias. Abaixo estão os principais modelos de NF-e:

### Modelos de Notas Fiscais Eletrônicas

1. **Modelo 55 - Nota Fiscal Eletrônica (NF-e)**  
   - **Finalidade**: Documentar operações de circulação de mercadorias (vendas, transferências, remessas para conserto, etc.).  
   - **Aplicação**: Substitui a antiga Nota Fiscal Modelo 1 ou 1-A.  

2. **Modelo 57 - Conhecimento de Transporte Eletrônico (CT-e)**  
   - **Finalidade**: Registrar prestações de serviços de transporte de cargas.  
   - **Aplicação**: Substitui os antigos modelos de conhecimento de transporte, como o Modelo 8.  

3. **Modelo 65 - Cupom Fiscal Eletrônico (CF-e)**  
   - **Finalidade**: Documentar operações de venda ao consumidor final.  
   - **Aplicação**: Emitido por equipamentos ECF (Emissor de Cupom Fiscal).  

4. **Modelo 59 - Cupom Fiscal Eletrônico para o Sistema Substituto Tributário (CF-e-SAT)**  
   - **Finalidade**: Similar ao CF-e, mas específico para o Sistema Substituto Tributário.  
   - **Aplicação**: Emitido via Sistema Autenticador e Transmissor de Cupons Fiscais Eletrônicos (SAT).  

5. **Modelo 21 - Nota Fiscal de Serviços Eletrônica (NFS-e)**  
   - **Finalidade**: Documentar a prestação de serviços.  
   - **Aplicação**: Emitido por prefeituras municipais, pois a tributação de serviços é de competência municipal.  

6. **Modelo 01 - Nota Fiscal de Produtor (NF-e Produtor)**  
   - **Finalidade**: Documentar a circulação de produtos agrícolas.  
   - **Aplicação**: Substitui a antiga Nota Fiscal de Produtor (Modelo 4).  

7. **Modelo 04 - Nota Fiscal de Produtor (NF-e Produtor)**  
   - **Finalidade**: Similar ao Modelo 01, mas em formato eletrônico.  
   - **Aplicação**: Utilizado por produtores rurais.  

8. **Modelo 06 - Nota Fiscal de Energia Elétrica (NF-e Energia)**  
   - **Finalidade**: Documentar a comercialização de energia elétrica.  
   - **Aplicação**: Emitido por concessionárias de energia elétrica.  

9. **Modelo 66 - Nota Fiscal de Consumidor Eletrônica (NFC-e)**  
   - **Finalidade**: Documentar operações de venda ao consumidor final.  
   - **Aplicação**: Substitui o cupom fiscal em papel.  

10. **Modelo 67 - Nota Fiscal de Serviços de Comunicação (NF-e Com)**  
    - **Finalidade**: Documentar a prestação de serviços de comunicação.  
    - **Aplicação**: Emitido por empresas de telecomunicações.  

11. **Modelo 75 - Nota Fiscal de Serviços de Transporte (NF-e Transporte)**  
    - **Finalidade**: Documentar a prestação de serviços de transporte.  
    - **Aplicação**: Emitido por empresas de transporte.  

12. **Modelo 79 - Nota Fiscal de Serviços de Transporte Ferroviário (NF-e Transporte Ferroviário)**  
    - **Finalidade**: Documentar a prestação de serviços de transporte ferroviário.  
    - **Aplicação**: Emitido por empresas de transporte ferroviário.  

13. **Modelo 89 - Nota Fiscal de Serviços de Transporte Aquaviário (NF-e Transporte Aquaviário)**  
    - **Finalidade**: Documentar a prestação de serviços de transporte aquaviário.  
    - **Aplicação**: Emitido por empresas de transporte aquaviário.  

14. **Modelo 91 - Nota Fiscal de Serviços de Transporte Aéreo (NF-e Transporte Aéreo)**  
    - **Finalidade**: Documentar a prestação de serviços de transporte aéreo.  
    - **Aplicação**: Emitido por empresas de transporte aéreo.  

15. **Modelo 99 - Nota Fiscal de Serviços de Transporte Dutoviário (NF-e Transporte Dutoviário)**  
    - **Finalidade**: Documentar a prestação de serviços de transporte dutoviário.  
    - **Aplicação**: Emitido por empresas de transporte dutoviário.  

---

## Considerações Finais
- O **Modelo 55** é o mais utilizado e essencial para a maioria das operações comerciais.
- Cada modelo tem sua finalidade e aplicação específica, sendo crucial escolher o correto para cada operação.
- A emissão de notas fiscais eletrônicas é obrigatória para a maioria das empresas, e o não cumprimento pode resultar em penalidades fiscais.

Para mais detalhes sobre algum modelo específico, consulte a legislação tributária ou um contador especializado.