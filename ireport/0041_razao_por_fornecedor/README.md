# Relatório "Razão por Fornecedor" – Comix New

## 📌 Objetivo

Este projeto tem como finalidade o desenvolvimento de um relatório no **iReport** para a empresa **Comix New**, cujo propósito é apresentar e detalhar o **saldo contábil por fornecedor**, atendendo tanto às necessidades de conciliação de contas quanto de análise detalhada.

## 🧩 Estrutura do Relatório

O relatório foi desenvolvido com **duas visões complementares**:

### 1. Visão Sintética

Corresponde à tabela apresentada no dashboard *"Razão Auxiliar para Conciliação de Conta"*.
Essa visão apresenta os **saldos consolidados** por parceiro e conta contábil, contemplando:

* Saldo anterior
* Débitos e créditos do período
* Saldo atual
* Indicador do tipo de saldo (Devedor ou Credor)

### 2. Visão Analítica

Oferece um **nível de detalhamento maior**, agrupando as informações por parceiro e apresentando **cada lançamento contábil individualmente**, incluindo dados como:

* Data de movimento
* Histórico contábil
* Documento e vencimento
* Projeto, usuário e origem (Portal ou Financeiro)

## ⚙️ Lógica Implementada

A construção das duas visões seguiu uma lógica robusta de junções e filtragens para garantir a integridade e a precisão dos dados apresentados:

* Utilização de subconsultas (CTEs) para **identificação e classificação de parceiros** associados aos lançamentos contábeis.
* Agrupamentos condicionais por período de referência (mês atual e anterior) para cálculo de **saldos acumulados**.
* Aplicação de regras de negócio para determinação da natureza do saldo (D/C), com base em **faixa contábil e valores consolidados**.
* Identificação da origem do lançamento (Portal ou Financeiro) para rastreabilidade.

## 🛠️ Ferramenta Utilizada

* **iReport Designer** para modelagem visual do relatório
* Conectividade com base de dados **Protheus/SQL** via parâmetros dinâmicos de empresa, conta contábil, data de referência e parceiro

## 📅 Parâmetros do Relatório

O relatório é parametrizável, permitindo ao usuário filtrar os dados com base em:

* Código da empresa
* Conta contábil
* Período de referência (mensal)
* Código do parceiro (opcional)

## ✅ Resultados Esperados

* Facilitação da conciliação contábil mensal
* Visibilidade clara de movimentações por fornecedor
* Suporte a auditorias e fechamento contábil