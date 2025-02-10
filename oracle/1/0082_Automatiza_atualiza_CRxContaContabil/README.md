# 📌 Especificação Técnica: Implementação de Campos CR no Dicionário de Dados da TGFNAT

## 📋 Descrição Geral
Será realizada a criação de **7 novos campos** no dicionário de dados da **TGFNAT**, os quais representarão os seguintes Centros de Responsabilidade (**CRs**):

| Código | Descrição                      |
|--------|--------------------------------|
| 23     | COMERCIAL                      |
| 24     | LOGÍSTICA                      |
| 25     | INDÚSTRIA                      |
| 26     | ADMINISTRATIVO                 |
| 27     | PATRIMONIAL                    |
| 28     | TECNOLOGIA DA INFORMAÇÃO       |
| 29     | JURÍDICO                       |

Cada um desses campos será relacionado ao **plano de contas**, permitindo ao usuário selecionar uma conta contábil de sua preferência.

![Esquema da Demanda](https://github.com/dfmoura/test_several1/blob/main/oracle/1/0082_Automatiza_atualiza_CRxContaContabil/demanda.png)

---

## 🎯 Objetivo
O objetivo desta implementação é permitir que, ao preencher um dos campos do CR com uma conta contábil específica, o sistema preencha automaticamente a aba de detalhes **'CR x Conta Contábil'** com toda a hierarquia correspondente à família do CR informado.

---

## 📌 Implementação da Lógica na Aba 'CR x Conta Contábil'
A aba **'CR x Conta Contábil'** será alimentada automaticamente via **procedure**, garantindo que a hierarquia completa do CR seja preenchida de acordo com a conta contábil escolhida.

### 🔄 Exemplo de Preenchimento Automático
Caso o usuário preencha o campo do **CR 23 - COMERCIAL** com a conta contábil **56**, o sistema deverá alimentar automaticamente a aba de detalhes com todas as variações hierárquicas desse CR:

| CR         | Conta Contábil |
|------------|---------------|
| 23.000.00  | 56            |
| 23.001.00  | 56            |
| 23.002.00  | 56            |
| 23.003.00  | 56            |
| 23.004.00  | 56            |
| 23.005.00  | 56            |
| 23.006.00  | 56            |
| 23.007.00  | 56            |

Além da família direta do CR 23, outros CRs que estejam associados hierarquicamente também serão preenchidos, por exemplo, **todos os CRs da família 30.003**:

| CR         | Conta Contábil |
|------------|---------------|
| 30.003.00  | 56            |
| 30.003.01  | 56            |
| 30.003.02  | 56            |
| 30.003.03  | 56            |
| 30.003.04  | 56            |

---

## 🏗️ Desenvolvimento da Lógica
A lógica responsável pelo preenchimento automático do detalhe **'CR x Conta Contábil'** será implementada via **procedure**, garantindo a integridade dos dados e evitando duplicidades. A procedure deverá seguir as regras abaixo:

1. **Identificar o CR preenchido pelo usuário** e a **conta contábil informada**.
2. **Buscar todas as variações hierárquicas** do CR dentro da base de dados.
3. **Preencher a aba de detalhes** com os CRs identificados e a conta contábil correspondente.
4. **Verificar CRs associados**, incluindo famílias adicionais que devem ser impactadas pela mesma conta contábil.
5. **Validar duplicidades** antes de inserir os dados para evitar inconsistências.

---

## ⚙️ Benefícios da Implementação
✔️ Automatização do preenchimento da aba 'CR x Conta Contábil'.  
✔️ Garantia de consistência nos lançamentos contábeis.  
✔️ Facilidade para usuários na seleção e distribuição das contas contábeis.  
✔️ Redução de erros manuais no preenchimento.  
✔️ Melhoria na organização das hierarquias contábeis.  

---

## 📅 Prazo e Considerações Finais
A implementação será realizada conforme cronograma estabelecido pela equipe de desenvolvimento, garantindo testes para assegurar a integridade dos dados. Sugere-se validação junto aos usuários antes da liberação em produção.

---




Raphael Carvalho
5:39 PM
Criar campo AD do tipo lista na tela de Centro de Resultado, contendo uma opção para cada grupo de C.R.
Esse campo deverá ser atualizado nos C.Rs que serão impactados pelo agendamento que atualiza a aba CR X NATUREZA
Raphael Carvalho
5:45 PM
Nome do Campo AD: "Grupo p/ conta contábil 'aba C.R x Conta Contábil'"